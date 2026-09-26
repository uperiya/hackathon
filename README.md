# StockSense

Inventory Management System (IMS / ERP) inspired by Odoo, built for multi-warehouse inventory tracking and stock movement operations.

## Overview

StockSense is an inventory control system designed to replace spreadsheet tracking and manual logs with an auditable, real-time workflow. It handles day-to-day warehouse operations—receiving goods, processing outgoing deliveries, internal stock transfers, and physical cycle counts—while maintaining strict balance integrity and an immutable transaction ledger.

## Key Capabilities

### Warehouse Operations
- **Receipts (Goods Received Notes)**: Record incoming stock from vendors, inspect quantities, assign destination locations, and update catalog counts.
- **Delivery Orders**: Process outgoing shipments with automated availability checks. Prevents overselling and blocks negative balances.
- **Internal Transfers**: Relocate stock between warehouses or racks (source deducted, destination credited) with zero net change to total company inventory.
- **Stock Adjustments**: Reconcile system records against physical inventory counts, calculate discrepancies automatically, and record mandatory reason codes for auditing.
- **Workflow Pipeline**: Standardized status progression (`Draft` -> `Waiting` / `Ready` -> `Done` / `Canceled`) across all operations.

### Inventory & Warehouse Management
- **Product Catalog**: SKU management, barcode/category grouping, cost and sale pricing, unit of measure, and active/inactive status toggle.
- **Locations Hierarchy**: Multi-warehouse modeling with designated aisles, racks, and bays.
- **Reordering Rules**: Automated minimum threshold tracking with stock deficit calculation and one-click draft purchase receipt creation.
- **Move History & Audit Trail**: Centralized ledger recording every single quantity change with before/after balances, timestamps, reference numbers, and operator details.
- **Reports & Data Export**: Reports for current stock valuation, low-stock deficit alerts, warehouse breakdowns, and printable sheets. Excel (`.xlsx`) import and export support with row pre-validation.

### Access Control & Security
- **Role-Based Permissions**:
  - `Admin`: Full system access, company configuration, warehouse management, and user permissions.
  - `Inventory Manager`: Catalog management, reordering rules, transfers, adjustments, reports, and location controls.
  - `Warehouse Staff`: Floor operations including receiving, picking, packing, transfers, and inventory counting.
- **Route Guards**: Route-level protection with access denied fallbacks.

## Architecture & Stock Engine

All stock updates go through a centralized stock engine (`src/services/stockEngine.ts`) to ensure ACID-like consistency and prevent race conditions:

- **Receipt**: Increments location balance, updates product on-hand total, appends immutable `RECEIPT` ledger entry.
- **Delivery**: Verifies location balance. If quantity is insufficient, transaction throws an error and rejects the dispatch. If valid, balance is deducted and `DELIVERY` ledger entry is appended.
- **Transfer**: Atomically decrements source location balance and increments destination location balance. Total catalog stock remains constant. Dual-sided `TRANSFER` ledger entries are written.
- **Adjustment**: Directly sets physical count, calculates difference (`Physical - Recorded`), updates location and catalog balances, and appends `ADJUSTMENT_IN` or `ADJUSTMENT_OUT` ledger entries.
- **Immutable Ledger**: The `stockLedger` collection is strictly append-only. Existing records cannot be updated or deleted, providing an audit-ready compliance trail.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS
- **Routing & State**: React Router v7, React Context
- **Database & Auth**: Firebase Authentication, Cloud Firestore (with responsive local storage fallback for offline demo testing)
- **Charts**: Recharts
- **Spreadsheets**: SheetJS (`xlsx`)
- **Icons & UI**: Lucide React, Tailwind CSS

## Project Structure

```text
src/
├── components/
│   ├── common/         # Reusable UI (tables, filters, modals, badges, inputs)
│   └── layout/         # Header, sidebar, shell layout, protected route guards
├── context/            # Auth, Theme (light/dark), Notifications context providers
├── hooks/              # Custom data fetching hooks for entities and operations
├── lib/                # Firebase setup, local storage engine, seed data, Excel utilities
├── pages/
│   ├── operations/     # Receipts, deliveries, transfers, adjustments (lists & details)
│   ├── products/       # Product list, details, categories, reordering rules, import
│   ├── settings/       # Warehouses, locations, company settings
│   ├── Dashboard.tsx   # Live KPI metrics and inventory charts
│   ├── MoveHistory.tsx # Master audit ledger
│   └── Reports.tsx     # Operational reports and valuation sheets
├── services/           # Firestore data services and atomic stock transaction engine
└── types/              # TypeScript interface definitions across all models
```

## Getting Started

### Prerequisites
- Node.js 18+ (tested on Node 20 / 24)
- npm 9+

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/uperiya/hackathon.git
   cd hackathon
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Add your Firebase project credentials. If you want to test offline without setting up Firebase first, set `VITE_DEMO_MODE=true` to run against the seeded local database.

4. Run the local development server:
   ```bash
   npm run dev
   ```
   The application will be running at `http://localhost:5173`.

### Production Build

```bash
npm run build
npm run preview
```

## Test Accounts

For demonstration and testing purposes, pre-configured role accounts are available:

| Role | Email | Password | Access Scope |
| --- | --- | --- | --- |
| Admin | admin@stocksense.com | admin123 | Full unrestricted system access |
| Inventory Manager | manager@stocksense.com | manager123 | Catalog, reordering rules, transfers, adjustments, reports |
| Warehouse Staff | staff@stocksense.com | staff123 | Floor operations: receipts, deliveries, transfers, cycle counts |

The login screen also provides quick one-click login buttons for each role to streamline testing.

## Firestore Security Rules

Database rules are defined in `firestore.rules` and enforce:
- Role-based permissions matching user roles stored in Firestore.
- Immutability of the `stockLedger` collection (read and create permitted for staff; update and delete operations strictly denied).
- Validation preventing negative balances and modifications to finalized (`Done` or `Canceled`) documents.
