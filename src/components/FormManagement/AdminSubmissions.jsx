/*
====================================================================
AdminSubmissions.jsx

Three separate actions per row, each with its own dialog — no more
"open the viewer, then find an Edit button inside it":

  eye     -> SubmissionPreview   read-only, looks exactly like the PDF
  pencil  -> SubmissionEditForm  live editable form, prefilled
  pdf     -> direct download
  bin     -> delete

The old SubmissionView.jsx (and SubmissionEditform.js) are replaced by
those two components and can be deleted.
====================================================================
*/

import React, { useCallback, useEffect, useState } from "react";

import {
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Tooltip,
    Chip,
    Snackbar,
    Alert
} from "@mui/material";

import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";

import {
    getSubmissions,
    deleteSubmission,
    downloadSubmissionPDF
} from "./formManagementApi";

import SubmissionPreview from "./SubmissionPreview";
import SubmissionEditForm from "./SubmissionEditForm";


const AdminSubmissions = () => {

    const [submissions, setSubmissions] = useState([]);

    // two independent dialogs — viewing never turns into editing
    const [viewId, setViewId] = useState(null);
    const [editId, setEditId] = useState(null);

    const [toast, setToast] = useState(null);

    const loadSubmissions = useCallback(async () => {
        try {
            const data = await getSubmissions();
            setSubmissions(data);
        } catch (error) {
            console.log("Submission Fetch Error", error);
            setToast({ severity: "error", message: "Could not load submissions." });
        }
    }, []);

    useEffect(() => {
        loadSubmissions();
    }, [loadSubmissions]);

    const removeSubmission = async (id) => {
        if (!window.confirm("Are you sure you want to delete?")) return;

        try {
            await deleteSubmission(id);
            loadSubmissions();
            setToast({ severity: "success", message: "Submission deleted." });
        } catch (error) {
            console.log("Submission Delete Error", error);
            setToast({ severity: "error", message: "Could not delete submission." });
        }
    };

    const downloadPdf = async (id) => {
        try {
            await downloadSubmissionPDF(id);
        } catch (error) {
            console.log("PDF Download Error", error);
            setToast({ severity: "error", message: "Could not generate the PDF." });
        }
    };

    return (
        <Box sx={{ padding: "25px" }}>

            <Typography variant="h5" fontWeight="600" mb={3}>
                Patient Submitted Forms
            </Typography>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>S.No</TableCell>
                            <TableCell>Patient Name</TableCell>
                            <TableCell>Form Name</TableCell>
                            <TableCell>Form Type</TableCell>
                            <TableCell>Date</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {submissions.map((item, index) => (
                            <TableRow key={item.id} hover>

                                <TableCell>{index + 1}</TableCell>

                                <TableCell>
                                    <Typography>
                                        {item.client_name || "N/A"}
                                    </Typography>
                                    <Typography fontSize="12px" color="gray">
                                        {item.email}
                                    </Typography>
                                </TableCell>

                                <TableCell>{item.form_name}</TableCell>

                                <TableCell>
                                    <Chip label={item.form_type} size="small" />
                                </TableCell>

                                <TableCell>
                                    {new Date(item.created_at).toLocaleString()}
                                </TableCell>

                                <TableCell align="right">

                                    <Tooltip title="View form">
                                        <IconButton
                                            color="primary"
                                            onClick={() => setViewId(item.id)}
                                        >
                                            <VisibilityIcon />
                                        </IconButton>
                                    </Tooltip>

                                    <Tooltip title="Edit / complete form">
                                        <IconButton
                                            color="info"
                                            onClick={() => setEditId(item.id)}
                                        >
                                            <EditIcon />
                                        </IconButton>
                                    </Tooltip>

                                    <Tooltip title="Download PDF">
                                        <IconButton
                                            color="success"
                                            onClick={() => downloadPdf(item.id)}
                                        >
                                            <PictureAsPdfIcon />
                                        </IconButton>
                                    </Tooltip>

                                    <Tooltip title="Delete">
                                        <IconButton
                                            color="error"
                                            onClick={() => removeSubmission(item.id)}
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </Tooltip>

                                </TableCell>

                            </TableRow>
                        ))}

                        {submissions.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                                    <Typography color="text.secondary">
                                        No submitted forms yet.
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* VIEW — read-only, identical to the PDF */}
            {viewId && (
                <SubmissionPreview
                    id={viewId}
                    open
                    close={() => setViewId(null)}
                />
            )}

            {/* EDIT — live form, prefilled with what the patient submitted */}
            {editId && (
                <SubmissionEditForm
                    id={editId}
                    open
                    close={() => setEditId(null)}
                    onSaved={() => {
                        loadSubmissions();
                        setToast({ severity: "success", message: "Submission updated." });
                    }}
                />
            )}

            <Snackbar
                open={Boolean(toast)}
                autoHideDuration={4000}
                onClose={() => setToast(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                {toast && (
                    <Alert severity={toast.severity} onClose={() => setToast(null)}>
                        {toast.message}
                    </Alert>
                )}
            </Snackbar>

        </Box>
    );
};

export default AdminSubmissions;