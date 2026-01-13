# Parcel Preview CCP (Component Communication Pattern) - Analysis

## Overview

The **Parcel Preview CCP** is a component communication pattern implemented in this codebase to handle geospatial parcel data and transform it into structured reports. This system uses a series of contracts (CCP-00, CCP-01, CCP-03) to ensure consistent data shapes across different components and APIs.

## What is CCP?

**CCP** stands for **Component Communication Pattern** - a contract-based approach to ensure type safety and predictable data structures when components communicate with each other. The system uses "frozen" contracts, meaning the data shapes are intentionally minimal and deterministic.

## Key Components

### 1. CCP-03: Parcel Record Contract (`lib/contracts/ccp03.ts`)

This is the core parcel data contract that defines the structure of a parcel feature.

**Type Definition:**
```typescript
export type Ccp03Record = {
  id: string;
  lat?: number;
  lng?: number;
  note?: string;
  [key: string]: any;
};
```

**Parser Function:**
```typescript
export function parse(input: any): Ccp03Record
```

**Key Features:**
- Flexible ID generation: Uses `input.id`, `input.gid`, `input.uuid`, or generates from coordinates
- Extracts latitude and longitude with proper type coercion
- Supports nested payload structures with note extraction
- Allows additional arbitrary properties via index signature

**Usage Example:**
```typescript
const parcel = parse({
  id: '1',
  lat: 39.7392,
  lng: -105.0844,
  note: 'smoke'
});
```

### 2. Parcel-to-Report Transformation (`lib/contracts/parcel-to-report.ts`)

This module projects parcel context into a frozen report context shape.

**Types:**
```typescript
export type ParcelFeature = {
  id?: string;
  lat?: number;
  lng?: number;
  [key: string]: any;
};

export type ParcelContext = ParcelFeature[];
```

**Core Function:**
```typescript
export function projectParcelToReportContext(
  parcel: ParcelContext, 
  intent: Record<string, any>
): ReportContext
```

**What It Does:**
1. **Normalizes input**: Handles both array and single parcel objects
2. **Calculates statistics**:
   - Count of features
   - Bounding box (bbox) from coordinates
   - Center point calculation
3. **Returns frozen structure**:
   ```typescript
   {
     intent: { ...intent },
     parcel_summary: {
       count: number,
       bbox: [minLng, minLat, maxLng, maxLat] | null,
       center: { lat, lng } | null,
       sample: ParcelFeature | null
     },
     parcels: ParcelFeature[]
   }
   ```

**Design Philosophy:**
- **Minimal and deterministic**: The output shape is intentionally simple
- **Downstream compatibility**: Templates (e.g., Builder.io) can rely on this stable contract
- **Safe defaults**: Returns null for missing coordinate data

### 3. Report Schema (`lib/contracts/report.schema.ts`)

Defines the structure of generated reports.

**Report Structure:**
```typescript
export type Report = {
  id?: string;
  report_id: string;
  request_id?: string | null;
  version: ReportVersion;  // 'rpt-0.1'
  status?: string;
  created_at?: string;
  sections: ReportSection[];
  context?: Record<string, any> | null;
};
```

**Section Types:**
- `overview`: General overview information
- `restrictions`: Legal or regulatory restrictions
- `process`: Process descriptions
- `deadlines`: Important dates and deadlines
- `risks`: Risk assessments
- `sources`: Evidence and citations (includes `evidence_list` block)

**Block Types:**
- `evidence_list`: Contains array of evidence items
- `paragraph`: Text content blocks
- Custom blocks via base type extension

### 4. Audit Event Schema (`lib/contracts/auditEvent.schema.ts`)

Tracks system events for compliance and debugging.

**Structure:**
```typescript
export type AuditEvent = {
  id?: string;
  type: string;  // e.g., 'report.created'
  created_at: string;  // ISO timestamp
  actor?: Actor | null;
  report_id?: string | null;
  request_id?: string | null;
  payload?: Record<string, any> | null;
};
```

**Actor Type:**
```typescript
export type Actor = {
  actor_type: string;  // 'user' | 'system'
  actor_id?: string | null;
  account_id?: string | null;
};
```

## API Implementation

### `/api/report/create` Endpoint

**Purpose:** Creates a report from parcel context data

**Request Body:**
```typescript
{
  parcel_context: Record<string, any>;  // Required
  intent: string;                        // Required
  report_id?: string;                    // Optional
  request_id?: string;                   // Optional
}
```

**Flow:**
1. **Validate input**: Checks for valid JSON and required fields
2. **Contract validation**: Ensures `parcel_context` exists
3. **Transform data**: Uses `projectParcelToReportContext` to create report context
4. **Create report**: Calls `createReportSkeleton` with transformed context
5. **Emit audit event**: Logs `report.created` event
6. **Return response**:
   ```typescript
   {
     ok: true,
     report: Report
   }
   ```

**Error Codes:**
- `BAD_JSON`: Invalid JSON in request body
- `INVALID_BODY`: Body is not an object
- `REPORT_CREATE_CONTRACT`: Missing `parcel_context` (error code: `MISSING_PARCEL`)
- `MISSING_INTENT`: No intent provided
- `REPORT_CREATE_FAILED`: Internal server error

**CORS Support:**
- Reads `CORS_ALLOWED_ORIGINS` environment variable
- Supports wildcard (`*`) or comma-separated origin list
- Handles preflight OPTIONS requests

### `/api/location/resolve` Endpoint (CCP-01)

Another contract example in the system:

**Purpose:** Resolves location data with frozen CCP-01 response shape

**Response Contract:**
```typescript
{
  ok: true,
  data: {
    location_id: string,
    geometry: GeoJSON.Point,
    confidence: number,
    method: string,
    provider: string | null,
    source: string,
    resolved_at: string
  }
}
```

## Testing Patterns

### Unit Tests

**CCP-03 Parser Test** (`__tests__/ccp03.report.test.ts`):
```typescript
describe('ccp03 contract', () => {
  it('parses fixture', () => {
    const out = parse(ccp03Fixture[0]);
    expect(out).toHaveProperty('id');
    expect(out.lat).toBeCloseTo(39.7392);
    expect(out.lng).toBeCloseTo(-105.0844);
    expect(out.note).toBe('smoke');
  });
});
```

### Integration Tests

**Report Creation Test** (`__tests__/report.create.test.ts`):
- Tests successful report creation
- Validates audit event emission
- Checks contract validation (missing fields)

**CCP-03 Audit Tests** (`app/api/report/create/route.test.ts`):
- **Audit emission**: Verifies `report.created` event with correct IDs
- **Audit behavior**: Ensures no events on contract failures

## Test Fixtures

**CCP-03 Fixture** (`lib/contracts/ccp03.fixture.ts`):
```typescript
export const ccp03Fixture = [
  {
    id: '1',
    lat: 39.7392,
    lng: -105.0844,
    note: 'smoke',
  },
];

export const PCX_FIXTURE = ccp03Fixture;
```

This fixture represents a location near Denver, Colorado.

## Data Flow Architecture

```
┌─────────────────┐
│ Client Request  │
│  (parcel data)  │
└────────┬────────┘
         │
         v
┌─────────────────────────┐
│ /api/report/create      │
│  - Validates JSON       │
│  - Checks contracts     │
└────────┬────────────────┘
         │
         v
┌────────────────────────────────┐
│ projectParcelToReportContext   │
│  - Normalizes parcels          │
│  - Calculates bbox/center      │
│  - Creates frozen structure    │
└────────┬───────────────────────┘
         │
         v
┌─────────────────────────┐
│ createReportSkeleton    │
│  - Builds report        │
│  - Adds sections        │
│  - Sets metadata        │
└────────┬────────────────┘
         │
         v
┌─────────────────────────┐
│ Emit Audit Event        │
│  - report.created       │
│  - Store in global sink │
└────────┬────────────────┘
         │
         v
┌─────────────────────────┐
│ Return Report           │
│  { ok: true, report }   │
└─────────────────────────┘
```

## Design Principles

### 1. Frozen Contracts
Contracts are intentionally minimal and stable. They define exactly what consumers can expect, nothing more.

### 2. Deterministic Transformations
Data transformations are pure functions with predictable outputs for given inputs.

### 3. Safe Defaults
Missing or invalid data results in null/undefined rather than errors, allowing graceful degradation.

### 4. Audit Trail
All significant operations emit audit events for compliance and debugging.

### 5. CORS-Aware
APIs support cross-origin requests with configurable security.

## Integration Points

### CCP-00: Bootstrap/Account
Referenced in:
- `app/api/session/bootstrap/route.ts`: Anonymous bootstrap allowed
- `lib/db/queries.ts`: Temporary stand-in until CCP-00 account tables exist

### CCP-01: Location Resolution
Implemented in:
- `app/api/location/resolve/route.ts`
- Tests in `app/api/location/resolve/route.test.ts`

### CCP-03: Parcel Preview
Implemented across:
- Contract definition: `lib/contracts/ccp03.ts`
- Transformation: `lib/contracts/parcel-to-report.ts`
- Report creation: `lib/contracts/report.schema.ts`
- API endpoint: `app/api/report/create/route.ts`

## Environment Configuration

**CORS Configuration:**
```bash
# .env
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
# or
CORS_ALLOWED_ORIGINS=*
```

## Future Enhancements

Based on code comments:

1. **CCP-00 Account Tables**: Full account/team management with Supabase
2. **Enhanced Preview Features**: Additional parcel metadata and visualization
3. **Builder.io Integration**: Template rendering for reports
4. **Stripe Integration**: Subscription management for report generation
5. **Real Audit Persistence**: Move from global sink to database storage

## Key Takeaways

The Parcel Preview CCP system demonstrates:

✅ **Contract-First Design**: All data shapes are defined upfront
✅ **Type Safety**: TypeScript ensures compile-time correctness
✅ **Testing Coverage**: Unit and integration tests validate contracts
✅ **Audit Compliance**: All operations are logged
✅ **API Stability**: Frozen contracts prevent breaking changes
✅ **Geospatial Support**: Built-in coordinate handling and bbox calculation
✅ **Extensibility**: Index signatures allow future enhancements

## Related Files

- `lib/contracts/ccp03.ts` - Core CCP-03 contract
- `lib/contracts/ccp03.fixture.ts` - Test fixtures
- `lib/contracts/parcel-to-report.ts` - Transformation logic
- `lib/contracts/report.schema.ts` - Report structure
- `lib/contracts/auditEvent.schema.ts` - Audit events
- `app/api/report/create/route.ts` - Report creation API
- `__tests__/ccp03.report.test.ts` - Contract tests
- `__tests__/report.create.test.ts` - Integration tests
- `app/api/report/create/route.test.ts` - API tests

---

**Generated:** 2026-01-10
**Version:** Based on commit a39d3b2 (CCP-03 implementation)
