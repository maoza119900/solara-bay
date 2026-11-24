// Solara Bay — traffic and pedestrians. One job: cars that follow road lanes
// and pedestrians that walk sidewalks and flee gunfire.
import { CONFIG, PALETTE } from './config.js';
import { nearestRoad, isOnRoad } from './city.js';

export function createTraffic(rng, city) {
  const cars = [];
  for (let i = 0; i < CONFIG.TRAFFIC_CARS; i++) {
    cars.push(spawnTrafficCar(rng, city));
  }
  const peds = [];
  for (let i = 0; i < CONFIG.PEDESTRIANS; i++) {
    peds.push(spawnPed(rng, city));
  }
  return { cars, peds };
}

function spawnTrafficCar(rng, city) {
  const road = rng.pick([...CONFIG.AVENUES, ...CONFIG.STREETS].map((at, i) => ({
    axis: i < CONFIG.AVENUES.length ? 'v' : 'h',
    at,
  })));
  const dir = rng.chance(0.5) ? 1 : -1;
  const lane = 24; // right-hand lane offset
  let x;
  let y;
  if (road.axis === 'v') {
    x = road.at + lane * dir;
    y = rng.range(100, CONFIG.WORLD_H - 300);
  } else {
    x = rng.range(100, CONFIG.WORLD_W - 100);
    y = road.at + lane * dir;
  }
  return {
    x, y, angle: road.axis === 'v' ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI),
    speed: rng.range(90, CONFIG.TRAFFIC_SPEED + 40),
    dir, axis: road.axis, at: road.at, lane,
    color: rng.pick(PALETTE.carColors),
    kind: rng.chance(0.12) ? 'taxi' : 'car',
    w: 46, h: 22,
    brake: 0,
  };
}

function spawnPed(rng, city) {
  const road = nearestRoad(rng.range(200, CONFIG.WORLD_W - 200), rng.range(200, CONFIG.BEACH_Y - 100));
  const side = rng.chance(0.5) ? 1 : -1;
  const off = CONFIG.ROAD_W / 2 + 14;
  let x;
  let y;
  if (road.axis === 'v') {
    x = road.at + off * side;
    y = rng.range(120, CONFIG.BEACH_Y - 120);
  } else {
    x = rng.range(120, CONFIG.WORLD_W - 120);
    y = road.at + off * side;
  }
  return {
    x, y,
    angle: rng.range(0, Math.PI * 2),
    speed: rng.range(28, 62),
    axis: road.axis, at: road.at, side,
    color: rng.pick(['#e86a6a', '#6aa8e8', '#e8c33d', '#7ad94f', '#d97ad9', '#f2f2f2', '#8a6d4b']),
    flee: 0, // seconds of fleeing left
    fleeX: 0, fleeY: 0,
    walkPhase: rng.range(0, Math.PI * 2),
  };
}

export function updateTraffic(dt, S) {
  const { cars, peds } = S.traffic;
  const player = S.player;

  for (const car of cars) {
    if (car.parked) continue; // a car the player left behind stays where it is
    // Slow down if another car is close ahead in the same lane.
    let targetSpeed = car.speed;
    for (const other of cars) {
      if (other === car || other.axis !== car.axis || other.at !== car.at || other.dir !== car.dir) continue;
      const along = car.axis === 'v' ? (other.y - car.y) * car.dir : (other.x - car.x) * car.dir;
      const lateral = car.axis === 'v' ? Math.abs(other.x - car.x) : Math.abs(other.y - car.y);
      if (along > 0 && along < 90 && lateral < 30) targetSpeed = Math.min(targetSpeed, 30);
    }
    // Ease off near the player so traffic does not pile into them.
    if (player.car) {
      const dx = player.car.x - car.x;
      const dy = player.car.y - car.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 110) targetSpeed = Math.min(targetSpeed, 40);
    }
    const v = targetSpeed;
    if (car.axis === 'v') {
      car.y += car.dir * v * dt;
      car.x = car.at + car.lane * car.dir;
      car.angle = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      if (car.y < 60) car.y = CONFIG.WORLD_H - 320;
      if (car.y > CONFIG.WORLD_H - 300) car.y = 60;
    } else {
      car.x += car.dir * v * dt;
      car.y = car.at + car.lane * car.dir;
      car.angle = car.dir > 0 ? 0 : Math.PI;
      if (car.x < 60) car.x = CONFIG.WORLD_W - 60;
      if (car.x > CONFIG.WORLD_W - 60) car.x = 60;
    }
  }

  for (const ped of peds) {
    ped.walkPhase += dt * 6;
    if (ped.flee > 0) {
      ped.flee -= dt;
      const dx = ped.x - ped.fleeX;
      const dy = ped.y - ped.fleeY;
      const d = Math.hypot(dx, dy) || 1;
      ped.x += (dx / d) * 150 * dt;
      ped.y += (dy / d) * 150 * dt;
      ped.angle = Math.atan2(dy, dx);
    } else {
      const step = ped.speed * dt;
      if (ped.axis === 'v') {
        ped.y += step * (ped.side > 0 ? 1 : -1);
        ped.angle = ped.side > 0 ? Math.PI / 2 : -Math.PI / 2;
        if (ped.y < 100 || ped.y > CONFIG.BEACH_Y - 100) ped.side *= -1;
      } else {
        ped.x += step * (ped.side > 0 ? 1 : -1);
        ped.angle = ped.side > 0 ? 0 : Math.PI;
        if (ped.x < 100 || ped.x > CONFIG.WORLD_W - 100) ped.side *= -1;
      }
    }
    // Keep pedestrians out of buildings and water.
    const b = S.city.buildings.find((bb) => ped.x > bb.x - 6 && ped.x < bb.x + bb.w + 6 && ped.y > bb.y - 6 && ped.y < bb.y + bb.h + 6);
    if (b) {
      ped.side *= -1;
      ped.x += ped.axis === 'v' ? 0 : 24 * ped.side;
      ped.y += ped.axis === 'v' ? 24 * ped.side : 0;
    }
    if (ped.y > CONFIG.OCEAN_Y - 10) ped.y = CONFIG.OCEAN_Y - 10;
  }
}

/** Make nearby pedestrians flee from a point (gunfire, crash). */
export function scarePeds(S, x, y, radius = 420) {
  for (const ped of S.traffic.peds) {
    const d = Math.hypot(ped.x - x, ped.y - y);
    if (d < radius) {
      ped.flee = 2.5;
      ped.fleeX = x;
      ped.fleeY = y;
    }
  }
}

/** A traffic car is stealable: the nearest one within range of the player. */
export function nearestStealableCar(S, x, y, maxDist = 90) {
  let best = null;
  let bestD = maxDist;
  for (const car of S.traffic.cars) {
    const d = Math.hypot(car.x - x, car.y - y);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

/** Remove a traffic car from the world (it was stolen) and schedule a replacement. */
export function stealCar(S, car) {
  const idx = S.traffic.cars.indexOf(car);
  if (idx >= 0) S.traffic.cars.splice(idx, 1);
  S.traffic.respawnTimer = 6;
}

export function updateTrafficRespawn(dt, S) {
  if (S.traffic.respawnTimer === undefined) S.traffic.respawnTimer = 0;
  if (S.traffic.respawnTimer > 0) {
    S.traffic.respawnTimer -= dt;
    if (S.traffic.respawnTimer <= 0 && S.traffic.cars.length < CONFIG.TRAFFIC_CARS) {
      S.traffic.cars.push(spawnTrafficCar(S.rng, S.city));
    }
  }
}
