import type { Session, User } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

export const authConfig = {
  pages: {
    signIn: '/login', // Redirect here if unauthorized
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }: { auth: Session | null; request: NextRequest }) {
      const isLoggedIn = !!auth?.user;
      const isOnAdmin = nextUrl.pathname.startsWith('/admin');

      // Admin Route Protection
      if (isOnAdmin) {
        if (isLoggedIn && auth?.user.role === 'ADMIN') return true;
        return false; // Redirect to login
      }

      return true;
    },
    jwt({ token, user }: { token: JWT; user?: User }) {
      if (user) {
        token.role = user.role;
        token.sub = user.id;
      }
      return token;
    },
    session({ session, token }: { session: Session; token: JWT }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }
      if (token.role && session.user) {
        session.user.role = token.role;
      }
      return session;
    },
  },
  providers: [], // Providers configured in auth.ts to avoid Edge issues with bcrypt
};
