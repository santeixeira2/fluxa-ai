import argon2 from 'argon2';
import { Readable } from 'stream';
import { prisma } from '@/utils/prisma';
import { minioClient, AVATAR_BUCKET, ensureBucket } from '@/utils/minio';

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, phone: true, createdAt: true, passwordHash: true, totpEnabled: true, avatarUrl: true },
  });
  if (!user) throw new Error('User not found');
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    createdAt: user.createdAt,
    hasPassword: !!user.passwordHash,
    totpEnabled: user.totpEnabled,
    avatarUrl: user.avatarUrl ?? null,
  };
}

export async function uploadAvatar(userId: string, buffer: Buffer, mimetype: string): Promise<string> {
  await ensureBucket();
  const ext = mimetype === 'image/png' ? 'png' : mimetype === 'image/webp' ? 'webp' : 'jpg';
  const objectName = `avatars/${userId}.${ext}`;
  const stream = Readable.from(buffer);
  await minioClient.putObject(AVATAR_BUCKET, objectName, stream, buffer.length, { 'Content-Type': mimetype });
  const avatarUrl = `/api/profile/avatar/${userId}`;
  await prisma.user.update({ where: { id: userId }, data: { avatarUrl } });
  return avatarUrl;
}

export async function removeAvatar(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { avatarUrl: true } });
  if (user?.avatarUrl) {
    for (const ext of ['jpg', 'png', 'webp']) {
      try { await minioClient.removeObject(AVATAR_BUCKET, `avatars/${userId}.${ext}`); } catch { /* not found */ }
    }
    await prisma.user.update({ where: { id: userId }, data: { avatarUrl: null } });
  }
}

export async function streamAvatar(userId: string): Promise<{ stream: Readable; contentType: string } | null> {
  for (const ext of ['jpg', 'png', 'webp']) {
    try {
      const objectName = `avatars/${userId}.${ext}`;
      const stat = await minioClient.statObject(AVATAR_BUCKET, objectName);
      const stream = await minioClient.getObject(AVATAR_BUCKET, objectName);
      return { stream, contentType: (stat.metaData?.['content-type'] as string) ?? `image/${ext}` };
    } catch { /* try next */ }
  }
  return null;
}

export async function updateProfile(userId: string, data: { name?: string; phone?: string }) {
  return prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, email: true, name: true, phone: true, createdAt: true },
  });
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');
  if (!user.passwordHash) throw new Error('This account uses Google sign-in');

  const valid = await argon2.verify(user.passwordHash, currentPassword);
  if (!valid) throw new Error('Senha atual incorreta');

  const newHash = await argon2.hash(newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } });
}
