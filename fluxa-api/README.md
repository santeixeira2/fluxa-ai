# Fluxa API

> Backend da plataforma Fluxa — REST API para simulação de investimentos, preços em tempo real, autenticação e IA financeira local com Qwen 2.5.

![Stack](https://img.shields.io/badge/Node.js-20-339933?style=flat-square&logo=nodedotjs)
![Stack](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)
![Stack](https://img.shields.io/badge/Express-4-000000?style=flat-square&logo=express)
![Stack](https://img.shields.io/badge/Postgres-16-4169E1?style=flat-square&logo=postgresql)
![Stack](https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis)

---

## Escopo

API REST que serve de backbone para o Fluxa UI. Responsabilidades:

- **Autenticação** — register/login com argon2 + JWT, Google OAuth, refresh tokens no Redis
- **Preços em tempo real** — crypto via CryptoCompare, stocks/ETFs via Yahoo Finance, câmbio via ExchangeRate
- **Cache Redis** — preços (TTL 60s), refresh tokens (TTL 7 dias)
- **Banco de dados** — Postgres para users, alertas, histórico de preços
- **Simulação de investimento** — ROI dado preço atual e preço-alvo
- **Calculadora histórica** — preço de um ativo em qualquer data passada
- **IA Financeira** — chat em linguagem natural com contexto de preços reais via Qwen 2.5

---

## Stack

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js 20+ |
| Linguagem | TypeScript 5 (strict) |
| Framework HTTP | Express 4 |
| Validação | Zod |
| Banco de dados | PostgreSQL 16 (pg) |
| Cache / Tokens | Redis 7 (ioredis) |
| Hash de senha | argon2 |
| Auth tokens | jsonwebtoken (JWT) |
| OAuth | google-auth-library |
| HTTP Client | Axios |
| IA | Ollama (Qwen 2.5 7B) — local, sem custo de API |
| Dev server | ts-node-dev (hot reload) + tsconfig-paths |

---

## Arquitetura

### Layered Architecture

```
Request
    ↓
routes/          ← mapeamento URL → controller
    ↓
middleware/      ← authMiddleware (JWT), errorHandler, logger
    ↓
controllers/     ← parse/validação (Zod), chama service
    ↓
services/        ← lógica de negócio pura (sem Express)
    ↓
providers/       ← integração com APIs externas
    ↓
utils/           ← db (pg Pool), redis (ioredis), cache, logger
```

### Estrutura de Diretórios

```
src/
  app.ts                    ← Express (middlewares, CORS, rotas)
  server.ts                 ← bootstrap (listen)
  config/
    index.ts                ← env vars (PORT, POSTGRES_URL, REDIS_URL, JWT_SECRET...)
    assets.config.ts        ← catálogo de 47 ativos
  controllers/
    auth.controller.ts      ← register, login, googleAuth, refresh, logout
    assets.controller.ts
    ai.controller.ts
    price.controller.ts
    simulation.controller.ts
  middleware/
    auth.middleware.ts      ← verifica JWT Bearer, injeta req.user
    error.middleware.ts
    logger.middleware.ts
  providers/
    cryptocompare.provider.ts
    yahoo.provider.ts
    exchangerate.provider.ts
    ollama.provider.ts
  routes/
    auth.routes.ts          ← /api/auth/*
    assets.routes.ts
    ai.routes.ts
    price.routes.ts
    simulation.routes.ts
  services/
    auth.service.ts         ← register, login, loginWithGoogle, refreshToken, logout
    ai.service.ts
    price.service.ts
    simulation.service.ts
  types/index.ts
  utils/
    asyncHandler.ts
    db.ts                   ← pg Pool singleton
    redis.ts                ← ioredis singleton + getCached/setCached/deleteCached
    logger.ts
```

---

## Endpoints

### Auth
```
POST /api/auth/register   { email, password, name, phone }
POST /api/auth/login      { email, password }
POST /api/auth/google     { idToken }           ← access_token do Google
POST /api/auth/refresh    { refreshToken }
DELETE /api/auth/logout   (Bearer token)
```

### Preços
```
GET  /api/price/price?asset=bitcoin&currency=brl
GET  /api/price/batch?assets=bitcoin,ethereum&currency=brl
GET  /api/price/fiat-rate?from=USD&to=BRL
```

### Simulação
```
POST /api/simulate           { asset, investment, futurePrice, currency }
POST /api/simulate/historical { asset, purchaseDate, investment, currency }
```

### IA
```
POST /api/ai/chat    { message }   → SSE stream de tokens
POST /api/ai/parse   { message }   → intent para preencher simulador
POST /api/ai/explain { ...data }   → explica resultado
```

### Ativos / Health
```
GET  /api/assets
GET  /health
```

---

## Autenticação

Fluxo JWT:
```
Register/Login → argon2.hash(password) → INSERT users → gerar tokens
               → accessToken (JWT 15min) + refreshToken (JWT 7d)
               → redis.set(`refresh:${userId}`, refreshToken, EX 7d)

Refresh        → verificar refreshToken → buscar no Redis → gerar novos tokens
Logout         → redis.del(`refresh:${userId}`)

Rota protegida → authMiddleware → jwt.verify(Bearer) → req.user = { sub, email }
```

Google OAuth:
```
Frontend → Google popup → access_token
         → POST /api/auth/google { idToken: access_token }
         → GET googleapis.com/userinfo → { email, name }
         → upsert users → tokens JWT (mesmo fluxo)
```

Usuários Google têm `password_hash = NULL`. Login por senha para esses usuários retorna `"This account uses Google sign-in"`.

---

## Banco de Dados

Schema em `infra/postgres/init.sql`:

```sql
users         (id UUID, email, password_hash nullable, name, phone, created_at)
price_history (id BIGSERIAL, asset_id, price_brl, recorded_at)
alerts        (id UUID, user_id, asset_id, type, threshold, direction, active, triggered_at)
alert_triggers(id BIGSERIAL, alert_id, price_brl, message, triggered_at)
```

---

## Como Rodar

**Pré-requisitos:**
```bash
# Subir Postgres + Redis
cd infra && docker-compose up -d
```

```bash
npm install
cp .env.example .env   # preencher variáveis
npm run dev            # http://localhost:3000
```

### Variáveis de Ambiente

```env
PORT=3000
POSTGRES_URL=postgresql://fluxa:fluxa_secret@127.0.0.1:5432/fluxa?sslmode=disable
REDIS_URL=redis://127.0.0.1:6379
JWT_SECRET=troca_por_algo_longo_e_aleatorio
JWT_REFRESH_SECRET=troca_por_outro_valor_diferente
GOOGLE_CLIENT_ID=         # mesmo valor do VITE_GOOGLE_CLIENT_ID
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b
EXCHANGE_BASE_URL=https://open.er-api.com/v6
```

### Setup Ollama

```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull qwen2.5:7b
```

---

## Planos Futuros

### Curto Prazo
- [x] Smart Alerts — worker cron (30s) que verifica preços e dispara alertas
- [x] Portfólio API — 1 portfólio por usuário, compra/venda com preço real
- [x] Notificações in-app — polling com badge e dropdown no Navbar
- [x] Perfil do usuário — editar nome/telefone, trocar senha
- [x] Chat AI com contexto do portfólio — posições, P&L e saldo injetados no prompt
- [x] Gráfico OHLCV — CryptoCompare (crypto) + Yahoo Finance (ações BR/US), períodos 1D–5Y
- [x] Snapshots de performance do portfólio — job diário + snapshot por trade
- [x] Refresh token automático — intercepta 401, retenta request transparentemente
- [ ] Rate limiting (`express-rate-limit`)
- [ ] Helmet (headers de segurança)
- [ ] Testes (Jest + Supertest)

### Médio Prazo
- [ ] Comparador de ativos — side-by-side retorno histórico
- [ ] Calculadora de DCA — aporte mensal vs meta
- [ ] Relatório mensal gerado por AI
- [ ] Freemium — limites por plano, integração Stripe/Pagar.me

### Longo Prazo
- [ ] Fine-tuning do Qwen 2.5 com dados financeiros em PT-BR
- [ ] Indicadores técnicos (MA, RSI) calculados sobre o histórico local
- [ ] PWA / Mobile nativo
