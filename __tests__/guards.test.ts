import { describe, it, expect } from 'vitest';
import {
  requirePermission,
  requirePermissions,
  requireAnyPermission,
  requireAccountAccess,
  checkPermissionForAction,
} from '../lib/permissions/guards';
import { PERMISSIONS } from '../lib/permissions/definitions';

describe('Permission Guards - Single Permission', () => {
  const user = { id: 'user1', email: 'test@test.com' };

  it('should allow request with valid permission', async () => {
    const guard = requirePermission(PERMISSIONS.READ_REPORTS);
    const mockReq = new Request('http://localhost/test');
    
    const result = await guard(mockReq, user, 'owner');
    expect(result).toBeNull(); // null means permission granted
  });

  it('should deny request without permission', async () => {
    const guard = requirePermission(PERMISSIONS.MANAGE_BILLING);
    const mockReq = new Request('http://localhost/test');
    
    const result = await guard(mockReq, user, 'member');
    expect(result).not.toBeNull();
    
    if (result) {
      const json = await result.json();
      expect(json.ok).toBe(false);
      expect(json.error).toContain('Permission denied');
      expect(result.status).toBe(403);
    }
  });

  it('should deny request without user', async () => {
    const guard = requirePermission(PERMISSIONS.READ_REPORTS);
    const mockReq = new Request('http://localhost/test');
    
    const result = await guard(mockReq, null, 'owner');
    expect(result).not.toBeNull();
    
    if (result) {
      const json = await result.json();
      expect(json.ok).toBe(false);
      expect(json.error).toContain('Authentication required');
      expect(result.status).toBe(401);
    }
  });
});

describe('Permission Guards - Multiple Permissions', () => {
  const user = { id: 'user1', email: 'test@test.com' };

  it('should allow request with all permissions', async () => {
    const guard = requirePermissions([
      PERMISSIONS.READ_REPORTS,
      PERMISSIONS.WRITE_REPORTS,
    ]);
    const mockReq = new Request('http://localhost/test');
    
    const result = await guard(mockReq, user, 'owner');
    expect(result).toBeNull();
  });

  it('should deny request missing one permission', async () => {
    const guard = requirePermissions([
      PERMISSIONS.READ_REPORTS,
      PERMISSIONS.WRITE_REPORTS,
      PERMISSIONS.DELETE_REPORTS,
    ]);
    const mockReq = new Request('http://localhost/test');
    
    const result = await guard(mockReq, user, 'member');
    expect(result).not.toBeNull();
    
    if (result) {
      const json = await result.json();
      expect(json.ok).toBe(false);
      expect(result.status).toBe(403);
    }
  });
});

describe('Permission Guards - Any Permission', () => {
  const user = { id: 'user1', email: 'test@test.com' };

  it('should allow request with at least one permission', async () => {
    const guard = requireAnyPermission([
      PERMISSIONS.READ_REPORTS,
      PERMISSIONS.WRITE_REPORTS,
    ]);
    const mockReq = new Request('http://localhost/test');
    
    const result = await guard(mockReq, user, 'viewer');
    expect(result).toBeNull(); // Has READ_REPORTS
  });

  it('should deny request with no matching permissions', async () => {
    const guard = requireAnyPermission([
      PERMISSIONS.MANAGE_BILLING,
      PERMISSIONS.MANAGE_SUBSCRIPTION,
    ]);
    const mockReq = new Request('http://localhost/test');
    
    const result = await guard(mockReq, user, 'member');
    expect(result).not.toBeNull();
    
    if (result) {
      const json = await result.json();
      expect(json.ok).toBe(false);
      expect(result.status).toBe(403);
    }
  });
});

describe('Account Access Guard', () => {
  const user = { id: 'user1', email: 'test@test.com' };

  it('should allow access to own account', async () => {
    const guard = requireAccountAccess('acc1');
    const mockReq = new Request('http://localhost/test');
    
    const result = await guard(mockReq, user, 'acc1');
    expect(result).toBeNull();
  });

  it('should deny access to different account', async () => {
    const guard = requireAccountAccess('acc1');
    const mockReq = new Request('http://localhost/test');
    
    const result = await guard(mockReq, user, 'acc2');
    expect(result).not.toBeNull();
    
    if (result) {
      const json = await result.json();
      expect(json.ok).toBe(false);
      expect(json.error).toContain('Account access denied');
      expect(result.status).toBe(403);
    }
  });

  it('should deny access without user', async () => {
    const guard = requireAccountAccess('acc1');
    const mockReq = new Request('http://localhost/test');
    
    const result = await guard(mockReq, null, 'acc1');
    expect(result).not.toBeNull();
    
    if (result) {
      const json = await result.json();
      expect(result.status).toBe(401);
    }
  });
});

describe('Server Action Permission Check', () => {
  const user = { id: 'user1', email: 'test@test.com' };

  it('should return ok for valid permission', async () => {
    const result = await checkPermissionForAction(user, PERMISSIONS.READ_REPORTS, 'owner');
    expect(result.ok).toBe(true);
  });

  it('should return error for missing permission', async () => {
    const result = await checkPermissionForAction(user, PERMISSIONS.MANAGE_BILLING, 'member');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Permission denied');
    }
  });

  it('should return error for null user', async () => {
    const result = await checkPermissionForAction(null, PERMISSIONS.READ_REPORTS, 'owner');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Authentication required');
    }
  });
});

describe('Guard Response Format', () => {
  const user = { id: 'user1', email: 'test@test.com' };

  it('should return properly formatted error response', async () => {
    const guard = requirePermission(PERMISSIONS.MANAGE_BILLING);
    const mockReq = new Request('http://localhost/test');
    
    const result = await guard(mockReq, user, 'member');
    expect(result).not.toBeNull();
    
    if (result) {
      const json = await result.json();
      expect(json).toHaveProperty('ok');
      expect(json).toHaveProperty('error');
      expect(json.ok).toBe(false);
      expect(typeof json.error).toBe('string');
    }
  });

  it('should include required permission in error', async () => {
    const guard = requirePermission(PERMISSIONS.DELETE_REPORTS);
    const mockReq = new Request('http://localhost/test');
    
    const result = await guard(mockReq, user, 'viewer');
    expect(result).not.toBeNull();
    
    if (result) {
      const json = await result.json();
      expect(json).toHaveProperty('required');
      expect(json.required).toBe(PERMISSIONS.DELETE_REPORTS);
    }
  });
});

describe('Guard Edge Cases', () => {
  it('should handle undefined role', async () => {
    const user = { id: 'user1', email: 'test@test.com' };
    const guard = requirePermission(PERMISSIONS.READ_REPORTS);
    const mockReq = new Request('http://localhost/test');
    
    const result = await guard(mockReq, user, undefined);
    expect(result).not.toBeNull(); // Should deny with undefined role
  });

  it('should handle null role', async () => {
    const user = { id: 'user1', email: 'test@test.com' };
    const guard = requirePermission(PERMISSIONS.READ_REPORTS);
    const mockReq = new Request('http://localhost/test');
    
    const result = await guard(mockReq, user, null);
    expect(result).not.toBeNull(); // Should deny with null role
  });

  it('should handle invalid role', async () => {
    const user = { id: 'user1', email: 'test@test.com' };
    const guard = requirePermission(PERMISSIONS.READ_REPORTS);
    const mockReq = new Request('http://localhost/test');
    
    const result = await guard(mockReq, user, 'invalid_role');
    expect(result).not.toBeNull(); // Should deny with invalid role
  });
});

describe('Guard Composition', () => {
  const user = { id: 'user1', email: 'test@test.com' };

  it('should allow chaining permission checks', async () => {
    const mockReq = new Request('http://localhost/test');
    
    // First check
    const guard1 = requirePermission(PERMISSIONS.READ_REPORTS);
    const result1 = await guard1(mockReq, user, 'owner');
    expect(result1).toBeNull();
    
    // Second check
    const guard2 = requirePermission(PERMISSIONS.WRITE_REPORTS);
    const result2 = await guard2(mockReq, user, 'owner');
    expect(result2).toBeNull();
  });

  it('should fail on first failed check', async () => {
    const mockReq = new Request('http://localhost/test');
    
    // First check passes
    const guard1 = requirePermission(PERMISSIONS.READ_REPORTS);
    const result1 = await guard1(mockReq, user, 'viewer');
    expect(result1).toBeNull();
    
    // Second check fails
    const guard2 = requirePermission(PERMISSIONS.WRITE_REPORTS);
    const result2 = await guard2(mockReq, user, 'viewer');
    expect(result2).not.toBeNull();
  });
});

describe('Real-World Usage Scenarios', () => {
  const owner = { id: 'owner1', email: 'owner@test.com' };
  const member = { id: 'member1', email: 'member@test.com' };
  const viewer = { id: 'viewer1', email: 'viewer@test.com' };

  it('should protect report creation endpoint', async () => {
    const guard = requirePermission(PERMISSIONS.WRITE_REPORTS);
    const mockReq = new Request('http://localhost/api/reports');
    
    // Owner can create
    expect(await guard(mockReq, owner, 'owner')).toBeNull();
    
    // Member can create
    expect(await guard(mockReq, member, 'member')).toBeNull();
    
    // Viewer cannot create
    expect(await guard(mockReq, viewer, 'viewer')).not.toBeNull();
  });

  it('should protect team management endpoint', async () => {
    const guard = requirePermission(PERMISSIONS.MANAGE_TEAM);
    const mockReq = new Request('http://localhost/api/team');
    
    // Owner can manage
    expect(await guard(mockReq, owner, 'owner')).toBeNull();
    
    // Member cannot manage
    expect(await guard(mockReq, member, 'member')).not.toBeNull();
  });

  it('should protect billing endpoint', async () => {
    const guard = requirePermission(PERMISSIONS.MANAGE_BILLING);
    const mockReq = new Request('http://localhost/api/billing');
    
    // Only owner can manage billing
    expect(await guard(mockReq, owner, 'owner')).toBeNull();
    expect(await guard(mockReq, member, 'member')).not.toBeNull();
    expect(await guard(mockReq, viewer, 'viewer')).not.toBeNull();
  });

  it('should allow read access for all authenticated users', async () => {
    const guard = requirePermission(PERMISSIONS.READ_REPORTS);
    const mockReq = new Request('http://localhost/api/reports');
    
    // All roles can read
    expect(await guard(mockReq, owner, 'owner')).toBeNull();
    expect(await guard(mockReq, member, 'member')).toBeNull();
    expect(await guard(mockReq, viewer, 'viewer')).toBeNull();
  });
});
