/**
 * Operational Flags
 * 
 * Configuration for operational concerns like maintenance mode,
 * rate limiting, circuit breakers, and health checks.
 */

/**
 * Check if maintenance mode is enabled
 */
export function isMaintenanceMode(): boolean {
  const mode = process.env.MAINTENANCE_MODE;
  return mode === 'true' || mode === '1';
}

/**
 * Check if rate limiting is enabled
 */
export function isRateLimitEnabled(): boolean {
  const enabled = process.env.RATE_LIMIT_ENABLED;
  if (enabled === undefined) {
    // Default to true in production, false in development
    return process.env.NODE_ENV === 'production';
  }
  return enabled === 'true' || enabled === '1';
}

/**
 * Get rate limit configuration
 */
export function getRateLimitConfig() {
  const requestsPerMinute = parseInt(process.env.RATE_LIMIT_REQUESTS_PER_MINUTE || '100', 10);
  
  return {
    enabled: isRateLimitEnabled(),
    requestsPerMinute: isNaN(requestsPerMinute) ? 100 : requestsPerMinute,
    windowMs: 60 * 1000, // 1 minute in milliseconds
  };
}

/**
 * Get circuit breaker configuration
 */
export function getCircuitBreakerConfig() {
  const threshold = parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD || '5', 10);
  const timeout = parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT || '60000', 10);
  const resetTimeout = parseInt(process.env.CIRCUIT_BREAKER_RESET_TIMEOUT || '30000', 10);
  
  return {
    threshold: isNaN(threshold) ? 5 : threshold,
    timeout: isNaN(timeout) ? 60000 : timeout,
    resetTimeout: isNaN(resetTimeout) ? 30000 : resetTimeout,
  };
}

/**
 * Check if request logging is enabled
 */
export function isRequestLoggingEnabled(): boolean {
  const enabled = process.env.ENABLE_REQUEST_LOGGING;
  if (enabled === undefined) {
    // Default to false to avoid performance impact
    return false;
  }
  return enabled === 'true' || enabled === '1';
}

/**
 * Get health check configuration
 */
export function getHealthCheckConfig() {
  const interval = parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000', 10);
  const timeout = parseInt(process.env.HEALTH_CHECK_TIMEOUT || '5000', 10);
  
  return {
    interval: isNaN(interval) ? 30000 : interval,
    timeout: isNaN(timeout) ? 5000 : timeout,
  };
}

/**
 * Get all operational flags and configuration
 */
export function getOperationalConfig() {
  return {
    maintenanceMode: isMaintenanceMode(),
    rateLimit: getRateLimitConfig(),
    circuitBreaker: getCircuitBreakerConfig(),
    requestLogging: isRequestLoggingEnabled(),
    healthCheck: getHealthCheckConfig(),
  };
}

/**
 * Simple in-memory rate limiter
 * Note: This is a basic implementation for single-instance deployments.
 * For production with multiple instances, use Redis or a dedicated service.
 */
class InMemoryRateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  /**
   * Check if request is allowed
   * @param key - Identifier (e.g., IP address or user ID)
   * @param limit - Max requests allowed
   * @param windowMs - Time window in milliseconds
   * @returns true if request is allowed, false if rate limited
   */
  isAllowed(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    
    // Remove expired entries
    const validRequests = requests.filter(timestamp => now - timestamp < windowMs);
    
    if (validRequests.length >= limit) {
      return false;
    }
    
    // Add current request
    validRequests.push(now);
    this.requests.set(key, validRequests);
    
    return true;
  }
  
  /**
   * Clean up old entries (call periodically to prevent memory leaks)
   */
  cleanup(windowMs: number): void {
    const now = Date.now();
    
    for (const [key, requests] of this.requests.entries()) {
      const validRequests = requests.filter(timestamp => now - timestamp < windowMs);
      
      if (validRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validRequests);
      }
    }
  }
}

// Global rate limiter instance
let rateLimiter: InMemoryRateLimiter | null = null;

/**
 * Get or create rate limiter instance
 */
export function getRateLimiter(): InMemoryRateLimiter {
  if (!rateLimiter) {
    rateLimiter = new InMemoryRateLimiter();
    
    // Cleanup every 5 minutes
    if (typeof setInterval !== 'undefined') {
      setInterval(() => {
        const config = getRateLimitConfig();
        rateLimiter?.cleanup(config.windowMs);
      }, 5 * 60 * 1000);
    }
  }
  
  return rateLimiter;
}
