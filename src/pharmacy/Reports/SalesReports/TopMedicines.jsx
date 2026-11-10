// src/components/pharmacy/reports/sales/TopMedicines.jsx
// Top 10 medicines by revenue (comes pre-sorted from the backend).

import React from "react";
import {
  Paper, Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Typography, Avatar, Stack,
} from "@mui/material";
import LocalPharmacyIcon from "@mui/icons-material/LocalPharmacy";
import { money } from "./formatters";

export default function TopMedicines({ rows = [] }) {
  return (
    <Paper elevation={0}
      sx={{ borderRadius: 3, border: "1px solid #e2e8f0", overflow: "hidden" }}>
      <Typography variant="subtitle1" fontWeight={700} sx={{ p: 2, pb: 1 }}>
        Top 10 medicines by revenue
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "#f8fafc" }}>
              <TableCell sx={{ fontWeight: 700, width: 48 }}>#</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>MEDICINE</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, width: 80 }}>UNITS</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, width: 80 }}>BILLS</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, width: 120 }}>REVENUE</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center"
                  sx={{ py: 4, color: "text.secondary" }}>
                  No medicines sold in this period
                </TableCell>
              </TableRow>
            ) : rows.map((m, i) => (
              <TableRow key={m.medicine_id} hover>
                <TableCell sx={{ color: "text.secondary", fontWeight: 700 }}>
                  {i + 1}
                </TableCell>
                <TableCell>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Avatar sx={{
                      width: 32, height: 32,
                      bgcolor: "#0f766e15", color: "#0f766e",
                    }}>
                      <LocalPharmacyIcon fontSize="small" />
                    </Avatar>
                    <Stack>
                      <Typography fontWeight={600}>{m.medicine_name}</Typography>
                      {m.brand_name && (
                        <Typography variant="caption" color="text.secondary">
                          {m.brand_name}
                        </Typography>
                      )}
                    </Stack>
                  </Stack>
                </TableCell>
                <TableCell align="right">
                  {Number(m.units_sold).toLocaleString("en-IN")}
                </TableCell>
                <TableCell align="right">{m.transactions}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: "#0f766e" }}>
                  {money(m.revenue)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}