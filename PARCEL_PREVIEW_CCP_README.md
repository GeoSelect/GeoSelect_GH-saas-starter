# Parcel Preview CCP Documentation

## Quick Start Guide

This directory contains comprehensive documentation about the **Parcel Preview CCP** (Component Communication Pattern) system implemented in this codebase.

## 📚 Documentation Files

### 1. [PARCEL_PREVIEW_CCP_ANALYSIS.md](./PARCEL_PREVIEW_CCP_ANALYSIS.md)
**Main technical documentation** - Complete system analysis

**Contents:**
- What is CCP (Component Communication Pattern)?
- Key Components overview
  - CCP-03: Parcel Record Contract
  - Parcel-to-Report Transformation
  - Report Schema
  - Audit Event Schema
- API Implementation details
- Testing Patterns
- Data Flow Architecture
- Design Principles
- Future Enhancements

**Best for:** Understanding the architecture and design decisions

---

### 2. [PARCEL_PREVIEW_CCP_EXAMPLES.md](./PARCEL_PREVIEW_CCP_EXAMPLES.md)
**Practical code examples** - 14 working examples

**Contents:**
- Basic Parcel Parsing (Examples 1-3)
- Creating Reports from Parcels (Examples 4-6)
- API Usage (Examples 7-9)
- Testing Patterns (Examples 10-12)
- Advanced Usage (Examples 13-14)
- Common Patterns
- Quick Reference

**Best for:** Learning by example and implementing features

---

### 3. [PARCEL_PREVIEW_CCP_DIAGRAMS.md](./PARCEL_PREVIEW_CCP_DIAGRAMS.md)
**Visual architecture** - ASCII diagrams and flowcharts

**Contents:**
- System Architecture diagram
- Data Flow diagram
- Bounding Box Calculation visual
- Contract Relationships
- Test Architecture
- Error Handling Flow
- Future Architecture

**Best for:** Visual learners and system design overview

---

## 🚀 Quick Examples

### Parse a Parcel
```typescript
import { parse } from './lib/contracts/ccp03';

const parcel = parse({
  id: 'parcel-001',
  lat: 39.7392,
  lng: -105.0844,
  note: 'Commercial property'
});
```

### Create a Report via API
```javascript
const response = await fetch('http://localhost:3000/api/report/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    parcel_context: [
      { id: '1', lat: 39.7392, lng: -105.0844 }
    ],
    intent: { mode: 'arc_viability' },
    report_id: 'report-001'
  })
});

const { report } = await response.json();
```

### Transform Parcel to Report Context
```typescript
import { projectParcelToReportContext } from './lib/contracts/parcel-to-report';

const context = projectParcelToReportContext(
  [{ id: '1', lat: 39.7392, lng: -105.0844 }],
  { mode: 'investigation' }
);

// context.parcel_summary contains: count, bbox, center, sample
```

---

## 🏗️ System Overview

The Parcel Preview CCP is a **contract-based communication pattern** that:

✅ **Ensures Type Safety** - All data structures are strongly typed  
✅ **Provides Predictable APIs** - Frozen contracts prevent breaking changes  
✅ **Supports Geospatial Data** - Built-in coordinate handling and calculations  
✅ **Maintains Audit Trail** - All operations are logged  
✅ **Enables Testing** - Comprehensive test coverage with fixtures  

---

## 📋 Key Concepts

### What is a "Frozen Contract"?
A frozen contract is a **minimal and deterministic** data structure that:
- Contains only essential fields
- Has predictable transformations
- Remains stable over time
- Allows downstream consumers to rely on the shape

### CCP Hierarchy
- **CCP-00**: Bootstrap/Session management
- **CCP-01**: Location resolution
- **CCP-03**: Parcel preview and report generation ← **This documentation**

---

## 🔍 Core Components

### 1. CCP-03 Parser
**File:** `lib/contracts/ccp03.ts`  
**Purpose:** Parse and normalize parcel data

```typescript
type Ccp03Record = {
  id: string;
  lat?: number;
  lng?: number;
  note?: string;
  [key: string]: any;
};
```

### 2. Parcel-to-Report Transform
**File:** `lib/contracts/parcel-to-report.ts`  
**Purpose:** Convert parcel context to report context with geospatial calculations

**Calculates:**
- Parcel count
- Bounding box (bbox)
- Center point
- Sample parcel

### 3. Report Schema
**File:** `lib/contracts/report.schema.ts`  
**Purpose:** Define report structure with 6 sections

**Sections:**
- overview
- restrictions
- process
- deadlines
- risks
- sources

### 4. Audit Events
**File:** `lib/contracts/auditEvent.schema.ts`  
**Purpose:** Track all system operations

---

## 🧪 Testing

### Test Files
- `__tests__/ccp03.report.test.ts` - Parser unit tests
- `__tests__/report.create.test.ts` - Integration tests
- `app/api/report/create/route.test.ts` - API contract tests

### Run Tests
```bash
pnpm install
pnpm test
```

### Test Fixtures
```typescript
import { ccp03Fixture } from './lib/contracts/ccp03.fixture';

// Denver, Colorado location
ccp03Fixture[0] // { id: '1', lat: 39.7392, lng: -105.0844, note: 'smoke' }
```

---

## 🌐 API Endpoints

### POST `/api/report/create`
Create a report from parcel context

**Request:**
```json
{
  "parcel_context": [
    { "id": "1", "lat": 39.7392, "lng": -105.0844 }
  ],
  "intent": { "mode": "arc_viability" },
  "report_id": "optional-id",
  "request_id": "optional-request-id"
}
```

**Response:**
```json
{
  "ok": true,
  "report": {
    "report_id": "...",
    "version": "rpt-0.1",
    "status": "created",
    "sections": [...],
    "context": {
      "parcel_summary": {
        "count": 1,
        "bbox": [...],
        "center": {...}
      }
    }
  }
}
```

---

## 📖 Related Files

### Contract Files
- `lib/contracts/ccp03.ts`
- `lib/contracts/ccp03.fixture.ts`
- `lib/contracts/parcel-to-report.ts`
- `lib/contracts/report.schema.ts`
- `lib/contracts/auditEvent.schema.ts`

### API Implementation
- `app/api/report/create/route.ts`

### Test Files
- `__tests__/ccp03.report.test.ts`
- `__tests__/report.create.test.ts`
- `app/api/report/create/route.test.ts`

---

## 🎯 Use Cases

1. **Real Estate Analysis** - Generate reports for property parcels
2. **Development Feasibility** - Assess viability of construction projects
3. **Geospatial Analytics** - Calculate bounding boxes and center points
4. **Compliance Reporting** - Maintain audit trails of all operations
5. **Multi-Parcel Analysis** - Analyze multiple properties simultaneously

---

## 🔮 Future Enhancements

Based on code comments, planned features include:

- **CCP-00 Account Tables** - Full team/user management with Supabase
- **Persistent Audit Storage** - Database-backed audit logs
- **Builder.io Integration** - Template-based report rendering
- **Enhanced Parcel Metadata** - Additional property information
- **Stripe Integration** - Subscription-based report generation

---

## 💡 Tips

1. **Always validate inputs** - Use the parse() function to normalize data
2. **Handle missing coordinates gracefully** - bbox and center return null if no valid coords
3. **Use fixtures in tests** - ccp03Fixture provides consistent test data
4. **Check audit events** - Verify operations completed successfully
5. **Review examples** - 14 examples cover most common use cases

---

## 🤝 Contributing

When working with the Parcel Preview CCP:

1. **Maintain frozen contracts** - Don't add required fields to contracts
2. **Add tests** - Cover new functionality with unit and integration tests
3. **Update documentation** - Keep these docs in sync with code changes
4. **Emit audit events** - Log all significant operations
5. **Follow patterns** - Reference existing code for consistency

---

## 📞 Support

For questions or issues:

1. **Read the documentation** - Start with PARCEL_PREVIEW_CCP_ANALYSIS.md
2. **Check examples** - PARCEL_PREVIEW_CCP_EXAMPLES.md has 14 working examples
3. **Review diagrams** - PARCEL_PREVIEW_CCP_DIAGRAMS.md shows visual flows
4. **Run tests** - Verify your environment with `pnpm test`
5. **Check audit logs** - Look at `globalThis.__AUDIT_EVENTS` for debugging

---

## 📅 Version History

- **2026-01-10** - Initial documentation created
- **Commit:** a39d3b2 - CCP-03 implementation added to codebase

---

**Generated:** 2026-01-10  
**Status:** Complete and current  
**Coverage:** CCP-03 Parcel Preview system
