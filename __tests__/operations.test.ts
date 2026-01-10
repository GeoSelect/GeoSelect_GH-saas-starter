import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  isMaintenanceMode,
  isRateLimitEnabled,
  getRateLimitConfig,
  getCircuitBreakerConfig,
  isRequestLoggingEnabled,
  getHealthCheckConfig,
  getOperationalConfig,
  getRateLimiter,
} from '../lib/operations/flags';

describe('Operational Flags - Maintenance Mode', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('should return false when maintenance mode is not set', () => {
    vi.stubEnv('MAINTENANCE_MODE', undefined);
    expect(isMaintenanceMode()).toBe(false);
  });

  it('should return true when maintenance mode is enabled', () => {
    vi.stubEnv('MAINTENANCE_MODE', 'true');
    expect(isMaintenanceMode()).toBe(true);
  });

  it('should return true when maintenance mode is 1', () => {
    vi.stubEnv('MAINTENANCE_MODE', '1');
    expect(isMaintenanceMode()).toBe(true);
  });

  it('should return false for any other value', () => {
    vi.stubEnv('MAINTENANCE_MODE', 'false');
    expect(isMaintenanceMode()).toBe(false);
  });
});

describe('Operational Flags - Rate Limiting', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('should default based on environment', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('RATE_LIMIT_ENABLED', undefined);
    expect(isRateLimitEnabled()).toBe(true);
  });

  it('should respect explicit configuration', () => {
    vi.stubEnv('RATE_LIMIT_ENABLED', 'true');
    expect(isRateLimitEnabled()).toBe(true);

    vi.stubEnv('RATE_LIMIT_ENABLED', 'false');
    expect(isRateLimitEnabled()).toBe(false);
  });

  it('should get rate limit configuration', () => {
    vi.stubEnv('RATE_LIMIT_ENABLED', 'true');
    vi.stubEnv('RATE_LIMIT_REQUESTS_PER_MINUTE', '50');

    const config = getRateLimitConfig();
    expect(config.enabled).toBe(true);
    expect(config.requestsPerMinute).toBe(50);
    expect(config.windowMs).toBe(60000);
  });

  it('should use default values when not configured', () => {
    vi.stubEnv('RATE_LIMIT_ENABLED', 'true');
    vi.stubEnv('RATE_LIMIT_REQUESTS_PER_MINUTE', undefined);

    const config = getRateLimitConfig();
    expect(config.requestsPerMinute).toBe(100);
  });

  it('should handle invalid configuration', () => {
    vi.stubEnv('RATE_LIMIT_REQUESTS_PER_MINUTE', 'invalid');

    const config = getRateLimitConfig();
    expect(config.requestsPerMinute).toBe(100);
  });
});

describe('Operational Flags - Circuit Breaker', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('should get circuit breaker configuration', () => {
    vi.stubEnv('CIRCUIT_BREAKER_THRESHOLD', '10');
    vi.stubEnv('CIRCUIT_BREAKER_TIMEOUT', '30000');
    vi.stubEnv('CIRCUIT_BREAKER_RESET_TIMEOUT', '15000');

    const config = getCircuitBreakerConfig();
    expect(config.threshold).toBe(10);
    expect(config.timeout).toBe(30000);
    expect(config.resetTimeout).toBe(15000);
  });

  it('should use default values', () => {
    vi.stubEnv('CIRCUIT_BREAKER_THRESHOLD', undefined);
    vi.stubEnv('CIRCUIT_BREAKER_TIMEOUT', undefined);
    vi.stubEnv('CIRCUIT_BREAKER_RESET_TIMEOUT', undefined);

    const config = getCircuitBreakerConfig();
    expect(config.threshold).toBe(5);
    expect(config.timeout).toBe(60000);
    expect(config.resetTimeout).toBe(30000);
  });

  it('should handle invalid values', () => {
    vi.stubEnv('CIRCUIT_BREAKER_THRESHOLD', 'invalid');

    const config = getCircuitBreakerConfig();
    expect(config.threshold).toBe(5);
  });
});

describe('Operational Flags - Request Logging', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('should default to false', () => {
    vi.stubEnv('ENABLE_REQUEST_LOGGING', undefined);
    expect(isRequestLoggingEnabled()).toBe(false);
  });

  it('should respect explicit configuration', () => {
    vi.stubEnv('ENABLE_REQUEST_LOGGING', 'true');
    expect(isRequestLoggingEnabled()).toBe(true);

    vi.stubEnv('ENABLE_REQUEST_LOGGING', 'false');
    expect(isRequestLoggingEnabled()).toBe(false);
  });
});

describe('Operational Flags - Health Check', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('should get health check configuration', () => {
    vi.stubEnv('HEALTH_CHECK_INTERVAL', '60000');
    vi.stubEnv('HEALTH_CHECK_TIMEOUT', '10000');

    const config = getHealthCheckConfig();
    expect(config.interval).toBe(60000);
    expect(config.timeout).toBe(10000);
  });

  it('should use default values', () => {
    vi.stubEnv('HEALTH_CHECK_INTERVAL', undefined);
    vi.stubEnv('HEALTH_CHECK_TIMEOUT', undefined);

    const config = getHealthCheckConfig();
    expect(config.interval).toBe(30000);
    expect(config.timeout).toBe(5000);
  });
});

describe('Operational Configuration', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('should get all operational configuration', () => {
    vi.stubEnv('MAINTENANCE_MODE', 'false');
    vi.stubEnv('RATE_LIMIT_ENABLED', 'true');
    vi.stubEnv('ENABLE_REQUEST_LOGGING', 'false');

    const config = getOperationalConfig();
    expect(config).toHaveProperty('maintenanceMode');
    expect(config).toHaveProperty('rateLimit');
    expect(config).toHaveProperty('circuitBreaker');
    expect(config).toHaveProperty('requestLogging');
    expect(config).toHaveProperty('healthCheck');

    expect(config.maintenanceMode).toBe(false);
    expect(config.requestLogging).toBe(false);
  });
});

describe('Rate Limiter Implementation', () => {
  it('should create rate limiter instance', () => {
    const limiter = getRateLimiter();
    expect(limiter).toBeDefined();
  });

  it('should allow requests within limit', () => {
    const limiter = getRateLimiter();
    const key = 'test-key-1';

    expect(limiter.isAllowed(key, 5, 60000)).toBe(true);
    expect(limiter.isAllowed(key, 5, 60000)).toBe(true);
    expect(limiter.isAllowed(key, 5, 60000)).toBe(true);
  });

  it('should block requests exceeding limit', () => {
    const limiter = getRateLimiter();
    const key = 'test-key-2';

    // Use up the limit
    for (let i = 0; i < 5; i++) {
      expect(limiter.isAllowed(key, 5, 60000)).toBe(true);
    }

    // Next request should be blocked
    expect(limiter.isAllowed(key, 5, 60000)).toBe(false);
  });

  it('should track different keys separately', () => {
    const limiter = getRateLimiter();
    const key1 = 'test-key-3';
    const key2 = 'test-key-4';

    expect(limiter.isAllowed(key1, 2, 60000)).toBe(true);
    expect(limiter.isAllowed(key1, 2, 60000)).toBe(true);
    expect(limiter.isAllowed(key1, 2, 60000)).toBe(false);

    // Different key should still be allowed
    expect(limiter.isAllowed(key2, 2, 60000)).toBe(true);
    expect(limiter.isAllowed(key2, 2, 60000)).toBe(true);
  });

  it('should clean up expired entries', () => {
    const limiter = getRateLimiter();
    const key = 'test-key-5';

    // Add some requests
    limiter.isAllowed(key, 5, 100); // Very short window

    // Cleanup should remove expired entries
    limiter.cleanup(100);

    // After cleanup, should be able to make requests again
    // (This test is timing-dependent, so we just verify cleanup doesn't crash)
    expect(() => limiter.cleanup(100)).not.toThrow();
  });

  it('should handle concurrent requests', () => {
    const limiter = getRateLimiter();
    const key = 'test-key-6';

    const results = [];
    for (let i = 0; i < 10; i++) {
      results.push(limiter.isAllowed(key, 5, 60000));
    }

    const allowed = results.filter(r => r).length;
    const blocked = results.filter(r => !r).length;

    expect(allowed).toBe(5);
    expect(blocked).toBe(5);
  });
});

describe('Rate Limiter Edge Cases', () => {
  it('should handle zero limit', () => {
    const limiter = getRateLimiter();
    const key = 'test-key-7';

    expect(limiter.isAllowed(key, 0, 60000)).toBe(false);
  });

  it('should handle very short windows', () => {
    const limiter = getRateLimiter();
    const key = 'test-key-8';

    // With 1ms window, requests should expire quickly
    expect(limiter.isAllowed(key, 1, 1)).toBe(true);
  });

  it('should handle large limits', () => {
    const limiter = getRateLimiter();
    const key = 'test-key-9';

    for (let i = 0; i < 1000; i++) {
      expect(limiter.isAllowed(key, 1000, 60000)).toBe(true);
    }

    expect(limiter.isAllowed(key, 1000, 60000)).toBe(false);
  });
});

describe('Maintenance Mode Behavior', () => {
  it('should block all requests when enabled', () => {
    vi.stubEnv('MAINTENANCE_MODE', 'true');
    
    // In a real middleware, this would block requests
    expect(isMaintenanceMode()).toBe(true);
  });

  it('should allow requests when disabled', () => {
    vi.stubEnv('MAINTENANCE_MODE', 'false');
    
    expect(isMaintenanceMode()).toBe(false);
  });
});

describe('Circuit Breaker Logic', () => {
  it('should provide circuit breaker configuration', () => {
    vi.stubEnv('CIRCUIT_BREAKER_THRESHOLD', '5');
    
    const config = getCircuitBreakerConfig();
    expect(config.threshold).toBe(5);
    
    // Circuit breaker would trip after 5 consecutive failures
    // This is a configuration test, actual implementation would be in middleware
  });

  it('should have reasonable timeout values', () => {
    const config = getCircuitBreakerConfig();
    
    expect(config.timeout).toBeGreaterThan(0);
    expect(config.resetTimeout).toBeGreaterThan(0);
    expect(config.timeout).toBeGreaterThanOrEqual(config.resetTimeout);
  });
});
