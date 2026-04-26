import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { prisma } from '@/utils/prisma';
import { redis } from '@/utils/redis';
import { config } from '@/config';
import { ensurePortfolio } from '@/services/portfolio.service';
import type { AuthToken, AuthPayload } from '@/types';

const ACCESS_TTL = '15m';
const REFRESH_TTL = 60 * 60 * 24 * 7;

function generateToken(payload: AuthPayload): AuthToken {
  const accessToken = jwt.sign(payload, String(config.jwtSecret), { expiresIn: ACCESS_TTL });
  const refreshToken = jwt.sign({ userId: payload.userId }, String(config.jwtRefreshSecret), { expiresIn: REFRESH_TTL });
  return { accessToken, refreshToken };
}

async function saveRefresh(userId: string, token: string) {
  await redis.set(`refresh:${userId}`, token, 'EX', REFRESH_TTL);
}

export async function register(email: string, password: string, name: string, phone: string): Promise<AuthToken> {
  const hashedPassword = await argon2.hash(password);
  const user = await prisma.user.create({
    data: { email, passwordHash: hashedPassword, name, phone },
    select: { id: true, email: true, name: true },
  });
  const token = generateToken({ userId: user.id, email: user.email, name: user.name ?? undefined });
  await saveRefresh(user.id, token.refreshToken);
  await ensurePortfolio(user.id);
  return token;
}

export async function login(email: string, password: string): Promise<AuthToken> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error('Invalid credentials');
  if (!user.passwordHash) throw new Error('Invalid credentials');

  const valid = await argon2.verify(user.passwordHash, password);
  if (!valid) throw new Error('Invalid credentials');

  const token = generateToken({ userId: user.id, email: user.email, name: user.name ?? undefined });
  await saveRefresh(user.id, token.refreshToken);
  return token;
}

export async function loginWithGoogle(accessToken: string): Promise<AuthToken> {
  const tokenRes = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`,
  );
  if (!tokenRes.ok) throw new Error('Invalid Google token');
  const tokenInfo = (await tokenRes.json()) as {
    aud?: string;
    email?: string;
    email_verified?: string;
  };
  if (tokenInfo.aud !== config.googleClientId) throw new Error('Invalid Google token');
  if (!tokenInfo.email || tokenInfo.email_verified !== 'true') {
    throw new Error('Invalid Google token');
  }

  const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!userRes.ok) throw new Error('Invalid Google token');
  const { email, name } = (await userRes.json()) as { email: string; name?: string };

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: name ?? email },
    select: { id: true, email: true, name: true },
  });

  const token = generateToken({ userId: user.id, email: user.email, name: user.name ?? undefined });
  await saveRefresh(user.id, token.refreshToken);
  await ensurePortfolio(user.id);
  return token;
}

export async function refreshToken(token: string): Promise<AuthToken> {
  let payload: AuthPayload;
  try {
    payload = jwt.verify(token, String(config.jwtRefreshSecret)) as AuthPayload;
  } catch {
    throw new Error('Invalid refresh token');
  }

  const userId = payload.userId;
  const stored = await redis.get(`refresh:${userId}`);
  if (stored !== token) throw new Error('Refresh token revoked');

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
  if (!user) throw new Error('User not found');

  const tokens = generateToken({ userId, email: user.email, name: user.name ?? undefined });
  await saveRefresh(userId, tokens.refreshToken);
  return tokens;
}

export async function logout(userId: string): Promise<void> {
  await redis.del(`refresh:${userId}`);
}
