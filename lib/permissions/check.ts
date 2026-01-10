/**
 * Permission Checking Utilities
 * 
 * Provides functions to check user permissions based on their role
 * and account context.
 */

import { 
  Permission, 
  Role, 
  getPermissionsForRole,
  roleHasPermission,
  isValidRole 
} from './definitions';

export type User = {
  id: string;
  email?: string | null;
};

export type AccountMembership = {
  account_id: string;
  role: string;
};

/**
 * Check if a user has a specific permission
 * 
 * @param user - User object
 * @param permission - Permission to check
 * @param role - User's role in the current account context
 * @returns true if user has permission, false otherwise
 */
export function hasPermission(
  user: User | null,
  permission: Permission,
  role?: string | null
): boolean {
  if (!user || !role) {
    return false;
  }
  
  if (!isValidRole(role)) {
    return false;
  }
  
  return roleHasPermission(role, permission);
}

/**
 * Check if a user has multiple permissions
 */
export function hasPermissions(
  user: User | null,
  permissions: Permission[],
  role?: string | null
): boolean {
  return permissions.every(permission => hasPermission(user, permission, role));
}

/**
 * Check if a user has at least one of the specified permissions
 */
export function hasAnyPermission(
  user: User | null,
  permissions: Permission[],
  role?: string | null
): boolean {
  return permissions.some(permission => hasPermission(user, permission, role));
}

/**
 * Get all permissions for a user based on their role
 */
export function getUserPermissions(role?: string | null): Permission[] {
  if (!role || !isValidRole(role)) {
    return [];
  }
  
  return getPermissionsForRole(role);
}

/**
 * Check if user has access to an account
 * 
 * @param user - User object
 * @param accountId - Account ID to check access for
 * @param memberships - User's account memberships
 * @returns true if user has access, false otherwise
 */
export function checkAccountAccess(
  user: User | null,
  accountId: string,
  memberships?: AccountMembership[]
): boolean {
  if (!user || !accountId || !memberships) {
    return false;
  }
  
  return memberships.some(m => m.account_id === accountId);
}

/**
 * Get user's role for a specific account
 */
export function getAccountRole(
  accountId: string,
  memberships?: AccountMembership[]
): string | null {
  if (!accountId || !memberships) {
    return null;
  }
  
  const membership = memberships.find(m => m.account_id === accountId);
  return membership?.role || null;
}

/**
 * Check if user can perform an action on a resource
 * 
 * Note: This is a basic implementation. For production use with resource-level
 * access control, you should:
 * 1. Fetch the user's memberships from the database
 * 2. Verify the account_id matches one of their memberships
 * 3. Check the role for that specific account
 * 
 * @param user - User object
 * @param permission - Required permission
 * @param resource - Resource being accessed (with account context)
 * @param role - User's role
 * @returns true if action is allowed, false otherwise
 */
export function canPerformAction(
  user: User | null,
  permission: Permission,
  resource?: { account_id?: string },
  role?: string | null
): boolean {
  if (!user) {
    return false;
  }
  
  // Check basic permission
  if (!hasPermission(user, permission, role)) {
    return false;
  }
  
  // Resource-level access control would be implemented here
  // For now, if they have the permission, they can perform the action
  // In production, you'd verify the user has access to resource.account_id
  if (resource?.account_id) {
    // Placeholder: In real implementation, verify account membership
    return true;
  }
  
  return true;
}
