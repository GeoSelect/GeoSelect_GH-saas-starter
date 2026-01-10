import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getEnvironment,
  isDevelopment,
  isProduction,
  isStaging,
  isTest,
  isDebugEnabled,
  isExperimentalEnabled,
  isAnalyticsEnabled,
  getEnvironmentConfig,
} from '../lib/config/environment';

describe('Environment Detection', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('should default to development', () => {
    vi.stubEnv('ENVIRONMENT', undefined);
    vi.stubEnv('NODE_ENV', undefined);
    expect(getEnvironment()).toBe('development');
  });

  it('should detect production environment', () => {
    vi.stubEnv('ENVIRONMENT', 'production');
    expect(getEnvironment()).toBe('production');
    expect(isProduction()).toBe(true);
    expect(isDevelopment()).toBe(false);
  });

  it('should detect staging environment', () => {
    vi.stubEnv('ENVIRONMENT', 'staging');
    expect(getEnvironment()).toBe('staging');
    expect(isStaging()).toBe(true);
    expect(isProduction()).toBe(false);
  });

  it('should detect test environment', () => {
    vi.stubEnv('ENVIRONMENT', 'test');
    expect(getEnvironment()).toBe('test');
    expect(isTest()).toBe(true);
  });

  it('should fallback to NODE_ENV when ENVIRONMENT not set', () => {
    vi.stubEnv('ENVIRONMENT', undefined);
    vi.stubEnv('NODE_ENV', 'production');
    expect(getEnvironment()).toBe('production');
  });

  it('should prioritize ENVIRONMENT over NODE_ENV', () => {
    vi.stubEnv('ENVIRONMENT', 'staging');
    vi.stubEnv('NODE_ENV', 'production');
    expect(getEnvironment()).toBe('staging');
  });
});

describe('Environment Helpers', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('should correctly identify development', () => {
    vi.stubEnv('ENVIRONMENT', 'development');
    expect(isDevelopment()).toBe(true);
    expect(isProduction()).toBe(false);
    expect(isStaging()).toBe(false);
    expect(isTest()).toBe(false);
  });

  it('should correctly identify production', () => {
    vi.stubEnv('ENVIRONMENT', 'production');
    expect(isProduction()).toBe(true);
    expect(isDevelopment()).toBe(false);
    expect(isStaging()).toBe(false);
    expect(isTest()).toBe(false);
  });

  it('should correctly identify staging', () => {
    vi.stubEnv('ENVIRONMENT', 'staging');
    expect(isStaging()).toBe(true);
    expect(isProduction()).toBe(false);
    expect(isDevelopment()).toBe(false);
    expect(isTest()).toBe(false);
  });

  it('should correctly identify test', () => {
    vi.stubEnv('ENVIRONMENT', 'test');
    expect(isTest()).toBe(true);
    expect(isProduction()).toBe(false);
    expect(isDevelopment()).toBe(false);
    expect(isStaging()).toBe(false);
  });
});

describe('Debug Logs Configuration', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('should default to true in development', () => {
    vi.stubEnv('ENVIRONMENT', 'development');
    vi.stubEnv('ENABLE_DEBUG_LOGS', undefined);
    expect(isDebugEnabled()).toBe(true);
  });

  it('should default to false in production', () => {
    vi.stubEnv('ENVIRONMENT', 'production');
    vi.stubEnv('ENABLE_DEBUG_LOGS', undefined);
    expect(isDebugEnabled()).toBe(false);
  });

  it('should respect explicit configuration', () => {
    vi.stubEnv('ENVIRONMENT', 'production');
    vi.stubEnv('ENABLE_DEBUG_LOGS', 'true');
    expect(isDebugEnabled()).toBe(true);

    vi.stubEnv('ENABLE_DEBUG_LOGS', 'false');
    expect(isDebugEnabled()).toBe(false);
  });

  it('should handle "1" as true', () => {
    vi.stubEnv('ENABLE_DEBUG_LOGS', '1');
    expect(isDebugEnabled()).toBe(true);
  });
});

describe('Experimental Features Configuration', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('should default to true in development', () => {
    vi.stubEnv('ENVIRONMENT', 'development');
    vi.stubEnv('ENABLE_EXPERIMENTAL_FEATURES', undefined);
    expect(isExperimentalEnabled()).toBe(true);
  });

  it('should default to false in production', () => {
    vi.stubEnv('ENVIRONMENT', 'production');
    vi.stubEnv('ENABLE_EXPERIMENTAL_FEATURES', undefined);
    expect(isExperimentalEnabled()).toBe(false);
  });

  it('should respect explicit configuration', () => {
    vi.stubEnv('ENVIRONMENT', 'production');
    vi.stubEnv('ENABLE_EXPERIMENTAL_FEATURES', 'true');
    expect(isExperimentalEnabled()).toBe(true);

    vi.stubEnv('ENABLE_EXPERIMENTAL_FEATURES', 'false');
    expect(isExperimentalEnabled()).toBe(false);
  });
});

describe('Analytics Configuration', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('should default to false in development', () => {
    vi.stubEnv('ENVIRONMENT', 'development');
    vi.stubEnv('ENABLE_ANALYTICS', undefined);
    expect(isAnalyticsEnabled()).toBe(false);
  });

  it('should default to true in production', () => {
    vi.stubEnv('ENVIRONMENT', 'production');
    vi.stubEnv('ENABLE_ANALYTICS', undefined);
    expect(isAnalyticsEnabled()).toBe(true);
  });

  it('should respect explicit configuration', () => {
    vi.stubEnv('ENVIRONMENT', 'development');
    vi.stubEnv('ENABLE_ANALYTICS', 'true');
    expect(isAnalyticsEnabled()).toBe(true);

    vi.stubEnv('ENABLE_ANALYTICS', 'false');
    expect(isAnalyticsEnabled()).toBe(false);
  });
});

describe('Environment Configuration Object', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('should return complete configuration in development', () => {
    vi.stubEnv('ENVIRONMENT', 'development');
    
    const config = getEnvironmentConfig();
    
    expect(config.environment).toBe('development');
    expect(config.isDevelopment).toBe(true);
    expect(config.isProduction).toBe(false);
    expect(config.isStaging).toBe(false);
    expect(config.isTest).toBe(false);
    expect(config.debugEnabled).toBe(true);
    expect(config.experimentalEnabled).toBe(true);
    expect(config.analyticsEnabled).toBe(false);
  });

  it('should return complete configuration in production', () => {
    vi.stubEnv('ENVIRONMENT', 'production');
    
    const config = getEnvironmentConfig();
    
    expect(config.environment).toBe('production');
    expect(config.isDevelopment).toBe(false);
    expect(config.isProduction).toBe(true);
    expect(config.isStaging).toBe(false);
    expect(config.isTest).toBe(false);
    expect(config.debugEnabled).toBe(false);
    expect(config.experimentalEnabled).toBe(false);
    expect(config.analyticsEnabled).toBe(true);
  });

  it('should return complete configuration in staging', () => {
    vi.stubEnv('ENVIRONMENT', 'staging');
    
    const config = getEnvironmentConfig();
    
    expect(config.environment).toBe('staging');
    expect(config.isStaging).toBe(true);
    expect(config.isDevelopment).toBe(false);
    expect(config.isProduction).toBe(false);
  });
});

describe('Environment-Specific Behavior', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('should have different defaults per environment', () => {
    // Development: debug on, analytics off
    vi.stubEnv('ENVIRONMENT', 'development');
    expect(isDebugEnabled()).toBe(true);
    expect(isAnalyticsEnabled()).toBe(false);

    // Production: debug off, analytics on
    vi.stubEnv('ENVIRONMENT', 'production');
    expect(isDebugEnabled()).toBe(false);
    expect(isAnalyticsEnabled()).toBe(true);
  });

  it('should allow overriding defaults', () => {
    vi.stubEnv('ENVIRONMENT', 'production');
    vi.stubEnv('ENABLE_DEBUG_LOGS', 'true');
    vi.stubEnv('ENABLE_ANALYTICS', 'false');
    
    expect(isDebugEnabled()).toBe(true);
    expect(isAnalyticsEnabled()).toBe(false);
  });
});

describe('Environment Edge Cases', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('should handle invalid environment values', () => {
    vi.stubEnv('ENVIRONMENT', 'invalid');
    expect(getEnvironment()).toBe('development');
  });

  it('should handle empty string environment', () => {
    vi.stubEnv('ENVIRONMENT', '');
    vi.stubEnv('NODE_ENV', '');
    // Empty strings default to 'development'
    expect(getEnvironment()).toBe('development');
  });

  it('should handle mixed case environment values', () => {
    vi.stubEnv('ENVIRONMENT', 'PRODUCTION');
    // Should still work as we explicitly check for lowercase
    expect(getEnvironment()).toBe('development'); // Falls back since uppercase not matched
  });

  it('should handle boolean-like strings for flags', () => {
    vi.stubEnv('ENABLE_DEBUG_LOGS', 'yes');
    expect(isDebugEnabled()).toBe(false); // Only 'true' or '1' count as true

    vi.stubEnv('ENABLE_DEBUG_LOGS', '0');
    expect(isDebugEnabled()).toBe(false);
  });
});
