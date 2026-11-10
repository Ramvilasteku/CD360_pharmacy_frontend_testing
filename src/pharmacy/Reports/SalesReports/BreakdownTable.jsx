// src/components/pharmacy/reports/sales/BreakdownTable.jsx
// Time-series breakdown — rows shape follows the `group_by` the user picked.

import React from "react";
import {
  Paper, Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Typography,
} from "@mui/material";
import { money, fmtDate } from "./formatters";

const headerLabel = {
  day: "Date",
  week: "Week",
  month: "Month",
  payment_method: "Method",
  staff: "Staff",
};

export default function BreakdownTable({ rows = [], groupBy = "day" }) {
  const formatBucket = (r) => {
    if (groupBy === "day") return fmtDate(r.group_label);
    return r.group_label;
  };

  return (
    <Paper elevation={0}
      sx={{ borderRadius: 3, border: "1px solid #e2e8f0", overflow: "hidden" }}>
      <Typography variant="subtitle1" fontWeight={700} sx={{ p: 2, pb: 1 }}>
        Breakdown by {headerLabel[groupBy] || "Day"}
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "#f8fafc" }}>
              <TableCell sx={{ fontWeight: 700 }}>{headerLabel[groupBy]}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>BILLS</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>REVENUE</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>COLLECTED</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>PENDING</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>GST</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center"
                  sx={{ py: 4, color: "text.secondary" }}>
                  No data for this period
                </TableCell>
              </TableRow>
            ) : rows.map((r, i) => (
              <TableRow key={i} hover>
                <TableCell>{formatBucket(r)}</TableCell>
                <TableCell align="right">{r.total_sales}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  {money(r.total_revenue)}
                </TableCell>
                <TableCell align="right" sx={{ color: "#10b981" }}>
                  {money(r.total_collected)}
                </TableCell>
                <TableCell align="right"
                  sx={{ color: Number(r.total_pending) > 0 ? "#ef4444" : "#64748b" }}>
                  {money(r.total_pending)}
                </TableCell>
                <TableCell align="right">{money(r.total_tax)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}