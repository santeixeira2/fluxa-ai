import { generateContent, generateStream } from '../providers/ollama.provider';
import { getPriceBatch } from './price.service';
import { ASSETS } from '../config/assets.config';
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

export async function* chatStream(message: string): AsyncGenerator<string> {
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

  const prompt = `Você é o assistente financeiro da Fluxa. Responda em português, de forma direta e objetiva. Sem rodeios.

Regras obrigatórias:
- Vá direto ao ponto. Sem introduções longas.
- Mencione o preço atual do ativo se relevante.
- Diga os principais fatores que podem fazer o ativo SUBIR ou CAIR nos próximos meses (seja específico: resultados trimestrais, ciclo de juros, adoção de IA, concorrência, etc).
- Termine com uma linha de tendência no formato: "Tendência: pode [SUBIR/CAIR/LATERAL] nos próximos meses por [motivo principal]."
- Última linha sempre: "⚠️ Análise baseada em dados até ${today}. Não é determinística — nosso modelo não prevê o futuro com certeza. Isso não é recomendação de investimento."

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