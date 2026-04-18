import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { db } from '@/utils/db';
import { redis } from '@/utils/redis';
import { config } from '@/config';
import type { AuthToken, AuthPayload } from '@/types';

const ACCESS_TTL = '15m';
const REFRESH_TTL = 60 * 60 * 24 * 7;
const googleClient = new OAuth2Client(config.googleClientId);

function generateToken(payload: AuthPayload): AuthToken {
  const accessToken = jwt.sign(payload, String(config.jwtSecret), { expiresIn: ACCESS_TTL });
  const refreshToken = jwt.sign({ sub: payload.userId }, String(config.jwtRefreshSecret), { expiresIn: REFRESH_TTL });
  return { accessToken, refreshToken };
}

async function saveRefresh(userId: string, token: string) {
  await redis.set(`refresh:${userId}`, token, 'EX', REFRESH_TTL);
}

export async function register(email: string, password: string, name: string, phone: string): Promise<AuthToken> {
  const hashedPassword = await argon2.hash(password);
  const { rows } = await db.query<{ id: string; email: string; name: string }>(
    `INSERT INTO users (email, password_hash, name, phone) VALUES ($1, $2, $3, $4) RETURNING id, email, name`,
    [email, hashedPassword, name, phone],
  );
  const token = generateToken({ userId: rows[0].id, email, name: rows[0].name });
  await saveRefresh(rows[0].id, token.refreshToken);
  return token;
}

export async function login(email: string, password: string): Promise<AuthToken> {
  const { rows } = await db.query(`SELECT id, email, name, password_hash FROM users WHERE email = $1`, [email]);
  if (rows.length === 0) throw new Error('Invalid credentials');
  if (!rows[0].password_hash) throw new Error('This account uses Google sign-in');

  const valid = await argon2.verify(rows[0].password_hash, password);
  if (!valid) throw new Error('Invalid credentials');

  const token = generateToken({ userId: rows[0].id, email: rows[0].email, name: rows[0].name });
  await saveRefresh(rows[0].id, token.refreshToken);
  return token;
}

export async function loginWithGoogle(accessToken: string): Promise<AuthToken> {
  const res = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('Invalid Google token');
  const { email, name } = await res.json() as { email: string; name?: string };
  let { rows } = await db.query(`SELECT id, email FROM users WHERE email = $1`, [email]);

  if (rows.length === 0) {
    const insert = await db.query(
      `INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id, email, name`,
      [email, name ?? email],
    );
    rows = insert.rows;
  }

  const token = generateToken({ userId: rows[0].id, email: rows[0].email, name: rows[0].name });
  await saveRefresh(rows[0].id, token.refreshToken);
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

  const { rows } = await db.query(`SELECT email, name FROM users WHERE id = $1`, [userId]);
  if (rows.length === 0) throw new Error('User not found');

  const tokens = generateToken({ userId, email: rows[0].email, name: rows[0].name });
  await saveRefresh(userId, tokens.refreshToken);
  return tokens;
}

export async function logout(userId: string): Promise<void> {
  await redis.del(`refresh:${userId}`);
}
