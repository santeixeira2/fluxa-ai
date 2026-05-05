-- add read_at to alert_triggers (was in schema but never migrated)
ALTER TABLE "alert_triggers" ADD COLUMN IF NOT EXISTS "read_at" TIMESTAMPTZ;

-- unique constraint on simulated_portfolios.user_id (required for upsert)
CREATE UNIQUE INDEX IF NOT EXISTS "simulated_portfolios_user_id_key" ON "simulated_portfolios"("user_id");

-- portfolio_snapshots table
CREATE TABLE IF NOT EXISTS "portfolio_snapshots" (
    "id" BIGSERIAL NOT NULL,
    "portfolio_id" UUID NOT NULL,
    "total_value" DECIMAL(18,2) NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "portfolio_snapshots_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "portfolio_snapshots" ADD CONSTRAINT "portfolio_snapshots_portfolio_id_fkey"
    FOREIGN KEY ("portfolio_id") REFERENCES "simulated_portfolios"("id") ON DELETE CASCADE;

-- ai_insights table
CREATE TABLE IF NOT EXISTS "ai_insights" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "generated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_insights_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ai_insights_type_key_key" ON "ai_insights"("type", "key");

-- earnings_sentiment table
CREATE TABLE IF NOT EXISTS "earnings_sentiment" (
    "id" BIGSERIAL NOT NULL,
    "ticker" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "filing_date" DATE NOT NULL,
    "sentiment" DOUBLE PRECISION NOT NULL,
    "guidance" TEXT NOT NULL,
    "tone" TEXT NOT NULL,
    "beats_estimates" BOOLEAN,
    "summary" TEXT NOT NULL,
    "analyzed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "earnings_sentiment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "earnings_sentiment_ticker_period_key" ON "earnings_sentiment"("ticker", "period");
CREATE INDEX IF NOT EXISTS "earnings_sentiment_ticker_filing_date_idx" ON "earnings_sentiment"("ticker", "filing_date" DESC);
