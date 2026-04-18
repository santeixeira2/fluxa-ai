import { GoogleGenAI } from '@google/genai';
import { config } from '../config';

const genAI = new GoogleGenAI({ apiKey: config.geminiApiKey });

const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'];

export async function generateContent(
    prompt: string,
    options?: { responseMimeType?: string },
): Promise<string> {
    let lastError: unknown;

    for (const model of MODELS) {
        try {
            const response = await genAI.models.generateContent({
                model,
                contents: prompt,
                config: {
                    responseMimeType: options?.responseMimeType ?? 'application/json',
                },
            });
            const text = response.text;
            if (!text) throw new Error('Empty response from Gemini');
            return text;
        } catch (err) {
            lastError = err;
            const status = (err as any)?.status ?? (err as any)?.code;
            // Only retry on overload/unavailable errors
            if (status !== 503 && status !== 429 && status !== 'UNAVAILABLE') throw err;
        }
    }

    throw lastError;
}