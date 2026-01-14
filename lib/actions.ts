'use server';

import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';

export type AuthState = string | undefined;

// NOTE: Login logic moved to client-side components/auth/LoginForm.tsx using next-auth/react signIn()
// This file now handles database mutations only (Signup).

export async function signup(
  prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (!email || !password || !confirmPassword) {
    return 'All fields are required.';
  }

  if (password !== confirmPassword) {
    return 'Passwords do not match.';
  }

  if (password.length < 6) {
    return 'Password must be at least 6 characters.';
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return 'User with this email already exists.';
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        role: null,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    return 'Failed to create account. Please try again.';
  }

  redirect('/login?signup=success');
}
