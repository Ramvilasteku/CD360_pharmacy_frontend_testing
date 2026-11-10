// src/components/pharmacy/categories/BulkUploadDialog.jsx
//
// CSV / Excel bulk upload with 4 stages: pick → preview → submitting → done.
// Loops the existing POST /categories/post endpoint with progress + per-row results.

import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Stack, Avatar, Typography, IconButton, Box, Alert, Chip, Divider,
  TextField, Button, LinearProgress, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Tooltip,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import CloseIcon from "@mui/icons-material/Close";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DownloadIcon from "@mui/icons-material/Download";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

import { parseCSV, parseExcel, downloadCSVTemplate } from "./categoriesUtils";

const API = process.env.REACT_APP_URL;

export default function BulkUploadDialog({ open, onClose, isMobile, onComplete }) {
  const [stage, setStage] = useState("pick"); // pick | preview | submitting | done
  const [fileName, setFileName] = useState("");
  const [parsedRows, setParsedRows] = useState([]);
  const [parseError, setParseError] = useState("");
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setStage("pick");
      setFileName("");
      setParsedRows([]);
      setParseError("");
      setProgress({ current: 0, total: 0 });
      setResults([]);
    }
  }, [open]);

  const normalizeRows = (rawRows) =>
    rawRows.map((r, i) => {
      const name = (r.category_name || r.name || "").trim();
      const description = (r.description || "").trim();
      let error = "";
      if (!name) error = "Name is required";
      else if (name.length > 255) error = "Name too long (max 255)";
      return {
        _row: i + 2, // 1 = header
        category_name: name,
        description: description || null,
        _valid: !error,
        _error: error,
      };
    });

  const handleFile = async (file) => {
    if (!file) return;
    setFileName(file.name);
    setParseError("");
    try {
      let raw;
      if (/\.csv$/i.test(file.name)) {
        const text = await file.text();
        raw = parseCSV(text);
      } else if (/\.(xlsx|xls)$/i.test(file.name)) {
        raw = await parseExcel(file);
      } else {
        throw new Error("Only .csv, .xlsx, or .xls files are supported");
      }
      if (!raw.length) throw new Error("The file is empty");

      const headerSample = raw[0] || {};
      if (!("category_name" in headerSample || "name" in headerSample)) {
        throw new Error(
          "Missing header. The file needs a column named 'category_name' (and optionally 'description')."
        );
      }
      setParsedRows(normalizeRows(raw));
      setStage("preview");
    } catch (err) {
      setParseError(err.message || "Failed to parse file");
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const validRows = parsedRows.filter((r) => r._valid);

  const submit = async () => {
    if (validRows.length === 0) return;
    setStage("submitting");
    setProgress({ current: 0, total: validRows.length });
    const res = [];
    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      try {
        await axios.post(
          `${API}/api/pharmacy/categories/post`,
          { category_name: row.category_name, description: row.description },
          { withCredentials: true }
        );
        res.push({ name: row.category_name, status: "ok", message: "Created" });
      } catch (err) {
        const msg = err.response?.data?.message || "Failed";
        res.push({
          name: row.category_name,
          status: err.response?.status === 409 ? "duplicate" : "error",
          message: msg,
        });
      }
      setProgress({ current: i + 1, total: validRows.length });
    }
    setResults(res);
    setStage("done");
  };

  const successCount = results.filter((r) => r.status === "ok").length;
  const duplicateCount = results.filter((r) => r.status === "duplicate").length;
  const errorCount = results.filter((r) => r.status === "error").length;

  return (
    <Dialog
      open={open}
      onClose={stage === "submitting" ? undefined : onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{ sx: { borderRadius: { xs: 0, sm: 3 } } }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          bgcolor: "#fffbeb",
          borderBottom: "1px solid #fde68a",
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Avatar sx={{ bgcolor: "#f59e0b", width: 32, height: 32 }}>
            <UploadFileIcon fontSize="small" />
          </Avatar>
          <Box>
            <Typography fontWeight={700}>Bulk Upload Categories</Typography>
            <Typography variant="caption" color="text.secondary">
              CSV or Excel · one row per category
            </Typography>
          </Box>
        </Stack>
        {stage !== "submitting" && (
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        )}
      </DialogTitle>

      <DialogContent sx={{ pt: 3, pb: stage === "pick" ? 2 : 1 }}>

        {/* ─── STAGE: PICK FILE ─── */}
        {stage === "pick" && (
          <>
            <Box
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              sx={{
                p: { xs: 3, sm: 5 },
                borderRadius: 3,
                border: dragging ? "2px solid #f59e0b" : "2px dashed #cbd5e1",
                bgcolor: dragging ? "#fef3c7" : "#f8fafc",
                textAlign: "center",
                cursor: "pointer",
                transition: "all 0.15s",
                "&:hover": { borderColor: "#f59e0b", bgcolor: "#fffbeb" },
              }}
            >
              <CloudUploadIcon sx={{ fontSize: 56, color: "#94a3b8", mb: 1 }} />
              <Typography fontWeight={700}>
                {dragging ? "Drop the file here" : "Click to choose a file"}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                or drag and drop · CSV, XLSX, XLS · up to 1,000 rows
              </Typography>
              <input
                ref={inputRef}
                type="file"
                hidden
                accept=".csv,.xlsx,.xls"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </Box>

            {parseError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                <Typography variant="body2" sx={{ whiteSpace: "pre-line" }}>
                  {parseError}
                </Typography>
              </Alert>
            )}

            <Divider sx={{ my: 2 }}>
              <Chip label="OR" size="small" />
            </Divider>

            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              alignItems={{ sm: "center" }}
              spacing={1}
            >
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  Need the template?
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Columns: <code>category_name</code> (required),{" "}
                  <code>description</code> (optional)
                </Typography>
              </Box>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={downloadCSVTemplate}
                sx={{
                  textTransform: "none",
                  borderRadius: 2,
                  fontWeight: 700,
                  borderColor: "#0f766e",
                  color: "#0f766e",
                  "&:hover": { borderColor: "#0d5a54", bgcolor: "#0f766e10" },
                }}
              >
                Download CSV template
              </Button>
            </Stack>
          </>
        )}

        {/* ─── STAGE: PREVIEW ─── */}
        {stage === "preview" && (
          <>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              spacing={1}
              sx={{ mb: 2 }}
            >
              <Box>
                <Typography fontWeight={700}>{fileName}</Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 0.5 }} flexWrap="wrap">
                  <Chip
                    label={`${parsedRows.length} rows parsed`}
                    size="small"
                    sx={{ bgcolor: "#f1f5f9" }}
                  />
                  <Chip
                    label={`${validRows.length} valid`}
                    size="small"
                    color="success"
                  />
                  {parsedRows.length - validRows.length > 0 && (
                    <Chip
                      label={`${parsedRows.length - validRows.length} invalid`}
                      size="small"
                      color="error"
                    />
                  )}
                </Stack>
              </Box>
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  setStage("pick");
                  setParsedRows([]);
                  setFileName("");
                }}
                sx={{ textTransform: "none", borderRadius: 2 }}
              >
                Choose different file
              </Button>
            </Stack>

            <TableContainer
              sx={{
                maxHeight: 360,
                border: "1px solid #e2e8f0",
                borderRadius: 2,
                bgcolor: "#fff",
              }}
            >
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, width: 60 }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        display: { xs: "none", sm: "table-cell" },
                      }}
                    >
                      Description
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 120 }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {parsedRows.map((r) => (
                    <TableRow
                      key={r._row}
                      sx={{ bgcolor: r._valid ? "transparent" : "#fef2f2" }}
                    >
                      <TableCell sx={{ color: "#64748b" }}>{r._row}</TableCell>
                      <TableCell>
                        <Typography fontSize={13} fontWeight={600} noWrap>
                          {r.category_name || (
                            <em style={{ color: "#94a3b8" }}>(empty)</em>
                          )}
                        </Typography>
                      </TableCell>
                      <TableCell
                        sx={{
                          display: { xs: "none", sm: "table-cell" },
                          color: "#64748b",
                        }}
                      >
                        <Typography variant="body2" noWrap>
                          {r.description || "—"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {r._valid ? (
                          <Chip
                            label="Ready"
                            size="small"
                            color="success"
                            sx={{ height: 20, fontSize: 10 }}
                          />
                        ) : (
                          <Tooltip title={r._error}>
                            <Chip
                              label={r._error}
                              size="small"
                              color="error"
                              sx={{ height: 20, fontSize: 10, maxWidth: 180 }}
                            />
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {validRows.length === 0 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                No valid rows to upload. Fix the file and try again.
              </Alert>
            )}
          </>
        )}

        {/* ─── STAGE: SUBMITTING ─── */}
        {stage === "submitting" && (
          <Box sx={{ py: 4, textAlign: "center" }}>
            <Typography fontWeight={700} sx={{ mb: 2 }}>
              Uploading {progress.current} of {progress.total}…
            </Typography>
            <LinearProgress
              variant="determinate"
              value={(progress.current / Math.max(1, progress.total)) * 100}
              sx={{ height: 10, borderRadius: 5 }}
            />
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 1, display: "block" }}
            >
              Please don't close this window
            </Typography>
          </Box>
        )}

        {/* ─── STAGE: DONE ─── */}
        {stage === "done" && (
          <>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 2 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  flex: 1,
                  borderRadius: 2,
                  bgcolor: "#f0fdf4",
                  border: "1px solid #86efac",
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1}>
                  <CheckCircleIcon sx={{ color: "#10b981" }} />
                  <Box>
                    <Typography fontWeight={800} fontSize={20} color="#047857">
                      {successCount}
                    </Typography>
                    <Typography variant="caption" color="#047857">
                      Created
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
              {duplicateCount > 0 && (
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    flex: 1,
                    borderRadius: 2,
                    bgcolor: "#fffbeb",
                    border: "1px solid #fde68a",
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <ErrorOutlineIcon sx={{ color: "#f59e0b" }} />
                    <Box>
                      <Typography fontWeight={800} fontSize={20} color="#92400e">
                        {duplicateCount}
                      </Typography>
                      <Typography variant="caption" color="#92400e">
                        Duplicates skipped
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              )}
              {errorCount > 0 && (
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    flex: 1,
                    borderRadius: 2,
                    bgcolor: "#fef2f2",
                    border: "1px solid #fecaca",
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <ErrorOutlineIcon sx={{ color: "#ef4444" }} />
                    <Box>
                      <Typography fontWeight={800} fontSize={20} color="#991b1b">
                        {errorCount}
                      </Typography>
                      <Typography variant="caption" color="#991b1b">
                        Failed
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              )}
            </Stack>

            <TableContainer
              sx={{
                maxHeight: 300,
                border: "1px solid #e2e8f0",
                borderRadius: 2,
              }}
            >
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Result</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {results.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Typography fontSize={13} fontWeight={600}>
                          {r.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={r.status === "ok" ? "Created" : r.message}
                          size="small"
                          color={
                            r.status === "ok"
                              ? "success"
                              : r.status === "duplicate"
                              ? "warning"
                              : "error"
                          }
                          sx={{ fontSize: 10, height: 20 }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: "1px solid #e2e8f0" }}>
        {stage === "pick" && <Button onClick={onClose}>Close</Button>}

        {stage === "preview" && (
          <>
            <Button onClick={onClose}>Cancel</Button>
            <Button
              variant="contained"
              disabled={validRows.length === 0}
              onClick={submit}
              startIcon={<CloudUploadIcon />}
              sx={{
                bgcolor: "#0f766e",
                textTransform: "none",
                fontWeight: 700,
                borderRadius: 2,
                px: 3,
                "&:hover": { bgcolor: "#0d5a54" },
              }}
            >
              Upload {validRows.length} categor
              {validRows.length === 1 ? "y" : "ies"}
            </Button>
          </>
        )}

        {stage === "submitting" && <Button disabled>Uploading…</Button>}

        {stage === "done" && (
          <>
            <Button onClick={() => setStage("pick")}>Upload another file</Button>
            <Button
              variant="contained"
              onClick={onComplete}
              sx={{
                bgcolor: "#0f766e",
                textTransform: "none",
                fontWeight: 700,
                borderRadius: 2,
                "&:hover": { bgcolor: "#0d5a54" },
              }}
            >
              Done
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
