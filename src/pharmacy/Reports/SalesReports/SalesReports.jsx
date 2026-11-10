// src/components/pharmacy/reports/sales/SalesReports.jsx
// Main orchestrator — holds selection state, fetches the report, routes
// data into the 5 child sections and the 3 export buttons.
//
// Mount in your routes:
//   import SalesReports from "./components/pharmacy/reports/sales/SalesReports";
//   <Route path="/pharmacy/reports/sales" element={<SalesReports />} />

import React, { useState, useEffect, useCallback } from "react";
import {
  Box, Stack, Typography, Avatar, Alert, Snackbar, Skeleton,
} from "@mui/material";
import AssessmentIcon from "@mui/icons-material/Assessment";

import SalesReportFilters from "./SalesReportFilters";
import SummaryTiles from "./SummaryTiles";
import PaymentSplit from "./PaymentSplit";
import TopMedicines from "./TopMedicines";
import BreakdownTable from "./BreakdownTable";
import TransactionsTable from "./TransactionsTable";
import { fetchReport, downloadReport } from "./salesReportsApi";
import BranchPicker, { usePharmacyBranch } from "../../shared/BranchPicker";
import { localIsoDate } from "./formatters";

export default function SalesReports() {
  const now = new Date();
  const [selection, setSelection] = useState({
    period: "daily",
    date: localIsoDate(),
    group_by: "day",
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    start: localIsoDate(),
    end: localIsoDate(),
  });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [snackbar, setSnackbar] = useState({ open: false, message: "" });
  const [downloading, setDownloading] = useState(null);

  // Branch dropdown. Reports only read, so "All branches" is allowed.
  const br = usePharmacyBranch({ allowAll: true, defaultAll: true }); // opens on All branches (26 Oct 2026)
  // Fold the chosen branch into the selection so fetch AND download both carry it.
  const scoped = { ...selection, branch: br.branch || undefined };

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchReport(scoped);
      setData(res);

      console.log("top revenue medicines list",res);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load report");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [selection, br.branch]);

  useEffect(() => { load(); }, [load]);

  const handleDownload = async (format) => {
    setDownloading(format);
    try {
      await downloadReport(scoped, format);
      setSnackbar({ open: true, message: `${format.toUpperCase()} downloaded` });
    } catch {
      setSnackbar({ open: true, message: "Download failed" });
    } finally {
      setDownloading(null);
    }
  };

  return (
    <Box sx={{ bgcolor: "#f8fafc", minHeight: "100vh" }}>
      <Box sx={{ maxWidth: 1200, mx: "auto", p: { xs: 1.5, sm: 2.5, md: 3 } }}>
        <Stack spacing={2.5}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar sx={{ bgcolor: "#0f766e", width: 44, height: 44 }}>
              <AssessmentIcon />
            </Avatar>
            <Box>
              <Typography variant="h5" fontWeight={800}
                sx={{ fontSize: { xs: 20, sm: 24 } }}>
                Sales Reports
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Daily, monthly and yearly performance · export PDF / Excel / CSV
              </Typography>
            </Box>
            <BranchPicker state={br} />
          </Stack>

          <SalesReportFilters
            selection={selection}
            onChange={setSelection}
            onDownload={handleDownload}
            downloading={downloading}
          />

          {error && (
            <Alert severity="error" onClose={() => setError("")}>
              {error}
            </Alert>
          )}

          {loading ? (
            <Stack spacing={1.5}>
              <Skeleton variant="rounded" height={100} />
              <Skeleton variant="rounded" height={200} />
              <Skeleton variant="rounded" height={300} />
            </Stack>
          ) : data && (
            <>
              <SummaryTiles summary={data.summary} />
              <PaymentSplit summary={data.summary} />
              <TopMedicines rows={data.topMedicines} />
              <BreakdownTable rows={data.breakdown} groupBy={selection.group_by} />
              <TransactionsTable rows={data.transactions} />
            </>
          )}
        </Stack>
      </Box>

      <Snackbar
        open={snackbar.open} autoHideDuration={3000}
        onClose={() => setSnackbar({ open: false, message: "" })}
        message={snackbar.message}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Box>
  );
}