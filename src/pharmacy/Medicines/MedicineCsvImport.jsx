// src/components/pharmacy/medicines/MedicineCsvImport.jsx
//
// CSV import — upload → review → import → result.
// Per row: find-or-create medicine_data, map category_name → category_id,
// POST pharmacy_medicines. Rows missing required fields are flagged
// (precheck) and skipped before import, so time is spent only on
// rows that can succeed.

import React, { useState, useMemo, useCallback } from "react";
import axios from "axios";
import {
  Box, Stack, Paper, Typography, Button, IconButton, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  CircularProgress, LinearProgress,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";

import {
  API, CSV_COLUMNS, numeric, btn,
  Pill, money, toneText, errMsg,
} from "./medicinesShared";

/* CSV parser — handles quoted fields and strips Excel's BOM */
function parseCsv(text) {
  const clean = text.replace(/^﻿/, "");
  const lines = clean
    .split(/\r?\n/)
    .map((l, i) => ({ text: l, line: i + 1 }))
    .filter((l) => l.text.trim() !== "");
  if (lines.length < 2) return { headers: [], rows: [] };

  const splitLine = (line) => {
    const out = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQ && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQ = !inQ;
      } else if (c === "," && !inQ) {
        out.push(cur);
        cur = "";
      } else cur += c;
    }
    out.push(cur);
    return out;
  };

  const headers = splitLine(lines[0].text).map((h) => h.trim().toLowerCase());
  const rows = lines.slice(1).map(({ text: line, line: lineNo }) => {
    const vals = splitLine(line);
    const row = { __line: lineNo };
    headers.forEach((h, i) => {
      row[h] = (vals[i] ?? "").trim();
    });
    return row;
  });
  return { headers, rows };
}

export default function MedicineCsvImport({
  open,
  isPhone,
  onClose,
  categories,
  onComplete,
  showMessage,
}) {
  const theme = useTheme();
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState("");

  const categoryMap = useMemo(
    () =>
      Object.fromEntries(
        categories.map((c) => [
          String(c.category_name || "").trim().toLowerCase(),
          c.id,
        ])
      ),
    [categories]
  );

  const precheck = useCallback(
    (r) => {
      if (!r.medicine_name?.trim()) return "Missing medicine_name";
      const cat = (r.category_name || "").trim().toLowerCase();
      if (!cat) return "Missing category_name";
      if (!categoryMap[cat]) return `Category '${r.category_name}' not found`;
      return "";
    },
    [categoryMap]
  );

  const reset = () => {
    setFileName("");
    setRows([]);
    setHeaders([]);
    setStatuses([]);
    setDone(false);
    setFileError("");
  };

  const readFile = (file) => {
    if (!file) return;
    if (!/\.csv$/i.test(file.name) && file.type !== "text/csv") {
      setFileError("Choose a .csv file. In Excel use File → Save As → CSV.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const parsed = parseCsv(String(ev.target.result || ""));
      if (!parsed.rows.length) {
        setFileError("This file has no rows under the header line.");
        return;
      }
      setFileError("");
      setFileName(file.name);
      setHeaders(parsed.headers);
      setRows(parsed.rows);
      setStatuses(
        parsed.rows.map((r) => {
          const problem = precheck(r);
          return problem
            ? { state: "skipped", message: problem }
            : { state: "ready", message: "" };
        })
      );
      setDone(false);
    };
    reader.readAsText(file);
  };

  const readyCount = statuses.filter((s) => s.state === "ready").length;
  const skippedCount = statuses.filter((s) => s.state === "skipped").length;
  const importedCount = statuses.filter((s) => s.state === "imported").length;
  const failedCount = statuses.filter((s) => s.state === "failed").length;
  const processed = importedCount + failedCount;
  const toImport = done
    ? 0
    : readyCount +
      (running ? statuses.filter((s) => s.state === "importing").length : 0);
  const missingRequired =
    headers.length > 0 &&
    !["medicine_name", "category_name"].every((h) => headers.includes(h));

  const setRowStatus = (i, next) =>
    setStatuses((prev) => {
      const copy = [...prev];
      copy[i] = next;
      return copy;
    });

  const runImport = async () => {
    const targets = statuses
      .map((s, i) => (s.state === "ready" ? i : -1))
      .filter((i) => i >= 0);
    if (!targets.length) return;
    setRunning(true);
    let ok = 0;
    let failed = 0;

    for (const i of targets) {
      const r = rows[i];
      setRowStatus(i, { state: "importing", message: "" });
      try {
        // 1. Find or create medicine_data
        const name = r.medicine_name.trim();
        const findRes = await axios.get(
          `${API}/api/pharmacy/medicine-data/get`,
          { params: { search: name, limit: 20 }, withCredentials: true }
        );
        const match = (findRes.data.data || []).find(
          (m) =>
            m.medicine_name?.toLowerCase() === name.toLowerCase() &&
            (!r.strength ||
              (m.strength || "").toLowerCase() === r.strength.toLowerCase()) &&
            (!r.dosage_form ||
              (m.dosage_form || "").toLowerCase() === r.dosage_form.toLowerCase())
        );

        let medDataId = match?.id ?? null;
        if (!medDataId) {
          const createRes = await axios.post(
            `${API}/api/pharmacy/medicine-data/post`,
            {
              medicine_name: name,
              generic_name: r.generic_name || null,
              brand_name: r.brand_name || null,
              dosage_form: r.dosage_form || null,
              strength: r.strength || null,
            },
            { withCredentials: true }
          );
          medDataId = createRes.data.data?.id;
        }

        // 2. Category
        const catId = categoryMap[(r.category_name || "").trim().toLowerCase()];
        if (!catId) throw new Error(`Category '${r.category_name}' not found`);

        // 3. Create pharmacy_medicine
        let parsedPolicy;
        if (r.return_policy) {
          try { parsedPolicy = JSON.parse(r.return_policy); } catch { parsedPolicy = undefined; }
        }
        await axios.post(
          `${API}/api/pharmacy/medicines/post`,
          {
            medicine_data_id: medDataId,
            category_id: catId,
            manufacturer: r.manufacturer || null,
            pack_size: r.pack_size || null,
            unit: r.unit || null,
            medicine_code: r.medicine_code || null,
            barcode: r.barcode || null,
            hsn_code: r.hsn_code || null,
            gst_percentage: Number(r.gst_percentage) || 0,
            purchase_price: Number(r.purchase_price) || 0,
            selling_price: Number(r.selling_price) || 0,
            reorder_level: Number(r.reorder_level) || 0,
            maximum_stock: r.maximum_stock ? Number(r.maximum_stock) : null,
            prescription_required: ["1", "true", "yes", "y"].includes(
              (r.prescription_required || "").toLowerCase()
            ),
            return_policy: parsedPolicy,
          },
          { withCredentials: true }
        );

        ok += 1;
        setRowStatus(i, { state: "imported", message: "" });
      } catch (err) {
        failed += 1;
        setRowStatus(i, {
          state: "failed",
          message: errMsg(err, err.message || "Failed"),
        });
      }
    }

    setRunning(false);
    setDone(true);
    const skipped = statuses.filter((s) => s.state === "skipped").length;
    if (failed === 0 && skipped === 0)
      showMessage(`Imported ${ok} ${ok === 1 ? "medicine" : "medicines"}`);
    else
      showMessage(
        `Imported ${ok} of ${rows.length} — ${failed + skipped} need attention`,
        "warning"
      );
  };

  const downloadTemplate = () => {
    const header = CSV_COLUMNS.join(",");
    const example =
      "Paracetamol 500mg,Paracetamol,Dolo,Tablet,500mg,Analgesics,Micro Labs,10 tablets,strip,PCM500,8901234567890,30049099,12,15,20,10,100,0";
    const blob = new Blob([`${header}\n${example}`], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "medicines-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusPill = (s) => {
    switch (s?.state) {
      case "ready":
        return <Pill tone="primary" outlined>Ready</Pill>;
      case "importing":
        return (
          <Stack direction="row" spacing={1} alignItems="center">
            <CircularProgress size={14} />
            <Typography variant="caption">Importing</Typography>
          </Stack>
        );
      case "imported":
        return <Pill tone="success">Imported</Pill>;
      case "failed":
        return <Pill tone="error" title={s.message}>Failed</Pill>;
      case "skipped":
        return <Pill tone="warning" title={s.message}>Skipped</Pill>;
      default:
        return null;
    }
  };

  const close = () => {
    if (running) return;
    const imported = importedCount > 0;
    reset();
    if (imported) onComplete();
    else onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      maxWidth="md" fullWidth
      fullScreen={isPhone}
      PaperProps={{ sx: { borderRadius: isPhone ? 0 : "18px" } }}
    >
      <DialogTitle
        component="div"
        sx={{
          display: "flex", alignItems: "flex-start", gap: 1,
          borderBottom: 1, borderColor: "divider", pb: 1.5,
          pt: isPhone ? "calc(16px + env(safe-area-inset-top))" : undefined,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" component="h2" fontWeight={700}>
            Import medicines from CSV
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {rows.length
              ? `${fileName} · ${rows.length} ${rows.length === 1 ? "row" : "rows"}`
              : "Add many medicines to your inventory at once"}
          </Typography>
        </Box>
        <IconButton
          aria-label="Close"
          onClick={close}
          disabled={running}
          sx={{ mt: -0.5, mr: -1 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: { xs: 2, sm: 3 }, py: "20px !important" }}>
        {rows.length === 0 ? (
          <Stack spacing={2.5}>
            <Box
              component="label"
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                readFile(e.dataTransfer.files?.[0]);
              }}
              sx={{
                display: "flex", flexDirection: "column", alignItems: "center",
                textAlign: "center", gap: 1, cursor: "pointer",
                px: 3, py: { xs: 5, sm: 6 }, borderRadius: "16px",
                border: "2px dashed",
                borderColor: dragOver ? "primary.main" : "divider",
                bgcolor: dragOver
                  ? alpha(theme.palette.primary.main, 0.06)
                  : "action.hover",
                transition: "border-color .15s, background-color .15s",
                "&:focus-within": {
                  outline: `2px solid ${theme.palette.primary.main}`,
                  outlineOffset: 2,
                },
              }}
            >
              <UploadFileOutlinedIcon sx={{ fontSize: 40, color: "primary.main" }} />
              <Typography fontWeight={700}>Drop your CSV here</Typography>
              <Typography variant="body2" color="text.secondary">
                or{" "}
                <Box
                  component="span"
                  sx={{ color: "primary.main", fontWeight: 600 }}
                >
                  choose a file
                </Box>
              </Typography>
              <input
                type="file" hidden accept=".csv,text/csv"
                onChange={(e) => {
                  readFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </Box>
            {fileError && (
              <Alert severity="error" sx={{ borderRadius: "10px" }}>
                {fileError}
              </Alert>
            )}

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              justifyContent="space-between"
              alignItems={{ xs: "stretch", sm: "flex-start" }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle2" fontWeight={700}>Columns</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Required: <b>medicine_name</b>, <b>category_name</b> (must match a category you already have).
                </Typography>
                <Typography
                  variant="caption" color="text.secondary"
                  component="div" sx={{ mt: 0.5 }}
                >
                  Optional:{" "}
                  {CSV_COLUMNS.filter(
                    (c) => c !== "medicine_name" && c !== "category_name"
                  ).join(", ")}
                  . Use 1 or 0 for prescription_required.
                </Typography>
              </Box>
              <Button
                variant="outlined"
                startIcon={<DownloadOutlinedIcon />}
                onClick={downloadTemplate}
                sx={{ ...btn, flexShrink: 0 }}
              >
                Download template
              </Button>
            </Stack>
          </Stack>
        ) : (
          <Stack spacing={2}>
            {missingRequired && (
              <Alert severity="error" sx={{ borderRadius: "10px" }}>
                This file is missing the <b>medicine_name</b> or{" "}
                <b>category_name</b> column, so every row will be skipped. Check
                the header row against the template.
              </Alert>
            )}
            {categories.length === 0 && (
              <Alert severity="warning" sx={{ borderRadius: "10px" }}>
                Your categories haven't loaded, so rows can't be matched to a
                category. Close this and try again.
              </Alert>
            )}

            {/* Summary */}
            <Box
              sx={{
                display: "grid", gap: 1,
                gridTemplateColumns: {
                  xs: "1fr 1fr",
                  sm: "repeat(4, minmax(0, 1fr))",
                },
              }}
            >
              {[
                {
                  label: done ? "Imported" : "Ready to import",
                  value: done
                    ? importedCount
                    : readyCount +
                      statuses.filter(
                        (s) => s.state === "importing" || s.state === "imported"
                      ).length,
                  tone: done ? "success" : "primary",
                },
                {
                  label: "Skipped",
                  value: skippedCount,
                  tone: skippedCount ? "warning" : null,
                  hint: "Fix these in the file",
                },
                {
                  label: "Failed",
                  value: failedCount,
                  tone: failedCount ? "error" : null,
                },
                { label: "Rows in file", value: rows.length, tone: null },
              ].map((t) => (
                <Box
                  key={t.label}
                  sx={{ p: 1.5, borderRadius: "12px", border: 1, borderColor: "divider" }}
                >
                  <Typography variant="caption" color="text.secondary">
                    {t.label}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: 22, fontWeight: 700, ...numeric,
                      color: t.tone
                        ? toneText(theme, t.tone)
                        : "text.primary",
                    }}
                  >
                    {t.value}
                  </Typography>
                </Box>
              ))}
            </Box>

            {(running || done) && (
              <Box>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                  <Typography variant="caption">
                    {running
                      ? `Importing… ${processed} of ${processed + toImport}`
                      : "Finished"}
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={
                    processed + toImport > 0
                      ? (processed / (processed + toImport)) * 100
                      : 100
                  }
                  sx={{ height: 6, borderRadius: 3 }}
                />
              </Box>
            )}

            <TableContainer
              component={Paper}
              variant="outlined"
              sx={{ maxHeight: { xs: "none", sm: 320 }, borderRadius: "12px" }}
            >
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 48 }}>Row</TableCell>
                    <TableCell>Medicine</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell align="right">Selling</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((r, i) => {
                    const s = statuses[i];
                    return (
                      <TableRow
                        key={i}
                        sx={{
                          bgcolor:
                            s?.state === "failed" || s?.state === "skipped"
                              ? alpha(theme.palette.warning.main, 0.06)
                              : undefined,
                        }}
                      >
                        <TableCell sx={{ color: "text.secondary", ...numeric }}>
                          {r.__line ?? i + 2}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {r.medicine_name || "—"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {[r.strength, r.dosage_form].filter(Boolean).join(" · ")}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {r.category_name || "—"}
                          </Typography>
                        </TableCell>
                        <TableCell align="right" sx={numeric}>
                          {money(r.selling_price)}
                        </TableCell>
                        <TableCell>
                          {statusPill(s)}
                          {(s?.state === "skipped" || s?.state === "failed") && (
                            <Typography
                              variant="caption" color="text.secondary"
                              component="div"
                              sx={{ mt: 0.25, maxWidth: 260 }}
                            >
                              {s.message}
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            <Typography variant="caption" color="text.secondary">
              Row numbers match the lines in your file (line 1 is the header).
            </Typography>
          </Stack>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          px: { xs: 2, sm: 3 }, py: 1.5, gap: 1,
          borderTop: 1, borderColor: "divider",
          pb: isPhone ? "calc(12px + env(safe-area-inset-bottom))" : 1.5,
        }}
      >
        {done ? (
          <>
            <Button onClick={reset} sx={btn}>Import another file</Button>
            <Button
              variant="contained" disableElevation
              onClick={close} sx={{ ...btn, px: 3 }}
            >
              Done
            </Button>
          </>
        ) : rows.length ? (
          <>
            <Button onClick={reset} disabled={running} sx={btn}>
              Choose another file
            </Button>
            <Button
              variant="contained" disableElevation
              onClick={runImport}
              disabled={readyCount === 0 || running}
              startIcon={
                running
                  ? <CircularProgress size={16} color="inherit" />
                  : <UploadFileOutlinedIcon />
              }
              sx={{ ...btn, px: 3 }}
            >
              {running
                ? "Importing…"
                : `Import ${readyCount} ${
                    readyCount === 1 ? "medicine" : "medicines"
                  }`}
            </Button>
          </>
        ) : (
          <Button onClick={close} sx={btn}>Cancel</Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
