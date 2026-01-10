import { describe, it, expect } from 'vitest';
import {
  PERMISSIONS,
  ROLES,
  getPermissionsForRole,
  roleHasPermission,
  getAllRoles,
  getAllPermissions,
  isValidRole,
  roleHasAtLeastAccess,
} from '../lib/permissions/definitions';
import {
  hasPermission,
  hasPermissions,
  hasAnyPermission,
  getUserPermissions,
  checkAccountAccess,
  getAccountRole,
  canPerformAction,
} from '../lib/permissions/check';

describe('Permission Definitions', () => {
  it('should have defined all standard roles', () => {
    expect(ROLES.OWNER).toBe('owner');
    expect(ROLES.ADMIN).toBe('admin');
    expect(ROLES.MEMBER).toBe('member');
    expect(ROLES.VIEWER).toBe('viewer');
  });

  it('should get permissions for owner role', () => {
    const permissions = getPermissionsForRole(ROLES.OWNER);
    expect(permissions).toContain(PERMISSIONS.READ_REPORTS);
    expect(permissions).toContain(PERMISSIONS.WRITE_REPORTS);
    expect(permissions).toContain(PERMISSIONS.DELETE_REPORTS);
    expect(permissions).toContain(PERMISSIONS.MANAGE_TEAM);
    expect(permissions).toContain(PERMISSIONS.MANAGE_BILLING);
    expect(permissions.length).toBeGreaterThan(15);
  });

  it('should get permissions for admin role', () => {
    const permissions = getPermissionsForRole(ROLES.ADMIN);
    expect(permissions).toContain(PERMISSIONS.READ_REPORTS);
    expect(permissions).toContain(PERMISSIONS.WRITE_REPORTS);
    expect(permissions).toContain(PERMISSIONS.MANAGE_TEAM);
    expect(permissions).not.toContain(PERMISSIONS.MANAGE_BILLING);
    expect(permissions).not.toContain(PERMISSIONS.MANAGE_SUBSCRIPTION);
  });

  it('should get permissions for member role', () => {
    const permissions = getPermissionsForRole(ROLES.MEMBER);
    expect(permissions).toContain(PERMISSIONS.READ_REPORTS);
    expect(permissions).toContain(PERMISSIONS.WRITE_REPORTS);
    expect(permissions).not.toContain(PERMISSIONS.DELETE_REPORTS);
    expect(permissions).not.toContain(PERMISSIONS.MANAGE_TEAM);
  });

  it('should get permissions for viewer role', () => {
    const permissions = getPermissionsForRole(ROLES.VIEWER);
    expect(permissions).toContain(PERMISSIONS.READ_REPORTS);
    expect(permissions).not.toContain(PERMISSIONS.WRITE_REPORTS);
    expect(permissions).not.toContain(PERMISSIONS.DELETE_REPORTS);
    expect(permissions.length).toBe(3);
  });

  it('should check if role has specific permission', () => {
    expect(roleHasPermission(ROLES.OWNER, PERMISSIONS.MANAGE_BILLING)).toBe(true);
    expect(roleHasPermission(ROLES.ADMIN, PERMISSIONS.MANAGE_BILLING)).toBe(false);
    expect(roleHasPermission(ROLES.MEMBER, PERMISSIONS.WRITE_REPORTS)).toBe(true);
    expect(roleHasPermission(ROLES.VIEWER, PERMISSIONS.WRITE_REPORTS)).toBe(false);
  });

  it('should validate role names', () => {
    expect(isValidRole('owner')).toBe(true);
    expect(isValidRole('admin')).toBe(true);
    expect(isValidRole('invalid')).toBe(false);
    expect(isValidRole('')).toBe(false);
  });

  it('should check role hierarchy', () => {
    expect(roleHasAtLeastAccess(ROLES.OWNER, ROLES.ADMIN)).toBe(true);
    expect(roleHasAtLeastAccess(ROLES.OWNER, ROLES.MEMBER)).toBe(true);
    expect(roleHasAtLeastAccess(ROLES.ADMIN, ROLES.MEMBER)).toBe(true);
    expect(roleHasAtLeastAccess(ROLES.MEMBER, ROLES.OWNER)).toBe(false);
    expect(roleHasAtLeastAccess(ROLES.VIEWER, ROLES.MEMBER)).toBe(false);
  });

  it('should return all roles', () => {
    const roles = getAllRoles();
    expect(roles).toContain('owner');
    expect(roles).toContain('admin');
    expect(roles).toContain('member');
    expect(roles).toContain('viewer');
    expect(roles.length).toBe(4);
  });

  it('should return all permissions', () => {
    const permissions = getAllPermissions();
    expect(permissions.length).toBeGreaterThan(20);
    expect(permissions).toContain(PERMISSIONS.READ_REPORTS);
    expect(permissions).toContain(PERMISSIONS.MANAGE_TEAM);
  });
});

describe('Permission Checking', () => {
  const ownerUser = { id: 'user1', email: 'owner@test.com' };
  const memberUser = { id: 'user2', email: 'member@test.com' };
  const viewerUser = { id: 'user3', email: 'viewer@test.com' };

  it('should check if user has permission', () => {
    expect(hasPermission(ownerUser, PERMISSIONS.MANAGE_BILLING, ROLES.OWNER)).toBe(true);
    expect(hasPermission(memberUser, PERMISSIONS.WRITE_REPORTS, ROLES.MEMBER)).toBe(true);
    expect(hasPermission(viewerUser, PERMISSIONS.WRITE_REPORTS, ROLES.VIEWER)).toBe(false);
  });

  it('should return false for null user', () => {
    expect(hasPermission(null, PERMISSIONS.READ_REPORTS, ROLES.OWNER)).toBe(false);
  });

  it('should return false for invalid role', () => {
    expect(hasPermission(ownerUser, PERMISSIONS.READ_REPORTS, 'invalid')).toBe(false);
    expect(hasPermission(ownerUser, PERMISSIONS.READ_REPORTS, null)).toBe(false);
  });

  it('should check multiple permissions', () => {
    expect(
      hasPermissions(
        ownerUser,
        [PERMISSIONS.READ_REPORTS, PERMISSIONS.WRITE_REPORTS, PERMISSIONS.DELETE_REPORTS],
        ROLES.OWNER
      )
    ).toBe(true);

    expect(
      hasPermissions(
        memberUser,
        [PERMISSIONS.READ_REPORTS, PERMISSIONS.WRITE_REPORTS, PERMISSIONS.DELETE_REPORTS],
        ROLES.MEMBER
      )
    ).toBe(false);
  });

  it('should check if user has any of the permissions', () => {
    expect(
      hasAnyPermission(
        viewerUser,
        [PERMISSIONS.READ_REPORTS, PERMISSIONS.WRITE_REPORTS],
        ROLES.VIEWER
      )
    ).toBe(true);

    expect(
      hasAnyPermission(
        viewerUser,
        [PERMISSIONS.WRITE_REPORTS, PERMISSIONS.DELETE_REPORTS],
        ROLES.VIEWER
      )
    ).toBe(false);
  });

  it('should get all user permissions', () => {
    const ownerPerms = getUserPermissions(ROLES.OWNER);
    expect(ownerPerms.length).toBeGreaterThan(15);

    const viewerPerms = getUserPermissions(ROLES.VIEWER);
    expect(viewerPerms.length).toBe(3);

    const invalidPerms = getUserPermissions('invalid');
    expect(invalidPerms.length).toBe(0);
  });

  it('should check account access', () => {
    const memberships = [
      { account_id: 'acc1', role: 'owner' },
      { account_id: 'acc2', role: 'member' },
    ];

    expect(checkAccountAccess(ownerUser, 'acc1', memberships)).toBe(true);
    expect(checkAccountAccess(ownerUser, 'acc2', memberships)).toBe(true);
    expect(checkAccountAccess(ownerUser, 'acc3', memberships)).toBe(false);
    expect(checkAccountAccess(null, 'acc1', memberships)).toBe(false);
  });

  it('should get account role', () => {
    const memberships = [
      { account_id: 'acc1', role: 'owner' },
      { account_id: 'acc2', role: 'member' },
    ];

    expect(getAccountRole('acc1', memberships)).toBe('owner');
    expect(getAccountRole('acc2', memberships)).toBe('member');
    expect(getAccountRole('acc3', memberships)).toBe(null);
  });

  it('should check if user can perform action', () => {
    expect(
      canPerformAction(ownerUser, PERMISSIONS.DELETE_REPORTS, undefined, ROLES.OWNER)
    ).toBe(true);

    expect(
      canPerformAction(memberUser, PERMISSIONS.DELETE_REPORTS, undefined, ROLES.MEMBER)
    ).toBe(false);

    expect(
      canPerformAction(null, PERMISSIONS.READ_REPORTS, undefined, ROLES.OWNER)
    ).toBe(false);
  });

  it('should check action with resource context', () => {
    const resource = { account_id: 'acc1' };
    expect(
      canPerformAction(ownerUser, PERMISSIONS.WRITE_REPORTS, resource, ROLES.OWNER)
    ).toBe(true);
  });
});

describe('Permission Inheritance', () => {
  it('should ensure owner has all admin permissions', () => {
    const ownerPerms = getPermissionsForRole(ROLES.OWNER);
    const adminPerms = getPermissionsForRole(ROLES.ADMIN);

    adminPerms.forEach(perm => {
      expect(ownerPerms).toContain(perm);
    });
  });

  it('should ensure admin has all member permissions', () => {
    const adminPerms = getPermissionsForRole(ROLES.ADMIN);
    const memberPerms = getPermissionsForRole(ROLES.MEMBER);

    memberPerms.forEach(perm => {
      expect(adminPerms).toContain(perm);
    });
  });

  it('should ensure member has all viewer permissions', () => {
    const memberPerms = getPermissionsForRole(ROLES.MEMBER);
    const viewerPerms = getPermissionsForRole(ROLES.VIEWER);

    viewerPerms.forEach(perm => {
      expect(memberPerms).toContain(perm);
    });
  });
});

describe('Permission Denial', () => {
  const user = { id: 'user1', email: 'test@test.com' };

  it('should deny viewer from writing', () => {
    expect(hasPermission(user, PERMISSIONS.WRITE_REPORTS, ROLES.VIEWER)).toBe(false);
  });

  it('should deny member from managing team', () => {
    expect(hasPermission(user, PERMISSIONS.MANAGE_TEAM, ROLES.MEMBER)).toBe(false);
  });

  it('should deny admin from managing billing', () => {
    expect(hasPermission(user, PERMISSIONS.MANAGE_BILLING, ROLES.ADMIN)).toBe(false);
  });

  it('should deny everyone without authentication', () => {
    expect(hasPermission(null, PERMISSIONS.READ_REPORTS, ROLES.OWNER)).toBe(false);
  });
});
