import React, { useEffect, useState, useMemo } from "react";

import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    Divider,
    CircularProgress,
    TextField,
    Alert
} from "@mui/material";

import {
    getSubmissionById,
    updateSubmission
} from "./formManagementApi";


// Turns whatever form_schema shape you have into a flat list of
// { id, label } fields to edit. Falls back to the keys already
// present in form_data if form_schema isn't usable, so editing
// works even before the schema shape is confirmed.
function getEditableFields(formSchema, formData) {
    if (Array.isArray(formSchema) && formSchema.length > 0 && formSchema[0].fields) {
        // sectioned schema: [{ title, fields: [...] }]
        return formSchema.flatMap((section) => section.fields || []);
    }

    if (Array.isArray(formSchema) && formSchema.length > 0 && formSchema[0].id) {
        // flat schema: [{ id, label }]
        return formSchema;
    }

    // no usable schema — edit whatever keys are already in the data
    return Object.keys(formData || {}).map((key) => ({
        id: key,
        label: key.replace(/_/g, " ")
    }));
}


const SubmissionView = ({ id, open, close }) => {

    const [submission, setSubmission] = useState(null);
    const [loading, setLoading] = useState(false);

    const [editMode, setEditMode] = useState(false);
    const [values, setValues] = useState({});
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const fetchSubmission = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await getSubmissionById(id);

            setSubmission(response);
            setValues(response.form_data || {});

        } catch (error) {
            console.log("Submission View Error:", error);
            setError("Could not load this submission.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id && open) {
            fetchSubmission();
        }
        if (!open) {
            // reset so nothing stale shows next time it opens
            setSubmission(null);
            setEditMode(false);
            setValues({});
            setError(null);
        }
    }, [id, open]);

    const editableFields = useMemo(
        () => getEditableFields(submission?.form_schema, submission?.form_data),
        [submission]
    );

    const handleEditClick = () => {
        setValues(submission.form_data || {});
        setEditMode(true);
    };

    const handleCancelEdit = () => {
        setValues(submission.form_data || {});
        setEditMode(false);
        setError(null);
    };

    const handleFieldChange = (fieldId, value) => {
        setValues((prev) => ({ ...prev, [fieldId]: value }));
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setError(null);

            await updateSubmission(id, { form_data: values });

            setSubmission((prev) => ({ ...prev, form_data: values }));
            setEditMode(false);

        } catch (error) {
            console.log("Submission Save Error:", error);
            setError("Could not save changes. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    return (

        <Dialog open={open} onClose={close} fullWidth maxWidth="md">

            <DialogTitle>
                {editMode ? "Edit Submission" : "Submission Details"}
            </DialogTitle>

            <DialogContent>

                {loading ? (

                    <Box display="flex" justifyContent="center" p={4}>
                        <CircularProgress />
                    </Box>

                ) : submission && (

                    <>

                        {error && (
                            <Alert severity="error" sx={{ mb: 2 }}>
                                {error}
                            </Alert>
                        )}

                        {/* Patient Details */}

                        <Typography variant="h6" mb={2}>
                            Patient Information
                        </Typography>

                        <Box mb={2}>
                            <Typography>
                                <b>Name:</b>{" "}
                                {submission.client_name || "N/A"}
                            </Typography>

                            <Typography>
                                <b>Email:</b>{" "}
                                {submission.email || "N/A"}
                            </Typography>

                            <Typography>
                                <b>Phone:</b>{" "}
                                {submission.mobile || submission.phone || "N/A"}
                            </Typography>
                        </Box>

                        <Divider sx={{ my: 2 }} />

                        {/* Form Details */}

                        <Typography variant="h6" mb={2}>
                            Form Details
                        </Typography>

                        <Typography>
                            <b>Form Name:</b> {submission.form_name}
                        </Typography>

                        <Typography>
                            <b>Form Type:</b> {submission.form_type}
                        </Typography>

                        <Divider sx={{ my: 2 }} />

                        {/* Submitted Fields — read-only OR editable */}

                        <Typography variant="h6" mb={2}>
                            Submitted Data
                        </Typography>

                        {editMode ? (

                            <Box>
                                {editableFields.map((field) => (
                                    <TextField
                                        key={field.id}
                                        fullWidth
                                        label={field.label}
                                        value={values[field.id] ?? ""}
                                        onChange={(e) =>
                                            handleFieldChange(field.id, e.target.value)
                                        }
                                        sx={{ mb: 2 }}
                                    />
                                ))}
                            </Box>

                        ) : (

                            <Box>
                                {submission.form_data &&
                                    Object.entries(submission.form_data).map(
                                        ([key, value]) => (
                                            <Box
                                                key={key}
                                                sx={{
                                                    display: "flex",
                                                    mb: 1,
                                                    p: 1,
                                                    borderBottom: "1px solid #eee"
                                                }}
                                            >
                                                <Typography
                                                    sx={{ width: "35%", fontWeight: 600 }}
                                                >
                                                    {key}
                                                </Typography>

                                                <Typography>
                                                    {value !== null && value !== undefined
                                                        ? String(value)
                                                        : "-"}
                                                </Typography>
                                            </Box>
                                        )
                                    )}
                            </Box>

                        )}

                    </>

                )}

            </DialogContent>

            <DialogActions>

                {editMode ? (
                    <>
                        <Button onClick={handleCancelEdit} disabled={saving}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            variant="contained"
                            disabled={saving}
                        >
                            {saving ? "Saving..." : "Save Changes"}
                        </Button>
                    </>
                ) : (
                    <>
                        <Button onClick={close}>
                            Close
                        </Button>
                        <Button
                            onClick={handleEditClick}
                            variant="contained"
                            disabled={loading || !submission}
                        >
                            Edit
                        </Button>
                    </>
                )}

            </DialogActions>

        </Dialog>

    );

};

export default SubmissionView;