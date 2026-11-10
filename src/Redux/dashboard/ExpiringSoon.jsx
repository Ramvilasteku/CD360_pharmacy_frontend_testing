// src/Redux/dashboard/ExpiringSoon.jsx
// Next 5 batches expiring within 90 days — red chip under 30 days.

import React from "react";
import {
  Paper, Box, Typography, Button, Table, TableHead, TableBody,
  TableRow, TableCell, Chip, Skeleton,
} from "@mui/material";

const expiryDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });

export default function ExpiringSoon({ rows = [], loading, onViewAll }) {
  return (
    <Paper sx={{ p: 2, borderRadius: 2 }}>
      <Box sx={{
        display: "flex", justifyContent: "space-between",
        alignItems: "center", mb: 2,
      }}>
        <Typography variant="h6" fontWeight={700}>Expiring soon</Typography>
        <Button size="small" onClick={onViewAll}>View all →</Button>
      </Box>

      {loading ? (
        <Skeleton variant="rectangular" height={200} />
      ) : rows.length === 0 ? (
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
            {rows.map((b) => (
              <TableRow key={b.id} hover>
                <TableCell>
                  <Typography fontWeight={600}>{b.medicine_name}</Typography>
                  {b.manufacturer && (
                    <Typography variant="caption" color="textSecondary">
                      {b.manufacturer}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>{b.batch_number} · {b.quantity_available}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={expiryDate(b.expiry_date)}
                    sx={{
                      background: b.days_to_expiry < 30 ? "#fce7ec" : "#fdf4e0",
                      color:      b.days_to_expiry < 30 ? "#D9536F" : "#A67C52",
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
  );
}
