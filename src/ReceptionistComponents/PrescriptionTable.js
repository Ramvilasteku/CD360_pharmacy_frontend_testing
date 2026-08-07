import React, { useEffect, useState, useMemo } from "react";
import {
    Card,
    CardContent,
    Typography,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    IconButton,
    Stack,
    Dialog,
    Box,
    TablePagination,
    useTheme,
    useMediaQuery,
    TextField,
    Button,
    Grid,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { InputAdornment } from "@mui/material";

import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import ShareIcon from '@mui/icons-material/Share';


import PrescriptionPreview from "../StaffComponents/PrescriptionPreview";
import EditPrescription from "../StaffComponents/Editprescription";
import SharePrescriptionModal from "../StaffComponents/SharePrescriptionModal";

export default function PrescriptionTable({ refreshKey }) {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [company, setCompany] = useState(null);
    const [doctor, setDoctor] = useState(null);
    const [editId, setEditId] = useState(null);
    const [shareOpen, setShareOpen] = useState(false);
    const [shareId, setShareId] = useState(null);
    const [search, setSearch] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    

    /* ───────── Responsive + Pagination ───────── */
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);

    // const paginatedRows = rows.slice(
    //     page * rowsPerPage,
    //     page * rowsPerPage + rowsPerPage
    // );

    const handleChangePage = (_, newPage) => setPage(newPage);

    const handleChangeRowsPerPage = (e) => {
        setRowsPerPage(parseInt(e.target.value, 10));
        setPage(0);
    };

    /* ───────── Fetch Data ───────── */
    useEffect(() => {
        fetchPrescriptions();
    }, [refreshKey]);

    const fetchPrescriptions = async () => {
        setLoading(true);
        try {
            const res = await fetch(
                `${process.env.REACT_APP_SITE_URL}/api/prescriptions`,
                { credentials: "include" }
            );
            const data = await res.json();
            if (data.success) setRows(data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetch(`${process.env.REACT_APP_SITE_URL}/api/company-info/full`, {
            credentials: "include",
        })
            .then((r) => r.json())
            .then((d) => d.success && setCompany(d.data));
    }, []);

    useEffect(() => {
        fetch(`${process.env.REACT_APP_SITE_URL}/api/staff/self`, {
            credentials: "include",
        })
            .then((r) => r.json())
            .then((d) => d.success && setDoctor(d.data));
    }, []);

    /* ───────── Actions ───────── */
    const handleDelete = async (id) => {
        if (!window.confirm("Delete this prescription?")) return;
        await fetch(
            `${process.env.REACT_APP_SITE_URL}/api/prescriptions/${id}`,
            { method: "DELETE", credentials: "include" }
        );
        fetchPrescriptions();
    };

    const handleEdit = (id) => {
        setPreviewData(null);
        setEditId(id);
    };

    const handlePreview = async (id) => {
        const res = await fetch(
            `${process.env.REACT_APP_SITE_URL}/api/prescriptions/${id}`,
            { credentials: "include" }
        );
        const json = await res.json();

        console.log("preview data is", json.data);

        if (json.success) {

            setPreviewData({
                ...json.data,

                notes: {
                    chiefComplaint: json.data.appointment?.purpose || "",
                    treatmentPlan: json.data.description || "",
                    doctorNotes: json.data.notes || "",
                    diagnosis: json.data.diagnosis || "",
                }
            });

        }
    };

    const filteredRows = useMemo(() => {
        const q = search.trim().toLowerCase();

        return rows.filter((rx) => {
            // text: patient name, prescription id, appointment id
            const matchesText =
                !q ||
                String(rx.patient_name || "").toLowerCase().includes(q) ||
                String(rx.id).includes(q) ||
                String(rx.appointment_id || "").includes(q);

            if (!matchesText) return false;

            // date range (created_at)
            if (fromDate || toDate) {
                const created = new Date(rx.created_at);
                if (isNaN(created)) return false;

                if (fromDate) {
                    const start = new Date(fromDate);
                    start.setHours(0, 0, 0, 0);
                    if (created < start) return false;
                }
                if (toDate) {
                    const end = new Date(toDate);
                    end.setHours(23, 59, 59, 999); // include the whole end day
                    if (created > end) return false;
                }
            }

            return true;
        });
    }, [rows, search, fromDate, toDate]);

    // reset to first page whenever filters change
    useEffect(() => {
        setPage(0);
    }, [search, fromDate, toDate]);

    const paginatedRows = filteredRows.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
    );

    const handleClearFilters = () => {
        setSearch("");
        setFromDate("");
        setToDate("");
    };

    /* ───────── Render ───────── */
    return (
        <>
            <Card sx={{ mt: 4 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        All Prescriptions
                    </Typography>
                    <Grid container spacing={2} sx={{ mb: 2,mt: 2 }} alignItems="center">
                        <Grid item xs={12} sm={4}>
                            <TextField
                                fullWidth
                                size="small"
                                label="Search patient / ID"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon fontSize="small" />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Grid>

                        <Grid item xs={6} sm={3}>
                            <TextField
                                fullWidth
                                size="small"
                                type="date"
                                label="From"
                                InputLabelProps={{ shrink: true }}
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                            />
                        </Grid>

                        <Grid item xs={6} sm={3}>
                            <TextField
                                fullWidth
                                size="small"
                                type="date"
                                label="To"
                                InputLabelProps={{ shrink: true }}
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                inputProps={{ min: fromDate || undefined }}
                            />
                        </Grid>

                        <Grid item xs={12} sm={2}>
                            <Button
                                fullWidth
                                variant="contained"
                                onClick={handleClearFilters}
                                disabled={!search && !fromDate && !toDate}
                            >
                                reset
                            </Button>
                        </Grid>
                    </Grid>

                    {/* ───── Mobile Card View ───── */}
                    {isMobile ? (
                        paginatedRows.map((rx) => (
                            <Card key={rx.id} sx={{ mb: 2 }}>
                                <CardContent>
                                    <Typography variant="subtitle2">
                                        Prescription #{rx.id}
                                    </Typography>

                                    <Typography variant="body2">
                                        <b>Patient:</b> {rx.patient_name}
                                    </Typography>

                                    <Typography variant="body2">
                                        <b>Appointment:</b> {rx.appointment_id || "-"}
                                    </Typography>

                                    <Typography variant="body2">
                                        <b>Date:</b>{" "}
                                        {new Date(rx.created_at).toLocaleDateString("en-IN")}
                                    </Typography>

                                    <Typography variant="body2">
                                        <b>Medicines:</b> {rx.medicine_count} | <b>Tests:</b>{" "}
                                        {rx.test_count}
                                    </Typography>

                                    <Stack direction="row" spacing={1} mt={1}>
                                        {/* <IconButton size="small" onClick={() => handleEdit(rx.id)}>
                      <EditIcon />
                    </IconButton> */}
                                        <IconButton size="small" onClick={() => handlePreview(rx.id)}>
                                            <PictureAsPdfIcon sx={{ color: "blue" }} />
                                        </IconButton>
                                        {/* <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(rx.id)}
                    >
                      <DeleteIcon />
                    </IconButton> */}
                                    </Stack>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        /* ───── Desktop Table View ───── */
                        <Table size="small">
                            <TableHead sx={{ backgroundColor: "#3f6f7a", color: "#ffffff" }}>
                                <TableRow sx={{ color: "#ffffff" }}>
                                    <TableCell sx={{ color: "#ffffff" }}>ID</TableCell>
                                    <TableCell sx={{ color: "#ffffff" }}>Patient</TableCell>
                                    <TableCell sx={{ color: "#ffffff" }}>Appointment</TableCell>
                                    <TableCell sx={{ color: "#ffffff" }}>Prescription Date</TableCell>
                                    <TableCell sx={{ color: "#ffffff" }}>Medicines</TableCell>
                                    <TableCell sx={{ color: "#ffffff" }}>Tests</TableCell>
                                    <TableCell sx={{ color: "#ffffff" }}>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paginatedRows.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                                            {loading ? "Loading..." : "No prescriptions found"}
                                        </TableCell>
                                    </TableRow>
                                ) : (paginatedRows.map((rx) => (
                                    <TableRow key={rx.id}>
                                        <TableCell>{rx.id}</TableCell>
                                        <TableCell>{rx.patient_name}</TableCell>
                                        <TableCell>{rx.appointment_id || "-"}</TableCell>
                                        <TableCell>
                                            {new Date(rx.created_at).toLocaleDateString("en-IN")}
                                        </TableCell>
                                        <TableCell>{rx.medicine_count}</TableCell>
                                        <TableCell>{rx.test_count}</TableCell>
                                        <TableCell align="right">
                                            <Stack direction="row" spacing={1}>
                                                {/* <IconButton size="small" onClick={() => setShareId(rx.id)}>
                          <ShareIcon sx={{ width: "18px", height: "18px" }} />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleEdit(rx.id)}>
                          <EditIcon />
                        </IconButton> */}
                                                <IconButton size="small" onClick={() => handlePreview(rx.id)}>
                                                    <PictureAsPdfIcon />
                                                </IconButton>
                                                {/* <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(rx.id)}
                        >
                          <DeleteIcon />
                        </IconButton> */}
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                )))}
                            </TableBody>
                        </Table>
                    )}

                    {/* ───── Pagination ───── */}
                    <TablePagination
                        component="div"
                        count={filteredRows.length}
                        page={page}
                        onPageChange={handleChangePage}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                        rowsPerPageOptions={[5, 10, 25]}
                    />
                </CardContent>
            </Card>

            {/* Edit Dialog */}
            <Dialog open={Boolean(editId)} onClose={() => setEditId(null)} fullScreen>
                {editId && (
                    <EditPrescription
                        prescriptionId={editId}
                        onClose={() => setEditId(null)}
                        onSaved={fetchPrescriptions}
                    />
                )}
            </Dialog>

            {/* Preview Dialog */}
            <Dialog
                open={Boolean(previewData)}
                onClose={() => setPreviewData(null)}
                fullWidth
                maxWidth="lg"
            >
                <Box sx={{ p: 2 }}>
                    {previewData && (
                        <PrescriptionPreview
                            data={previewData}
                            onClose={() => setPreviewData(null)}
                        />
                    )}
                </Box>
            </Dialog>
            <SharePrescriptionModal
                open={Boolean(shareId)}
                prescriptionId={shareId}
                onClose={() => setShareId(null)}
                base={process.env.REACT_APP_SITE_URL || ""}
            />
        </>
    );
}