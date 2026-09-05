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
export const TARGET = 50000; // dev budget shown in the funding bar

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
  // Everything sits on my back side, hidden from the front. Nothing on the
  // spine itself: the back is a symmetric grid, two columns and four rows on
  // each side of it. Then the cheeks and the back of each thigh.
  {
    id: 1,
    name: 'Left cheek',
    note: 'The headline placement.',
    size: '≈ 15 × 15 cm',
    anchor: [-0.19, -0.4, 0.3],
    dir: [0, 0, 1],
    decal: [0.24, 0.24],
  },
  {
    id: 2,
    name: 'Right cheek',
    note: 'The matched pair.',
    size: '≈ 15 × 15 cm',
    anchor: [0.19, -0.4, 0.3],
    dir: [0, 0, 1],
    decal: [0.24, 0.24],
  },
  {
    id: 3,
    name: 'Left upper back · inner',
    note: 'Row one, next to the spine.',
    size: '≈ 9 × 9 cm',
    anchor: [-0.145, 0.5, 0.3],
    dir: [0, 0, 1],
    decal: [0.14, 0.14],
  },
  {
    id: 4,
    name: 'Left upper back · outer',
    note: 'Row one, out towards the shoulder.',
    size: '≈ 9 × 9 cm',
    anchor: [-0.300, 0.5, 0.3],
    dir: [-0.12, 0, 1],
    decal: [0.14, 0.14],
  },
  {
    id: 5,
    name: 'Right upper back · inner',
    note: 'Row one, next to the spine.',
    size: '≈ 9 × 9 cm',
    anchor: [0.145, 0.5, 0.3],
    dir: [0, 0, 1],
    decal: [0.14, 0.14],
  },
  {
    id: 6,
    name: 'Right upper back · outer',
    note: 'Row one, out towards the shoulder.',
    size: '≈ 9 × 9 cm',
    anchor: [0.300, 0.5, 0.3],
    dir: [0.12, 0, 1],
    decal: [0.14, 0.14],
  },
  {
    id: 7,
    name: 'Left shoulder blade · inner',
    note: 'Row two, on the blade.',
    size: '≈ 9 × 9 cm',
    anchor: [-0.145, 0.31, 0.3],
    dir: [0, 0, 1],
    decal: [0.14, 0.14],
  },
  {
    id: 8,
    name: 'Left shoulder blade · outer',
    note: 'Row two, edge of the blade.',
    size: '≈ 9 × 9 cm',
    anchor: [-0.290, 0.31, 0.3],
    dir: [-0.12, 0, 1],
    decal: [0.14, 0.14],
  },
  {
    id: 9,
    name: 'Right shoulder blade · inner',
    note: 'Row two, on the blade.',
    size: '≈ 9 × 9 cm',
    anchor: [0.145, 0.31, 0.3],
    dir: [0, 0, 1],
    decal: [0.14, 0.14],
  },
  {
    id: 10,
    name: 'Right shoulder blade · outer',
    note: 'Row two, edge of the blade.',
    size: '≈ 9 × 9 cm',
    anchor: [0.290, 0.31, 0.3],
    dir: [0.12, 0, 1],
    decal: [0.14, 0.14],
  },
  {
    id: 11,
    name: 'Left mid back · inner',
    note: 'Row three, on the lats.',
    size: '≈ 9 × 9 cm',
    anchor: [-0.145, 0.12, 0.3],
    dir: [0, 0, 1],
    decal: [0.14, 0.14],
  },
  {
    id: 12,
    name: 'Left mid back · outer',
    note: 'Row three, outer lat.',
    size: '≈ 9 × 9 cm',
    anchor: [-0.255, 0.12, 0.3],
    dir: [-0.12, 0, 1],
    decal: [0.14, 0.14],
  },
  {
    id: 13,
    name: 'Right mid back · inner',
    note: 'Row three, on the lats.',
    size: '≈ 9 × 9 cm',
    anchor: [0.145, 0.12, 0.3],
    dir: [0, 0, 1],
    decal: [0.14, 0.14],
  },
  {
    id: 14,
    name: 'Right mid back · outer',
    note: 'Row three, outer lat.',
    size: '≈ 9 × 9 cm',
    anchor: [0.255, 0.12, 0.3],
    dir: [0.12, 0, 1],
    decal: [0.14, 0.14],
  },
  {
    id: 15,
    name: 'Left lower back · inner',
    note: 'Row four, above the cheek.',
    size: '≈ 9 × 9 cm',
    anchor: [-0.145, -0.08, 0.3],
    dir: [0, 0, 1],
    decal: [0.14, 0.14],
  },
  {
    id: 16,
    name: 'Left lower back · outer',
    note: 'Row four, above the hip.',
    size: '≈ 9 × 9 cm',
    anchor: [-0.235, -0.08, 0.3],
    dir: [-0.12, 0, 1],
    decal: [0.14, 0.14],
  },
  {
    id: 17,
    name: 'Right lower back · inner',
    note: 'Row four, above the cheek.',
    size: '≈ 9 × 9 cm',
    anchor: [0.145, -0.08, 0.3],
    dir: [0, 0, 1],
    decal: [0.14, 0.14],
  },
  {
    id: 18,
    name: 'Right lower back · outer',
    note: 'Row four, above the hip.',
    size: '≈ 9 × 9 cm',
    anchor: [0.235, -0.08, 0.3],
    dir: [0.12, 0, 1],
    decal: [0.14, 0.14],
  },
  {
    id: 19,
    name: 'Back of left thigh',
    note: 'Under the cheek. Shorts weather only.',
    size: '≈ 12 × 10 cm',
    anchor: [-0.19, -0.74, 0.3],
    dir: [0, 0, 1],
    decal: [0.17, 0.14],
  },
  {
    id: 20,
    name: 'Back of right thigh',
    note: 'The other leg.',
    size: '≈ 12 × 10 cm',
    anchor: [0.19, -0.74, 0.3],
    dir: [0, 0, 1],
    decal: [0.17, 0.14],
  },
];

export const SLOT_IDS = SLOTS.map((s) => s.id);
export const slotById = (id) => SLOTS.find((s) => s.id === Number(id));
