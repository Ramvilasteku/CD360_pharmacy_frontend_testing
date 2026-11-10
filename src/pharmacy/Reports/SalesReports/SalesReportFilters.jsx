// src/components/pharmacy/reports/sales/SalesReportFilters.jsx
// Period toggle + dynamic field group + group-by dropdown + 3 export buttons.

import React from "react";
import {
  Paper, Stack, ToggleButtonGroup, ToggleButton, TextField, MenuItem,
  Button, CircularProgress, Box,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import GridOnIcon from "@mui/icons-material/GridOn";

const PERIODS = [
  { value: "daily", label: "Daily" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
  { value: "range", label: "Range" },
];

export default function SalesReportFilters({
  selection, onChange, onDownload, downloading,
}) {
  const set = (patch) => onChange({ ...selection, ...patch });
  const btn = { textTransform: "none", borderRadius: 2, fontWeight: 600 };

  return (
    <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #e2e8f0" }}>
      <Stack spacing={2}>
        <ToggleButtonGroup
          exclusive size="small" value={selection.period}
          onChange={(_, v) => v && set({ period: v })}
          sx={{ flexWrap: "wrap" }}
        >
          {PERIODS.map((p) => (
            <ToggleButton key={p.value} value={p.value} sx={{ textTransform: "none", px: 2 }}>
              {p.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}
          flexWrap="wrap" useFlexGap alignItems={{ md: "center" }}>
          {selection.period === "daily" && (
            <TextField size="small" type="date" label="Date"
              InputLabelProps={{ shrink: true }} value={selection.date}
              onChange={(e) => set({ date: e.target.value })}
              sx={{ minWidth: 180 }} />
          )}
          {selection.period === "range" && (
            <>
              <TextField size="small" type="date" label="From"
                InputLabelProps={{ shrink: true }} value={selection.start}
                onChange={(e) => set({ start: e.target.value })}
                sx={{ minWidth: 160 }} />
              <TextField size="small" type="date" label="To"
                InputLabelProps={{ shrink: true }} value={selection.end}
                onChange={(e) => set({ end: e.target.value })}
                sx={{ minWidth: 160 }} />
            </>
          )}
          {selection.period === "monthly" && (
            <>
              <TextField select size="small" label="Month" value={selection.month}
                onChange={(e) => set({ month: Number(e.target.value) })}
                sx={{ minWidth: 160 }}>
                {Array.from({ length: 12 }, (_, i) => (
                  <MenuItem key={i + 1} value={i + 1}>
                    {new Date(2000, i).toLocaleString("en-IN", { month: "long" })}
                  </MenuItem>
                ))}
              </TextField>
              <TextField size="small" type="number" label="Year" value={selection.year}
                onChange={(e) => set({ year: Number(e.target.value) })}
                sx={{ width: 120 }} />
            </>
          )}
          {selection.period === "yearly" && (
            <TextField size="small" type="number" label="Year" value={selection.year}
              onChange={(e) => set({ year: Number(e.target.value) })}
              sx={{ width: 140 }} />
          )}
          <TextField select size="small" label="Group by" value={selection.group_by}
            onChange={(e) => set({ group_by: e.target.value })}
            sx={{ minWidth: 160 }}>
            <MenuItem value="day">Day</MenuItem>
            <MenuItem value="week">Week</MenuItem>
            <MenuItem value="month">Month</MenuItem>
            <MenuItem value="payment_method">Payment method</MenuItem>
            <MenuItem value="staff">Staff</MenuItem>
          </TextField>

          <Box sx={{ flexGrow: 1 }} />

          <Stack direction="row" spacing={1}>
            {[
              { f: "pdf", label: "PDF", icon: <PictureAsPdfIcon /> },
              { f: "excel", label: "Excel", icon: <GridOnIcon /> },
              { f: "csv", label: "CSV", icon: <DownloadIcon /> },
            ].map(({ f, label, icon }) => (
              <Button key={f} variant="outlined" sx={btn}
                startIcon={downloading === f ? <CircularProgress size={16} /> : icon}
                onClick={() => onDownload(f)} disabled={!!downloading}>
                {label}
              </Button>
            ))}
          </Stack>
        </Stack>
      </Stack>
    </Paper>
  );
}