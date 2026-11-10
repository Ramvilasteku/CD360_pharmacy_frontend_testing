// src/Redux/dashboard/pharmacyDashboardApi.js
// 6 parallel API calls → one normalized dashboard payload.

import axios from "axios";

const API = process.env.REACT_APP_URL;

export const EMPTY_DASHBOARD = {
  activeMedicines: 0,
  unitsInStock: 0,
  lowStockCount: 0,
  expiringCount: 0,
  todaySales: 0,
  todayBills: 0,
  monthSales: 0,
  pendingDispensing: 0,
  outstandingDues: 0,
  recentSales: [],
  expiringSoon: [],
};

const G = (res, path, fallback) =>
  res.status === "fulfilled" ? (path(res.value.data) ?? fallback) : fallback;

export async function fetchDashboard() {
  const results = await Promise.allSettled([
    axios.get(`${API}/api/pharmacy/medicines?limit=1`, { withCredentials: true }),
    axios.get(`${API}/api/pharmacy/sales/reports/today`, { withCredentials: true }),
    axios.get(`${API}/api/pharmacy/sales/reports/month`, { withCredentials: true }),
    axios.get(`${API}/api/pharmacy/sales/get?limit=5&sort_by=created_at&sort_order=DESC`, { withCredentials: true }),
    axios.get(`${API}/api/pharmacy/batches/expiring?days=90&limit=5`, { withCredentials: true }),
    axios.get(`${API}/api/pharmacy/medicines/reports/reorder-list`, { withCredentials: true }),
  ]);

  const [medicines, todayR, monthR, recentR, expiringR, reorderR] = results;

  return {
    activeMedicines:   G(medicines, (d) => d.pagination?.total, 0),
    unitsInStock:      G(todayR,    (d) => d.total_units,       0),
    lowStockCount:     G(reorderR,  (d) => d.total,             0),
    expiringCount:     G(expiringR, (d) => d.total,             0),
    todaySales:        G(todayR,    (d) => d.total_amount,      0),
    todayBills:        G(todayR,    (d) => d.total_bills,       0),
    monthSales:        G(monthR,    (d) => d.total_amount,      0),
    pendingDispensing: 0, // wire up when dispensing endpoint exists
    outstandingDues:   G(monthR,    (d) => d.outstanding,       0),
    recentSales:       G(recentR,   (d) => d.data,              []),
    expiringSoon:      G(expiringR, (d) => d.data,              []),
  };
}
