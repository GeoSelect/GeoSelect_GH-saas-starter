/**
 * Feature Flag Configuration
 * 
 * Define all feature flags and their default states here.
 * Flags can be overridden at the account level via entitlements.
 */

export type FeatureFlagConfig = {
  enabled: boolean;
  description: string;
  rolloutPercentage?: number; // 0-100, for gradual rollouts
  requiresPlan?: string[]; // Plans that have access to this feature
};

export const FEATURE_FLAGS = {
  ENABLE_AI_ASSISTANT: {
    enabled: false,
    description: 'AI-powered assistant for report generation and analysis',
    rolloutPercentage: 0,
    requiresPlan: ['pro', 'enterprise']
  },
  ENABLE_ADVANCED_REPORTS: {
    enabled: false,
    description: 'Advanced report templates and customization',
    rolloutPercentage: 0,
    requiresPlan: ['pro', 'enterprise']
  },
  ENABLE_BULK_OPERATIONS: {
    enabled: true,
    description: 'Bulk operations for batch processing',
    rolloutPercentage: 100,
    requiresPlan: ['free', 'pro', 'enterprise']
  },
  ENABLE_EXPORT_PDF: {
    enabled: true,
    description: 'Export reports as PDF',
    rolloutPercentage: 100,
    requiresPlan: ['free', 'pro', 'enterprise']
  },
  ENABLE_API_ACCESS: {
    enabled: false,
    description: 'API access for programmatic integration',
    rolloutPercentage: 0,
    requiresPlan: ['pro', 'enterprise']
  },
  ENABLE_CUSTOM_BRANDING: {
    enabled: false,
    description: 'Custom branding and white-labeling',
    rolloutPercentage: 0,
    requiresPlan: ['enterprise']
  },
  ENABLE_SSO: {
    enabled: false,
    description: 'Single Sign-On (SSO) integration',
    rolloutPercentage: 0,
    requiresPlan: ['enterprise']
  },
  ENABLE_AUDIT_LOGS: {
    enabled: true,
    description: 'Detailed audit logging',
    rolloutPercentage: 100,
    requiresPlan: ['pro', 'enterprise']
  },
  ENABLE_WEBHOOKS: {
    enabled: false,
    description: 'Webhook notifications for events',
    rolloutPercentage: 0,
    requiresPlan: ['pro', 'enterprise']
  },
  ENABLE_COLLABORATION: {
    enabled: true,
    description: 'Real-time collaboration features',
    rolloutPercentage: 100,
    requiresPlan: ['free', 'pro', 'enterprise']
  }
} as const;

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;

/**
 * Get feature flag configuration by key
 */
export function getFeatureConfig(key: FeatureFlagKey): FeatureFlagConfig {
  return FEATURE_FLAGS[key];
}

/**
 * Get all feature flag keys
 */
export function getAllFeatureKeys(): FeatureFlagKey[] {
  return Object.keys(FEATURE_FLAGS) as FeatureFlagKey[];
}
