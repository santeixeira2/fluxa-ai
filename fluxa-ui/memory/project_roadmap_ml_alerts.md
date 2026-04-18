---
name: Roadmap — ML vs Alertas Inteligentes
description: Decisão arquitetural sobre o que construir no Fluxa em vez de ML para previsão de preços
type: project
---

Decisão consolidada (discussão com ChatGPT + Claude): não construir modelo ML para prever curto prazo.

**Why:** Mercado de curto prazo tem ruído > sinal. Mesmo fundos profissionais erram. ML passa no backtest e falha no mundo real.

**How to apply:** Quando o user pedir "previsão de preço", entregar tendência simples + explicação LLM, nunca um número determinístico.

---

## O que FAZER

### 1. Tendência simples (sem ML)
- Se preço atual > média das últimas 6h → tendência de alta
- Indicadores: MA, RSI, variação % em janelas de 5/10/20 dias
- Rápido, útil, honesto

### 2. LLM para UX, não predição
- LLM explica a tendência em linguagem humana
- LLM gera insight sobre movimento incomum
- Nunca usar LLM para gerar número de preço futuro

### 3. Smart Alerts (alta prioridade — diferencial real)
Tipos de alerta:
- Preço alvo: "me avisa quando BTC chegar a R$350k"
- Queda brusca: "me avisa se cair 10%"
- Alta brusca: "me avisa se subir 15%"
- Tendência: "me avisa se entrar em tendência de alta"
- Smart: "me avisa se o mercado ficar estranho" → detecta variação fora do normal + LLM explica

Arquitetura de alertas:
```
User define alerta → salva no DB → cron worker (1 min) → busca preço → compara regras → dispara → LLM explica
```

Notificações: push (Firebase), email. WhatsApp bot é futuro.

### 4. Redis + Postgres
- Redis: cacheia preços (TTL curto) e respostas de predição (TTL 1h)
- Postgres: histórico de preços, alertas dos usuários, dataset para indicadores técnicos

## O que NÃO fazer agora
- Treinar LSTM / XGBoost / KNN para prever preço
- Prever preço exato
- Qualquer coisa que prometa certeza ao usuário

## MVP ideal
real price ✓ | simulação ✓ | alertas ✓ | tendência simples ✓ | LLM explicando ✓
