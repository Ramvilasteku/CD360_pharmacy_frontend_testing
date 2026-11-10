import ComingSoon from "../pharmacy/ComingSoon";
import PharmacyDashboard from "../Redux/dashboard/PharmacyDashboard";
import Medicines from "../pharmacy/Medicines";
import Sales from "../pharmacy/sales/Sales";
import Suppliers from "../pharmacy/purchase/Suppliers";
import PurchaseOrders from "../pharmacy/purchase/PurchaseOrders";
import AutoReorder from "../pharmacy/purchase/AutoReorder";
import ReceivePurchaseOrder from "../pharmacy/purchase/ReceivePurchaseOrder";
import PurchaseReturns from "../pharmacy/purchase/PurchaseReturns";
import B2BSales from "../pharmacy/purchase/B2BSales";
import PurchaseTransfer from "../pharmacy/purchase/PurchaseTransfer";
// import Inventory from "../pharmacy/inventory/Inventory";
import ProcurementReportsPage from "../pharmacy/Reports/Procurementreports";

import ExpiryAlerts from "../components/pharmacy/ExpiryAlerts";
import Inventory from "../components/pharmacy/Inventory";
import LowStock from "../components/pharmacy/LowStock";
import StockAdjustment from "../components/pharmacy/StockAdjustment";
import StockLedger from "../components/pharmacy/StockLedger";

import CreateSale    from "../pharmacy/sales/create/CreateSale";
import AllSales      from "../pharmacy/sales/list/AllSales";
import SalesPayments from "../pharmacy/sales/payments/Payments";
import SalesReturns  from "../pharmacy/sales/returns/SalesReturns";
import Customers     from "../pharmacy/sales/customers/Customers";
// The branch bar for the four Sales pages below. Sales.js has a header with a picker, but no
// route ever mounted it, so these pages ran with no branch at all — see SalesBranchFrame.jsx.
import SalesBranchFrame from "../pharmacy/sales/SalesBranchFrame";
// The same branch bar for the four Inventory pages (6 Nov 2026) — see InventoryBranchFrame.jsx.
import InventoryBranchFrame from "../pharmacy/inventory/Inventorybranchframe";

// ── Screens from Bhargavi's codebase, added unchanged ──────────────────────────
// Her Medicines and Categories screens sit alongside the existing Medicines list
// (the Categories slot below was a ComingSoon stub until now). Her four report
// screens are the ones the procurement Reports page does not cover: the sales
// report suite plus daily collection, low stock and expiring stock.
import MedicinesDetailed from "../pharmacy/Medicines/Medicines";
import MedicineCategories from "../pharmacy/MedicineCategories/Categories";
import SalesReportsPage from "../pharmacy/Reports/SalesReports/SalesReports";
import DailyCollectionPage from "../pharmacy/Reports/DailyCollection/Dailycollection";
import LowStockReportPage from "../pharmacy/Reports/LowStock/LowStockReport";
import ExpiringSoonReportPage from "../pharmacy/Reports/ExpiringSoon/Expiringsoonreport";


// feature_key  — which module screen this is. Decides whether the FEATURE is on for
//                the tenant at all.
// permission_key — which single permission opens THIS page. Optional: when absent the
//                access hook falls back to feature_key as before, so every module that
//                has not been split yet behaves exactly as it did.
//                Added Oct 2026 so the four Purchase Orders pages, which all share
//                feature_key "purchase", can be granted one by one.
//                See sql/2026-10-23_procurement_permissions.sql
//
// 25 Oct 2026 — permission_key is now actually ENFORCED.
//   Until today Routes/usePharmacyRoutes.js only ever looked at feature_key, so the keys
//   below were documentation: they were honoured inside each procurement screen but never
//   in the sidebar or the route list. usePharmacyAccess now checks permission_key too
//   (redux permissions, admin bypassed), which is what these keys were added for.
//   Consequence worth knowing at deploy: a role with the "purchase" feature but without,
//   say, pharmacy.purchase.generate_create now loses Generate PO from its sidebar instead
//   of opening a page whose buttons were all hidden anyway.
//
//   Sales and Medicines were wired to the same model in the same pass. The sales keys live
//   under the existing "sales" feature rather than features of their own — the same call
//   made for Procurement. See sql/2026-10-25_sales_medicines_permissions.sql, which adds
//   the permission ROWS these keys need; without it the keys cannot be held by anyone.

export const pharmacySections = [
  {
    key: "medicines",
    label: "Medicines",
    feature_key: "medicines",
    routes: [
      {
        path: "pharmacy/medicines",
        element: <Medicines />,
        label: "Medicines List",
        feature_key: "medicines",
        permission_key: "pharmacy.medicines.view",
      },
      {
        // was <ComingSoon />; this is Bhargavi's Categories screen, unchanged
        // A category is medicine master data, so it rides on the medicines permissions —
        // routes/Pharmacy/categories.js guards itself on pharmacy.medicines.* too.
        path: "pharmacy/categories",
        element: <MedicineCategories />,
        label: "Categories",
        feature_key: "medicines",
        permission_key: "pharmacy.medicines.view",
      },
     
    ],
  },
  {
    key: "inventory",
    label: "Inventory",
    feature_key: "inventory",
    routes: [
      {
        path: "pharmacy/inventory",
        element: <InventoryBranchFrame mode="read"><Inventory /></InventoryBranchFrame>,
        label: "Inventory",
        feature_key: "inventory",
        // 6 Nov 2026 — see sql/2026-11-06_inventory_permissions.sql
        permission_key: "pharmacy.stock.view",
      },
      {
        path: "pharmacy/stockadjustment",
        element: <InventoryBranchFrame mode="write"><StockAdjustment /></InventoryBranchFrame>,
        label: "Stock Adjustment",
        feature_key: "inventory",
        permission_key: "pharmacy.stock.create",
      },
      {
        path: "pharmacy/stockLedger",
        element: <InventoryBranchFrame mode="read"><StockLedger /></InventoryBranchFrame>,
        label: "Stock Ledger",
        feature_key: "inventory",
        permission_key: "pharmacy.stock.view",
      },
      {
        path: "pharmacy/stock/low",
        element: <InventoryBranchFrame mode="read"><LowStock /></InventoryBranchFrame>,
        label: "Low Stock",
        feature_key: "inventory",
        permission_key: "pharmacy.stock.view",
      },
      // {
      //   path: "pharmacy/stock/expiring",
      //   element: <ExpiryAlerts />,
      //   label: "Expiring",
      //   feature_key: "inventory",
      // },
    ],
  },
  {
    key: "procurement",
    label: "Procurement",
    // null on purpose: the section shows when the user can see ANY screen inside it.
    // (usePharmacyAccess drops a section whose routes are all hidden.) With a feature
    // key here, a role that has "suppliers" but not "purchase" would lose the whole
    // section, Suppliers included.
    feature_key: null,
    routes: [
      {
        path: "pharmacy/suppliers",
        element: <Suppliers />,
        label: "Suppliers",
        feature_key: "suppliers",
        permission_key: "pharmacy.suppliers.view",
      },

      {
        // no list to view — you open this page to raise an order, so one permission
        path: "pharmacy/generate-purchase-order",
        element: <AutoReorder />,
        label: "Generate PO",
        feature_key: "purchase",
        permission_key: "pharmacy.purchase.generate_create",
      },
      {
        path: "pharmacy/purchase-orders",
        element: <PurchaseOrders />,
        label: "Purchase Orders",
        feature_key: "purchase",
        permission_key: "pharmacy.purchase.view",
      },
      {
        // 25 Oct fix — this said "pharmacy.purchase.receive_view", a key that does not
        // exist anywhere else. The receive_view / receive_create split was REVERSED on
        // 24 Oct in favour of one permission, and routes/Pharmacy/
        // pharmacyReceivePurchaseOrder.js has read `pharmacy.purchase.receive` for both
        // view and confirm ever since (its PERM object maps view and receive to the same
        // key). The stale key here was harmless only because permission_key was not
        // enforced in the sidebar; now that it is, leaving it would have taken Receive PO
        // off every staff member's menu while the server happily let them in.
        path: "pharmacy/receive-purchase-order",
        element: <ReceivePurchaseOrder />,
        label: "Receive PO",
        feature_key: "purchase",
        permission_key: "pharmacy.purchase.receive",
      },

      {
        path: "pharmacy/sale-based-order",
        element: <AutoReorder variant="sales" />,
        label: "Sale-based Order",
        feature_key: "purchase",
        permission_key: "pharmacy.purchase.salebased_create",
      },
      {
        // stock back to the supplier (debit note / refund) — feature added by
        // sql/2026-10-22_purchase_returns.sql
        path: "pharmacy/purchase-returns",
        element: <PurchaseReturns />,
        label: "Purchase Returns",
        feature_key: "purchase_return",
        permission_key: "pharmacy.purchase_return.view",
      },
      {
        // was feature_key "purchase", which let anyone with purchase.view in here while
        // the purchase_transfer feature and its permissions sat unused
        path: "pharmacy/purchase-transfer",
        element: <PurchaseTransfer />,
        label: "Purchase Transfer",
        feature_key: "purchase_transfer",
        permission_key: "pharmacy.purchase_transfer.view",
      },
      {
        path: "pharmacy/b2b-sale",
        element: <B2BSales />,
        label: "B2B Sale",
        feature_key: "b2b_sales",
        permission_key: "pharmacy.b2b_sales.view",
      },
      {
        // Purchase Orders, Generated Orders, Supplier Payments, Purchase Returns, Transfers, B2B and
        // Sales — preview, then CSV / PDF. Feature + permissions: sql/2026-10-23_procurement_reports.sql
        path: "pharmacy/procurement-reports",
        element: <ProcurementReportsPage />,
        label: "Reports",
        feature_key: "reports",
        permission_key: "pharmacy.reports.view",
      },
    ],
  },
  {
    key: "sales",
    // null on purpose, same reasoning as the procurement section above: the section shows
    // when the user can open ANY screen inside it. Before 25 Oct these four routes carried
    // no feature_key and no permission_key at all, and usePharmacyAccess treats a missing
    // key as "allowed" (`!key` is true) — so every pharmacy employee saw the whole Sales
    // section, New sale included, whatever their role said.
    label: "Sales",
    feature_key: null,
    routes: [
      {
        // you open this page to bill someone, so create is the permission that opens it
        path: "pharmacy/sales/new",
        element: <SalesBranchFrame mode="write"><CreateSale /></SalesBranchFrame>,
        label: "New Sale",
        feature_key: "sales",
        permission_key: "pharmacy.sales.create",
      },
      {
        path: "pharmacy/sales/all",
        element: <SalesBranchFrame mode="read"><AllSales /></SalesBranchFrame>,
        label: "All Sales",
        feature_key: "sales",
        permission_key: "pharmacy.sales.view",
      },
      {
        // dues / collections — routes/Pharmacy/pharmacy_payments.js guards on this key
        path: "pharmacy/sales/payments",
        element: <SalesBranchFrame mode="read"><SalesPayments /></SalesBranchFrame>,
        label: "Payments",
        feature_key: "sales",
        permission_key: "pharmacy.payments.view",
      },
      {
        // routes/Pharmacy/pharmacy_returns.js guards on the hyphenated key
        path: "pharmacy/sales/returns",
        element: <SalesBranchFrame mode="read"><SalesReturns /></SalesBranchFrame>,
        label: "Returns",
        feature_key: "sales",
        permission_key: "pharmacy.sales-returns.view",
      },
      {
        // The counter's customer book. routes/Pharmacy/pharmacyCustomer.js has had full CRUD
        // since it was written; until now nothing but the POS type-ahead ever called it.
        path: "pharmacy/sales/customers",
        element: <Customers />,
        label: "Customers",
        feature_key: "sales",
        permission_key: "pharmacy.customers.view",
      },
    ],
  },

  {
    // Bhargavi's reporting screens. Procurement has its own Reports page (above);
    // these are the sales-side and stock-side reports it does not cover.
    key: "sales_reports",
    label: "Reports",
    feature_key: null,
    routes: [
      {
        path: "pharmacy/reports/sales",
        element: <SalesReportsPage />,
        label: "Sales Reports",
        feature_key: "sales",
        permission_key: "pharmacy.sales.view",
      },
      {
        path: "pharmacy/reports/daily-collection",
        element: <DailyCollectionPage />,
        label: "Daily Collection",
        feature_key: "reports",
        permission_key: "pharmacy.reports.view",
      },
      // {
      //   path: "pharmacy/reports/low-stock",
      //   element: <LowStockReportPage />,
      //   label: "Low Stock",
      //   feature_key: "reports",
      //   permission_key: "pharmacy.reports.view",
      // },
      {
        path: "pharmacy/reports/expiring-soon",
        element: <ExpiringSoonReportPage />,
        label: "Expiring Soon",
        feature_key: "reports",
        permission_key: "pharmacy.reports.view",
      },
    ],
  },
];

// Flat array for <Routes> mounting
export const pharmacyRoutes = [
  {
    path: "pharmacy",
    element: <PharmacyDashboard />,
    label: "Dashboard",
    feature_key: null,
  },
  ...pharmacySections.flatMap((s) => s.routes),
];