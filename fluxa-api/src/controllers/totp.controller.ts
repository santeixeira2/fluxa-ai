import { Request, Response } from 'express';
import { z } from 'zod';
import * as authService from '@/services/auth.service';

export async function setup(req: Request, res: Response) {
  const result = await authService.setupTotp(req.user!.sub, req.user!.email);
  res.json(result);
}

export async function confirm(req: Request, res: Response) {
  const { code } = z.object({ code: z.string().length(6) }).parse(req.body);
  await authService.confirmTotp(req.user!.sub, code);
  res.json({ ok: true });
}

export async function verify(req: Request, res: Response) {
  const { mfaToken, code, rememberDevice } = z.object({
    mfaToken: z.string().min(1),
    code: z.string().length(6),
    rememberDevice: z.boolean().optional().default(false),
  }).parse(req.body);

  const ip = req.ip;
  const userAgent = req.headers['user-agent'];
  const result = await authService.verifyTotp(mfaToken, code, rememberDevice, userAgent, ip);
  res.json(result);
}

export async function disable(req: Request, res: Response) {
  const { code } = z.object({ code: z.string().length(6) }).parse(req.body);
  await authService.disableTotp(req.user!.sub, code);
  res.json({ ok: true });
}

export async function devices(req: Request, res: Response) {
  const list = await authService.getTrustedDevices(req.user!.sub);
  res.json(list);
}

export async function removeDevice(req: Request, res: Response) {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
  await authService.removeTrustedDevice(req.user!.sub, id);
  res.status(204).send();
}
