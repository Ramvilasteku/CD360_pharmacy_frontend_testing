// src/Redux/dashboard/PharmacyDashboard.jsx

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import axios from "axios";
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Avatar,
  Skeleton,
  Alert,
} from "@mui/material";
import MedicationIcon from "@mui/icons-material/Medication";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ScheduleIcon from "@mui/icons-material/Schedule";
import CurrencyRupeeIcon from "@mui/icons-material/CurrencyRupee";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import AssignmentIcon from "@mui/icons-material/Assignment";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import AddIcon from "@mui/icons-material/Add";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";

export default function PharmacyDashboard() {
  const navigate = useNavigate();
  const modules = useSelector((s) => s.auth?.modules || []);
  const features = useSelector((s) => s.auth?.features || []);
  const permissions = useSelector((s) => s.auth?.permissions || []);
  const user = useSelector((s) => s.auth?.user);

  const has = (perm) => permissions.includes(perm);
  const hasFeature = (f) => features.includes(f);
  const hasPharmacy = modules.includes("pharmacy");

  console.log("[PharmacyDashboard] modules:", modules);
console.log("[PharmacyDashboard] features:", features);
console.log("[PharmacyDashboard] permissions:", permissions);
console.log("[PharmacyDashboard] gates:", {
  hasPharmacy,
  hasFeatureMedicines: hasFeature("medicines"),
  hasFeatureSales: hasFeature("sales"),
  canCreateMedicine: has("pharmacy.medicines.create"),
  canCreateSale: has("pharmacy.sales.create"),
  canViewSales: has("pharmacy.sales.view"),
});

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
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
  });

  // Load dashboard data
  useEffect(() => {
    if (!hasPharmacy) return;
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPharmacy]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      // Fetch multiple endpoints in parallel — each with its own error swallow
      const results = await Promise.allSettled([
        axios.get(`${process.env.REACT_APP_URL}/api/pharmacy/medicines?limit=1`, { withCredentials: true }),
        axios.get(`${process.env.REACT_APP_URL}/api/pharmacy/sales/reports/today`, { withCredentials: true }),
        axios.get(`${process.env.REACT_APP_URL}/api/pharmacy/sales/reports/month`, { withCredentials: true }),
        axios.get(`${process.env.REACT_APP_URL}/api/pharmacy/sales/get?limit=5&sort_by=created_at&sort_order=DESC`, { withCredentials: true }),
        axios.get(`${process.env.REACT_APP_URL}/api/pharmacy/batches/expiring?days=90&limit=5`, { withCredentials: true }),
        axios.get(`${process.env.REACT_APP_URL}/api/pharmacy/medicines/reports/reorder-list`, { withCredentials: true }),
      ]);

      const [medicines, todayR, monthR, recentR, expiringR, reorderR] = results;

      setData({
        activeMedicines: medicines.status === "fulfilled" ? (medicines.value.data.pagination?.total || 0) : 0,
        unitsInStock: todayR.status === "fulfilled" ? (todayR.value.data.total_units || 0) : 0,
        lowStockCount: reorderR.status === "fulfilled" ? (reorderR.value.data.total || 0) : 0,
        expiringCount: expiringR.status === "fulfilled" ? (expiringR.value.data.total || 0) : 0,
        todaySales: todayR.status === "fulfilled" ? (todayR.value.data.total_amount || 0) : 0,
        todayBills: todayR.status === "fulfilled" ? (todayR.value.data.total_bills || 0) : 0,
        monthSales: monthR.status === "fulfilled" ? (monthR.value.data.total_amount || 0) : 0,
        pendingDispensing: 0, // wire up when dispensing endpoint exists
        outstandingDues: monthR.status === "fulfilled" ? (monthR.value.data.outstanding || 0) : 0,
        recentSales: recentR.status === "fulfilled" ? (recentR.value.data.data || []) : [],
        expiringSoon: expiringR.status === "fulfilled" ? (expiringR.value.data.data || []) : [],
      });
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Block user if they don't have pharmacy module
  if (!hasPharmacy) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="warning">
          You don't have access to the Pharmacy module. Contact your administrator.
        </Alert>
      </Box>
    );
  }

  const today = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, background: "#f7f8fa", minHeight: "100vh" }}>
      {/* ═════ HEADER ═════ */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: "#1a1a1a" }}>
            Pharmacy Dashboard
          </Typography>
          <Typography variant="body2" sx={{ color: "#666", mt: 0.5 }}>
            Live view of stock, sales and expiry · today, {today}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 1 }}>
          {has("pharmacy.medicines.create") && (
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => navigate("/pharmacy/medicines/new")}
            >
              Add Medicine
            </Button>
          )}
          {has("pharmacy.sales.create") && (
            <Button
              variant="contained"
              startIcon={<PointOfSaleIcon />}
              onClick={() => navigate("/pharmacy/sales")}
            >
              New Sale
            </Button>
          )}
        </Box>
      </Box>

      {/* ═════ ROW 1 — 4 KPIs (inventory) ═════ */}
      {hasFeature("medicines") && (
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 2, mb: 2 }}>
          <KPICard
            icon={<MedicationIcon />}
            label="Active medicines"
            value={data.activeMedicines.toLocaleString()}
            color="#E86A6A"
            bg="#fdecec"
            loading={loading}
          />
          <KPICard
            icon={<Inventory2Icon />}
            label="Units in stock"
            value={data.unitsInStock.toLocaleString()}
            color="#A67C52"
            bg="#f5efe6"
            loading={loading}
          />
          <KPICard
            icon={<WarningAmberIcon />}
            label="Low-stock items"
            value={data.lowStockCount}
            hint="At or below reorder"
            color="#E5A73A"
            bg="#fdf4e0"
            loading={loading}
          />
          <KPICard
            icon={<ScheduleIcon />}
            label="Expiring in 90 days"
            value={data.expiringCount}
            color="#D9536F"
            bg="#fce7ec"
            loading={loading}
          />
        </Box>
      )}

      {/* ═════ ROW 2 — 4 KPIs (sales) ═════ */}
      {hasFeature("sales") && (
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 2, mb: 3 }}>
          <KPICard
            icon={<CurrencyRupeeIcon />}
            label="Today's sales"
            value={`₹${Number(data.todaySales).toLocaleString("en-IN")}`}
            hint={`${data.todayBills} bills`}
            color="#3B8664"
            bg="#e6f2ed"
            loading={loading}
          />
          <KPICard
            icon={<CalendarMonthIcon />}
            label="Month sales"
            value={`₹${Number(data.monthSales).toLocaleString("en-IN")}`}
            color="#5479B5"
            bg="#e8eef8"
            loading={loading}
          />
          <KPICard
            icon={<AssignmentIcon />}
            label="Pending dispensing"
            value={data.pendingDispensing}
            color="#E5A73A"
            bg="#fdf4e0"
            loading={loading}
          />
          <KPICard
            icon={<AccountBalanceWalletIcon />}
            label="Outstanding dues"
            value={`₹${Number(data.outstandingDues).toLocaleString("en-IN")}`}
            color="#D9536F"
            bg="#fce7ec"
            loading={loading}
          />
        </Box>
      )}

      {/* ═════ BOTTOM — Recent Sales + Expiring Soon ═════ */}
      <Box sx={{ display: "grid", gridTemplateColumns: "7fr 5fr", gap: 2 }}>
        {/* Recent Sales */}
        {has("pharmacy.sales.view") && (
          <Paper sx={{ p: 2, borderRadius: 2 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="h6" fontWeight={700}>Recent sales</Typography>
              <Button size="small" onClick={() => navigate("/pharmacy/sales")}>
                View all →
              </Button>
            </Box>
            {loading ? (
              <Skeleton variant="rectangular" height={200} />
            ) : data.recentSales.length === 0 ? (
              <Typography color="textSecondary" sx={{ py: 3, textAlign: "center" }}>
                No sales yet today
              </Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Bill</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell>Paid</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.recentSales.map((s) => (
                    <TableRow key={s.id} hover>
                      <TableCell sx={{ fontWeight: 600, color: "#3b82f6" }}>
                        #{s.sale_number}
                      </TableCell>
                      <TableCell>
                        {s.customer_name || "Walk-in"}
                        {s.customer_phone && (
                          <Typography variant="caption" display="block" color="textSecondary">
                            {s.customer_phone}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">₹{Number(s.grand_total).toFixed(2)}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={s.payment_status}
                          color={
                            s.payment_status === "paid" ? "success" :
                            s.payment_status === "partial" ? "warning" : "error"
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>
        )}

        {/* Expiring Soon */}
        {hasFeature("medicines") && (
          <Paper sx={{ p: 2, borderRadius: 2 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="h6" fontWeight={700}>Expiring soon</Typography>
              <Button size="small" onClick={() => navigate("/pharmacy/batches?filter=expiring")}>
                View all →
              </Button>
            </Box>
            {loading ? (
              <Skeleton variant="rectangular" height={200} />
            ) : data.expiringSoon.length === 0 ? (
              <Typography color="textSecondary" sx={{ py: 3, textAlign: "center" }}>
                Nothing expiring in next 90 days
              </Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Medicine</TableCell>
                    <TableCell>Batch · qty</TableCell>
                    <TableCell>Expiry</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.expiringSoon.map((b) => (
                    <TableRow key={b.id} hover>
                      <TableCell>
                        <Typography fontWeight={600}>{b.medicine_name}</Typography>
                        {b.manufacturer && (
                          <Typography variant="caption" color="textSecondary">
                            {b.manufacturer}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {b.batch_number} · {b.quantity_available}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={new Date(b.expiry_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          sx={{
                            background: b.days_to_expiry < 30 ? "#fce7ec" : "#fdf4e0",
                            color: b.days_to_expiry < 30 ? "#D9536F" : "#A67C52",
                            fontWeight: 600,
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>
        )}
      </Box>
    </Box>
  );
}

/* ─────────── KPI Card Component ─────────── */
function KPICard({ icon, label, value, hint, color, bg, loading }) {
  return (
    <Paper sx={{ p: 2, borderRadius: 2, display: "flex", alignItems: "center", gap: 2 }}>
      <Avatar sx={{ background: bg, color: color, width: 48, height: 48 }}>
        {icon}
      </Avatar>
      <Box sx={{ flex: 1 }}>
        <Typography variant="body2" color="textSecondary" sx={{ fontSize: 12 }}>
          {label}
        </Typography>
        {loading ? (
          <Skeleton width={80} height={32} />
        ) : (
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#1a1a1a" }}>
            {value}
          </Typography>
        )}
        {hint && !loading && (
          <Typography variant="caption" color="textSecondary">
            {hint}
          </Typography>
        )}
      </Box>
    </Paper>
  );
}