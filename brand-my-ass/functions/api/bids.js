import { SLOTS, START_BID, STEP, TARGET, END_AT, DEPOSIT, BUNDLE_DISCOUNTS } from '../_lib/config.js';
import { json, error } from '../_lib/util.js';
import { stripeEnabled } from '../_lib/stripe.js';
import { expirePending } from '../_lib/auction.js';

// GET /api/bids — the public state of every placement.
export async function onRequestGet({ env }) {
  if (!env.DB) return error('Database not configured.', 500);
  await expirePending(env.DB);
  const { results } = await env.DB.prepare(
    `SELECT id, spot_id, amount, company, website, domain, custom, status, created_at
       FROM bids WHERE removed_at IS NULL
       ORDER BY spot_id, amount DESC, created_at DESC`,
  ).all();

  const bySpot = new Map(SLOTS.map((s) => [s.id, { live: [], pending: false }]));
  for (const row of results) {
    const b = bySpot.get(row.spot_id);
    if (!b) continue;
    if (row.status === 'pending') b.pending = true;
    else b.live.push(row);
  }

  const spots = SLOTS.map((s) => {
    const { live, pending } = bySpot.get(s.id);
    const top = live[0];
    return {
      id: s.id,
      currentBid: top?.amount || 0,
      bids: live.length,
      leader: top?.company || '',
      website: top?.website || '',
      domain: top?.domain || '',
      custom: top?.custom || '',
      reserved: pending,
      history: live.map((r) => ({
        id: r.id, createdAt: r.created_at, amount: r.amount, company: r.company, website: r.website, domain: r.domain, custom: r.custom || '',
      })),
    };
  });

  return json(
    {
      spots,
      startBid: START_BID,
      step: STEP,
      target: TARGET,
      endsAt: END_AT,
      deposit: { amount: DEPOSIT, enabled: DEPOSIT > 0 && stripeEnabled(env) },
      discounts: BUNDLE_DISCOUNTS,
      serverTime: new Date().toISOString(),
    },
    200,
    { 'Cache-Control': 'public, max-age=0, s-maxage=3' },
  );
}
