# Individual Cage State Tracking Plan

## Overview
This document outlines the architecture for tracking individual cage states within each CageMaster group.

## Problem Statement
- Current: CageMaster represents one "kandang group" (e.g., B1) with thousands of individual physical cages
- Need: Track state of each individual cage (broken, chicken alive/dead, etc.)

## Proposed Data Model

### Current Schema (for reference)
```prisma
model CageMaster {
  kandang     String   @id    // "B1", "B1+", etc.
  jmlAyam     Int      @default(0)
  jmlEmber    Float    @default(0)
  jmlPakan    Float    @default(0)
  gramEkor    Float    @default(0)
  beratPakan  Float    @default(0)
  volEmber    Float?
  hargaPakan  Float?
  mortality   Int      @default(0)
  faktorPakan Float    @default(13)
}
```

### Proposed Extended Schema

```prisma
model CageMaster {
  id          String   @id @default(cuid())
  kandang     String   @unique   // "B1", "B1+", "B2", etc.
  jmlAyam     Int      @default(0)
  jmlEmber    Float    @default(0)
  jmlPakan    Float    @default(0)
  gramEkor    Float    @default(0)    // jmlPakan / jmlAyam (gram per chicken)
  beratPakan  Float    @default(0)    // jmlPakan * hargaPakan (total feed cost)
  volEmber    Float?   @default(0)    // jmlPakan / jmlEmber (volume per bucket)
  hargaPakan  Float?   @default(0)    // price per kg of feed
  faktorPakan Float    @default(13)
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  cages       Cage[]
  production  Production[]
}

model Cage {
  id            String     @id @default(cuid())
  cageMasterId  String
  cageMaster    CageMaster  @relation(fields: [cageMasterId], references: [id], onDelete: Cascade)
  
  // Individual cage identifier within the group
  cageNo        String      // e.g., "001", "002", ... up to "9999"
  
  // Status tracking
  status        CageStatus @default(ACTIVE)
  jmlAyam       Int        @default(0)    // current chicken count in this cage
  mortality     Int        @default(0)    // deaths in this cage
  
  // Metadata
  notes         String?
  lastCheckDate DateTime?
  
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt

  @@unique([cageMasterId, cageNo])
}

enum CageStatus {
  ACTIVE
  BROKEN
  EMPTY
  DEAD_FLOCK    // All chickens dead
  MAINTENANCE
  QUARANTINE
}

model Production {
  date          DateTime   @id @db.Date
  cageMasterId  String
  cageMaster    CageMaster  @relation(fields: [cageMasterId], references: [id])

  // Per-cage-group production (aggregate of individual cages)
  jmlTelur      Int        @default(0)
  kg            Float      @default(0)
  pct           Float      @default(0)
  fc            Float      @default(0)
  hpp           Float      @default(0)

  // Totals
  totalJmlTelur Int        @default(0)
  totalKg       Float      @default(0)
  totalPct      Float      @default(0)
  totalFc       Float      @default(0)
  totalHpp      Float      @default(0)

  // Financials
  hargaSentral  Float      @default(0)
  up            Float      @default(0)
  hargaKandang  Float      @default(0)
  profitDaily   Float      @default(0)
  operasional   Float      @default(0)
  profitMonthly Float      @default(0)
  
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt

  @@index([date])
  @@index([cageMasterId])
}
```

## API Endpoints

### CageMaster CRUD
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/master` | List all CageMaster groups |
| POST | `/api/master` | Create new CageMaster |
| PUT | `/api/master/[id]` | Update CageMaster |
| DELETE | `/api/master/[id]` | Delete CageMaster + all its Cages |

### Individual Cage Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/master/[id]/cages` | List all cages in a group |
| POST | `/api/master/[id]/cages` | Add single cage |
| POST | `/api/master/[id]/cages/bulk` | Add multiple cages at once |
| PATCH | `/api/cage/[id]` | Update cage status |
| DELETE | `/api/cage/[id]` | Remove cage |

### Cage Status Updates
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/cage/[id]/report` | Report daily status (e.g., chickens died, cage broken) |

## Entry Form UI Changes

### Master Tab
- Display list of CageMaster groups
- "Add New CageGroup" button
- Each group shows: name, jmlAyam, jmlEmber, calculated fields
- Click group → view/manage individual cages
- Individual cage management panel:
  - Grid view of all cages in group
  - Color-coded by status (green=active, red=dead, gray=broken)
  - Click cage to update status
  - Bulk actions: mark all as active, mark broken, etc.

### Production Tab
- Group production by CageMaster (same as current)
- Show cards per CageMaster group
- Calculate totals from CageMaster list (dynamic)

## Calculations Reference (from CSV)

### Current formulas from spreadsheet:
```
G/Ekor (gramEkor)     = Jml Pakan / Jml Ayam
B Pakan (beratPakan)  = Jml Pakan * H. Pakan
Vol/Ember (volEmber)  = Jml Pakan / Jml Ember
```

### Future formulas (TBD from user):
- Feed conversion ratio
- Egg production percentage
- Cost per egg
- etc.

## Implementation Notes

1. **Migration path**: Drop old Production table columns, create new schema
2. **Backfill**: After schema change, seed CageMaster with 6 groups, create Cage records for each (optional - can create on-demand)
3. **Performance**: Cage table may grow large - add indexes on status, cageMasterId
4. **Validation**: Prevent duplicate cageNo within same CageMaster

## Context from User

- Each CageMaster = group of thousands of individual cages
- Track broken cages, dead chickens per specific cage
- Keep existing CageMaster fields (jmlAyam, jmlEmber)
- Fresh data - no backward compatibility needed
- Follow naming pattern B1, B1+, B2, B2+, B3, B3+