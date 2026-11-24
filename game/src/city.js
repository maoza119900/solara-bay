// Solara Bay — the city. One job: generate the road grid, building blocks,
// beach, park and props from the seeded RNG, and answer collision queries.
import { CONFIG, PALETTE } from './config.js';

export function buildCity(rng) {
  const buildings = [];
  const palms = [];
  const props = [];
  const { AVENUES, STREETS, ROAD_W, WORLD_W, WORLD_H, BEACH_Y, PARK } = CONFIG;

  // Building blocks: the rectangles between neighbouring roads.
  for (let ai = 0; ai < AVENUES.length - 1; ai++) {
    for (let si = 0; si < STREETS.length - 1; si++) {
      const x0 = AVENUES[ai] + ROAD_W / 2 + 14;
      const x1 = AVENUES[ai + 1] - ROAD_W / 2 - 14;
      const y0 = STREETS[si] + ROAD_W / 2 + 14;
      const y1 = STREETS[si + 1] - ROAD_W / 2 - 14;
      if (x1 - x0 < 60 || y1 - y0 < 60) continue;
      // The park block stays open green space.
      if (x0 >= PARK.x && y0 >= PARK.y && x1 <= PARK.x + PARK.w && y1 <= PARK.y + PARK.h) {
        for (let p = 0; p < 14; p++) {
          palms.push({ x: rng.range(x0 + 20, x1 - 20), y: rng.range(y0 + 20, y1 - 20), s: rng.range(0.8, 1.3) });
        }
        props.push({ kind: 'pond', x: PARK.x + 200, y: PARK.y + 200, r: 62 });
        continue;
      }
      // One or two buildings per block, with a small plaza gap.
      const split = rng.chance(0.55);
      const spots = split
        ? [
            { x: x0, y: y0, w: (x1 - x0) * 0.46, h: y1 - y0 },
            { x: x0 + (x1 - x0) * 0.54, y: y0, w: (x1 - x0) * 0.46, h: y1 - y0 },
          ]
        : [{ x: x0, y: y0, w: x1 - x0, h: y1 - y0 }];
      for (const s of spots) {
        const w = Math.min(s.w, rng.range(120, Math.max(130, s.w)));
        const h = Math.min(s.h, rng.range(110, Math.max(120, s.h)));
        const bx = s.x + (s.w - w) / 2;
        const by = s.y + (s.h - h) / 2;
        const ci = Math.floor(rng.float() * PALETTE.building.length);
        buildings.push({
          x: bx, y: by, w, h,
          color: PALETTE.building[ci],
          roof: PALETTE.roof[ci],
          floors: rng.int(1, 4),
          name: rng.pick(['HOTEL', 'CAFÉ', 'MART', 'APTS', 'OFFICE', 'DINER', 'CLUB', 'SHOP']),
        });
      }
      // A couple of palms on the sidewalk corners of each block.
      for (let p = 0; p < 2; p++) {
        palms.push({
          x: rng.chance(0.5) ? x0 - 8 : x1 + 8,
          y: rng.chance(0.5) ? y0 - 8 : y1 + 8,
          s: rng.range(0.8, 1.2),
        });
      }
    }
  }

  // Beach palms along the sand.
  for (let x = 120; x < WORLD_W - 100; x += 130) {
    palms.push({ x: x + rng.range(-30, 30), y: CONFIG.BEACH_Y + rng.range(30, 120), s: rng.range(0.9, 1.4) });
  }

  // Benches and lamps in the park, hydrants and bins on sidewalks.
  for (let i = 0; i < 10; i++) {
    props.push({ kind: 'bench', x: PARK.x + rng.range(30, PARK.w - 30), y: PARK.y + rng.range(30, PARK.h - 30) });
  }
  for (let i = 0; i < 24; i++) {
    const av = rng.pick(AVENUES);
    const st = rng.pick(STREETS);
    props.push({ kind: rng.pick(['hydrant', 'bin', 'lamp']), x: av + ROAD_W / 2 + 8, y: st + rng.range(-140, 140) });
  }

  return { buildings, palms, props, rng };
}

export function isOnRoad(x, y) {
  const { AVENUES, STREETS, ROAD_W, BEACH_Y } = CONFIG;
  if (y >= BEACH_Y) return false;
  for (const a of AVENUES) if (Math.abs(x - a) <= ROAD_W / 2) return true;
  for (const s of STREETS) if (Math.abs(y - s) <= ROAD_W / 2) return true;
  return false;
}

/** Nearest road centre line to a point, as {axis:'v'|'h', at:number}. */
export function nearestRoad(x, y) {
  const { AVENUES, STREETS } = CONFIG;
  let bestV = AVENUES[0];
  let bestD = Infinity;
  for (const a of AVENUES) {
    const d = Math.abs(x - a);
    if (d < bestD) { bestD = d; bestV = a; }
  }
  let bestH = STREETS[0];
  let bestHd = Infinity;
  for (const s of STREETS) {
    const d = Math.abs(y - s);
    if (d < bestHd) { bestHd = d; bestH = s; }
  }
  return bestD <= bestHd ? { axis: 'v', at: bestV } : { axis: 'h', at: bestH };
}

/** Circle-vs-building collision. Returns the building hit, or null. */
export function circleHitsBuilding(city, x, y, r) {
  for (const b of city.buildings) {
    const cx = Math.max(b.x, Math.min(x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(y, b.y + b.h));
    const dx = x - cx;
    const dy = y - cy;
    if (dx * dx + dy * dy < r * r) return b;
  }
  return null;
}

/** Push a circle out of any building it overlaps. Returns true if it hit one. */
export function resolveBuildingCollision(city, pos, r) {
  let hit = false;
  for (const b of city.buildings) {
    const cx = Math.max(b.x, Math.min(pos.x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(pos.y, b.y + b.h));
    let dx = pos.x - cx;
    let dy = pos.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 >= r * r) continue;
    hit = true;
    if (d2 < 0.0001) {
      // Centre inside the building: push out along the smallest penetration axis.
      const left = pos.x - b.x;
      const right = b.x + b.w - pos.x;
      const top = pos.y - b.y;
      const bottom = b.y + b.h - pos.y;
      const m = Math.min(left, right, top, bottom);
      if (m === left) pos.x = b.x - r;
      else if (m === right) pos.x = b.x + b.w + r;
      else if (m === top) pos.y = b.y - r;
      else pos.y = b.y + b.h + r;
    } else {
      const d = Math.sqrt(d2);
      dx /= d;
      dy /= d;
      pos.x = cx + dx * r;
      pos.y = cy + dy * r;
    }
  }
  return hit;
}

export function clampToWorld(pos, margin = 20) {
  pos.x = Math.max(margin, Math.min(CONFIG.WORLD_W - margin, pos.x));
  pos.y = Math.max(margin, Math.min(CONFIG.WORLD_H - margin, pos.y));
}
