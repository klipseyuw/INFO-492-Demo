// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

type Role = 'ANALYST' | 'OPERATOR' | 'ADMIN';

const secret = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'your-secret-key-change-this'
);

async function getSession(req: NextRequest): Promise<{ role?: Role } | null> {
  const token = req.cookies.get('auth')?.value; // cookie set by verify-code
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as any; // { sub, email, phone, role }
  } catch {
    return null;
  }
}

function routeFor(role?: Role): string | null {
  if (role === 'ADMIN') return '/dashboard/admin';
  if (role === 'OPERATOR') return '/dashboard/operator';
  if (role === 'ANALYST') return '/dashboard/analyst';
  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1) Always send "/" to /login
  if (pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // 2) Compute effectiveRole (JWT role, overridden by devRole in dev ONLY if ENABLE_DEV_BYPASS is set)
  const session = await getSession(request);
  let effectiveRole: Role | undefined = session?.role;
  const devRole = request.cookies.get('devRole')?.value as Role | undefined;

  if (
    process.env.NODE_ENV !== 'production' &&
    process.env.ENABLE_DEV_BYPASS === 'true' &&
    (devRole === 'ADMIN' || devRole === 'OPERATOR' || devRole === 'ANALYST')
  ) {
    effectiveRole = devRole;
  }

  const target = routeFor(effectiveRole);

  // 3) Do NOT redirect /login even if a session exists — always show login screen first
  if (pathname === '/login') {
    return NextResponse.next();
  }

  // 4) Protect /dashboard subtree
  if (pathname.startsWith('/dashboard')) {
    // must have a valid session AND a resolvable target route
    if (!session) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
    
    if (!target) {
      // Session exists but no valid role - shouldn't happen, but fail safe
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    // /dashboard root → redirect all users to their role-specific page
    if (pathname === '/dashboard' || pathname === '/dashboard/') {
      const url = request.nextUrl.clone();
      url.pathname = target;
      return NextResponse.redirect(url);
    }

    // Admin area: allowed for ADMIN only
    if (pathname.startsWith('/dashboard/admin')) {
      if (effectiveRole !== 'ADMIN') {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        url.searchParams.set('redirect', pathname);
        return NextResponse.redirect(url);
      }
      return NextResponse.next();
    }

    // Analyst area: allowed for ANALYST & ADMIN; block OPERATOR
    if (pathname.startsWith('/dashboard/analyst')) {
      if (effectiveRole === 'OPERATOR') {
        const url = request.nextUrl.clone();
        url.pathname = '/dashboard/operator';
        return NextResponse.redirect(url);
      }
      return NextResponse.next();
    }

    // Operator area: allowed for OPERATOR & ADMIN; block ANALYST
    if (pathname.startsWith('/dashboard/operator')) {
      if (!(effectiveRole === 'OPERATOR' || effectiveRole === 'ADMIN')) {
        const url = request.nextUrl.clone();
        url.pathname = '/dashboard/analyst';
        return NextResponse.redirect(url);
      }
      return NextResponse.next();
    }
  }

  // 5) Protect API (except auth endpoints and health check)
  if (pathname.startsWith('/api/')) {
    if (pathname.startsWith('/api/auth/')) return NextResponse.next();
    if (pathname === '/api/health') return NextResponse.next();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/login', '/dashboard/:path*', '/api/:path*'],
};