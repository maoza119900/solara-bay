// Solara Bay — missions and free-roam work. One job: the three-story mission
// chain, taxi fares and cash drops, and the objective text the HUD shows.
import { CONFIG, MISSION_NAMES } from './config.js';
import { addWanted, setHeat, clearHeat } from './police.js';

export function createMissions() {
  return {
    index: 0, // 0..2 story mission, 3 = story complete
    stage: 'brief', // brief | pickup | deliver | done
    timer: 0,
    waypoint: null, // {x, y, label}
    passenger: null, // {x, y} waiting person for mission 1
    package: null,
    fare: null, // active taxi fare {from:{x,y}, to:{x,y}, reward, stage, timer}
    fareTimer: 0,
    drops: [], // cash pickups {x, y, amount, taken}
    message: '',
    messageTimer: 0,
    completed: [false, false, false],
  };
}

function say(S, text, seconds = 4) {
  // Big yellow line above the feed; the feed keeps one-off event notices.
  S.missions.message = text;
  S.missions.messageTimer = seconds;
}

export function startMission(S, i) {
  const m = S.missions;
  m.index = i;
  m.stage = 'brief';
  m.timer = 0;
  if (i === 0) {
    m.waypoint = { x: CONFIG.MARINA.x, y: CONFIG.MARINA.y, label: 'Marina pickup' };
    m.passenger = { x: CONFIG.MARINA.x + 40, y: CONFIG.MARINA.y - 30 };
    m.stage = 'pickup';
    say(S, 'MISSION: First Fare — pick up the passenger at the Marina. Drive there, press E.');
  } else if (i === 1) {
    m.waypoint = { x: CONFIG.GARAGE.x, y: CONFIG.GARAGE.y, label: 'Garage delivery' };
    m.stage = 'steal';
    say(S, 'MISSION: Borrowed Wheels — steal a car (E near traffic) and deliver it to the Garage.');
  } else if (i === 2) {
    m.waypoint = { x: CONFIG.PARK.x + 200, y: CONFIG.PARK.y + 200, label: 'Package pickup' };
    m.package = { x: CONFIG.PARK.x + 200, y: CONFIG.PARK.y + 200 };
    m.stage = 'pickup';
    say(S, 'MISSION: The Big Score — grab the package in the park, then run it to the Docks. Cops will come.');
  }
}

function completeMission(S) {
  const m = S.missions;
  const reward = CONFIG.MISSION_REWARDS[m.index];
  S.player.cash += reward;
  m.completed[m.index] = true;
  S.audio.jingle();
  say(S, `MISSION COMPLETE: ${MISSION_NAMES[m.index]} — +$${reward}`, 5);
  clearHeat(S);
  S.saveGame();
  m.index += 1;
  if (m.index < 3) {
    m.stage = 'brief';
    m.timer = 2.5; // short breather before the next briefing
    m.waypoint = null;
  } else {
    m.stage = 'done';
    m.waypoint = null;
    say(S, 'STORY COMPLETE — Solara Bay is yours. Taxi fares and cash drops keep paying.', 6);
  }
}

function spawnFare(S) {
  const m = S.missions;
  const spots = [
    { x: CONFIG.HOTEL.x, y: CONFIG.HOTEL.y },
    { x: CONFIG.MARINA.x, y: CONFIG.MARINA.y },
    { x: CONFIG.PARK.x + 200, y: CONFIG.PARK.y + 200 },
    { x: 640, y: 1840 },
    { x: 2640, y: 1440 },
    { x: 1040, y: 300 },
    { x: 2240, y: 640 },
  ];
  const from = S.rng.pick(spots);
  let to = S.rng.pick(spots);
  while (to === from) to = S.rng.pick(spots);
  m.fare = {
    from: { x: from.x, y: from.y },
    to: { x: to.x, y: to.y },
    reward: S.rng.int(CONFIG.TAXI_MIN, CONFIG.TAXI_MAX),
    stage: 'pickup',
    timer: 75,
  };
  say(S, `TAXI FARE: pick up a rider (${m.fare.reward}$) — marker on the map.`, 4);
}

function spawnDrop(S) {
  const m = S.missions;
  m.drops.push({
    x: S.rng.range(200, CONFIG.WORLD_W - 200),
    y: S.rng.range(200, CONFIG.BEACH_Y - 60),
    amount: S.rng.int(10, 40),
    taken: false,
  });
}

export function updateMissions(dt, S) {
  const m = S.missions;
  const p = S.player;
  if (m.messageTimer > 0) m.messageTimer -= dt;

  // Briefing breather between story missions.
  if (m.stage === 'brief' && m.index < 3) {
    m.timer -= dt;
    if (m.timer <= 0) startMission(S, m.index);
    return;
  }

  const near = (pt, r = 70) => Math.hypot(p.x - pt.x, p.y - pt.y) < r;

  if (m.index === 0 && m.stage === 'pickup' && m.passenger) {
    if (near(m.passenger, 60) && S.input.pressed('KeyE')) {
      m.stage = 'deliver';
      m.waypoint = { x: CONFIG.HOTEL.x, y: CONFIG.HOTEL.y, label: 'Hotel dropoff' };
      m.passenger = null;
      S.audio.pickup();
      say(S, 'Passenger aboard — drop them at the Grand Solara Hotel.');
    }
  } else if (m.index === 0 && m.stage === 'deliver') {
    if (near(CONFIG.HOTEL, 80)) completeMission(S);
  } else if (m.index === 1 && m.stage === 'steal') {
    if (p.car) {
      m.stage = 'deliver';
      setHeat(S, 2);
      addWanted(S, 1);
      say(S, 'Nice wheels. Now lose the heat and get it to the Garage.');
    }
  } else if (m.index === 1 && m.stage === 'deliver') {
    if (p.car && near(CONFIG.GARAGE, 90)) {
      // Hand the car over: park it in traffic and step out.
      S.traffic.cars.push({
        x: p.car.x, y: p.car.y, angle: p.car.angle, speed: 0, parked: true,
        dir: 1, axis: 'v', at: p.car.x, lane: 0,
        color: p.car.color, kind: p.car.kind || 'car', w: 46, h: 22, brake: 0,
      });
      p.car = null;
      p.driving = false;
      completeMission(S);
    } else if (!p.car) {
      say(S, 'You need a car for this job — steal one (E near traffic).', 3);
      m.stage = 'steal';
    }
  } else if (m.index === 2 && m.stage === 'pickup' && m.package) {
    if (near(m.package, 60) && S.input.pressed('KeyE')) {
      m.stage = 'deliver';
      m.package = null;
      m.waypoint = { x: CONFIG.DOCKS.x, y: CONFIG.DOCKS.y, label: 'Docks delivery' };
      setHeat(S, 3);
      addWanted(S, 1);
      S.audio.pickup();
      say(S, 'Package secured. Run it to the Docks — 3 stars on you. Go!');
    }
  } else if (m.index === 2 && m.stage === 'deliver') {
    if (near(CONFIG.DOCKS, 90)) completeMission(S);
  }

  // Taxi fares in free roam (and between missions).
  if (!m.fare) {
    m.fareTimer -= dt;
    if (m.fareTimer <= 0) {
      spawnFare(S);
      m.fareTimer = S.rng.range(25, 45);
    }
  } else {
    const f = m.fare;
    f.timer -= dt;
    if (f.timer <= 0) {
      say(S, 'Taxi fare expired — the rider walked away.', 3);
      m.fare = null;
      m.fareTimer = 20;
    } else if (f.stage === 'pickup' && near(f.from, 70) && p.car) {
      f.stage = 'dropoff';
      S.audio.pickup();
      say(S, 'Rider aboard — take them to the marker.');
    } else if (f.stage === 'dropoff' && near(f.to, 80)) {
      p.cash += f.reward;
      S.audio.jingle();
      say(S, `Fare paid: +$${f.reward}`, 3);
      m.fare = null;
      m.fareTimer = S.rng.range(20, 40);
      S.saveGame();
    }
  }

  // Cash drops: keep a few on the map, collect by walking/driving over them.
  if (m.drops.length < 4 && S.rng.chance(dt * 0.12)) spawnDrop(S);
  for (const d of m.drops) {
    if (!d.taken && Math.hypot(p.x - d.x, p.y - d.y) < 34) {
      d.taken = true;
      p.cash += d.amount;
      p.ammo = Math.min(CONFIG.PISTOL_AMMO, p.ammo + 4);
      S.audio.pickup();
      say(S, `Found cash: +$${d.amount} (+4 ammo)`, 2.5);
      S.saveGame();
    }
  }
  m.drops = m.drops.filter((d) => !d.taken);
}

/** Objective line for the HUD. */
export function objectiveText(S) {
  const m = S.missions;
  if (m.index >= 3) return 'Free roam — taxi fares and cash drops pay the bills';
  const name = MISSION_NAMES[m.index];
  if (m.stage === 'brief') return `${name}: starting soon…`;
  if (m.index === 0 && m.stage === 'pickup') return `${name}: pick up the passenger at the Marina (E)`;
  if (m.index === 0 && m.stage === 'deliver') return `${name}: drop the passenger at the Hotel`;
  if (m.index === 1 && m.stage === 'steal') return `${name}: steal a car (E near traffic)`;
  if (m.index === 1 && m.stage === 'deliver') return `${name}: deliver the car to the Garage`;
  if (m.index === 2 && m.stage === 'pickup') return `${name}: grab the package in the park (E)`;
  if (m.index === 2 && m.stage === 'deliver') return `${name}: deliver the package to the Docks`;
  return name;
}
