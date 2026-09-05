import { json, error } from '../_lib/util.js';
import { verifyWebhook, stripeEnabled } from '../_lib/stripe.js';
import { goLive } from '../_lib/auction.js';

// POST /api/stripe-webhook — Stripe tells us a deposit was paid or a session
// expired. Point the endpoint here and subscribe to checkout.session.completed
// and checkout.session.expired.
export async function onRequestPost({ request, env }) {
  if (!env.DB || !stripeEnabled(env) || !env.STRIPE_WEBHOOK_SECRET) return error('Webhook not configured.', 500);
  const payload = await request.text();
  const ok = await verifyWebhook(payload, request.headers.get('Stripe-Signature'), env.STRIPE_WEBHOOK_SECRET);
  if (!ok) return error('Bad signature.', 400);

  let event;
  try { event = JSON.parse(payload); } catch { return error('Bad payload.'); }
  const session = event.data?.object;
  if (!session?.id) return json({ received: true });

  const bid = await env.DB.prepare(`SELECT * FROM bids WHERE checkout_session = ?1`).bind(session.id).first();
  if (!bid) return json({ received: true, ignored: 'unknown session' });

  if (event.type === 'checkout.session.completed' && session.payment_status === 'paid') {
    const result = await goLive(env, bid, session.payment_intent);
    return json({ received: true, ...result });
  }
  if (event.type === 'checkout.session.expired' && bid.status === 'pending') {
    await env.DB.prepare(`UPDATE bids SET removed_at = COALESCE(removed_at, datetime('now')) WHERE id = ?1`).bind(bid.id).run();
    return json({ received: true, released: true });
  }
  return json({ received: true });
}
