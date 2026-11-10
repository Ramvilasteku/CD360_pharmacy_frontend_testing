/*
====================================================================
FormWorkspaceDialog.jsx

Preview and Edit now open in a centered popup instead of replacing the
page. One dialog serves both — the toggle in the header switches
between them without reloading — so the Edit and Preview icons in the
forms list just decide which tab it opens on.

  <FormWorkspaceDialog
      open
      formId={12}                 // existing form
      initialTab="preview"        // "edit" | "preview"
      close={...}
      onSaved={...}
  />

  <FormWorkspaceDialog
      open
      seed={{ schema, templateId, formName, formType }}   // brand new form
      initialTab="edit"
      close={...}
      onSaved={...}
  />

Notes on the behaviour:
- Centered on tablet and desktop; full-screen on phones, where a
  centered dialog with 16px of page behind it is just a worse
  full-screen dialog. The close button is in the header either way.
- Closing mid-edit asks first. The old page-based flow lost unsaved
  field changes silently when you hit Back, and a dialog makes that
  even easier to do by accident (backdrop click, Esc).
- The form fetch lives here rather than in the parent, so opening the
  dialog is the only thing the parent has to do.
====================================================================
*/

import React, { useEffect, useState } from "react";
import axios from "axios";

import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Box,
    Stack,
    Typography,
    IconButton,
    Button,
    ToggleButton,
    ToggleButtonGroup,
    CircularProgress,
    Alert,
    useMediaQuery,
    useTheme
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";

import FormBuilder from "./FormBuilder";
import FormPreview from "./FormPreview";

import { T } from "./Formtheme";

const API = process.env.REACT_APP_FORM_MODULE_API_URL;

const FormWorkspaceDialog = ({
    open,
    close,
    formId = null,
    seed = null,
    initialTab = "edit",
    onSaved
}) => {

    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

    const [tab, setTab] = useState(initialTab);
    const [schema, setSchema] = useState(null);
    const [meta, setMeta] = useState(null);
    const [baseline, setBaseline] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!open) {
            setSchema(null);
            setMeta(null);
            setBaseline("");
            setError("");
            return;
        }

        setTab(initialTab);

        // brand new form handed in from the template selector
        if (!formId && seed) {
            setSchema(seed.schema);
            setMeta({
                mode: "create",
                formId: null,
                templateId: seed.templateId ?? null,
                formName: seed.formName || seed.schema?.title || "",
                formType: seed.formType || "registration"
            });
            setBaseline(JSON.stringify(seed.schema ?? null));
            return;
        }

        if (!formId) return;

        let cancelled = false;

        (async () => {
            try {
                setLoading(true);
                setError("");

                const res = await axios.get(`${API}/form-management/form/${formId}`, {
                    withCredentials: true
                });

                if (cancelled) return;

                setSchema(res.data.form_schema);
                setMeta({
                    mode: "edit",
                    formId: res.data.id,
                    templateId: null,
                    formName: res.data.form_name,
                    formType: res.data.form_type
                });
                setBaseline(JSON.stringify(res.data.form_schema ?? null));

            } catch (err) {
                console.log("Load Form Error:", err);
                if (!cancelled) setError("Failed to load that form.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, formId, initialTab]);

    const dirty = schema !== null && JSON.stringify(schema) !== baseline;

    const requestClose = () => {
        if (
            dirty &&
            !window.confirm("Close without saving? Your field changes will be lost.")
        ) {
            return;
        }
        close();
    };

    const handleSaved = () => {
        setBaseline(JSON.stringify(schema));  // saved, so no longer dirty
        if (onSaved) onSaved();
        close();
    };

    return (
        <Dialog
            open={open}
            onClose={requestClose}
            fullWidth
            maxWidth="md"
            fullScreen={fullScreen}
            scroll="paper"
            PaperProps={{
                sx: {
                    borderRadius: fullScreen ? 0 : "16px",
                    // leave air above and below so the popup reads as centered
                    maxHeight: fullScreen ? "100%" : "calc(100% - 64px)"
                }
            }}
        >
            <DialogTitle
                sx={{ p: { xs: 2, sm: 2.5 }, borderBottom: `1px solid ${T.line}` }}
            >
                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1.5}
                    alignItems={{ xs: "stretch", sm: "center" }}
                    justifyContent="space-between"
                >
                    <Stack
                        direction="row"
                        alignItems="flex-start"
                        justifyContent="space-between"
                        sx={{ minWidth: 0 }}
                    >
                        <Box sx={{ minWidth: 0 }}>
                            <Typography
                                noWrap
                                title={meta?.formName}
                                sx={{ fontWeight: 700, color: T.ink, fontSize: 18 }}
                            >
                                {meta?.formName || "Form"}
                            </Typography>
                            <Typography variant="caption" sx={{ color: T.muted }}>
                                {meta?.mode === "create"
                                    ? "New form — not saved yet"
                                    : tab === "preview"
                                        ? "Preview — how the form appears to a patient"
                                        : "Editing fields"}
                                {dirty && " · unsaved changes"}
                            </Typography>
                        </Box>

                        {/* close stays beside the title on xs so it is always
                            top-right of the sheet */}
                        <IconButton
                            onClick={requestClose}
                            aria-label="Close"
                            sx={{ display: { sm: "none" }, ml: 1, color: T.muted }}
                        >
                            <CloseIcon />
                        </IconButton>
                    </Stack>

                    <Stack direction="row" spacing={1} alignItems="center">
                        <ToggleButtonGroup
                            exclusive
                            size="small"
                            value={tab}
                            onChange={(e, next) => next && setTab(next)}
                            sx={{
                                flex: { xs: 1, sm: "none" },
                                "& .MuiToggleButton-root": {
                                    flex: { xs: 1, sm: "none" },
                                    textTransform: "none",
                                    fontWeight: 600,
                                    px: 2,
                                    py: 0.6,
                                    color: T.brand,
                                    borderColor: T.line,
                                    "&.Mui-selected": {
                                        bgcolor: T.brand,
                                        color: "#fff",
                                        "&:hover": { bgcolor: T.brandDark }
                                    }
                                }
                            }}
                        >
                            <ToggleButton value="edit">
                                <EditOutlinedIcon fontSize="small" sx={{ mr: 0.75 }} />
                                Edit
                            </ToggleButton>
                            <ToggleButton value="preview">
                                <VisibilityOutlinedIcon fontSize="small" sx={{ mr: 0.75 }} />
                                Preview
                            </ToggleButton>
                        </ToggleButtonGroup>

                        <IconButton
                            onClick={requestClose}
                            aria-label="Close"
                            sx={{ display: { xs: "none", sm: "inline-flex" }, color: T.muted }}
                        >
                            <CloseIcon />
                        </IconButton>
                    </Stack>
                </Stack>
            </DialogTitle>

            <DialogContent dividers sx={{ p: { xs: 2, sm: 3 }, bgcolor: T.page }}>

                {loading ? (
                    <Box display="flex" justifyContent="center" p={6}>
                        <CircularProgress />
                    </Box>
                ) : error ? (
                    <Alert severity="error">{error}</Alert>
                ) : schema ? (
                    <Box sx={{ maxWidth: 720, mx: "auto" }}>
                        {tab === "edit" ? (
                            <FormBuilder
                                schema={schema}
                                setSchema={setSchema}
                                mode={meta.mode}
                                formId={meta.formId}
                                templateId={meta.templateId}
                                initialFormName={meta.formName}
                                initialFormType={meta.formType}
                                onSaved={handleSaved}
                            />
                        ) : (
                            <FormPreview schema={schema} />
                        )}
                    </Box>
                ) : null}

            </DialogContent>

            <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: 1.5 }}>
                <Button
                    onClick={requestClose}
                    sx={{ textTransform: "none", fontWeight: 600, color: T.muted }}
                >
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default FormWorkspaceDialog;