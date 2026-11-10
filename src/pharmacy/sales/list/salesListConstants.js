// src/components/pharmacy/sales/list/salesListConstants.js
// All static config for the sales list. No React, no logic — just data.

export const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "paid", label: "Paid" },
  { value: "partial", label: "Partial" },
  { value: "unpaid", label: "Unpaid" },
];

export const STATUS_META = {
  paid: { label: "Paid", color: "success" },
  partial: { label: "Partial", color: "warning" },
  unpaid: { label: "Unpaid", color: "error" },
};

export const COLUMNS = [
  { id: "sale_number",    label: "Sale #",   sortable: true },
  { id: "sale_date",      label: "Date",     sortable: true },
  { id: "customer_name",  label: "Customer", sortable: true },
  { id: "grand_total",    label: "Total",    sortable: true, align: "right" },
  { id: "paid_amount",    label: "Paid",     sortable: true, align: "right", wideOnly: true },
  { id: "balance",        label: "Balance",  sortable: false, align: "right" },
  { id: "payment_status", label: "Status",   sortable: false },
  { id: "actions",        label: "Actions",  sortable: false, align: "right", hiddenLabel: true },
];

export const DATE_RANGES = [
  { value: "all",       label: "Any time" },
  { value: "today",     label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7d",        label: "Last 7 days" },
  { value: "30d",       label: "Last 30 days" },
  { value: "month",     label: "This month" },
  { value: "lastMonth", label: "Last month" },
  { value: "custom",    label: "Custom range" },
];

export const SORT_OPTIONS = [
  { value: "sale_date:desc",     label: "Newest first" },
  { value: "sale_date:asc",      label: "Oldest first" },
  { value: "grand_total:desc",   label: "Amount: high to low" },
  { value: "grand_total:asc",    label: "Amount: low to high" },
  { value: "customer_name:asc",  label: "Customer: A to Z" },
];

export const DEFAULT_QUERY = {
  search: "", status: "", from: "", to: "",
  page: 0, limit: 10, sortBy: "sale_date", sortDir: "desc",
};

export const SKELETON_ROWS = 6;

// Visually-hidden style — screen reader can read it, but users don't see it.
export const srOnly = {
  position: "absolute", width: "1px", height: "1px", padding: 0, margin: "-1px",
  overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap", border: 0,
};

// Tabular numeric: all digits same width so prices align in columns.
export const numeric = { fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" };
