/*
====================================================================
SubmissionEditForm.jsx

Opens a submission as the ORIGINAL form, prefilled with whatever the
patient answered, so a receptionist can complete the fields that were
left blank and save.

Replaces both the old SubmissionEditform.js and the edit half of
SubmissionView.jsx. Use `readOnly` to get the view-only dialog from
the same component, so there is one renderer instead of two that
drift apart.

    <SubmissionEditForm id={id} open={open} close={close} onSaved={reload} />
    <SubmissionEditForm id={id} open={open} close={close} readOnly />

WHAT THIS FIXES
---------------
- Every field defined in form_schema is rendered, answered or not.
  The old code built its field list from Object.keys(form_data), so
  blank optional fields could never appear.
- Fields are keyed by `name` (your schemas have no `id`), so prefill
  actually works.
- `checkbox` with options is a multi-select group, not one boolean.
- yes_no, paragraph, signature, table and file all render as
  themselves instead of collapsing to a text box.
- Identity fields (full_name, phone, email, address, gender, dob) are
  shown but locked: submitForm() stores those in `clients`, so writing
  them into form_data would create a second copy that silently
  disagrees with the patient record and with the PDF.

The section headers show how many fields are still unanswered, and
"Show unanswered only" filters to exactly the work left to do.
====================================================================
*/

import React, { useEffect, useMemo, useState } from "react";

import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Button,
    Typography,
    Box,
    Chip,
    Stack,
    Divider,
    CircularProgress,
    TextField,
    FormControlLabel,
    FormControl,
    FormLabel,
    Checkbox,
    RadioGroup,
    Radio,
    MenuItem,
    IconButton,
    Switch,
    Alert,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell
} from "@mui/material";

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddIcon from "@mui/icons-material/Add";
import LockIcon from "@mui/icons-material/Lock";

import { getSubmissionById, updateSubmission } from "./formManagementApi";

import {
    normalizeSchema,
    buildInitialValues,
    buildSavePayload,
    countUnanswered,
    isEmptyValue
} from "./SubmissionSchema";

const EMPTY_SX = {
    borderLeft: "3px solid",
    borderColor: "warning.main",
    pl: 1.5,
    borderRadius: 0
};

const SubmissionEditForm = ({ id, open, close, onSaved, readOnly = false }) => {

    const [submission, setSubmission] = useState(null);
    const [values, setValues] = useState({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [onlyUnanswered, setOnlyUnanswered] = useState(false);

    useEffect(() => {
        if (!open) {
            setSubmission(null);
            setValues({});
            setError(null);
            setOnlyUnanswered(false);
            return;
        }

        if (!id) return;

        let cancelled = false;

        (async () => {
            try {
                setLoading(true);
                setError(null);

                const response = await getSubmissionById(id);
                if (cancelled) return;

                const sections = normalizeSchema(response.form_schema, response.form_data);

                setSubmission(response);
                setValues(buildInitialValues(sections, response.form_data, response));

            } catch (err) {
                console.log("Submission Edit Fetch Error:", err);
                if (!cancelled) setError("Could not load this submission.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [id, open]);

    const sections = useMemo(
        () => (submission ? normalizeSchema(submission.form_schema, submission.form_data) : []),
        [submission]
    );

    const unanswered = useMemo(
        () => (sections.length ? countUnanswered(sections, values) : 0),
        [sections, values]
    );

    const setFieldValue = (key, value) =>
        setValues((prev) => ({ ...prev, [key]: value }));

    const toggleInGroup = (key, option, checked) =>
        setValues((prev) => {
            const current = Array.isArray(prev[key]) ? prev[key] : [];
            return {
                ...prev,
                [key]: checked
                    ? [...current, option]
                    : current.filter((o) => o !== option)
            };
        });

    const setCell = (key, rowIndex, column, cellValue) =>
        setValues((prev) => {
            const rows = Array.isArray(prev[key]) ? [...prev[key]] : [];
            rows[rowIndex] = { ...(rows[rowIndex] || {}), [column]: cellValue };
            return { ...prev, [key]: rows };
        });

    const addRow = (key) =>
        setValues((prev) => ({
            ...prev,
            [key]: [...(Array.isArray(prev[key]) ? prev[key] : []), {}]
        }));

    const removeRow = (key, rowIndex) =>
        setValues((prev) => ({
            ...prev,
            [key]: (Array.isArray(prev[key]) ? prev[key] : []).filter((_, i) => i !== rowIndex)
        }));

    const handleSave = async () => {
        try {
            setSaving(true);
            setError(null);

            const payload = buildSavePayload(sections, values, submission.form_data);

            await updateSubmission(id, { form_data: payload });

            setSubmission((prev) => ({ ...prev, form_data: payload }));

            if (onSaved) onSaved();
            close();

        } catch (err) {
            console.log("Submission Save Error:", err);
            setError("Could not save changes. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    /* ------------------------------ fields ------------------------------ */

    const renderControl = (field) => {
        const value = values[field.key];
        const disabled = readOnly || Boolean(field.clientColumn);
        const common = {
            fullWidth: true,
            size: "small",
            disabled,
            label: field.label,
            helperText: field.hint || undefined,
            value: value ?? "",
            onChange: (e) => setFieldValue(field.key, e.target.value)
        };

        switch (field.control) {

            case "paragraph":
                return (
                    <Box sx={{ bgcolor: "action.hover", p: 1.5, borderRadius: 1 }}>
                        {field.label && field.label !== field.text && (
                            <Typography fontWeight={500} mb={0.5}>
                                {field.label}
                            </Typography>
                        )}
                        <Typography variant="body2" color="text.secondary">
                            {field.text}
                        </Typography>
                    </Box>
                );

            case "textarea":
                return <TextField {...common} multiline minRows={3} />;

            case "number":
                return <TextField {...common} type="number" />;

            case "date":
                return <TextField {...common} type="date" InputLabelProps={{ shrink: true }} />;

            case "select":
                return (
                    <TextField {...common} select>
                        {field.options.map((opt) => (
                            <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                        ))}
                    </TextField>
                );

            case "radio":
            case "yes-no": {
                const options = field.control === "yes-no" ? ["Yes", "No"] : field.options;
                return (
                    <FormControl disabled={disabled}>
                        <FormLabel sx={{ fontSize: 14, fontWeight: 500 }}>
                            {field.label}
                        </FormLabel>
                        {field.hint && (
                            <Typography variant="caption" color="text.secondary">
                                {field.hint}
                            </Typography>
                        )}
                        <RadioGroup
                            row={options.length <= 4}
                            value={value ?? ""}
                            onChange={(e) => setFieldValue(field.key, e.target.value)}
                        >
                            {options.map((opt) => (
                                <FormControlLabel
                                    key={opt}
                                    value={opt}
                                    control={<Radio size="small" />}
                                    label={opt}
                                />
                            ))}
                        </RadioGroup>
                    </FormControl>
                );
            }

            case "checkbox-group":
                return (
                    <FormControl disabled={disabled}>
                        <FormLabel sx={{ fontSize: 14, fontWeight: 500 }}>
                            {field.label}
                        </FormLabel>
                        {field.hint && (
                            <Typography variant="caption" color="text.secondary">
                                {field.hint}
                            </Typography>
                        )}
                        <Box display="flex" flexWrap="wrap" columnGap={2}>
                            {field.options.map((opt) => (
                                <FormControlLabel
                                    key={opt}
                                    control={
                                        <Checkbox
                                            size="small"
                                            checked={Array.isArray(value) && value.includes(opt)}
                                            onChange={(e) =>
                                                toggleInGroup(field.key, opt, e.target.checked)
                                            }
                                        />
                                    }
                                    label={opt}
                                />
                            ))}
                        </Box>
                    </FormControl>
                );

            case "boolean":
                return (
                    <FormControlLabel
                        disabled={disabled}
                        control={
                            <Checkbox
                                size="small"
                                checked={Boolean(value)}
                                onChange={(e) => setFieldValue(field.key, e.target.checked)}
                            />
                        }
                        label={field.label}
                    />
                );

            case "signature": {
                const isImage = typeof value === "string" && value.startsWith("data:image/");
                return (
                    <Box>
                        <FormLabel sx={{ fontSize: 14, fontWeight: 500 }}>
                            {field.label}
                        </FormLabel>
                        {isImage ? (
                            <Box mt={1}>
                                <img
                                    src={value}
                                    alt="signature"
                                    style={{ maxHeight: 60, border: "1px solid #ddd", borderRadius: 4 }}
                                />
                                {!disabled && (
                                    <Button
                                        size="small"
                                        onClick={() => setFieldValue(field.key, "")}
                                        sx={{ ml: 1 }}
                                    >
                                        Clear
                                    </Button>
                                )}
                            </Box>
                        ) : (
                            <TextField
                                {...common}
                                label="Signed by (typed name)"
                                sx={{ mt: 1 }}
                            />
                        )}
                    </Box>
                );
            }

            case "file":
                return (
                    <TextField
                        {...common}
                        label={`${field.label} (stored path)`}
                    />
                );

            case "table": {
                const columns = field.columns.length ? field.columns : ["Value"];
                const rows = Array.isArray(value) ? value : [];
                return (
                    <Box>
                        <FormLabel sx={{ fontSize: 14, fontWeight: 500 }}>
                            {field.label}
                        </FormLabel>
                        <Table size="small" sx={{ mt: 1 }}>
                            <TableHead>
                                <TableRow>
                                    {columns.map((c) => (
                                        <TableCell key={c}>{c}</TableCell>
                                    ))}
                                    {!disabled && <TableCell width={48} />}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {rows.map((row, rowIndex) => (
                                    <TableRow key={rowIndex}>
                                        {columns.map((c) => (
                                            <TableCell key={c}>
                                                <TextField
                                                    size="small"
                                                    variant="standard"
                                                    disabled={disabled}
                                                    value={row?.[c] ?? ""}
                                                    onChange={(e) =>
                                                        setCell(field.key, rowIndex, c, e.target.value)
                                                    }
                                                />
                                            </TableCell>
                                        ))}
                                        {!disabled && (
                                            <TableCell>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => removeRow(field.key, rowIndex)}
                                                >
                                                    <DeleteOutlineIcon fontSize="small" />
                                                </IconButton>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        {!disabled && (
                            <Button
                                size="small"
                                startIcon={<AddIcon />}
                                onClick={() => addRow(field.key)}
                            >
                                Add row
                            </Button>
                        )}
                    </Box>
                );
            }

            default:
                return <TextField {...common} />;
        }
    };

    const renderField = (field) => {
        const empty = field.control !== "paragraph" && isEmptyValue(values[field.key]);
        const flagged = empty && !field.clientColumn;

        if (onlyUnanswered && !flagged) return null;

        return (
            <Box key={field.key} mb={2} sx={flagged ? EMPTY_SX : undefined}>
                {renderControl(field)}

                <Stack direction="row" spacing={0.5} mt={0.5}>
                    {flagged && (
                        <Chip
                            size="small"
                            label={field.required ? "Required — not answered" : "Not answered"}
                            color={field.required ? "warning" : "default"}
                            variant="outlined"
                        />
                    )}
                    {field.clientColumn && (
                        <Chip
                            size="small"
                            icon={<LockIcon sx={{ fontSize: 14 }} />}
                            label="From patient record"
                            variant="outlined"
                        />
                    )}
                    {field.doctorOnly && (
                        <Chip size="small" label="Doctor only" variant="outlined" />
                    )}
                </Stack>
            </Box>
        );
    };

    /* ------------------------------ dialog ------------------------------ */

    return (
        <Dialog open={open} onClose={close} fullWidth maxWidth="md">

            <DialogTitle sx={{ pb: 1 }}>
                {readOnly ? "Submission" : "Complete submission"}
                {submission?.client_name ? ` — ${submission.client_name}` : ""}
                {submission && (
                    <Typography variant="body2" color="text.secondary">
                        {submission.form_name} · {submission.form_type}
                    </Typography>
                )}
            </DialogTitle>

            <DialogContent dividers>

                {loading ? (
                    <Box display="flex" justifyContent="center" p={4}>
                        <CircularProgress />
                    </Box>
                ) : submission ? (
                    <>
                        {error && (
                            <Alert severity="error" sx={{ mb: 2 }}>
                                {error}
                            </Alert>
                        )}

                        {!readOnly && (
                            <Stack
                                direction="row"
                                alignItems="center"
                                justifyContent="space-between"
                                mb={2}
                            >
                                <Typography variant="body2" color="text.secondary">
                                    {unanswered === 0
                                        ? "All fields answered."
                                        : `${unanswered} field${unanswered === 1 ? "" : "s"} still unanswered.`}
                                </Typography>

                                <FormControlLabel
                                    control={
                                        <Switch
                                            size="small"
                                            checked={onlyUnanswered}
                                            onChange={(e) => setOnlyUnanswered(e.target.checked)}
                                        />
                                    }
                                    label="Show unanswered only"
                                />
                            </Stack>
                        )}

                        <Divider sx={{ mb: 2 }} />

                        {sections.map((section, index) => {
                            const sectionEmpty = section.fields.filter(
                                (f) =>
                                    f.control !== "paragraph" &&
                                    !f.clientColumn &&
                                    isEmptyValue(values[f.key])
                            ).length;

                            const rendered = section.fields.map(renderField).filter(Boolean);
                            if (!rendered.length) return null;

                            return (
                                <Accordion key={index} defaultExpanded disableGutters>
                                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                        <Typography fontWeight={500} sx={{ flex: 1 }}>
                                            {section.title}
                                        </Typography>
                                        {sectionEmpty > 0 && (
                                            <Chip
                                                size="small"
                                                label={`${sectionEmpty} empty`}
                                                color="warning"
                                                variant="outlined"
                                            />
                                        )}
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        {section.description && (
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                                mb={2}
                                            >
                                                {section.description}
                                            </Typography>
                                        )}
                                        {rendered}
                                    </AccordionDetails>
                                </Accordion>
                            );
                        })}
                    </>
                ) : (
                    error && <Alert severity="error">{error}</Alert>
                )}

            </DialogContent>

            <DialogActions>
                <Button onClick={close} disabled={saving}>
                    {readOnly ? "Close" : "Cancel"}
                </Button>
                {!readOnly && (
                    <Button
                        onClick={handleSave}
                        variant="contained"
                        disabled={loading || saving || !submission}
                    >
                        {saving ? "Saving..." : "Save changes"}
                    </Button>
                )}
            </DialogActions>

        </Dialog>
    );
};

export default SubmissionEditForm;