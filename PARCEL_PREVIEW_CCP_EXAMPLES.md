# Parcel Preview CCP - Usage Examples

This document provides practical examples of how to use the Parcel Preview CCP (Component Communication Pattern) system.

## Table of Contents
1. [Basic Parcel Parsing](#basic-parcel-parsing)
2. [Creating Reports from Parcels](#creating-reports-from-parcels)
3. [API Usage](#api-usage)
4. [Testing Patterns](#testing-patterns)

---

## Basic Parcel Parsing

### Example 1: Parse a Simple Parcel

```typescript
import { parse } from './lib/contracts/ccp03';

// Input: Basic parcel with coordinates
const input = {
  id: 'parcel-001',
  lat: 39.7392,
  lng: -105.0844,
  note: 'Commercial property'
};

const parcel = parse(input);
console.log(parcel);
// Output:
// {
//   id: 'parcel-001',
//   lat: 39.7392,
//   lng: -105.0844,
//   note: 'Commercial property'
// }
```

### Example 2: Parse with Alternative ID Fields

The parser intelligently handles different ID field names:

```typescript
import { parse } from './lib/contracts/ccp03';

// Using 'gid' instead of 'id'
const parcel1 = parse({
  gid: 'geo-123',
  lat: 40.7128,
  lng: -74.0060
});
// Result: { id: 'geo-123', lat: 40.7128, lng: -74.0060 }

// Using 'uuid' instead of 'id'
const parcel2 = parse({
  uuid: 'abc-def-ghi',
  lat: 34.0522,
  lng: -118.2437
});
// Result: { id: 'abc-def-ghi', lat: 34.0522, lng: -118.2437 }

// No ID field - generates from coordinates
const parcel3 = parse({
  lat: 51.5074,
  lng: -0.1278
});
// Result: { id: '51.5074:-0.1278', lat: 51.5074, lng: -0.1278 }
```

### Example 3: Parse with Nested Payload

```typescript
import { parse } from './lib/contracts/ccp03';

const input = {
  id: 'parcel-002',
  lat: 37.7749,
  lng: -122.4194,
  payload: {
    note: 'Historical landmark',
    zoning: 'residential',
    area_sqft: 5000
  }
};

const parcel = parse(input);
console.log(parcel);
// Output:
// {
//   id: 'parcel-002',
//   lat: 37.7749,
//   lng: -122.4194,
//   note: 'Historical landmark',  // Extracted from payload
//   zoning: 'residential',         // Spread from payload
//   area_sqft: 5000               // Spread from payload
// }
```

---

## Creating Reports from Parcels

### Example 4: Single Parcel to Report

```typescript
import { projectParcelToReportContext } from './lib/contracts/parcel-to-report';
import { createReportSkeleton } from './lib/contracts/report.schema';

// Single parcel
const parcel = {
  id: 'lot-42',
  lat: 39.7392,
  lng: -105.0844,
  address: '123 Main St'
};

const intent = {
  mode: 'arc_viability',
  purpose: 'Development feasibility study'
};

// Transform parcel to report context
const context = projectParcelToReportContext([parcel], intent);

console.log(context);
// Output:
// {
//   intent: { mode: 'arc_viability', purpose: 'Development feasibility study' },
//   parcel_summary: {
//     count: 1,
//     bbox: [-105.0844, 39.7392, -105.0844, 39.7392],
//     center: { lat: 39.7392, lng: -105.0844 },
//     sample: { id: 'lot-42', lat: 39.7392, lng: -105.0844, address: '123 Main St' }
//   },
//   parcels: [{ id: 'lot-42', lat: 39.7392, lng: -105.0844, address: '123 Main St' }]
// }

// Create report skeleton
const report = createReportSkeleton('report-001', 'request-001', context);
console.log(report.sections.length); // 6 sections: overview, restrictions, process, deadlines, risks, sources
```

### Example 5: Multiple Parcels with Bounding Box Calculation

```typescript
import { projectParcelToReportContext } from './lib/contracts/parcel-to-report';

const parcels = [
  { id: 'p1', lat: 39.7392, lng: -105.0844 }, // Denver
  { id: 'p2', lat: 40.7128, lng: -74.0060 },  // New York
  { id: 'p3', lat: 34.0522, lng: -118.2437 }  // Los Angeles
];

const context = projectParcelToReportContext(parcels, { mode: 'multi_site_analysis' });

console.log(context.parcel_summary);
// Output:
// {
//   count: 3,
//   bbox: [-118.2437, 34.0522, -74.0060, 40.7128],  // [minLng, minLat, maxLng, maxLat]
//   center: { lat: 37.3147, lng: -96.1249 },         // Approximate center
//   sample: { id: 'p1', lat: 39.7392, lng: -105.0844 }
// }
```

### Example 6: Handling Parcels Without Coordinates

```typescript
import { projectParcelToReportContext } from './lib/contracts/parcel-to-report';

const parcels = [
  { id: 'p1', address: '123 Main St' },  // No coordinates
  { id: 'p2', address: '456 Oak Ave' }   // No coordinates
];

const context = projectParcelToReportContext(parcels, { mode: 'address_lookup' });

console.log(context.parcel_summary);
// Output:
// {
//   count: 2,
//   bbox: null,     // No valid coordinates
//   center: null,   // No valid coordinates
//   sample: { id: 'p1', address: '123 Main St' }
// }
```

---

## API Usage

### Example 7: Create Report via API

```javascript
// Client-side request
const response = await fetch('http://localhost:3000/api/report/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    parcel_context: [
      {
        id: 'parcel-001',
        lat: 39.7392,
        lng: -105.0844,
        note: 'Site for new development'
      }
    ],
    intent: {
      mode: 'arc_viability',
      requester: 'john@example.com'
    },
    report_id: 'report-2026-001',
    request_id: 'req-abc-123'
  })
});

const result = await response.json();

if (result.ok) {
  console.log('Report created:', result.report);
  // Access report sections
  console.log('Overview:', result.report.sections[0]);
  console.log('Context:', result.report.context);
} else {
  console.error('Error:', result.error);
}
```

### Example 8: Handle API Errors

```javascript
async function createReport(parcelData) {
  try {
    const response = await fetch('http://localhost:3000/api/report/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parcel_context: parcelData,
        intent: 'investigation'
      })
    });

    const result = await response.json();

    if (!result.ok) {
      switch (result.error.code || result.code) {
        case 'MISSING_PARCEL':
          console.error('Parcel context is required');
          break;
        case 'MISSING_INTENT':
          console.error('Intent is required');
          break;
        case 'BAD_JSON':
          console.error('Invalid JSON in request');
          break;
        default:
          console.error('Unknown error:', result.error);
      }
      return null;
    }

    return result.report;
  } catch (error) {
    console.error('Network error:', error);
    return null;
  }
}

// Usage
const report = await createReport([
  { id: '1', lat: 39.7392, lng: -105.0844 }
]);
```

### Example 9: CORS Configuration

```bash
# .env file

# Allow specific origins
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://app.example.com,https://staging.example.com

# Or allow all origins (development only!)
CORS_ALLOWED_ORIGINS=*
```

```javascript
// Cross-origin request with credentials
const response = await fetch('https://api.example.com/api/report/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-token-here'
  },
  credentials: 'include',  // Include cookies
  body: JSON.stringify({
    parcel_context: parcelData,
    intent: 'investigation'
  })
});
```

---

## Testing Patterns

### Example 10: Unit Test for CCP-03 Parser

```typescript
import { describe, it, expect } from 'vitest';
import { parse } from '../lib/contracts/ccp03';

describe('CCP-03 Parser', () => {
  it('parses basic parcel data', () => {
    const input = {
      id: 'test-1',
      lat: 39.7392,
      lng: -105.0844,
      note: 'Test parcel'
    };

    const result = parse(input);

    expect(result.id).toBe('test-1');
    expect(result.lat).toBeCloseTo(39.7392);
    expect(result.lng).toBeCloseTo(-105.0844);
    expect(result.note).toBe('Test parcel');
  });

  it('handles missing coordinates', () => {
    const input = { id: 'no-coords' };
    const result = parse(input);

    expect(result.id).toBe('no-coords');
    expect(result.lat).toBeUndefined();
    expect(result.lng).toBeUndefined();
  });

  it('extracts note from nested payload', () => {
    const input = {
      id: 'nested',
      payload: { note: 'From payload' }
    };

    const result = parse(input);
    expect(result.note).toBe('From payload');
  });
});
```

### Example 11: Integration Test for Report Creation

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { POST } from '../app/api/report/create/route';

describe('Report Creation API', () => {
  beforeEach(() => {
    // Clear audit events
    (globalThis as any).__AUDIT_EVENTS = [];
  });

  it('creates report with audit event', async () => {
    const req = new Request('http://localhost/api/report/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parcel_context: [
          { id: '1', lat: 39.7392, lng: -105.0844 }
        ],
        intent: 'test_intent',
        report_id: 'test-report-001',
        request_id: 'test-request-001'
      })
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.report.id).toBe('test-report-001');
    expect(json.report.sections).toHaveLength(6);

    // Verify audit event
    const events = (globalThis as any).__AUDIT_EVENTS;
    expect(events.length).toBeGreaterThan(0);

    const createdEvent = events.find((e: any) => e.type === 'report.created');
    expect(createdEvent).toBeDefined();
    expect(createdEvent.report_id).toBe('test-report-001');
  });

  it('rejects request with missing parcel_context', async () => {
    const req = new Request('http://localhost/api/report/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intent: 'test_intent'
        // parcel_context missing
      })
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.error).toBe('REPORT_CREATE_CONTRACT');
    expect(json.code).toBe('MISSING_PARCEL');
  });
});
```

### Example 12: Test Fixtures

```typescript
// Fixture definition in lib/contracts/ccp03.fixture.ts
export const ccp03Fixture = [
  {
    id: '1',
    lat: 39.7392,
    lng: -105.0844,
    note: 'smoke',
  },
];

// Use in tests with relative import from test files
import { ccp03Fixture } from '../lib/contracts/ccp03.fixture';

const testParcel = ccp03Fixture[0];
console.log(testParcel);
// { id: '1', lat: 39.7392, lng: -105.0844, note: 'smoke' }
```

---

## Advanced Usage

### Example 13: Custom Report Sections

```typescript
import { createReportSkeleton } from './lib/contracts/report.schema';

const context = projectParcelToReportContext(parcels, intent);
const report = createReportSkeleton('report-001', 'request-001', context);

// Add custom blocks to sections
report.sections[0].blocks.push({
  type: 'paragraph',
  text: 'This report analyzes the feasibility of developing the site.'
});

report.sections[5].blocks[0].items.push({
  source: 'County Records',
  date: '2026-01-10',
  url: 'https://records.example.com/12345'
});

console.log(report);
```

### Example 14: Audit Event Inspection

```typescript
import { makeAuditEvent } from './lib/contracts/auditEvent.schema';

// Create custom audit event
const event = makeAuditEvent({
  type: 'report.viewed',
  actor: {
    actor_type: 'user',
    actor_id: 'user-123',
    account_id: 'account-456'
  },
  report_id: 'report-001',
  request_id: 'request-001',
  payload: {
    viewer_ip: '192.168.1.1',
    user_agent: 'Mozilla/5.0...'
  }
});

console.log(event);
// {
//   id: '...',  // Auto-generated UUID
//   type: 'report.viewed',
//   created_at: '2026-01-10T12:34:56.789Z',
//   actor: { actor_type: 'user', actor_id: 'user-123', account_id: 'account-456' },
//   report_id: 'report-001',
//   request_id: 'request-001',
//   payload: { viewer_ip: '192.168.1.1', user_agent: 'Mozilla/5.0...' }
// }
```

---

## Quick Reference

### CCP-03 Parse Function Signature
```typescript
parse(input: any): Ccp03Record
```

### Project Parcel to Report Context Signature
```typescript
projectParcelToReportContext(
  parcel: ParcelContext,  // Array of ParcelFeature
  intent: Record<string, any>
): ReportContext
```

### Create Report Skeleton Signature
```typescript
createReportSkeleton(
  report_id: string,
  request_id?: string | null,
  context?: Record<string, any>
): Report
```

### Make Audit Event Signature
```typescript
makeAuditEvent(params: {
  type: string;
  actor?: Actor | null;
  report_id?: string | null;
  request_id?: string | null;
  payload?: Record<string, any> | null;
}): AuditEvent
```

---

## Common Patterns

### Pattern 1: Parcel Validation Pipeline
```typescript
function validateAndParseParcels(rawData: any[]): Ccp03Record[] {
  return rawData
    .filter(item => item && typeof item === 'object')
    .map(item => parse(item))
    .filter(parcel => parcel.lat !== undefined && parcel.lng !== undefined);
}
```

### Pattern 2: Report Generation Pipeline
```typescript
async function generateReport(parcels: any[], intent: any) {
  // 1. Parse parcels
  const parsed = parcels.map(parse);
  
  // 2. Transform to report context
  const context = projectParcelToReportContext(parsed, intent);
  
  // 3. Create report skeleton
  const reportId = `report-${Date.now()}`;
  const report = createReportSkeleton(reportId, null, context);
  
  // 4. Emit audit event
  const event = makeAuditEvent({
    type: 'report.created',
    report_id: reportId,
    payload: { intent }
  });
  
  return { report, event };
}
```

### Pattern 3: Error Handling Wrapper
```typescript
function safeProjectParcel(parcel: any, intent: any) {
  try {
    const parsed = parse(parcel);
    const context = projectParcelToReportContext([parsed], intent);
    return { success: true, context };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

---

## Resources

- Main analysis: [PARCEL_PREVIEW_CCP_ANALYSIS.md](./PARCEL_PREVIEW_CCP_ANALYSIS.md)
- Source files:
  - `lib/contracts/ccp03.ts`
  - `lib/contracts/parcel-to-report.ts`
  - `lib/contracts/report.schema.ts`
  - `lib/contracts/auditEvent.schema.ts`
  - `app/api/report/create/route.ts`

---

**Last Updated:** 2026-01-10
