import { NextResponse } from 'next/server';
import { verifyToken } from './lib/auth';

export async function middleware(request) {
  const token = request.cookies.get('auth-token')?.value;
  const { pathname } = request.nextUrl;

  // Redirect root to /login
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Login page: redirect if already logged in
  if (pathname.startsWith('/login')) {
    if (token) {
      const decoded = await verifyToken(token);
      if (decoded?.type === 'superadmin' || decoded?.type === 'admin') {
        return NextResponse.redirect(new URL('/admin', request.url));
      }
    }
    return NextResponse.next();
  }

  // Protected admin routes
  if (pathname.startsWith('/admin')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const decoded = await verifyToken(token);
    if (!decoded) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('auth-token');
      return response;
    }

    // Only allow superadmin or admin
    if (decoded.type !== 'superadmin' && decoded.type !== 'admin') {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Add decoded info to headers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', decoded.id.toString());
    requestHeaders.set('x-user-type', decoded.type);
    requestHeaders.set('x-user-email', decoded.email || '');

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/login', '/admin/:path*'],
};
