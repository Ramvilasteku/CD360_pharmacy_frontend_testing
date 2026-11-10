import React, { useState, useRef } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  Button,
  IconButton,
  LinearProgress,
  Fade,
  Chip,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import CloseIcon from "@mui/icons-material/Close";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DescriptionIcon from "@mui/icons-material/Description";

const MAX_FILE_MB = 20;

const formatBytes = (bytes) => {
  if (!bytes) return "0 KB";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
};

/*
  WHAT CHANGED:
  The backend used to always respond with a single `schema` (always
  the same hardcoded Patient Registration one). It now responds with
  `templates: [...]` — one entry per form type it detected inside the
  uploaded PDF (a PDF like "Additional_Clinic_Forms.pdf" can contain
  several distinct forms at once).

  So instead of jumping straight into the builder, this component now
  shows a short "here's what we found" review list. The admin picks
  which detected form to open in the builder via `onUseTemplate` —
  each one becomes its own separate form, and nothing here overwrites
  an existing form.
*/

const PDFUpload = ({ onUseTemplate }) => {
  if (typeof onUseTemplate !== "function") {
    console.error(
      "PDFUpload: `onUseTemplate` prop is missing or not a function. " +
      "Make sure the parent renders <PDFUpload onUseTemplate={...} />."
    );
  }

  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isDragActive, setIsDragActive] = useState(false);
  const [detectedTemplates, setDetectedTemplates] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");
  const inputRef = useRef(null);

  const validateAndSetFile = (selected) => {
    setErrorMsg("");
    setDetectedTemplates(null);

    if (!selected) return;

    if (selected.type !== "application/pdf") {
      setErrorMsg("Only PDF files are supported.");
      return;
    }

    if (selected.size > MAX_FILE_MB * 1024 * 1024) {
      setErrorMsg(`File is too large. Max size is ${MAX_FILE_MB} MB.`);
      return;
    }

    setFile(selected);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragActive(false);
    const dropped = e.dataTransfer.files?.[0];
    validateAndSetFile(dropped);
  };

  const removeFile = () => {
    setFile(null);
    setErrorMsg("");
    setDetectedTemplates(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const uploadPDF = async () => {
    if (!file) {
      setErrorMsg("Please select a PDF file first.");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg("");

      const formData = new FormData();
      formData.append("pdf", file);

      const response = await axios.post(
        `${process.env.REACT_APP_FORM_MODULE_API_URL}/pdf-template/upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          withCredentials: true,
        }
      );

      setDetectedTemplates(response.data.templates || []);
      setStatusMessage(response.data.message || "");
    } catch (error) {
      console.log("PDF Upload Error:", error);
      setErrorMsg(
        error.response?.data?.message ||
          "PDF upload failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const suggestedNameFor = (tpl) =>
    detectedTemplates.length > 1 ? tpl.label : tpl.schema?.title || tpl.label;

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 560,
        mx: "auto",
        px: { xs: 2, sm: 0 },
      }}
    >
      <Box sx={{ mb: 3, textAlign: { xs: "center", sm: "left" } }}>
        <Typography
          variant="h5"
          sx={{ fontWeight: 700, color: "#274850", mb: 0.5 }}
        >
          Upload form template
        </Typography>
        <Typography variant="body2" sx={{ color: "#7c8a8d" }}>
          Upload a PDF and we'll read it to build a fillable form.
        </Typography>
      </Box>

      <Box
        sx={{
          backgroundColor: "#fff",
          borderRadius: "20px",
          boxShadow: "0 2px 16px rgba(63,111,122,0.08)",
          p: { xs: 2.5, sm: 3.5 },
        }}
      >
        {/* Dropzone */}
        <Box
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !file && inputRef.current?.click()}
          sx={{
            position: "relative",
            overflow: "hidden",
            borderRadius: "16px",
            border: "2px dashed",
            borderColor: isDragActive
              ? "#3f6f7a"
              : file
              ? "#5f9aa6"
              : "#d5dfe1",
            backgroundColor: isDragActive
              ? "rgba(63,111,122,0.06)"
              : "#fafcfc",
            transition: "all 0.2s ease",
            cursor: file ? "default" : "pointer",
            px: { xs: 2, sm: 4 },
            py: { xs: 4, sm: 5 },
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            "&:hover": !file && {
              borderColor: "#3f6f7a",
              backgroundColor: "rgba(63,111,122,0.04)",
            },
          }}
        >
          {loading && (
            <Box
              sx={{
                position: "absolute",
                left: 0,
                right: 0,
                height: "2px",
                background:
                  "linear-gradient(90deg, transparent, #3f6f7a, transparent)",
                animation: "scanSweep 1.4s ease-in-out infinite",
                "@keyframes scanSweep": {
                  "0%": { top: "8%" },
                  "50%": { top: "92%" },
                  "100%": { top: "8%" },
                },
              }}
            />
          )}

          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            hidden
            onChange={(e) => validateAndSetFile(e.target.files[0])}
          />

          {!file ? (
            <>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  backgroundColor: "rgba(63,111,122,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mb: 1.5,
                }}
              >
                <CloudUploadIcon sx={{ color: "#3f6f7a", fontSize: 28 }} />
              </Box>
              <Typography sx={{ fontWeight: 600, color: "#274850", mb: 0.5 }}>
                Drag and drop your PDF here
              </Typography>
              <Typography variant="body2" sx={{ color: "#9aa7a9", mb: 2 }}>
                or click to browse from your device
              </Typography>
              <Button
                variant="outlined"
                size="small"
                sx={{
                  textTransform: "none",
                  borderRadius: "999px",
                  borderColor: "#3f6f7a",
                  color: "#3f6f7a",
                  fontWeight: 600,
                  px: 2.5,
                  "&:hover": {
                    borderColor: "#2c4e56",
                    backgroundColor: "rgba(63,111,122,0.06)",
                  },
                }}
              >
                Choose file
              </Button>
              <Typography
                variant="caption"
                sx={{ color: "#b7c0c2", mt: 1.5, display: "block" }}
              >
                PDF only · up to {MAX_FILE_MB} MB
              </Typography>
            </>
          ) : (
            <Fade in={Boolean(file)}>
              <Box sx={{ width: "100%" }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    backgroundColor: "#fff",
                    border: "1px solid #e3eaeb",
                    borderRadius: "12px",
                    p: 1.5,
                    textAlign: "left",
                  }}
                >
                  <Box
                    sx={{
                      width: 42,
                      height: 42,
                      borderRadius: "10px",
                      backgroundColor: "rgba(63,111,122,0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <PictureAsPdfIcon sx={{ color: "#3f6f7a" }} />
                  </Box>

                  <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                    <Typography
                      noWrap
                      sx={{ fontWeight: 600, color: "#274850", fontSize: 14 }}
                    >
                      {file.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#9aa7a9" }}>
                      {formatBytes(file.size)}
                    </Typography>
                  </Box>

                  {!loading && (
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile();
                      }}
                      sx={{ color: "#9aa7a9" }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>

                {loading && (
                  <Box sx={{ mt: 2 }}>
                    <LinearProgress
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: "rgba(63,111,122,0.12)",
                        "& .MuiLinearProgress-bar": {
                          backgroundColor: "#3f6f7a",
                        },
                      }}
                    />
                    <Typography
                      variant="caption"
                      sx={{ color: "#7c8a8d", mt: 1, display: "block" }}
                    >
                      Reading document and detecting form type(s)…
                    </Typography>
                  </Box>
                )}
              </Box>
            </Fade>
          )}
        </Box>

        {/* Error message */}
        {errorMsg && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              mt: 2,
              px: 1.5,
              py: 1,
              borderRadius: "10px",
              backgroundColor: "#fdecea",
            }}
          >
            <ErrorOutlineIcon sx={{ color: "#c0392b", fontSize: 18 }} />
            <Typography variant="body2" sx={{ color: "#c0392b" }}>
              {errorMsg}
            </Typography>
          </Box>
        )}

        {/* Detected templates review list */}
        {detectedTemplates && detectedTemplates.length > 0 && (
          <Box sx={{ mt: 3 }}>
            {statusMessage && (
              <Typography
                variant="body2"
                sx={{ color: "#7c8a8d", mb: 1.5 }}
              >
                {statusMessage}
              </Typography>
            )}

            {detectedTemplates.map((tpl) => (
              <Box
                key={tpl.template_id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1,
                  border: "1px solid #e3eaeb",
                  borderRadius: "12px",
                  p: 1.5,
                  mb: 1.25,
                  backgroundColor: "#fafcfc",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0 }}>
                  <DescriptionIcon sx={{ color: "#3f6f7a", fontSize: 20, flexShrink: 0 }} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography noWrap sx={{ fontWeight: 600, color: "#274850", fontSize: 14 }}>
                      {tpl.label}
                    </Typography>
                    <Chip
                      label={tpl.matched ? "Detected" : "Not confidently detected"}
                      size="small"
                      icon={tpl.matched ? <CheckCircleIcon sx={{ fontSize: "14px !important" }} /> : undefined}
                      sx={{
                        mt: 0.25,
                        height: 20,
                        fontSize: 10.5,
                        fontWeight: 600,
                        backgroundColor: tpl.matched ? "rgba(63,111,122,0.1)" : "#fef3e6",
                        color: tpl.matched ? "#3f6f7a" : "#b5751b",
                      }}
                    />
                  </Box>
                </Box>

                <Button
                  size="small"
                  variant="contained"
                  onClick={() => {
                    if (typeof onUseTemplate !== "function") {
                      setErrorMsg(
                        "This form couldn't be opened — onUseTemplate prop is missing. " +
                        "Check how <PDFUpload /> is being rendered by its parent."
                      );
                      return;
                    }
                    onUseTemplate({
                      schema: tpl.schema,
                      templateId: tpl.template_id,
                      suggestedName: suggestedNameFor(tpl),
                    });
                  }}
                  sx={{
                    textTransform: "none",
                    fontWeight: 700,
                    borderRadius: "999px",
                    bgcolor: "#3f6f7a",
                    boxShadow: "none",
                    flexShrink: 0,
                    "&:hover": { bgcolor: "#2c4e56", boxShadow: "none" },
                  }}
                >
                  Create Form
                </Button>
              </Box>
            ))}
          </Box>
        )}

        {/* Actions */}
        {!detectedTemplates && (
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              gap: 1.5,
              mt: 3,
            }}
          >
            <Button
              fullWidth
              variant="contained"
              disabled={!file || loading}
              onClick={uploadPDF}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                borderRadius: "999px",
                py: 1.2,
                bgcolor: "#3f6f7a",
                boxShadow: "none",
                "&:hover": { bgcolor: "#2c4e56", boxShadow: "none" },
                "&.Mui-disabled": {
                  bgcolor: "#e3eaeb",
                  color: "#b0bcbe",
                },
              }}
            >
              {loading ? "Processing PDF…" : "Upload & detect form(s)"}
            </Button>

            {file && !loading && (
              <Button
                fullWidth
                variant="text"
                onClick={removeFile}
                sx={{
                  textTransform: "none",
                  fontWeight: 600,
                  color: "#7c8a8d",
                  borderRadius: "999px",
                  py: 1.2,
                  "&:hover": { backgroundColor: "rgba(63,111,122,0.06)" },
                }}
              >
                Choose a different file
              </Button>
            )}
          </Box>
        )}

        {detectedTemplates && (
          <Button
            fullWidth
            variant="text"
            onClick={removeFile}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              color: "#7c8a8d",
              borderRadius: "999px",
              py: 1.2,
              mt: 2,
              "&:hover": { backgroundColor: "rgba(63,111,122,0.06)" },
            }}
          >
            Upload another PDF
          </Button>
        )}
      </Box>
    </Box>
  );
};

export default PDFUpload;