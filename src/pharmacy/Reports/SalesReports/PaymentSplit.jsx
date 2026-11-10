// src/components/pharmacy/reports/sales/PaymentSplit.jsx
// Payment-method split from the summary — one row per method with amount + %.

import React from "react";
import {
  Paper, Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Typography, Chip,
} from "@mui/material";
import { money } from "./formatters";

const METHODS = [
  { key: "cash_sales", label: "Cash", color: "#10b981" },
  { key: "upi_sales", label: "UPI", color: "#6366f1" },
  { key: "card_sales", label: "Card", color: "#f59e0b" },
  { key: "bank_sales", label: "Bank Transfer", color: "#8b5cf6" },
  { key: "credit_sales", label: "Credit", color: "#ef4444" },
  { key: "mixed_sales", label: "Mixed", color: "#64748b" },
];

export default function PaymentSplit({ summary = {} }) {
  const rows = METHODS.filter((m) => Number(summary[m.key] || 0) > 0);
  const total = rows.reduce((s, m) => s + Number(summary[m.key] || 0), 0);

  return (
    <Paper elevation={0}
      sx={{ borderRadius: 3, border: "1px solid #e2e8f0", overflow: "hidden" }}>
      <Typography variant="subtitle1" fontWeight={700} sx={{ p: 2, pb: 1 }}>
        Collection by payment method
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "#f8fafc" }}>
              <TableCell sx={{ fontWeight: 700 }}>METHOD</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>AMOUNT</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, width: 80 }}>SHARE</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} align="center"
                  sx={{ py: 4, color: "text.secondary" }}>
                  No payments in this period
                </TableCell>
              </TableRow>
            ) : rows.map((m) => (
              <TableRow key={m.key} hover>
                <TableCell>
                  <Chip label={m.label} size="small"
                    sx={{ bgcolor: `${m.color}20`, color: m.color, fontWeight: 600 }} />
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  {money(summary[m.key])}
                </TableCell>
                <TableCell align="right">
                  {total > 0
                    ? `${Math.round((Number(summary[m.key]) / total) * 100)}%`
                    : "0%"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}