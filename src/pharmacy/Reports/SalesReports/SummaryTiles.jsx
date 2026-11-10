// src/components/pharmacy/reports/sales/SummaryTiles.jsx
// 8 KPI tiles — 4 money rows on top, 4 operational rows below.

import React from "react";
import { Paper, Typography, Stack } from "@mui/material";
import { money } from "./formatters";

const Tile = ({ label, value, color = "#0f172a" }) => (
  <Paper
    elevation={0}
    sx={{
      p: 2, borderRadius: 2.5, border: "1px solid #e2e8f0",
      flex: 1, minWidth: 140,
    }}
  >
    <Typography
      variant="caption" color="text.secondary"
      fontWeight={700} sx={{ letterSpacing: 0.5 }}
    >
      {label}
    </Typography>
    <Typography
      fontWeight={800} fontSize={{ xs: 18, sm: 22 }}
      color={color} sx={{ mt: 0.5 }}
    >
      {value}
    </Typography>
  </Paper>
);

export default function SummaryTiles({ summary = {} }) {
  const money4 = [
    { label: "GROSS", value: money(summary.total_subtotal) },
    { label: "DISCOUNT", value: `− ${money(summary.total_discount)}`, color: "#10b981" },
    { label: "GST", value: money(summary.total_tax) },
    { label: "NET SALES", value: money(summary.total_revenue), color: "#0f766e" },
  ];
  const ops4 = [
    { label: "BILLS", value: Number(summary.total_sales || 0).toLocaleString("en-IN") },
    { label: "AVG BILL", value: money(summary.avg_sale_value) },
    { label: "COLLECTED", value: money(summary.total_collected), color: "#10b981" },
    {
      label: "DUE",
      value: money(summary.total_pending),
      color: Number(summary.total_pending) > 0 ? "#ef4444" : "#0f172a",
    },
  ];

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
        {money4.map((t) => <Tile key={t.label} {...t} />)}
      </Stack>
      <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
        {ops4.map((t) => <Tile key={t.label} {...t} />)}
      </Stack>
    </Stack>
  );
}