import Groq from 'groq-sdk';
import { config } from '../config';

const client = new Groq({ apiKey: config.groqApiKey });

export async function generateContent(
  prompt: string,
  options?: { responseMimeType?: string },
): Promise<string> {
  const wantsJson = !options?.responseMimeType || options.responseMimeType === 'application/json';

  const completion = await client.chat.completions.create({
    model: config.groqModel,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    reasoning_format: 'hidden',
    ...(wantsJson && { response_format: { type: 'json_object' } }),
  } as Parameters<typeof client.chat.completions.create>[0]);

  const text = (completion as { choices: { message: { content: string | null } }[] }).choices[0]?.message?.content;
  if (!text) throw new Error('Empty response from Groq');
  return stripThinkTags(text);
}

export async function* generateStream(
  prompt: string,
  options?: { model?: string },
): AsyncGenerator<string> {
  const model = options?.model ?? config.groqModel;
  const supportsReasoningParam = model.includes('qwen') || model.includes('deepseek');

  const stream = await client.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    ...(supportsReasoningParam && { reasoning_format: 'hidden' }),
    stream: true,
  } as Parameters<typeof client.chat.completions.create>[0]) as AsyncIterable<{
    choices: { delta: { content?: string | null } }[];
  }>;

  let buffer = '';
  let inThink = false;
  const OPEN = '<think>';
  const CLOSE = '</think>';

  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content;
    if (!token) continue;
    buffer += token;

    while (buffer.length > 0) {
      if (inThink) {
        const end = buffer.indexOf(CLOSE);
        if (end === -1) {
          if (buffer.length > CLOSE.length) buffer = buffer.slice(-CLOSE.length);
          break;
        }
        buffer = buffer.slice(end + CLOSE.length);
        inThink = false;
      } else {
        const start = buffer.indexOf(OPEN);
        if (start === -1) {
          const safeLen = Math.max(0, buffer.length - (OPEN.length - 1));
          if (safeLen > 0) {
            yield buffer.slice(0, safeLen);
            buffer = buffer.slice(safeLen);
          }
          break;
        }
        if (start > 0) yield buffer.slice(0, start);
        buffer = buffer.slice(start + OPEN.length);
        inThink = true;
      }
    }
  }

  if (!inThink && buffer.length > 0) yield buffer;
}

function stripThinkTags(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>\s*/g, '').trim();
}
