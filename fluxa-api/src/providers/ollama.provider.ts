import axios from 'axios';
import { config } from '../config';

const client = axios.create({
    baseURL: config.ollamaBaseUrl,
    timeout: 60_000,
});

interface OllamaMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export async function generateContent(
    prompt: string,
    options?: { responseMimeType?: string },
): Promise<string> {
    const wantsJson = !options?.responseMimeType || options.responseMimeType === 'application/json';

    const { data } = await client.post<{ message: { content: string } }>('/api/chat', {
        model: config.ollamaModel,
        messages: [{ role: 'user', content: prompt }] as OllamaMessage[],
        stream: false,
        options: { temperature: 0.7 },
        ...(wantsJson && { format: 'json' }),
    });

    const text = data.message?.content;
    if (!text) throw new Error('Empty response from Ollama');
    return text;
}

export async function* generateStream(prompt: string): AsyncGenerator<string> {
    const response = await client.post('/api/chat', {
        model: config.ollamaModel,
        messages: [{ role: 'user', content: prompt }] as OllamaMessage[],
        stream: true,
        options: { temperature: 0.7 },
    }, { responseType: 'stream', timeout: 300_000 });

    for await (const chunk of response.data) {
        const lines = (chunk as Buffer).toString().split('\n').filter(Boolean);
        for (const line of lines) {
            try {
                const json = JSON.parse(line);
                const token = json.message?.content;
                if (token) yield token;
            } catch {
                // incomplete chunk, skip
            }
        }
    }
}
