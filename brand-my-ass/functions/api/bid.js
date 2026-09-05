import { SLOTS, START_BID, STEP, END_AT, SITE } from '../_lib/config.js';
import { json, error, sha256, normaliseWebsite } from '../_lib/util.js';

const RATE_WINDOW_MIN = 10;
const RATE_MAX = 6;

// POST /api/bid — place the next bid on a placement.
export async function onRequestPost({ request, env, waitUntil }) {
  if (!env.DB) return error('Database not configured.', 500);
  if (Date.now() >= new Date(END_AT).getTime()) return error('The auction has closed.', 410);

  let body;
  try { body = await request.json(); } catch { return error('Send JSON.'); }

  // honeypot: bots fill every field
  if (body.fax) return json({ ok: true, reference: 'BMA-0000' });

  const slot = SLOTS.find((s) => s.id === Number(body.spotId));
  if (!slot) return error('Choose a valid placement.');

  const email = String(body.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 200) return error('Enter a valid work email.');

  const company = String(body.company || '').trim().replace(/\s+/g, ' ');
  if (company.length < 2 || company.length > 80) return error('Enter your company or brand name.');

  const site = normaliseWebsite(body.website);
  if (!site) return error('Enter a valid company website.');

  let custom = '';
  if (slot.customField) {
    custom = String(body.custom || '').trim().replace(/\s+/g, ' ');
    const max = slot.customMax || 40;
    if (custom.length < 2 || custom.length > max) return error(`Customization must be 2–${max} characters.`);
  }
  if (body.consent !== true) return error('Confirm that this is a genuine sponsorship bid.');

  // rate limit per ip
  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || '0.0.0.0';
  const ipHash = (await sha256(`${env.HASH_SALT || 'brand-my-ass'}:${ip}`)).slice(0, 32);
  const recent = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM bids WHERE ip_hash = ?1 AND created_at > datetime('now', ?2)`,
  ).bind(ipHash, `-${RATE_WINDOW_MIN} minutes`).first('n');
  if (recent >= RATE_MAX) return error('Too many bids from your connection. Try again in a few minutes.', 429);

  // the next valid amount is decided here, never by the client
  const top = await env.DB.prepare(
    `SELECT amount, company FROM bids WHERE spot_id = ?1 AND removed_at IS NULL ORDER BY amount DESC LIMIT 1`,
  ).bind(slot.id).first();
  const expected = top ? top.amount + STEP : START_BID;
  if (Number(body.amount) !== expected) {
    return error(`The price moved. The next bid on ${slot.name} is $${expected.toLocaleString('en-US')}.`, 409, { currentBid: top?.amount || 0, nextBid: expected });
  }

  const id = crypto.randomUUID();
  const reference = `BMA-${id.slice(0, 4).toUpperCase()}${String(slot.id).padStart(2, '0')}`;
  try {
    // UNIQUE(spot_id, amount) on live bids makes this atomic under concurrency:
    // two people racing for the same step can't both win.
    await env.DB.prepare(
      `INSERT INTO bids (id, spot_id, amount, company, website, domain, email, custom, ip_hash, user_agent, reference)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`,
    ).bind(id, slot.id, expected, company, site.website, site.domain, email, custom, ipHash, (request.headers.get('User-Agent') || '').slice(0, 250), reference).run();
  } catch (err) {
    if (/UNIQUE/i.test(String(err))) return error(`Someone just took that step on ${slot.name}. Refresh and go again.`, 409);
    throw err;
  }

  if (env.RESEND_API_KEY && env.NOTIFY_EMAIL) waitUntil(notify(env, { slot, amount: expected, company, site, email, custom, reference, previous: top }));

  return json({ ok: true, reference, amount: expected }, 201);
}

// DELETE /api/bid?id=<uuid> — remove a bad bid. Needs ADMIN_TOKEN.
export async function onRequestDelete({ request, env }) {
  if (!env.DB) return error('Database not configured.', 500);
  const auth = request.headers.get('Authorization') || '';
  if (!env.ADMIN_TOKEN || auth !== `Bearer ${env.ADMIN_TOKEN}`) return error('Unauthorized.', 401);
  const id = new URL(request.url).searchParams.get('id') || '';
  if (!/^[0-9a-f-]{36}$/i.test(id)) return error('Bad id.');
  const res = await env.DB.prepare(`UPDATE bids SET removed_at = datetime('now') WHERE id = ?1 AND removed_at IS NULL`).bind(id).run();
  return json({ ok: true, removed: res.meta?.changes || 0 });
}

async function notify(env, b) {
  const subject = `New bid: $${b.amount.toLocaleString('en-US')} on ${b.slot.name} (${b.company})`;
  const lines = [
    `${b.company} bid $${b.amount.toLocaleString('en-US')} on ${b.slot.name}.`,
    `Website: ${b.site.website}`,
    `Email: ${b.email}`,
    b.custom ? `Custom: ${b.custom}` : '',
    b.previous ? `Outbid: ${b.previous.company} ($${b.previous.amount.toLocaleString('en-US')})` : 'First bid on this placement.',
    `Reference: ${b.reference}`,
    '',
    SITE.url,
  ].filter(Boolean);
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.NOTIFY_FROM || 'Brand My Ass <onboarding@resend.dev>', to: [env.NOTIFY_EMAIL], subject, text: lines.join('\n') }),
    });
  } catch {
    /* notifications are best-effort */
  }
}
