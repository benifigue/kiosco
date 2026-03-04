import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, KioscoSession } from '@/lib/session';

const PUBLIC_PATHS = ['/login', '/api/auth/login'];
const ADMIN_ONLY_PATHS = [
  '/users',
  '/stats',
  '/api/users',
  '/api/stats',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow static assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Get session from request cookies
  const response = NextResponse.next();
  const session = await getIronSession<KioscoSession>(request.cookies, sessionOptions);

  if (!session.user) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Check admin-only routes
  const isAdminRoute = ADMIN_ONLY_PATHS.some((p) => pathname.startsWith(p));
  if (isAdminRoute && session.user.role !== 'ADMIN') {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
