// Solara Bay — the player. One job: Marco "Rook" Reyes on foot and behind the
// wheel — movement, car physics, stealing, punching and shooting.
import { CONFIG } from './config.js';
import { resolveBuildingCollision, clampToWorld, circleHitsBuilding } from './city.js';
import { nearestStealableCar, stealCar, scarePeds } from './traffic.js';
import { addWanted, damagePlayer } from './police.js';

export function createPlayer() {
  return {
    x: CONFIG.SPAWN.x,
    y: CONFIG.SPAWN.y,
    vx: 0, vy: 0,
    angle: Math.PI / 2, // facing down the avenue
    health: CONFIG.PLAYER_HEALTH,
    cash: 0,
    ammo: CONFIG.PISTOL_AMMO,
    car: null, // stolen/driven car {x,y,angle,speed,color,kind,w,h}
    driving: false,
    invuln: 0,
    punchTimer: 0,
    punchCooldown: 0,
    shootCooldown: 0,
    muzzle: 0,
    bestCash: 0,
  };
}

function makeCarFromTraffic(car) {
  return {
    x: car.x, y: car.y, angle: car.angle, speed: 0,
    color: car.color, kind: car.kind, w: car.w, h: car.h,
    sport: car.kind === 'taxi' ? false : car.color === '#d94f3d',
  };
}

export function updatePlayer(dt, S) {
  const p = S.player;
  const input = S.input;
  if (p.invuln > 0) p.invuln -= dt;
  if (p.punchCooldown > 0) p.punchCooldown -= dt;
  if (p.shootCooldown > 0) p.shootCooldown -= dt;
  if (p.muzzle > 0) p.muzzle -= dt;
  if (p.punchTimer > 0) p.punchTimer -= dt;

  if (p.driving && p.car) updateDriving(dt, S);
  else updateOnFoot(dt, S);

  clampToWorld(p);
  resolveBuildingCollision(S.city, p, p.driving ? 20 : CONFIG.PLAYER_RADIUS);
}

function updateOnFoot(dt, S) {
  const p = S.player;
  const input = S.input;
  const mv = input.moveVector();
  const speed = input.run ? CONFIG.RUN_SPEED : CONFIG.WALK_SPEED;
  let tx = 0;
  let ty = 0;
  if (mv.x !== 0 || mv.y !== 0) {
    const len = Math.hypot(mv.x, mv.y);
    tx = (mv.x / len) * speed;
    ty = (mv.y / len) * speed;
    p.angle = Math.atan2(ty, tx);
  }
  // Smooth acceleration, snappy stop.
  const k = mv.x !== 0 || mv.y !== 0 ? 12 : 18;
  p.vx += (tx - p.vx) * Math.min(1, k * dt);
  p.vy += (ty - p.vy) * Math.min(1, k * dt);
  p.x += p.vx * dt;
  p.y += p.vy * dt;

  // Enter / steal a car.
  if (input.pressed('KeyE')) {
    const car = nearestStealableCar(S, p.x, p.y, 95);
    if (car) {
      p.car = makeCarFromTraffic(car);
      p.driving = true;
      p.x = car.x;
      p.y = car.y;
      stealCar(S, car);
      addWanted(S, 1);
      S.audio.pickup();
      S.messages.push({ text: 'Car stolen — the law noticed (+1★)', t: 4 });
      S.shake = Math.max(S.shake, 3);
    }
  }

  // Punch: hurts the nearest pedestrian or cop in front.
  if (input.pressed('KeyF') && p.punchCooldown <= 0) {
    p.punchTimer = 0.22;
    p.punchCooldown = 0.4;
    S.audio.punch();
    const px = p.x + Math.cos(p.angle) * CONFIG.PUNCH_RANGE;
    const py = p.y + Math.sin(p.angle) * CONFIG.PUNCH_RANGE;
    for (const ped of S.traffic.peds) {
      if (Math.hypot(ped.x - px, ped.y - py) < 34) {
        ped.flee = 3;
        ped.fleeX = p.x;
        ped.fleeY = p.y;
        addWanted(S, 1);
        S.messages.push({ text: 'Assault! (+1★)', t: 3 });
        break;
      }
    }
    for (const cop of S.police.cops) {
      if (Math.hypot(cop.x - px, cop.y - py) < 34) {
        damagePlayer(S, 8);
        addWanted(S, 1);
        break;
      }
    }
  }

  // Shoot with the mouse: aim from the player to the cursor.
  const aimX = S.camera.x + input.mouse.x - CONFIG.VIEW_W / 2;
  const aimY = S.camera.y + input.mouse.y - CONFIG.VIEW_H / 2;
  p.angle = Math.atan2(aimY - p.y, aimX - p.x);
  if (input.mouse.clicked && p.shootCooldown <= 0) {
    if (p.ammo > 0) {
      p.ammo -= 1;
      p.shootCooldown = 0.28;
      p.muzzle = 0.07;
      S.audio.gunshot();
      S.shake = Math.max(S.shake, 4);
      scarePeds(S, p.x, p.y, 500);
      addWanted(S, 1);
      // Hitscan: nearest ped / cop / traffic car along the aim ray.
      const dirX = Math.cos(p.angle);
      const dirY = Math.sin(p.angle);
      let bestD = CONFIG.PISTOL_RANGE;
      let hitPed = null;
      let hitCop = null;
      for (const ped of S.traffic.peds) {
        const d = rayHit(p, ped.x, ped.y, dirX, dirY);
        if (d !== null && d < bestD) { bestD = d; hitPed = ped; hitCop = null; }
      }
      for (const cop of S.police.cops) {
        const d = rayHit(p, cop.x, cop.y, dirX, dirY);
        if (d !== null && d < bestD) { bestD = d; hitCop = cop; hitPed = null; }
      }
      if (hitPed) {
        hitPed.flee = 4;
        hitPed.fleeX = p.x;
        hitPed.fleeY = p.y;
        p.cash += 5;
        S.messages.push({ text: 'Ped down — pocketed $5', t: 2.5 });
      } else if (hitCop) {
        const idx = S.police.cops.indexOf(hitCop);
        if (idx >= 0) S.police.cops.splice(idx, 1);
        addWanted(S, 1);
        S.messages.push({ text: 'Cop down! (+1★)', t: 3 });
      }
      // Bullet puff at the hit point / max range.
      S.effects.push({
        kind: 'shot', x: p.x + dirX * bestD, y: p.y + dirY * bestD,
        x0: p.x + dirX * 22, y0: p.y + dirY * 22, t: 0.09,
      });
    } else {
      S.audio.click();
      S.messages.push({ text: 'Out of ammo — find a drop', t: 2.5 });
    }
  }
}

function rayHit(p, tx, ty, dirX, dirY) {
  const rx = tx - p.x;
  const ry = ty - p.y;
  const along = rx * dirX + ry * dirY;
  if (along < 0 || along > CONFIG.PISTOL_RANGE) return null;
  const perp = Math.abs(rx * dirY - ry * dirX);
  return perp < 22 ? along : null;
}

function updateDriving(dt, S) {
  const p = S.player;
  const car = p.car;
  const input = S.input;
  const mv = input.moveVector();

  // W/S accelerate / brake-reverse; A/D steer (steering flips in reverse).
  const forward = mv.y < 0;
  const back = mv.y > 0;
  const steerInput = mv.x;
  if (forward) car.speed += CONFIG.CAR_ACCEL * dt;
  if (back) {
    if (car.speed > 5) car.speed -= CONFIG.CAR_BRAKE * dt;
    else car.speed -= CONFIG.CAR_REVERSE * dt;
  }
  // Drag + rolling resistance.
  car.speed -= car.speed * 0.55 * dt;
  if (!forward && !back && Math.abs(car.speed) < 12) car.speed = 0;
  if (input.down('Space')) {
    car.speed *= Math.max(0, 1 - 5 * dt);
    S.effects.push({ kind: 'smoke', x: car.x, y: car.y, t: 0.3 });
  }
  car.speed = Math.max(-CONFIG.CAR_MAX_REVERSE, Math.min(CONFIG.CAR_MAX_SPEED, car.speed));

  const steerDir = car.speed >= 0 ? 1 : -1;
  const steerAmount = CONFIG.CAR_STEER * steerInput * steerDir * Math.min(1, Math.abs(car.speed) / 120 + 0.25);
  car.angle += steerAmount * dt * (Math.abs(car.speed) > 1 ? 1 : 0);

  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  // Building collision: bounce off with a speed cut.
  const hit = circleHitsBuilding(S.city, nx, ny, 22);
  if (hit) {
    car.speed *= -0.25;
    S.audio.crash();
    S.shake = Math.max(S.shake, 6);
    if (Math.abs(car.speed) > 200) damagePlayer(S, 4);
  } else {
    car.x = nx;
    car.y = ny;
  }
  p.x = car.x;
  p.y = car.y;
  p.angle = car.angle;
  p.vx = Math.cos(car.angle) * car.speed;
  p.vy = Math.sin(car.angle) * car.speed;

  // Running over a pedestrian is a crime.
  for (const ped of S.traffic.peds) {
    if (Math.abs(car.speed) > 60 && Math.hypot(ped.x - car.x, ped.y - car.y) < 30) {
      ped.flee = 4;
      ped.fleeX = car.x;
      ped.fleeY = car.y;
      addWanted(S, 2);
      S.messages.push({ text: 'You ran someone over! (+2★)', t: 3 });
      S.audio.crash();
      S.shake = Math.max(S.shake, 6);
      car.speed *= 0.7;
    }
  }

  // Exit the car.
  if (input.pressed('KeyE')) {
    p.driving = false;
    const side = car.angle + Math.PI / 2;
    p.x = car.x + Math.cos(side) * 34;
    p.y = car.y + Math.sin(side) * 34;
    p.vx = 0;
    p.vy = 0;
    // Leave the car parked in traffic as a stealable car again.
    S.traffic.cars.push({
      x: car.x, y: car.y, angle: car.angle, speed: 0, parked: true,
      dir: 1, axis: 'v', at: car.x, lane: 0,
      color: car.color, kind: car.kind || 'car', w: 46, h: 22, brake: 0,
    });
    p.car = null;
    S.audio.click();
  }
}
