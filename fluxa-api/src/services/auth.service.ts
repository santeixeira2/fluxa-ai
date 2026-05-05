import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { prisma } from '@/utils/prisma';
import { redis } from '@/utils/redis';
import { config } from '@/config';
import { ensurePortfolio } from '@/services/portfolio.service';
import * as totpSvc from '@/services/totp.service';
import type { AuthToken, AuthPayload } from '@/types';

const ACCESS_TTL = '15m';
const REFRESH_TTL = 60 * 60 * 24 * 7;
const MFA_TTL = 60 * 5; // 5 min
const TOTP_SETUP_TTL = 60 * 10; // 10 min
const MAX_MFA_ATTEMPTS = 5;
const TRUSTED_DEVICE_DAYS = 30;

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

export type LoginResult = AuthToken | { mfaPending: true; mfaToken: string };

export async function login(
  email: string,
  password: string,
  deviceToken?: string,
  ip?: string,
): Promise<LoginResult> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) throw new Error('Invalid credentials');

  const valid = await argon2.verify(user.passwordHash, password);
  if (!valid) throw new Error('Invalid credentials');

  if (user.totpEnabled && user.totpSecret) {
    if (deviceToken) {
      const hash = totpSvc.hashToken(deviceToken);
      const device = await prisma.trustedDevice.findUnique({ where: { tokenHash: hash } });
      if (device && device.userId === user.id && device.expiresAt > new Date()) {
        const token = generateToken({ userId: user.id, email: user.email, name: user.name ?? undefined });
        await saveRefresh(user.id, token.refreshToken);
        await prisma.user.update({ where: { id: user.id }, data: { lastLoginIp: ip } });
        return token;
      }
    }
    const mfaToken = crypto.randomUUID();
    await redis.set(`mfa:${mfaToken}`, user.id, 'EX', MFA_TTL);
    return { mfaPending: true, mfaToken };
  }

  const token = generateToken({ userId: user.id, email: user.email, name: user.name ?? undefined });
  await saveRefresh(user.id, token.refreshToken);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginIp: ip } });
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

// ── TOTP ─────────────────────────────────────────────────────────────────────

export async function setupTotp(userId: string, email: string): Promise<{ qrCode: string; manualKey: string }> {
  const { secret, otpauthUrl } = totpSvc.generateSecret(email);
  await redis.set(`totp_setup:${userId}`, secret, 'EX', TOTP_SETUP_TTL);
  const qrCode = await totpSvc.generateQrCode(otpauthUrl);
  return { qrCode, manualKey: secret };
}

export async function confirmTotp(userId: string, code: string): Promise<void> {
  const secret = await redis.get(`totp_setup:${userId}`);
  if (!secret) throw new Error('Setup expired. Start again.');

  const valid = totpSvc.verifyRawCode(secret, code);
  if (!valid) throw new Error('Invalid code');

  const encrypted = totpSvc.encryptSecret(secret);
  await prisma.user.update({
    where: { id: userId },
    data: { totpSecret: encrypted, totpEnabled: true },
  });
  await redis.del(`totp_setup:${userId}`);
}

export type VerifyTotpResult = AuthToken & { deviceToken?: string };

export async function verifyTotp(
  mfaToken: string,
  code: string,
  rememberDevice: boolean,
  userAgent?: string,
  ip?: string,
): Promise<VerifyTotpResult> {
  const attemptsKey = `mfa_attempts:${mfaToken}`;
  const attempts = parseInt((await redis.get(attemptsKey)) ?? '0', 10);
  if (attempts >= MAX_MFA_ATTEMPTS) {
    await redis.del(`mfa:${mfaToken}`);
    throw new Error('Too many attempts. Please log in again.');
  }

  const userId = await redis.get(`mfa:${mfaToken}`);
  if (!userId) throw new Error('Session expired. Please log in again.');

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.totpSecret) throw new Error('TOTP not configured');

  const valid = totpSvc.verifyCode(user.totpSecret, code);
  if (!valid) {
    await redis.set(attemptsKey, String(attempts + 1), 'EX', MFA_TTL);
    throw new Error(`Invalid code. ${MAX_MFA_ATTEMPTS - attempts - 1} attempts remaining.`);
  }

  await redis.del(`mfa:${mfaToken}`);
  await redis.del(attemptsKey);

  const token = generateToken({ userId: user.id, email: user.email, name: user.name ?? undefined });
  await saveRefresh(user.id, token.refreshToken);
  await prisma.user.update({ where: { id: userId }, data: { lastLoginIp: ip } });

  if (rememberDevice) {
    const deviceToken = totpSvc.generateDeviceToken();
    const tokenHash = totpSvc.hashToken(deviceToken);
    const expiresAt = new Date(Date.now() + TRUSTED_DEVICE_DAYS * 24 * 60 * 60 * 1000);
    await prisma.trustedDevice.create({
      data: { userId: user.id, tokenHash, userAgent, expiresAt },
    });
    return { ...token, deviceToken };
  }

  return token;
}

export async function disableTotp(userId: string, code: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.totpSecret) throw new Error('TOTP not enabled');

  const valid = totpSvc.verifyCode(user.totpSecret, code);
  if (!valid) throw new Error('Invalid code');

  await prisma.user.update({
    where: { id: userId },
    data: { totpSecret: null, totpEnabled: false },
  });
  await prisma.trustedDevice.deleteMany({ where: { userId } });
}

export async function getTrustedDevices(userId: string) {
  return prisma.trustedDevice.findMany({
    where: { userId, expiresAt: { gt: new Date() } },
    select: { id: true, userAgent: true, createdAt: true, expiresAt: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function removeTrustedDevice(userId: string, deviceId: string): Promise<void> {
  await prisma.trustedDevice.deleteMany({ where: { id: deviceId, userId } });
}
