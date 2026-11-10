import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Chip,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import DescriptionIcon from "@mui/icons-material/Description";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

import FormPreview from "./FormPreview";

const API = process.env.REACT_APP_FORM_MODULE_API_URL;

/*
  TemplateSelector

  Replaces the old PDF-upload-first flow: instead of the admin
  uploading a PDF every time they want to start a new form, this
  fetches every template already sitting in `form_templates`
  (GET /form-management/templates), lets the admin pick a form
  type from that list, and shows it read-only in FormPreview so
  they can see exactly what it looks like before doing anything
  with it.

  Once a template is selected, three actions are available:
    - Preview  -> just the read-only form view (default state)
    - Edit     -> hands the schema off to FormBuilder via
                  onUseTemplate, same contract PDFUpload used to
                  use, so the parent (FormManagement.jsx) doesn't
                  need to change how it opens the workspace.
    - Delete   -> removes the template from form_templates via
                  DELETE /form-management/templates/:id. This only
                  deletes the raw template — any form the admin
                  already created from it earlier is untouched,
                  since createForm copies the schema at creation
                  time rather than referencing the template live.
*/

const TemplateSelector = ({ onUseTemplate }) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [selected, setSelected] = useState(null); // full template incl. schema
  const [selecting, setSelecting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null); // template pending delete confirmation
  const [deleting, setDeleting] = useState(false);

  const getTemplates = async () => {
    try {
      setLoading(true);
      setErrorMsg("");

      const response = await axios.get(
        `${API}/form-management/templates`,
        { withCredentials: true }
      );

      setTemplates(response.data || []);
    } catch (error) {
      console.log("Template Fetch Error", error);
      setErrorMsg("Failed to load form templates.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getTemplates();
  }, []);

  const handleSelectType = async (templateSummary) => {
    try {
      setSelecting(true);
      setErrorMsg("");

      const response = await axios.get(
        `${API}/form-management/templates/${templateSummary.id}`,
        { withCredentials: true }
      );

      setSelected(response.data);
    } catch (error) {
      console.log("Template Load Error", error);
      setErrorMsg("Failed to load that template.");
    } finally {
      setSelecting(false);
    }
  };

  const clearSelection = () => setSelected(null);

  const handleEdit = () => {
    if (!selected) return;

    if (typeof onUseTemplate !== "function") {
      setErrorMsg(
        "This template couldn't be opened — onUseTemplate prop is missing."
      );
      return;
    }

    onUseTemplate({
      schema: selected.form_schema,
      templateId: selected.id,
      suggestedName: selected.template_name || selected.form_schema?.title,
    });
  };

  const confirmDelete = (templateSummary, e) => {
    e.stopPropagation();
    setDeleteTarget(templateSummary);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      setDeleting(true);

      await axios.delete(
        `${API}/form-management/templates/${deleteTarget.id}`,
        { withCredentials: true }
      );

      setTemplates((prev) => prev.filter((t) => t.id !== deleteTarget.id));

      if (selected && selected.id === deleteTarget.id) {
        setSelected(null);
      }
    } catch (error) {
      console.log("Template Delete Error", error);
      setErrorMsg("Failed to delete that template.");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  /* ============================================================
     SELECTED TEMPLATE -> FORM VIEW (read-only) + actions
  ============================================================ */
  if (selected) {
    return (
      <Box sx={{ width: "100%", maxWidth: 720, mx: "auto", px: { xs: 2, sm: 0 } }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 1.5,
            mb: 2,
          }}
        >
          <Button
            onClick={clearSelection}
            startIcon={<ArrowBackIcon fontSize="small" />}
            sx={{ textTransform: "none", color: "#3f6f7a", fontWeight: 600 }}
          >
            Back to form types
          </Button>

          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<VisibilityIcon fontSize="small" />}
              disabled
              sx={{
                textTransform: "none",
                fontWeight: 700,
                borderRadius: "999px",
                borderColor: "#3f6f7a",
                color: "#3f6f7a",
              }}
            >
              Previewing
            </Button>

            <Button
              variant="contained"
              startIcon={<EditIcon fontSize="small" />}
              onClick={handleEdit}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                borderRadius: "999px",
                bgcolor: "#3f6f7a",
                boxShadow: "none",
                "&:hover": { bgcolor: "#2c4e56", boxShadow: "none" },
              }}
            >
              Edit
            </Button>

            {/* <Tooltip title="Delete template">
              <IconButton
                onClick={(e) => confirmDelete(selected, e)}
                sx={{ color: "#c0392b", border: "1px solid #f0d3d0" }}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip> */}
          </Box>
        </Box>

        {errorMsg && (
          <Typography sx={{ color: "#c0392b", mb: 2 }}>{errorMsg}</Typography>
        )}

        <Box
          sx={{
            backgroundColor: "#fff",
            borderRadius: "20px",
            boxShadow: "0 2px 16px rgba(63,111,122,0.08)",
            p: { xs: 2.5, sm: 3.5 },
          }}
        >
          <FormPreview schema={selected.form_schema} />
        </Box>

        {renderDeleteDialog()}
      </Box>
    );
  }

  /* ============================================================
     FORM TYPE LIST
  ============================================================ */
  function renderDeleteDialog() {
    return (
      <Dialog open={Boolean(deleteTarget)} onClose={() => !deleting && setDeleteTarget(null)}>
        <DialogTitle sx={{ fontWeight: 700, color: "#274850" }}>
          Delete this template?
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: "#7c8a8d" }}>
            "{deleteTarget?.template_name}" will be permanently removed. Forms
            already created from it will not be affected.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setDeleteTarget(null)}
            disabled={deleting}
            sx={{ textTransform: "none", color: "#7c8a8d", fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            disabled={deleting}
            variant="contained"
            sx={{
              textTransform: "none",
              fontWeight: 700,
              borderRadius: "999px",
              bgcolor: "#c0392b",
              boxShadow: "none",
              "&:hover": { bgcolor: "#a5301f", boxShadow: "none" },
            }}
          >
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Box sx={{ width: "100%", maxWidth: 560, mx: "auto", px: { xs: 2, sm: 0 } }}>
      <Box sx={{ mb: 3, textAlign: { xs: "center", sm: "left" } }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: "#274850", mb: 0.5 }}>
          Choose a form type
        </Typography>
        <Typography variant="body2" sx={{ color: "#7c8a8d" }}>
          Pick from the form templates already detected for your clinic.
        </Typography>
      </Box>

      {loading && (
        <Typography sx={{ color: "#7c8a8d" }}>Loading form types…</Typography>
      )}

      {!loading && errorMsg && (
        <Typography sx={{ color: "#c0392b", mb: 2 }}>{errorMsg}</Typography>
      )}

      {!loading && !errorMsg && templates.length === 0 && (
        <Box
          sx={{
            backgroundColor: "#fff",
            borderRadius: "18px",
            boxShadow: "0 2px 12px rgba(63,111,122,0.06)",
            p: 4,
            textAlign: "center",
          }}
        >
          <DescriptionIcon sx={{ fontSize: 32, color: "#c7d2d4", mb: 1 }} />
          <Typography sx={{ color: "#7c8a8d" }}>
            No form templates yet. Upload a PDF elsewhere in the system to add one.
          </Typography>
        </Box>
      )}

      {templates.map((tpl) => (
        <Box
          key={tpl.id}
          onClick={() => !selecting && handleSelectType(tpl)}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#fff",
            borderRadius: "14px",
            boxShadow: "0 2px 12px rgba(63,111,122,0.06)",
            p: 2,
            mb: 1.5,
            gap: 1,
            cursor: selecting ? "default" : "pointer",
            transition: "box-shadow 0.15s ease",
            "&:hover": {
              boxShadow: selecting ? "0 2px 12px rgba(63,111,122,0.06)" : "0 4px 18px rgba(63,111,122,0.14)",
            },
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: "10px",
                backgroundColor: "rgba(63,111,122,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <DescriptionIcon sx={{ color: "#3f6f7a", fontSize: 20 }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography noWrap sx={{ fontWeight: 700, color: "#274850" }}>
                {tpl.template_name}
              </Typography>
              <Chip
                label={tpl.template_type}
                size="small"
                sx={{
                  mt: 0.5,
                  backgroundColor: "rgba(63,111,122,0.1)",
                  color: "#3f6f7a",
                  fontWeight: 600,
                  fontSize: 11,
                }}
              />
            </Box>
          </Box>

          <Box sx={{ display: "flex", gap: 0.5, flexShrink: 0 }}>
            <Tooltip title="Preview">
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectType(tpl);
                }}
                sx={{ color: "#3f6f7a" }}
              >
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {/* <Tooltip title="Delete template">
              <IconButton onClick={(e) => confirmDelete(tpl, e)} sx={{ color: "#c0392b" }}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip> */}
          </Box>
        </Box>
      ))}

      {renderDeleteDialog()}
    </Box>
  );
};

export default TemplateSelector;