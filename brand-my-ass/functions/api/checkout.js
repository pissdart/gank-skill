import { SLOTS } from '../_lib/config.js';
import { json, error } from '../_lib/util.js';
import { stripe, stripeEnabled } from '../_lib/stripe.js';
import { goLive, topLiveBid } from '../_lib/auction.js';
import { notify } from './bid.js';

// GET /api/checkout?session_id=cs_… — the sponsor is back from Stripe.
// Confirms the deposit directly so they don't have to wait on the webhook.
export async function onRequestGet({ request, env, waitUntil }) {
  if (!env.DB || !stripeEnabled(env)) return error('Deposits are not configured.', 500);
  const sessionId = new URL(request.url).searchParams.get('session_id') || '';
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return error('Bad session.');
  const bid = await env.DB.prepare(`SELECT * FROM bids WHERE checkout_session = ?1`).bind(sessionId).first();
  if (!bid) return error('No bid for that session.', 404);
  if (bid.status === 'live') return json({ ok: true, reference: bid.reference, spotId: bid.spot_id });

  const session = await stripe(env, `checkout/sessions/${sessionId}`, null, 'GET');
  if (session.payment_status !== 'paid') return error('The deposit has not been paid yet.', 402);
  const previous = await topLiveBid(env.DB, bid.spot_id);
  const result = await goLive(env, bid, session.payment_intent);
  if (!result.ok) return error(result.error, result.status);
  if (env.RESEND_API_KEY && env.NOTIFY_EMAIL) {
    const slot = SLOTS.find((s) => s.id === bid.spot_id);
    waitUntil(notify(env, { slot, amount: bid.amount, company: bid.company, website: bid.website, email: bid.email, custom: bid.custom, reference: bid.reference, previous, deposit: session.payment_intent }));
  }
  return json({ ok: true, reference: bid.reference, spotId: bid.spot_id });
}

// DELETE /api/checkout?bid=<uuid> — they backed out of Stripe; free the step.
export async function onRequestDelete({ request, env }) {
  if (!env.DB) return error('Database not configured.', 500);
  const id = new URL(request.url).searchParams.get('bid') || '';
  if (!/^[0-9a-f-]{36}$/i.test(id)) return error('Bad id.');
  const res = await env.DB.prepare(`UPDATE bids SET removed_at = datetime('now') WHERE id = ?1 AND status = 'pending' AND removed_at IS NULL`).bind(id).run();
  return json({ ok: true, released: res.meta?.changes || 0 });
}
