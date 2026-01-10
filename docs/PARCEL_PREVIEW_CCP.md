# Parcel Preview CCP Documentation

## Overview

The **Parcel Preview CCP** (Coordinated Contract Pattern) is a frozen contract system that transforms parcel data into structured report contexts for downstream consumption (e.g., Builder.io templates). This documentation covers the complete implementation, including data flow, testing patterns, and integration points.

## What is CCP-03?

CCP-03 (also known as the Parcel Preview CCP) is a standardized contract for:
1. Accepting parcel context data (geographic features with lat/lng coordinates)
2. Projecting that data into a frozen, deterministic report structure
3. Generating audit events for tracking
4. Returning a structured report skeleton ready for template rendering

## Architecture

### Key Components

```
┌─────────────────┐
│  Client/API     │
│   Consumer      │
└────────┬────────┘
         │
         ▼
┌────────────────────────────────┐
│ POST /api/report/create        │
│  - Validates request           │
│  - Calls projection            │
│  - Creates report skeleton     │
│  - Emits audit events          │
└────────┬───────────────────────┘
         │
         ▼
┌────────────────────────────────┐
│ projectParcelToReportContext   │
│  - Accepts ParcelContext       │
│  - Computes bbox & center      │
│  - Returns ReportContext       │
└────────┬───────────────────────┘
         │
         ▼
┌────────────────────────────────┐
│ createReportSkeleton           │
│  - Creates frozen sections     │
│  - Attaches metadata           │
│  - Returns Report object       │
└────────────────────────────────┘
```

## Core Files

### 1. `/lib/contracts/parcel-to-report.ts`

**Purpose:** Project parcel data into a frozen report context.

**Key Types:**
```typescript
export type ParcelFeature = {
  id?: string;
  lat?: number;
  lng?: number;
  [key: string]: any;
};

export type ParcelContext = ParcelFeature[];
```

**Main Function:**
```typescript
export function projectParcelToReportContext(
  parcel: ParcelContext, 
  intent: Record<string, any>
): ReportContext
```

**What it does:**
- Accepts an array of parcel features (or a single feature)
- Computes aggregate statistics:
  - `count`: Number of parcels
  - `bbox`: Bounding box [minLng, minLat, maxLng, maxLat]
  - `center`: Geographic center point {lat, lng}
  - `sample`: First parcel in the array
- Returns a frozen `ReportContext` object

**Why it's minimal and deterministic:**
- Downstream consumers (templates) rely on a stable shape
- No arbitrary logic or external dependencies
- Predictable output for testing

### 2. `/lib/contracts/report.schema.ts`

**Purpose:** Define the frozen report structure and create report skeletons.

**Key Types:**
```typescript
export type ReportVersion = 'rpt-0.1';

export type Report = {
  id?: string;
  report_id: string;
  request_id?: string | null;
  version: ReportVersion;
  status?: string;
  created_at?: string;
  sections: ReportSection[];
  context?: Record<string, any> | null;
};

export type ReportSection = {
  id?: string;
  type: 'overview' | 'restrictions' | 'process' | 'deadlines' | 'risks' | 'sources';
  title?: string;
  blocks: Block[];
};
```

**Main Function:**
```typescript
export function createReportSkeleton(
  report_id: string,
  request_id?: string | null,
  context?: Record<string, any>
): Report
```

**What it does:**
- Creates a report with 6 predefined sections (overview, restrictions, process, deadlines, risks, sources)
- Each section starts with empty blocks (except sources, which has an empty evidence_list)
- Attaches metadata: ID, version, timestamp, context
- Returns a complete but unpopulated report structure

**Section Types:**
- `overview`: Executive summary or introduction
- `restrictions`: Zoning, easements, or regulatory constraints
- `process`: Steps or workflow information
- `deadlines`: Time-sensitive requirements
- `risks`: Potential issues or concerns
- `sources`: Evidence list (citations, references)

### 3. `/lib/contracts/auditEvent.schema.ts`

**Purpose:** Define and create audit events for tracking.

**Key Types:**
```typescript
export type Actor = {
  actor_type: string; // 'user' | 'system'
  actor_id?: string | null;
  account_id?: string | null;
};

export type AuditEvent = {
  id?: string;
  type: string; // e.g. 'report.created'
  created_at: string;
  actor?: Actor | null;
  report_id?: string | null;
  request_id?: string | null;
  payload?: Record<string, any> | null;
};
```

**Main Function:**
```typescript
export function makeAuditEvent(params: {...}): AuditEvent
```

**What it does:**
- Generates a unique event ID
- Captures timestamp
- Records actor, report_id, request_id, and additional payload
- Used for compliance, debugging, and analytics

### 4. `/lib/contracts/ccp03.ts`

**Purpose:** Parse and normalize CCP-03 records.

**Key Function:**
```typescript
export function parse(input: any): Ccp03Record
```

**What it does:**
- Normalizes various ID fields (id, gid, uuid, or fallback to lat:lng)
- Extracts lat/lng coordinates
- Handles nested payload structures
- Returns a standardized record shape

**Used by:** Location resolution and parcel ingestion systems.

### 5. `/app/api/report/create/route.ts`

**Purpose:** API endpoint for creating reports from parcel context.

**Endpoint:** `POST /api/report/create`

**Request Body:**
```typescript
{
  parcel_context: ParcelContext;  // Required: array of parcels
  intent: string | object;        // Required: purpose or mode
  report_id?: string;             // Optional: custom ID
  request_id?: string;            // Optional: correlation ID
}
```

**Response:**
```typescript
{
  ok: true,
  report: Report
}
```

**Error Responses:**
- `400` - Invalid JSON or missing `parcel_context`
  ```json
  { "ok": false, "error": "REPORT_CREATE_CONTRACT", "code": "MISSING_PARCEL" }
  ```
- `422` - Missing `intent`
  ```json
  { "ok": false, "error": { "code": "MISSING_INTENT", "message": "..." } }
  ```
- `500` - Internal error
  ```json
  { "ok": false, "error": { "code": "REPORT_CREATE_FAILED", "message": "..." } }
  ```

**Flow:**
1. Parse and validate request body
2. Check for `parcel_context` (required)
3. Check for `intent` (required)
4. Call `projectParcelToReportContext(parcel_context, intent)`
5. Call `createReportSkeleton(report_id, request_id, context)`
6. Emit audit event: `report.created`
7. Return report with CORS headers

**CORS Support:**
- Reads `CORS_ALLOWED_ORIGINS` from environment
- Supports wildcard `*` or comma-separated list
- Responds to `OPTIONS` preflight requests

**Audit Event:**
- Type: `report.created`
- Stored in: `globalThis.__AUDIT_EVENTS` (in-memory for testing)
- Production: Should be replaced with database or logging service

## Data Flow

### Complete Request Flow

```
1. Client sends POST to /api/report/create
   ↓
2. Validate JSON body
   ↓
3. Check parcel_context exists (return 400 if missing)
   ↓
4. Check intent exists (return 422 if missing)
   ↓
5. projectParcelToReportContext(parcel_context, intent)
   └─> Compute: count, bbox, center, sample
   └─> Return: { intent, parcel_summary, parcels }
   ↓
6. createReportSkeleton(report_id, request_id, context)
   └─> Create 6 empty sections
   └─> Return: Report with metadata
   ↓
7. emitAuditEvent({ type: 'report.created', ... })
   └─> Store in globalThis.__AUDIT_EVENTS
   ↓
8. Return { ok: true, report }
```

### Example Transformation

**Input (parcel_context):**
```json
[
  { "id": "1", "lat": 39.7392, "lng": -105.0844, "note": "smoke" },
  { "id": "2", "lat": 39.7400, "lng": -105.0850, "note": "test" }
]
```

**Intermediate (ReportContext):**
```json
{
  "intent": { "mode": "arc_viability" },
  "parcel_summary": {
    "count": 2,
    "bbox": [-105.0850, 39.7392, -105.0844, 39.7400],
    "center": { "lat": 39.7396, "lng": -105.0847 },
    "sample": { "id": "1", "lat": 39.7392, "lng": -105.0844, "note": "smoke" }
  },
  "parcels": [
    { "id": "1", "lat": 39.7392, "lng": -105.0844, "note": "smoke" },
    { "id": "2", "lat": 39.7400, "lng": -105.0850, "note": "test" }
  ]
}
```

**Output (Report):**
```json
{
  "id": "rpt_123",
  "report_id": "rpt_123",
  "request_id": "req_456",
  "version": "rpt-0.1",
  "status": "created",
  "created_at": "2026-01-10T04:00:00.000Z",
  "sections": [
    { "type": "overview", "blocks": [] },
    { "type": "restrictions", "blocks": [] },
    { "type": "process", "blocks": [] },
    { "type": "deadlines", "blocks": [] },
    { "type": "risks", "blocks": [] },
    { "type": "sources", "blocks": [{ "type": "evidence_list", "items": [] }] }
  ],
  "context": {
    "intent": { "mode": "arc_viability" },
    "parcel_summary": { ... },
    "parcels": [ ... ]
  }
}
```

## Testing Patterns

### Test Files

1. **`/app/api/report/create/route.test.ts`** - API endpoint tests with CCP-03 focus
2. **`/__tests__/report.create.test.ts`** - Integration tests for report creation

### Test Structure

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { POST } from './route';

describe("CCP-03 audit emission", () => {
  beforeEach(() => {
    // Reset audit sink before each test
    (globalThis as any).__AUDIT_EVENTS = [];
  });

  it("emits report_created audit event on success", async () => {
    const req = makeReq({ parcel_context, intent, report_id, request_id });
    const res = await POST(req);
    
    expect(res.status).toBe(200);
    
    const events = (globalThis as any).__AUDIT_EVENTS;
    expect(events.length).toBeGreaterThan(0);
    
    const created = events.find(e => e.type === "report.created");
    expect(created).toBeDefined();
    expect(created.report_id).toBe(report_id);
  });
});
```

### Key Testing Principles

1. **Frozen Contracts:** Tests verify exact response shape doesn't change
2. **Audit Behavior:** Tests verify audit events are emitted correctly
3. **Error Handling:** Tests verify all error codes and messages
4. **CORS:** Tests verify headers are set correctly
5. **Idempotency:** Same input produces same output

### Test Fixtures

**`/lib/contracts/ccp03.fixture.ts`:**
```typescript
export const PCX_FIXTURE = [
  {
    id: '1',
    lat: 39.7392,
    lng: -105.0844,
    note: 'smoke',
  },
];
```

Used across tests to ensure consistency.

### Testing Checklist

- [ ] Valid request creates report with correct structure
- [ ] Missing `parcel_context` returns 400 with MISSING_PARCEL code
- [ ] Missing `intent` returns 422 with MISSING_INTENT code
- [ ] Invalid JSON returns 400 with BAD_JSON error
- [ ] Audit event is emitted with correct data
- [ ] Audit event is NOT emitted on validation failure
- [ ] CORS headers are set correctly
- [ ] Response includes all required fields
- [ ] Report sections match frozen schema
- [ ] Context is attached to report

## Integration Points

### 1. Location Resolution (CCP-01)

**File:** `/app/api/location/resolve/route.ts`

**Related CCP:**
- CCP-01 resolves geographic locations
- Output can be used as input to CCP-03 (parcel context)

**Flow:**
```
Location Input → CCP-01 → Parcel Features → CCP-03 → Report
```

### 2. Bootstrap Endpoint (CCP-00)

**File:** `/app/api/session/bootstrap/route.ts`

**Comment in queries.ts:**
```typescript
// Temporary stand-in until CCP-00 account tables exist
```

**Relationship:**
- CCP-00 provides account/entitlement context
- Future: CCP-03 will respect account-level permissions
- Future: Report generation may be gated by entitlements

### 3. Audit System

**Current:** In-memory `globalThis.__AUDIT_EVENTS`

**Future Integration:**
- Database: Store events in audit_events table
- Streaming: Send to logging service (e.g., Datadog, CloudWatch)
- Analytics: Feed into analytics pipeline

### 4. Template Rendering

**Downstream Consumer:** Builder.io or similar template systems

**How it works:**
- CCP-03 produces a frozen report structure
- Templates expect exact section types
- Templates populate blocks based on context data
- Parcel summary provides map data for visualizations

## Environment Configuration

### Required Variables

```bash
# CORS configuration
CORS_ALLOWED_ORIGINS=*  # or "https://app.example.com,https://dashboard.example.com"
```

### Optional Variables

None currently, but future enhancements may include:
- `AUDIT_EVENTS_TABLE` - Database table for audit events
- `REPORT_STORAGE_BUCKET` - S3 bucket for report artifacts
- `MAX_PARCEL_COUNT` - Limit on parcels per report

## Common Patterns

### 1. Creating a Report

```typescript
const response = await fetch('/api/report/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    parcel_context: [
      { id: 'p1', lat: 39.7392, lng: -105.0844 }
    ],
    intent: { mode: 'arc_viability' },
    report_id: 'rpt_custom_id',
    request_id: 'req_correlation_id'
  })
});

const data = await response.json();
if (data.ok) {
  console.log('Report created:', data.report);
}
```

### 2. Handling Errors

```typescript
const response = await fetch('/api/report/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ intent: 'missing_parcel' })
});

const data = await response.json();
if (!data.ok) {
  // Check specific error codes
  if (data.code === 'MISSING_PARCEL') {
    console.error('Parcel context is required');
  } else if (data.error?.code === 'MISSING_INTENT') {
    console.error('Intent is required');
  }
}
```

### 3. Testing with Fixtures

```typescript
import { PCX_FIXTURE } from '@/lib/contracts/ccp03.fixture';

const req = new Request('http://localhost/api/report/create', {
  method: 'POST',
  body: JSON.stringify({
    parcel_context: PCX_FIXTURE,
    intent: { mode: 'test' }
  })
});

const response = await POST(req);
// ... assertions
```

## Future Enhancements

### Planned

1. **Database Integration**
   - Store reports in database
   - Persist audit events
   - Query reports by ID

2. **Authorization**
   - Check account entitlements
   - Rate limiting per account
   - Report size limits by plan tier

3. **Template Population**
   - Auto-populate sections based on parcel data
   - Integration with AI assistant for content generation
   - Evidence list auto-population from data sources

4. **Advanced Analytics**
   - Aggregate parcel statistics
   - Historical trend analysis
   - Comparative reporting

### Not Planned (Out of Scope)

- Modifying the frozen contract shape (breaking change)
- Direct database writes from report endpoint (separation of concerns)
- Real-time streaming updates (use webhooks instead)

## Troubleshooting

### Issue: CORS errors in browser

**Solution:** Configure `CORS_ALLOWED_ORIGINS` environment variable:
```bash
CORS_ALLOWED_ORIGINS=https://your-frontend.com
```

### Issue: Audit events not appearing

**Check:**
1. Is `(globalThis as any).__AUDIT_EVENTS` initialized?
2. Did the request succeed (audit events only emit on success)?
3. Are you checking in the same process (in-memory storage)?

### Issue: Report sections are empty

**Expected behavior:** Report skeleton is intentionally empty. Downstream consumers populate sections based on `context` data.

### Issue: Parcel bbox is null

**Check:**
1. Do parcels have valid `lat` and `lng` numbers?
2. Are values finite (not NaN or Infinity)?

**Example fix:**
```typescript
const parcel = { id: '1', lat: parseFloat('39.7392'), lng: parseFloat('-105.0844') };
```

## Maintenance

### Contract Stability

The Parcel Preview CCP (CCP-03) is a **frozen contract**. This means:

- **DO NOT** change the shape of `ReportContext` or `Report`
- **DO NOT** remove or rename section types
- **DO NOT** modify error response structures
- **DO** add optional fields if needed (but avoid it)
- **DO** create new versions (e.g., rpt-0.2) if breaking changes are required

### Testing Requirements

When modifying related code:

1. Run existing tests: `pnpm test`
2. Verify no test failures
3. Add new tests for new functionality
4. Update this documentation if behavior changes

### Version History

- **rpt-0.1** (2026-01-10): Initial implementation with 6 section types

## Summary

The Parcel Preview CCP provides:
✅ Frozen contract for parcel-to-report transformation
✅ Deterministic projection with bbox/center computation
✅ Structured report skeleton for template consumption
✅ Audit event emission for tracking
✅ CORS-enabled API endpoint
✅ Comprehensive test coverage
✅ Clear error handling

This system enables reliable, testable report generation with a stable API contract that downstream consumers can depend on.
