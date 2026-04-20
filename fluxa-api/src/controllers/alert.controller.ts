import type { Request, Response } from 'express';
import { z } from 'zod';
import * as alertService from '@/services/alert.service';

const createSchema = z.object({
  assetId: z.string().min(1),
  type: z.enum(['PRICE_ABOVE', 'PRICE_BELOW']),
  threshold: z.number().positive(),
});

export async function list(req: Request, res: Response) {
  const alerts = await alertService.listAlerts(req.user!.sub);
  res.json(alerts);
}

export async function create(req: Request, res: Response) {
  const data = createSchema.parse(req.body);
  const alert = await alertService.createAlert(req.user!.sub, data);
  res.status(201).json(alert);
}

export async function remove(req: Request, res: Response) {
  await alertService.deleteAlert(req.params.id, req.user!.sub);
  res.status(204).send();
}
