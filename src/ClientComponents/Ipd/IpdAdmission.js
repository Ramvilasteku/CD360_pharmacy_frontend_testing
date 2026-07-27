import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  memo,
} from "react";
import axios from "axios";
import debounce from "lodash/debounce";
import throttle from "lodash/throttle";
import IpdDetailModal from "./Ipdadmissonview/IpdDetailModal";

// MUI Imports
import {
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Skeleton,
  Pagination,
  Card,
  CardContent,
  Stack,
  InputAdornment,
  IconButton,
  Tooltip,
  Divider,
  useMediaQuery,
  useTheme,
  alpha,
} from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import BedIcon from "@mui/icons-material/Bed";
import PersonIcon from "@mui/icons-material/Person";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import RefreshIcon from "@mui/icons-material/Refresh";
import ClearIcon from "@mui/icons-material/Clear";
import MedicalServicesIcon from "@mui/icons-material/MedicalServices";
import IpdPharmacySection from "./Ipdadmissonview/IpdPharmacySection";


// ─── Theme ────────────────────────────────────────────────────────────────────
const ipdTheme = createTheme({
  typography: {
    fontFamily: "'Roboto', sans-serif",
    h5: { fontWeight: 700, letterSpacing: "-0.5px" },
    h6: { fontWeight: 600 },
    subtitle2: { fontWeight: 600, fontSize: "0.75rem", letterSpacing: "0.08em", textTransform: "uppercase" },
    body2: { fontSize: "0.825rem" },
    caption: { fontSize: "0.72rem" },
  },
  palette: {
    primary:   { main: "#1565C0", light: "#E3F2FD", dark: "#0D47A1" },
    secondary: { main: "#00897B" },
    error:     { main: "#C62828" },
    warning:   { main: "#E65100" },
    success:   { main: "#2E7D32" },
    background:{ default: "#F0F4F8", paper: "#FFFFFF" },
    text:      { primary: "#1A237E", secondary: "#546E7A" },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 700,
          fontSize: "0.72rem",
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          backgroundColor: "#1565C0",
          color: "#FFFFFF",
          borderBottom: "none",
          padding: "12px 16px",
          whiteSpace: "nowrap",
        },
        body: {
          fontSize: "0.82rem",
          color: "#263238",
          padding: "11px 16px",
          borderBottom: "1px solid #EEF2F7",
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          "&:hover": { backgroundColor: "#F0F7FF", transition: "background 0.15s" },
          "&:last-child td": { borderBottom: "none" },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: 8,
            fontSize: "0.82rem",
            backgroundColor: "#FFFFFF",
            "& fieldset": { borderColor: "#CFD8DC" },
            "&:hover fieldset": { borderColor: "#1565C0" },
          },
          "& .MuiInputLabel-root": { fontSize: "0.82rem" },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontSize: "0.82rem",
          backgroundColor: "#FFFFFF",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, fontSize: "0.7rem", letterSpacing: "0.04em" },
      },
    },
  },
});

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  admitted:   { color: "primary",  bg: "#E3F2FD", text: "#1565C0", label: "Admitted"   },
  discharged: { color: "success",  bg: "#E8F5E9", text: "#2E7D32", label: "Discharged" },
  transferred:{ color: "warning",  bg: "#FFF3E0", text: "#E65100", label: "Transferred"},
  deceased:   { color: "error",    bg: "#FFEBEE", text: "#C62828", label: "Deceased"   },
};

const getStatusStyle = (status) =>
  STATUS_CONFIG[status] || { bg: "#ECEFF1", text: "#546E7A", label: status };

// ─── Memoized Row ─────────────────────────────────────────────────────────────
const AdmissionRow = memo(({ admission, setDetailAdmission, index }) => {
  const st = getStatusStyle(admission.status);
  return (
    <TableRow
      sx={{
        backgroundColor: index % 2 === 0 ? "#FFFFFF" : "#FAFBFF",
        cursor: "pointer",
      }}
    >
      <TableCell>
        <Typography
          variant="body2"
          fontWeight={700}
          color="primary.main"
          onClick={() => setDetailAdmission(admission)}
          sx={{
            cursor: "pointer",
            "&:hover": { textDecoration: "underline" },
            display: "inline-flex",
            alignItems: "center",
            gap: 0.5,
          }}
        >
          #{admission.id}
        </Typography>
      </TableCell>

      <TableCell>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box
            sx={{
              width: 28, height: 28, borderRadius: "50%",
              bgcolor: "#E3F2FD", display: "flex",
              alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}
          >
            <PersonIcon sx={{ fontSize: 15, color: "#1565C0" }} />
          </Box>
          <Typography variant="body2" fontWeight={500}>
            {admission.doctor_name || "—"}
          </Typography>
        </Stack>
      </TableCell>

      <TableCell>
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <BedIcon sx={{ fontSize: 14, color: "#78909C" }} />
          <Typography variant="body2" color="text.secondary">
            {admission.bed_id || "—"}
          </Typography>
        </Stack>
      </TableCell>

      <TableCell>
        <Typography variant="body2">
          {admission.admission_date
            ? new Date(admission.admission_date).toLocaleString("en-IN", {
                day: "2-digit", month: "short", year: "numeric",
                hour: "2-digit", minute: "2-digit",
              })
            : "—"}
        </Typography>
      </TableCell>

      <TableCell sx={{ maxWidth: 180 }}>
        <Tooltip title={admission.admission_reason || ""} placement="top">
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 170 }}
          >
            {admission.admission_reason || "—"}
          </Typography>
        </Tooltip>
      </TableCell>

      <TableCell>
        <Chip
          label={st.label || admission.status}
          size="small"
          sx={{
            backgroundColor: st.bg,
            color: st.text,
            fontWeight: 700,
            fontSize: "0.68rem",
            height: 22,
            letterSpacing: "0.04em",
          }}
        />
      </TableCell>

      <TableCell>
        <Typography variant="body2" color={admission.discharge_date ? "text.primary" : "text.disabled"}>
          {admission.discharge_date
            ? new Date(admission.discharge_date).toLocaleString("en-IN", {
                day: "2-digit", month: "short", year: "numeric",
                hour: "2-digit", minute: "2-digit",
              })
            : "—"}
        </Typography>
      </TableCell>
    </TableRow>
  );
});

// ─── Skeleton Row ─────────────────────────────────────────────────────────────
const TableSkeletonRow = () => (
  <TableRow>
    {[40, 120, 60, 130, 160, 70, 130].map((w, i) => (
      <TableCell key={i}>
        <Skeleton variant="rounded" width={w} height={18} sx={{ borderRadius: 1 }} />
      </TableCell>
    ))}
  </TableRow>
);

// ─── Card Skeleton ─────────────────────────────────────────────────────────────
const CardSkeleton = () => (
  <Card elevation={0} sx={{ border: "1px solid #E8EDF2", borderRadius: 2, mb: 1.5, p: 0.5 }}>
    <CardContent>
      <Skeleton variant="text" width="40%" height={22} sx={{ mb: 1 }} />
      <Skeleton variant="text" width="70%" height={18} />
      <Skeleton variant="text" width="55%" height={18} />
      <Skeleton variant="text" width="65%" height={18} />
    </CardContent>
  </Card>
);

// ─── Mobile Card ──────────────────────────────────────────────────────────────
const MobileAdmissionCard = ({ admission, setDetailAdmission }) => {
  const st = getStatusStyle(admission.status);
  return (
    <Card
      elevation={0}
      onClick={() => setDetailAdmission(admission)}
      sx={{
        border: "1px solid #E8EDF2",
        borderRadius: 2,
        mb: 1.5,
        cursor: "pointer",
        transition: "all 0.2s",
        "&:hover": { boxShadow: "0 4px 20px rgba(21,101,192,0.12)", borderColor: "#1565C0" },
        borderLeft: `4px solid ${st.text}`,
      }}
    >
      <CardContent sx={{ p: "14px 16px !important" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
          <Typography variant="subtitle2" color="primary.main" fontWeight={800}>
            IPD #{admission.id}
          </Typography>
          <Chip
            label={st.label || admission.status}
            size="small"
            sx={{ backgroundColor: st.bg, color: st.text, fontWeight: 700, fontSize: "0.65rem", height: 20 }}
          />
        </Stack>

        <Stack spacing={0.6}>
          {[
            { icon: <PersonIcon sx={{ fontSize: 13 }} />, label: "Doctor", value: admission.doctor_name || "—" },
            { icon: <BedIcon    sx={{ fontSize: 13 }} />, label: "Bed",    value: admission.bed_id || "—" },
            {
              icon: <CalendarTodayIcon sx={{ fontSize: 13 }} />, label: "Admitted",
              value: admission.admission_date
                ? new Date(admission.admission_date).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })
                : "—",
            },
          ].map(({ icon, label, value }) => (
            <Stack direction="row" alignItems="center" spacing={0.8} key={label}>
              <Box color="text.secondary">{icon}</Box>
              <Typography variant="caption" color="text.secondary" sx={{ minWidth: 52 }}>{label}:</Typography>
              <Typography variant="caption" fontWeight={600} color="text.primary">{value}</Typography>
            </Stack>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
};

// ─── Filter Field ─────────────────────────────────────────────────────────────
const FilterInput = ({ placeholder, value, onChange, icon }) => (
  <TextField
    size="small"
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    InputProps={{
      startAdornment: (
        <InputAdornment position="start">
          {icon || <SearchIcon sx={{ fontSize: 16, color: "#90A4AE" }} />}
        </InputAdornment>
      ),
      endAdornment: value ? (
        <InputAdornment position="end">
          <IconButton size="small" onClick={() => onChange({ target: { value: "" } })}>
            <ClearIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </InputAdornment>
      ) : null,
    }}
    sx={{ minWidth: 140, flex: 1 }}
  />
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function IpdAdmission() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [clients, setClients]     = useState([]);
  const [doctors, setDoctors]     = useState([]);
  const [wards, setWards]         = useState([]);
  const [rooms, setRooms]         = useState([]);
  const [beds, setBeds]           = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [detailAdmission, setDetailAdmission] = useState(null);

  const [selectedClient, setSelectedClient] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [selectedWard, setSelectedWard]     = useState("");
  const [selectedRoom, setSelectedRoom]     = useState("");
  const [selectedBed, setSelectedBed]       = useState("");

  const [admissionDate, setAdmissionDate]   = useState("");
  const [admissionReason, setAdmissionReason] = useState("");
  const [openModal, setOpenModal]           = useState(false);
  const [editId, setEditId]                 = useState(null);
  const [submitLoading, setSubmitLoading]   = useState(false);
  const [dischargeDate, setDischargeDate]   = useState("");
  const [dischargeSummary, setDischargeSummary] = useState("");
  const [status, setStatus]                 = useState("admitted");
  const [currentPage, setCurrentPage]       = useState(1);
  const [loading, setLoading]               = useState(true);
  
  const recordsPerPage = 10;

  const [filters, setFilters] = useState({
    ipd: "", client: "", doctor: "", bed: "", status: "", fromDate: "", toDate: "",
  });

  // ── Fetchers ────────────────────────────────────────────────────────────────
  const fetchClients    = useCallback(async () => {
    try { const r = await axios.get(`${process.env.REACT_APP_SITE_URL}/api/staff/clients`, { withCredentials: true }); setClients(r.data.data || []); } catch {}
  }, []);

  const fetchDoctors    = useCallback(async () => {
    try { const r = await axios.get(`${process.env.REACT_APP_SITE_URL}/api/staff/branch-doctors`, { withCredentials: true }); setDoctors(r.data.data || []); } catch {}
  }, []);

  const fetchWards      = useCallback(async () => {
    try { const r = await axios.get(`${process.env.REACT_APP_API_URL}/getall/wardtype`, { withCredentials: true }); setWards(r.data.data || []); } catch {}
  }, []);

  const fetchRooms      = useCallback(async () => {
    try { const r = await axios.get(`${process.env.REACT_APP_API_URL}/getall/rooms`, { withCredentials: true }); setRooms(r.data.data || []); } catch {}
  }, []);

  const fetchBeds       = useCallback(async () => {
    try { const r = await axios.get(`${process.env.REACT_APP_API_URL}/getall/beds`, { withCredentials: true }); setBeds(r.data.data || []); } catch {}
  }, []);

  const fetchAdmissions = useCallback(async () => {
    try { const r = await axios.get(`${process.env.REACT_APP_API_URL}/get/branch/ipdadmission`, { withCredentials: true }); setAdmissions(r.data.data || []); } catch {}
  }, []);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchClients(), fetchDoctors(), fetchWards(), fetchRooms(), fetchBeds(), fetchAdmissions()]);
        await new Promise((r) => setTimeout(r, 800));
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, [fetchClients, fetchDoctors, fetchWards, fetchRooms, fetchBeds, fetchAdmissions]);

  const throttledRefresh = useMemo(
    () => throttle(() => { fetchAdmissions(); fetchBeds(); }, 1500),
    [fetchAdmissions, fetchBeds]
  );

  // ── Derived data ─────────────────────────────────────────────────────────────
  const filteredRooms = useMemo(
    () => rooms.filter((r) => r.ward_type_id === Number(selectedWard)),
    [rooms, selectedWard]
  );

  const filteredBeds = useMemo(
    () => beds.filter(
      (b) => b.room_id === Number(selectedRoom) &&
             (b.bed_status === "available" || Number(b.id) === Number(selectedBed))
    ),
    [beds, selectedRoom, selectedBed]
  );

  const filteredAdmissions = useMemo(() => {
    return admissions.filter((adm) => {
      const ipdMatch    = String(adm.id || "").toLowerCase().includes(filters.ipd.toLowerCase());
      const clientMatch = String(adm.client_id || "").toLowerCase().includes(filters.client.toLowerCase()) ||
                          String(adm.client_name || "").toLowerCase().includes(filters.client.toLowerCase());
      const doctorMatch = String(adm.doctor_id || "").toLowerCase().includes(filters.doctor.toLowerCase()) ||
                          String(adm.doctor_name || "").toLowerCase().includes(filters.doctor.toLowerCase());
      const bedMatch    = String(adm.bed_id || "").toLowerCase().includes((filters.bed || "").toLowerCase());
      const statusMatch = !filters.status || adm.status === filters.status;
      const admDate     = adm.admission_date ? new Date(adm.admission_date).toISOString().split("T")[0] : "";
      const fromMatch   = !filters.fromDate || admDate >= filters.fromDate;
      const toMatch     = !filters.toDate   || admDate <= filters.toDate;
      return ipdMatch && clientMatch && doctorMatch && bedMatch && statusMatch && fromMatch && toMatch;
    });
  }, [admissions, filters]);

  const totalPages = Math.ceil(filteredAdmissions.length / recordsPerPage);

  const paginatedAdmissions = useMemo(() => {
    const start = (currentPage - 1) * recordsPerPage;
    return filteredAdmissions.slice(start, start + recordsPerPage);
  }, [filteredAdmissions, currentPage]);

  const statusOptions = useMemo(
    () => Array.from(new Set(admissions.map((a) => a.status))),
    [admissions]
  );

  const resetForm = () => {
    setSelectedClient(""); setSelectedDoctor(""); setSelectedWard("");
    setSelectedRoom(""); setSelectedBed(""); setAdmissionDate("");
    setAdmissionReason(""); setDischargeDate(""); setDischargeSummary("");
    setStatus("admitted"); setEditId(null);
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== "");

  const clearAllFilters = () => {
    setFilters({ ipd: "", client: "", doctor: "", bed: "", status: "", fromDate: "", toDate: "" });
    setCurrentPage(1);
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <ThemeProvider theme={ipdTheme}>
      <Box sx={{ p: { xs: 1.5, sm: 2.5, md: 3 }, backgroundColor: "#F0F4F8", minHeight: "100vh", fontFamily: "Roboto, sans-serif" }}>

        {/* Detail Modal */}
        {detailAdmission && (
          <IpdDetailModal admission={detailAdmission} onClose={() => setDetailAdmission(null)} />
        )}

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <Box
          sx={{
            mb: 3,
            p: { xs: 2, md: "18px 24px" },
            background: "linear-gradient(135deg, #3F6F7A 0%, #3F6F7A 100%)",
            borderRadius: 2.5,
            boxShadow: "0 4px 20px rgba(21,101,192,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box
              sx={{
                width: 42, height: 42, borderRadius: 2,
                backgroundColor: "rgba(255,255,255,0.18)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <LocalHospitalIcon sx={{ color: "#fff", fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="h5" color="#FFFFFF" fontFamily="Roboto" fontWeight={700} lineHeight={1.2}>
                IPD Admission Management
              </Typography>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)" }}>
                {loading ? "Loading…" : `${filteredAdmissions.length} record${filteredAdmissions.length !== 1 ? "s" : ""} found`}
              </Typography>
            </Box>
          </Stack>

          {/* <Tooltip title="Refresh">
            <IconButton
              onClick={throttledRefresh}
              sx={{
                color: "#fff",
                backgroundColor: "rgba(255,255,255,0.15)",
                "&:hover": { backgroundColor: "rgba(255,255,255,0.25)" },
              }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip> */}
        </Box>

        {/* ── Filters ────────────────────────────────────────────────────────── */}
        <Paper
          elevation={0}
          sx={{
            mb: 2.5, p: { xs: 1.5, md: 2 },
            border: "1px solid #E8EDF2",
            borderRadius: 2.5,
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <FilterListIcon sx={{ fontSize: 18, color: "#3F6F7A" }} />
              <Typography variant="subtitle2" color="primary.main">
                Filters
              </Typography>
              {hasActiveFilters && (
                <Chip
                  label={`${Object.values(filters).filter((v) => v !== "").length} active`}
                  size="small"
                  color="primary"
                  sx={{ height: 18, fontSize: "0.65rem" }}
                />
              )}
            </Stack>
            {hasActiveFilters && (
              <Typography
                variant="caption"
                color="primary"
                sx={{ cursor: "pointer", fontWeight: 600, "&:hover": { textDecoration: "underline" } }}
                onClick={clearAllFilters}
              >
                Clear all
              </Typography>
            )}
          </Stack>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr 1fr",
                sm: "repeat(3, 1fr)",
                md: "repeat(4, 1fr)",
                lg: "repeat(7, 1fr)",
              },
              gap: 1.5,
            }}
          >
            <FilterInput
              placeholder="IPD ID"
              value={filters.ipd}
              onChange={(e) => { setFilters((f) => ({ ...f, ipd: e.target.value })); setCurrentPage(1); }}
            />
            <FilterInput
              placeholder="Doctor Name"
              value={filters.doctor}
              onChange={(e) => { setFilters((f) => ({ ...f, doctor: e.target.value })); setCurrentPage(1); }}
              icon={<MedicalServicesIcon sx={{ fontSize: 15, color: "#3F6F7A" }} />}
            />
            <FilterInput
              placeholder="Bed ID"
              value={filters.bed}
              onChange={(e) => { setFilters((f) => ({ ...f, bed: e.target.value })); setCurrentPage(1); }}
              icon={<BedIcon sx={{ fontSize: 15, color: "#3F6F7A" }} />}
            />

            {/* Status dropdown */}
            <FormControl size="small" sx={{ flex: 1 }}>
              <InputLabel sx={{ fontSize: "0.82rem" }}>Status</InputLabel>
              <Select
                value={filters.status}
                label="Status"
                onChange={(e) => { setFilters((f) => ({ ...f, status: e.target.value })); setCurrentPage(1); }}
              >
                <MenuItem value=""><em>All Status</em></MenuItem>
                {statusOptions.map((s) => {
                  const cfg = getStatusStyle(s);
                  return (
                    <MenuItem key={s} value={s}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: cfg.text }} />
                        <span style={{ fontSize: "0.82rem" }}>{cfg.label || s}</span>
                      </Stack>
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>

            {/* From date */}
            <TextField
              size="small"
              type="date"
              label="From Date"
              value={filters.fromDate}
              onChange={(e) => { setFilters((f) => ({ ...f, fromDate: e.target.value })); setCurrentPage(1); }}
              InputLabelProps={{ shrink: true, style: { fontSize: "0.82rem" } }}
              sx={{ flex: 1 }}
            />

            {/* To date */}
            <TextField
              size="small"
              type="date"
              label="To Date"
              value={filters.toDate}
              onChange={(e) => { setFilters((f) => ({ ...f, toDate: e.target.value })); setCurrentPage(1); }}
              InputLabelProps={{ shrink: true, style: { fontSize: "0.82rem" } }}
              sx={{ flex: 1 }}
            />

            {/* Empty placeholder for grid balance on large screens */}
            <Box sx={{ display: { xs: "none", lg: "block" } }} />
          </Box>
        </Paper>

        {/* ── Desktop Table ───────────────────────────────────────────────────── */}
        {!isMobile && (
          <Paper
            elevation={0}
            sx={{ border: "1px solid #E8EDF2", borderRadius: 2.5, overflow: "hidden" }}
          >
            <TableContainer>
              <Table size="small" stickyHeader>
              <TableHead
  sx={{
    "& .MuiTableCell-head": {
      backgroundColor: "#3F6F7A",
      color: "#fff",
      fontWeight: 600,
      fontSize: "0.875rem",
    },
  }}
>
  <TableRow>
    {[
      "IPD ID",
      "Doctor",
      "Bed",
      "Admitted Date",
      "Reason",
      "Status",
      "Discharge Date",
    ].map((h) => (
      <TableCell key={h}>{h}</TableCell>
    ))}
  </TableRow>
</TableHead>

                <TableBody>
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => <TableSkeletonRow key={i} />)
                  ) : paginatedAdmissions.length > 0 ? (
                    paginatedAdmissions.map((adm, idx) => (
                      <AdmissionRow
                        key={adm.id}
                        admission={adm}
                        setDetailAdmission={setDetailAdmission}
                        index={idx}
                      />
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                        <Stack alignItems="center" spacing={1}>
                          <LocalHospitalIcon sx={{ fontSize: 40, color: "#CFD8DC" }} />
                          <Typography variant="body2" color="text.disabled" fontWeight={500}>
                            No admissions found
                          </Typography>
                          {hasActiveFilters && (
                            <Typography
                              variant="caption"
                              color="primary"
                              sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
                              onClick={clearAllFilters}
                            >
                              Clear filters
                            </Typography>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Table footer */}
            {!loading && filteredAdmissions.length > 0 && (
              <Box
                sx={{
                  px: 2.5, py: 1.5,
                  borderTop: "1px solid #EEF2F7",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  backgroundColor: "#FAFBFF",
                }}
              >
                <Typography variant="caption" color="#3F6F7A">
                  Showing{" "}
                  <strong>{(currentPage - 1) * recordsPerPage + 1}–{Math.min(currentPage * recordsPerPage, filteredAdmissions.length)}</strong>
                  {" "}of <strong>{filteredAdmissions.length}</strong> records
                </Typography>

                <Pagination
                  count={totalPages}
                  page={currentPage}
                  onChange={(_, p) => setCurrentPage(p)}
                  size="small"
                  color="#3F6F7A"
                  shape="rounded"
                  sx={{
                    "& .MuiPaginationItem-root": { fontSize: "0.75rem", fontFamily: "Roboto" },
                    "& .Mui-selected": { fontWeight: 700 },
                  }}
                />
              </Box>
            )}
          </Paper>
        )}

        {/* ── Mobile Cards ─────────────────────────────────────────────────────── */}
        {isMobile && (
          <Box>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)
            ) : paginatedAdmissions.length > 0 ? (
              <>
                {paginatedAdmissions.map((adm) => (
                  <MobileAdmissionCard
                    key={adm.id}
                    admission={adm}
                    setDetailAdmission={setDetailAdmission}
                  />
                ))}

                {/* Mobile pagination */}
                <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
                  <Pagination
                    count={totalPages}
                    page={currentPage}
                    onChange={(_, p) => setCurrentPage(p)}
                    size="small"
                    color="primary"
                    shape="rounded"
                  />
                </Box>
              </>
            ) : (
              <Box sx={{ textAlign: "center", py: 6 }}>
                <LocalHospitalIcon sx={{ fontSize: 40, color: "#CFD8DC", mb: 1 }} />
                <Typography variant="body2" color="text.disabled">No admissions found</Typography>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </ThemeProvider>
  );
}