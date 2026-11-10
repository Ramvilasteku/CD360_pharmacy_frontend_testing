import React, { useEffect, useState } from "react";
import {
  Modal,
  Box,
  Typography,
  TextField,
  MenuItem,
  Checkbox,
  FormControlLabel,
  IconButton,
  Button,
  Divider,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddIcon from "@mui/icons-material/Add";

/*
  WHY THIS CHANGED:
  The previous version rendered plain <div className="field-editor-overlay">
  / <div className="field-editor-card"> with no matching CSS anywhere in the
  project (every other component here is styled via MUI's `sx` prop, not a
  stylesheet). Without that CSS, the "overlay" and "card" never actually
  became a floating modal — they rendered as a plain unstyled block exactly
  where <FieldEditor /> sits in FormBuilder's JSX tree, i.e. at the very
  bottom of the page, under the whole form. That's why adding a new option
  looked like it was showing up "under the entire form section" instead of
  as a popup over the specific field being edited.

  This version uses MUI's <Modal> (a real fixed-position, centered overlay
  with its own backdrop) so the editor now floats above the page like a
  proper modal, regardless of which field/section it was opened for. No
  state/data logic changed — same fieldData shape, same onSave/onClose
  contract.
*/

const cardSx = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: { xs: "92%", sm: 480 },
  maxHeight: "88vh",
  overflowY: "auto",
  backgroundColor: "#fff",
  borderRadius: "18px",
  boxShadow: "0 8px 40px rgba(0,0,0,0.25)",
  p: 3,
};

const fieldSx = { mb: 2 };

const FieldEditor = ({ field, onSave, onClose }) => {
  const [fieldData, setFieldData] = useState({
    name: "",
    label: "",
    type: "text",
    required: false,
    options: [],
    placeholder: "",
    description: "",
    readOnly: false,
    patientEditable: true,
    doctorOnly: false,
  });

  useEffect(() => {
    if (field) {
      setFieldData({
        name: field.name || "",
        label: field.label || "",
        type: field.type || "text",
        required: field.required || false,
        options: field.options || [],
        placeholder: field.placeholder || "",
        description: field.description || "",
        readOnly: field.readOnly || false,
        patientEditable: field.patientEditable ?? true,
        doctorOnly: field.doctorOnly || false,
      });
    }
  }, [field]);

  const handleChange = (key, value) => {
    setFieldData({ ...fieldData, [key]: value });
  };

  const addOption = () => {
    setFieldData({ ...fieldData, options: [...fieldData.options, "New Option"] });
  };

  const updateOption = (index, value) => {
    const updated = [...fieldData.options];
    updated[index] = value;
    setFieldData({ ...fieldData, options: updated });
  };

  const deleteOption = (index) => {
    const updated = [...fieldData.options];
    updated.splice(index, 1);
    setFieldData({ ...fieldData, options: updated });
  };

  const saveField = () => {
    onSave(fieldData);
  };

  if (!field) {
    return null;
  }

  const showOptions =
    fieldData.type === "radio" ||
    fieldData.type === "checkbox" ||
    fieldData.type === "select";

  return (
    <Modal open onClose={onClose}>
      <Box sx={cardSx}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: "#274850", mb: 2.5 }}>
          Edit Field
        </Typography>

        <TextField
          fullWidth
          size="small"
          label="Field Name"
          value={fieldData.name}
          onChange={(e) => handleChange("name", e.target.value)}
          sx={fieldSx}
        />

        <TextField
          fullWidth
          size="small"
          label="Field Label"
          value={fieldData.label}
          onChange={(e) => handleChange("label", e.target.value)}
          sx={fieldSx}
        />

        <TextField
          fullWidth
          size="small"
          label="Placeholder"
          value={fieldData.placeholder}
          onChange={(e) => handleChange("placeholder", e.target.value)}
          sx={fieldSx}
        />

        <TextField
          fullWidth
          size="small"
          multiline
          minRows={2}
          label="Description"
          value={fieldData.description}
          onChange={(e) => handleChange("description", e.target.value)}
          sx={fieldSx}
        />

        <TextField
          select
          fullWidth
          size="small"
          label="Field Type"
          value={fieldData.type}
          onChange={(e) => handleChange("type", e.target.value)}
          sx={fieldSx}
        >
          <MenuItem value="text">Text</MenuItem>
          <MenuItem value="number">Number</MenuItem>
          <MenuItem value="date">Date</MenuItem>
          <MenuItem value="textarea">Text Area</MenuItem>
          <MenuItem value="radio">Radio</MenuItem>
          <MenuItem value="checkbox">Checkbox</MenuItem>
          <MenuItem value="select">Dropdown</MenuItem>
          <MenuItem value="paragraph">Paragraph</MenuItem>
          <MenuItem value="signature">Signature</MenuItem>
          <MenuItem value="yes_no">Yes / No</MenuItem>
          <MenuItem value="file">File Upload</MenuItem>
          <MenuItem value="table">Table</MenuItem>
        </TextField>

        <FormControlLabel
          sx={fieldSx}
          control={
            <Checkbox
              checked={fieldData.required}
              onChange={(e) => handleChange("required", e.target.checked)}
            />
          }
          label="Required Field"
        />

        {showOptions && (
          <Box
            sx={{
              backgroundColor: "#fafcfc",
              border: "1px solid #eef2f3",
              borderRadius: "12px",
              p: 2,
              mb: 2,
            }}
          >
            <Typography sx={{ fontWeight: 700, fontSize: 14, color: "#274850", mb: 1.5 }}>
              Options
            </Typography>

            {fieldData.options.map((option, index) => (
              <Box
                key={index}
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
              >
                <TextField
                  fullWidth
                  size="small"
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                />
                <IconButton size="small" onClick={() => deleteOption(index)} sx={{ color: "#c0392b" }}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}

            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={addOption}
              sx={{ textTransform: "none", fontWeight: 600, color: "#3f6f7a" }}
            >
              Add Option
            </Button>
          </Box>
        )}

        <FormControlLabel
          sx={fieldSx}
          control={
            <Checkbox
              checked={fieldData.doctorOnly}
              onChange={(e) => handleChange("doctorOnly", e.target.checked)}
            />
          }
          label="Doctor Only Field"
        />

        <FormControlLabel
          sx={fieldSx}
          control={
            <Checkbox
              checked={fieldData.readOnly}
              onChange={(e) => handleChange("readOnly", e.target.checked)}
            />
          }
          label="Read Only Field"
        />

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1.5 }}>
          <Button onClick={onClose} sx={{ textTransform: "none", color: "#7c8a8d" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={saveField}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              borderRadius: "999px",
              bgcolor: "#3f6f7a",
              boxShadow: "none",
              "&:hover": { bgcolor: "#2c4e56", boxShadow: "none" },
            }}
          >
            Save Field
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default FieldEditor;