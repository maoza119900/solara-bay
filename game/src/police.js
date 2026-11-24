// Solara Bay — the law. One job: the wanted level and the police cars and
// officers who respond to it, chase, ram, and bust the player.
import { CONFIG } from './config.js';

export function createPolice() {
  return {
    wanted: 0,
    cars: [], // police cars {x,y,angle,speed}
    cops: [], // officers on foot {x,y,angle,speed}
    spawnTimer: 0,
    decayTimer: 0,
    roadblockTimer: 0,
    heat: 0, // mission heat that holds a minimum wanted level
  };
}

export function addWanted(S, n) {
  const p = S.police;
  p.wanted = Math.max(0, Math.min(5, p.wanted + n));
  p.decayTimer = CONFIG.WANTED_DECAY_SECONDS;
  if (p.wanted > 0) S.audio.siren(true, 0);
}

export function setHeat(S, stars) {
  S.police.heat = stars;
  if (S.police.wanted < stars) S.police.wanted = stars;
}

export function clearHeat(S) {
  S.police.heat = 0;
}

function spawnPoliceCar(S) {
  const p = S.player;
  const angle = S.rng.range(0, Math.PI * 2);
  const dist = 700;
  const x = Math.max(80, Math.min(CONFIG.WORLD_W - 80, p.x + Math.cos(angle) * dist));
  const y = Math.max(80, Math.min(CONFIG.WORLD_H - 80, p.y + Math.sin(angle) * dist));
  S.police.cars.push({ x, y, angle: 0, speed: 0, w: 48, h: 24, siren: S.rng.range(0, 1) });
}

function spawnCop(S) {
  const p = S.player;
  const angle = S.rng.range(0, Math.PI * 2);
  const dist = 420;
  S.police.cops.push({
    x: Math.max(60, Math.min(CONFIG.WORLD_W - 60, p.x + Math.cos(angle) * dist)),
    y: Math.max(60, Math.min(CONFIG.WORLD_H - 60, p.y + Math.sin(angle) * dist)),
    angle: 0, speed: 0,
  });
}

export function updatePolice(dt, S) {
  const pol = S.police;
  const p = S.player;
  const wanted = pol.wanted;

  // Desired unit counts by wanted level.
  const wantCars = wanted === 0 ? 0 : Math.min(1 + wanted, 5);
  const wantCops = wanted >= 1 && !p.car ? Math.min(wanted, 3) : 0;

  pol.spawnTimer -= dt;
  if (pol.spawnTimer <= 0) {
    if (pol.cars.length < wantCars) spawnPoliceCar(S);
    else if (pol.cops.length < wantCops) spawnCop(S);
    pol.spawnTimer = 1.2;
  }

  // Wanted decays when no police unit can see the player.
  let seen = false;
  for (const c of pol.cars) if (Math.hypot(c.x - p.x, c.y - p.y) < CONFIG.WANTED_SIGHT_RANGE) seen = true;
  for (const c of pol.cops) if (Math.hypot(c.x - p.x, c.y - p.y) < CONFIG.WANTED_SIGHT_RANGE) seen = true;
  if (!seen && wanted > pol.heat) {
    pol.decayTimer -= dt;
    if (pol.decayTimer <= 0) {
      pol.wanted = Math.max(pol.heat, wanted - 1);
      pol.decayTimer = CONFIG.WANTED_DECAY_SECONDS;
    }
  } else {
    pol.decayTimer = CONFIG.WANTED_DECAY_SECONDS;
  }

  // Police cars chase and ram.
  const maxSpeed = 300 + wanted * 42;
  for (const car of pol.cars) {
    const dx = p.x - car.x;
    const dy = p.y - car.y;
    const dist = Math.hypot(dx, dy) || 1;
    const targetAngle = Math.atan2(dy, dx);
    let diff = targetAngle - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.angle += Math.max(-3.4 * dt, Math.min(3.4 * dt, diff));
    const accel = dist > 120 ? 420 : 200;
    car.speed = Math.min(maxSpeed, car.speed + accel * dt);
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    car.x = Math.max(40, Math.min(CONFIG.WORLD_W - 40, car.x));
    car.y = Math.max(40, Math.min(CONFIG.WORLD_H - 40, car.y));

    // Ram the player's car or the player on foot.
    const target = p.car || p;
    const tdx = target.x - car.x;
    const tdy = target.y - car.y;
    const td = Math.hypot(tdx, tdy);
    if (td < 46) {
      if (p.car) {
        p.car.speed *= 0.55;
        p.car.x += (tdx / (td || 1)) * 26;
        p.car.y += (tdy / (td || 1)) * 26;
        S.shake = Math.max(S.shake, 7);
        S.audio.crash();
        damagePlayer(S, 6);
      } else {
        damagePlayer(S, 10);
        p.x += (tdx / (td || 1)) * 30;
        p.y += (tdy / (td || 1)) * 30;
        S.shake = Math.max(S.shake, 8);
      }
      car.speed *= 0.4;
    }
  }

  // Officers on foot chase and try to bust.
  for (const cop of pol.cops) {
    const dx = p.x - cop.x;
    const dy = p.y - cop.y;
    const dist = Math.hypot(dx, dy) || 1;
    cop.angle = Math.atan2(dy, dx);
    const speed = 235 + wanted * 8;
    cop.x += (dx / dist) * speed * dt;
    cop.y += (dy / dist) * speed * dt;
    if (dist < 26 && wanted >= 1) {
      const playerSpeed = p.car ? Math.abs(p.car.speed) : Math.hypot(p.vx, p.vy);
      if (!p.car && playerSpeed < 120) {
        S.screen = 'busted';
        S.audio.bust();
        S.saveBest();
      }
    }
  }

  // Despawn far-away units when the heat is off.
  if (wanted === 0) {
    pol.cars = pol.cars.filter((c) => Math.hypot(c.x - p.x, c.y - p.y) < 1500);
    pol.cops = pol.cops.filter((c) => Math.hypot(c.x - p.x, c.y - p.y) < 900);
    if (pol.cars.length > 0 && Math.hypot(pol.cars[0].x - p.x, pol.cars[0].y - p.y) > 1500) pol.cars.shift();
  }

  S.audio.siren(wanted >= 1, dt);
}

export function damagePlayer(S, amount) {
  const p = S.player;
  if (S.screen !== 'play' || p.invuln > 0) return;
  p.health -= amount;
  p.invuln = 0.35;
  S.shake = Math.max(S.shake, 5);
  if (p.health <= 0) {
    p.health = 0;
    S.screen = 'wasted';
    S.audio.bust();
    S.saveBest();
  }
}
