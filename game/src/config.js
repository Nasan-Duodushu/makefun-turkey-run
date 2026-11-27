// Featherweight Fugitive — tuning, field and stage layouts.
// Everything the world and the renderer agree on lives here, so a stage can be
// rebalanced by editing numbers, never by touching the rules.
export const FIELD = { width: 1280, height: 720 };
export const STEP = 1 / 60;
export const GOAL_DISTANCE = 1500; // metres to the forest, shown on the HUD

export const PLAYER = {
  radius: 16,
  speed: 235, // px/s on foot
  boostSpeed: 305, // while the gravy-boat boost lasts
  boostSeconds: 4,
  invulnSeconds: 2, // after being caught, before the farmer can grab again
  hideSpeed: 90, // creeping while hidden in hay is slow
};

export const FARMER = {
  radius: 20,
  patrolSpeed: 115,
  chaseSpeed: [0, 242, 258, 276], // by stage (index 0 unused)
  suspiciousSpeed: 165,
  searchSpeed: 140,
  sightRadius: 265,
  sightHalfAngle: 0.62, // radians either side of facing; the turkey must be in front
  hearRadius: 150,
  catchRadius: 30,
  loseSightSeconds: 1.6, // out of sight this long before the chase is dropped
  searchSeconds: 5, // how long the farmer hunts the last-seen spot
  throwCooldown: [0, 3.4, 2.8, 2.2], // seconds between thrown knives, by stage
  throwSpeed: 420,
  throwWindup: 0.55, // telegraph before the knife leaves his hand
};

// Autumn palette: one coherent look across farmyard, barn and kitchen.
export const PALETTE = {
  grass: '#7a9b4e',
  grassDark: '#6b8a42',
  dirt: '#b98a52',
  dirtDark: '#a1763f',
  fence: '#8a6b45',
  hay: '#e3c268',
  hayDark: '#c9a94e',
  barnWood: '#7d5233',
  barnWoodDark: '#67422a',
  barnFloor: '#a97e4f',
  kitchenFloor: '#c9b18a',
  kitchenTile: '#b39a72',
  ovenGlow: '#e06a1e',
  ovenBody: '#4a4a52',
  tableWood: '#8a5a33',
  turkeyBody: '#8a5a2e',
  turkeyWing: '#6e4522',
  turkeyHead: '#d97b4f',
  turkeyBeak: '#e8a13c',
  farmerShirt: '#3e6b8e',
  farmerOveralls: '#4a5a7a',
  farmerSkin: '#e8b98a',
  farmerHat: '#d9c25a',
  knifeBlade: '#dfe6ea',
  corn: '#f2c531',
  feather: '#f4ede0',
  text: '#2e2118',
  hudBg: 'rgba(30, 20, 12, 0.72)',
  hudText: '#f7ead0',
  alert: '#e0483c',
};

// One rectangle: { x, y, w, h }. Walls block movement and the farmer's sight.
function rect(x, y, w, h) {
  return { x, y, w, h };
}

// Stage layouts. The exit is the gap in the far wall the turkey must reach;
// reaching it advances the stage (stage 3's exit is the back door = freedom).
export const STAGES = [
  {
    name: 'The Farmyard',
    subtitle: 'Dawn. The farmer is doing his rounds.',
    floor: 'grass',
    playerStart: { x: 90, y: 620 },
    farmerStart: { x: 640, y: 200 },
    exit: rect(1210, 300, 70, 120),
    exitLabel: 'TO THE BARN',
    walls: [
      rect(0, 0, 1280, 26), rect(0, 694, 1280, 26), // top + bottom fences
      rect(0, 0, 26, 720), // left fence (exit is on the right)
      rect(420, 120, 26, 220), rect(700, 420, 26, 220), // fence runs
      rect(880, 90, 200, 26), // fence run
    ],
    hay: [rect(300, 480, 96, 64), rect(980, 520, 96, 64), rect(560, 120, 96, 64)],
    crates: [],
    oven: null,
    knifeLanes: [],
    corn: [
      { x: 200, y: 200 }, { x: 480, y: 320 }, { x: 760, y: 180 },
      { x: 1020, y: 300 }, { x: 340, y: 620 }, { x: 880, y: 640 },
      { x: 620, y: 480 }, { x: 1140, y: 120 },
    ],
    feathers: [{ x: 540, y: 90 }, { x: 1080, y: 440 }],
    gravy: [{ x: 150, y: 90 }],
    farmerWaypoints: [
      { x: 640, y: 200 }, { x: 1000, y: 160 }, { x: 1050, y: 500 },
      { x: 500, y: 560 }, { x: 240, y: 300 },
    ],
  },
  {
    name: 'The Barn',
    subtitle: 'Dark corners. He knows every creak in here.',
    floor: 'barn',
    playerStart: { x: 90, y: 620 },
    farmerStart: { x: 640, y: 360 },
    exit: rect(1210, 300, 70, 120),
    exitLabel: 'TO THE KITCHEN',
    walls: [
      rect(0, 0, 1280, 26), rect(0, 694, 1280, 26),
      rect(0, 0, 26, 720),
      rect(300, 90, 26, 260), rect(300, 430, 26, 200),
      rect(640, 90, 26, 180), rect(640, 470, 26, 180),
      rect(950, 200, 26, 320),
    ],
    hay: [rect(180, 120, 96, 64), rect(760, 560, 96, 64), rect(1080, 120, 96, 64)],
    crates: [
      rect(430, 500, 90, 90), rect(760, 200, 90, 90), rect(1060, 380, 90, 90),
    ],
    oven: null,
    knifeLanes: [],
    corn: [
      { x: 200, y: 300 }, { x: 480, y: 180 }, { x: 760, y: 420 },
      { x: 1020, y: 620 }, { x: 380, y: 620 }, { x: 1140, y: 260 },
      { x: 540, y: 380 }, { x: 860, y: 120 },
    ],
    feathers: [{ x: 200, y: 90 }, { x: 1150, y: 620 }],
    gravy: [{ x: 700, y: 640 }],
    farmerWaypoints: [
      { x: 640, y: 360 }, { x: 480, y: 180 }, { x: 1080, y: 300 },
      { x: 850, y: 580 }, { x: 180, y: 480 },
    ],
  },
  {
    name: 'The Kitchen',
    subtitle: 'The oven is on. The knives are out. Run.',
    floor: 'kitchen',
    playerStart: { x: 90, y: 620 },
    farmerStart: { x: 640, y: 200 },
    exit: rect(1210, 300, 70, 120),
    exitLabel: 'THE BACK DOOR — FREEDOM',
    walls: [
      rect(0, 0, 1280, 26), rect(0, 694, 1280, 26),
      rect(0, 0, 26, 720),
      rect(420, 90, 26, 200), rect(420, 430, 26, 200),
      rect(760, 90, 26, 160), rect(760, 470, 26, 160),
    ],
    hay: [],
    crates: [
      rect(180, 120, 150, 60), // table
      rect(980, 560, 150, 60), // table
      rect(560, 320, 90, 90), // island
    ],
    oven: { x: 1050, y: 60, w: 180, h: 120, burstEvery: 6, burstSeconds: 1.6, warnSeconds: 0.9 },
    knifeLanes: [
      { y: 200, every: 3.2, speed: 380 },
      { y: 520, every: 4.1, speed: 420 },
    ],
    corn: [
      { x: 200, y: 200 }, { x: 560, y: 140 }, { x: 900, y: 300 },
      { x: 1140, y: 420 }, { x: 300, y: 620 }, { x: 700, y: 620 },
      { x: 1020, y: 180 }, { x: 480, y: 480 },
    ],
    feathers: [{ x: 640, y: 90 }, { x: 240, y: 420 }],
    gravy: [{ x: 1150, y: 640 }],
    farmerWaypoints: [
      { x: 640, y: 200 }, { x: 1000, y: 420 }, { x: 300, y: 300 },
      { x: 850, y: 600 }, { x: 500, y: 500 },
    ],
  },
];

export const SCORE = { corn: 10, feather: 25, stageClear: 150, metre: 1 };
export const LIVES = 3;
