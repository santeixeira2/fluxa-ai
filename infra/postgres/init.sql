-- Users
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  name        TEXT,
  phone       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Price history (time-series: MA, RSI, LLM context)
CREATE TABLE IF NOT EXISTS price_history (
  id          BIGSERIAL PRIMARY KEY,
  asset_id    TEXT NOT NULL,        -- e.g. "BTC", "PETR4"
  price_brl   NUMERIC(18, 8) NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_history_asset_time
  ON price_history (asset_id, recorded_at DESC);

-- Smart Alerts
CREATE TABLE IF NOT EXISTS alerts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  asset_id      TEXT NOT NULL,
  type          TEXT NOT NULL,   -- 'price_target' | 'drop' | 'surge' | 'trend' | 'anomaly'
  threshold     NUMERIC(18, 8),  -- valor absoluto ou % dependendo do tipo
  direction     TEXT,            -- 'above' | 'below' (para price_target)
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  triggered_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_active ON alerts (active, asset_id);

-- Alert trigger log
CREATE TABLE IF NOT EXISTS alert_triggers (
  id          BIGSERIAL PRIMARY KEY,
  alert_id    UUID REFERENCES alerts(id) ON DELETE CASCADE,
  price_brl   NUMERIC(18, 8) NOT NULL,
  message     TEXT,             -- explicação gerada pelo LLM
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
