import React from "react";
import { Box, Typography, Chip } from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import LockIcon from "@mui/icons-material/Lock";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import BorderColorIcon from "@mui/icons-material/BorderColor";
import UploadFileIcon from "@mui/icons-material/UploadFile";

/* Shared look for every disabled preview input */
const fieldSx = {
  width: "100%",
  boxSizing: "border-box",
  fontFamily: "inherit",
  fontSize: 14,
  color: "#274850",
  backgroundColor: "#fafcfc",
  border: "1px solid #e3eaeb",
  borderRadius: "10px",
  px: 1.5,
  py: 1.1,
  outline: "none",
  "&::placeholder": { color: "#b0bcbe" },
  "&:disabled": {
    cursor: "not-allowed",
    color: "#9aa7a9",
  },
};

const FormPreview = ({ schema }) => {
  if (!schema) {
    return null;
  }

  const renderField = (field) => {
    switch (field.type) {
      /* ========================= TEXT ========================= */
      case "text":
        return (
          <Box
            component="input"
            type="text"
            placeholder={field.placeholder || field.label}
            disabled
            sx={fieldSx}
          />
        );

      /* ========================= NUMBER ========================= */
      case "number":
        return (
          <Box
            component="input"
            type="number"
            placeholder={field.placeholder || field.label}
            disabled
            sx={fieldSx}
          />
        );

      /* ========================= DATE ========================= */
      case "date":
        return (
          <Box
            component="input"
            type="date"
            disabled
            sx={{ ...fieldSx, color: "#9aa7a9" }}
          />
        );

      /* ========================= TEXTAREA ========================= */
      case "textarea":
        return (
          <Box
            component="textarea"
            placeholder={field.placeholder || field.label}
            disabled
            rows={3}
            sx={{ ...fieldSx, resize: "none", fontFamily: "inherit" }}
          />
        );

      /* ========================= DROPDOWN ========================= */
      case "select":
        return (
          <Box component="select" disabled sx={fieldSx}>
            <option>Select {field.label}</option>
            {field.options?.map((option, index) => (
              <option key={index}>{option}</option>
            ))}
          </Box>
        );

      /* ========================= RADIO ========================= */
      case "radio":
        return (
          <Box
            className="radio-group"
            sx={{ display: "flex", flexDirection: "column", gap: 1 }}
          >
            {field.options?.map((option, index) => (
              <Box
                component="label"
                key={index}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  fontSize: 14,
                  color: "#3d4f52",
                }}
              >
                <Box
                  component="input"
                  type="radio"
                  disabled
                  sx={{ accentColor: "#3f6f7a" }}
                />
                {option}
              </Box>
            ))}
          </Box>
        );

      /* ========================= CHECKBOX ========================= */
      case "checkbox":
        return (
          <Box
            className="checkbox-group"
            sx={{ display: "flex", flexDirection: "column", gap: 1 }}
          >
            {field.options?.map((option, index) => (
              <Box
                component="label"
                key={index}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  fontSize: 14,
                  color: "#3d4f52",
                }}
              >
                <Box
                  component="input"
                  type="checkbox"
                  disabled
                  sx={{ accentColor: "#3f6f7a" }}
                />
                {option}
              </Box>
            ))}
          </Box>
        );

      /* ========================= YES / NO ========================= */
      case "yes_no":
        return (
          <Box sx={{ display: "flex", gap: 3 }}>
            <Box
              component="label"
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                fontSize: 14,
                color: "#3d4f52",
              }}
            >
              <Box
                component="input"
                type="radio"
                disabled
                sx={{ accentColor: "#3f6f7a" }}
              />
              Yes
            </Box>
            <Box
              component="label"
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                fontSize: 14,
                color: "#3d4f52",
              }}
            >
              <Box
                component="input"
                type="radio"
                disabled
                sx={{ accentColor: "#3f6f7a" }}
              />
              No
            </Box>
          </Box>
        );

      /* ========================= PARAGRAPH ========================= */
      case "paragraph":
        return (
          <Typography
            className="paragraph-field"
            sx={{
              fontSize: 13.5,
              color: "#5c6c6f",
              backgroundColor: "#f4f8f8",
              border: "1px solid #e3eaeb",
              borderRadius: "10px",
              p: 1.5,
              lineHeight: 1.6,
            }}
          >
            {field.description || field.label}
          </Typography>
        );

      /* ========================= SIGNATURE ========================= */
      case "signature":
        return (
          <Box
            className="signature-box"
            sx={{
              border: "1px dashed #c7d2d4",
              borderRadius: "12px",
              p: 2,
              backgroundColor: "#fafcfc",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                color: "#9aa7a9",
                fontSize: 12.5,
                mb: 1.5,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              <BorderColorIcon sx={{ fontSize: 14 }} />
              Signature
            </Box>
            <Box
              className="signature-line"
              sx={{
                borderBottom: "1.5px solid #c7d2d4",
                height: 32,
              }}
            />
          </Box>
        );

      /* ========================= TABLE (NEW) ========================= */
      case "table":
        return (
          <Box
            component="table"
            sx={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
              border: "1px solid #e3eaeb",
              borderRadius: "10px",
              overflow: "hidden",
            }}
          >
            <Box component="thead">
              <Box component="tr" sx={{ backgroundColor: "#f4f8f8" }}>
                {field.columns?.map((col, colIndex) => (
                  <Box
                    component="th"
                    key={colIndex}
                    sx={{
                      textAlign: "left",
                      p: 1,
                      fontWeight: 700,
                      color: "#3f6f7a",
                      borderBottom: "1px solid #e3eaeb",
                    }}
                  >
                    {col}
                  </Box>
                ))}
              </Box>
            </Box>
            <Box component="tbody">
              {[...Array(3)].map((_, rowIndex) => (
                <Box component="tr" key={rowIndex}>
                  {field.columns?.map((col, colIndex) => (
                    <Box
                      component="td"
                      key={colIndex}
                      sx={{ p: 1, borderBottom: "1px solid #eef2f3", color: "#b0bcbe" }}
                    >
                      &nbsp;
                    </Box>
                  ))}
                </Box>
              ))}
            </Box>
          </Box>
        );

      /* ========================= FILE UPLOAD ========================= */
      case "file":
        return (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              border: "1px dashed #c7d2d4",
              borderRadius: "10px",
              px: 1.5,
              py: 1.2,
              color: "#9aa7a9",
              fontSize: 13.5,
              backgroundColor: "#fafcfc",
            }}
          >
            <UploadFileIcon sx={{ fontSize: 18 }} />
            Attach file
          </Box>
        );

      /* ========================= DEFAULT TEXT ========================= */
      default:
        return (
          <Box
            component="input"
            type="text"
            placeholder={field.placeholder || field.label}
            disabled
            sx={fieldSx}
          />
        );
    }
  };

  return (
    <Box
      className="form-preview"
      sx={{ width: "100%", maxWidth: 640, mx: "auto", px: { xs: 2, sm: 0 } }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1,
          mb: 2,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700, color: "#274850" }}>
          Form Preview
        </Typography>

        <Chip
          icon={<VisibilityIcon sx={{ fontSize: 15 }} />}
          label="Preview only · not editable"
          size="small"
          sx={{
            backgroundColor: "rgba(63,111,122,0.1)",
            color: "#3f6f7a",
            fontWeight: 600,
            fontSize: 12,
            "& .MuiChip-icon": { color: "#3f6f7a" },
          }}
        />
      </Box>

      <Box
        className="preview-card"
        sx={{
          backgroundColor: "#fff",
          borderRadius: "20px",
          boxShadow: "0 2px 16px rgba(63,111,122,0.08)",
          p: { xs: 2.5, sm: 4 },
        }}
      >
        <Typography
          component="h1"
          sx={{
            fontSize: { xs: 20, sm: 24 },
            fontWeight: 700,
            color: "#1f3b41",
            mb: 3,
            pb: 2,
            borderBottom: "1px solid #eef2f3",
          }}
        >
          {schema.title || "Dynamic Form"}
        </Typography>

        {schema.sections?.map((section, sectionIndex) => (
          <Box
            key={sectionIndex}
            className="preview-section"
            sx={{
              mb: 4,
              "&:last-of-type": { mb: 0 },
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                mb: section.description ? 0.5 : 2,
              }}
            >
              <LocalHospitalIcon sx={{ fontSize: 16, color: "#5f9aa6" }} />
              <Typography
                component="h3"
                sx={{ fontSize: 15, fontWeight: 700, color: "#3f6f7a" }}
              >
                {section.title}
              </Typography>
            </Box>

            {section.description && (
              <Typography
                sx={{ fontSize: 13, color: "#9aa7a9", mb: 2 }}
              >
                {section.description}
              </Typography>
            )}

            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 2.25,
                pl: { xs: 0, sm: 3 },
                borderLeft: { xs: "none", sm: "2px solid #eef2f3" },
              }}
            >
              {section.fields?.map((field, fieldIndex) => (
                <Box key={fieldIndex} className="preview-field">
                  {field.type !== "paragraph" && (
                    <Box
                      component="label"
                      sx={{
                        display: "block",
                        fontSize: 13.5,
                        fontWeight: 600,
                        color: "#3d4f52",
                        mb: 0.5,
                      }}
                    >
                      {field.label}
                      {field.required && (
                        <Box
                          component="span"
                          className="required"
                          sx={{ color: "#c0392b", ml: 0.5 }}
                        >
                          *
                        </Box>
                      )}
                    </Box>
                  )}

                  {field.description && field.type !== "paragraph" && (
                    <Typography
                      component="small"
                      sx={{
                        display: "block",
                        fontSize: 12,
                        color: "#9aa7a9",
                        mb: 0.75,
                      }}
                    >
                      {field.description}
                    </Typography>
                  )}

                  {renderField(field)}

                  <Box
                    sx={{
                      display: "flex",
                      gap: 0.75,
                      mt: field.doctorOnly || field.readOnly ? 0.75 : 0,
                    }}
                  >
                    {field.doctorOnly && (
                      <Chip
                        className="doctor-tag"
                        label="Doctor only"
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: 11,
                          fontWeight: 600,
                          backgroundColor: "#fef3e6",
                          color: "#b5751b",
                        }}
                      />
                    )}

                    {field.readOnly && (
                      <Chip
                        className="readonly-tag"
                        icon={<LockIcon sx={{ fontSize: "12px !important" }} />}
                        label="Read only"
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: 11,
                          fontWeight: 600,
                          backgroundColor: "#eef2f3",
                          color: "#7c8a8d",
                          "& .MuiChip-icon": { color: "#7c8a8d" },
                        }}
                      />
                    )}
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        ))}

        <Box
          component="button"
          disabled
          sx={{
            width: "100%",
            mt: 1,
            py: 1.3,
            border: "none",
            borderRadius: "999px",
            fontWeight: 700,
            fontSize: 14,
            fontFamily: "inherit",
            backgroundColor: "#e3eaeb",
            color: "#b0bcbe",
            cursor: "not-allowed",
          }}
        >
          Submit
        </Box>
      </Box>
    </Box>
  );
};

export default FormPreview;