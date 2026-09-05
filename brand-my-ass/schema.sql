-- Every bid ever placed. Removed bids stay for the record but leave the auction.
CREATE TABLE IF NOT EXISTS bids (
  id               TEXT PRIMARY KEY,
  spot_id          INTEGER NOT NULL,
  amount           INTEGER NOT NULL,
  company          TEXT NOT NULL,
  website          TEXT NOT NULL,
  domain           TEXT NOT NULL,
  email            TEXT NOT NULL,
  custom           TEXT NOT NULL DEFAULT '',
  ip_hash          TEXT,
  user_agent       TEXT,
  reference        TEXT,
  -- 'pending' while the deposit is being paid, 'live' once it counts
  status           TEXT NOT NULL DEFAULT 'live',
  expires_at       TEXT,               -- pending bids die here if unpaid
  checkout_session TEXT,               -- Stripe Checkout Session id
  payment_intent   TEXT,               -- Stripe PaymentIntent holding the deposit
  deposit_status   TEXT NOT NULL DEFAULT 'none',  -- none | held | refunded | forfeited
  created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  removed_at       TEXT
);

CREATE INDEX IF NOT EXISTS bids_spot_amount ON bids (spot_id, amount DESC);
CREATE INDEX IF NOT EXISTS bids_ip_time ON bids (ip_hash, created_at);
CREATE INDEX IF NOT EXISTS bids_checkout ON bids (checkout_session);

-- One live-or-pending bid per price step per placement. This is what makes a
-- race between two bidders safe: the second INSERT fails instead of duplicating.
CREATE UNIQUE INDEX IF NOT EXISTS bids_live_step ON bids (spot_id, amount) WHERE removed_at IS NULL;
