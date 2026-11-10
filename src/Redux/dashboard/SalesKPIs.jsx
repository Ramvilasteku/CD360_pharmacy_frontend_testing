// src/Redux/dashboard/SalesKPIs.jsx
// Row 2 — 4 sales tiles.

import React from "react";
import { Box } from "@mui/material";
import CurrencyRupeeIcon from "@mui/icons-material/CurrencyRupee";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import AssignmentIcon from "@mui/icons-material/Assignment";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import KPICard from "./KPICard";

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export default function SalesKPIs({ data, loading }) {
  return (
    <Box sx={{
      display: "grid",
      gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
      gap: 2, mb: 3,
    }}>
      <KPICard
        icon={<CurrencyRupeeIcon />}
        label="Today's sales"
        value={inr(data.todaySales)}
        hint={`${data.todayBills} bills`}
        color="#3B8664" bg="#e6f2ed"
        loading={loading}
      />
      <KPICard
        icon={<CalendarMonthIcon />}
        label="Month sales"
        value={inr(data.monthSales)}
        color="#5479B5" bg="#e8eef8"
        loading={loading}
      />
      <KPICard
        icon={<AssignmentIcon />}
        label="Pending dispensing"
        value={data.pendingDispensing}
        color="#E5A73A" bg="#fdf4e0"
        loading={loading}
      />
      <KPICard
        icon={<AccountBalanceWalletIcon />}
        label="Outstanding dues"
        value={inr(data.outstandingDues)}
        color="#D9536F" bg="#fce7ec"
        loading={loading}
      />
    </Box>
  );
}
