import { describe, it, expect } from 'vitest';
import { 
  isFeatureEnabled, 
  getEnabledFeatures, 
  hasFeatures, 
  hasAnyFeature 
} from '../lib/features/flags';
import { 
  FEATURE_FLAGS, 
  getFeatureConfig, 
  getAllFeatureKeys 
} from '../lib/features/flags.config';

describe('Feature Flag Configuration', () => {
  it('should have all required feature flags', () => {
    expect(FEATURE_FLAGS.ENABLE_AI_ASSISTANT).toBeDefined();
    expect(FEATURE_FLAGS.ENABLE_ADVANCED_REPORTS).toBeDefined();
    expect(FEATURE_FLAGS.ENABLE_BULK_OPERATIONS).toBeDefined();
    expect(FEATURE_FLAGS.ENABLE_EXPORT_PDF).toBeDefined();
    expect(FEATURE_FLAGS.ENABLE_API_ACCESS).toBeDefined();
  });

  it('should get feature config', () => {
    const config = getFeatureConfig('ENABLE_AI_ASSISTANT');
    expect(config.enabled).toBe(false);
    expect(config.description).toBeDefined();
    expect(config.requiresPlan).toContain('pro');
  });

  it('should get all feature keys', () => {
    const keys = getAllFeatureKeys();
    expect(keys).toContain('ENABLE_AI_ASSISTANT');
    expect(keys).toContain('ENABLE_BULK_OPERATIONS');
    expect(keys.length).toBeGreaterThan(5);
  });
});

describe('Feature Flag Evaluation - Global Defaults', () => {
  it('should return global default when no context provided', () => {
    expect(isFeatureEnabled('ENABLE_BULK_OPERATIONS')).toBe(true);
    expect(isFeatureEnabled('ENABLE_EXPORT_PDF')).toBe(true);
    expect(isFeatureEnabled('ENABLE_AI_ASSISTANT')).toBe(false);
    expect(isFeatureEnabled('ENABLE_API_ACCESS')).toBe(false);
  });

  it('should return false for unknown feature', () => {
    expect(isFeatureEnabled('UNKNOWN_FEATURE' as any)).toBe(false);
  });
});

describe('Feature Flag Evaluation - User Rollout', () => {
  const user1 = { id: 'user-123', email: 'user1@test.com' };
  const user2 = { id: 'user-456', email: 'user2@test.com' };
  const user3 = { id: 'user-789', email: 'user3@test.com' };

  it('should consistently evaluate for same user', () => {
    const result1 = isFeatureEnabled('ENABLE_AI_ASSISTANT', user1);
    const result2 = isFeatureEnabled('ENABLE_AI_ASSISTANT', user1);
    expect(result1).toBe(result2);
  });

  it('should handle 100% rollout', () => {
    // ENABLE_BULK_OPERATIONS has 100% rollout
    expect(isFeatureEnabled('ENABLE_BULK_OPERATIONS', user1)).toBe(true);
    expect(isFeatureEnabled('ENABLE_BULK_OPERATIONS', user2)).toBe(true);
    expect(isFeatureEnabled('ENABLE_BULK_OPERATIONS', user3)).toBe(true);
  });

  it('should handle 0% rollout', () => {
    // ENABLE_AI_ASSISTANT has 0% rollout and is disabled
    expect(isFeatureEnabled('ENABLE_AI_ASSISTANT', user1)).toBe(false);
    expect(isFeatureEnabled('ENABLE_AI_ASSISTANT', user2)).toBe(false);
  });

  it('should work without user for global flags', () => {
    expect(isFeatureEnabled('ENABLE_BULK_OPERATIONS', null)).toBe(true);
    expect(isFeatureEnabled('ENABLE_EXPORT_PDF', null)).toBe(true);
  });
});

describe('Feature Flag Evaluation - Entitlement Overrides', () => {
  const user = { id: 'user-123', email: 'test@test.com' };
  const account = { id: 'acc-123', name: 'Test Account' };

  it('should use entitlement feature when available', () => {
    const entitlements = {
      plan_tier: 'pro',
      features: {
        ENABLE_AI_ASSISTANT: true,
      },
      limits: {},
      overrides: {},
    };

    expect(isFeatureEnabled('ENABLE_AI_ASSISTANT', user, account, entitlements)).toBe(true);
  });

  it('should use override when available (highest priority)', () => {
    const entitlements = {
      plan_tier: 'pro',
      features: {
        ENABLE_AI_ASSISTANT: true,
      },
      limits: {},
      overrides: {
        ENABLE_AI_ASSISTANT: false,
      },
    };

    // Override takes precedence over feature
    expect(isFeatureEnabled('ENABLE_AI_ASSISTANT', user, account, entitlements)).toBe(false);
  });

  it('should fallback to global when entitlement not specified', () => {
    const entitlements = {
      plan_tier: 'free',
      features: {},
      limits: {},
      overrides: {},
    };

    expect(isFeatureEnabled('ENABLE_BULK_OPERATIONS', user, account, entitlements)).toBe(true);
    expect(isFeatureEnabled('ENABLE_API_ACCESS', user, account, entitlements)).toBe(false);
  });

  it('should handle null entitlements', () => {
    expect(isFeatureEnabled('ENABLE_BULK_OPERATIONS', user, account, null)).toBe(true);
  });
});

describe('Feature Flag Evaluation - Priority Order', () => {
  const user = { id: 'user-123', email: 'test@test.com' };
  const account = { id: 'acc-123', name: 'Test Account' };

  it('should prioritize override > entitlement > global', () => {
    // Override = false, Entitlement = true, Global = true
    const entitlements1 = {
      plan_tier: 'pro',
      features: { ENABLE_BULK_OPERATIONS: true },
      limits: {},
      overrides: { ENABLE_BULK_OPERATIONS: false },
    };
    expect(isFeatureEnabled('ENABLE_BULK_OPERATIONS', user, account, entitlements1)).toBe(false);

    // No override, Entitlement = false, Global = true
    const entitlements2 = {
      plan_tier: 'free',
      features: { ENABLE_BULK_OPERATIONS: false },
      limits: {},
      overrides: {},
    };
    expect(isFeatureEnabled('ENABLE_BULK_OPERATIONS', user, account, entitlements2)).toBe(false);

    // No override, no entitlement, Global = true
    const entitlements3 = {
      plan_tier: 'free',
      features: {},
      limits: {},
      overrides: {},
    };
    expect(isFeatureEnabled('ENABLE_BULK_OPERATIONS', user, account, entitlements3)).toBe(true);
  });
});

describe('Get Enabled Features', () => {
  const user = { id: 'user-123', email: 'test@test.com' };
  const account = { id: 'acc-123', name: 'Test Account' };

  it('should return all features with their states', () => {
    const features = getEnabledFeatures();
    expect(features).toHaveProperty('ENABLE_BULK_OPERATIONS');
    expect(features).toHaveProperty('ENABLE_AI_ASSISTANT');
    expect(features.ENABLE_BULK_OPERATIONS).toBe(true);
    expect(features.ENABLE_AI_ASSISTANT).toBe(false);
  });

  it('should respect entitlements when getting all features', () => {
    const entitlements = {
      plan_tier: 'pro',
      features: {
        ENABLE_AI_ASSISTANT: true,
        ENABLE_ADVANCED_REPORTS: true,
      },
      limits: {},
      overrides: {},
    };

    const features = getEnabledFeatures(user, account, entitlements);
    expect(features.ENABLE_AI_ASSISTANT).toBe(true);
    expect(features.ENABLE_ADVANCED_REPORTS).toBe(true);
  });

  it('should respect overrides when getting all features', () => {
    const entitlements = {
      plan_tier: 'enterprise',
      features: {
        ENABLE_BULK_OPERATIONS: true,
      },
      limits: {},
      overrides: {
        ENABLE_BULK_OPERATIONS: false,
      },
    };

    const features = getEnabledFeatures(user, account, entitlements);
    expect(features.ENABLE_BULK_OPERATIONS).toBe(false);
  });
});

describe('Multiple Feature Checks', () => {
  const user = { id: 'user-123', email: 'test@test.com' };
  const account = { id: 'acc-123', name: 'Test Account' };
  const entitlements = {
    plan_tier: 'pro',
    features: {
      ENABLE_AI_ASSISTANT: true,
      ENABLE_ADVANCED_REPORTS: true,
    },
    limits: {},
    overrides: {},
  };

  it('should check if all features are enabled', () => {
    expect(
      hasFeatures(['ENABLE_BULK_OPERATIONS', 'ENABLE_EXPORT_PDF'], user, account, entitlements)
    ).toBe(true);

    expect(
      hasFeatures(['ENABLE_AI_ASSISTANT', 'ENABLE_API_ACCESS'], user, account, entitlements)
    ).toBe(false);
  });

  it('should check if any feature is enabled', () => {
    expect(
      hasAnyFeature(['ENABLE_AI_ASSISTANT', 'ENABLE_API_ACCESS'], user, account, entitlements)
    ).toBe(true);

    expect(
      hasAnyFeature(['ENABLE_API_ACCESS', 'ENABLE_SSO'], user, account, entitlements)
    ).toBe(false);
  });

  it('should handle empty feature list', () => {
    expect(hasFeatures([], user, account, entitlements)).toBe(true);
    expect(hasAnyFeature([], user, account, entitlements)).toBe(false);
  });
});

describe('Plan-Based Features', () => {
  const user = { id: 'user-123', email: 'test@test.com' };
  const account = { id: 'acc-123', name: 'Test Account' };

  it('should work with free tier', () => {
    const freeEntitlements = {
      plan_tier: 'free',
      features: {},
      limits: {},
      overrides: {},
    };

    const features = getEnabledFeatures(user, account, freeEntitlements);
    expect(features.ENABLE_BULK_OPERATIONS).toBe(true); // Available on free
    expect(features.ENABLE_EXPORT_PDF).toBe(true); // Available on free
    expect(features.ENABLE_AI_ASSISTANT).toBe(false); // Requires pro
  });

  it('should work with pro tier', () => {
    const proEntitlements = {
      plan_tier: 'pro',
      features: {
        ENABLE_AI_ASSISTANT: true,
        ENABLE_ADVANCED_REPORTS: true,
        ENABLE_API_ACCESS: true,
      },
      limits: {},
      overrides: {},
    };

    const features = getEnabledFeatures(user, account, proEntitlements);
    expect(features.ENABLE_AI_ASSISTANT).toBe(true);
    expect(features.ENABLE_ADVANCED_REPORTS).toBe(true);
    expect(features.ENABLE_API_ACCESS).toBe(true);
  });

  it('should work with enterprise tier', () => {
    const enterpriseEntitlements = {
      plan_tier: 'enterprise',
      features: {
        ENABLE_AI_ASSISTANT: true,
        ENABLE_ADVANCED_REPORTS: true,
        ENABLE_API_ACCESS: true,
        ENABLE_CUSTOM_BRANDING: true,
        ENABLE_SSO: true,
      },
      limits: {},
      overrides: {},
    };

    const features = getEnabledFeatures(user, account, enterpriseEntitlements);
    expect(features.ENABLE_CUSTOM_BRANDING).toBe(true);
    expect(features.ENABLE_SSO).toBe(true);
  });
});
