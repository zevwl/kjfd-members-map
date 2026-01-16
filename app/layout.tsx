import type { Metadata } from 'next';
import './globals.css';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import DashboardNav from '@/components/dashboard/DashboardNav';
import { UserRole } from '@/types';
import { Analytics } from "@vercel/analytics/next"

export const metadata: Metadata = {
  title: 'FD Members Map',
  description: 'Fire Department Response & Member Management',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  // Cast user role safely for the Nav component
  const user = session?.user
    ? (session.user as typeof session.user & { role: UserRole })
    : null;

  return (
    <html lang="en">
      <body className="antialiased h-screen w-screen overflow-hidden flex flex-col bg-gray-50">
        <DashboardNav user={user} />
        <main className="flex-1 relative overflow-hidden">
          {children}
        </main>

        <footer className="flex-none py-3 text-center text-xs text-gray-500 bg-white border-t border-gray-200">
          Project by <a href="https://landausoftware.com" target="_blank" rel="noopener noreferrer" className="font-bold text-gray-800 hover:text-brand-red transition-colors">Landau Software Inc.</a> • In Honor of all KJFD Members
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
