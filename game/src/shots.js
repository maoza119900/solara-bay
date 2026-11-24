// Solara Bay — staged screenshots. One job: given a shot name, put the world
// in the exact scene the shot needs, paint twice, and signal window.__shotReady.
// Called from main.js when the URL carries ?shot=<name>&seed=1.
import { CONFIG } from './config.js';
import { setHeat } from './police.js';
import { startMission } from './missions.js';
import { render } from './render.js';

export function stageShot(name, S) {
  const p = S.player;
  S.screen = 'play';
  S.messages = [];
  S.missions.message = '';
  S.missions.messageTimer = 0;

  if (name === 'chase') {
    // Cover: 3-star police chase while driving downtown, HUD + minimap + objective.
    p.x = 1440;
    p.y = 1040;
    p.car = { x: 1440, y: 1040, angle: 0, speed: 380, color: '#d94f3d', kind: 'car', w: 46, h: 22, sport: true };
    p.driving = true;
    p.cash = 450;
    p.health = 82;
    p.angle = 0;
    p.vx = 380;
    p.vy = 0;
    setHeat(S, 3);
    S.police.cars = [
      { x: 1300, y: 1000, angle: 0, speed: 340, w: 48, h: 24, siren: 0 },
      { x: 1560, y: 1120, angle: Math.PI, speed: 320, w: 48, h: 24, siren: 0.5 },
      { x: 1440, y: 880, angle: Math.PI / 2, speed: 300, w: 48, h: 24, siren: 0.2 },
    ];
    S.police.cops = [];
    S.camera.x = 1440;
    S.camera.y = 1040;
    S.missions.index = 2;
    S.missions.stage = 'deliver';
    S.missions.waypoint = { x: CONFIG.DOCKS.x, y: CONFIG.DOCKS.y, label: 'Docks delivery' };
    S.messages.push({ text: 'Package secured. Run it to the Docks — 3 stars on you. Go!', t: 5 });
  } else if (name === 'drive') {
    // Driving through downtown at speed, traffic and pedestrians around.
    p.x = 1040;
    p.y = 640;
    p.car = { x: 1040, y: 640, angle: 0, speed: 420, color: '#3d7ad9', kind: 'car', w: 46, h: 22, sport: false };
    p.driving = true;
    p.cash = 180;
    p.health = 100;
    p.angle = 0;
    p.vx = 420;
    p.vy = 0;
    S.police.wanted = 0;
    S.police.heat = 0;
    S.police.cars = [];
    S.police.cops = [];
    // A few traffic cars visible ahead and behind.
    S.traffic.cars[0].x = 1180;
    S.traffic.cars[0].y = 640;
    S.traffic.cars[0].angle = 0;
    S.traffic.cars[1].x = 900;
    S.traffic.cars[1].y = 664;
    S.traffic.cars[1].angle = Math.PI;
    S.traffic.cars[2].x = 1040;
    S.traffic.cars[2].y = 820;
    S.traffic.cars[2].angle = -Math.PI / 2;
    S.camera.x = 1040;
    S.camera.y = 640;
    S.missions.index = 0;
    S.missions.stage = 'pickup';
    S.missions.waypoint = { x: CONFIG.MARINA.x, y: CONFIG.MARINA.y, label: 'Marina pickup' };
    S.missions.passenger = { x: CONFIG.MARINA.x + 40, y: CONFIG.MARINA.y - 30 };
  } else if (name === 'mission') {
    // On-foot mission moment: Rook at the Marina pickup, waypoint marker visible.
    p.x = CONFIG.MARINA.x - 60;
    p.y = CONFIG.MARINA.y + 40;
    p.car = null;
    p.driving = false;
    p.cash = 150;
    p.health = 100;
    p.ammo = 9;
    p.angle = Math.PI / 4;
    p.vx = 0;
    p.vy = 0;
    S.police.wanted = 0;
    S.police.heat = 0;
    S.police.cars = [];
    S.police.cops = [];
    S.missions.index = 0;
    S.missions.stage = 'pickup';
    S.missions.waypoint = { x: CONFIG.MARINA.x, y: CONFIG.MARINA.y, label: 'Marina pickup' };
    S.missions.passenger = { x: CONFIG.MARINA.x + 40, y: CONFIG.MARINA.y - 30 };
    S.camera.x = CONFIG.MARINA.x;
    S.camera.y = CONFIG.MARINA.y;
    S.messages.push({ text: 'MISSION: First Fare — pick up the passenger at the Marina.', t: 5 });
  } else if (name === 'start') {
    // Title screen over the city.
    S.screen = 'title';
    S.saveExists = true;
    p.x = 1440;
    p.y = 1040;
    p.cash = 450;
    p.bestCash = 450;
    S.camera.x = 1440;
    S.camera.y = 1040;
  }

  // Paint twice so every staged element is on the canvas, then signal ready.
  render(S);
  render(S);
  window.__shotReady = true;
}
