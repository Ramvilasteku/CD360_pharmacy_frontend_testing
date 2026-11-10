import React, { useState } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  Button,
  IconButton,
  TextField,
  MenuItem,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";

import FieldEditor from "./FieldEditor";

/* Shared styling for the plain <select>/<input> elements */
const inputSx = {
  width: "100%",
  boxSizing: "border-box",
  fontFamily: "inherit",
  fontSize: 14,
  color: "#274850",
  backgroundColor: "#fafcfc",
  border: "1px solid #e3eaeb",
  borderRadius: "10px",
  px: 1.5,
  py: 1,
  outline: "none",
  "&:focus": {
    borderColor: "#3f6f7a",
    backgroundColor: "#fff",
  },
};

const dashedButtonSx = {
  textTransform: "none",
  fontWeight: 600,
  fontSize: 13.5,
  color: "#3f6f7a",
  border: "1.5px dashed #c7d2d4",
  borderRadius: "10px",
  backgroundColor: "#fafcfc",
  py: 1,
  "&:hover": {
    borderColor: "#3f6f7a",
    backgroundColor: "rgba(63,111,122,0.05)",
  },
};

const fieldTypeOptions = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "textarea", label: "Text Area" },
  { value: "radio", label: "Radio" },
  { value: "checkbox", label: "Checkbox" },
  { value: "select", label: "Dropdown" },
  { value: "yes_no", label: "Yes / No" },
  { value: "signature", label: "Signature" },
  { value: "paragraph", label: "Paragraph" },
  { value: "table", label: "Table" },
];

const formTypeOptions = [
  { value: "registration", label: "Registration" },
  { value: "consultation", label: "Consultation" },
  { value: "consent", label: "Consent" },
  { value: "treatment", label: "Treatment" },
];

/*
  WHAT CHANGED (this pass):

  FieldEditor.jsx already supported full field editing — options for
  radio/checkbox/select, placeholder, description, doctorOnly,
  readOnly, required — but it was never actually wired up here. The
  inline row only exposed label + type, so anything needing options
  (e.g. Gender: Male/Female) had nowhere to be entered, and never made
  it into the schema that gets saved to forms.form_schema.

  Now each field row has an [Edit] button that opens FieldEditor with
  that field's current data. Saving from the editor merges the FULL
  field object (including options, doctorOnly, etc.) back into schema
  state at the same section/field index, so it's included the next
  time "Save form" / "Save changes" fires.

  The inline label/type controls are kept for quick renames, since
  editing every field through the modal for a simple label tweak is
  unnecessary friction — both paths update the same schema state.
*/

const FormBuilder = ({
  schema,
  setSchema,
  mode = "create",          // "create" | "edit"
  formId = null,             // required when mode === "edit"
  templateId = null,         // used when mode === "create"
  initialFormName = "",
  initialFormType = "registration",
  onSaved,                    // callback(response.data) after a successful save
}) => {
  const [formName, setFormName] = useState(initialFormName || schema?.title || "");
  const [formType, setFormType] = useState(initialFormType || "registration");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Which field is currently open in the FieldEditor modal, if any.
  // { sectionIndex, fieldIndex, field } | null
  const [editingField, setEditingField] = useState(null);

  /* ============================ UPDATE FIELD ============================ */
  const updateField = (sectionIndex, fieldIndex, key, value) => {
    const updated = { ...schema };
    updated.sections[sectionIndex].fields[fieldIndex][key] = value;
    setSchema(updated);
  };

  /* ============================ UPDATE SECTION TITLE ============================ */
  const updateSectionTitle = (sectionIndex, value) => {
    const updated = { ...schema };
    updated.sections[sectionIndex].title = value;
    setSchema(updated);
  };

  /* ============================ DELETE FIELD ============================ */
  const deleteField = (sectionIndex, fieldIndex) => {
    const updated = { ...schema };
    updated.sections[sectionIndex].fields.splice(fieldIndex, 1);
    setSchema(updated);
  };

  /* ============================ ADD NEW FIELD ============================ */
  const addField = (sectionIndex) => {
    const updated = { ...schema };
    updated.sections[sectionIndex].fields.push({
      name: `new_field_${Date.now()}`,
      label: "New Field",
      type: "text",
      required: false,
      options: [],
    });
    setSchema(updated);
  };

  /* ============================ ADD NEW SECTION ============================ */
  const addSection = () => {
    const updated = { ...schema };
    updated.sections.push({
      title: "New Section",
      fields: [],
    });
    setSchema(updated);
  };

  /* ============================ OPEN / SAVE / CLOSE FIELD EDITOR ============================ */
  const openFieldEditor = (sectionIndex, fieldIndex) => {
    setEditingField({
      sectionIndex,
      fieldIndex,
      field: schema.sections[sectionIndex].fields[fieldIndex],
    });
  };

  const closeFieldEditor = () => {
    setEditingField(null);
  };

  const saveFieldFromEditor = (fieldData) => {
    if (!editingField) return;

    const { sectionIndex, fieldIndex } = editingField;
    const updated = { ...schema };
    // Replace the whole field object so options/doctorOnly/etc. are all persisted
    updated.sections[sectionIndex].fields[fieldIndex] = fieldData;
    setSchema(updated);
    setEditingField(null);
  };

  /* ============================ SAVE FORM ============================ */
  const saveForm = async () => {
    try {
      setSaving(true);
      setErrorMsg("");

      const API = process.env.REACT_APP_FORM_MODULE_API_URL;

      let response;

      if (mode === "edit" && formId) {

        // Only this one form's row is touched — its schema, its fields.
        response = await axios.put(
          `${API}/form-management/update/${formId}`,
          {
            form_schema: schema,
            form_name: formName,
          },
          { withCredentials: true }
        );

      } else {

        response = await axios.post(
          `${API}/form-management/create`,
          {
            template_id: templateId,
            form_name: formName,
            form_type: formType,
            form_schema: schema,
          },
          { withCredentials: true }
        );

      }

      onSaved?.(response.data);

    } catch (error) {
      console.log("Save Form Error:", error);
      setErrorMsg(error.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box
      className="form-builder"
      sx={{ width: "100%", maxWidth: 720, mx: "auto", px: { xs: 2, sm: 0 } }}
    >
      <Typography
        variant="h5"
        sx={{ fontWeight: 700, color: "#274850", mb: 2.5 }}
      >
        {mode === "edit" ? "Edit Form" : "Dynamic Form Builder"}
      </Typography>

      {/* Form meta card */}
      <Box
        sx={{
          backgroundColor: "#fff",
          borderRadius: "20px",
          boxShadow: "0 2px 16px rgba(63,111,122,0.08)",
          p: { xs: 2.5, sm: 3 },
          mb: 3,
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          gap: 2,
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Typography
            sx={{ fontSize: 12.5, fontWeight: 600, color: "#7c8a8d", mb: 0.75 }}
          >
            Form Name
          </Typography>
          <Box
            component="input"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="e.g. Patient Registration"
            sx={inputSx}
          />
        </Box>

        <Box sx={{ flex: 1 }}>
          <Typography
            sx={{ fontSize: 12.5, fontWeight: 600, color: "#7c8a8d", mb: 0.75 }}
          >
            Form Type
          </Typography>
          <Box
            component="select"
            value={formType}
            onChange={(e) => setFormType(e.target.value)}
            disabled={mode === "edit"}
            sx={inputSx}
          >
            {formTypeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Box>
        </Box>
      </Box>

      {/* Sections */}
      {schema?.sections?.map((section, sectionIndex) => (
        <Box
          key={sectionIndex}
          className="section-card"
          sx={{
            backgroundColor: "#fff",
            borderRadius: "18px",
            boxShadow: "0 2px 12px rgba(63,111,122,0.06)",
            p: { xs: 2, sm: 2.5 },
            mb: 2.5,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 2 }}>
            <Box
              sx={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                backgroundColor: "rgba(63,111,122,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#3f6f7a" }}>
                {sectionIndex + 1}
              </Typography>
            </Box>

            <Box
              component="input"
              value={section.title}
              onChange={(e) => updateSectionTitle(sectionIndex, e.target.value)}
              placeholder="Section title"
              sx={{
                ...inputSx,
                fontWeight: 700,
                fontSize: 15,
                border: "none",
                backgroundColor: "transparent",
                px: 0.5,
                "&:focus": {
                  backgroundColor: "#fafcfc",
                  border: "1px solid #e3eaeb",
                  px: 1.5,
                },
              }}
            />
          </Box>

          {/* Field rows */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 1.25,
              pl: { xs: 0, sm: 4.5 },
            }}
          >
            {section.fields.map((field, fieldIndex) => (
              <Box
                key={fieldIndex}
                className="field-row"
                sx={{
                  display: "flex",
                  flexDirection: { xs: "column", sm: "row" },
                  alignItems: { xs: "stretch", sm: "center" },
                  gap: 1,
                  backgroundColor: "#fafcfc",
                  border: "1px solid #eef2f3",
                  borderRadius: "12px",
                  p: 1.25,
                }}
              >
                <Box
                  component="input"
                  value={field.label}
                  onChange={(e) =>
                    updateField(sectionIndex, fieldIndex, "label", e.target.value)
                  }
                  placeholder="Field label"
                  sx={{ ...inputSx, flex: 2, backgroundColor: "#fff" }}
                />

                <Box
                  component="select"
                  value={field.type}
                  onChange={(e) =>
                    updateField(sectionIndex, fieldIndex, "type", e.target.value)
                  }
                  sx={{ ...inputSx, flex: 1, minWidth: { sm: 140 }, backgroundColor: "#fff" }}
                >
                  {fieldTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Box>

                {(field.type === "radio" ||
                  field.type === "checkbox" ||
                  field.type === "select") && (
                  <Typography
                    sx={{
                      fontSize: 12,
                      color: field.options?.length ? "#3f6f7a" : "#c0392b",
                      whiteSpace: "nowrap",
                      px: 0.5,
                    }}
                  >
                    {field.options?.length
                      ? `${field.options.length} option${field.options.length === 1 ? "" : "s"}`
                      : "No options set"}
                  </Typography>
                )}

                <IconButton
                  size="small"
                  onClick={() => openFieldEditor(sectionIndex, fieldIndex)}
                  sx={{
                    alignSelf: { xs: "flex-end", sm: "center" },
                    color: "#3f6f7a",
                    "&:hover": { backgroundColor: "rgba(63,111,122,0.08)" },
                  }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>

                <IconButton
                  size="small"
                  onClick={() => deleteField(sectionIndex, fieldIndex)}
                  sx={{
                    alignSelf: { xs: "flex-end", sm: "center" },
                    color: "#c0392b",
                    "&:hover": { backgroundColor: "rgba(192,57,43,0.08)" },
                  }}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}

            <Button
              startIcon={<AddIcon />}
              onClick={() => addField(sectionIndex)}
              sx={{ ...dashedButtonSx, alignSelf: "flex-start", px: 2 }}
            >
              Add field
            </Button>
          </Box>
        </Box>
      ))}

      <Button
        fullWidth
        startIcon={<AddIcon />}
        onClick={addSection}
        sx={{ ...dashedButtonSx, py: 1.4, mb: 3 }}
      >
        Add section
      </Button>

      {errorMsg && (
        <Typography sx={{ color: "#c0392b", fontSize: 13.5, mb: 2 }}>
          {errorMsg}
        </Typography>
      )}

      {/* Save bar */}
      <Box
        sx={{
          position: { xs: "sticky", sm: "static" },
          bottom: 0,
          backgroundColor: { xs: "#f7f5f5", sm: "transparent" },
          py: { xs: 1.5, sm: 0 },
        }}
      >
        <Button
          fullWidth
          variant="contained"
          disabled={saving}
          onClick={saveForm}
          startIcon={<LocalHospitalIcon sx={{ fontSize: 18 }} />}
          sx={{
            textTransform: "none",
            fontWeight: 700,
            borderRadius: "999px",
            py: 1.3,
            bgcolor: "#3f6f7a",
            boxShadow: "none",
            "&:hover": { bgcolor: "#2c4e56", boxShadow: "none" },
            "&.Mui-disabled": {
              bgcolor: "#e3eaeb",
              color: "#b0bcbe",
            },
          }}
        >
          {saving
            ? "Saving…"
            : mode === "edit"
            ? "Save changes"
            : "Save form"}
        </Button>
      </Box>

      {/* Full field editor modal — options, placeholder, description,
          doctorOnly, readOnly, required, etc. */}
      {editingField && (
        <FieldEditor
          field={editingField.field}
          onSave={saveFieldFromEditor}
          onClose={closeFieldEditor}
        />
      )}
    </Box>
  );
};

export default FormBuilder;