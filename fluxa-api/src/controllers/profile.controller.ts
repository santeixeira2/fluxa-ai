import type { Request, Response } from 'express';
import { z } from 'zod';
import * as profileService from '@/services/profile.service';

const updateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().min(8).max(20).optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export async function get(req: Request, res: Response) {
  const profile = await profileService.getProfile(req.user!.sub);
  res.json(profile);
}

export async function update(req: Request, res: Response) {
  const data = updateSchema.parse(req.body);
  const profile = await profileService.updateProfile(req.user!.sub, data);
  res.json(profile);
}

export async function changePassword(req: Request, res: Response) {
  const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
  await profileService.changePassword(req.user!.sub, currentPassword, newPassword);
  res.status(204).send();
}
