import { SLOTS, START_BID, STEP, TARGET, END_AT } from '../_lib/config.js';
import { json, error } from '../_lib/util.js';

// GET /api/bids — the public state of every placement.
export async function onRequestGet({ env }) {
  if (!env.DB) return error('Database not configured.', 500);
  const { results } = await env.DB.prepare(
    `SELECT id, spot_id, amount, company, website, domain, custom, created_at
       FROM bids WHERE removed_at IS NULL
       ORDER BY spot_id, amount DESC, created_at DESC`,
  ).all();

  const bySpot = new Map(SLOTS.map((s) => [s.id, []]));
  for (const row of results) bySpot.get(row.spot_id)?.push(row);

  const spots = SLOTS.map((s) => {
    const rows = bySpot.get(s.id);
    const top = rows[0];
    return {
      id: s.id,
      currentBid: top?.amount || 0,
      bids: rows.length,
      leader: top?.company || '',
      website: top?.website || '',
      domain: top?.domain || '',
      custom: top?.custom || '',
      history: rows.map((r) => ({
        id: r.id, createdAt: r.created_at, amount: r.amount, company: r.company, website: r.website, domain: r.domain, custom: r.custom || '',
      })),
    };
  });

  return json(
    { spots, startBid: START_BID, step: STEP, target: TARGET, endsAt: END_AT, serverTime: new Date().toISOString() },
    200,
    { 'Cache-Control': 'public, max-age=0, s-maxage=3' },
  );
}
