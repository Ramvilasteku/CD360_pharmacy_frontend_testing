// src/Redux/dashboard/KPICard.jsx
// Shared KPI tile — icon + label + big number + optional hint.
// Used by InventoryKPIs and SalesKPIs.

import React from "react";
import { Paper, Avatar, Box, Typography, Skeleton } from "@mui/material";

export default function KPICard({ icon, label, value, hint, color, bg, loading }) {
  return (
    <Paper sx={{ p: 2, borderRadius: 2, display: "flex", alignItems: "center", gap: 2 }}>
      <Avatar sx={{ background: bg, color, width: 48, height: 48 }}>
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
