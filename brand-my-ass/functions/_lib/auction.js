import { SLOTS, START_BID, STEP } from './config.js';
import { refundDeposit, stripeEnabled } from './stripe.js';

// Kill pending bids whose deposit never arrived, so their step frees up.
export const expirePending = (db) =>
  db.prepare(`UPDATE bids SET removed_at = datetime('now') WHERE status = 'pending' AND removed_at IS NULL AND expires_at < datetime('now')`).run();

export const topLiveBid = (db, spotId) =>
  db.prepare(`SELECT * FROM bids WHERE spot_id = ?1 AND status = 'live' AND removed_at IS NULL ORDER BY amount DESC LIMIT 1`).bind(spotId).first();

export const pendingBid = (db, spotId) =>
  db.prepare(`SELECT * FROM bids WHERE spot_id = ?1 AND status = 'pending' AND removed_at IS NULL LIMIT 1`).bind(spotId).first();

export const nextAmount = (top) => (top ? top.amount + STEP : START_BID);

// Turn a pending bid live. Returns { ok, error, status }.
// Idempotent: a bid that is already live just reports success.
export async function goLive(env, bid, paymentIntent) {
  const db = env.DB;
  if (bid.status === 'live') return { ok: true };
  const slot = SLOTS.find((s) => s.id === bid.spot_id);
  const top = await topLiveBid(db, bid.spot_id);
  if (nextAmount(top) !== bid.amount) {
    // They paid after the step moved on. Give the deposit straight back.
    await db.prepare(`UPDATE bids SET removed_at = COALESCE(removed_at, datetime('now')), payment_intent = ?2, deposit_status = 'refunded' WHERE id = ?1`).bind(bid.id, paymentIntent || null).run();
    if (paymentIntent && stripeEnabled(env)) { try { await refundDeposit(env, paymentIntent); } catch {} }
    return { ok: false, status: 409, error: `The price on ${slot?.name || 'that placement'} moved while you were paying. Your deposit has been refunded.` };
  }
  try {
    await db.prepare(
      `UPDATE bids SET status = 'live', removed_at = NULL, expires_at = NULL, payment_intent = ?2, deposit_status = CASE WHEN ?2 IS NULL THEN deposit_status ELSE 'held' END WHERE id = ?1`,
    ).bind(bid.id, paymentIntent || null).run();
  } catch (err) {
    if (/UNIQUE/i.test(String(err))) {
      if (paymentIntent && stripeEnabled(env)) { try { await refundDeposit(env, paymentIntent); } catch {} }
      await db.prepare(`UPDATE bids SET deposit_status = 'refunded' WHERE id = ?1`).bind(bid.id).run();
      return { ok: false, status: 409, error: 'Someone took that step first. Your deposit has been refunded.' };
    }
    throw err;
  }
  // The outbid leader gets their deposit back right away.
  if (top?.payment_intent && top.deposit_status === 'held' && stripeEnabled(env)) {
    try {
      await refundDeposit(env, top.payment_intent);
      await db.prepare(`UPDATE bids SET deposit_status = 'refunded' WHERE id = ?1`).bind(top.id).run();
    } catch {
      /* left as 'held'; the admin can refund by hand */
    }
  }
  return { ok: true };
}
