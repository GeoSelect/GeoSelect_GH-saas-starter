# Coordinated Contract Patterns (CCP) Overview

This document provides a high-level overview of the Coordinated Contract Patterns (CCPs) implemented in this codebase.

## What are CCPs?

CCPs are **frozen contract patterns** that define stable, versioned APIs between different parts of the system. They ensure:
- **Predictability**: Consumers can rely on a stable shape
- **Testability**: Frozen contracts are easy to test
- **Compatibility**: Version tracking enables graceful evolution
- **Documentation**: Explicit contracts serve as living documentation

## Implemented CCPs

### CCP-00: Account Bootstrap

**Status:** Partially implemented (account tables are temporary stand-ins)

**Purpose:** Provide session bootstrap data including user, account, role, and entitlements.

**Endpoint:** `POST /api/session/bootstrap`

**Key Files:**
- `/app/api/session/bootstrap/route.ts`
- `/lib/db/queries.ts`

**Response Shape:**
```typescript
{
  ok: true,
  user: { id, email } | null,
  account: { id, name } | null,
  role: string | null,
  entitlements: {
    plan_tier: string,
    features: {},
    limits: {},
    overrides: {}
  } | null
}
```

**Notes:**
- Anonymous bootstrap is allowed (returns nulls)
- Future: Full account tables with RLS policies
- Future: Permissions and feature flags in response

---

### CCP-01: Location Resolution

**Status:** Implemented

**Purpose:** Resolve geographic locations from various input types (address, coordinates, place name).

**Endpoint:** `POST /api/location/resolve`

**Key Files:**
- `/app/api/location/resolve/route.ts`
- `/app/api/location/resolve/route.test.ts`

**Input Shape:**
```typescript
{
  input_type: 'point' | 'address' | 'place',
  point?: { lat: number, lng: number },
  address?: string,
  place?: string
}
```

**Response Shape:** Frozen response with lat/lng coordinates and metadata.

**Tests:** Verify frozen CCP-01 response shape for valid point input.

---

### CCP-03: Parcel Preview / Report Creation

**Status:** Fully implemented and documented

**Purpose:** Transform parcel context (geographic features) into structured report skeletons.

**Endpoint:** `POST /api/report/create`

**Key Files:**
- `/app/api/report/create/route.ts`
- `/lib/contracts/parcel-to-report.ts`
- `/lib/contracts/report.schema.ts`
- `/lib/contracts/ccp03.ts`
- `/lib/contracts/auditEvent.schema.ts`

**Input Shape:**
```typescript
{
  parcel_context: ParcelFeature[],  // Array of parcels with lat/lng
  intent: string | object,          // Purpose or mode
  report_id?: string,               // Optional custom ID
  request_id?: string               // Optional correlation ID
}
```

**Response Shape:**
```typescript
{
  ok: true,
  report: {
    id: string,
    report_id: string,
    request_id: string | null,
    version: 'rpt-0.1',
    status: 'created',
    created_at: string,
    sections: [
      { type: 'overview', blocks: [] },
      { type: 'restrictions', blocks: [] },
      { type: 'process', blocks: [] },
      { type: 'deadlines', blocks: [] },
      { type: 'risks', blocks: [] },
      { type: 'sources', blocks: [{type: 'evidence_list', items: []}] }
    ],
    context: {
      intent: {},
      parcel_summary: { count, bbox, center, sample },
      parcels: []
    }
  }
}
```

**Features:**
- Frozen report structure with 6 predefined sections
- Automatic computation of bounding box and center point
- Audit event emission (`report.created`)
- CORS support for cross-origin requests

**Tests:**
- API endpoint tests with audit event verification
- Contract validation tests (missing fields)
- Frozen response shape verification

**Documentation:** See [PARCEL_PREVIEW_CCP.md](./PARCEL_PREVIEW_CCP.md) for complete details.

---

## CCP Development Guidelines

### 1. Frozen Contracts

Once a CCP is deployed to production:
- ❌ **DO NOT** change the response shape
- ❌ **DO NOT** remove or rename fields
- ❌ **DO NOT** change field types
- ✅ **DO** add optional fields (use with caution)
- ✅ **DO** create new versions (e.g., v2) for breaking changes
- ✅ **DO** maintain backward compatibility

### 2. Versioning

All CCPs should include a version field:
```typescript
{
  version: 'ccp-03-v1' // or similar
}
```

### 3. Testing

Every CCP must have:
- Unit tests for core logic
- Integration tests for API endpoints
- Contract validation tests (verify shape)
- Error handling tests
- Audit event tests (if applicable)

### 4. Documentation

Each CCP should document:
- Purpose and use cases
- Request/response shapes with examples
- Error codes and messages
- Integration points
- Testing patterns
- Future enhancements

### 5. Error Handling

Consistent error response format:
```typescript
{
  ok: false,
  error: string | { code: string, message: string }
}
```

### 6. Audit Events

For operations that modify state or have compliance implications:
```typescript
emitAuditEvent({
  type: 'resource.action',
  actor: { actor_type, actor_id, account_id },
  report_id: '...',
  request_id: '...',
  payload: { ... }
});
```

## CCP Relationships

```
┌─────────────┐
│   CCP-00    │
│  Bootstrap  │  Provides: User, Account, Entitlements
└──────┬──────┘
       │
       ▼
┌─────────────┐      ┌─────────────┐
│   CCP-01    │──────│   CCP-03    │
│  Location   │      │   Report    │
│  Resolution │──────│  Creation   │
└─────────────┘      └─────────────┘
     │                      │
     │ Input: Address       │ Input: Parcel Context
     │ Output: Parcels      │ Output: Report Skeleton
     └──────────────────────┘
```

**Flow:**
1. User authenticates → CCP-00 bootstrap returns account context
2. User enters location → CCP-01 resolves to parcel features
3. Parcel features → CCP-03 creates structured report
4. Report → Template system renders final output

## Future CCPs

Planned coordinated contract patterns:

### CCP-04: Evidence Attachment
Attach evidence items to report sections.

### CCP-05: Report Finalization
Mark reports as complete and trigger downstream workflows.

### CCP-06: Subscription Management
Handle plan changes, upgrades, downgrades via Stripe integration.

## Migration Guide

When creating a new CCP version:

1. **Create new version constant:**
   ```typescript
   export type CCP03Version = 'ccp-03-v1' | 'ccp-03-v2';
   ```

2. **Implement new version handler:**
   ```typescript
   if (req.version === 'ccp-03-v2') {
     return handleV2(req);
   }
   return handleV1(req);
   ```

3. **Maintain old version for 6 months minimum**

4. **Document deprecation timeline:**
   ```typescript
   /**
    * @deprecated Use ccp-03-v2 instead. Support ends 2026-07-01.
    */
   ```

5. **Update tests for both versions**

6. **Communicate changes to consumers**

## Resources

- [Parcel Preview CCP Documentation](./PARCEL_PREVIEW_CCP.md)
- [API Reference](#) (TODO)
- [Testing Guide](#) (TODO)
- [Deployment Guide](#) (TODO)

## Support

For questions or issues:
1. Check the CCP-specific documentation
2. Review test files for usage examples
3. Open an issue on GitHub
4. Contact the development team

---

**Last Updated:** 2026-01-10
**Maintainer:** Development Team
