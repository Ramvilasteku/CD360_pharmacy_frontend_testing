import React, { useEffect, useState, useMemo } from "react";
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
  Grid,
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
  Skeleton
} from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";

import AddIcon        from "@mui/icons-material/Add";
import EditIcon       from "@mui/icons-material/Edit";
import DeleteIcon     from "@mui/icons-material/Delete";
import CloseIcon      from "@mui/icons-material/Close";
import SearchIcon     from "@mui/icons-material/Search";
import KingBedIcon    from "@mui/icons-material/KingBed";
import BedIcon        from "@mui/icons-material/Bed";
import HotelIcon      from "@mui/icons-material/Hotel";


// ─── Theme ────────────────────────────────────────────────────────────────────
const bedTheme = createTheme({
  palette: {
    primary:    { main: "#0d9488", dark: "#0f766e", light: "#ccfbf1" },
    secondary:  { main: "#2563eb" },
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
          "&:hover .MuiOutlinedInput-notchedOutline":      { borderColor: "#0d9488" },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#0d9488" },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 700,
          fontSize: "0.72rem",
          textTransform: "uppercase",
          letterSpacing: "0.6px",
          color: "#64748b",
          backgroundColor: "#f8fafc",
          whiteSpace: "nowrap",
        },
        body: {
          fontSize: "0.875rem",
          color: "#475569",
          borderBottom: "1px solid #f1f5f9",
        },
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
  },
});

// ─── StatusChip ───────────────────────────────────────────────────────────────
const StatusChip = ({ status }) => {
  const isAvailable = status === "available";

  

  return (
    <Chip
      size="small"
      label={isAvailable ? "Available" : "Occupied"}
      sx={{
        fontWeight: 700,
        fontSize: "0.72rem",
        bgcolor: isAvailable ? "#dcfce7" : "#fee2e2",
        color:   isAvailable ? "#16a34a"  : "#dc2626",
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
      <Typography variant="h5" sx={{ fontSize: "1.6rem", fontWeight: 700, lineHeight: 1, color: "text.primary" }}>
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

// ═════════════════════════════════════════════════════════════════════════════
// MAIN
// ═════════════════════════════════════════════════════════════════════════════


const BedTableSkeleton = () => (
  <Paper
    elevation={0}
    sx={{
      border: "1px solid",
      borderColor: "divider",
      borderRadius: 3,
      overflow: "hidden",
      mb: 3,
    }}
  >
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            {["Bed", "Room", "Ward", "Charge", "Status", "Actions"].map(
              (item) => (
                <TableCell key={item}>{item}</TableCell>
              )
            )}
          </TableRow>
        </TableHead>

        <TableBody>
          {[...Array(5)].map((_, index) => (
            <TableRow key={index}>
              <TableCell>
                <Skeleton width={100} />
              </TableCell>
              <TableCell>
                <Skeleton width={80} />
              </TableCell>
              <TableCell>
                <Skeleton width={120} />
              </TableCell>
              <TableCell>
                <Skeleton width={70} />
              </TableCell>
              <TableCell>
                <Skeleton width={90} height={30} />
              </TableCell>
              <TableCell>
                <Stack direction="row" spacing={1}>
                  <Skeleton
                    variant="rounded"
                    width={70}
                    height={32}
                  />
                  <Skeleton
                    variant="rounded"
                    width={80}
                    height={32}
                  />
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Paper>
);

const BedCardSkeleton = () => (
  <>
    {[...Array(5)].map((_, index) => (
      <Card
        key={index}
        elevation={0}
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 3,
          mb: 2,
        }}
      >
        <CardContent>
          <Skeleton width="60%" height={30} />
          <Skeleton width="90%" />
          <Skeleton width="70%" />

          <Divider sx={{ my: 2 }} />

          <Skeleton width="40%" />
          <Skeleton width="30%" />
        </CardContent>

        <CardActions sx={{ px: 2, pb: 2 }}>
          <Skeleton
            variant="rounded"
            width="100%"
            height={36}
          />
        </CardActions>
      </Card>
    ))}
  </>
);

export default function BedCreation() {
  const theme    = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [wards, setWards] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [beds,  setBeds]  = useState([]);

  const [selectedWard, setSelectedWard] = useState("");
  const [selectedRoom, setSelectedRoom] = useState("");
  const [bedNumber,    setBedNumber]    = useState("");
  const [bedCharge,    setBedCharge]    = useState("");

  const [search,       setSearch]       = useState("");
  const [wardFilter, setWardFilter] = useState("");
  const [openModal,    setOpenModal]    = useState(false);
  const [editId,       setEditId]       = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [submitLoading,setSubmitLoading]= useState(false);
  const [currentPage,  setCurrentPage]  = useState(1);
  const recordsPerPage = 5;
  const hasWards = wards.length > 0;

  const filteredRooms = rooms.filter((r) => r.ward_type_id === Number(selectedWard));
  const hasRoomsForWard =
  selectedWard && filteredRooms.length > 0;

  // ── Fetch ──────────────────────────── ──────────────────────────────────────
  const fetchWards = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/getall/wardtype`, { withCredentials: true });
      setWards(res.data.data || []);
    } catch (err) { console.error(err); }
  };

  const fetchRooms = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/getall/rooms`, { withCredentials: true });
      setRooms(res.data.data || []);
    } catch (err) { console.error(err); }
  };

  const fetchBeds = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/getall/beds`, { withCredentials: true });
      setBeds(res.data.data || []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await Promise.all([fetchWards(), fetchRooms(), fetchBeds()]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Derived ────────────────────────────────────────────────────────────────
  

 const filteredBeds = useMemo(() => {

 

  return beds.filter((bed) => {
    const s = search.toLowerCase();

    const matchesSearch =
      bed.bed_number?.toLowerCase().includes(s) ||
      String(bed.id).includes(s) ||
      bed.room_number?.toLowerCase().includes(s) ||
      bed.ward_type_name?.toLowerCase().includes(s);

    const matchesWard =
      !wardFilter ||
      bed.ward_type_name === wardFilter ||
      String(bed.ward_type_id) === String(wardFilter);

    return matchesSearch && matchesWard;
  });
}, [beds, search, wardFilter]);

  const totalPages       = Math.ceil(filteredBeds.length / recordsPerPage);
  const paginatedBeds    = useMemo(() => {
    const start = (currentPage - 1) * recordsPerPage;
    return filteredBeds.slice(start, start + recordsPerPage);
  }, [filteredBeds, currentPage]);

  const availableCount = beds.filter((b) => b.bed_status === "available").length;
  const occupiedCount  = beds.filter((b) => b.bed_status === "occupied").length;

  // ── Actions ────────────────────────────────────────────────────────────────
  const resetForm = () => {
    setSelectedWard(""); setSelectedRoom("");
    setBedNumber(""); setBedCharge(""); setEditId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitLoading(true);
      if (editId) {
        await axios.put(
          `${process.env.REACT_APP_API_URL}/update/bed/${editId}`,
          { room_id: selectedRoom, bed_number: bedNumber, bed_charge: bedCharge, bed_status: "available" },
          { withCredentials: true }
        );
        alert("Bed Updated Successfully");
      } else {
        await axios.post(
          `${process.env.REACT_APP_API_URL}/post/bed`,
          { room_id: selectedRoom, bed_number: bedNumber, bed_charge: bedCharge, branch_name: "Main Branch" },
          { withCredentials: true }
        );
        alert("Bed Created Successfully");
      }
      fetchBeds(); resetForm(); setOpenModal(false);
    } catch (err) {
      alert(err.response?.data?.message || "Something went wrong");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete?")) return;
    try {
      await axios.delete(`${process.env.REACT_APP_API_URL}/delete/bed/${id}`, { withCredentials: true });
      alert("Deleted Successfully");
      fetchBeds();
    } catch (err) { console.error(err); }
  };

  const handleEdit = (bed) => {
    setEditId(bed.id);
    setSelectedRoom(bed.room_id);
    setBedNumber(bed.bed_number);
    setBedCharge(bed.bed_charge);
    const roomData = rooms.find((r) => r.id === bed.room_id);
    if (roomData) setSelectedWard(roomData.ward_type_id);
    setOpenModal(true);
  };

  // ── Loader ─────────────────────────────────────────────────────────────────
  if (loading) {
  return (
    <ThemeProvider theme={bedTheme}>
      <Box
        sx={{
          p: { xs: 2, sm: 3 },
          bgcolor: "background.default",
          minHeight: "100vh",
        }}
      >
        {/* Header Skeleton */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 3,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 3,
          }}
        >
          <Skeleton width={250} height={40} />
          <Skeleton width={120} />
        </Paper>

        {/* Stats Skeleton */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(3,1fr)",
            },
            gap: 2,
            mb: 3,
          }}
        >
          {[1, 2, 3].map((item) => (
            <Paper key={item} sx={{ p: 2 }}>
              <Skeleton width={60} height={40} />
              <Skeleton width={100} />
            </Paper>
          ))}
        </Box>

        {/* Table/Card Skeleton */}
        {window.innerWidth > 900 ? (
          <BedTableSkeleton />
        ) : (
          <BedCardSkeleton />
        )}
      </Box>
    </ThemeProvider>
  );
}



  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <ThemeProvider theme={bedTheme}>
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
              width: 44, height: 44, borderRadius: 2,
              bgcolor: alpha("#0d9488", 0.1),
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <KingBedIcon sx={{ color: "primary.main", fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="h5" color="text.primary">Bed Management</Typography>
              <Typography variant="caption" color="text.secondary">
                {beds.length} total beds
              </Typography>
            </Box>
          </Stack>
          <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => {
            if (wards.length === 0) {
              alert("Please create a Ward first");
              return;
            }

            resetForm();
            setOpenModal(true);
          }}
        >
          Add Bed
        </Button>
        </Paper>

        {/* ── Stats ── */}
        <Box sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
          gap: 2, mb: 3,
        }}>
          <StatCard
            icon={<KingBedIcon sx={{ fontSize: 26 }} />}
            value={beds.length}
            label="Total Beds"
            iconBg="#dbeafe"
            iconColor="#2563eb"
          />
          <StatCard
            icon={<BedIcon sx={{ fontSize: 26 }} />}
            value={availableCount}
            label="Available"
            iconBg="#dcfce7"
            iconColor="#16a34a"
          />
          <StatCard
            icon={<HotelIcon sx={{ fontSize: 26 }} />}
            value={occupiedCount}
            label="Occupied"
            iconBg="#fee2e2"
            iconColor="#dc2626"
          />
        </Box>

        {/* ── Search ── */}
       <Paper
  elevation={0}
  sx={{
    p: 2,
    mb: 3,
    border: "1px solid",
    borderColor: "divider",
    borderRadius: 3,
  }}
>
  <Stack
    direction={{ xs: "column", sm: "row" }}
    spacing={2}
    alignItems="center"
  >
    <TextField
      size="small"
      placeholder="Search bed, room, ward..."
      value={search}
      onChange={(e) => {
        setSearch(e.target.value);
        setCurrentPage(1);
      }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon sx={{ fontSize: 18, color: "text.disabled" }} />
          </InputAdornment>
        ),
      }}
      sx={{ width: { xs: "100%", sm: 340 } }}
    />

    <FormControl size="small" sx={{ minWidth: 220 }}>
      <InputLabel>Ward Type</InputLabel>
      <Select
        value={wardFilter}
        label="Ward Type"
        onChange={(e) => {
          setWardFilter(e.target.value);
          setCurrentPage(1);
        }}
      >
        <MenuItem value="">All Wards</MenuItem>

        {wards.map((ward) => (
          <MenuItem key={ward.id} value={ward.ward_type_name}>
            {ward.ward_type_name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  </Stack>
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
                    {["Bed Number", "Room", "Ward", "Charge", "Status", "Actions"].map((h) => (
                      <TableCell key={h}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedBeds.length > 0 ? paginatedBeds.map((bed) => (
                    <TableRow key={bed.id}>
                      <TableCell sx={{ fontWeight: 600, color: "text.primary" }}>{bed.bed_number}</TableCell>
                      <TableCell>{bed.room_number}</TableCell>
                      <TableCell>{bed.ward_type_name}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>₹ {bed.bed_charge}</TableCell>
                      <TableCell><StatusChip status={bed.bed_status} /></TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <Button
                            size="small" variant="contained" color="primary"
                            startIcon={<EditIcon sx={{ fontSize: 14 }} />}
                            onClick={() => handleEdit(bed)}
                            sx={{ px: 1.5, py: 0.6, fontSize: "0.78rem" }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="small" variant="outlined" color="error"
                            startIcon={<DeleteIcon sx={{ fontSize: 14 }} />}
                            onClick={() => handleDelete(bed.id)}
                            sx={{ px: 1.5, py: 0.6, fontSize: "0.78rem" }}
                          >
                            Delete
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                        <Typography variant="body2" color="text.disabled">No Beds Found</Typography>
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
            {paginatedBeds.length === 0
              ? <Typography align="center" color="text.disabled" py={6}>No Beds Found</Typography>
              : paginatedBeds.map((bed) => (
                <Card key={bed.id} elevation={0} sx={{
                  border: "1px solid", borderColor: "divider", borderRadius: 3, mb: 2,
                  transition: "all 0.2s", "&:hover": { transform: "translateY(-2px)", boxShadow: 3 },
                }}>
                  <CardContent sx={{ pb: 1 }}>
                    <Stack direction="row" justifyContent="space-between" mb={1}>
                      <Typography variant="subtitle2" fontWeight={700} color="text.primary">
                        {bed.bed_number}
                      </Typography>
                      <StatusChip status={bed.bed_status} />
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      Room: {bed.room_number} · {bed.ward_type_name}
                    </Typography>
                    <Divider sx={{ my: 1.5 }} />
                    <Stack direction="row" justifyContent="space-between">
                      <Box>
                        <Typography variant="caption" color="text.disabled" fontWeight={600} textTransform="uppercase">Charge</Typography>
                        <Typography variant="body2" fontWeight={600} color="text.primary">₹ {bed.bed_charge}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.disabled" fontWeight={600} textTransform="uppercase">Ward</Typography>
                        <Typography variant="body2" fontWeight={600} color="text.primary">{bed.ward_type_name}</Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                  <CardActions sx={{ px: 2, pb: 2, gap: 1 }}>
                    <Button fullWidth variant="contained" color="primary" size="small"
                      startIcon={<EditIcon />} onClick={() => handleEdit(bed)}>Edit</Button>
                    <Button fullWidth variant="outlined" color="error" size="small"
                      startIcon={<DeleteIcon />} onClick={() => handleDelete(bed.id)}>Delete</Button>
                  </CardActions>
                </Card>
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
            MODAL
        ══════════════════════════════════════════════════════════════════ */}
        <Dialog
          open={openModal}
          onClose={() => { setOpenModal(false); resetForm(); }}
          fullWidth
          maxWidth="xs"
          PaperProps={{
            sx: {
              borderRadius: "20px",
              boxShadow: "0 20px 60px rgba(15,23,42,0.18)",
              background: "#fff",
            },
          }}
        >
          {/* ── Modal Header ── */}
          <DialogTitle sx={{
            px: 3, py: 2.5,
            borderBottom: "1px solid", borderColor: "divider",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box sx={{
                width: 40, height: 40, borderRadius: "10px",
                bgcolor: alpha("#0d9488", 0.1),
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <KingBedIcon sx={{ color: "primary.main", fontSize: 22 }} />
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: "1rem", color: "text.primary", lineHeight: 1.2 }}>
                  {editId ? "Edit Bed" : "Create Bed"}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Fill in the details below
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

          {/* ── Modal Body ── */}
          <DialogContent sx={{ px: 3, py: 3 }}>
            <Box
              component="form"
              onSubmit={handleSubmit}
              sx={{ display: "flex", flexDirection: "column", gap: 2.5, mt: 0.5 }}
            >

              {/* Ward */}
              {!hasWards ? (
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: "#fff7ed",
                    border: "1px solid #fdba74",
                  }}
                >
                  <Typography color="warning.main" fontWeight={600}>
                    No Wards Available
                  </Typography>

                  <Typography variant="body2">
                    Please create a Ward before creating a Bed.
                  </Typography>
                </Box>
              ) : (
                <FormControl fullWidth size="small" required>
                  <InputLabel>Ward</InputLabel>

                  <Select
                    value={selectedWard}
                    label="Ward"
                    onChange={(e) => {
                      setSelectedWard(e.target.value);
                      setSelectedRoom("");
                    }}
                  >
                    {wards.map((w) => (
                      <MenuItem key={w.id} value={w.id}>
                        {w.ward_type_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              {/* Room */}
             {selectedWard && (
              <>
                {filteredRooms.length === 0 ? (
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: "#eff6ff",
                      border: "1px solid #93c5fd",
                    }}
                  >
                    <Typography color="primary" fontWeight={600}>
                      No Rooms Available
                    </Typography>

                    <Typography variant="body2">
                      Please create a Room under this Ward first.
                    </Typography>
                  </Box>
                ) : (
                  <FormControl fullWidth size="small" required>
                    <InputLabel>Room</InputLabel>

                    <Select
                      value={selectedRoom}
                      label="Room"
                      onChange={(e) => setSelectedRoom(e.target.value)}
                    >
                      {filteredRooms.map((r) => (
                        <MenuItem key={r.id} value={r.id}>
                          {r.room_number}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </>
            )}



              {/* Bed Number & Charge — side by side */}
             {selectedRoom && (
              <Box sx={{ display: "flex", gap: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  required
                  label="Bed Number"
                  value={bedNumber}
                  onChange={(e) => setBedNumber(e.target.value)}
                />

                <TextField
                  fullWidth
                  size="small"
                  required
                  type="number"
                  label="Charge (₹)"
                  value={bedCharge}
                  onChange={(e) => setBedCharge(e.target.value)}
                />
              </Box>
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
                  fullWidth type="submit" variant="contained" color="primary"
                  disabled={submitLoading}
                  sx={{
                    py: 1.1, borderRadius: "10px", fontWeight: 700,
                    boxShadow: "0 4px 14px rgba(13,148,136,0.3)",
                  }}
                >
                  {submitLoading
                    ? <CircularProgress size={20} color="inherit" />
                    : editId ? "Update Bed" : "Create Bed"
                  }
                </Button>
              </Box>

            </Box>
          </DialogContent>
        </Dialog>

      </Box>
    </ThemeProvider>
  );
}