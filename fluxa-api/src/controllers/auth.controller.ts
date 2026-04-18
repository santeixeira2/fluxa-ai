import { Request, Response } from 'express';
import { z } from 'zod';
import * as authService from '@/services/auth.service';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  phone: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function register(req: Request, res: Response) {
  const { email, password, name, phone } = registerSchema.parse(req.body);
  const tokens = await authService.register(email, password, name, phone);
  res.status(201).json(tokens);
}

export async function login(req: Request, res: Response) {
  const { email, password } = loginSchema.parse(req.body);
  const tokens = await authService.login(email, password);
  res.json(tokens);
}

export async function googleAuth(req: Request, res: Response) {
  const { idToken: accessToken } = z.object({ idToken: z.string().min(1) }).parse(req.body);
  const tokens = await authService.loginWithGoogle(accessToken);
  res.json(tokens);
}

export async function refresh(req: Request, res: Response) {
  const { refreshToken } = z.object({ refreshToken: z.string().min(1) }).parse(req.body);
  const tokens = await authService.refreshToken(refreshToken);
  res.json(tokens);
}

export async function logout(req: Request, res: Response) {
  await authService.logout(req.user!.sub);
  res.status(204).send();
}
