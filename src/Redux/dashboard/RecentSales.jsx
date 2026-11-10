// src/Redux/dashboard/RecentSales.jsx
// Recent 5 sales — bill number, customer, amount, paid-status chip.

import React from "react";
import {
  Paper, Box, Typography, Button, Table, TableHead, TableBody,
  TableRow, TableCell, Chip, Skeleton,
} from "@mui/material";

export default function RecentSales({ rows = [], loading, onViewAll }) {
  return (
    <Paper sx={{ p: 2, borderRadius: 2 }}>
      <Box sx={{
        display: "flex", justifyContent: "space-between",
        alignItems: "center", mb: 2,
      }}>
        <Typography variant="h6" fontWeight={700}>Recent sales</Typography>
        <Button size="small" onClick={onViewAll}>View all →</Button>
      </Box>

      {loading ? (
        <Skeleton variant="rectangular" height={200} />
      ) : rows.length === 0 ? (
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
            {rows.map((s) => (
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
                <TableCell align="right">
                  ₹{Number(s.grand_total).toFixed(2)}
                </TableCell>
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
  );
}
