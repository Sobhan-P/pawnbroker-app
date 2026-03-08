import type { Metadata, Viewport } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import Providers from './providers';

export const metadata: Metadata = {
  title: 'Pawn Broker App',
  description: 'Gold Pawn Finance Management System',
  icons: {
    icon: '/favicon.svg',
    apple: '/api/pwa-icon?size=180',
    other: [{ rel: 'apple-touch-icon', url: '/api/pwa-icon?size=180' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Pawn Broker App',
  },
};

export const viewport: Viewport = {
  themeColor: '#1d4ed8',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen flex flex-col">
        <Providers>
          <Navbar />
          <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-4 sm:py-8">{children}</main>
          <footer className="print:hidden border-t border-gray-200 bg-white py-3 px-4 text-center text-xs text-gray-400">
            &copy; {new Date().getFullYear()} Pawn Broker App &nbsp;|&nbsp; Developed by Rise Again Web Technologies &nbsp;|&nbsp; +91 75300 58236
          </footer>
        </Providers>
      </body>
    </html>
  );
}
