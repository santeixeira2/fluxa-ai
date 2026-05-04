# Fluxa AI

AI-powered financial guru for individual investors. Fluxa combines real-time market data, portfolio simulation, and machine learning to deliver actionable insights — without connecting to brokerages or storing real money.

---

## What Fluxa is

Fluxa is an intelligent financial analysis tool, not a fintech. Users input data manually and receive AI-driven insights. There is no broker integration, no real portfolio persistence across sessions, and no external account linking by design.

**Core value proposition:** give retail investors the kind of analysis previously available only to professionals — regime detection, earnings sentiment, portfolio risk, DCA strategy — wrapped in a conversational AI interface.

---

## Architecture

```
┌─────────────────┐     ┌─────────────────────┐     ┌──────────────────┐
│   fluxa-ui      │────▶│    fluxa-api (BFF)   │────▶│   fluxa-ml       │
│  React + Vite   │     │  Node.js + Express   │     │  FastAPI + HMM   │
│  port 5173      │     │  port 3000           │     │  port 8000       │
└─────────────────┘     └─────────────────────┘     └──────────────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
               PostgreSQL       Redis      External APIs
               (Prisma ORM)   (cache)   Yahoo · CoinGecko
                                         ExchangeRate · Groq
                                         SEC EDGAR · CryptoCompare
```

The API acts as a BFF (Backend for Frontend): it aggregates data from price providers, proxies ML service calls, handles auth, and shields the UI from provider complexity.

---

## Services

### `fluxa-ui` — React frontend

**Stack:** React 18, TypeScript, Vite, Tailwind CSS, Lightweight Charts, Redux Toolkit, i18next (pt-BR / en-US)

**Pages:**
- **Home** — landing, live price ticker, market overview, AI chat entry point
- **Calculadoras** — investment simulators and DCA calculator
- **Portfolio** — simulated portfolio with P&L tracking, alerts, and monthly AI report
- **Profile** — account settings, password, OAuth

**Key components:**
| Component | Description |
|---|---|
| `FloatingChat` / `AiChat` | Streaming AI chat with markdown rendering |
| `PriceChart` | OHLCV candlestick chart with period selector |
| `RegimeBadge` | HMM market regime indicator with confidence bar |
| `EarningsSentiment` | Quarterly earnings sentiment timeline (US stocks) |
| `DCACalculator` | Dollar-cost averaging simulator with purchase point markers |
| `ComparisonTab` | Side-by-side asset comparison (return, vol, Sharpe, drawdown, correlation) |
| `MarketsSection` | Live prices across indices, crypto, stocks, commodities, forex |
| `PortfolioChart` | Portfolio equity curve |

---

### `fluxa-api` — Node.js BFF

**Stack:** Node.js, Express, TypeScript, Prisma, PostgreSQL, Redis, Zod, JWT

**Routes (`/api/...`):**
| Route | Description |
|---|---|
| `POST /auth/register` `POST /auth/login` `POST /auth/google` | Auth with JWT + refresh tokens, Google OAuth, rate limiting |
| `GET /price/price` `GET /price/batch` `GET /price/chart/:id` | Real-time and historical prices |
| `GET /markets` | Categorized market overview (indices, crypto, stocks, BR stocks, commodities, currencies) |
| `GET /assets` | Full asset catalog |
| `POST /simulate` `POST /simulate/historical` `POST /simulate/dca` | Investment simulators |
| `GET /portfolio` `POST /portfolio/buy` `POST /portfolio/sell` | Simulated portfolio management |
| `GET /portfolio/performance` `GET /portfolio/report` | Equity curve and AI-generated monthly report |
| `GET /analysis/regime` | HMM market regime detection (via ML service) |
| `GET /analysis/sentiment` | Earnings sentiment from SEC EDGAR + Groq (US stocks) |
| `GET /analysis/compare` | Asset comparison metrics |
| `POST /ai/chat` | Streaming AI chat (SSE) with regime context injection |
| `POST /ai/explain` `POST /ai/parse` | Simulation explanations and NLP input parsing |
| `GET /alerts` `POST /alerts` `DELETE /alerts/:id` | Price alerts |
| `GET /notifications` | Alert trigger history |
| `PATCH /profile` `PATCH /profile/password` | User profile management |

**Background jobs:**
- `alertChecker` — polls price alerts and triggers notifications
- `portfolioSnapshot` — periodic equity curve snapshots

**Price providers:**
- `yahoo` — US stocks, ETFs, indices, commodities (via yfinance-compatible API)
- `cryptocompare` — crypto prices in BRL
- `coingecko` — supplementary crypto data
- `exchangerate` — forex pairs

**AI providers:**
- `groq` — primary (qwen3-32b for analysis, compound for chat)
- `gemini` — available as fallback

---

### `fluxa-ml` — Python ML microservice

**Stack:** Python 3.12, FastAPI, hmmlearn, yfinance, scikit-learn, httpx

**Endpoints:**
| Endpoint | Description |
|---|---|
| `GET /regime?asset={ticker}&period=2y` | Current market regime prediction |
| `GET /regime/history?asset={ticker}` | Full regime history for charting |
| `POST /train` | Batch train HMM models for a list of tickers |
| `GET /sentiment?asset={ticker}` | Earnings sentiment analysis (US stocks only) |
| `GET /health` | Service health check |

**Market Regime Detection (Phase 2 — live):**

Hidden Markov Model with 4 states (`trending_up`, `trending_down`, `volatile`, `mean_reverting`), Gaussian emissions, full covariance matrix, 1000 Baum-Welch iterations.

Features per asset: `log_return`, `volatility` (rolling σ 20d), `trend` (rolling μ 20d), `volume_ratio` (volume / rolling mean 20d).

Trained on 5Y of daily OHLCV from Yahoo Finance. 41 assets trained across BR stocks, US stocks, ETFs, commodities, and crypto.

**Earnings Sentiment (Phase 3 — live):**

Pipeline: SEC EDGAR 8-K filings (item 2.02) → exhibit 99.1 extraction → Groq (qwen3-32b, reasoning disabled) → structured JSON.

Output per quarter: `sentiment` (-1 to 1), `guidance` (raised/lowered/maintained/none), `tone` (confident/cautious/neutral), `beats_estimates` (bool), `summary` (PT-BR).

Supported tickers: AAPL, MSFT, NVDA, TSLA, AMZN, GOOGL, META, NFLX, BRK-B, JPM, V, COIN.

---

## Asset Coverage

54 assets across 7 categories:

| Category | Count | Examples |
|---|---|---|
| Crypto | 15 | BTC, ETH, SOL, BNB, XRP, ADA, DOGE... |
| US Stocks | 12 | AAPL, MSFT, NVDA, TSLA, AMZN, GOOGL, META... |
| BR Stocks | 8 | PETR4, VALE3, ITUB4, BBDC4, WEGE3... |
| ETFs | 4 | QQQ, SPY, DIA, VT |
| Commodities | 4 | Gold, Silver, WTI Oil, Brent |
| Forex | 6 | USD/BRL, EUR/BRL, GBP/BRL, JPY/BRL, ARS/BRL, BTC/BRL |
| Indices | 5 | S&P 500, Dow Jones, Nasdaq, IBOVESPA, Nikkei |

---

## ML Roadmap

| Phase | Status | Description |
|---|---|---|
| 1 | ✅ Done | Statistical regime detector (Node.js, rolling metrics) |
| 2 | ✅ Done | HMM microservice (Python, hmmlearn, 41 assets trained) |
| 3 | ✅ Done | Earnings sentiment (SEC EDGAR + Groq, 12 US stocks) |
| 3.5 | ✅ Done | Earnings sentiment B3 (CVM ITR + Groq, 8 BR stocks) |
| 4 | ✅ Done | Factor Risk Model — PCA, momentum/size/volatility factors, stress testing |

---

## Pre-Release Infrastructure Plan

Target architecture for the first public release. All cost estimates assume low traffic (< 1k users).

```
                        ┌─────────────────────────────┐
  Users                 │        AWS (us-east-1)       │
    │                   │                              │
    ├──HTTPS──▶ CloudFront ──▶ S3 (fluxa-ui static)   │
    │                   │                              │
    └──HTTPS──▶ EC2 t2.micro (free tier)               │
               │  ├── Nginx (reverse proxy, TLS)       │
               │  ├── fluxa-api (Docker)               │
               │  └── Redis (Docker)                   │
               │                   │                   │
               │           RDS db.t3.micro             │
               │           (PostgreSQL, free tier)     │
               │                   │                   │
               │         SES (transactional email)     │
               └─────────────────────────────────────-─┘
                    │  Tailscale (private mesh)
                    ▼
          ┌─────────────────────┐
          │  Oracle Cloud       │
          │  Free Tier ARM VM   │
          │  (4 vCPU, 24GB RAM) │
          │  fluxa-ml (Docker)  │
          └─────────────────────┘
```

### Service placement

| Service | Host | Rationale |
|---|---|---|
| `fluxa-ui` | S3 + CloudFront | Static assets — effectively free, global CDN |
| `fluxa-api` + Redis | EC2 t2.micro | AWS free tier (750h/month for 12 months) |
| PostgreSQL | RDS db.t3.micro | Managed backups, free tier |
| `fluxa-ml` | Oracle Cloud ARM VM | Free forever, 24GB RAM fits HMM + PCA comfortably |
| Transactional email | AWS SES | Free when sending from EC2 (62k emails/month) |

### Connectivity

- EC2 and Oracle VM join the same **Tailscale** private network
- `fluxa-api` calls `fluxa-ml` via Tailscale IP (`100.x.x.x`) — never exposed to the public internet
- If `fluxa-ml` is unreachable, API degrades gracefully (ML endpoints return 503, core features stay up)

### Cost estimate

| Item | Monthly cost |
|---|---|
| EC2 t2.micro + RDS db.t3.micro | $0 (free tier, 12 months) |
| S3 + CloudFront | ~$0 (well within free tier) |
| Oracle Cloud VM | $0 (free forever) |
| AWS SES | $0 (free from EC2) |
| Route 53 hosted zone | ~$0.50 |
| Domain | ~$1 (amortized) |
| **Total** | **~$1.50/month** |

### CI/CD

GitHub Actions on push to `main`:
1. Build Docker images
2. SSH into EC2 → `docker compose pull && docker compose up -d`
3. SSH into Oracle VM → same for `fluxa-ml`
4. Build `fluxa-ui` → sync to S3 → CloudFront invalidation

### AWS free tier guardrails

- **Billing alert** at $10/month — configured on account creation
- **Free Tier Usage Alerts** enabled in Billing Preferences
- Redis runs on EC2 (not ElastiCache — not in free tier)
- No NAT Gateway, no Application Load Balancer (Nginx on EC2 replaces both)
- Elastic IP released if EC2 instance is stopped

---

## Local Setup

**Prerequisites:** Node.js 20+, Python 3.12, PostgreSQL, Redis, Docker (optional)

```bash
# Infrastructure (PostgreSQL + Redis)
cd infra && docker-compose up -d

# API
cd fluxa-api
cp .env.example .env   # fill in keys
npm install
npx prisma migrate deploy
npm run dev            # port 3000

# ML service
cd fluxa-ml
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in GROQ_API_KEY
python train.py        # train HMM models (~5 min)
uvicorn app.main:app --reload  # port 8000

# UI
cd fluxa-ui
npm install
npm run dev            # port 5173
```

**Required environment variables:**

| Service | Variable | Description |
|---|---|---|
| fluxa-api | `DATABASE_URL` | PostgreSQL connection string |
| fluxa-api | `REDIS_URL` | Redis connection string |
| fluxa-api | `JWT_SECRET` / `JWT_REFRESH_SECRET` | Token signing keys |
| fluxa-api | `GROQ_API_KEY` | Groq API key (chat + reports) |
| fluxa-api | `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| fluxa-ml | `GROQ_API_KEY` | Groq API key (earnings sentiment) |
| fluxa-ui | `VITE_API_URL` | API base URL (default: `http://localhost:3000/api`) |

---

## Tech Stack Summary

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Lightweight Charts v5, Redux Toolkit, i18next |
| API | Node.js, Express, TypeScript, Prisma, Zod, JWT, Redis |
| ML | Python 3.12, FastAPI, hmmlearn, yfinance, scikit-learn, httpx |
| Database | PostgreSQL |
| Cache | Redis (in-memory + Redis) |
| AI | Groq (qwen3-32b, compound) |
| Auth | JWT (access + refresh), Google OAuth |
