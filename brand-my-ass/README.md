# brand my ass

**Your brand on my ass.** A live auction for ten tattoo placements across my back and ass. Every slot opens at $1,500 USD, each bid raises it by $250, winners get inked — permanently — and the money finishes my game.

Static site + Cloudflare Pages Functions + D1. No build step, no framework. The body is sculpted in code (SDF → marching cubes) and rendered with three.js; winning brands show up as tattoos on the 3D model in real time.

```
public/            the site (deployed as-is)
  index.html       page shell and copy
  app.js           auction UI, polling, bid modal
  body.js          3D body, slot stencils, markers, tattoo decals, thumbnails
  body-worker.js   sculpts the mesh off the main thread
  config.js        ← prices, dates, target, slots. Edit this.
  styles.css
  terms.html
  vendor/three/    pinned three.js r170 + the four addons used
functions/api/
  bids.js          GET  /api/bids        public auction state
  bid.js           POST /api/bid         place the next bid · DELETE removes one (admin)
  logo.js          GET  /api/logo        same-origin favicon proxy for the tattoo textures
schema.sql         D1 schema
wrangler.toml      Pages + D1 binding
```

## Run it locally

```bash
npm install
npm run db:local      # creates the local D1 from schema.sql
npm run dev           # http://localhost:8788
```

Copy `.dev.vars.example` to `.dev.vars` if you want the admin token, email notifications or a custom hash salt locally.

## Deploy to Cloudflare Pages

1. `npx wrangler login`
2. `npx wrangler d1 create brand-my-ass` → paste the `database_id` into `wrangler.toml`
3. `npm run db:remote` — applies `schema.sql` to the production database
4. `npm run deploy` — first run creates the Pages project; the site lands on `https://brand-my-ass.pages.dev`

Or connect the repo in the Cloudflare dashboard (Pages → Create → connect to Git): build command empty, output directory `public`, then bind the D1 database as `DB` under Settings → Functions → D1 bindings.

### Secrets (Pages → Settings → Environment variables, all optional)

| name | what it does |
|------|--------------|
| `ADMIN_TOKEN` | enables `DELETE /api/bid?id=<uuid>` with `Authorization: Bearer <token>` to pull spam or fake bids |
| `HASH_SALT` | salts the per-IP hash used for rate limiting (6 bids / 10 min) |
| `RESEND_API_KEY` + `NOTIFY_EMAIL` | emails you every bid via [Resend](https://resend.com). `NOTIFY_FROM` sets the sender once your domain is verified |

## Configure the auction

Everything lives in `public/config.js`: your handle and game name, `START_BID`, `STEP`, `TARGET` (the dev budget on the funding bar), `END_AT`, and the ten `SLOTS` with their names, sizes and where they sit on the body. The Functions import the same file, so the server always enforces the prices you show.

Set `SITE.url` to your real domain once you have one; it's used in notification emails.

## How bidding works

- Each placement is its own auction. No payment is collected on-site; the leading bidder on each placement is contacted and invoiced when the clock runs out.
- The server decides the next valid amount. A stale client gets a `409` with the real price.
- A partial unique index on `(spot_id, amount)` for live bids makes concurrent bids on the same step safe: exactly one wins.
- Honeypot field, per-IP rate limit, strict input validation, escaped output, CSP.
- Sponsor logos are fetched through `/api/logo` so they can be drawn onto canvas textures and projected on the skin as decals.

## Moderation

```bash
# list live bids
npx wrangler d1 execute brand-my-ass --remote --command "SELECT id, spot_id, amount, company, domain, email, created_at FROM bids WHERE removed_at IS NULL ORDER BY spot_id, amount DESC"

# remove one (or use the DELETE endpoint with ADMIN_TOKEN)
npx wrangler d1 execute brand-my-ass --remote --command "UPDATE bids SET removed_at = datetime('now') WHERE id = '<uuid>'"
```

## Credits

Format inspired by the "brand my X" auction trend. three.js is MIT licensed (see `public/vendor/three/LICENSE`).

## Regenerating the share image

`public/og.png` is a 1200×630 screenshot of `public/og.html` (which renders the live 3D body). Open it in a browser at that size and screenshot it, or with Playwright: `npx playwright screenshot --viewport-size=1200,630 --wait-for-timeout=5000 http://localhost:8788/og.html public/og.png`.
