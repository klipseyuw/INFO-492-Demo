import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Routes that require authentication
const protectedRoutes = ['/dashboard'];

// API routes that require authentication (except auth endpoints)
const protectedApiRoutes = [
  '/api/agent',
  '/api/shipments',
  '/api/alerts',
  '/api/ai',
  '/api/analysis-report',
  '/api/schedule-predict',
  '/api/simulate-attack'
];

// Public routes that don't require authentication
const publicRoutes = ['/login', '/'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if route requires authentication
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isProtectedApi = protectedApiRoutes.some(route => pathname.startsWith(route));
  const isPublicRoute = publicRoutes.includes(pathname);

  // Allow public routes and auth API routes
  if (isPublicRoute || pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  // Check for auth token
  const token = request.cookies.get('auth_token')?.value;

  if (!token && (isProtectedRoute || isProtectedApi)) {
    // Redirect to login if accessing protected route without token
    if (isProtectedRoute) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Return 401 for API routes
    if (isProtectedApi) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
  }

  // Verify token for protected routes
  if (token && (isProtectedRoute || isProtectedApi)) {
    try {
      const secret = new TextEncoder().encode(
        process.env.NEXTAUTH_SECRET || 'your-secret-key-change-this'
      );

      await jwtVerify(token, secret);

      // Token is valid, allow request to proceed
      return NextResponse.next();

    } catch (error) {
      console.error('JWT verification failed:', error);

      // Clear invalid token
      const response = isProtectedRoute
        ? NextResponse.redirect(new URL('/login', request.url))
        : NextResponse.json(
            { success: false, error: 'Invalid or expired token' },
            { status: 401 }
          );

      response.cookies.set('auth_token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/'
      });

      return response;
    }
  }

  return NextResponse.next();
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.svg|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.webp).*)',
  ],
};

