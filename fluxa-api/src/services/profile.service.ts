import argon2 from 'argon2';
import { prisma } from '@/utils/prisma';

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, phone: true, createdAt: true, passwordHash: true },
  });
  if (!user) throw new Error('User not found');
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    createdAt: user.createdAt,
    hasPassword: !!user.passwordHash,
  };
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
