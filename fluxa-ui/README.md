# Fluxa UI

> Interface web da plataforma Fluxa — simulação de investimentos em tempo real com IA local (Qwen).

![Stack](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![Stack](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)
![Stack](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite)
![Stack](https://img.shields.io/badge/Tailwind-3-06B6D4?style=flat-square&logo=tailwindcss)
![Stack](https://img.shields.io/badge/Redux_Toolkit-2-764ABC?style=flat-square&logo=redux)

---

## Escopo

Fluxa é uma calculadora financeira inteligente voltada ao investidor brasileiro. O produto resolve três problemas principais:

1. **Simulação futura** — "Se o Bitcoin chegar a R$500k e eu tiver R$5.000 investidos, quanto ganho?"
2. **Calculadora histórica** — "Se eu tivesse comprado NVIDIA em 2020 com R$3.000, quanto teria hoje?"
3. **Assistente IA** — Chat flutuante em linguagem natural com dados de mercado em tempo real

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | React 18 + Vite 8 |
| Linguagem | TypeScript 5 (strict) |
| Estilização | Tailwind CSS 3 + dark mode (`class` strategy) |
| Estado global | Redux Toolkit + react-redux |
| Roteamento | React Router v6 |
| HTTP | Fetch nativo — `api/client.ts` tipado |
| Auth OAuth | @react-oauth/google |
| Build | Vite (HMR em dev, bundle otimizado em prod) |

---

## Autenticação

Implementada do zero (sem Auth0 ou serviços externos):

- **Register/Login** — email + senha com hash argon2
- **Google OAuth** — login com conta Google via popup
- **Tokens** — JWT access token (15min) + refresh token (7 dias no Redis)
- **Armazenamento** — Redux store (runtime) + localStorage (persistência entre reloads)

Fluxo:
```
Frontend → POST /api/auth/login → { accessToken, refreshToken }
         → Redux setTokens() → localStorage (backup)
         → authHeaders() injeta Bearer em todas as requests
```

---

## Arquitetura

### Estrutura de Diretórios

```
src/
  api/
    client.ts              ← todas as chamadas HTTP tipadas + authHeaders
  components/
    auth/
      LoginForm.tsx        ← register/login + Google OAuth
      GoogleButton.tsx     ← botão Google (isolado, requer provider)
      ProtectedRoute.tsx   ← guard de rota
    containers/
      SimulatorContainer.tsx
    forms/
      SimulatorForm.tsx
    FloatingChat.tsx       ← chat IA flutuante (FAB, canto inferior direito)
    Hero.tsx
    HistoricalCalculator.tsx
    Navbar.tsx             ← dropdown com perfil, settings, dark/light mode
    PriceTicker.tsx
    Simulator.tsx
  contexts/
    AuthContext.tsx        ← login, register, loginWithGoogle, logout
    ThemeContext.tsx       ← dark/light mode (detecta sistema, persiste no localStorage)
  hooks/
    useApi.ts
    useAssets.ts
    useTheme.ts            ← media query + localStorage
  store/
    authSlice.ts           ← user, accessToken, refreshToken
    index.ts               ← configureStore + subscriber para localStorage
  App.tsx / App.css
  main.tsx
```

### Fluxo de Dados

```
fluxa-api (REST/JSON)
       ↓
  api/client.ts  (funções tipadas + Bearer token automático)
       ↓
  Context / Redux  (estado global)
       ↓
  Container Components  (lógica)
       ↓
  UI Components  (renderização)
```

### Dark / Light Mode

Tailwind `darkMode: 'class'` — a classe `dark` é aplicada no `<html>` pelo `useTheme`.
- Default: detecta `prefers-color-scheme` do sistema
- Persistência: `localStorage.theme`
- Toggle: menu de settings na Navbar

---

## Ativos Suportados (via `/api/assets`)

| Categoria | Exemplos |
|---|---|
| Crypto | BTC, ETH, SOL, BNB, XRP, ADA... |
| Stocks US | AAPL, MSFT, NVDA, TSLA, AMZN... |
| ETFs | QQQ, SPY, DIA, VT |
| Ações BR (B3) | PETR4, VALE3, ITUB4, BBDC4... |
| Commodities | Ouro, Prata, Petróleo WTI, Brent |
| Forex | USD/BRL, EUR/BRL, GBP/BRL, JPY/BRL |

---

## Como Rodar

**Pré-requisitos:**
- `fluxa-api` rodando em `localhost:3000`
- Docker Compose com Postgres + Redis (`cd infra && docker-compose up -d`)

```bash
npm install
cp .env.example .env   # preencher VITE_GOOGLE_CLIENT_ID
npm run dev            # http://localhost:5173
npm run build          # build → dist/
```

### Variáveis de Ambiente

```env
VITE_GOOGLE_CLIENT_ID=    # Google OAuth Client ID (console.cloud.google.com)
VITE_API_URL=/api         # base das requests (usa proxy Vite em dev)
VITE_API_TARGET=http://localhost:3000  # alvo do proxy
```

---

## Planos Futuros

### Curto Prazo
- [ ] Light mode completo (componentes com App.css ainda sem dark: vars)
- [ ] Página de perfil (`/profile`)
- [ ] Smart Alerts — UI para configurar alertas de preço

### Médio Prazo
- [ ] Portfólio pessoal — salvar e acompanhar simulações
- [ ] Gráfico histórico integrado na calculadora
- [ ] PWA — instalável no celular

### Longo Prazo
- [ ] Mobile nativo (React Native)
- [ ] Dashboard consolidado de portfólio
