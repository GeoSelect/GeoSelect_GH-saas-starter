import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { signToken, verifyToken } from '@/lib/auth/session';
import { isMaintenanceMode, getRateLimitConfig, getRateLimiter, isRequestLoggingEnabled } from '@/lib/operations/flags';

const protectedRoutes = '/dashboard';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Log request if enabled
  if (isRequestLoggingEnabled()) {
    console.log(`[${new Date().toISOString()}] ${request.method} ${pathname}`);
  }
  
  // Check maintenance mode (bypass for health checks)
  if (isMaintenanceMode() && pathname !== '/api/health') {
    return NextResponse.json(
      { 
        ok: false, 
        error: 'Service temporarily unavailable for maintenance',
        maintenance_mode: true 
      },
      { status: 503 }
    );
  }
  
  // Apply rate limiting
  const rateLimitConfig = getRateLimitConfig();
  if (rateLimitConfig.enabled) {
    // Extract IP, handling x-forwarded-for with multiple IPs (use first/original client IP)
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = forwardedFor 
      ? forwardedFor.split(',')[0].trim() 
      : request.ip || 'unknown';
    
    const rateLimiter = getRateLimiter();
    
    if (!rateLimiter.isAllowed(ip, rateLimitConfig.requestsPerMinute, rateLimitConfig.windowMs)) {
      return NextResponse.json(
        { ok: false, error: 'Rate limit exceeded', retry_after: 60 },
        { status: 429 }
      );
    }
  }
  
  const sessionCookie = request.cookies.get('session');
  const isProtectedRoute = pathname.startsWith(protectedRoutes);

  if (isProtectedRoute && !sessionCookie) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  let res = NextResponse.next();

  if (sessionCookie && request.method === 'GET') {
    try {
      const parsed = await verifyToken(sessionCookie.value);
      const expiresInOneDay = new Date(Date.now() + 24 * 60 * 60 * 1000);

      res.cookies.set({
        name: 'session',
        value: await signToken({
          ...parsed,
          expires: expiresInOneDay.toISOString()
        }),
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        expires: expiresInOneDay
      });
    } catch (error) {
      console.error('Error updating session:', error);
      res.cookies.delete('session');
      if (isProtectedRoute) {
        return NextResponse.redirect(new URL('/sign-in', request.url));
      }
    }
  }

  return res;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
  runtime: 'nodejs'
};
