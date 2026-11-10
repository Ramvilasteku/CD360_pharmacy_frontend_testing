// src/redux/config/widgetRegistry.js

/**
 * ═══════════════════════════════════════════════════════════════════
 * PHARMACY WIDGET REGISTRY
 * Matches YOUR existing dashboard exactly
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Config-driven approach:
 * - BEFORE: All 8 KPIs hardcoded, shown to everyone
 * - AFTER: Only permitted KPIs shown per role
 * 
 * To add a new widget: just add an object here.
 * To hide from a role: just remove permission from role.
 * ═══════════════════════════════════════════════════════════════════
 */

/* ═══════════════════════════════════════════════════════════════════
   KPI WIDGETS - Your 8 existing dashboard cards
   ═══════════════════════════════════════════════════════════════════ */

export const KPI_WIDGETS = [
  
  /* ───── Row 1: Inventory-focused KPIs ───── */
  
  {
    id: "kpi_active_medicines",
    title: "Active medicines",
    icon: "Pill",
    color: "orange",
    permission: "pharmacy.medicines.view",
    priority: 8,
    endpoint: "/api/pharmacy/dashboard/kpi/active-medicines",
    format: "number",
    action: { label: "View catalog", path: "/pharmacy/medicines" }
  },
  
  {
    id: "kpi_units_in_stock",
    title: "Units in stock",
    icon: "Package",
    color: "gray",
    permission: "pharmacy.stock.view",
    priority: 7,
    endpoint: "/api/pharmacy/dashboard/kpi/units-in-stock",
    format: "number",
  },
  
  {
    id: "kpi_low_stock",
    title: "Low-stock items",
    subtitle: "At or below reorder",
    icon: "AlertTriangle",
    color: "amber",
    permission: "pharmacy.alerts.low_stock",
    priority: 9,
    endpoint: "/api/pharmacy/dashboard/kpi/low-stock",
    format: "number",
    action: { label: "View", path: "/pharmacy/low-stock" }
  },
  
  {
    id: "kpi_expiring_90_days",
    title: "Expiring in 90 days",
    icon: "Clock",
    color: "pink",
    permission: "pharmacy.alerts.expiry",
    priority: 8,
    endpoint: "/api/pharmacy/dashboard/kpi/expiring-90-days",
    format: "number",
    action: { label: "Review", path: "/pharmacy/expiry-alerts" }
  },
  
  /* ───── Row 2: Sales/Financial KPIs ───── */
  
  {
    id: "kpi_today_sales",
    title: "Today's sales",
    subtitle: "28 bills",
    icon: "IndianRupee",
    color: "green",
    permission: "pharmacy.sales.view",
    priority: 10,
    endpoint: "/api/pharmacy/dashboard/kpi/today-sales",
    format: "currency",
    showBillsCount: true,
  },
  
  {
    id: "kpi_month_sales",
    title: "Month sales",
    icon: "IndianRupee",
    color: "blue",
    permission: "pharmacy.reports.sales",
    priority: 9,
    endpoint: "/api/pharmacy/dashboard/kpi/month-sales",
    format: "currency",
  },
  
  {
    id: "kpi_pending_dispensing",
    title: "Pending dispensing",
    icon: "FileText",
    color: "coral",
    permission: "pharmacy.dispensing.view",
    plan_type: ["clinic", "hospital"],
    priority: 9,
    endpoint: "/api/pharmacy/dashboard/kpi/pending-dispensing",
    format: "number",
    action: { label: "Dispense", path: "/pharmacy/dispensing/queue" }
  },
  
  {
    id: "kpi_outstanding_dues",
    title: "Outstanding dues",
    icon: "IndianRupee",
    color: "red",
    permission: "pharmacy.payments.view",
    priority: 7,
    endpoint: "/api/pharmacy/dashboard/kpi/outstanding-dues",
    format: "currency",
    action: { label: "Collect", path: "/pharmacy/payments" }
  },
];


/* ═══════════════════════════════════════════════════════════════════
   TABLE WIDGETS - Recent sales & Expiring soon
   ═══════════════════════════════════════════════════════════════════ */

export const TABLE_WIDGETS = [
  {
    id: "table_recent_sales",
    title: "Recent sales",
    permission: "pharmacy.sales.view",
    priority: 10,
    endpoint: "/api/pharmacy/dashboard/tables/recent-sales",
    columns: [
      { key: "sale_number", label: "Bill" },
      { key: "customer_name", label: "Customer", subKey: "customer_phone" },
      { key: "grand_total", label: "Total", format: "currency" },
      { key: "payment_status", label: "Paid", type: "badge" },
    ],
    action: { label: "View all", path: "/pharmacy/sales" },
  },
  
  {
    id: "table_expiring_soon",
    title: "Expiring soon",
    permission: "pharmacy.alerts.expiry",
    priority: 9,
    endpoint: "/api/pharmacy/dashboard/tables/expiring-soon",
    columns: [
      { key: "medicine_name", label: "Medicine", subKey: "manufacturer" },
      { key: "batch_number", label: "Batch · qty", format: "batch_qty" },
      { key: "expiry_date", label: "Expiry", type: "pill", format: "date" },
    ],
    action: { label: "View all", path: "/pharmacy/expiry-alerts" },
  },
];


/* ═══════════════════════════════════════════════════════════════════
   HEADER ACTION BUTTONS - Top-right buttons
   ═══════════════════════════════════════════════════════════════════ */

export const HEADER_ACTIONS = [
  {
    id: "action_add_medicine",
    label: "Add medicine",
    icon: "Plus",
    permission: "pharmacy.medicines.create",
    path: "/pharmacy/medicines/new",
    variant: "secondary",
  },
  {
    id: "action_new_sale",
    label: "New sale",
    icon: "IndianRupee",
    permission: "pharmacy.sales.create",
    path: "/pharmacy/sales/new",
    variant: "primary",
  },
];


/* ═══════════════════════════════════════════════════════════════════
   PERMISSION → WIDGET MAP (documentation reference)
   ═══════════════════════════════════════════════════════════════════ */

export const PERMISSION_WIDGET_MAP = {
  "pharmacy.medicines.view": ["kpi_active_medicines"],
  "pharmacy.medicines.create": ["action_add_medicine"],
  "pharmacy.stock.view": ["kpi_units_in_stock"],
  "pharmacy.alerts.low_stock": ["kpi_low_stock"],
  "pharmacy.alerts.expiry": ["kpi_expiring_90_days", "table_expiring_soon"],
  "pharmacy.sales.view": ["kpi_today_sales", "table_recent_sales"],
  "pharmacy.sales.create": ["action_new_sale"],
  "pharmacy.reports.sales": ["kpi_month_sales"],
  "pharmacy.dispensing.view": ["kpi_pending_dispensing"],
  "pharmacy.payments.view": ["kpi_outstanding_dues"],
};