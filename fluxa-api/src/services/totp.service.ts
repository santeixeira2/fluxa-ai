import { generateSecret as otplibGenerateSecret, generateURI, verifySync } from 'otplib';
import QRCode from 'qrcode';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { config } from '@/config';

const ALGORITHM = 'aes-256-gcm';

function getKey(): Buffer {
  return createHash('sha256').update(config.totpEncryptionKey).digest();
}

export function encryptSecret(secret: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('hex'), tag.toString('hex'), encrypted.toString('hex')].join(':');
}

export function decryptSecret(stored: string): string {
  const [ivHex, tagHex, encHex] = stored.split(':');
  const key = getKey();
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return decipher.update(Buffer.from(encHex, 'hex')).toString('utf8') + decipher.final('utf8');
}

export function generateSecret(email: string): { secret: string; otpauthUrl: string } {
  const secret = otplibGenerateSecret();
  const otpauthUrl = generateURI({ label: email, issuer: 'Kuant', secret });
  return { secret, otpauthUrl };
}

export async function generateQrCode(otpauthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpauthUrl);
}

export function verifyCode(encryptedSecret: string, token: string): boolean {
  try {
    const secret = decryptSecret(encryptedSecret);
    const result = verifySync({ token, secret });
    return typeof result === 'object' ? result.valid : Boolean(result);
  } catch {
    return false;
  }
}

export function verifyRawCode(rawSecret: string, token: string): boolean {
  try {
    const result = verifySync({ token, secret: rawSecret });
    return typeof result === 'object' ? result.valid : Boolean(result);
  } catch {
    return false;
  }
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateDeviceToken(): string {
  return randomBytes(32).toString('hex');
}
