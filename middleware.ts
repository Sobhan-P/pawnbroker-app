import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow NextAuth routes, setup page, login page, and admin-reset
  if (
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/setup') ||
    pathname.startsWith('/api/admin-reset') ||
    pathname === '/login' ||
    pathname === '/setup'
  ) {
    return NextResponse.next();
  }

  // Allow static files and PWA assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/icons') ||
    pathname.startsWith('/api/pwa-icon') ||
    pathname === '/favicon.ico' ||
    pathname === '/favicon.svg' ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/kt.html'
  ) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // If not authenticated, redirect to login
  if (!token) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin-only routes (/api/report is accessible to all authenticated users for WhatsApp send)
  const adminPaths = ['/admin', '/api/users'];
  const isAdminPath = adminPaths.some((p) => pathname.startsWith(p));
  if (isAdminPath && token.role !== 'admin') {
    return NextResponse.redirect(new URL('/employee', req.url));
  }

  // Employees cannot access the admin dashboard (/) or admin-only pages
  if (token.role === 'employee') {
    const restrictedForEmployee = ['/'];
    if (restrictedForEmployee.includes(pathname)) {
      return NextResponse.redirect(new URL('/employee', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
