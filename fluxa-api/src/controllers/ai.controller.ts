import { Request, Response } from 'express';
import { z } from 'zod';
import * as aiService from '../services/ai.service';
import { getPortfolio } from '../services/portfolio.service';
import { parseUserInputSchema, explainSimulationSchema } from '../schemas/ai.schema';

export async function parseUserInput(req: Request, res: Response) {
  const { message } = parseUserInputSchema.parse(req.body);
  const result = await aiService.parseUserInput(message);
  res.status(200).json(result);
}

export async function explainSimulation(req: Request, res: Response) {
  const data = explainSimulationSchema.parse(req.body);
  const explanation = await aiService.explainSimulation(data);
  res.status(200).json({ explanation });
}

export async function chat(req: Request, res: Response) {
  const { message } = z.object({ message: z.string().min(1) }).parse(req.body);

  let portfolio: Awaited<ReturnType<typeof getPortfolio>> | undefined;
  if (req.user) {
    try { portfolio = await getPortfolio(req.user.sub); } catch { /* sem portfólio ainda */ }
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    for await (const token of aiService.chatStream(message, portfolio)) {
      res.write(`data: ${JSON.stringify({ token })}\n\n`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[ai.chat] stream error:', msg, err);
    res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
  } finally {
    res.write('data: [DONE]\n\n');
    res.end();
  }
}