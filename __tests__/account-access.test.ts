import { describe, it, expect } from 'vitest';
import {
  checkAccountAccess,
  getAccountRole,
  hasPermission,
} from '../lib/permissions/check';
import { PERMISSIONS } from '../lib/permissions/definitions';

describe('Account Access Control', () => {
  const user1 = { id: 'user1', email: 'user1@test.com' };
  const user2 = { id: 'user2', email: 'user2@test.com' };
  const user3 = { id: 'user3', email: 'user3@test.com' };

  it('should allow user to access their own account', () => {
    const memberships = [
      { account_id: 'acc1', role: 'owner' },
    ];

    expect(checkAccountAccess(user1, 'acc1', memberships)).toBe(true);
  });

  it('should deny user from accessing other accounts', () => {
    const memberships = [
      { account_id: 'acc1', role: 'owner' },
    ];

    expect(checkAccountAccess(user1, 'acc2', memberships)).toBe(false);
  });

  it('should deny null user from accessing accounts', () => {
    const memberships = [
      { account_id: 'acc1', role: 'owner' },
    ];

    expect(checkAccountAccess(null, 'acc1', memberships)).toBe(false);
  });

  it('should deny access without memberships', () => {
    expect(checkAccountAccess(user1, 'acc1', undefined)).toBe(false);
    expect(checkAccountAccess(user1, 'acc1', [])).toBe(false);
  });
});

describe('Multi-Account Scenarios', () => {
  const user = { id: 'user1', email: 'user@test.com' };

  it('should handle user with multiple accounts', () => {
    const memberships = [
      { account_id: 'acc1', role: 'owner' },
      { account_id: 'acc2', role: 'member' },
      { account_id: 'acc3', role: 'admin' },
    ];

    expect(checkAccountAccess(user, 'acc1', memberships)).toBe(true);
    expect(checkAccountAccess(user, 'acc2', memberships)).toBe(true);
    expect(checkAccountAccess(user, 'acc3', memberships)).toBe(true);
    expect(checkAccountAccess(user, 'acc4', memberships)).toBe(false);
  });

  it('should get correct role for each account', () => {
    const memberships = [
      { account_id: 'acc1', role: 'owner' },
      { account_id: 'acc2', role: 'member' },
      { account_id: 'acc3', role: 'admin' },
    ];

    expect(getAccountRole('acc1', memberships)).toBe('owner');
    expect(getAccountRole('acc2', memberships)).toBe('member');
    expect(getAccountRole('acc3', memberships)).toBe('admin');
    expect(getAccountRole('acc4', memberships)).toBe(null);
  });

  it('should handle different permissions per account', () => {
    const memberships = [
      { account_id: 'acc1', role: 'owner' },
      { account_id: 'acc2', role: 'member' },
    ];

    const acc1Role = getAccountRole('acc1', memberships);
    const acc2Role = getAccountRole('acc2', memberships);

    expect(hasPermission(user, PERMISSIONS.MANAGE_BILLING, acc1Role)).toBe(true);
    expect(hasPermission(user, PERMISSIONS.MANAGE_BILLING, acc2Role)).toBe(false);
  });
});

describe('Account Switching', () => {
  const user = { id: 'user1', email: 'user@test.com' };

  it('should allow switching between owned accounts', () => {
    const memberships = [
      { account_id: 'acc1', role: 'owner' },
      { account_id: 'acc2', role: 'owner' },
    ];

    expect(checkAccountAccess(user, 'acc1', memberships)).toBe(true);
    expect(checkAccountAccess(user, 'acc2', memberships)).toBe(true);
  });

  it('should maintain role context when switching', () => {
    const memberships = [
      { account_id: 'acc1', role: 'owner' },
      { account_id: 'acc2', role: 'viewer' },
    ];

    const role1 = getAccountRole('acc1', memberships);
    const role2 = getAccountRole('acc2', memberships);

    expect(hasPermission(user, PERMISSIONS.WRITE_REPORTS, role1)).toBe(true);
    expect(hasPermission(user, PERMISSIONS.WRITE_REPORTS, role2)).toBe(false);
  });

  it('should handle switching to non-existent account', () => {
    const memberships = [
      { account_id: 'acc1', role: 'owner' },
    ];

    expect(checkAccountAccess(user, 'nonexistent', memberships)).toBe(false);
    expect(getAccountRole('nonexistent', memberships)).toBe(null);
  });
});

describe('Role-Based Operations Within Accounts', () => {
  const user = { id: 'user1', email: 'user@test.com' };

  it('should allow owner to manage team', () => {
    const memberships = [{ account_id: 'acc1', role: 'owner' }];
    const role = getAccountRole('acc1', memberships);

    expect(hasPermission(user, PERMISSIONS.MANAGE_TEAM, role)).toBe(true);
    expect(hasPermission(user, PERMISSIONS.INVITE_MEMBERS, role)).toBe(true);
    expect(hasPermission(user, PERMISSIONS.REMOVE_MEMBERS, role)).toBe(true);
  });

  it('should allow admin to manage team but not billing', () => {
    const memberships = [{ account_id: 'acc1', role: 'admin' }];
    const role = getAccountRole('acc1', memberships);

    expect(hasPermission(user, PERMISSIONS.MANAGE_TEAM, role)).toBe(true);
    expect(hasPermission(user, PERMISSIONS.MANAGE_BILLING, role)).toBe(false);
  });

  it('should allow member to read and write', () => {
    const memberships = [{ account_id: 'acc1', role: 'member' }];
    const role = getAccountRole('acc1', memberships);

    expect(hasPermission(user, PERMISSIONS.READ_REPORTS, role)).toBe(true);
    expect(hasPermission(user, PERMISSIONS.WRITE_REPORTS, role)).toBe(true);
    expect(hasPermission(user, PERMISSIONS.DELETE_REPORTS, role)).toBe(false);
  });

  it('should allow viewer to only read', () => {
    const memberships = [{ account_id: 'acc1', role: 'viewer' }];
    const role = getAccountRole('acc1', memberships);

    expect(hasPermission(user, PERMISSIONS.READ_REPORTS, role)).toBe(true);
    expect(hasPermission(user, PERMISSIONS.WRITE_REPORTS, role)).toBe(false);
  });
});

describe('Cross-Account Operations', () => {
  const user1 = { id: 'user1', email: 'user1@test.com' };
  const user2 = { id: 'user2', email: 'user2@test.com' };

  it('should prevent user from accessing another users account', () => {
    const user1Memberships = [{ account_id: 'acc1', role: 'owner' }];
    const user2Memberships = [{ account_id: 'acc2', role: 'owner' }];

    expect(checkAccountAccess(user1, 'acc1', user1Memberships)).toBe(true);
    expect(checkAccountAccess(user1, 'acc2', user1Memberships)).toBe(false);

    expect(checkAccountAccess(user2, 'acc2', user2Memberships)).toBe(true);
    expect(checkAccountAccess(user2, 'acc1', user2Memberships)).toBe(false);
  });

  it('should handle shared account access', () => {
    const sharedAccountId = 'shared-acc';
    
    const user1Memberships = [
      { account_id: sharedAccountId, role: 'owner' },
      { account_id: 'acc1', role: 'owner' },
    ];

    const user2Memberships = [
      { account_id: sharedAccountId, role: 'member' },
      { account_id: 'acc2', role: 'owner' },
    ];

    expect(checkAccountAccess(user1, sharedAccountId, user1Memberships)).toBe(true);
    expect(checkAccountAccess(user2, sharedAccountId, user2Memberships)).toBe(true);

    const user1Role = getAccountRole(sharedAccountId, user1Memberships);
    const user2Role = getAccountRole(sharedAccountId, user2Memberships);

    expect(hasPermission(user1, PERMISSIONS.MANAGE_TEAM, user1Role)).toBe(true);
    expect(hasPermission(user2, PERMISSIONS.MANAGE_TEAM, user2Role)).toBe(false);
  });
});

describe('Account Access Edge Cases', () => {
  const user = { id: 'user1', email: 'user@test.com' };

  it('should handle empty account ID', () => {
    const memberships = [{ account_id: 'acc1', role: 'owner' }];

    expect(checkAccountAccess(user, '', memberships)).toBe(false);
  });

  it('should handle duplicate memberships', () => {
    const memberships = [
      { account_id: 'acc1', role: 'owner' },
      { account_id: 'acc1', role: 'member' }, // Duplicate (shouldn't happen in reality)
    ];

    expect(checkAccountAccess(user, 'acc1', memberships)).toBe(true);
    // Should return first matching role
    expect(getAccountRole('acc1', memberships)).toBe('owner');
  });

  it('should handle case sensitivity', () => {
    const memberships = [{ account_id: 'acc1', role: 'owner' }];

    // Account IDs should be case-sensitive
    expect(checkAccountAccess(user, 'acc1', memberships)).toBe(true);
    expect(checkAccountAccess(user, 'ACC1', memberships)).toBe(false);
  });
});

describe('Account Role Changes', () => {
  const user = { id: 'user1', email: 'user@test.com' };

  it('should reflect role change', () => {
    // Before: member
    const membershipsBefore = [{ account_id: 'acc1', role: 'member' }];
    const roleBefore = getAccountRole('acc1', membershipsBefore);
    
    expect(hasPermission(user, PERMISSIONS.DELETE_REPORTS, roleBefore)).toBe(false);

    // After: owner
    const membershipsAfter = [{ account_id: 'acc1', role: 'owner' }];
    const roleAfter = getAccountRole('acc1', membershipsAfter);
    
    expect(hasPermission(user, PERMISSIONS.DELETE_REPORTS, roleAfter)).toBe(true);
  });

  it('should handle role downgrade', () => {
    // Before: owner
    const membershipsBefore = [{ account_id: 'acc1', role: 'owner' }];
    const roleBefore = getAccountRole('acc1', membershipsBefore);
    
    expect(hasPermission(user, PERMISSIONS.MANAGE_BILLING, roleBefore)).toBe(true);

    // After: viewer
    const membershipsAfter = [{ account_id: 'acc1', role: 'viewer' }];
    const roleAfter = getAccountRole('acc1', membershipsAfter);
    
    expect(hasPermission(user, PERMISSIONS.MANAGE_BILLING, roleAfter)).toBe(false);
    expect(hasPermission(user, PERMISSIONS.READ_REPORTS, roleAfter)).toBe(true);
  });
});

describe('Account Removal', () => {
  const user = { id: 'user1', email: 'user@test.com' };

  it('should lose access when removed from account', () => {
    // Before: has access
    const membershipsBefore = [
      { account_id: 'acc1', role: 'member' },
      { account_id: 'acc2', role: 'owner' },
    ];

    expect(checkAccountAccess(user, 'acc1', membershipsBefore)).toBe(true);

    // After: removed from acc1
    const membershipsAfter = [
      { account_id: 'acc2', role: 'owner' },
    ];

    expect(checkAccountAccess(user, 'acc1', membershipsAfter)).toBe(false);
    expect(checkAccountAccess(user, 'acc2', membershipsAfter)).toBe(true);
  });

  it('should handle complete account removal', () => {
    const memberships = [];

    expect(checkAccountAccess(user, 'acc1', memberships)).toBe(false);
    expect(getAccountRole('acc1', memberships)).toBe(null);
  });
});

describe('Multiple Users Same Account', () => {
  const owner = { id: 'owner1', email: 'owner@test.com' };
  const member = { id: 'member1', email: 'member@test.com' };
  const viewer = { id: 'viewer1', email: 'viewer@test.com' };

  const accountId = 'shared-account';

  it('should allow different permissions based on role', () => {
    const ownerMemberships = [{ account_id: accountId, role: 'owner' }];
    const memberMemberships = [{ account_id: accountId, role: 'member' }];
    const viewerMemberships = [{ account_id: accountId, role: 'viewer' }];

    const ownerRole = getAccountRole(accountId, ownerMemberships);
    const memberRole = getAccountRole(accountId, memberMemberships);
    const viewerRole = getAccountRole(accountId, viewerMemberships);

    // Owner can do everything
    expect(hasPermission(owner, PERMISSIONS.MANAGE_BILLING, ownerRole)).toBe(true);
    expect(hasPermission(owner, PERMISSIONS.DELETE_REPORTS, ownerRole)).toBe(true);

    // Member can write but not manage
    expect(hasPermission(member, PERMISSIONS.WRITE_REPORTS, memberRole)).toBe(true);
    expect(hasPermission(member, PERMISSIONS.MANAGE_TEAM, memberRole)).toBe(false);

    // Viewer can only read
    expect(hasPermission(viewer, PERMISSIONS.READ_REPORTS, viewerRole)).toBe(true);
    expect(hasPermission(viewer, PERMISSIONS.WRITE_REPORTS, viewerRole)).toBe(false);
  });
});
