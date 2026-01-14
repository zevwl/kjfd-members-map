import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { authConfig } from './auth.config';
import { prisma } from './lib/prisma';
import bcrypt from 'bcryptjs';
import { User as PrismaUser, UserRole } from '@/generated/client';

async function getUser(email: string): Promise<PrismaUser | null> {
  try {
    return await prisma.user.findUnique({ where: { email } });
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw new Error('Failed to fetch user.');
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // Strict check to ensure credentials exist
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email as string;
        const password = credentials.password as string;

        const user = await getUser(email);

        // Verify user exists and has a password set (invited users might not)
        if (!user || !user.passwordHash) return null;

        const passwordsMatch = await bcrypt.compare(password, user.passwordHash);
        if (passwordsMatch) {
          // Return a clean object matching the NextAuth User type
          // The 'role' field is handled by our module augmentation in types/next-auth.d.ts
          return {
            id: user.id,
            email: user.email,
            role: user.role as UserRole,
          };
        }

        console.log('Invalid credentials');
        return null;
      },
    }),
  ],
});
