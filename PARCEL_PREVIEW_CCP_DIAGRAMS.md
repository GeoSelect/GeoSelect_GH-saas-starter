# Parcel Preview CCP - Architecture Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CLIENT APPLICATION                               │
│  ┌────────────────┐    ┌────────────────┐    ┌────────────────┐        │
│  │  Web Frontend  │    │  Mobile App    │    │  External API  │        │
│  └────────┬───────┘    └────────┬───────┘    └────────┬───────┘        │
│           │                     │                      │                 │
└───────────┼─────────────────────┼──────────────────────┼─────────────────┘
            │                     │                      │
            └─────────────────────┴──────────────────────┘
                                  │
                                  │ HTTP POST
                                  │ { parcel_context, intent, ... }
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         API LAYER                                        │
│  ┌───────────────────────────────────────────────────────────┐          │
│  │  /api/report/create                                        │          │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │          │
│  │  │ CORS Handler │→ │ JSON Parser  │→ │  Validator   │    │          │
│  │  └──────────────┘  └──────────────┘  └──────┬───────┘    │          │
│  └──────────────────────────────────────────────┼────────────┘          │
│                                                  │                       │
└──────────────────────────────────────────────────┼───────────────────────┘
                                                   │
                                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      CONTRACT LAYER                                      │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────┐        │
│  │  CCP-03 Contract (lib/contracts/ccp03.ts)                   │        │
│  │  ┌────────────────────────────────────────────────────┐     │        │
│  │  │  parse(input: any): Ccp03Record                    │     │        │
│  │  │  ┌──────────────────────────────────────────────┐  │     │        │
│  │  │  │ • Normalize ID (id/gid/uuid/generated)       │  │     │        │
│  │  │  │ • Extract coordinates (lat, lng)             │  │     │        │
│  │  │  │ • Extract note (top-level or payload.note)   │  │     │        │
│  │  │  │ • Spread additional properties               │  │     │        │
│  │  │  └──────────────────────────────────────────────┘  │     │        │
│  │  └────────────────────────────────────────────────────┘     │        │
│  └─────────────────────────────────────────────────────────────┘        │
│                                     │                                    │
│                                     ▼                                    │
│  ┌─────────────────────────────────────────────────────────────┐        │
│  │  Parcel-to-Report Transform                                 │        │
│  │  (lib/contracts/parcel-to-report.ts)                        │        │
│  │  ┌────────────────────────────────────────────────────┐     │        │
│  │  │  projectParcelToReportContext()                    │     │        │
│  │  │  ┌──────────────────────────────────────────────┐  │     │        │
│  │  │  │ INPUT: ParcelContext (array of parcels)     │  │     │        │
│  │  │  │        intent (user/system intent object)    │  │     │        │
│  │  │  ├──────────────────────────────────────────────┤  │     │        │
│  │  │  │ PROCESS:                                     │  │     │        │
│  │  │  │ 1. Normalize to array                        │  │     │        │
│  │  │  │ 2. Count parcels                             │  │     │        │
│  │  │  │ 3. Extract all lat/lng values                │  │     │        │
│  │  │  │ 4. Calculate bounding box (bbox)             │  │     │        │
│  │  │  │    [minLng, minLat, maxLng, maxLat]         │  │     │        │
│  │  │  │ 5. Calculate center point                    │  │     │        │
│  │  │  │    { lat: avg, lng: avg }                    │  │     │        │
│  │  │  │ 6. Select sample (first parcel)              │  │     │        │
│  │  │  ├──────────────────────────────────────────────┤  │     │        │
│  │  │  │ OUTPUT: ReportContext                        │  │     │        │
│  │  │  │ {                                            │  │     │        │
│  │  │  │   intent: { ... },                          │  │     │        │
│  │  │  │   parcel_summary: {                         │  │     │        │
│  │  │  │     count, bbox, center, sample             │  │     │        │
│  │  │  │   },                                         │  │     │        │
│  │  │  │   parcels: [...]                            │  │     │        │
│  │  │  │ }                                            │  │     │        │
│  │  │  └──────────────────────────────────────────────┘  │     │        │
│  │  └────────────────────────────────────────────────────┘     │        │
│  └─────────────────────────────────────────────────────────────┘        │
│                                     │                                    │
│                                     ▼                                    │
│  ┌─────────────────────────────────────────────────────────────┐        │
│  │  Report Schema (lib/contracts/report.schema.ts)             │        │
│  │  ┌────────────────────────────────────────────────────┐     │        │
│  │  │  createReportSkeleton()                            │     │        │
│  │  │  ┌──────────────────────────────────────────────┐  │     │        │
│  │  │  │ Creates Report with:                         │  │     │        │
│  │  │  │ • report_id, request_id                      │  │     │        │
│  │  │  │ • version: 'rpt-0.1'                         │  │     │        │
│  │  │  │ • status: 'created'                          │  │     │        │
│  │  │  │ • created_at: ISO timestamp                  │  │     │        │
│  │  │  │ • sections: [6 sections]                     │  │     │        │
│  │  │  │   - overview                                 │  │     │        │
│  │  │  │   - restrictions                             │  │     │        │
│  │  │  │   - process                                  │  │     │        │
│  │  │  │   - deadlines                                │  │     │        │
│  │  │  │   - risks                                    │  │     │        │
│  │  │  │   - sources (with evidence_list)            │  │     │        │
│  │  │  │ • context: attached ReportContext            │  │     │        │
│  │  │  └──────────────────────────────────────────────┘  │     │        │
│  │  └────────────────────────────────────────────────────┘     │        │
│  └─────────────────────────────────────────────────────────────┘        │
│                                                                           │
└───────────────────────────────────┬───────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       AUDIT LAYER                                        │
│  ┌─────────────────────────────────────────────────────────────┐        │
│  │  Audit Event Schema (lib/contracts/auditEvent.schema.ts)    │        │
│  │  ┌────────────────────────────────────────────────────┐     │        │
│  │  │  makeAuditEvent()                                  │     │        │
│  │  │  ┌──────────────────────────────────────────────┐  │     │        │
│  │  │  │ Creates AuditEvent with:                     │  │     │        │
│  │  │  │ • id: UUID                                   │  │     │        │
│  │  │  │ • type: 'report.created'                     │  │     │        │
│  │  │  │ • created_at: ISO timestamp                  │  │     │        │
│  │  │  │ • actor: { actor_type, actor_id, ... }      │  │     │        │
│  │  │  │ • report_id                                  │  │     │        │
│  │  │  │ • request_id                                 │  │     │        │
│  │  │  │ • payload: { intent, ... }                   │  │     │        │
│  │  │  └──────────────────────────────────────────────┘  │     │        │
│  │  └────────────────────────────────────────────────────┘     │        │
│  └─────────────────────────────────────────────────────────────┘        │
│                                     │                                    │
│                                     ▼                                    │
│  ┌─────────────────────────────────────────────────────────────┐        │
│  │  Global Audit Sink (temporary)                              │        │
│  │  globalThis.__AUDIT_EVENTS = []                             │        │
│  └─────────────────────────────────────────────────────────────┘        │
│                                                                           │
└───────────────────────────────────┬───────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       RESPONSE                                           │
│  ┌─────────────────────────────────────────────────────────────┐        │
│  │  HTTP 200 OK                                                 │        │
│  │  {                                                            │        │
│  │    ok: true,                                                 │        │
│  │    report: {                                                 │        │
│  │      report_id: "...",                                       │        │
│  │      request_id: "...",                                      │        │
│  │      version: "rpt-0.1",                                     │        │
│  │      status: "created",                                      │        │
│  │      created_at: "2026-01-10T...",                           │        │
│  │      sections: [...],                                        │        │
│  │      context: {                                              │        │
│  │        intent: {...},                                        │        │
│  │        parcel_summary: {...},                                │        │
│  │        parcels: [...]                                        │        │
│  │      }                                                        │        │
│  │    }                                                          │        │
│  │  }                                                            │        │
│  └─────────────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

```
INPUT PARCEL
┌─────────────────────────┐
│ {                       │
│   id: "parcel-001",     │
│   lat: 39.7392,         │
│   lng: -105.0844,       │
│   note: "Commercial"    │
│ }                       │
└───────────┬─────────────┘
            │
            │ parse()
            ▼
┌─────────────────────────┐
│ Ccp03Record             │
│ {                       │
│   id: "parcel-001",     │
│   lat: 39.7392,         │
│   lng: -105.0844,       │
│   note: "Commercial"    │
│ }                       │
└───────────┬─────────────┘
            │
            │ [wrap in array]
            │
            │ + intent: { mode: "arc_viability" }
            │
            │ projectParcelToReportContext()
            ▼
┌────────────────────────────────────┐
│ ReportContext                      │
│ {                                  │
│   intent: {                        │
│     mode: "arc_viability"          │
│   },                               │
│   parcel_summary: {                │
│     count: 1,                      │
│     bbox: [-105.0844, 39.7392,    │
│            -105.0844, 39.7392],   │
│     center: {                      │
│       lat: 39.7392,                │
│       lng: -105.0844               │
│     },                             │
│     sample: {                      │
│       id: "parcel-001",            │
│       lat: 39.7392,                │
│       lng: -105.0844,              │
│       note: "Commercial"           │
│     }                              │
│   },                               │
│   parcels: [...]                   │
│ }                                  │
└───────────┬────────────────────────┘
            │
            │ createReportSkeleton()
            ▼
┌────────────────────────────────────┐
│ Report                             │
│ {                                  │
│   report_id: "report-001",         │
│   request_id: "request-001",       │
│   version: "rpt-0.1",              │
│   status: "created",               │
│   created_at: "2026-01-10...",     │
│   sections: [                      │
│     { type: "overview", ... },     │
│     { type: "restrictions", ... }, │
│     { type: "process", ... },      │
│     { type: "deadlines", ... },    │
│     { type: "risks", ... },        │
│     { type: "sources", ... }       │
│   ],                               │
│   context: { ... }                 │
│ }                                  │
└───────────┬────────────────────────┘
            │
            │ + makeAuditEvent()
            │
            ▼
┌────────────────────────────────────┐
│ AuditEvent                         │
│ {                                  │
│   id: "ev_...",                    │
│   type: "report.created",          │
│   created_at: "2026-01-10...",     │
│   report_id: "report-001",         │
│   request_id: "request-001",       │
│   payload: { intent: {...} }       │
│ }                                  │
└────────────────────────────────────┘
            │
            │ [stored in globalThis.__AUDIT_EVENTS]
            │
            ▼
    Client receives Report
```

## Bounding Box Calculation

```
Multiple Parcels:
┌────────────────────────────────────────────────┐
│                                                │
│  P1: Denver (39.7392, -105.0844)              │
│  P2: New York (40.7128, -74.0060)             │
│  P3: Los Angeles (34.0522, -118.2437)         │
│                                                │
└────────────────────────────────────────────────┘
                    │
                    │ Extract coordinates
                    ▼
┌────────────────────────────────────────────────┐
│ lats: [39.7392, 40.7128, 34.0522]             │
│ lngs: [-105.0844, -74.0060, -118.2437]        │
└────────────────────────────────────────────────┘
                    │
                    │ Calculate min/max
                    ▼
┌────────────────────────────────────────────────┐
│ minLat: 34.0522                                │
│ maxLat: 40.7128                                │
│ minLng: -118.2437                              │
│ maxLng: -74.0060                               │
└────────────────────────────────────────────────┘
                    │
                    │ Format bbox
                    ▼
┌────────────────────────────────────────────────┐
│ bbox: [-118.2437, 34.0522, -74.0060, 40.7128] │
│       [minLng, minLat, maxLng, maxLat]        │
│                                                │
│ center: {                                      │
│   lat: (34.0522 + 40.7128) / 2 = 37.3825     │
│   lng: (-118.2437 + -74.0060) / 2 = -96.1249 │
│ }                                              │
└────────────────────────────────────────────────┘

Visual representation on a map:
         maxLat (40.7128)
              ↑
              │
minLng ←──────┼──────→ maxLng
(-118.2437)   │      (-74.0060)
              │
              ↓
         minLat (34.0522)

        Center: (37.3825, -96.1249)
```

## Contract Relationships

```
┌─────────────────────────────────────────────────────┐
│                 CCP Ecosystem                        │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │   CCP-00     │  │   CCP-01     │  │  CCP-03   │ │
│  │  Bootstrap   │  │  Location    │  │  Parcel   │ │
│  │   /Session   │  │  Resolution  │  │  Preview  │ │
│  └──────┬───────┘  └──────┬───────┘  └─────┬─────┘ │
│         │                 │                 │       │
│         │                 │                 │       │
│  ┌──────▼─────────────────▼─────────────────▼─────┐ │
│  │         Application State                      │ │
│  │  • User session (CCP-00)                       │ │
│  │  • Resolved locations (CCP-01)                 │ │
│  │  • Parcel reports (CCP-03)                     │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
└─────────────────────────────────────────────────────┘
```

## Test Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Test Layers                       │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │  Unit Tests                                    │ │
│  │  • __tests__/ccp03.report.test.ts             │ │
│  │    - Tests parse() function                   │ │
│  │    - Uses ccp03.fixture.ts                    │ │
│  └────────────────────────────────────────────────┘ │
│                         │                            │
│                         ▼                            │
│  ┌────────────────────────────────────────────────┐ │
│  │  Integration Tests                             │ │
│  │  • __tests__/report.create.test.ts            │ │
│  │    - Tests API endpoint                       │ │
│  │    - Tests audit events                       │ │
│  └────────────────────────────────────────────────┘ │
│                         │                            │
│                         ▼                            │
│  ┌────────────────────────────────────────────────┐ │
│  │  Contract Tests                                │ │
│  │  • app/api/report/create/route.test.ts        │ │
│  │    - CCP-03 audit emission                    │ │
│  │    - CCP-03 audit behavior (frozen)           │ │
│  │    - Contract failure handling                │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
└─────────────────────────────────────────────────────┘
```

## Error Handling Flow

```
Request → Validation
             │
             ├─ Invalid JSON → 400 BAD_JSON
             │
             ├─ Not an object → 400 INVALID_BODY
             │
             ├─ Missing parcel_context → 400 REPORT_CREATE_CONTRACT
             │                                 code: MISSING_PARCEL
             │
             ├─ Missing intent → 422 MISSING_INTENT
             │
             └─ Valid ↓
                      │
                Transform & Create
                      │
                      ├─ Success → 200 OK { report }
                      │            + Audit event emitted
                      │
                      └─ Exception → 500 REPORT_CREATE_FAILED
                                    + No audit event
```

## Future Architecture (Mentioned in Code Comments)

```
┌─────────────────────────────────────────────────────┐
│              Future Enhancements                     │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │  CCP-00: Full Account System                   │ │
│  │  • Supabase tables for teams/users             │ │
│  │  • Stripe webhook integration                  │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │  Persistent Audit Storage                      │ │
│  │  • Database table for audit events             │ │
│  │  • Query API for audit logs                    │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │  Builder.io Template Integration               │ │
│  │  • Render reports with templates               │ │
│  │  • Custom report layouts                       │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

**Diagram Key:**
- `→` : Data flow
- `▼` : Transformation/Processing
- `┌─┐` : System boundary or component
- `├─` : Branching logic
- `└─` : Terminal branch

**Last Updated:** 2026-01-10
