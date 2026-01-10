/**
 * Feature Flag System
 * 
 * Provides feature flag evaluation with support for:
 * - Global flags
 * - User-specific rollouts
 * - Account-level overrides
 * - Entitlement-based features
 * - Percentage-based gradual rollouts
 */

import { FEATURE_FLAGS, type FeatureFlagKey } from './flags.config';

export type User = {
  id: string;
  email?: string | null;
};

export type Account = {
  id: string;
  name?: string;
};

export type Entitlements = {
  plan_tier: string;
  features: Record<string, any>;
  limits: Record<string, any>;
  overrides: Record<string, any>;
};

/**
 * Check if a feature is enabled for a user/account
 * 
 * Priority order:
 * 1. Account-level override (from entitlements.overrides)
 * 2. Entitlement-based feature (from entitlements.features)
 * 3. User-specific rollout (percentage-based on user ID)
 * 4. Global flag configuration
 * 
 * @param feature - The feature flag key to check
 * @param user - Optional user context
 * @param account - Optional account context
 * @param entitlements - Optional entitlements context
 * @returns true if feature is enabled, false otherwise
 */
export function isFeatureEnabled(
  feature: FeatureFlagKey,
  user?: User | null,
  account?: Account | null,
  entitlements?: Entitlements | null
): boolean {
  const config = FEATURE_FLAGS[feature];
  
  if (!config) {
    // Unknown feature flag defaults to false
    return false;
  }

  // 1. Check account-level override
  if (entitlements?.overrides?.[feature] !== undefined) {
    return Boolean(entitlements.overrides[feature]);
  }

  // 2. Check entitlement-based feature
  if (entitlements?.features?.[feature] !== undefined) {
    return Boolean(entitlements.features[feature]);
  }

  // 3. Check user-specific rollout (percentage-based)
  if (user && config.rolloutPercentage !== undefined && config.rolloutPercentage < 100) {
    const userHash = hashString(user.id);
    const userPercentage = userHash % 100;
    if (userPercentage >= config.rolloutPercentage) {
      return false;
    }
  }

  // 4. Use global default
  return config.enabled;
}

/**
 * Get all enabled features for a user/account
 */
export function getEnabledFeatures(
  user?: User | null,
  account?: Account | null,
  entitlements?: Entitlements | null
): Record<string, boolean> {
  const features: Record<string, boolean> = {};
  
  for (const key of Object.keys(FEATURE_FLAGS) as FeatureFlagKey[]) {
    features[key] = isFeatureEnabled(key, user, account, entitlements);
  }
  
  return features;
}

/**
 * Simple string hash function for consistent user-based rollouts
 * 
 * Note: This is a basic hash function suitable for feature rollout distribution.
 * It provides adequate distribution for most use cases. For cryptographic purposes,
 * use a proper cryptographic hash function instead.
 * 
 * Expected collision rate: Low for typical user ID patterns (UUIDs, incremental IDs)
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Check multiple features at once
 */
export function hasFeatures(
  features: FeatureFlagKey[],
  user?: User | null,
  account?: Account | null,
  entitlements?: Entitlements | null
): boolean {
  return features.every(feature => isFeatureEnabled(feature, user, account, entitlements));
}

/**
 * Check if at least one of the features is enabled
 */
export function hasAnyFeature(
  features: FeatureFlagKey[],
  user?: User | null,
  account?: Account | null,
  entitlements?: Entitlements | null
): boolean {
  return features.some(feature => isFeatureEnabled(feature, user, account, entitlements));
}
