# StockSense - Smart Inventory Management System (ERP)

StockSense is a complete, production-quality modular Inventory Management System (IMS / ERP) inspired by Odoo. It digitizes and streamlines end-to-end stock operations, replacing manual registers and fragmented spreadsheets with a centralized, real-time, audit-grade application.

---

## 🌟 Key Features

### 1. 🔐 Role-Based Authentication & Access Control
- **Authentication Pages:** `/login`, `/register`, `/forgot-password`.
- **Role Hierarchy:**
  - **Admin:** Full unrestricted access across the system, company settings, and user management.
  - **Inventory Manager:** Products, categories, reordering rules, warehouse transfers, adjustments, operations, reports, and facility settings.
  - **Warehouse Staff:** Floor operations—goods receipts (GRN), customer deliveries (DO), internal transfers, and physical cycle counts.
- **Access Guard:** Route protection with detailed "Access Denied" screens.
- **Quick Demo Switcher:** 1-Click login buttons on the login screen and an in-header role switcher for instant permission testing.

### 2. ⚡ Critical Atomic Stock Engine
- Reusable, transactional stock service (`src/services/stockEngine.ts`):
  - **`receiveStock()`**: Validates incoming quantities, credits destination warehouse locations, increments product master totals, appends immutable `RECEIPT` ledger entry, and marks receipt `Done`.
  - **`deliverStock()`**: Performs atomic availability pre-checks, strictly enforces negative stock prevention (`Available: X, Requested: Y`), deducts location quantities, logs `DELIVERY` ledger entry, and marks delivery `Done`.
  - **`transferStock()`**: Verifies source rack quantities, relocates inventory from source to destination without changing company-wide stock totals, and logs dual-sided `TRANSFER` ledger audit trail.
  - **`adjustStock()`**: Reconciles software records against physical hand-counts (`Difference = Physical - System`), updates stock, logs `ADJUSTMENT_IN` or `ADJUSTMENT_OUT` with reason and auditor notes, and locks the adjustment permanently.
- **Immutable Stock Ledger:** Every transaction is preserved permanently in the `stockLedger` collection with before/after snapshots.

### 3. 📊 Executive Real-Time Dashboard
- **8 Dynamic KPIs (Live Calculated):**
  - Total Products in Catalog
  - Total Stock Units on Hand
  - Low Stock Items (Threshold Alert)
  - Out of Stock Items (Zero Units)
  - Pending Receipts (Incoming Shipments)
  - Pending Deliveries (Dispatch Queue)
  - Internal Transfers Today
  - Stock Adjustments Today
- **4 Recharts Visual Analytics:**
  - Stock Movement Over Time (Area Chart: Incoming vs Outgoing throughput)
  - Category Stock Flow (Bar Chart)
  - Stock by Warehouse (Donut Chart)
  - Top Products by On-Hand Stock vs Reorder Level (Horizontal Bar Chart)
- **Dynamic Filtering:** Filter dashboard and recent activities by document type, warehouse, and category.

### 4. 📦 Product Management & Reordering Rules
- Product catalog with unique SKU validation, categories, units of measure, cost/price, and reorder levels.
- **Product Details View:** Location-level inventory distribution, warehouse breakdown, low-stock warnings, and transaction audit trail.
- **Categories CRUD:** Deletion safeguard prevents deleting categories in active use, offering safe deactivation instead.
- **Reordering Rules:** Automated replenishment view calculating current stock deficits with a 1-click **"Draft Receipt"** button.

### 5. 🚛 Warehouse Operations Workflow
- **Odoo-Inspired Status Pipeline:** Iconic visual stage bar (`Draft` ➔ `Waiting` / `Ready` ➔ `Done` / `Canceled`).
- **Receipts (Incoming Goods):** Multi-item GRN processing.
- **Delivery Orders (Outgoing Goods):** Two-stage validation with **"Check Availability"** and atomic dispatch deduction.
- **Internal Transfers:** Warehouse-to-warehouse or rack-to-rack inventory moves.
- **Stock Adjustments:** Physical cycle counts with automatic discrepancy calculation and QC reasons.

### 6. 📜 Move History & Audit Trail
- Comprehensive audit log with instant debounced search across product name, SKU, reference number, or notes.
- Multi-filters: Date range, Operation type (`RECEIPT`, `DELIVERY`, `TRANSFER`, `ADJUSTMENT_IN`, `ADJUSTMENT_OUT`), Warehouse, and Staff User.
- Full pagination and CSV/Excel export.

### 7. 📑 Excel Import & Export (`xlsx`)
- **Export to Excel:** Products list, Move History, and Stock Reports.
- **Import Products from Excel:**
  - File drag-and-drop dropzone
  - Pre-validation against existing SKUs, numbers, and categories
  - Preview table displaying valid rows vs invalid rows with clear error explanations before committing
  - Downloadable official sample import template (`StockSense_Product_Import_Template.xlsx`).

### 8. 📈 Operational Reports
- 5 comprehensive reports:
  1. Current Stock & Inventory Valuation Report
  2. Low Stock & Deficit Alert Report
  3. Stock Movement & Ledger Audit Report
  4. Warehouse & Location Valuation Report
  5. Product Rack Allocation Report
- Interactive filters, clean print stylesheet (`window.print()`), CSV export, and Excel export.

### 9. ⚙️ Settings & System Profile
- Multi-warehouse configuration with physical addresses.
- Multi-location/rack mapping linked to parent facilities.
- Company enterprise settings: Base currency, Timezone, Global low-stock threshold, and automated email alert toggles.
- **Re-seed Demo Data Button:** One-click restoration of sample products, warehouses, and operations.

---

## 🛠 Tech Stack

- **Frontend:** React 19, TypeScript, Vite
- **Styling:** Tailwind CSS (Odoo Plum & Teal ERP theme), Dark Mode support
- **Routing:** React Router v7 (`react-router-dom`)
- **Database & Auth:** Google Firebase Authentication & Cloud Firestore (with reactive local demo fallback)
- **Icons:** Lucide React
- **Data Visualization:** Recharts
- **Spreadsheet Processing:** XLSX (`xlsx`)
- **Date Formatting:** date-fns

---

## 📁 Project Directory Structure

```text
hackathon/
├── public/
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── Breadcrumbs.tsx
│   │   │   ├── Button.tsx
│   │   │   ├── ConfirmDialog.tsx
│   │   │   ├── DataTable.tsx
│   │   │   ├── DateRangePicker.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── FilterBar.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── KpiCard.tsx
│   │   │   ├── LoadingSkeleton.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── SearchBar.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── StatusBarPipeline.tsx
│   │   │   └── StatusBadge.tsx
│   │   └── layout/
│   │       ├── Header.tsx
│   │       ├── Layout.tsx
│   │       ├── ProtectedRoute.tsx
│   │       └── Sidebar.tsx
│   ├── context/
│   │   ├── AuthContext.tsx
│   │   ├── NotificationContext.tsx
│   │   └── ThemeContext.tsx
│   ├── lib/
│   │   ├── excel.ts
│   │   ├── firebase.ts
│   │   ├── seedData.ts
│   │   ├── storage.ts
│   │   └── utils.ts
│   ├── pages/
│   │   ├── operations/
│   │   │   ├── AdjustmentForm.tsx
│   │   │   ├── AdjustmentsList.tsx
│   │   │   ├── DeliveriesList.tsx
│   │   │   ├── DeliveryDetail.tsx
│   │   │   ├── ReceiptsList.tsx
│   │   │   ├── ReceiptDetail.tsx
│   │   │   ├── TransferDetail.tsx
│   │   │   └── TransfersList.tsx
│   │   ├── products/
│   │   │   ├── Categories.tsx
│   │   │   ├── ProductDetail.tsx
│   │   │   ├── ProductFormModal.tsx
│   │   │   ├── ProductImportModal.tsx
│   │   │   ├── ProductsList.tsx
│   │   │   └── ReorderingRules.tsx
│   │   ├── settings/
│   │   │   ├── CompanySetting.tsx
│   │   │   ├── LocationsSetting.tsx
│   │   │   └── WarehousesSetting.tsx
│   │   ├── AccessDenied.tsx
│   │   ├── Dashboard.tsx
│   │   ├── ForgotPassword.tsx
│   │   ├── Login.tsx
│   │   ├── MoveHistory.tsx
│   │   ├── NotFound.tsx
│   │   ├── Profile.tsx
│   │   ├── Register.tsx
│   │   └── Reports.tsx
│   ├── services/
│   │   ├── authService.ts
│   │   └── stockEngine.ts
│   ├── types/
│   │   └── index.ts
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── .env.example
├── .env
├── firestore.rules
├── package.json
├── tailwind.config.js
└── vite.config.ts
```

---

## 🚀 Setup & Execution

### 1. Prerequisites
- Node.js (v18+ or LTS v24 installed)
- npm (v10+)

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Copy the template environment variables:
```bash
cp .env.example .env
```
Fill in your Firebase credentials from your [Firebase Console](https://console.firebase.google.com/):
```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_DEMO_MODE=false
```
> **Note:** If `VITE_DEMO_MODE=true` (or when using placeholder credentials), StockSense operates in full interactive offline-first mode with complete local persistence and the realistic seed dataset. Everything is functional out of the box with zero external dependencies required!

### 4. Run Development Server
```bash
npm run dev
```

### 5. Production Build & Preview
```bash
npm run build
npm run preview
```

---

## 👤 Test Demo Credentials

You can use the 1-click quick demo buttons on the `/login` page or use these credentials:

| Role | Email | Password | Access Rights |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@stocksense.com` | `admin123` | Full access across all ERP modules |
| **Inventory Manager** | `manager@stocksense.com` | `manager123` | Products, Operations, Transfers, Adjustments, Reports |
| **Warehouse Staff** | `staff@stocksense.com` | `staff123` | Receipts, Deliveries, Transfers, Cycle Counts |

---

## 🔒 Firestore Security Rules
Security rules are defined in `firestore.rules` to enforce:
- Role-based permissions matching user roles stored in Firestore.
- Immutability of the `stockLedger` collection (documents can only be created via controlled stock transactions; updates and deletes are blocked).
- Prevention of negative stock quantities on balances.
- Prevention of modifying completed (`Done` or `Canceled`) documents.
