/*
====================================================================
Formslist.jsx

The "created forms" screen. Responsive by construction: the grid is a
single CSS `auto-fill` track list, so it is 1 column on a phone, 2 on a
tablet, 3 on a wide desktop, with no breakpoint bookkeeping.

TWO FIXES BEYOND THE LAYOUT
---------------------------
1. It now calls GET /form-management/forms (new) instead of
   /form-management/admin/forms. The old endpoint queries
   form_submissions, so this screen was listing one card per patient
   SUBMISSION — the same form repeated — and passing a submission id to
   Preview / Edit / Delete. Those routes look up the `forms` table by
   id, so the wrong form could be opened or deleted.

2. Delete now removes the row from state AND reports failure, instead
   of silently leaving a deleted form on screen.
====================================================================
*/

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

import {
    Box,
    Typography,
    Button,
    Chip,
    IconButton,
    Tooltip,
    Stack,
    TextField,
    InputAdornment,
    Skeleton,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from "@mui/material";

import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

import { T, card, primaryBtn, shell, clamp } from "./Formtheme";

const API = process.env.REACT_APP_FORM_MODULE_API_URL;

/* 1 / 2 / 3 columns, decided by available width rather than breakpoints */
const GRID = {
    display: "grid",
    gap: { xs: 1.5, sm: 2 },
    gridTemplateColumns: {
        xs: "1fr",
        sm: "repeat(auto-fill, minmax(300px, 1fr))"
    }
};

const FormsList = ({ onCreateNew, onPreview, onEdit, refreshKey = 0 }) => {

    const [forms, setForms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");
    const [query, setQuery] = useState("");

    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const getForms = async () => {
        try {
            setLoading(true);
            setErrorMsg("");

            const response = await axios.get(`${API}/form-management/forms`, {
                withCredentials: true
            });

            setForms(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.log("Forms Fetch Error", error);
            setErrorMsg("Failed to load your forms.");
        } finally {
            setLoading(false);
        }
    };

    // refreshKey is bumped by the parent after a save in the popup, so the
    // card counts and any renamed form are up to date without a page reload
    useEffect(() => {
        getForms();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refreshKey]);

    const handleDelete = async () => {
        if (!deleteTarget) return;

        try {
            setDeleting(true);
            setErrorMsg("");

            await axios.delete(`${API}/form-management/delete/${deleteTarget.id}`, {
                withCredentials: true
            });

            setForms((prev) => prev.filter((f) => f.id !== deleteTarget.id));
            setDeleteTarget(null);
        } catch (error) {
            console.log("Form Delete Error", error);
            setErrorMsg("Failed to delete that form.");
        } finally {
            setDeleting(false);
        }
    };

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return forms;
        return forms.filter(
            (f) =>
                String(f.form_name || "").toLowerCase().includes(q) ||
                String(f.form_type || "").toLowerCase().includes(q)
        );
    }, [forms, query]);

    const renderCard = (form) => (
        <Box
            key={form.id}
            sx={{
                ...card,
                p: { xs: 2, sm: 2.5 },
                display: "flex",
                flexDirection: "column",
                gap: 1.25,
                transition: "border-color .15s, box-shadow .15s",
                "&:hover": {
                    borderColor: T.brand,
                    boxShadow: "0 4px 16px rgba(39,72,80,0.08)"
                }
            }}
        >
            <Box sx={{ minWidth: 0 }}>
                <Typography
                    title={form.form_name}
                    sx={{ fontWeight: 700, color: T.ink, lineHeight: 1.35, ...clamp(2) }}
                >
                    {form.form_name}
                </Typography>

                <Chip
                    label={form.form_type}
                    size="small"
                    sx={{
                        mt: 1,
                        backgroundColor: T.brandSoft,
                        color: T.brand,
                        fontWeight: 600,
                        fontSize: 11
                    }}
                />
            </Box>

            {form.description && (
                <Typography variant="body2" sx={{ color: T.muted, ...clamp(2) }}>
                    {form.description}
                </Typography>
            )}

            <Typography variant="caption" sx={{ color: T.muted }}>
                {form.section_count} section{form.section_count === 1 ? "" : "s"}
                {" · "}
                {form.field_count} field{form.field_count === 1 ? "" : "s"}
                {form.submission_count > 0 && (
                    <>
                        {" · "}
                        {form.submission_count} submission
                        {form.submission_count === 1 ? "" : "s"}
                    </>
                )}
            </Typography>

            {/* Actions pinned to the card bottom so cards of different
                heights still line their buttons up */}
            <Stack
                direction="row"
                spacing={0.5}
                sx={{
                    mt: "auto",
                    pt: 1,
                    borderTop: `1px solid ${T.line}`,
                    justifyContent: { xs: "space-around", sm: "flex-end" }
                }}
            >
                <Tooltip title="Preview">
                    <IconButton onClick={() => onPreview(form.id)} sx={{ color: T.brand }}>
                        <VisibilityIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Edit fields">
                    <IconButton onClick={() => onEdit(form.id)} sx={{ color: T.brand }}>
                        <EditIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Delete form">
                    <IconButton
                        onClick={() => setDeleteTarget(form)}
                        sx={{ color: T.danger }}
                    >
                        <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Stack>
        </Box>
    );

    return (
        <Box sx={shell(true)}>

            {/* Header: stacks on a phone, sits on one line from sm up */}
            <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                alignItems={{ xs: "stretch", sm: "center" }}
                justifyContent="space-between"
                sx={{ mb: 2.5 }}
            >
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: T.ink }}>
                        Forms
                    </Typography>
                    <Typography variant="body2" sx={{ color: T.muted }}>
                        {loading
                            ? "Loading…"
                            : `${forms.length} form${forms.length === 1 ? "" : "s"} created`}
                    </Typography>
                </Box>

                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={onCreateNew}
                    fullWidth={false}
                    sx={{ ...primaryBtn, alignSelf: { xs: "stretch", sm: "auto" } }}
                >
                    New form
                </Button>
            </Stack>

            {forms.length > 4 && (
                <TextField
                    size="small"
                    fullWidth
                    placeholder="Search forms"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon fontSize="small" sx={{ color: T.muted }} />
                            </InputAdornment>
                        )
                    }}
                    sx={{ mb: 2.5, maxWidth: { sm: 320 } }}
                />
            )}

            {errorMsg && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorMsg("")}>
                    {errorMsg}
                </Alert>
            )}

            {loading ? (
                <Box sx={GRID}>
                    {[0, 1, 2].map((i) => (
                        <Box key={i} sx={{ ...card, p: 2.5 }}>
                            <Skeleton width="70%" height={24} />
                            <Skeleton width={90} height={22} sx={{ mt: 1 }} />
                            <Skeleton width="50%" height={18} sx={{ mt: 2 }} />
                        </Box>
                    ))}
                </Box>
            ) : forms.length === 0 ? (
                <Box sx={{ ...card, p: { xs: 4, sm: 6 }, textAlign: "center" }}>
                    <DescriptionOutlinedIcon sx={{ fontSize: 40, color: "#c7d2d4" }} />
                    <Typography sx={{ color: T.ink, fontWeight: 600, mt: 1 }}>
                        No forms yet
                    </Typography>
                    <Typography variant="body2" sx={{ color: T.muted, mt: 0.5, mb: 2.5 }}>
                        Upload a PDF and we will detect the fields for you.
                    </Typography>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={onCreateNew}
                        sx={primaryBtn}
                    >
                        New form
                    </Button>
                </Box>
            ) : visible.length === 0 ? (
                <Typography sx={{ color: T.muted }}>
                    No forms match “{query}”.
                </Typography>
            ) : (
                <Box sx={GRID}>{visible.map(renderCard)}</Box>
            )}

            <Dialog
                open={Boolean(deleteTarget)}
                onClose={() => !deleting && setDeleteTarget(null)}
                fullWidth
                maxWidth="xs"
            >
                <DialogTitle sx={{ fontWeight: 700, color: T.ink }}>
                    Delete this form?
                </DialogTitle>
                <DialogContent>
                    <Typography sx={{ color: T.muted }}>
                        “{deleteTarget?.form_name}” and its field configuration will be
                        permanently removed. Past submissions are not deleted.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button
                        onClick={() => setDeleteTarget(null)}
                        disabled={deleting}
                        sx={{ textTransform: "none", color: T.muted, fontWeight: 600 }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleDelete}
                        disabled={deleting}
                        variant="contained"
                        sx={{
                            ...primaryBtn,
                            bgcolor: T.danger,
                            "&:hover": { bgcolor: T.dangerDark, boxShadow: "none" }
                        }}
                    >
                        {deleting ? "Deleting…" : "Delete"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default FormsList;