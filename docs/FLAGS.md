# Flag Management System Documentation

This document provides comprehensive documentation for the flag management system in the GeoSelect SaaS starter application.

## Table of Contents

1. [Overview](#overview)
2. [Feature Flags](#feature-flags)
3. [Environment Configuration](#environment-configuration)
4. [Operational Flags](#operational-flags)
5. [Permission System](#permission-system)
6. [Best Practices](#best-practices)
7. [Examples](#examples)

## Overview

The flag management system provides a comprehensive set of tools for controlling feature availability, environment-specific behavior, operational concerns, and user permissions.

### Core Components

- **Feature Flags**: Control feature availability based on user, account, or entitlements
- **Environment Flags**: Environment-specific configuration (development, production, staging, test)
- **Operational Flags**: Runtime operational controls (maintenance mode, rate limiting, circuit breakers)
- **Permission System**: Role-based access control (RBAC) with explicit permissions

## Feature Flags

Feature flags allow you to enable or disable features dynamically based on various contexts.

### Configuration

Feature flags are defined in `lib/features/flags.config.ts`:

```typescript
export const FEATURE_FLAGS = {
  ENABLE_AI_ASSISTANT: {
    enabled: false,
    description: 'AI-powered assistant for report generation',
    rolloutPercentage: 0,
    requiresPlan: ['pro', 'enterprise']
  },
  // ... more flags
};
```

### Usage

#### Check if a Feature is Enabled

```typescript
import { isFeatureEnabled } from '@/lib/features/flags';

const user = { id: 'user123', email: 'user@example.com' };
const account = { id: 'acc123', name: 'My Account' };
const entitlements = {
  plan_tier: 'pro',
  features: { ENABLE_AI_ASSISTANT: true },
  limits: {},
  overrides: {}
};

if (isFeatureEnabled('ENABLE_AI_ASSISTANT', user, account, entitlements)) {
  // Feature is enabled
}
```

#### Get All Enabled Features

```typescript
import { getEnabledFeatures } from '@/lib/features/flags';

const features = getEnabledFeatures(user, account, entitlements);
// Returns: { ENABLE_AI_ASSISTANT: true, ENABLE_BULK_OPERATIONS: true, ... }
```

### Priority Order

Feature flag evaluation follows this priority:

1. **Account-level override** (from `entitlements.overrides`)
2. **Entitlement-based feature** (from `entitlements.features`)
3. **User-specific rollout** (percentage-based on user ID)
4. **Global flag configuration** (from `flags.config.ts`)

### Adding New Feature Flags

1. Add the flag to `FEATURE_FLAGS` in `lib/features/flags.config.ts`:

```typescript
ENABLE_NEW_FEATURE: {
  enabled: false,
  description: 'Description of the new feature',
  rolloutPercentage: 0,
  requiresPlan: ['pro', 'enterprise']
}
```

2. Use the flag in your code:

```typescript
if (isFeatureEnabled('ENABLE_NEW_FEATURE', user, account, entitlements)) {
  // Feature logic
}
```

3. Add tests in `__tests__/features.test.ts`

## Environment Configuration

Environment flags control behavior based on the deployment environment.

### Available Environments

- `development` - Local development
- `production` - Production deployment
- `staging` - Staging/preview deployments
- `test` - Test runs

### Configuration

Set in `.env`:

```bash
ENVIRONMENT=development
ENABLE_DEBUG_LOGS=true
ENABLE_EXPERIMENTAL_FEATURES=false
ENABLE_ANALYTICS=true
```

### Usage

```typescript
import {
  getEnvironment,
  isDevelopment,
  isProduction,
  isDebugEnabled,
  getEnvironmentConfig
} from '@/lib/config/environment';

if (isDevelopment()) {
  console.log('Running in development mode');
}

if (isDebugEnabled()) {
  console.log('Debug logs enabled');
}

const config = getEnvironmentConfig();
// Returns complete environment configuration
```

### Default Behaviors

| Flag | Development | Production | Staging | Test |
|------|-------------|------------|---------|------|
| Debug Logs | ✅ | ❌ | ❌ | ✅ |
| Experimental Features | ✅ | ❌ | ❌ | ❌ |
| Analytics | ❌ | ✅ | ✅ | ❌ |

## Operational Flags

Operational flags control runtime behavior and resilience patterns.

### Maintenance Mode

Enables a maintenance window where the service returns 503 for all requests (except health checks).

```bash
MAINTENANCE_MODE=true
```

Usage in middleware:

```typescript
import { isMaintenanceMode } from '@/lib/operations/flags';

if (isMaintenanceMode()) {
  return NextResponse.json(
    { ok: false, error: 'Service temporarily unavailable' },
    { status: 503 }
  );
}
```

### Rate Limiting

Protects the API from abuse with request rate limiting.

```bash
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS_PER_MINUTE=100
```

Usage:

```typescript
import { getRateLimitConfig, getRateLimiter } from '@/lib/operations/flags';

const config = getRateLimitConfig();
const limiter = getRateLimiter();

if (!limiter.isAllowed(ip, config.requestsPerMinute, config.windowMs)) {
  return NextResponse.json(
    { ok: false, error: 'Rate limit exceeded' },
    { status: 429 }
  );
}
```

### Circuit Breaker

Configure circuit breaker thresholds for external service calls:

```bash
CIRCUIT_BREAKER_THRESHOLD=5
CIRCUIT_BREAKER_TIMEOUT=60000
CIRCUIT_BREAKER_RESET_TIMEOUT=30000
```

### Request Logging

Enable detailed request logging:

```bash
ENABLE_REQUEST_LOGGING=true
```

## Permission System

The permission system provides role-based access control with explicit permissions.

### Roles

Four built-in roles with hierarchical permissions:

1. **Owner** - Full access to everything
2. **Admin** - Manage team and content, view billing
3. **Member** - Read and write content
4. **Viewer** - Read-only access

### Available Permissions

```typescript
// Report permissions
READ_REPORTS, WRITE_REPORTS, DELETE_REPORTS, PUBLISH_REPORTS

// Location permissions
READ_LOCATIONS, WRITE_LOCATIONS, DELETE_LOCATIONS

// Team permissions
MANAGE_TEAM, INVITE_MEMBERS, REMOVE_MEMBERS, MANAGE_ROLES

// Billing permissions
VIEW_BILLING, MANAGE_BILLING, MANAGE_SUBSCRIPTION

// And more...
```

### Checking Permissions

```typescript
import { hasPermission } from '@/lib/permissions/check';
import { PERMISSIONS } from '@/lib/permissions/definitions';

const user = { id: 'user123', email: 'user@example.com' };
const role = 'member';

if (hasPermission(user, PERMISSIONS.WRITE_REPORTS, role)) {
  // User can write reports
}
```

### Permission Guards

Protect API routes with permission guards:

```typescript
import { requirePermission } from '@/lib/permissions/guards';
import { PERMISSIONS } from '@/lib/permissions/definitions';

export async function POST(req: Request) {
  const guard = requirePermission(PERMISSIONS.WRITE_REPORTS);
  const result = await guard(req, user, role);
  
  if (result) return result; // Permission denied
  
  // Continue with handler
}
```

### Server Actions

Check permissions in server actions:

```typescript
import { checkPermissionForAction } from '@/lib/permissions/guards';

const result = await checkPermissionForAction(
  user,
  PERMISSIONS.DELETE_REPORTS,
  role
);

if (!result.ok) {
  return { error: result.error };
}
```

## Best Practices

### Feature Flags

1. **Start with 0% rollout** for new features
2. **Use entitlement overrides** for beta testers
3. **Gradually increase rollout** percentage
4. **Monitor metrics** during rollout
5. **Remove flags** once fully rolled out

### Environment Configuration

1. **Never commit** `.env` files
2. **Use `.env.example`** to document variables
3. **Test environment-specific behavior** in staging
4. **Keep production logs minimal**
5. **Enable analytics** only in production

### Operational Flags

1. **Test maintenance mode** in staging first
2. **Set appropriate rate limits** based on load testing
3. **Monitor rate limit hits** to adjust thresholds
4. **Use circuit breakers** for external services
5. **Enable request logging** only for debugging

### Permissions

1. **Follow principle of least privilege**
2. **Check permissions** at API boundaries
3. **Use role hierarchy** appropriately
4. **Audit permission changes**
5. **Test permission denial** paths

## Examples

### Example 1: Gradual Feature Rollout

```typescript
// 1. Start with disabled flag
ENABLE_NEW_DASHBOARD: {
  enabled: false,
  rolloutPercentage: 0,
}

// 2. Enable for specific accounts via entitlements
entitlements.overrides.ENABLE_NEW_DASHBOARD = true;

// 3. Gradually roll out to 10% of users
ENABLE_NEW_DASHBOARD: {
  enabled: false,
  rolloutPercentage: 10,
}

// 4. Full rollout
ENABLE_NEW_DASHBOARD: {
  enabled: true,
  rolloutPercentage: 100,
}
```

### Example 2: Protected API Endpoint

```typescript
export async function DELETE(req: Request) {
  const supabase = await supabaseRoute();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Get user's role
  const { data: membership } = await supabase
    .from('account_users')
    .select('role')
    .eq('user_id', user.id)
    .single();
  
  // Check permission
  const guard = requirePermission(PERMISSIONS.DELETE_REPORTS);
  const result = await guard(req, user, membership?.role);
  
  if (result) return result;
  
  // Proceed with deletion
  // ...
}
```

### Example 3: Feature Flag in UI

```typescript
'use client';

import { useBootstrap } from '@/hooks/useBootstrap';

export function Dashboard() {
  const { features, loading } = useBootstrap();
  
  if (loading) return <Spinner />;
  
  return (
    <div>
      <h1>Dashboard</h1>
      
      {features.ENABLE_AI_ASSISTANT && (
        <AIAssistantPanel />
      )}
      
      {features.ENABLE_ADVANCED_REPORTS && (
        <AdvancedReportsSection />
      )}
    </div>
  );
}
```

### Example 4: Multi-Account Access

```typescript
import { checkAccountAccess, getAccountRole } from '@/lib/permissions/check';

export async function getUserAccount(userId: string, accountId: string) {
  // Get user's memberships
  const memberships = await db.query.account_users.findMany({
    where: eq(account_users.user_id, userId)
  });
  
  // Check access
  if (!checkAccountAccess({ id: userId }, accountId, memberships)) {
    throw new Error('Access denied');
  }
  
  // Get role for this account
  const role = getAccountRole(accountId, memberships);
  
  return { accountId, role };
}
```

## Testing

All flag management components have comprehensive test coverage:

- `__tests__/features.test.ts` - Feature flag tests
- `__tests__/environment.test.ts` - Environment configuration tests
- `__tests__/operations.test.ts` - Operational flag tests
- `__tests__/permissions.test.ts` - Permission system tests
- `__tests__/guards.test.ts` - Permission guard tests
- `__tests__/account-access.test.ts` - Account access tests
- `__tests__/bootstrap.test.ts` - Bootstrap integration tests

Run tests:

```bash
npm test
```

## Troubleshooting

### Feature not enabling

1. Check global flag configuration in `flags.config.ts`
2. Verify entitlements for the account
3. Check user rollout percentage
4. Look for overrides in entitlements

### Permission denied unexpectedly

1. Verify user's role in the account
2. Check permission definitions for the role
3. Ensure user is authenticated
4. Verify account membership

### Rate limiting too aggressive

1. Check `RATE_LIMIT_REQUESTS_PER_MINUTE` setting
2. Monitor actual request rates
3. Consider per-user vs per-IP limiting
4. Adjust threshold in `.env`

## Support

For questions or issues:

1. Check this documentation
2. Review test files for examples
3. Open an issue on GitHub
4. Contact the development team
