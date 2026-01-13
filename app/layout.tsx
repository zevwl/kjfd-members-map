import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FD Members Map',
  description: 'Fire Department Response & Member Management',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased h-screen w-screen overflow-hidden">
        {children}
      </body>
    </html>
  );
}
