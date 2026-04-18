---
name: Decisões Arquiteturais — Fluxa
description: Registro das decisões técnicas tomadas para o projeto Fluxa (stack, auth, infra, UI)
type: project
---

## Autenticação

**Decisão:** Implementar auth próprio (sem Auth0 ou serviço externo).

**Why:** Auth0 free tier limitado. Custo não justificado para MVP. JWT + refresh token é simples e o padrão já era conhecido via Spring Security.

**Stack:**
- Hash de senha: **argon2**
- Tokens: **jsonwebtoken** — access token (15min) + refresh token (7 dias)
- Refresh tokens: **Redis** com TTL de 7 dias (logout = `redis.del`)
- Users: tabela `users` no **Postgres** com `password_hash` nullable
- Google OAuth: `@react-oauth/google` frontend + `googleapis.com/userinfo` backend
- Usuários Google têm `password_hash = NULL` — login por senha bloqueado com mensagem clara

**Endpoints:**
```
POST /api/auth/register   → name, phone, email, password
POST /api/auth/login      → email, password
POST /api/auth/google     → access_token do Google
POST /api/auth/refresh    → troca refresh token
DELETE /api/auth/logout   → deleta refresh token do Redis
```

---

## Armazenamento de Tokens no Frontend

**Decisão:** Redux Toolkit como store primário, localStorage como backup de persistência.

**Why:** localStorage é acessível via DevTools — o user preferiu não expor diretamente. Redux centraliza o acesso e o subscriber sincroniza com localStorage apenas para persistir entre reloads.

**Fluxo:** login → `dispatch(setTokens)` → Redux store → subscriber → localStorage. `authHeaders()` no client.ts ainda lê do localStorage por ser síncrono.

---

## Banco de Dados e Cache

**Decisão:** Postgres + Redis. Sem NoSQL.

**Why:** Dados de alertas e usuários são relacionais. NoSQL replicaria a relação na mão sem ganho real. Volume atual não justifica complexidade extra.

**Schema:**
- `users` — id UUID, email, password_hash nullable, name, phone
- `price_history` — série temporal para MA/RSI/contexto LLM
- `alerts` — Smart Alerts com tipos: price_target, drop, surge, trend, anomaly
- `alert_triggers` — log de disparos com mensagem gerada pelo LLM

---

## Predição de Preços

**Decisão:** Sem ML. Tendência simples (MA/RSI) + LLM para explicação.

**Why:** Mercado de curto prazo tem ruído > sinal. ML passa no backtest e falha no mundo real.

**How to apply:** Quando o user pedir "previsão de preço", entregar tendência simples + explicação LLM. Nunca um número determinístico.

---

## Infraestrutura

**Decisão:** Monorepo com `infra/` na raiz (Docker Compose Postgres + Redis).

**Why:** Fluxa vai ter múltiplos serviços futuramente (API + ML worker). Infra na raiz é agnóstica ao código e compartilhada. Se fosse só a API para sempre, estaria dentro de `fluxa-api/`.

**Estrutura:**
```
fluxa/
├── infra/              ← docker-compose.yml, postgres/init.sql, redis/redis.conf
├── fluxa-api/          ← Node.js/TS backend
└── fluxa-ui/           ← React frontend
```

---

## Dark / Light Mode

**Decisão:** Tailwind `darkMode: 'class'` com detecção automática do sistema.

**Why:** Padrão do mercado. CSS variables já existem no App.css mas os componentes Tailwind precisam de `dark:` prefix.

**Status atual:** Navbar, LoginForm, FloatingChat, App.tsx migrados. Componentes com App.css (Simulator, HistoricalCalculator, Hero, PriceTicker) ainda precisam de ajuste fino.

**Fluxo:** `useTheme` hook → detecta `prefers-color-scheme` → aplica `class="dark"` no `<html>` → persiste no `localStorage.theme`.

---

## AI Chat

**Decisão:** Floating chat (FAB) no canto inferior direito, não seção inline.

**Why:** Mais moderno, não quebra o fluxo da página, acessível de qualquer ponto do scroll.

---

## O que NÃO fazer

- Treinar LSTM/XGBoost para prever preço — ruído > sinal no curto prazo
- Usar Auth0 — free tier limitado, custo desnecessário
- NoSQL para dados de alertas/usuários — relacional natural
- ML próprio para previsão — backtest passa, produção falha
