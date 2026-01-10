/**
 * Permission Guards
 * 
 * Middleware and guard functions for protecting routes and actions
 * based on permissions.
 */

import { NextResponse } from 'next/server';
import { Permission } from './definitions';
import { hasPermission } from './check';

export type User = {
  id: string;
  email?: string | null;
};

/**
 * Create a permission guard for API routes
 * 
 * Usage:
 * ```typescript
 * export async function POST(req: Request) {
 *   const guard = requirePermission('WRITE_REPORTS');
 *   const result = await guard(req, user, role);
 *   if (result) return result; // Permission denied response
 *   
 *   // Continue with handler
 * }
 * ```
 */
export function requirePermission(permission: Permission) {
  return async (
    req: Request,
    user: User | null,
    role?: string | null
  ): Promise<NextResponse | null> => {
    if (!user) {
      return NextResponse.json(
        { ok: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    if (!hasPermission(user, permission, role)) {
      return NextResponse.json(
        { ok: false, error: 'Permission denied', required: permission },
        { status: 403 }
      );
    }
    
    return null; // Permission granted
  };
}

/**
 * Create a guard that requires multiple permissions
 */
export function requirePermissions(permissions: Permission[]) {
  return async (
    req: Request,
    user: User | null,
    role?: string | null
  ): Promise<NextResponse | null> => {
    if (!user) {
      return NextResponse.json(
        { ok: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    for (const permission of permissions) {
      if (!hasPermission(user, permission, role)) {
        return NextResponse.json(
          { ok: false, error: 'Permission denied', required: permission },
          { status: 403 }
        );
      }
    }
    
    return null; // All permissions granted
  };
}

/**
 * Create a guard that requires at least one of the specified permissions
 */
export function requireAnyPermission(permissions: Permission[]) {
  return async (
    req: Request,
    user: User | null,
    role?: string | null
  ): Promise<NextResponse | null> => {
    if (!user) {
      return NextResponse.json(
        { ok: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const hasAny = permissions.some(permission => 
      hasPermission(user, permission, role)
    );
    
    if (!hasAny) {
      return NextResponse.json(
        { 
          ok: false, 
          error: 'Permission denied', 
          required: 'one of: ' + permissions.join(', ') 
        },
        { status: 403 }
      );
    }
    
    return null; // At least one permission granted
  };
}

/**
 * Check if account access is allowed
 */
export function requireAccountAccess(accountId: string) {
  return async (
    req: Request,
    user: User | null,
    userAccountId?: string | null
  ): Promise<NextResponse | null> => {
    if (!user) {
      return NextResponse.json(
        { ok: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    if (!userAccountId || userAccountId !== accountId) {
      return NextResponse.json(
        { ok: false, error: 'Account access denied' },
        { status: 403 }
      );
    }
    
    return null; // Access granted
  };
}

/**
 * Server action permission check wrapper
 * Use this in server actions to verify permissions
 */
export async function checkPermissionForAction(
  user: User | null,
  permission: Permission,
  role?: string | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!user) {
    return { ok: false, error: 'Authentication required' };
  }
  
  if (!hasPermission(user, permission, role)) {
    return { ok: false, error: `Permission denied: ${permission}` };
  }
  
  return { ok: true };
}
