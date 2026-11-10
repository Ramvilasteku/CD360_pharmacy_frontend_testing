// src/Redux/dashboard/InventoryKPIs.jsx
// Row 1 — 4 inventory tiles.

import React from "react";
import { Box } from "@mui/material";
import MedicationIcon from "@mui/icons-material/Medication";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ScheduleIcon from "@mui/icons-material/Schedule";
import KPICard from "./KPICard";

export default function InventoryKPIs({ data, loading }) {
  return (
    <Box sx={{
      display: "grid",
      gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
      gap: 2, mb: 2,
    }}>
      <KPICard
        icon={<MedicationIcon />}
        label="Active medicines"
        value={data.activeMedicines.toLocaleString()}
        color="#E86A6A" bg="#fdecec"
        loading={loading}
      />
      <KPICard
        icon={<Inventory2Icon />}
        label="Units in stock"
        value={data.unitsInStock.toLocaleString()}
        color="#A67C52" bg="#f5efe6"
        loading={loading}
      />
      <KPICard
        icon={<WarningAmberIcon />}
        label="Low-stock items"
        value={data.lowStockCount}
        hint="At or below reorder"
        color="#E5A73A" bg="#fdf4e0"
        loading={loading}
      />
      <KPICard
        icon={<ScheduleIcon />}
        label="Expiring in 90 days"
        value={data.expiringCount}
        color="#D9536F" bg="#fce7ec"
        loading={loading}
      />
    </Box>
  );
}
