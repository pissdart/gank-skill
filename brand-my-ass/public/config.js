// Single source of truth for the auction. Edit this file, redeploy, done.
// Functions import it too (functions/_lib/config.js re-exports it), so the
// server and the page always agree on prices, dates and slot ids.

export const SITE = {
  name: 'BRAND MY ASS',
  title: 'Your brand on my ass.',
  description:
    'Ten tattoo placements across my back and ass, sold by live auction. Every slot opens at $1,500 USD. Winners get inked, permanently. The money finishes my game.',
  url: 'https://brand-my-ass.pages.dev',
};

// Who you are. Shown in the footer and the "hear from me" step.
export const OWNER = {
  handle: '@pissdart',
  link: 'https://t.me/pissdart',
  game: 'my game', // e.g. 'GANK: the game'
};

// Money.
export const CURRENCY = 'USD';
export const START_BID = 1500; // every slot opens here
export const STEP = 250; // each new bid raises the price by this
export const TARGET = 30000; // dev budget shown in the funding bar

// Deposit to place a bid, charged through Stripe Checkout. Held only while
// you lead: refunded automatically the moment you're outbid, kept if you win
// and don't settle the balance. 0 disables deposits entirely.
export const DEPOSIT = 250;

// One brand leading several placements pays less for the lot at close.
// Sorted by `min`; the highest matching tier applies to the combined total.
export const BUNDLE_DISCOUNTS = [
  { min: 2, pct: 10 },
  { min: 3, pct: 15 },
  { min: 4, pct: 20 },
];
export const discountFor = (count) => BUNDLE_DISCOUNTS.filter((t) => count >= t.min).pop()?.pct || 0;

// When the auction ends. ISO 8601 with offset.
export const END_AT = '2026-10-05T20:00:00-04:00';

// Placements. `anchor` is where the slot sits on the 3D body, in body space
// (x: left/right, y: up, z: towards the viewer). `dir` is the side of the body
// the slot faces — the viewer raycasts from anchor + dir onto the skin.
// `decal` is the stencil size on the skin (width, height) in body units.
export const SLOTS = [
  // Everything is on the back side of the body. Nothing on the front, spine,
  // flanks or hips — those stay clear for my own work.
  {
    id: 1,
    name: 'Left cheek',
    note: 'The headline placement.',
    size: '≈ 15 × 15 cm',
    anchor: [-0.19, -0.36, 0.3],
    dir: [0, 0, 1],
    decal: [0.24, 0.24],
  },
  {
    id: 2,
    name: 'Right cheek',
    note: 'The matched pair.',
    size: '≈ 15 × 15 cm',
    anchor: [0.19, -0.36, 0.3],
    dir: [0, 0, 1],
    decal: [0.24, 0.24],
  },
  {
    id: 3,
    name: 'Lower back',
    note: 'The tramp stamp. Centre of attention.',
    size: '≈ 20 × 8 cm',
    anchor: [0, -0.1, 0.3],
    dir: [0, 0, 1],
    decal: [0.34, 0.14],
  },
  {
    id: 4,
    name: 'Mid back',
    note: 'Dead centre, between the blades and the belt.',
    size: '≈ 20 × 10 cm',
    anchor: [0, 0.11, 0.3],
    dir: [0, 0, 1],
    decal: [0.34, 0.16],
  },
  {
    id: 5,
    name: 'Upper back',
    note: 'The billboard. Shoulder to shoulder.',
    size: '≈ 30 × 12 cm',
    anchor: [0, 0.5, 0.3],
    dir: [0, 0, 1],
    decal: [0.5, 0.2],
  },
  {
    id: 6,
    name: 'Left shoulder blade',
    note: 'Reads well over a tank top.',
    size: '≈ 12 × 12 cm',
    anchor: [-0.22, 0.3, 0.3],
    dir: [0, 0, 1],
    decal: [0.2, 0.2],
  },
  {
    id: 7,
    name: 'Right shoulder blade',
    note: 'Same, mirrored.',
    size: '≈ 12 × 12 cm',
    anchor: [0.22, 0.3, 0.3],
    dir: [0, 0, 1],
    decal: [0.2, 0.2],
  },
  {
    id: 8,
    name: 'Nape',
    note: 'Above the collar, only from behind.',
    size: '≈ 8 × 6 cm',
    anchor: [0, 0.86, 0.3],
    dir: [0, 0.2, 1],
    decal: [0.13, 0.1],
  },
  {
    id: 9,
    name: 'Back of left thigh',
    note: 'Under the cheek. Shorts weather only.',
    size: '≈ 12 × 10 cm',
    anchor: [-0.19, -0.7, 0.3],
    dir: [0, 0, 1],
    decal: [0.17, 0.14],
  },
  {
    id: 10,
    name: 'Back of right thigh',
    note: 'The other leg.',
    size: '≈ 12 × 10 cm',
    anchor: [0.19, -0.7, 0.3],
    dir: [0, 0, 1],
    decal: [0.17, 0.14],
  },
];

export const SLOT_IDS = SLOTS.map((s) => s.id);
export const slotById = (id) => SLOTS.find((s) => s.id === Number(id));
