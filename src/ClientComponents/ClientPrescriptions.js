import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Chip,
  Stack,
  Dialog,
  CircularProgress,
  Alert,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  useMediaQuery,
  useTheme,
  Skeleton,
  Fade,
} from "@mui/material";

import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import MedicationIcon from "@mui/icons-material/Medication";
import BiotechIcon from "@mui/icons-material/Biotech";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import EventNoteIcon from "@mui/icons-material/EventNote";

import PrescriptionPreview from "../StaffComponents/PrescriptionPreview";

const API = `${process.env.REACT_APP_SITE_URL}/api`;
const FETCH_OPTS = { credentials: "include" };
const PER_PAGE = 5;

const statusColor = (count) => (count > 0 ? "#3f6f7a" : "default");

export default function ClientPrescriptions() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [loadingId, setLoadingId] = useState(null);

  const [company, setCompany] = useState(null);
  const [page, setPage] = useState(1);

  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));

  /* ───────── Company Info ───────── */
  useEffect(() => {
    fetch(`${API}/company-info`, FETCH_OPTS)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setCompany({
            name: d.data.company_name || "",
            logo: d.data.company_logo
              ? `${process.env.REACT_APP_SITE_URL}/Images/${d.data.company_logo}`
              : null,
            phone: d.data.mobile || "",
            email: d.data.email || "",
            address: d.data.address || "",
          });
        }
      })
      .catch(console.error);
  }, []);

  /* ───────── Prescription List ───────── */
  useEffect(() => {
    fetch(`${API}/client/prescriptions`, FETCH_OPTS)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setRows(d.data);
        else setError(d.message);
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, []);


 const handleViewPdf = async (id) => {
  const newTab = window.open("", "_blank"); // open synchronously first
  setLoadingId(id);
  try {
    const res = await fetch(`${API}/client/prescriptions/${id}/download`, FETCH_OPTS);
    if (!res.ok) throw new Error("Failed");
    const blob = await res.blob();
    const pdfBlob = new Blob([blob], { type: "application/pdf" });
    const url = window.URL.createObjectURL(pdfBlob);
    newTab.location.href = url;
  } catch (err) {
    newTab.close();
    alert("Failed to open prescription");
  } finally {
    setLoadingId(null);
  }
};


 const handleDownload = async (id) => {
  setLoadingId(id);

  try {
    const res = await fetch(
      `${API}/client/prescriptions/${id}/download`,
      FETCH_OPTS
    );

    if (!res.ok) {
      // Try to read the backend's actual error message instead of guessing
      let message = `Download failed (status ${res.status})`;
      try {
        const errJson = await res.json();
        if (errJson?.message) message = errJson.message;
      } catch {
        // response wasn't JSON (e.g. an HTML error page) — keep default message
      }
      throw new Error(message);
    }

    const blob = await res.blob();

    // Guard: if the server actually sent JSON (an error) with a 200 status,
    // don't try to download it as a PDF
    if (blob.type && blob.type.includes("json")) {
      const text = await blob.text();
      const parsed = JSON.parse(text);
      throw new Error(parsed.message || "Server returned an error, not a PDF");
    }

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `prescription_${id}.pdf`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Download error:", err);
    alert(err.message || "Failed to download prescription");
  } finally {
    setLoadingId(null);
  }
};

  const formatDate = (iso) =>
    iso
      ? new Date(iso).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—";

  /* ───────── Pagination ───────── */
  const start = (page - 1) * PER_PAGE;
  const paginatedRows = rows.slice(start, start + PER_PAGE);
  const totalPages = Math.ceil(rows.length / PER_PAGE);

  /* ───────── Skeleton Rows ───────── */
  const SkeletonRows = () =>
    Array.from({ length: 5 }).map((_, i) => (
      <TableRow key={i}>
        {Array.from({ length: 9 }).map((__, j) => (
          <TableCell key={j}>
            <Skeleton variant="text" width={j === 0 ? 140 : 60} />
          </TableCell>
        ))}
      </TableRow>
    ));

  const SkeletonCards = () =>
    Array.from({ length: 4 }).map((_, i) => (
      <Card key={i} variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: 2 }}>
          <Skeleton variant="text" width="60%" height={24} />
          <Skeleton variant="text" width="40%" height={18} sx={{ mt: 0.5 }} />
          <Skeleton variant="text" width="50%" height={18} sx={{ mt: 0.5 }} />
          <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
            <Skeleton variant="rounded" width={64} height={28} />
            <Skeleton variant="rounded" width={64} height={28} />
            <Skeleton variant="rounded" width={64} height={28} />
          </Stack>
        </CardContent>
      </Card>
    ));

  /* ───────── Counter Chip ───────── */
  const CountChip = ({ icon, title, count }) => (
    <Tooltip title={`${title}: ${count}`} arrow>
      <Chip
        icon={icon}
        label={count}
        size="small"
        color={statusColor(count)}
        variant={count > 0 ? "filled" : "outlined"}
        sx={{ fontWeight: 600, minWidth: 54 }}
      />
    </Tooltip>
  );

  /* ───────── Preview Button ───────── */
const PreviewBtn = ({ id }) => (
  <Tooltip title="Download PDF" arrow>
    <span>
      <IconButton
        onClick={() => handleDownload(id)}
        disabled={loadingId === id}
        size="small"
        sx={{
          color: "#3f6f7a",
          bgcolor: "primary.50",
          border: "1px solid",
          borderColor: "#3f6f7a",
          transition: "all 0.2s",
          "&:hover": {
            bgcolor: "#3f6f7a",
            color: "#fff",
            transform: "scale(1.08)",
          },
        }}
      >
        {loadingId === id ? (
          <CircularProgress size={18} color="inherit" />
        ) : (
          <PictureAsPdfIcon fontSize="small" />
        )}
      </IconButton>
    </span>
  </Tooltip>
);

  /* ───────── DESKTOP: Table ───────── */
  const DesktopTable = () => (
    <TableContainer
      component={Paper}
      variant="outlined"
      sx={{
        borderRadius: 3,
        overflow: "hidden",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
      }}
    >
      <Table size="medium" sx={{ minWidth: 650 }}>
        <TableHead>
          <TableRow
            sx={{
              bgcolor: "#3f6f7a",
              "& th": {
                color: "#fff",
                fontWeight: 700,
                fontSize: "0.82rem",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                borderBottom: "none",
                py: 1.8,
              },
            }}
          >
            <TableCell>#</TableCell>
            <TableCell>Doctor</TableCell>
            <TableCell>Hospital Name</TableCell>
            <TableCell>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <EventNoteIcon sx={{ fontSize: 16 }} />
                <span>Appt. ID</span>
              </Stack>
            </TableCell>
            <TableCell>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <EventNoteIcon sx={{ fontSize: 16 }} />
                <span>Appt. Date</span>
              </Stack>
            </TableCell>
            <TableCell align="center">
              <Stack direction="row" alignItems="center" spacing={0.5} justifyContent="center">
                <LocalHospitalIcon sx={{ fontSize: 16 }} />
                <span>Consults</span>
              </Stack>
            </TableCell>
            <TableCell align="center">
              <Stack direction="row" alignItems="center" spacing={0.5} justifyContent="center">
                <MedicationIcon sx={{ fontSize: 16 }} />
                <span>Medicines</span>
              </Stack>
            </TableCell>
            <TableCell align="center">
              <Stack direction="row" alignItems="center" spacing={0.5} justifyContent="center">
                <BiotechIcon sx={{ fontSize: 16 }} />
                <span>Tests</span>
              </Stack>
            </TableCell>
            <TableCell align="center">Action</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {loading ? (
            <SkeletonRows />
          ) : paginatedRows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} align="center" sx={{ py: 6, color: "text.secondary" }}>
                <Stack alignItems="center" spacing={1}>
                  <ReceiptLongIcon sx={{ fontSize: 40, opacity: 0.3 }} />
                  <Typography>No prescriptions found</Typography>
                </Stack>
              </TableCell>
            </TableRow>
          ) : (
            paginatedRows.map((rx, idx) => (
              <Fade in key={rx.id} timeout={200 + idx * 60}>
                <TableRow
                  hover
                  sx={{
                    "&:last-child td": { borderBottom: 0 },
                    "&:hover": { bgcolor: "#f0f7f8" },
                    transition: "background 0.15s",
                  }}
                >
                  <TableCell sx={{ color: "text.secondary", fontWeight: 600 }}>
                    {start + idx + 1}
                  </TableCell>
                  <TableCell>
                    <Typography fontWeight={600} fontSize="0.9rem">
                      {rx.doctor_name || "—"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography fontSize="0.875rem" color="text.secondary">
                    {rx.company_name}
                    </Typography>
                  </TableCell>

                  {/* ── Appointment ID ── */}
                  <TableCell>
                    <Chip
                      label={rx.appointment_id ? `#${rx.appointment_id}` : "—"}
                      size="small"
                      variant="outlined"
                      sx={{
                        fontWeight: 600,
                        fontSize: "0.78rem",
                        borderColor: "#3f6f7a",
                        color: "#3f6f7a",
                      }}
                    />
                  </TableCell>

                  {/* ── Appointment Date ── */}
                  <TableCell>
                    <Typography fontSize="0.875rem" color="text.secondary">
                      {formatDate(rx.appointment_date)}
                    </Typography>
                  </TableCell>

                  <TableCell align="center">
                    <CountChip
                      icon={<LocalHospitalIcon />}
                      title="Consultations"
                      count={rx.consultation_count || 0}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <CountChip
                      icon={<MedicationIcon />}
                      title="Medicines"
                      count={rx.medicine_count || 0}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <CountChip
                      icon={<BiotechIcon />}
                      title="Tests"
                      count={rx.test_count || 0}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <PreviewBtn id={rx.id} />
                  </TableCell>
                </TableRow>
              </Fade>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  /* ───────── MOBILE / TABLET: Cards ───────── */
  const MobileCards = () => (
    <Stack spacing={2}>
      {loading ? (
        <SkeletonCards />
      ) : paginatedRows.length === 0 ? (
        <Stack alignItems="center" spacing={1} sx={{ py: 6, color: "text.secondary" }}>
          <ReceiptLongIcon sx={{ fontSize: 48, opacity: 0.3 }} />
          <Typography>No prescriptions found</Typography>
        </Stack>
      ) : (
        paginatedRows.map((rx, idx) => (
          <Fade in key={rx.id} timeout={200 + idx * 60}>
            <Card
              variant="outlined"
              sx={{
                borderRadius: 3,
                boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
                transition: "box-shadow 0.2s, transform 0.2s",
                "&:hover": {
                  boxShadow: "0 6px 20px rgba(0,0,0,0.10)",
                  transform: "translateY(-2px)",
                },
              }}
            >
              <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography fontWeight={700} fontSize="0.95rem">
                      {rx.doctor_name || "—"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.3, display: "block" }}>
                      Prescribed: {formatDate(rx.created_at)}
                    </Typography>
                  </Box>
                  <PreviewBtn id={rx.id} />
                </Stack>

                {/* ── Appointment Info Row ── */}
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1.2 }} flexWrap="wrap" useFlexGap>
                  <EventNoteIcon sx={{ fontSize: 15, color: "#3f6f7a" }} />
                  <Typography variant="caption" color="text.secondary">
                    Appt. ID:
                  </Typography>
                  <Chip
                    label={rx.appointment_id ? `#${rx.appointment_id}` : "—"}
                    size="small"
                    variant="outlined"
                    sx={{
                      fontWeight: 600,
                      fontSize: "0.72rem",
                      height: 20,
                      borderColor: "#3f6f7a",
                      color: "#3f6f7a",
                    }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(rx.appointment_date)}
                  </Typography>
                </Stack>

                <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1.2 }} useFlexGap>
                  <Chip
                    icon={<LocalHospitalIcon />}
                    label={`${rx.consultation_count || 0} Consults`}
                    size="small"
                    color={statusColor(rx.consultation_count)}
                    variant={rx.consultation_count > 0 ? "filled" : "outlined"}
                    sx={{ fontWeight: 500 }}
                  />
                  <Chip
                    icon={<MedicationIcon />}
                    label={`${rx.medicine_count || 0} Medicines`}
                    size="small"
                    color={statusColor(rx.medicine_count)}
                    variant={rx.medicine_count > 0 ? "filled" : "outlined"}
                    sx={{ fontWeight: 500 }}
                  />
                  <Chip
                    icon={<BiotechIcon />}
                    label={`${rx.test_count || 0} Tests`}
                    size="small"
                    color={statusColor(rx.test_count)}
                    variant={rx.test_count > 0 ? "filled" : "outlined"}
                    sx={{ fontWeight: 500 }}
                  />
                </Stack>
              </CardContent>
            </Card>
          </Fade>
        ))
      )}
    </Stack>
  );

  /* ───────── UI ───────── */
  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1100, mx: "auto" }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
        <ReceiptLongIcon color="#3f6f7a" sx={{ fontSize: 30 }} />
        <Box>
          <Typography variant="h5" fontWeight={800} lineHeight={1.1}>
            My Prescriptions
          </Typography>
          {!loading && rows.length > 0 && (
            <Typography variant="caption" color="text.secondary">
              {rows.length} record{rows.length !== 1 ? "s" : ""} found
            </Typography>
          )}
        </Box>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {/* Responsive layout */}
      {isDesktop ? <DesktopTable /> : <MobileCards />}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <Stack alignItems="center" sx={{ mt: 3 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(e, v) => {
              setPage(v);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            color="#3f6f7a"
            shape="rounded"
            showFirstButton
            showLastButton
          />
        </Stack>
      )}

      {/* Preview Dialog */}
      <Dialog
        open={!!previewData}
        onClose={() => setPreviewData(null)}
        fullWidth
        maxWidth="lg"
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        {previewData && (
          <PrescriptionPreview
            data={previewData}
            onClose={() => setPreviewData(null)}
          />
        )}
      </Dialog>
    </Box>
  );
}