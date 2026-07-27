import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  memo,
} from "react";
import axios from "axios";
import throttle from "lodash/throttle";
import IpdDetailModal from "./Ipdadmissonview/IpdDetailModal";
import ProtectedActionButton from "../components/ProtectedActionButton";

import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormHelperText,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  ListSubheader,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
  Card,
  CardContent,
  CardActions,
  Pagination,
  alpha,
  Tooltip,
} from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import AddIcon           from "@mui/icons-material/Add";
import EditIcon          from "@mui/icons-material/Edit";
import SwapHorizIcon     from "@mui/icons-material/SwapHoriz";
import CloseIcon         from "@mui/icons-material/Close";
import FilterListIcon    from "@mui/icons-material/FilterList";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import SearchIcon        from "@mui/icons-material/Search";
import HotelIcon         from "@mui/icons-material/Hotel";
import EventNoteIcon     from "@mui/icons-material/EventNote";
import AdmissionSkeleton from "./AdmissionSkeleton";
import { useDispatch } from "react-redux";
import { setDischargedPatients } from "./redux/slices/ipdSlice";

// ─── Theme ────────────────────────────────────────────────────────────────────
const ipdTheme = createTheme({
  palette: {
    primary:    { main: "#0d9488", dark: "#0f766e", light: "#ccfbf1" },
    secondary:  { main: "#2563eb", dark: "#1d4ed8", light: "#dbeafe" },
    success:    { main: "#16a34a", light: "#dcfce7" },
    error:      { main: "#dc2626", light: "#fee2e2" },
    warning:    { main: "#d97706", light: "#fef3c7" },
    background: { default: "#f4f7fb", paper: "#ffffff" },
    text:       { primary: "#0f172a", secondary: "#475569" },
  },
  typography: {
    fontFamily: "'DM Sans','Segoe UI',sans-serif",
    h5:        { fontWeight: 700, letterSpacing: "-0.5px" },
    subtitle2: { fontWeight: 600 },
  },
  shape: { borderRadius: 5 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: "none", fontWeight: 600, borderRadius: 8 },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          "&:hover .MuiOutlinedInput-notchedOutline":  { borderColor: "#0d9488" },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#0d9488" },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 700, fontSize: "0.72rem", textTransform: "uppercase",
          letterSpacing: "0.6px", color: "#64748b", backgroundColor: "#f8fafc",
          whiteSpace: "nowrap",
        },
        body: { fontSize: "0.875rem", color: "#475569", borderBottom: "1px solid #f1f5f9" },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          "&:hover": { backgroundColor: "#f8fbff" },
          "&:last-child td": { border: 0 },
        },
      },
    },
    MuiPaper:  { styleOverrides: { root: { backgroundImage: "none" } } },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 16 } } },
    MuiChip:   { styleOverrides: { root: { fontWeight: 700, fontSize: "0.75rem" } } },
  },
});

// ─── StatusChip ───────────────────────────────────────────────────────────────
const StatusChip = ({ status }) => {
  const map = {
    admitted:   { color: "success", label: "Admitted"  },
    discharged: { color: "info",    label: "Discharged" },
    cancelled:  { color: "error",   label: "Cancelled"  },
  };
  const cfg = map[status] || { color: "default", label: status };
  return <Chip size="small" color={cfg.color} label={cfg.label} />;
};

// ─── SearchableSelect ─────────────────────────────────────────────────────────
const SearchableSelect = ({
  label, value, onChange, options = [],
  required = false, disabled = false,
  helperText, error = false, size = "medium",
  placeholder = "",
}) => {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? options.filter((o) => String(o.label).toLowerCase().includes(q)) : options;
  }, [options, search]);

  const displayLabel = useMemo(() => {
    if (value === "" || value === null || value === undefined) return "";
    return options.find((o) => String(o.id) === String(value))?.label ?? String(value);
  }, [options, value]);

  return (
    <FormControl fullWidth required={required} disabled={disabled} error={error} size={size}>
      <InputLabel shrink={!!displayLabel || undefined}>{label}</InputLabel>
      <Select
        value={value === "" ? "" : String(value)}
        label={label}
        displayEmpty
        onChange={(e) => {
          const raw = e.target.value;
          const asNum = Number(raw);
          onChange(isNaN(asNum) || raw === "" ? raw : asNum);
        }}
        onClose={() => setSearch("")}
        renderValue={() =>
          displayLabel
            ? displayLabel
            : <Typography component="span" sx={{ color: "text.disabled", fontStyle: "italic" }}>
                {placeholder}
              </Typography>
        }
        MenuProps={{
          PaperProps: { sx: { maxHeight: 320 } },
          disableAutoFocusItem: true,
        }}
      >
        {/* Pinned search box */}
        <ListSubheader sx={{ p: "8px 10px", bgcolor: "background.paper", lineHeight: "normal" }}>
          <TextField
            size="small" fullWidth autoFocus
            placeholder="Type to search…"
            value={search}
            onChange={(e) => { e.stopPropagation(); setSearch(e.target.value); }}
            onKeyDown={(e) => e.stopPropagation()}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 15, color: "text.disabled" }} />
                </InputAdornment>
              ),
            }}
          />
        </ListSubheader>

        <MenuItem value=""><em style={{ color: "#94a3b8" }}>None</em></MenuItem>

        {filtered.length === 0 ? (
          <MenuItem disabled>
            <Typography variant="caption" color="text.disabled">No results</Typography>
          </MenuItem>
        ) : (
          filtered.map((o) => (
            <MenuItem key={o.id} value={String(o.id)}>{o.label}</MenuItem>
          ))
        )}
      </Select>
      {helperText && (
        <FormHelperText sx={{ mx: "14px" }}>{helperText}</FormHelperText>
      )}
    </FormControl>
  );
};

// ─── Inline section divider used inside the form ──────────────────────────────
const SectionDivider = ({ icon, title, subtitle }) => (
  <Box sx={{ mt: 1, mb: 0.5 }}>
    <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
      <Box sx={{
        width: 28, height: 28, borderRadius: "8px",
        bgcolor: alpha("#0d9488", 0.1),
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        {icon}
      </Box>
      <Box>
        <Typography variant="subtitle2" color="text.primary" sx={{ lineHeight: 1.3 }}>{title}</Typography>
        {subtitle && (
          <Typography variant="caption" color="text.disabled" sx={{ lineHeight: 1.2 }}>{subtitle}</Typography>
        )}
      </Box>
    </Stack>
    <Divider />
  </Box>
);

// ─── Memoised table row ───────────────────────────────────────────────────────
const AdmissionRow = memo(
  ({
    admission,
    handleEdit,
    setDetailAdmission,
    onTransfer,
    currentUserRole,
    currentUserBranch,
  }) => {
    const canTransfer =
      currentUserRole === "receptionist" &&
      !!currentUserBranch &&
      currentUserBranch.toLowerCase().trim() ===
        (admission.branch_name || "").toLowerCase().trim();

    const canEdit =
      !!currentUserBranch &&
      currentUserBranch.toLowerCase().trim() ===
        (admission.branch_name || "").toLowerCase().trim();

    return (
      <TableRow>
        <TableCell
          onClick={() => setDetailAdmission(admission)}
          sx={{ cursor: "pointer", color: "secondary.main", fontWeight: 600, textDecoration: "underline" }}
        >
          {admission.id}
        </TableCell>
        <TableCell sx={{ fontWeight: 500, color: "text.primary" }}>{admission.client_name}</TableCell>
        <TableCell>{admission.branch_name || "—"}</TableCell>
        {/* <TableCell>{admission.bed_id || "—"}</TableCell> */}
        <TableCell>
          {admission.admission_date
            ? new Date(admission.admission_date).toLocaleString("en-IN", {
                day: "2-digit", month: "short", year: "numeric",
                hour: "2-digit", minute: "2-digit",
              })
            : "—"}
        </TableCell>
        <TableCell><StatusChip status={admission.status} /></TableCell>
        <TableCell>
          <Stack direction="row" spacing={1}>
            {canEdit && (
              <ProtectedActionButton
                ipdId={admission.id}
                size="small"
                variant="contained"
                color="primary"
                startIcon={<EditIcon sx={{ fontSize: 14 }} />}
                onClick={() => handleEdit(admission)}
                sx={{ px: 1.5, py: 0.6, fontSize: "0.78rem" }}
              >
                Edit
              </ProtectedActionButton>
            )}
            {canTransfer && (
              <ProtectedActionButton
                ipdId={admission.id}
                size="small"
                variant="outlined"
                color="primary"
                startIcon={<SwapHorizIcon sx={{ fontSize: 14 }} />}
                onClick={() => onTransfer(admission)}
                sx={{ px: 1.5, py: 0.6, fontSize: "0.78rem" }}
              >
                Transfer
              </ProtectedActionButton>
            )}
          </Stack>
        </TableCell>
      </TableRow>
    );
  }
);

// ═════════════════════════════════════════════════════════════════════════════
// MAIN
// ═════════════════════════════════════════════════════════════════════════════
export default function IpdAdmission() {
  const theme    = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const dispatch = useDispatch();
 
  // data
  const [clients,    setClients]    = useState([]);
  const [doctors,    setDoctors]    = useState([]);
  const [wards,      setWards]      = useState([]);
  const [rooms,      setRooms]      = useState([]);
  const [beds,       setBeds]       = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [branches,   setBranches]   = useState([]);
  const [loading,    setLoading]    = useState(true);

  // ui
  const [detailAdmission, setDetailAdmission] = useState(null);
  const [openModal,       setOpenModal]       = useState(false);
  const [editId,          setEditId]          = useState(null);
  const [submitLoading,   setSubmitLoading]   = useState(false);
  const [currentPage,     setCurrentPage]     = useState(1);
  const [status,           setStatus]           = useState("admitted");
   const isDischargeMode = editId && status === "discharged";
  // form
  const [selectedClient,   setSelectedClient]   = useState("");
  const [selectedDoctor,   setSelectedDoctor]   = useState("");
  const [selectedWard,     setSelectedWard]     = useState("");
  const [selectedRoom,     setSelectedRoom]     = useState("");
  const [selectedBed,      setSelectedBed]      = useState("");
  const [admissionDate,    setAdmissionDate]    = useState("");
  const [admissionReason,  setAdmissionReason]  = useState("");
  const [dischargeDate,    setDischargeDate]    = useState("");
  const [dischargeSummary, setDischargeSummary] = useState("");
  

  // filters
  const emptyFilters = { ipd: "", client: "", bed: "", status: "", fromDate: "", branch: "",};
  const [filters,        setFilters]        = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);

  // transfer
  const [transferModal,          setTransferModal]          = useState(null);
  const [selectedTransferBranch, setSelectedTransferBranch] = useState("");
  const [transferLoading,        setTransferLoading]        = useState(false);

  const recordsPerPage = 5;
  const [currentUserBranch] = useState(localStorage.getItem("branch") || "");
  const currentUserRole      = localStorage.getItem("role");

  // ── fetchers ────────────────────────────────────────────────────────────────
  const fetchClients    = useCallback(async () => { try { const r = await axios.get(`${process.env.REACT_APP_SITE_URL}/api/staff/clients`,       { withCredentials: true }); setClients(r.data.data    || []); } catch(e){ console.error(e); } }, []);
  const fetchDoctors    = useCallback(async () => { try { const r = await axios.get(`${process.env.REACT_APP_SITE_URL}/api/staff/branch-doctors`, { withCredentials: true }); setDoctors(r.data.data    || []); } catch(e){ console.error(e); } }, []);
  const fetchWards      = useCallback(async () => { try { const r = await axios.get(`${process.env.REACT_APP_API_URL}/getall/wardtype`,           { withCredentials: true }); setWards(r.data.data      || []); } catch(e){ console.error(e); } }, []);
  const fetchRooms      = useCallback(async () => { try { const r = await axios.get(`${process.env.REACT_APP_API_URL}/getall/rooms`,              { withCredentials: true }); setRooms(r.data.data      || []); } catch(e){ console.error(e); } }, []);
  const fetchBeds       = useCallback(async () => { try { const r = await axios.get(`${process.env.REACT_APP_API_URL}/getall/beds`,               { withCredentials: true }); setBeds(r.data.data       || []); } catch(e){ console.error(e); } }, []);
const fetchAdmissions = useCallback(async () => {

  
  try {
    const r = await axios.get(
      `${process.env.REACT_APP_API_URL}/get/ipdadmission`,
      { withCredentials: true }
    );

    const admissionsData = r.data.data || [];

    setAdmissions(admissionsData);

    // Create discharged map
    const dischargedMap = {};

    admissionsData.forEach((item) => {
      if (item.status === "discharged") {
        dischargedMap[item.id] = true;
        dischargedMap[`IPD${item.id}`] = true;
        dischargedMap[String(item.id)] = true;
      }
    });

    dispatch(setDischargedPatients(dischargedMap));

  } catch (e) {
    console.error(e);
  }
}, [dispatch]);

  const fetchBranches   = useCallback(async () => { try { const r = await axios.get(`${process.env.REACT_APP_API_URL}/get/admin/branches`,        { withCredentials: true }); setBranches(r.data.data   || []); } catch(e){ console.error(e); } }, []);

  // const [showSkeleton, setShowSkeleton] = useState(true);



useEffect(() => {
  const loadData = async () => {
    setLoading(true);

    try {
      await Promise.all([
        fetchClients(),
        fetchDoctors(),
        fetchWards(),
        fetchRooms(),
        fetchBeds(),
        fetchAdmissions(),
        fetchBranches(),
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  loadData();
}, [
  fetchClients,
  fetchDoctors,
  fetchWards,
  fetchRooms,
  fetchBeds,
  fetchAdmissions,
  fetchBranches,
]);


  const throttledRefresh = useMemo(
    () => throttle(() => { fetchAdmissions(); fetchBeds(); }, 1500),
    [fetchAdmissions, fetchBeds]
  );

  // ── cascade ──────────────────────────────────────────────────────────────────
  const filteredRooms = useMemo(
    () => rooms.filter((r) => Number(r.ward_type_id) === Number(selectedWard)),
    [rooms, selectedWard]
  );
  const filteredBeds = useMemo(
    () => beds.filter((b) =>
      Number(b.room_id) === Number(selectedRoom) &&
      (b.bed_status === "available" || Number(b.id) === Number(selectedBed))
    ),
    [beds, selectedRoom, selectedBed]
  );

  useEffect(() => {
    if (selectedRoom && !filteredRooms.find((r) => Number(r.id) === Number(selectedRoom))) {
      setSelectedRoom(""); setSelectedBed("");
    }
  }, [filteredRooms, selectedRoom]);

  useEffect(() => {
    if (selectedBed && !filteredBeds.find((b) => Number(b.id) === Number(selectedBed))) {
      setSelectedBed("");
    }
  }, [filteredBeds, selectedBed]);

  // useEffect(() => {
  //   const timer = setTimeout(() => { setShowSkeleton(false); }, 2000);
  //   return () => clearTimeout(timer);
  // }, []);

  // ── option arrays ────────────────────────────────────────────────────────────
  const clientOptions = useMemo(() => clients.map((c) => ({ id: c.id, label: c.name })), [clients]);
  const doctorOptions = useMemo(() => doctors.map((d) => ({ id: d.id, label: d.name })), [doctors]);
  const wardOptions   = useMemo(() => wards.map((w)   => ({ id: w.id, label: w.ward_type_name })), [wards]);
  const roomOptions   = useMemo(() => filteredRooms.map((r) => ({ id: r.id, label: r.room_number })), [filteredRooms]);
  const bedOptions    = useMemo(() =>
    filteredBeds.map((b) => ({
      id:    b.id,
      label: `${b.bed_number}${b.bed_status !== "available" ? " (current)" : ""}`,
    })), [filteredBeds]
  );

  // ── filter / pagination ──────────────────────────────────────────────────────
 const filteredAdmissions = useMemo(() =>
  admissions.filter((a) => {
    const admDate = a.admission_date
      ? new Date(a.admission_date).toLocaleDateString("en-CA")
      : "";

    return (
      String(a.id || "")
        .toLowerCase()
        .includes(appliedFilters.ipd.toLowerCase()) &&

      String(a.client_name || "")
        .toLowerCase()
        .includes(appliedFilters.client.toLowerCase()) &&

      String(a.bed_id || "")
        .toLowerCase()
        .includes(appliedFilters.bed.toLowerCase()) &&

      (appliedFilters.status === "" ||
        a.status === appliedFilters.status) &&

      (appliedFilters.branch === "" ||
        a.branch_name === appliedFilters.branch) &&

      (!appliedFilters.fromDate ||
        admDate === appliedFilters.fromDate)
    );
  }),
  [admissions, appliedFilters]
);

  const totalPages          = Math.ceil(filteredAdmissions.length / recordsPerPage);
  const paginatedAdmissions = useMemo(() => {
    const s = (currentPage - 1) * recordsPerPage;
    return filteredAdmissions.slice(s, s + recordsPerPage);
  }, [filteredAdmissions, currentPage]);

  useEffect(() => { setAppliedFilters(filters); setCurrentPage(1); }, [filters]);
  
  const getCurrentDateTimeLocal = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();

  return new Date(now.getTime() - offset * 60000)
    .toISOString()
    .slice(0, 16);
  };

  // ── form handlers ────────────────────────────────────────────────────────────
  const resetForm = () => {
    setSelectedClient(""); setSelectedDoctor(""); setSelectedWard("");
    setSelectedRoom(""); setSelectedBed(""); setAdmissionDate(getCurrentDateTimeLocal());
    setAdmissionReason(""); setDischargeDate(""); setDischargeSummary("");
    setStatus("admitted"); setEditId(null);
  };

  const formatDateTimeLocal = (dateString) => {
  const d = new Date(dateString);
  const offset = d.getTimezoneOffset();

  return new Date(
    d.getTime() - offset * 60000
  ).toISOString().slice(0, 16);
};

  const handleEdit = useCallback((a) => {
  console.log("Edit Data:", a);

  setEditId(a.id);

  setSelectedClient(a.client_id ? Number(a.client_id) : "");
  setSelectedDoctor(a.doctor_id ? Number(a.doctor_id) : "");

  // Find room from bed
  const bed = beds.find(
    (b) => Number(b.id) === Number(a.bed_id)
  );

  const roomId = bed?.room_id || "";

  // Find ward from room
  const room = rooms.find(
    (r) => Number(r.id) === Number(roomId)
  );

  const wardId = room?.ward_type_id || "";

  setSelectedWard(wardId ? Number(wardId) : "");
  setSelectedRoom(roomId ? Number(roomId) : "");
  setSelectedBed(a.bed_id ? Number(a.bed_id) : "");

  setAdmissionDate(
    a.admission_date
      ? formatDateTimeLocal(a.admission_date)
      : ""
  );

  setAdmissionReason(a.admission_reason || "");

  setDischargeDate(
    a.discharge_date
      ? formatDateTimeLocal(a.discharge_date)
      : ""
  );

  setDischargeSummary(a.discharge_summary || "");

  setStatus(a.status || "admitted");

  setOpenModal(true);
}, [beds, rooms]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitLoading(true);
     const payload = {
  client_id: selectedClient || null,
  doctor_id: selectedDoctor || null,
  ward_type_id: selectedWard || null,
  room_id: selectedRoom || null,
  bed_id: selectedBed || null,
  admission_reason: admissionReason,
  discharge_date: dischargeDate || null,
  discharge_summary: dischargeSummary || null,
  status,
};

// ✅ Only send admission_date when NOT discharging
if (status !== "discharged") {
  payload.admission_date = admissionDate;
}
      if (editId) {
        await axios.put(`${process.env.REACT_APP_API_URL}/ipd/${editId}`, payload, { withCredentials: true });
        alert("IPD Admission Updated");
      } else {
        await axios.post(`${process.env.REACT_APP_API_URL}/create/ipdadmission`, payload, { withCredentials: true });
        alert("IPD Admission Created");
      }
      throttledRefresh(); resetForm(); setOpenModal(false);
    } catch (err) {
      alert(err.response?.data?.message || "Something went wrong");
    } finally { setSubmitLoading(false); }
  };

  const handleTransfer = async () => {
    if (!selectedTransferBranch) return alert("Select a branch");
    try {
      setTransferLoading(true);
      await axios.put(
        `${process.env.REACT_APP_API_URL}/ipd/transfer/${transferModal.id}`,
        { to_branch: selectedTransferBranch }, { withCredentials: true }
      );
      alert("Transferred successfully");
      setTransferModal(null); setSelectedTransferBranch(""); throttledRefresh();
    } catch (err) {
      alert(err.response?.data?.message || "Transfer failed");
    } finally { setTransferLoading(false); }
  };

  const openTransferModal = useCallback((adm) => {
    setTransferModal(adm); setSelectedTransferBranch("");
  }, []);

  if (loading) {
  return (
    <ThemeProvider theme={ipdTheme}>
      <Box
        sx={{
          p: { xs: 2, sm: 3 },
          minHeight: "100vh",
          bgcolor: "background.default",
        }}
      >
        <AdmissionSkeleton isMobile={isMobile} />
      </Box>
    </ThemeProvider>
  );
}

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <ThemeProvider theme={ipdTheme}>
      <Box sx={{
        width: "100%", minHeight: "100vh", bgcolor: "background.default",
        p: { xs: 2, sm: 3 }, boxSizing: "border-box", overflowX: "hidden",
      }}>

        {detailAdmission && (
          <IpdDetailModal admission={detailAdmission} onClose={() => setDetailAdmission(null)} />
        )}

        {/* ── Header ── */}
        <Paper elevation={0} sx={{
          p: { xs: 2, sm: 2.5 }, mb: 3, border: "1px solid", borderColor: "divider", borderRadius: 3,
          display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2,
        }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{
              width: 44, height: 44, borderRadius: 2, bgcolor: alpha("#0d9488", 0.1),
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <LocalHospitalIcon sx={{ color: "primary.main", fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="h5" color="text.primary">IPD Admission Management</Typography>
              <Typography variant="body2" sx={{ color: "primary.main", fontWeight: 600, mt: 0.3 }}>
                Branch: {currentUserBranch || "N/A"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {admissions.length} total records
              </Typography>
            </Box>
          </Stack>
          <Button
            variant="contained" color="primary" startIcon={<AddIcon />}
            onClick={() => { resetForm(); setOpenModal(true); }}
            sx={{ px: 2.5, py: 1.2, boxShadow: "0 4px 14px rgba(13,148,136,0.3)" }}
          >
            Add IPD Admission
          </Button>
        </Paper>

        {/* ── Filters ── */}
        <Paper elevation={0} sx={{
          p: { xs: 2, sm: 2.5 }, mb: 3, border: "1px solid", borderColor: "divider", borderRadius: 3,
        }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Stack direction="row" spacing={1} alignItems="center">
              <FilterListIcon sx={{ color: "text.secondary", fontSize: 20 }} />
              <Typography variant="subtitle1" fontWeight={700}>Filters</Typography>
            </Stack>
            <Chip
              label={`${filteredAdmissions.length} records`} size="small"
              sx={{ bgcolor: alpha("#0d9488", 0.08), color: "primary.dark", fontWeight: 600 }}
            />
          </Stack>
          <Grid container spacing={2}>
            {[["ipd", "IPD ID"], ["client", "Client Name"], ["bed", "Bed ID"]].map(([k, lbl]) => (
              <Grid item xs={12} sm={6} md={2.4} key={k}>
                <TextField
                  fullWidth size="small" label={lbl} value={filters[k]}
                  onChange={(e) => setFilters({ ...filters, [k]: e.target.value })}
                />
              </Grid>
            ))}
            <Grid item xs={12} sm={6} md={2.4} sx={{width:"200px"}}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select value={filters.status} label="Status"
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                  <MenuItem value="">All Status</MenuItem>
                  {[...new Set(admissions.map((a) => a.status).filter(Boolean))].map((s) => (
                    <MenuItem key={s} value={s} sx={{ textTransform: "capitalize" }}>{s}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={2.4} sx={{width:"200px"}}>
  <FormControl fullWidth size="small">
    <InputLabel>Branch</InputLabel>
    <Select
      value={filters.branch}
      label="Branch"
      onChange={(e) =>
        setFilters({
          ...filters,
          branch: e.target.value,
        })
      }
    >
      <MenuItem value="">All Branches</MenuItem>

      {[...new Set(
        admissions
          .map((a) => a.branch_name)
          .filter(Boolean)
      )].map((branch) => (
        <MenuItem key={branch} value={branch}>
          {branch}
        </MenuItem>
      ))}
    </Select>
  </FormControl>
</Grid>


            <Grid item xs={12} sm={6} md={2.4}>
              <TextField
                fullWidth size="small" type="date" label="Admission Date"
                InputLabelProps={{ shrink: true }} value={filters.fromDate}
                onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* ── Desktop table ── */}
        {!isMobile && (
          <Paper elevation={0} sx={{
            border: "1px solid", borderColor: "divider", borderRadius: 3,
            overflow: "hidden", mb: 3,
          }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    {["IPD ID", "Client", "Branch", "Admitted Date", "Status", "Action"].map((h) => (
                      <TableCell key={h}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredAdmissions.length > 0 ? (
                    paginatedAdmissions.map((a) => (
                      <AdmissionRow
                        key={a.id} admission={a} handleEdit={handleEdit}
                        setDetailAdmission={setDetailAdmission} onTransfer={openTransferModal}
                        currentUserRole={currentUserRole} currentUserBranch={currentUserBranch}
                      />
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                        <Typography variant="body2" color="text.disabled">No Admissions Found</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        {/* ── Mobile cards ── */}
        {isMobile && (
          <Box mb={3}>
            {paginatedAdmissions.length === 0
              ? <Typography align="center" color="text.disabled" py={6}>No Admissions Found</Typography>
              : paginatedAdmissions.map((a) => {
                  const canTransfer =
                    currentUserRole === "receptionist" && !!currentUserBranch &&
                    currentUserBranch.toLowerCase().trim() === (a.branch_name || "").toLowerCase().trim();
                  return (
                    <Card key={a.id} elevation={0} sx={{
                      border: "1px solid", borderColor: "divider", borderRadius: 3, mb: 2,
                      transition: "all 0.2s", "&:hover": { transform: "translateY(-2px)", boxShadow: 3 },
                    }}>
                      <CardContent sx={{ pb: 1 }}>
                        <Stack direction="row" justifyContent="space-between" mb={1}>
                          <Typography
                            variant="subtitle2" color="secondary.main"
                            sx={{ cursor: "pointer", textDecoration: "underline" }}
                            onClick={() => setDetailAdmission(a)}
                          >
                            #{a.id}
                          </Typography>
                          <StatusChip status={a.status} />
                        </Stack>
                        <Divider sx={{ my: 1 }} />
                        {[
                          ["Client", a.client_name],
                          ["Bed", a.bed_id || "—"],
                          ["Branch", a.branch_name || "—"],
                          ["Admitted", a.admission_date
                            ? new Date(a.admission_date).toLocaleString("en-IN", {
                                day: "2-digit", month: "short", year: "numeric",
                              })
                            : "—"],
                        ].map(([label, val]) => (
                          <Stack key={label} direction="row" justifyContent="space-between" py={0.4}>
                            <Typography variant="caption" color="text.disabled" textTransform="uppercase" fontWeight={600}>{label}</Typography>
                            <Typography variant="caption" color="text.secondary">{val}</Typography>
                          </Stack>
                        ))}
                      </CardContent>
                      <CardActions sx={{ px: 2, pb: 2, gap: 1 }}>
  <ProtectedActionButton
    ipdId={a.id}
    fullWidth
    variant="contained"
    color="primary"
    size="small"
    startIcon={<EditIcon />}
    onClick={() => handleEdit(a)}
  >
    Edit
  </ProtectedActionButton>

  {canTransfer && (
    <ProtectedActionButton
      ipdId={a.id}
      fullWidth
      variant="outlined"
      color="primary"
      size="small"
      startIcon={<SwapHorizIcon />}
      onClick={() => openTransferModal(a)}
    >
      Transfer
    </ProtectedActionButton>
  )}
</CardActions>
                    </Card>
                  );
                })
            }
          </Box>
        )}

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <Box display="flex" justifyContent="center" mt={1} mb={2}>
            <Pagination
              count={totalPages} page={currentPage}
              onChange={(_, v) => setCurrentPage(v)}
              color="primary" shape="rounded" size={isMobile ? "small" : "medium"}
            />
          </Box>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            ADD / EDIT MODAL
        ══════════════════════════════════════════════════════════════════ */}
        <Dialog
          open={openModal}
          onClose={() => { setOpenModal(false); resetForm(); }}
          fullWidth
          maxWidth="md"
          fullScreen={isMobile}
          PaperProps={{
            sx: {
              borderRadius: "20px",
              width: { xs: "95%", sm: "90%", md: "600px" },
              maxWidth: "600px",
              maxHeight: "88vh",
              overflow: "hidden",
              background: "linear-gradient(to bottom,#f8fafc,#ffffff)",
              boxShadow: "0 20px 60px rgba(15,23,42,0.18)",
            },
          }}
        >
          {/* ── Dialog Header ── */}
          <DialogTitle sx={{
            position: "sticky", top: 0, zIndex: 20,
            backdropFilter: "blur(10px)",
            background: "rgba(255,255,255,0.9)",
            borderBottom: "1px solid #e2e8f0",
            px: 2.5, py: 1.8,
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box sx={{
                width: 42, height: 42, borderRadius: "12px",
                background: "linear-gradient(135deg,#0d9488,#14b8a6)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 10px 25px rgba(13,148,136,0.25)",
              }}>
                <LocalHospitalIcon sx={{ color: "#fff", fontSize: 22 }} />
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 800, fontSize: "1.05rem", color: "#0f172a", lineHeight: 1.2 }}>
                  {editId ? "Edit IPD Admission" : "Create IPD Admission"}
                </Typography>
                <Typography variant="caption" sx={{ color: "#64748b", fontSize: "0.74rem" }}>
                  Manage patient admission details
                </Typography>
              </Box>
            </Stack>
            <IconButton
              size="small"
              onClick={() => { setOpenModal(false); resetForm(); }}
              sx={{ bgcolor: "#f1f5f9", "&:hover": { bgcolor: "#fee2e2", color: "#dc2626" } }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </DialogTitle>

          {/* ── Dialog Body ── */}
          <DialogContent sx={{
            px: { xs: 2, sm: 3 }, py: 2.5,
            overflowY: "auto", bgcolor: "#f8fafc",
            "&::-webkit-scrollbar": { width: "7px" },
            "&::-webkit-scrollbar-thumb": { background: "#cbd5e1", borderRadius: "10px" },
          }}>
            <Box component="form" onSubmit={handleSubmit} sx={{ width: "100%",mt:"50px" }}>

              {/* ── Row 1: Client | Doctor ── */}
              <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "nowrap" }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <SearchableSelect
                    label="Client"
                    value={selectedClient}
                    onChange={setSelectedClient}
                    options={clientOptions}
                    disabled={isDischargeMode}
                    required
                  />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                 <SearchableSelect
                  label="Doctor"
                  value={selectedDoctor}
                  onChange={setSelectedDoctor}
                  options={doctorOptions}
                  disabled={isDischargeMode}
                  required
                />
                </Box>
              </Box>

              {/* ── Row 2: Ward | Room ── */}
            {/* ── Row 2: Ward | Room ── */}
<Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "nowrap" }}>
  <Box sx={{ flex: 1, minWidth: 0 }}>
    <SearchableSelect
      label="Ward"
      value={selectedWard}
      onChange={(v) => { setSelectedWard(v); setSelectedRoom(""); setSelectedBed(""); }}
      options={wardOptions}
      size="small"
       disabled={isDischargeMode}
       required
    />
  </Box>
  <Box sx={{ flex: 1, minWidth: 0 }}>
    {selectedWard && roomOptions.length === 0 ? (
      <Box sx={{
        border: "1px solid #fca5a5",
        borderRadius: "8px",
        bgcolor: "#fff7f7",
        px: 1.5,
        py: 1,
        display: "flex",
        alignItems: "center",
        gap: 1,
        height: "40px",
      }}>
        <Typography variant="caption" color="error.main" fontWeight={600}>
          ⚠ No rooms available in this ward
        </Typography>
      </Box>
    ) : (
      <SearchableSelect
        label="Room"
        value={selectedRoom}
        onChange={(v) => { setSelectedRoom(v); setSelectedBed(""); }}
        options={roomOptions}
         disabled={!selectedWard || isDischargeMode}
        size="small"
        placeholder={!selectedWard ? "Select a ward first" : ""}
        required
      />
    )}
  </Box>
</Box>

{/* ── Row 3: Bed | Admission Date ── */}
<Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "nowrap" }}>
  <Box sx={{ flex: 1, minWidth: 0 }}>
    {selectedRoom && bedOptions.length === 0 ? (
      <Box sx={{
        border: "1px solid #fca5a5",
        borderRadius: "8px",
        bgcolor: "#fff7f7",
        px: 1.5,
        py: 1,
        display: "flex",
        alignItems: "center",
        gap: 1,
        height: "40px",
      }}>
        <Typography variant="caption" color="error.main" fontWeight={600}>
          ⚠ No beds available in this room
        </Typography>
      </Box>
    ) : (
      <SearchableSelect
        label="Bed"
        value={selectedBed}
        onChange={setSelectedBed}
        options={bedOptions}
       disabled={!selectedRoom || isDischargeMode}
        size="small"
        placeholder={!selectedRoom ? "Select a room first" : ""}

        required
      />
    )}
  </Box>
  <Box sx={{ flex: 1, minWidth: 0 }}>
    <TextField
      fullWidth required size="small"
      type="datetime-local"
      label="Admission Date & Time"
      InputLabelProps={{ shrink: true }}
      value={admissionDate}
      onChange={(e) => setAdmissionDate(e.target.value)}
      sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", bgcolor: "#fff" } }}
      disabled={isDischargeMode}
    />
  </Box>
</Box>

             
              {/* ── Row 4: Status | Admission Reason ── */}
              <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "nowrap" }}>
                {/* Show Status only while editing */}
  {editId && (
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <FormControl fullWidth size="small">
        <InputLabel>Status</InputLabel>
        <Select
          value={status}
          label="Status"
          onChange={(e) => {
  const value = e.target.value;
  setStatus(value);

  if (value === "discharged" && !dischargeDate) {
    setDischargeDate(getCurrentDateTimeLocal());
  }

  if (value !== "discharged") {
    setDischargeDate("");
    setDischargeSummary("");
  }
}}
          sx={{
            borderRadius: "8px",
            bgcolor: "#fff",
          }}
        >
          <MenuItem value="admitted">Admitted</MenuItem>
          <MenuItem value="discharged">Discharged</MenuItem>
          <MenuItem value="cancelled">Cancelled</MenuItem>
        </Select>
      </FormControl>
    </Box>
  )}
                   
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <TextField
                    fullWidth multiline rows={2} size="small"
                    label="Admission Reason"
                    placeholder="Enter patient's admission reason…"
                    value={admissionReason}
                    onChange={(e) => setAdmissionReason(e.target.value)}
                     disabled={isDischargeMode}
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", bgcolor: "#fff" } }}
                    required
                  />
                </Box>
              </Box>

              {/* ── Discharge fields (status = discharged only) ── */}
              {status === "discharged" && (
                <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "nowrap" }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <TextField
                      fullWidth size="small"
                      type="datetime-local"
                      label="Discharge Date & Time"
                      InputLabelProps={{ shrink: true }}
                      value={dischargeDate}
                      onChange={(e) => setDischargeDate(e.target.value)}
                      sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", bgcolor: "#fff" } }}
                    />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <TextField
                      fullWidth multiline rows={3} size="small"
                      label="Discharge Summary"
                      placeholder="Enter discharge summary…"
                      value={dischargeSummary}
                      onChange={(e) => setDischargeSummary(e.target.value)}
                      sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", bgcolor: "#fff" } }}
                    />
                  </Box>
                </Box>
              )}

              {/* ── Form Footer ── */}
              <Box sx={{
                position: "sticky", bottom: -24, mt: 3,
                background: "rgba(255,255,255,0.92)",
                backdropFilter: "blur(10px)",
                borderTop: "1px solid #e2e8f0",
                py: 2, zIndex: 20,
              }}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="flex-end">
                  <Button
                    variant="outlined" color="inherit"
                    onClick={() => { setOpenModal(false); resetForm(); }}
                    sx={{ minWidth: 120, borderRadius: "10px", py: 1, fontWeight: 600 }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit" variant="contained" color="primary"
                    disabled={submitLoading}
                    sx={{
                      minWidth: 220, py: 1.1, borderRadius: "10px", fontWeight: 700,
                      background: "linear-gradient(135deg,#0d9488,#14b8a6)",
                      boxShadow: "0 10px 25px rgba(13,148,136,0.25)",
                    }}
                  >
                    {submitLoading
                      ? <CircularProgress size={20} color="inherit" />
                      : editId ? "Update Admission" : "Create Admission"
                    }
                  </Button>
                </Stack>
              </Box>
            </Box>
          </DialogContent>
        </Dialog>

        {/* ── Transfer Modal ── */}
        <Dialog
          open={!!transferModal} onClose={() => setTransferModal(null)}
          maxWidth="xs" fullWidth
          PaperProps={{ sx: { borderRadius: "16px !important" } }}
        >
          <DialogTitle sx={{
            px: 3, py: 2, fontWeight: 700, fontSize: "1.05rem",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            borderBottom: "1px solid", borderColor: "divider",
          }}>
            Transfer — {transferModal?.id}
            <IconButton
              size="small" onClick={() => setTransferModal(null)}
              sx={{ bgcolor: "grey.100", "&:hover": { bgcolor: "error.light", color: "error.main" } }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ px: 3, pt: 2.5, pb: 3 }}>
            <Box sx={{ p: 1.5, bgcolor: alpha("#0d9488", 0.05), borderRadius: 2, mb: 2.5 }}>
              <Typography variant="caption" color="text.secondary">Current branch</Typography>
              <Typography variant="body2" fontWeight={600} color="text.primary">
                {transferModal?.branch_name || "—"}
              </Typography>
            </Box>
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Transfer To</InputLabel>
              <Select
                value={selectedTransferBranch} label="Transfer To"
                onChange={(e) => setSelectedTransferBranch(e.target.value)}
              >
                <MenuItem value=""><em>— Select Branch —</em></MenuItem>
                {branches
                  .filter((b) => b !== transferModal?.branch_name)
                  .map((b) => <MenuItem key={b} value={b}>{b}</MenuItem>)
                }
              </Select>
            </FormControl>
            <Button
              fullWidth variant="contained" color="primary" size="large"
              disabled={transferLoading || !selectedTransferBranch}
              onClick={handleTransfer}
              sx={{ py: 1.4, fontWeight: 700 }}
            >
              {transferLoading ? <CircularProgress size={20} color="inherit" /> : "Confirm Transfer"}
            </Button>
          </DialogContent>
        </Dialog>

      </Box>
    </ThemeProvider>
  );
}