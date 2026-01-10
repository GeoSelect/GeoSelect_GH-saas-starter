/**
 * Environment Configuration
 * 
 * Provides environment detection and configuration utilities.
 * Centralizes all environment-specific behavior.
 */

export type Environment = 'development' | 'production' | 'staging' | 'test';

/**
 * Get current environment
 */
export function getEnvironment(): Environment {
  const env = process.env.ENVIRONMENT || process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'production':
      return 'production';
    case 'staging':
      return 'staging';
    case 'test':
      return 'test';
    default:
      return 'development';
  }
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return getEnvironment() === 'development';
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
  return getEnvironment() === 'production';
}

/**
 * Check if running in staging mode
 */
export function isStaging(): boolean {
  return getEnvironment() === 'staging';
}

/**
 * Check if running in test mode
 */
export function isTest(): boolean {
  return getEnvironment() === 'test';
}

/**
 * Check if debug logs are enabled
 */
export function isDebugEnabled(): boolean {
  const enabled = process.env.ENABLE_DEBUG_LOGS;
  if (enabled === undefined) {
    // Default to true in development, false in production
    return isDevelopment();
  }
  return enabled === 'true' || enabled === '1';
}

/**
 * Check if experimental features are enabled
 */
export function isExperimentalEnabled(): boolean {
  const enabled = process.env.ENABLE_EXPERIMENTAL_FEATURES;
  if (enabled === undefined) {
    // Default to true in development, false elsewhere
    return isDevelopment();
  }
  return enabled === 'true' || enabled === '1';
}

/**
 * Check if analytics are enabled
 */
export function isAnalyticsEnabled(): boolean {
  const enabled = process.env.ENABLE_ANALYTICS;
  if (enabled === undefined) {
    // Default to false in development, true in production
    return isProduction();
  }
  return enabled === 'true' || enabled === '1';
}

/**
 * Get environment configuration object
 */
export function getEnvironmentConfig() {
  return {
    environment: getEnvironment(),
    isDevelopment: isDevelopment(),
    isProduction: isProduction(),
    isStaging: isStaging(),
    isTest: isTest(),
    debugEnabled: isDebugEnabled(),
    experimentalEnabled: isExperimentalEnabled(),
    analyticsEnabled: isAnalyticsEnabled(),
  };
}
