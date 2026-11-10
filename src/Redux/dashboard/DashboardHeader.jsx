// src/Redux/dashboard/DashboardHeader.jsx
// Title + subtitle (today's date) + two permission-gated action buttons.

import React from "react";
import { Box, Typography, Button } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";

export default function DashboardHeader({ onAddMedicine, onNewSale, can }) {
  const today = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <Box sx={{
      display: "flex", justifyContent: "space-between",
      alignItems: "flex-start", mb: 3,
    }}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700, color: "#1a1a1a" }}>
          Pharmacy Dashboard
        </Typography>
        <Typography variant="body2" sx={{ color: "#666", mt: 0.5 }}>
          Live view of stock, sales and expiry · today, {today}
        </Typography>
      </Box>

      <Box sx={{ display: "flex", gap: 1 }}>
        {can("pharmacy.medicines.create") && (
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={onAddMedicine}
          >
            Add Medicine
          </Button>
        )}
        {can("pharmacy.sales.create") && (
          <Button
            variant="contained"
            startIcon={<PointOfSaleIcon />}
            onClick={onNewSale}
          >
            New Sale
          </Button>
        )}
      </Box>
    </Box>
  );
}
