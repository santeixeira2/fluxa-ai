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

export async function uploadAvatar(req: Request, res: Response) {
  const file = req.file;
  if (!file) { res.status(400).json({ message: 'No file uploaded' }); return; }

  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.mimetype)) { res.status(400).json({ message: 'Only JPEG, PNG and WebP are allowed' }); return; }
  if (file.size > 2 * 1024 * 1024) { res.status(400).json({ message: 'File must be under 2 MB' }); return; }

  const avatarUrl = await profileService.uploadAvatar(req.user!.sub, file.buffer, file.mimetype);
  res.json({ avatarUrl });
}

export async function getAvatar(req: Request, res: Response) {
  const { userId } = req.params;
  const result = await profileService.streamAvatar(userId);
  if (!result) { res.status(404).send(); return; }
  res.setHeader('Content-Type', result.contentType);
  res.setHeader('Cache-Control', 'public, max-age=86400');
  result.stream.pipe(res);
}

export async function deleteAvatar(req: Request, res: Response) {
  await profileService.removeAvatar(req.user!.sub);
  res.status(204).send();
}
