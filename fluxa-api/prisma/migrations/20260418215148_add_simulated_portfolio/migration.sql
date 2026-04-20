-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('BUY', 'SELL');

-- CreateTable
CREATE TABLE "simulated_portfolios" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "initial_balance" DECIMAL(18,2) NOT NULL,
    "current_balance" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "simulated_portfolios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "simulated_positions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "portfolio_id" UUID NOT NULL,
    "asset_id" TEXT NOT NULL,
    "quantity" DECIMAL(18,8) NOT NULL,
    "avg_price" DECIMAL(18,8) NOT NULL,

    CONSTRAINT "simulated_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "simulated_transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "portfolio_id" UUID NOT NULL,
    "asset_id" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "quantity" DECIMAL(18,8) NOT NULL,
    "price" DECIMAL(18,8) NOT NULL,
    "total" DECIMAL(18,2) NOT NULL,
    "executed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "simulated_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "simulated_positions_portfolio_id_asset_id_key" ON "simulated_positions"("portfolio_id", "asset_id");

-- AddForeignKey
ALTER TABLE "simulated_portfolios" ADD CONSTRAINT "simulated_portfolios_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulated_positions" ADD CONSTRAINT "simulated_positions_portfolio_id_fkey" FOREIGN KEY ("portfolio_id") REFERENCES "simulated_portfolios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulated_transactions" ADD CONSTRAINT "simulated_transactions_portfolio_id_fkey" FOREIGN KEY ("portfolio_id") REFERENCES "simulated_portfolios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
