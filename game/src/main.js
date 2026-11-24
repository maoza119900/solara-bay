// Solara Bay — boot and game loop. One job: build the world, run the fixed
// 1/60 s steps, switch screens, save/load, and stage screenshots when asked.
import { CONFIG } from './config.js';
import { RNG } from './random.js';
import { buildCity } from './city.js';
import { AudioSys } from './audio.js';
import { Input } from './input.js';
import { createTraffic, updateTraffic, updateTrafficRespawn } from './traffic.js';
import { createPolice, updatePolice } from './police.js';
import { createMissions, updateMissions, startMission } from './missions.js';
import { createPlayer, updatePlayer } from './player.js';
import { createCamera, updateCamera, render } from './render.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const seedParam = Number(params.get('seed'));
const seed = Number.isFinite(seedParam) && seedParam !== 0 ? seedParam : (Date.now() % 2147483647);
const shotName = params.get('shot');

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

function loadSave() {
  try {
    const raw = localStorage.getItem(CONFIG.SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function buildWorld() {
  const rng = new RNG(seed);
  const city = buildCity(rng);
  const S = {
    rng,
    city,
    seed,
    time: 0,
    clockMinutes: 9 * 60 + 24, // the day starts at 09:24
    clockText: '09:24',
    screen: 'title',
    shake: 0,
    messages: [],
    effects: [],
    camera: createCamera(),
    player: createPlayer(),
    traffic: createTraffic(rng, city),
    police: createPolice(),
    missions: createMissions(),
    audio: new AudioSys(),
    input: null,
    ctx,
    saveExists: false,
    saveGame: () => {},
    saveBest: () => {},
  };
  S.input = new Input(canvas);
  S.input.onFirstGesture = () => S.audio.init();

  const save = loadSave();
  if (save) {
    S.saveExists = true;
    S.player.bestCash = save.bestCash || 0;
    S.savedProgress = save;
  }

  S.saveGame = () => {
    try {
      const p = S.player;
      const best = Math.max(p.bestCash, p.cash);
      p.bestCash = best;
      localStorage.setItem(CONFIG.SAVE_KEY, JSON.stringify({
        cash: p.cash,
        bestCash: best,
        missionIndex: S.missions.index,
        completed: S.missions.completed,
        savedAt: Date.now(),
      }));
      S.saveExists = true;
    } catch { /* storage is best-effort */ }
  };
  S.saveBest = () => {
    try {
      const p = S.player;
      const best = Math.max(p.bestCash, p.cash);
      p.bestCash = best;
      localStorage.setItem(CONFIG.SAVE_KEY, JSON.stringify({
        cash: p.cash,
        bestCash: best,
        missionIndex: S.missions.index,
        completed: S.missions.completed,
        savedAt: Date.now(),
      }));
    } catch { /* storage is best-effort */ }
  };
  return S;
}

const S = buildWorld();

function applySave() {
  const save = S.savedProgress;
  if (!save) return;
  S.player.cash = save.cash || 0;
  S.player.bestCash = save.bestCash || 0;
  if (save.missionIndex !== undefined && save.missionIndex < 3) {
    S.missions.index = save.missionIndex;
    S.missions.completed = save.completed || [false, false, false];
    S.missions.stage = 'brief';
    S.missions.timer = 1.5;
  }
}

function updateClock(dt) {
  S.clockMinutes += dt * 0.6; // one game minute per real second, roughly
  if (S.clockMinutes >= 24 * 60) S.clockMinutes -= 24 * 60;
  const h = Math.floor(S.clockMinutes / 60);
  const m = Math.floor(S.clockMinutes % 60);
  S.clockText = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function step(dt) {
  S.time += dt;
  if (S.shake > 0) S.shake = Math.max(0, S.shake - dt * 26);
  for (const m of S.messages) m.t -= dt;
  S.messages = S.messages.filter((m) => m.t > 0);
  for (const e of S.effects) e.t -= dt;
  S.effects = S.effects.filter((e) => e.t > 0);

  if (S.screen !== 'play') return;
  updateClock(dt);
  updatePlayer(dt, S);
  updateTraffic(dt, S);
  updateTrafficRespawn(dt, S);
  updatePolice(dt, S);
  updateMissions(dt, S);
  updateCamera(dt, S);
  S.audio.engine(S.player.driving && S.player.car ? Math.abs(S.player.car.speed) / CONFIG.CAR_MAX_SPEED : 0, !!(S.player.driving && S.player.car));
}

function handleScreens() {
  const input = S.input;
  if (input.pressed('KeyM')) {
    S.audio.setMuted(!S.audio.muted);
    S.messages.push({ text: S.audio.muted ? 'Sound muted (M)' : 'Sound on (M)', t: 2 });
  }
  if (S.screen === 'title') {
    if (input.pressed('Enter') || input.pressed('NumpadEnter')) {
      S.audio.init();
      S.audio.click();
      S.screen = 'play';
      S.missions.stage = 'brief';
      S.missions.timer = 1.2;
      S.missions.index = 0;
    } else if (input.pressed('KeyC') && S.saveExists) {
      S.audio.init();
      applySave();
      S.screen = 'play';
      S.missions.stage = 'brief';
      S.missions.timer = 1.2;
    }
  } else if (S.screen === 'play') {
    if (input.pressed('KeyP') || input.pressed('Escape')) {
      S.screen = 'pause';
      S.audio.click();
    }
  } else if (S.screen === 'pause') {
    if (input.pressed('KeyP') || input.pressed('Escape') || input.pressed('Enter')) {
      S.screen = 'play';
      S.audio.click();
    }
  } else if (S.screen === 'wasted' || S.screen === 'busted') {
    if (input.pressed('Enter')) {
      const best = S.player.bestCash;
      S.audio.dispose();
      const fresh = buildWorld();
      Object.assign(S, fresh);
      S.player.bestCash = best;
      S.saveExists = fresh.saveExists;
      S.screen = 'play';
      S.missions.stage = 'brief';
      S.missions.timer = 1.2;
    }
  }
}

// Screenshot mode: stage the scene and paint it, no loop.
if (shotName) {
  stageShot(shotName, S);
} else {
  // Fixed-step loop at 1/60 s.
  let last = performance.now();
  let acc = 0;
  const STEP = 1 / 60;
  function frame(now) {
    requestAnimationFrame(frame);
    let elapsed = (now - last) / 1000;
    last = now;
    if (elapsed > 0.25) elapsed = 0.25;
    acc += elapsed;
    handleScreens();
    let n = 0;
    while (acc >= STEP && n < 5) {
      step(STEP);
      acc -= STEP;
      n++;
    }
    render(S);
    S.input.endFrame();
    if (statusEl) {
      statusEl.textContent = `Solara Bay — ${S.screen} · $${S.player.cash} · ${S.police.wanted}★ · seed ${seed}`;
    }
  }
  requestAnimationFrame(frame);
}
