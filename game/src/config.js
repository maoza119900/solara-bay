// Solara Bay — tuning numbers, palette and city layout constants.
// One job: every magic number the rest of the game shares lives here.
export const CONFIG = {
  VIEW_W: 1280,
  VIEW_H: 720,
  WORLD_W: 3200,
  WORLD_H: 2400,

  // City layout
  ROAD_W: 96,
  AVENUES: [240, 640, 1040, 1440, 1840, 2240, 2640, 2960], // vertical road centres
  STREETS: [240, 640, 1040, 1440, 1840, 2080], // horizontal road centres
  BEACH_Y: 2160, // sand starts here
  OCEAN_Y: 2300, // water starts here
  PARK: { x: 1040, y: 1040, w: 400, h: 400 }, // block between avenues 1040/1440, streets 1040/1440
  MARINA: { x: 320, y: 1980 },
  HOTEL: { x: 2680, y: 300 },
  GARAGE: { x: 1560, y: 1840 }, // on the 1840 street, reachable by car
  DOCKS: { x: 2900, y: 1980 },
  SPAWN: { x: 640, y: 640 },

  // Player on foot
  WALK_SPEED: 190,
  RUN_SPEED: 320,
  PLAYER_RADIUS: 14,
  PLAYER_HEALTH: 100,

  // Driving
  CAR_ACCEL: 520,
  CAR_BRAKE: 900,
  CAR_REVERSE: 260,
  CAR_MAX_SPEED: 460,
  CAR_MAX_REVERSE: 160,
  CAR_STEER: 2.6,
  CAR_GRIP: 3.2,

  // Combat
  PISTOL_DAMAGE: 34,
  PISTOL_AMMO: 12,
  PISTOL_RANGE: 420,
  PUNCH_DAMAGE: 12,
  PUNCH_RANGE: 46,

  // Wanted
  WANTED_DECAY_SECONDS: 9,
  WANTED_SIGHT_RANGE: 620,

  // Traffic
  TRAFFIC_CARS: 16,
  PEDESTRIANS: 26,
  TRAFFIC_SPEED: 130,

  // Missions
  MISSION_REWARDS: [150, 300, 600],
  TAXI_MIN: 20,
  TAXI_MAX: 60,

  SAVE_KEY: 'solara-bay.save',
};

export const PALETTE = {
  grass: '#7fae5a',
  grassDark: '#6f9c4e',
  road: '#3a3f47',
  roadEdge: '#565d68',
  lane: '#e8d44d',
  sidewalk: '#b9b3a4',
  sand: '#e8d193',
  ocean: '#2f7fb8',
  oceanDeep: '#1f5f94',
  building: ['#e8a87c', '#d98e8e', '#8ecae6', '#f2d492', '#b5a6d9', '#9fd3a8', '#f4a7b9', '#a8c8d8'],
  roof: ['#c97b5a', '#a86a6a', '#6a9ab5', '#c9a85a', '#8a7ab5', '#7aa87a', '#c97a90', '#7a9ab5'],
  park: '#5d9b4a',
  parkPath: '#cbb98a',
  palmTrunk: '#8a6d4b',
  palmLeaf: '#3f8f4f',
  carColors: ['#d94f3d', '#3d7ad9', '#e8c33d', '#e8e8e8', '#2b2b2b', '#7ad94f', '#d97ad9', '#4fd9d9'],
  player: '#2f6fd9',
  playerShirt: '#f2f2f2',
  police: '#1c2733',
  policeLight: '#ff3b30',
  policeLight2: '#3b82ff',
  marker: '#ffd23d',
  waypoint: '#ff5a3c',
  hudBg: 'rgba(10, 14, 20, 0.62)',
  text: '#ffffff',
  textDim: '#cfd6dd',
};

export const MISSION_NAMES = ['First Fare', 'Borrowed Wheels', 'The Big Score'];
