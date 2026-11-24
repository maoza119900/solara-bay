// Solara Bay — rendering. One job: draw the world, the HUD, the minimap and
// the menus on the 1280x720 canvas, from the game state.
import { CONFIG, PALETTE } from './config.js';
import { objectiveText } from './missions.js';

export function createCamera() {
  return { x: CONFIG.SPAWN.x, y: CONFIG.SPAWN.y, shake: 0 };
}

export function updateCamera(dt, S) {
  const cam = S.camera;
  const p = S.player;
  // Look ahead along the player's velocity.
  const tx = p.x + p.vx * 0.35;
  const ty = p.y + p.vy * 0.35;
  const k = 1 - Math.pow(0.0015, dt);
  cam.x += (tx - cam.x) * k;
  cam.y += (ty - cam.y) * k;
  cam.x = Math.max(CONFIG.VIEW_W / 2 - 200, Math.min(CONFIG.WORLD_W - CONFIG.VIEW_W / 2 + 200, cam.x));
  cam.y = Math.max(CONFIG.VIEW_H / 2 - 200, Math.min(CONFIG.WORLD_H - CONFIG.VIEW_H / 2 + 200, cam.y));
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCar(ctx, x, y, angle, color, kind, w = 46, h = 22) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  rr(ctx, -w / 2 + 2, -h / 2 + 3, w, h, 7);
  ctx.fill();
  ctx.fillStyle = color;
  rr(ctx, -w / 2, -h / 2, w, h, 7);
  ctx.fill();
  ctx.fillStyle = 'rgba(20,30,44,0.85)';
  rr(ctx, -w / 2 + 10, -h / 2 + 3, 14, h - 6, 3);
  ctx.fill();
  ctx.fillStyle = 'rgba(220,235,245,0.75)';
  rr(ctx, -w / 2 + 2, -h / 2 + 3, 5, h - 6, 2);
  ctx.fill();
  if (kind === 'taxi') {
    ctx.fillStyle = '#ffd23d';
    ctx.fillRect(-6, -h / 2 - 2, 12, 4);
    ctx.fillStyle = '#222';
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TAXI', 0, 3);
  }
  ctx.fillStyle = '#fff8c9';
  ctx.fillRect(w / 2 - 2, -h / 2 + 3, 2, 4);
  ctx.fillRect(w / 2 - 2, h / 2 - 7, 2, 4);
  ctx.restore();
}

function drawPerson(ctx, x, y, angle, color, walkPhase, isCop) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const bob = Math.sin(walkPhase) * 2;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(1, 3, 9, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Legs
  ctx.strokeStyle = '#2b2b3a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-4, 0);
  ctx.lineTo(-8 - bob, 6);
  ctx.moveTo(4, 0);
  ctx.lineTo(8 + bob, 6);
  ctx.stroke();
  // Body
  ctx.fillStyle = isCop ? '#1c2733' : color;
  rr(ctx, -7, -8, 14, 14, 5);
  ctx.fill();
  if (isCop) {
    ctx.fillStyle = '#ffd23d';
    ctx.fillRect(-7, -2, 14, 3);
  }
  // Head
  ctx.fillStyle = '#f0c8a0';
  ctx.beginPath();
  ctx.arc(0, -11, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = isCop ? '#16202c' : '#333';
  ctx.beginPath();
  ctx.arc(0, -12.5, 5.5, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPalm(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.strokeStyle = PALETTE.palmTrunk;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(3, -10, 6, -18);
  ctx.stroke();
  ctx.fillStyle = PALETTE.palmLeaf;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(6 + Math.cos(a) * 9, -18 + Math.sin(a) * 6, 10, 4, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function render(S) {
  const ctx = S.ctx;
  const cam = S.camera;
  const { VIEW_W, VIEW_H } = CONFIG;
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);

  ctx.save();
  let sx = 0;
  let sy = 0;
  if (S.shake > 0.3) {
    sx = (Math.random() - 0.5) * S.shake;
    sy = (Math.random() - 0.5) * S.shake;
  }
  ctx.translate(-cam.x + VIEW_W / 2 + sx, -cam.y + VIEW_H / 2 + sy);

  const vx0 = cam.x - VIEW_W / 2 - 40;
  const vy0 = cam.y - VIEW_H / 2 - 40;
  const vx1 = cam.x + VIEW_W / 2 + 40;
  const vy1 = cam.y + VIEW_H / 2 + 40;

  drawGround(ctx, S, vx0, vy0, vx1, vy1);
  drawRoads(ctx, S, vx0, vy0, vx1, vy1);
  drawProps(ctx, S, vx0, vy0, vx1, vy1);
  drawBuildings(ctx, S, vx0, vy0, vx1, vy1);
  drawWaypoint(ctx, S);
  drawDrops(ctx, S);
  drawTraffic(ctx, S);
  drawPolice(ctx, S);
  drawPlayer(ctx, S);
  drawEffects(ctx, S);
  ctx.restore();

  drawHUD(ctx, S);
  if (S.screen === 'title') drawTitle(ctx, S);
  if (S.screen === 'pause') drawPause(ctx, S);
  if (S.screen === 'wasted' || S.screen === 'busted') drawGameOver(ctx, S);
  drawVignette(ctx, S);
}

function drawGround(ctx, S, vx0, vy0, vx1, vy1) {
  const { WORLD_W, BEACH_Y, OCEAN_Y } = CONFIG;
  // Grass base.
  ctx.fillStyle = PALETTE.grass;
  ctx.fillRect(vx0, vy0, vx1 - vx0, vy1 - vy0);
  // Mow stripes for texture.
  ctx.fillStyle = PALETTE.grassDark;
  const stripe = 160;
  const yStart = Math.max(vy0, 0);
  const yEnd = Math.min(vy1, BEACH_Y);
  for (let y = Math.floor(yStart / stripe) * stripe; y < yEnd; y += stripe * 2) {
    ctx.fillRect(vx0, y, vx1 - vx0, stripe);
  }
  // Park.
  const pk = CONFIG.PARK;
  ctx.fillStyle = PALETTE.park;
  ctx.fillRect(pk.x, pk.y, pk.w, pk.h);
  ctx.fillStyle = PALETTE.parkPath;
  ctx.fillRect(pk.x, pk.y + pk.h / 2 - 8, pk.w, 16);
  ctx.fillRect(pk.x + pk.w / 2 - 8, pk.y, 16, pk.h);
  // Pond.
  ctx.fillStyle = '#4d8fc9';
  ctx.beginPath();
  ctx.arc(pk.x + 200, pk.y + 200, 62, 0, Math.PI * 2);
  ctx.fill();
  // Beach + ocean.
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(Math.max(vx0, 0), BEACH_Y, Math.min(vx1, WORLD_W) - Math.max(vx0, 0), OCEAN_Y - BEACH_Y);
  ctx.fillStyle = PALETTE.ocean;
  ctx.fillRect(Math.max(vx0, 0), OCEAN_Y, Math.min(vx1, WORLD_W) - Math.max(vx0, 0), CONFIG.WORLD_H - OCEAN_Y);
  ctx.fillStyle = PALETTE.oceanDeep;
  for (let x = Math.floor(vx0 / 180) * 180; x < vx1; x += 180) {
    ctx.fillRect(x, OCEAN_Y + 46, 90, 6);
    ctx.fillRect(x + 40, OCEAN_Y + 96, 110, 6);
  }
  // Boardwalk line at the sand's edge.
  ctx.fillStyle = '#c9a86a';
  ctx.fillRect(Math.max(vx0, 0), BEACH_Y - 6, Math.min(vx1, WORLD_W) - Math.max(vx0, 0), 6);
}

function drawRoads(ctx, S, vx0, vy0, vx1, vy1) {
  const { AVENUES, STREETS, ROAD_W } = CONFIG;
  ctx.fillStyle = PALETTE.road;
  for (const a of AVENUES) {
    if (a > vx0 - ROAD_W && a < vx1 + ROAD_W) ctx.fillRect(a - ROAD_W / 2, 0, ROAD_W, CONFIG.BEACH_Y);
  }
  for (const s of STREETS) {
    if (s > vy0 - ROAD_W && s < vy1 + ROAD_W) ctx.fillRect(0, s - ROAD_W / 2, CONFIG.WORLD_W, ROAD_W);
  }
  // Sidewalks.
  ctx.fillStyle = PALETTE.sidewalk;
  for (const a of AVENUES) {
    if (a > vx0 - ROAD_W && a < vx1 + ROAD_W) {
      ctx.fillRect(a - ROAD_W / 2 - 10, 0, 10, CONFIG.BEACH_Y);
      ctx.fillRect(a + ROAD_W / 2, 0, 10, CONFIG.BEACH_Y);
    }
  }
  for (const s of STREETS) {
    if (s > vy0 - ROAD_W && s < vy1 + ROAD_W) {
      ctx.fillRect(0, s - ROAD_W / 2 - 10, CONFIG.WORLD_W, 10);
      ctx.fillRect(0, s + ROAD_W / 2, CONFIG.WORLD_W, 10);
    }
  }
  // Lane dashes.
  ctx.fillStyle = PALETTE.lane;
  for (const a of AVENUES) {
    if (a < vx0 - 60 || a > vx1 + 60) continue;
    for (let y = 0; y < CONFIG.BEACH_Y; y += 48) {
      if (y + 24 > vy0 && y < vy1) ctx.fillRect(a - 2, y, 4, 24);
    }
  }
  for (const s of STREETS) {
    if (s < vy0 - 60 || s > vy1 + 60) continue;
    for (let x = 0; x < CONFIG.WORLD_W; x += 48) {
      if (x + 24 > vx0 && x < vx1) ctx.fillRect(x, s - 2, 24, 4);
    }
  }
}

function drawProps(ctx, S, vx0, vy0, vx1, vy1) {
  for (const palm of S.city.palms) {
    if (palm.x > vx0 && palm.x < vx1 && palm.y > vy0 && palm.y < vy1) drawPalm(ctx, palm.x, palm.y, palm.s);
  }
  for (const pr of S.city.props) {
    if (pr.x < vx0 || pr.x > vx1 || pr.y < vy0 || pr.y > vy1) continue;
    if (pr.kind === 'pond') continue;
    if (pr.kind === 'bench') {
      ctx.fillStyle = '#8a6d4b';
      ctx.fillRect(pr.x - 14, pr.y - 5, 28, 10);
    } else if (pr.kind === 'hydrant') {
      ctx.fillStyle = '#d94f3d';
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (pr.kind === 'bin') {
      ctx.fillStyle = '#4a5560';
      ctx.fillRect(pr.x - 5, pr.y - 6, 10, 12);
    } else if (pr.kind === 'lamp') {
      ctx.strokeStyle = '#333a42';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(pr.x, pr.y);
      ctx.lineTo(pr.x, pr.y - 22);
      ctx.stroke();
      ctx.fillStyle = '#ffe9a8';
      ctx.beginPath();
      ctx.arc(pr.x, pr.y - 24, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawBuildings(ctx, S, vx0, vy0, vx1, vy1) {
  for (const b of S.city.buildings) {
    if (b.x + b.w < vx0 || b.x > vx1 || b.y + b.h < vy0 || b.y > vy1) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(b.x + 5, b.y + 6, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = b.roof;
    ctx.fillRect(b.x + 8, b.y + 8, b.w - 16, b.h - 16);
    // Windows.
    ctx.fillStyle = 'rgba(255,255,220,0.85)';
    for (let wx = b.x + 16; wx < b.x + b.w - 14; wx += 26) {
      for (let wy = b.y + 16; wy < b.y + b.h - 14; wy += 26) {
        ctx.fillRect(wx, wy, 12, 12);
      }
    }
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(b.name, b.x + b.w / 2, b.y + b.h / 2 + 5);
  }
}

function drawWaypoint(ctx, S) {
  const m = S.missions;
  const fare = m.fare;
  const drawMarker = (x, y, label, color) => {
    const bob = Math.sin(S.time * 3) * 5;
    ctx.save();
    ctx.translate(x, y + bob - 26);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-12, -26);
    ctx.lineTo(12, -26);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, -26, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(x, y, 26, 10, 0, 0, Math.PI * 2);
    ctx.stroke();
    if (label) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.lineWidth = 3;
      ctx.strokeText(label, x, y - 44);
      ctx.fillText(label, x, y - 44);
    }
  };
  if (m.waypoint) drawMarker(m.waypoint.x, m.waypoint.y, m.waypoint.label, PALETTE.waypoint);
  if (m.passenger) drawMarker(m.passenger.x, m.passenger.y, 'PASSENGER', PALETTE.marker);
  if (m.package) drawMarker(m.package.x, m.package.y, 'PACKAGE', PALETTE.marker);
  if (fare) {
    const pt = fare.stage === 'pickup' ? fare.from : fare.to;
    drawMarker(pt.x, pt.y, fare.stage === 'pickup' ? `TAXI $${fare.reward}` : 'DROPOFF', '#4fd9d9');
  }
}

function drawDrops(ctx, S) {
  for (const d of S.missions.drops) {
    const bob = Math.sin(S.time * 4 + d.x) * 3;
    ctx.save();
    ctx.translate(d.x, d.y + bob);
    ctx.fillStyle = '#2f9e44';
    rr(ctx, -11, -7, 22, 14, 3);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('$', 0, 4);
    ctx.restore();
  }
}

function drawTraffic(ctx, S) {
  for (const car of S.traffic.cars) {
    drawCar(ctx, car.x, car.y, car.angle, car.color, car.kind, car.w, car.h);
  }
  for (const ped of S.traffic.peds) {
    drawPerson(ctx, ped.x, ped.y, ped.angle, ped.color, ped.walkPhase, false);
  }
}

function drawPolice(ctx, S) {
  const flash = Math.floor(S.time * 6) % 2 === 0;
  for (const car of S.police.cars) {
    drawCar(ctx, car.x, car.y, car.angle, PALETTE.police, 'police', 48, 24);
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    ctx.fillStyle = flash ? PALETTE.policeLight : PALETTE.policeLight2;
    ctx.fillRect(-8, -14, 16, 5);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('POLICE', 0, 3);
    ctx.restore();
  }
  for (const cop of S.police.cops) {
    drawPerson(ctx, cop.x, cop.y, cop.angle, '#1c2733', S.time * 8, true);
  }
}

function drawPlayer(ctx, S) {
  const p = S.player;
  if (p.driving && p.car) {
    drawCar(ctx, p.car.x, p.car.y, p.car.angle, p.car.color, p.car.kind, p.car.w, p.car.h);
    // Driver silhouette.
    ctx.save();
    ctx.translate(p.car.x, p.car.y);
    ctx.rotate(p.car.angle);
    ctx.fillStyle = PALETTE.playerShirt;
    ctx.beginPath();
    ctx.arc(-6, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  // On foot: shadow, body, head, aim line, muzzle flash, punch arc.
  ctx.save();
  ctx.translate(p.x, p.y);
  if (p.invuln > 0 && Math.floor(S.time * 14) % 2 === 0) ctx.globalAlpha = 0.45;
  ctx.rotate(p.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(1, 4, 10, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.player;
  rr(ctx, -9, -9, 18, 18, 6);
  ctx.fill();
  ctx.fillStyle = PALETTE.playerShirt;
  ctx.fillRect(-2, -9, 6, 18);
  ctx.fillStyle = '#f0c8a0';
  ctx.beginPath();
  ctx.arc(11, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  // Pistol in hand.
  ctx.fillStyle = '#222';
  ctx.fillRect(10, -2, 12, 4);
  if (p.muzzle > 0) {
    ctx.fillStyle = '#ffd23d';
    ctx.beginPath();
    ctx.arc(26, 0, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  if (p.punchTimer > 0) {
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(20, 0, 12, -0.9, 0.9);
    ctx.stroke();
  }
  ctx.restore();
}

function drawEffects(ctx, S) {
  for (const e of S.effects) {
    if (e.kind === 'shot') {
      ctx.strokeStyle = 'rgba(255,210,61,0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(e.x0, e.y0);
      ctx.lineTo(e.x, e.y);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,210,61,0.7)';
      ctx.beginPath();
      ctx.arc(e.x, e.y, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.kind === 'smoke') {
      ctx.fillStyle = 'rgba(200,200,200,0.5)';
      ctx.beginPath();
      ctx.arc(e.x, e.y, 8 + (0.3 - e.t) * 20, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = PALETTE.hudBg;
  rr(ctx, x, y, w, h, 10);
  ctx.fill();
}

function drawHUD(ctx, S) {
  const p = S.player;
  const { VIEW_W } = CONFIG;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // Top-left: health + cash.
  panel(ctx, 14, 12, 250, 64);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('ROOK', 26, 34);
  ctx.fillStyle = '#333';
  ctx.fillRect(26, 42, 150, 12);
  ctx.fillStyle = p.health > 30 ? '#4fd94f' : '#ff5a3c';
  ctx.fillRect(26, 42, 150 * Math.max(0, p.health / 100), 12);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(`$${p.cash}`, 186, 54);
  ctx.fillStyle = '#ffd23d';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText(`BEST $${Math.max(p.bestCash, p.cash)}`, 26, 70);

  // Top-centre: wanted stars + clock.
  const stars = S.police.wanted;
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < stars ? '#ffd23d' : 'rgba(255,255,255,0.25)';
    const sx = VIEW_W / 2 - 60 + i * 30;
    ctx.fillText('★', sx, 40);
  }
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(S.clockText, VIEW_W / 2, 62);

  // Objective tracker under the stars.
  const obj = objectiveText(S);
  ctx.font = 'bold 14px sans-serif';
  const ow = ctx.measureText(obj).width + 24;
  panel(ctx, VIEW_W / 2 - ow / 2, 70, ow, 26);
  ctx.fillStyle = '#ffd23d';
  ctx.fillText(obj, VIEW_W / 2, 88);

  // Bottom-left: speed + ammo when driving / on foot.
  panel(ctx, 14, CONFIG.VIEW_H - 58, 360, 44);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'left';
  if (p.driving && p.car) {
    const mph = Math.round(Math.abs(p.car.speed) * 0.14);
    ctx.fillText(`${mph} mph`, 26, CONFIG.VIEW_H - 30);
    ctx.fillStyle = '#cfd6dd';
    ctx.font = '13px sans-serif';
    ctx.fillText('E exit · Space handbrake', 96, CONFIG.VIEW_H - 30);
  } else {
    ctx.fillText(`AMMO ${p.ammo}`, 26, CONFIG.VIEW_H - 30);
    ctx.fillStyle = '#cfd6dd';
    ctx.font = '13px sans-serif';
    ctx.fillText('E enter car · F punch · click shoot', 104, CONFIG.VIEW_H - 30);
  }

  // Message feed, bottom-centre.
  ctx.textAlign = 'center';
  ctx.font = 'bold 15px sans-serif';
  let my = CONFIG.VIEW_H - 76;
  for (let i = S.messages.length - 1; i >= 0; i--) {
    const msg = S.messages[i];
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    const w = ctx.measureText(msg.text).width + 20;
    ctx.fillRect(VIEW_W / 2 - w / 2, my - 16, w, 22);
    ctx.fillStyle = '#fff';
    ctx.fillText(msg.text, VIEW_W / 2, my);
    my -= 26;
  }
  if (S.missions.messageTimer > 0) {
    ctx.fillStyle = '#ffd23d';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(S.missions.message, VIEW_W / 2, CONFIG.VIEW_H - 140);
  }

  drawMinimap(ctx, S);
}

function drawMinimap(ctx, S) {
  const mw = 220;
  const mh = 168;
  const mx = CONFIG.VIEW_W - mw - 14;
  const my = 12;
  const scaleX = mw / CONFIG.WORLD_W;
  const scaleY = mh / CONFIG.WORLD_H;
  panel(ctx, mx, my, mw, mh);
  ctx.save();
  ctx.beginPath();
  ctx.rect(mx, my, mw, mh);
  ctx.clip();
  ctx.fillStyle = '#2f6b3a';
  ctx.fillRect(mx, my, mw, mh);
  // Ocean.
  ctx.fillStyle = '#2f7fb8';
  ctx.fillRect(mx, my + CONFIG.OCEAN_Y * scaleY, mw, mh - CONFIG.OCEAN_Y * scaleY);
  // Roads.
  ctx.fillStyle = '#565d68';
  for (const a of CONFIG.AVENUES) ctx.fillRect(mx + a * scaleX - 2, my, 4, CONFIG.BEACH_Y * scaleY);
  for (const s of CONFIG.STREETS) ctx.fillRect(mx, my + s * scaleY - 2, mw, 4);
  // Park.
  ctx.fillStyle = '#5d9b4a';
  ctx.fillRect(mx + CONFIG.PARK.x * scaleX, my + CONFIG.PARK.y * scaleY, CONFIG.PARK.w * scaleX, CONFIG.PARK.h * scaleY);
  // Waypoint.
  const m = S.missions;
  const mark = (x, y, color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(mx + x * scaleX, my + y * scaleY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  };
  if (m.waypoint) mark(m.waypoint.x, m.waypoint.y, '#ff5a3c');
  if (m.fare) mark(m.fare.stage === 'pickup' ? m.fare.from.x : m.fare.to.x, m.fare.stage === 'pickup' ? m.fare.from.y : m.fare.to.y, '#4fd9d9');
  // Police (red), traffic (grey) and player (white dot with ring).
  ctx.fillStyle = '#ff3b30';
  for (const c of S.police.cars) {
    ctx.beginPath();
    ctx.arc(mx + c.x * scaleX, my + c.y * scaleY, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(220,225,230,0.8)';
  for (const c of S.traffic.cars) {
    ctx.beginPath();
    ctx.arc(mx + c.x * scaleX, my + c.y * scaleY, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(mx + S.player.x * scaleX, my + S.player.y * scaleY, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffd23d';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(mx + S.player.x * scaleX, my + S.player.y * scaleY, 7, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('SOLARA BAY', mx + 8, my + mh - 8);
}

function drawTitle(ctx, S) {
  const { VIEW_W, VIEW_H } = CONFIG;
  ctx.fillStyle = 'rgba(8, 12, 24, 0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // Sun + skyline silhouette.
  ctx.fillStyle = '#ff9a3c';
  ctx.beginPath();
  ctx.arc(VIEW_W / 2, 210, 70, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffd23d';
  ctx.beginPath();
  ctx.arc(VIEW_W / 2, 210, 48, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#101725';
  for (let x = 60; x < VIEW_W - 60; x += 90) {
    const h = 60 + ((x * 37) % 110);
    ctx.fillRect(x, 300 - h, 64, h + 420);
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23d';
  ctx.font = 'bold 84px sans-serif';
  ctx.fillText('SOLARA BAY', VIEW_W / 2, 150);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('An open-world crime story — Marco "Rook" Reyes, driver for hire', VIEW_W / 2, 330);
  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#cfd6dd';
  const lines = [
    'WASD move / drive · Shift run · E enter, steal or exit a car · F punch',
    'Mouse aim · Click shoot · Space handbrake · P pause · M mute',
    'Steal cars, dodge the law, run three story missions, and get paid.',
  ];
  lines.forEach((l, i) => ctx.fillText(l, VIEW_W / 2, 372 + i * 26));
  if (S.saveExists) {
    ctx.fillStyle = '#4fd94f';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('Press ENTER to start — or C to continue your saved game', VIEW_W / 2, 480);
  } else {
    ctx.fillStyle = '#4fd94f';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('Press ENTER to start', VIEW_W / 2, 480);
  }
  ctx.fillStyle = '#8a97a5';
  ctx.font = '13px sans-serif';
  ctx.fillText('An original game. No assets, names or music from any commercial game.', VIEW_W / 2, 560);
  ctx.fillText('Best cash: $' + Math.max(S.player.bestCash, S.player.cash), VIEW_W / 2, 584);
}

function drawPause(ctx, S) {
  const { VIEW_W, VIEW_H } = CONFIG;
  ctx.fillStyle = 'rgba(8, 12, 24, 0.6)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 54px sans-serif';
  ctx.fillText('PAUSED', VIEW_W / 2, VIEW_H / 2 - 20);
  ctx.font = '18px sans-serif';
  ctx.fillStyle = '#cfd6dd';
  ctx.fillText('P / Esc to resume · M mute · progress auto-saves', VIEW_W / 2, VIEW_H / 2 + 24);
}

function drawGameOver(ctx, S) {
  const { VIEW_W, VIEW_H } = CONFIG;
  const busted = S.screen === 'busted';
  ctx.fillStyle = busted ? 'rgba(20, 30, 90, 0.72)' : 'rgba(90, 10, 10, 0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 72px sans-serif';
  ctx.fillText(busted ? 'BUSTED!' : 'WASTED', VIEW_W / 2, VIEW_H / 2 - 30);
  ctx.font = '20px sans-serif';
  ctx.fillStyle = '#cfd6dd';
  ctx.fillText(busted ? 'The Solara Bay PD caught up with you.' : 'Rook went down in the streets of Solara Bay.', VIEW_W / 2, VIEW_H / 2 + 16);
  ctx.fillStyle = '#ffd23d';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(`Cash kept: $${S.player.cash} · Best: $${Math.max(S.player.bestCash, S.player.cash)}`, VIEW_W / 2, VIEW_H / 2 + 56);
  ctx.fillStyle = '#4fd94f';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('Press ENTER to try again', VIEW_W / 2, VIEW_H / 2 + 104);
}

function drawVignette(ctx, S) {
  const p = S.player;
  if (p.health < 35 && S.screen === 'play') {
    const a = (35 - p.health) / 35 * 0.45 * (0.7 + 0.3 * Math.sin(S.time * 5));
    const g = ctx.createRadialGradient(
      CONFIG.VIEW_W / 2, CONFIG.VIEW_H / 2, CONFIG.VIEW_H * 0.35,
      CONFIG.VIEW_W / 2, CONFIG.VIEW_H / 2, CONFIG.VIEW_H * 0.75,
    );
    g.addColorStop(0, 'rgba(200,0,0,0)');
    g.addColorStop(1, `rgba(200,0,0,${a})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CONFIG.VIEW_W, CONFIG.VIEW_H);
  }
}
