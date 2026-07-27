import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  memo,
} from "react";
import axios from "axios";

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
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Pagination,
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
  alpha,
} from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";

import AddIcon          from "@mui/icons-material/Add";
import CloseIcon        from "@mui/icons-material/Close";
import SearchIcon       from "@mui/icons-material/Search";
import SwapHorizIcon    from "@mui/icons-material/SwapHoriz";
import CheckCircleIcon  from "@mui/icons-material/CheckCircle";
import KingBedIcon      from "@mui/icons-material/KingBed";
import HotelIcon        from "@mui/icons-material/Hotel";
import HistoryIcon      from "@mui/icons-material/History";
import { Autocomplete } from "@mui/material";
import ProtectedActionButton from "../components/ProtectedActionButton";

// ─── Theme ────────────────────────────────────────────────────────────────────
const allocationTheme = createTheme({
  palette: {
    primary:    { main: "#0d9488", dark: "#0f766e", light: "#ccfbf1" },
    secondary:  { main: "#2563eb", dark: "#1d4ed8", light: "#dbeafe" },
    success:    { main: "#16a34a", light: "#dcfce7" },
    error:      { main: "#dc2626", light: "#fee2e2" },
    background: { default: "#f4f7fb", paper: "#ffffff" },
    text:       { primary: "#0f172a", secondary: "#475569" },
  },
  typography: {
    fontFamily: "'DM Sans','Segoe UI',sans-serif",
    h5: { fontWeight: 700, letterSpacing: "-0.5px" },
  },
  shape: { borderRadius: 8 },
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
          "&:hover .MuiOutlinedInput-notchedOutline":       { borderColor: "#0d9488" },
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
    MuiDialog: { styleOverrides: { paper: { borderRadius: 20 } } },
    MuiChip:   { styleOverrides: { root: { fontWeight: 700, fontSize: "0.72rem" } } },
  },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (dt) =>
  dt ? new Date(dt).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }) : "—";

const toMySQL = (dt) =>
  dt ? new Date(dt).toISOString().slice(0, 19).replace("T", " ") : null;

// ─── StatusChip ───────────────────────────────────────────────────────────────
const StatusChip = ({ status }) => {
  const isActive = status === "active";
  return (
    <Chip
      size="small"
      label={isActive ? "Active" : "Vacated"}
      sx={{
        fontWeight: 700, fontSize: "0.72rem",
        bgcolor: isActive ? "#dcfce7" : "#fee2e2",
        color:   isActive ? "#16a34a"  : "#dc2626",
      }}
    />
  );
};

// ─── StatCard ─────────────────────────────────────────────────────────────────
const StatCard = ({ icon, value, label, iconBg, iconColor }) => (
  <Paper elevation={0} sx={{
    p: 2.5, border: "1px solid", borderColor: "divider", borderRadius: 3,
    display: "flex", alignItems: "center", gap: 2,
  }}>
    <Box sx={{
      width: 52, height: 52, borderRadius: "14px",
      bgcolor: iconBg, color: iconColor,
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    }}>
      {icon}
    </Box>
    <Box>
      <Typography sx={{ fontSize: "1.6rem", fontWeight: 700, lineHeight: 1, color: "text.primary" }}>
        {value}
      </Typography>
      <Typography variant="caption" sx={{
        fontWeight: 600, color: "text.disabled",
        textTransform: "uppercase", letterSpacing: "0.5px", mt: 0.4, display: "block",
      }}>
        {label}
      </Typography>
    </Box>
  </Paper>
);

// ─── Memoised table row ───────────────────────────────────────────────────────
const AllocationRow = memo(({ allocation, handleTransfer, handleComplete, handleOpenHistory }) => (
  <TableRow>
    <TableCell>
      <Box sx={{
        display: "inline-flex", alignItems: "center",
        bgcolor: "#f1f5f9", border: "1px solid #e2e8f0",
        borderRadius: "6px", px: 1, py: 0.3,
        fontSize: "0.75rem", fontWeight: 600, color: "text.secondary",
      }}>
        #{allocation.id}
      </Box>
    </TableCell>
    <TableCell>
      <Typography
        variant="body2"
        sx={{
          color: "secondary.main", fontWeight: 600,
          textDecoration: "underline", cursor: "pointer",
          "&:hover": { color: "secondary.dark" },
        }}
        onClick={() => handleOpenHistory(allocation.ipd_id)}
      >
        {allocation.ipd_id}
      </Typography>
    </TableCell>
    <TableCell>{allocation.client_id}</TableCell>
    {/* <TableCell>{allocation.doctor_id || "—"}</TableCell> */}
    <TableCell sx={{ fontWeight: 600, color: "text.primary" }}>{allocation.bed_number}</TableCell>
    <TableCell>{allocation.room_number}</TableCell>
    <TableCell sx={{ whiteSpace: "nowrap" }}>{fmt(allocation.start_time)}</TableCell>
    <TableCell sx={{ whiteSpace: "nowrap" }}>{fmt(allocation.end_time)}</TableCell>
    <TableCell><StatusChip status={allocation.allocation_status} /></TableCell>
    <TableCell>
      {allocation.allocation_status === "active" && (
        <Stack direction="row" spacing={1}>
          <ProtectedActionButton
          ipdId={allocation.ipd_id}
          variant="contained"
          color="secondary"
          size="small"
          startIcon={<SwapHorizIcon sx={{ fontSize: 14 }} />}
          onClick={() => handleTransfer(allocation)}
          sx={{ px: 1.5, py: 0.6, fontSize: "0.78rem" }}
        >
          Transfer
        </ProtectedActionButton>

        <ProtectedActionButton
          ipdId={allocation.ipd_id}
          variant="contained"
          color="success"
          size="small"
          startIcon={<CheckCircleIcon sx={{ fontSize: 14 }} />}
          onClick={() => handleComplete(allocation)}
          sx={{ px: 1.5, py: 0.6, fontSize: "0.78rem" }}
        >
          Vacate
        </ProtectedActionButton>
        </Stack>
      )}
    </TableCell>
  </TableRow>
));

// ─── Memoised mobile card ─────────────────────────────────────────────────────
const AllocationCard = memo(({ allocation, handleTransfer, handleComplete, handleOpenHistory }) => (
  <Card elevation={0} sx={{
    border: "1px solid", borderColor: "divider", borderRadius: 3, mb: 2,
    transition: "all 0.2s", "&:hover": { transform: "translateY(-2px)", boxShadow: 3 },
  }}>
    <CardContent sx={{ pb: 1 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
        <Box>
          <Typography
            variant="subtitle2" fontWeight={700}
            sx={{ color: "secondary.main", textDecoration: "underline", cursor: "pointer" }}
            onClick={() => handleOpenHistory(allocation.ipd_id)}
          >
            IPD #{allocation.ipd_id}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Allocation #{allocation.id} · Client {allocation.client_id}
          </Typography>
        </Box>
        <StatusChip status={allocation.allocation_status} />
      </Stack>

      <Divider sx={{ my: 1.5 }} />

      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5, mb: 1.5 }}>
        {[
          ["Bed",    allocation.bed_number],
          ["Room",   allocation.room_number],
          ["Branch", allocation.branch_name],
          // ["Doctor", allocation.doctor_id || "—"],
        ].map(([label, val]) => (
          <Box key={label}>
            <Typography variant="caption" color="text.disabled" fontWeight={600} textTransform="uppercase" display="block">
              {label}
            </Typography>
            <Typography variant="body2" fontWeight={600} color="text.primary">{val}</Typography>
          </Box>
        ))}
      </Box>

      <Stack spacing={0.3}>
        <Typography variant="caption" color="text.secondary">🕐 Start: {fmt(allocation.start_time)}</Typography>
        {allocation.end_time && (
          <Typography variant="caption" color="text.secondary">🏁 End: {fmt(allocation.end_time)}</Typography>
        )}
      </Stack>
    </CardContent>

    {allocation.allocation_status === "active" && (
      <CardActions sx={{ px: 2, pb: 2, gap: 1 }}>
        <ProtectedActionButton
          ipdId={allocation.ipd_id}
          fullWidth
          variant="contained"
          color="secondary"
          size="small"
          startIcon={<SwapHorizIcon />}
          onClick={() => handleTransfer(allocation)}
        >
          Transfer
        </ProtectedActionButton>

        <ProtectedActionButton
          ipdId={allocation.ipd_id}
          fullWidth
          variant="contained"
          color="success"
          size="small"
          startIcon={<CheckCircleIcon />}
          onClick={() => handleComplete(allocation)}
        >
          Vacate
        </ProtectedActionButton>
      </CardActions>
    )}
  </Card>
));

// ═════════════════════════════════════════════════════════════════════════════
// MAIN
// ═════════════════════════════════════════════════════════════════════════════
export default function IpdBedAllocation() {
  const theme    = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // data
  const [allocations, setAllocations] = useState([]);
  const [beds,        setBeds]        = useState([]);
  const [rooms,       setRooms]       = useState([]);
  const [wards,       setWards]       = useState([]);
  const [admissions,  setAdmissions]  = useState([]);
  const [loading,     setLoading]     = useState(true);

  // ui
  const [openModal,          setOpenModal]          = useState(false);
  const [transferMode,       setTransferMode]       = useState(false);
  const [selectedAllocation, setSelectedAllocation] = useState(null);
  const [submitLoading,      setSubmitLoading]      = useState(false);

  // history
  const [historyModal,       setHistoryModal]       = useState(false);
  const [selectedHistory,    setSelectedHistory]    = useState([]);
  const [selectedIpdHistory, setSelectedIpdHistory] = useState(null);

  // form
  const [selectedIpd,  setSelectedIpd]  = useState("");
  const [selectedWard, setSelectedWard] = useState("");
  const [selectedRoom, setSelectedRoom] = useState("");
  const [selectedBed,  setSelectedBed]  = useState("");
  const [startTime,    setStartTime]    = useState("");

  // filters & pagination
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [currentPage,  setCurrentPage]  = useState(1);
  const recordsPerPage = 5;

  // ── Fetchers ──────────────────────────────────────────────────────────────
  const fetchAllocations = useCallback(async () => {
    const res = await axios.get(`${process.env.REACT_APP_API_URL}/getall/allocated-beds`, { withCredentials: true });
    setAllocations(res.data.data || []);
  }, []);

  const fetchBeds = useCallback(async () => {
    const res = await axios.get(`${process.env.REACT_APP_API_URL}/getall/beds`, { withCredentials: true });
    setBeds(res.data.data || []);
  }, []);

  const fetchRooms = useCallback(async () => {
    const res = await axios.get(`${process.env.REACT_APP_API_URL}/getall/rooms`, { withCredentials: true });
    setRooms(res.data.data || []);
  }, []);

  const fetchWards = useCallback(async () => {
    const res = await axios.get(`${process.env.REACT_APP_API_URL}/getall/wardtype`, { withCredentials: true });
    setWards(res.data.data || []);
  }, []);

  const fetchAdmissions = useCallback(async () => {
    const res = await axios.get(`${process.env.REACT_APP_API_URL}/get/active-ipdadmissions`, { withCredentials: true });
    setAdmissions(res.data.data || []);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await Promise.all([fetchAllocations(), fetchBeds(), fetchRooms(), fetchWards(), fetchAdmissions()]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchAllocations, fetchBeds, fetchRooms, fetchWards, fetchAdmissions]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const filteredRooms = useMemo(() =>
    rooms.filter((r) => r.ward_type_id === Number(selectedWard)),
  [rooms, selectedWard]);

  const filteredBeds = useMemo(() => {
  const occupiedBedIds = allocations
    .filter((a) => {
      if (
        transferMode &&
        selectedAllocation &&
        a.id === selectedAllocation.id
      ) {
        return false;
      }

      return a.allocation_status === "active";
    })
    .map((a) => a.bed_id);

  return beds.filter(
    (bed) =>
      bed.room_id === Number(selectedRoom) &&
      bed.bed_status === "available" &&
      !occupiedBedIds.includes(bed.id)
  );
}, [
  beds,
  allocations,
  selectedRoom,
  transferMode,
  selectedAllocation,
]);

  const filteredAllocations = useMemo(() =>
    allocations.filter((a) => {
      const searchMatch =
        String(a.ipd_id).toLowerCase().includes(search.toLowerCase()) ||
        String(a.client_id).toLowerCase().includes(search.toLowerCase());
      const statusMatch = statusFilter === "" ? true : a.allocation_status === statusFilter;
      return searchMatch && statusMatch;
    }),
  [allocations, search, statusFilter]);

  const totalPages          = Math.ceil(filteredAllocations.length / recordsPerPage);
  const paginatedAllocations = useMemo(() => {
    const start = (currentPage - 1) * recordsPerPage;
    return filteredAllocations.slice(start, start + recordsPerPage);
  }, [filteredAllocations, currentPage]);

  const activeCount    = allocations.filter((a) => a.allocation_status === "active").length;
  const completedCount = allocations.filter((a) => a.allocation_status === "completed").length;

  // ── Actions ───────────────────────────────────────────────────────────────
  const resetForm = () => {
    setSelectedIpd(""); setSelectedWard(""); setSelectedRoom("");
    setSelectedBed(""); setStartTime("");
    setSelectedAllocation(null); setTransferMode(false);
  };

  const handleOpenHistory = useCallback((ipdId) => {
    const history = allocations
      .filter((a) => a.ipd_id === ipdId)
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
    setSelectedHistory(history);
    setSelectedIpdHistory(ipdId);
    setHistoryModal(true);
  }, [allocations]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      setSubmitLoading(true);
      await axios.post(
        `${process.env.REACT_APP_API_URL}/post/allocate-bed`,
        { ipd_id: selectedIpd, bed_id: selectedBed, start_time: toMySQL(startTime) },
        { withCredentials: true }
      );
      alert("Bed allocated successfully");
      fetchAllocations(); fetchBeds(); resetForm(); setOpenModal(false);
    } catch (err) {
      alert(err.response?.data?.message || "Something went wrong");
    } finally { setSubmitLoading(false); }
  };

  const handleTransfer = useCallback((allocation) => {
    setTransferMode(true);
    setSelectedAllocation(allocation);
    setSelectedBed(""); setSelectedWard(""); setSelectedRoom("");
    setStartTime(allocation.start_time);
    setOpenModal(true);
  }, []);

  const handleComplete = useCallback(async (allocation) => {
    try {
      await axios.put(
        `${process.env.REACT_APP_API_URL}/update/allocated-bed/${allocation.id}`,
        { bed_id: allocation.bed_id, start_time: toMySQL(allocation.start_time), end_time: toMySQL(new Date()), allocation_status: "completed" },
        { withCredentials: true }
      );
      alert("Allocation completed");
      fetchAllocations(); fetchBeds();
    } catch (err) {
      alert(err.response?.data?.message || "Something went wrong");
    }
  }, [fetchAllocations, fetchBeds]);

  const handleTransferSubmit = async (e) => {
  e.preventDefault();

  try {
    setSubmitLoading(true);

    await axios.post(
      `${process.env.REACT_APP_API_URL}/post/allocate-bed`,
      {
        ipd_id: selectedAllocation.ipd_id,
        bed_id: selectedBed,
        start_time: toMySQL(new Date()), // transfer time
      },
      {
        withCredentials: true,
      }
    );

    alert("Bed transferred successfully");

    await fetchAllocations();
    await fetchBeds();

    resetForm();
    setOpenModal(false);

  } catch (err) {
    console.error(err);

    alert(
      err.response?.data?.message ||
      "Failed to transfer bed"
    );
  } finally {
    setSubmitLoading(false);
  }
};

  // ── Loader ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <ThemeProvider theme={allocationTheme}>
        <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 2, bgcolor: "background.default" }}>
          <CircularProgress color="primary" size={44} thickness={3} />
          <Typography color="text.secondary" fontWeight={500}>Loading Bed Allocations…</Typography>
        </Box>
      </ThemeProvider>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <ThemeProvider theme={allocationTheme}>
      <Box sx={{ width: "100%", minHeight: "100vh", bgcolor: "background.default",
          p: { xs: 2, sm: 3 }, boxSizing: "border-box", overflowX: "hidden" }}>

        {/* ── Header ── */}
        <Paper elevation={0} sx={{
          p: { xs: 2, sm: 2.5 }, mb: 3,
          border: "1px solid", borderColor: "divider", borderRadius: 3,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          flexWrap: "wrap", gap: 2,
        }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{
              width: 44, height: 44, borderRadius: 2, bgcolor: alpha("#0d9488", 0.1),
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <KingBedIcon sx={{ color: "primary.main", fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="h5" color="text.primary">Bed Allocation</Typography>
              <Typography variant="caption" color="text.secondary">
                {allocations.length} total allocations
              </Typography>
            </Box>
          </Stack>
          <Button
            variant="contained" color="primary" startIcon={<AddIcon />}
            onClick={() => { resetForm(); setOpenModal(true); }}
            sx={{ px: 2.5, py: 1.2, boxShadow: "0 4px 14px rgba(13,148,136,0.3)" }}
          >
            Allocate Bed
          </Button>
        </Paper>

        {/* ── Stats ── */}
        <Box sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
          gap: 2, mb: 3,
        }}>
          <StatCard
            icon={<HotelIcon sx={{ fontSize: 26 }} />}
            value={activeCount}
            label="Occupied / Active"
            iconBg="#fee2e2"
            iconColor="#dc2626"
          />
          <StatCard
            icon={<CheckCircleIcon sx={{ fontSize: 26 }} />}
            value={completedCount}
            label="Vacate"
            iconBg="#dcfce7"
            iconColor="#16a34a"
          />
        </Box>

        {/* ── Filters ── */}
        <Paper elevation={0} sx={{
          p: 2, mb: 3, border: "1px solid", borderColor: "divider", borderRadius: 3,
          display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center",
        }}>
          <TextField
            size="small"
            placeholder="Search IPD / Client…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: "text.disabled" }} />
                </InputAdornment>
              ),
            }}
            sx={{ flex: 1, minWidth: 200 }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter} label="Status"
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            >
              <MenuItem value="">All Status</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
            </Select>
          </FormControl>
        </Paper>

        {/* ── Desktop Table ── */}
        {!isMobile && (
          <Paper elevation={0} sx={{
            border: "1px solid", borderColor: "divider", borderRadius: 3,
            overflow: "hidden", mb: 3,
          }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    {["ID", "IPD", "Client", "Bed", "Room", "Start", "End", "Status", "Actions"].map((h) => (
                      <TableCell key={h}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedAllocations.length > 0 ? (
                    paginatedAllocations.map((a) => (
                      <AllocationRow
                        key={a.id} allocation={a}
                        handleTransfer={handleTransfer}
                        handleComplete={handleComplete}
                        handleOpenHistory={handleOpenHistory}
                      />
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={10} align="center" sx={{ py: 8 }}>
                        <Typography variant="body2" color="text.disabled">No allocations found</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        {/* ── Mobile Cards ── */}
        {isMobile && (
          <Box mb={3}>
            {paginatedAllocations.length === 0
              ? <Typography align="center" color="text.disabled" py={6}>No allocations found</Typography>
              : paginatedAllocations.map((a) => (
                <AllocationCard
                  key={a.id} allocation={a}
                  handleTransfer={handleTransfer}
                  handleComplete={handleComplete}
                  handleOpenHistory={handleOpenHistory}
                />
              ))
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
            ALLOCATE / TRANSFER MODAL
        ══════════════════════════════════════════════════════════════════ */}
        <Dialog
          open={openModal}
          onClose={() => { setOpenModal(false); resetForm(); }}
          fullWidth maxWidth="sm"
          PaperProps={{ sx: { borderRadius: "20px", boxShadow: "0 20px 60px rgba(15,23,42,0.18)" } }}
        >
          <DialogTitle sx={{
            px: 3, py: 2.5,
            borderBottom: "1px solid", borderColor: "divider",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box sx={{
                width: 40, height: 40, borderRadius: "10px",
                bgcolor: alpha(transferMode ? "#2563eb" : "#0d9488", 0.1),
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {transferMode
                  ? <SwapHorizIcon sx={{ color: "secondary.main", fontSize: 22 }} />
                  : <KingBedIcon   sx={{ color: "primary.main",   fontSize: 22 }} />
                }
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: "1rem", color: "text.primary", lineHeight: 1.2 }}>
                  {transferMode ? "Transfer Bed" : "Allocate Bed"}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {transferMode ? `Reallocating from bed ${selectedAllocation?.bed_number}` : "Assign a bed to an IPD admission"}
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

          <DialogContent sx={{ px: 3, py: 3 }}>
            <Box
              component="form"
              onSubmit={transferMode ? handleTransferSubmit : handleCreate}
              sx={{ display: "flex", flexDirection: "column", gap: 2.5, mt: 0.5 }}
            >
              {/* IPD select — only for new allocation */}
              {!transferMode && (
               <Autocomplete
  fullWidth
  size="small"
  options={admissions}
  value={admissions.find(a => a.id === selectedIpd) || null}
  onChange={(e, newValue) => {
    setSelectedIpd(newValue?.id || "");
  }}
  getOptionLabel={(option) =>
    `IPD #${option.id}`
  }
  isOptionEqualToValue={(option, value) =>
    option.id === value.id
  }
  filterOptions={(options, state) =>
    options.filter((option) =>
      `${option.id} ${option.patient_name || ""}`
        .toLowerCase()
        .includes(state.inputValue.toLowerCase())
    )
  }
  renderInput={(params) => (
    <TextField
      {...params}
      label="Search IPD Admission"
      placeholder="Type IPD ID "
      required 
      style={{marginTop:"20px"}}
    />
  )}
/>
              )}

             {/* Ward | Room — side by side */}
<Box sx={{ display: "flex", gap: 2 }}>
  <Autocomplete
    fullWidth
    size="small"
    options={wards}
    value={wards.find(w => w.id === selectedWard) || null}
    onChange={(e, newValue) => {
      setSelectedWard(newValue?.id || "");
      setSelectedRoom("");
      setSelectedBed("");
    }}
    getOptionLabel={(option) => option.ward_type_name || ""}
    renderInput={(params) => (
      <TextField {...params} label="Ward" required />
    )}
  />

  {/* Room — show error if ward selected but no rooms */}
  {selectedWard && filteredRooms.length === 0 ? (
    <Box sx={{
      flex: 1,
      border: "1px solid #fca5a5",
      borderRadius: "8px",
      bgcolor: "#fff7f7",
      px: 1.5,
      display: "flex",
      alignItems: "center",
      minHeight: "40px",
      width:"100px"
    }}>
      <Typography variant="caption" color="error.main" fontWeight={600}>
        ⚠ No rooms in this ward
      </Typography>
    </Box>
  ) : (
    <Autocomplete
      fullWidth
      size="small"
      options={filteredRooms}
      value={filteredRooms.find(r => r.id === selectedRoom) || null}
      onChange={(e, newValue) => {
        setSelectedRoom(newValue?.id || "");
        setSelectedBed("");
      }}
      getOptionLabel={(option) => option.room_number || ""}
      disabled={!selectedWard}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Room"
          required
          placeholder={!selectedWard ? "Select ward first" : ""}
        />
      )}
    />
  )}
</Box>

{/* Bed — show error if room selected but no beds available */}
{selectedRoom && filteredBeds.length === 0 ? (
  <Box sx={{
    border: "1px solid #fca5a5",
    borderRadius: "8px",
    bgcolor: "#fff7f7",
    px: 1.5,
    display: "flex",
    alignItems: "center",
    minHeight: "40px",
  }}>
    <Typography variant="caption" color="error.main" fontWeight={600}>
      ⚠ No available beds in this room
    </Typography>
  </Box>
) : (
  <Autocomplete
    fullWidth
    size="small"
    options={filteredBeds}
    value={filteredBeds.find(b => b.id === selectedBed) || null}
    onChange={(e, newValue) => setSelectedBed(newValue?.id || "")}
    getOptionLabel={(option) => `${option.bed_number} (${option.bed_type || "Bed"})`}
    isOptionEqualToValue={(option, value) => option.id === value.id}
    disabled={!selectedRoom}
    renderInput={(params) => (
      <TextField
        {...params}
        label="Search Bed"
        placeholder={!selectedRoom ? "Select room first" : "Type bed number"}
        required
      />
    )}
  />
)}

             

              {/* Start time — only for new allocation */}
              {!transferMode && (
                <TextField
                  fullWidth required size="small"
                  type="datetime-local"
                  label="Start Time"
                  InputLabelProps={{ shrink: true }}
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              )}

              {/* Buttons */}
              <Box sx={{ display: "flex", gap: 1.5, pt: 0.5 }}>
                <Button
                  fullWidth variant="outlined" color="inherit"
                  onClick={() => { setOpenModal(false); resetForm(); }}
                  sx={{ py: 1.1, borderRadius: "10px", fontWeight: 600 }}
                >
                  Cancel
                </Button>
                <Button
                  fullWidth type="submit" variant="contained"
                  color={transferMode ? "secondary" : "primary"}
                  disabled={submitLoading}
                  sx={{ py: 1.1, borderRadius: "10px", fontWeight: 700,
                    boxShadow: "0 4px 14px rgba(13,148,136,0.3)" }}
                >
                  {submitLoading
                    ? <CircularProgress size={20} color="inherit" />
                    : transferMode ? "Transfer Bed" : "Allocate Bed"
                  }
                </Button>
              </Box>
            </Box>
          </DialogContent>
        </Dialog>

        {/* ══════════════════════════════════════════════════════════════════
            HISTORY MODAL
        ══════════════════════════════════════════════════════════════════ */}
        <Dialog
          open={historyModal}
          onClose={() => setHistoryModal(false)}
          fullWidth maxWidth="lg"
          PaperProps={{ sx: { borderRadius: "20px", boxShadow: "0 20px 60px rgba(15,23,42,0.18)" } }}
        >
          <DialogTitle sx={{
            px: 3, py: 2.5,
            borderBottom: "1px solid", borderColor: "divider",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box sx={{
                width: 40, height: 40, borderRadius: "10px",
                bgcolor: alpha("#2563eb", 0.1),
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <HistoryIcon sx={{ color: "secondary.main", fontSize: 22 }} />
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: "1rem", color: "text.primary", lineHeight: 1.2 }}>
                  Bed Allocation History
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  IPD #{selectedIpdHistory}
                </Typography>
              </Box>
            </Stack>
            <IconButton
              size="small" onClick={() => setHistoryModal(false)}
              sx={{ bgcolor: "#f1f5f9", "&:hover": { bgcolor: "#fee2e2", color: "#dc2626" } }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </DialogTitle>

          <DialogContent sx={{ px: 3, py: 3 }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    {["Allocation ID", "Bed", "Room", "Branch", "Start Time", "End Time", "Status"].map((h) => (
                      <TableCell key={h}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedHistory.length > 0 ? selectedHistory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Box sx={{
                          display: "inline-flex", alignItems: "center",
                          bgcolor: "#f1f5f9", border: "1px solid #e2e8f0",
                          borderRadius: "6px", px: 1, py: 0.3,
                          fontSize: "0.75rem", fontWeight: 600, color: "text.secondary",
                        }}>
                          #{item.id}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{item.bed_number}</TableCell>
                      <TableCell>{item.room_number}</TableCell>
                      <TableCell>{item.branch_name}</TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>{fmt(item.start_time)}</TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>{fmt(item.end_time)}</TableCell>
                      <TableCell><StatusChip status={item.allocation_status} /></TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                        <Typography variant="body2" color="text.disabled">No history found</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </DialogContent>
        </Dialog>

      </Box>
    </ThemeProvider>
  );
}