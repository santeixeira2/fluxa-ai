import { generateContent, generateStream } from '../providers/ollama.provider';
import { getPriceBatch } from './price.service';
import { ASSETS } from '../config/assets.config';
import { detectRegime, detectAssetFromMessage, formatRegimeForPrompt } from './analysis.service';
import type { ParserUserInput } from '../types';

const PARSE_PROMPT = `Extract investment intent from the user message. Return ONLY valid JSON with this shape:
{"asset": string, "investment": number, "futurePrice": number | null}
- asset: crypto name/symbol (e.g. bitcoin, ethereum)
- investment: amount in BRL
- futurePrice: target price if mentioned, else null`;

export async function parseUserInput(message: string): Promise<ParserUserInput> {
  const text = await generateContent(`${PARSE_PROMPT}\n\nUser: ${message}`);
  return parseJsonSafely<ParserUserInput>(text);
}

export async function explainSimulation(data: {
  currentPrice: number;
  finalValue: number;
  profit: number;
  roi: number;
  investment: number;
  futurePrice: number;
}): Promise<string> {
  const prompt = `Explain this investment simulation in 2-3 sentences for a Brazilian user. Be clear and concise.
Data: ${JSON.stringify(data)}`;
  return generateContent(prompt, { responseMimeType: 'text/plain' });
}

interface PortfolioContext {
  currency: string;
  initialBalance: number;
  currentBalance: number;
  totalValue: number;
  totalPnl: number;
  totalPnlPct: number;
  positions: {
    assetName: string;
    quantity: number;
    avgPrice: number;
    currentPrice: number;
    currentValue: number;
    pnl: number;
    pnlPct: number;
  }[];
}

export async function* chatStream(message: string, portfolio?: PortfolioContext): AsyncGenerator<string> {
  const allIds = ASSETS
    .filter(a => a.provider !== 'exchangerate')
    .map(a => a.id);

  let priceContext = '';
  try {
    const prices = await getPriceBatch(allIds, 'brl');
    const lines = ASSETS
      .filter(a => prices[a.id] != null)
      .map(a => `${a.name} (${a.symbol}): R$ ${prices[a.id].toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    priceContext = lines.join('\n');
  } catch {
    priceContext = 'Preços indisponíveis no momento.';
  }

  const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  const fmtBRL = (n: number) => `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;

  let regimeContext = '';
  const detectedAsset = detectAssetFromMessage(message);
  if (detectedAsset) {
    try {
      const regime = await detectRegime(detectedAsset);
      regimeContext = formatRegimeForPrompt(detectedAsset, regime);
    } catch { /* sem dados suficientes, continua sem regime */ }
  }

  let portfolioContext = '';
  if (portfolio) {
    const posLines = portfolio.positions.length > 0
      ? portfolio.positions.map(p =>
          `  - ${p.assetName}: ${p.quantity} unidades | preço médio ${fmtBRL(p.avgPrice)} | preço atual ${fmtBRL(p.currentPrice)} | valor ${fmtBRL(p.currentValue)} | P&L ${fmtBRL(p.pnl)} (${fmtPct(p.pnlPct)})`
        ).join('\n')
      : '  (sem posições abertas)';

    portfolioContext = `
CARTEIRA DO USUÁRIO:
- Saldo livre: ${fmtBRL(portfolio.currentBalance)}
- Valor total da carteira: ${fmtBRL(portfolio.totalValue)}
- Rentabilidade total: ${fmtBRL(portfolio.totalPnl)} (${fmtPct(portfolio.totalPnlPct)})
- Capital inicial: ${fmtBRL(portfolio.initialBalance)}
- Posições:
${posLines}`;
  }

  const prompt = `Você é o Fluxa, assistente financeiro pessoal da Fluxa. Responda em português, de forma direta e objetiva.

Regras obrigatórias:
- Vá direto ao ponto. Sem introduções longas.
- Se o usuário tem posições abertas, leve em conta a carteira dele ao responder.
- Mencione o preço atual do ativo se relevante.
- Aponte os principais fatores que podem fazer o ativo SUBIR ou CAIR (resultados, juros, macro, concorrência, etc).
- Se um regime de mercado for fornecido abaixo, use-o para contextualizar a análise.
- Termine com: "Tendência: pode [SUBIR/CAIR/LATERAL] nos próximos meses por [motivo]."
- Última linha sempre: "⚠️ Análise até ${today}. Não é recomendação de investimento."
${portfolioContext}
${regimeContext ? `\n${regimeContext}\n` : ''}
PREÇOS ATUAIS (BRL):
${priceContext}

Pergunta: ${message}`;

  yield* generateStream(prompt);
}

function parseJsonSafely<T>(text: string): T {
  const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error('Invalid JSON from AI');
  }
}