import type { Metadata, Viewport } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import Providers from './providers';

export const metadata: Metadata = {
  title: 'PPN Finance',
  description: 'Gold Pawn Finance Management System',
  icons: {
    icon: '/favicon.svg',
    apple: '/icons/icon-192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PPN Finance',
  },
};

export const viewport: Viewport = {
  themeColor: '#1d4ed8',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">
        <Providers>
          <Navbar />
          <main className="max-w-6xl mx-auto px-4 py-4 sm:py-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
