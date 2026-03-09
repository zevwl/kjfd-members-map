'use server';

import { prisma } from '@/lib/prisma';
import { UserRole } from '@/types';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { User } from '@/generated/client';
import { hash } from 'bcryptjs';

// Helper to ensure current user is Admin
async function ensureAdmin() {
  const session = await getServerSession(authOptions);
  // Safe cast since we check roles in authOptions, but adding optional chain for safety
  const role = (session?.user as User)?.role as UserRole | undefined;

  if (role !== UserRole.ADMIN) {
    throw new Error('Unauthorized: Admin access required');
  }
  return session!.user!.id;
}

export async function approveUser(userId: string, role: UserRole) {
  const adminId = await ensureAdmin();

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        role: role,
        approvedAt: new Date(),
        approvedById: adminId,
      },
    });
    revalidatePath('/admin');
  } catch (error) {
    console.error('Failed to approve user:', error);
    throw new Error('Failed to approve user');
  }
}

export async function updateUserRole(userId: string, role: UserRole) {
  await ensureAdmin();

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { role },
    });
    revalidatePath('/admin');
  } catch (error) {
    console.error('Failed to update role:', error);
    throw new Error('Failed to update role');
  }
}

export async function deleteUser(userId: string) {
  await ensureAdmin();

  try {
    await prisma.user.delete({
      where: { id: userId },
    });
    revalidatePath('/admin');
  } catch (error) {
    console.error('Failed to delete user:', error);
    throw new Error('Failed to delete user');
  }
}

// Updated to accept memberId
export async function createUser(email: string, password: string, role: UserRole, memberId?: string) {
  try {
    const hashedPassword = await hash(password, 12);

    // Check if memberId is valid if provided
    if (memberId) {
      const member = await prisma.member.findUnique({ where: { id: memberId } });
      if (!member) throw new Error('Member not found');
    }

    await prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        role,
        memberId: memberId || null, // Link member
      },
    });

    revalidatePath('/admin');
    return { success: true };
  } catch (error) {
    console.error('Failed to create user:', error);
    throw new Error('Failed to create user');
  }
}


export async function resetUserPassword(userId: string, newPassword: string) {
  try {
    const hashedPassword = await hash(newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashedPassword },
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to reset password:', error);
    throw new Error('Failed to reset password');
  }
}
