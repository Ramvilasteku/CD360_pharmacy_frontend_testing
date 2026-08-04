import React, { useEffect, useState } from "react";
import api from "./services/api";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Chip,
  Alert,
  CircularProgress,
  TextField,
  Divider,
  Stack,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
} from "@mui/material";
import { Autocomplete } from "@mui/material";
import FolderIcon from "@mui/icons-material/Folder";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DownloadIcon from "@mui/icons-material/Download";
import FilterListIcon from "@mui/icons-material/FilterList";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Tooltip from "@mui/material/Tooltip";
import CloseIcon from "@mui/icons-material/Close";
import DialogActions from "@mui/material/DialogActions";
import Skeleton from "@mui/material/Skeleton";

function Documents() {
  const [clients, setClients] = useState([]);
  const [activeClient, setActiveClient] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [viewDocUrl, setViewDocUrl] = useState("");
  const [docLoading, setDocLoading] = useState(false);
  const [uploadedDate, setUploadedDate] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [selectedClientForUpload, setSelectedClientForUpload] = useState("");
  const [openViewer, setOpenViewer] = useState(false);
  const [openUploadModal, setOpenUploadModal] = useState(false);
  const [accessDialogOpen, setAccessDialogOpen] = useState(false);
  const [accessDoc, setAccessDoc] = useState(null);
  const [accessStatus, setAccessStatus] = useState("none");
  const [requestingAccess, setRequestingAccess] = useState(false);
  const [otpDialogOpen, setOtpDialogOpen] = useState(false);
  const [otp, setOtp] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpDoc, setOtpDoc] = useState(null);
  const [pendingAction, setPendingAction] = useState(null); // "view" | "download"
  const [otpSendingSkeleton, setOtpSendingSkeleton] = useState(false);
 

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoadingClients(true);
    try {
      const res = await api.get("/api/staff/clients");
      setClients(res.data.data || []);
    } catch {
      setError("Failed to fetch clients");
    } finally {
      setLoadingClients(false);
    }
  };

  const fetchClientDocuments = async (clientId) => {
    setLoadingDocs(true);
    try {
      const res = await api.get("/api/documents/staff/all");
      const clientData = res.data.find((c) => c.client_id === clientId);
      setDocuments(clientData?.documents || []);
    } catch {
      setError("Failed to fetch documents");
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleViewClient = (client) => {
    setActiveClient(client);
    setRoleFilter("all");
    fetchClientDocuments(client.id);
  };

  const handleBack = () => {
    setActiveClient(null);
    setDocuments([]);
    setSelectedFile(null);
    setRoleFilter("all");
    setViewDocUrl("");
    setUploadedDate("");
    setDoctorName("");
  };

  const checkAccess = async (doc) => {
  
  try {
    const res = await api.get(`/api/documents/access-status/${doc.id}`);
    if (res.data.status === "approved") return true;
    setAccessDoc(doc);
    setAccessStatus(res.data.status);
    setAccessDialogOpen(true);
    return false;
  } catch {
    setError("Failed to check access status");
    return false;
  }
  };

    const handleRequestAccess = async () => {
      if (!accessDoc) return;
      try {
        setRequestingAccess(true);
        const res = await api.post(`/api/documents/request-access/${accessDoc.id}`);
        setAccessStatus(res.data.status || "pending");
        setSuccess(res.data.message);
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to request access");
      } finally {
        setRequestingAccess(false);
      }
    };


  const handleUploadFromMainPage = async () => {
    if (!selectedFile || !selectedClientForUpload) {
      setError("Please select both client and file");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("client_id", selectedClientForUpload);

    try {
      setUploadLoading(true);
      setError("");
      setSuccess("");
      await api.post("/api/documents/upload", formData);
      setSuccess("Document uploaded successfully");

      // Hide success message after 30 seconds
      setTimeout(() => setSuccess(""), 10000);

      setSelectedFile(null);
      setSelectedClientForUpload("");
      setOpenUploadModal(false);
      fetchClients();
    } catch {
      setError("Upload failed");
    } finally {
      setUploadLoading(false);
    }
  };

  const handleUploadFromDocView = async () => {
    if (!selectedFile || !activeClient) {
      setError("Client and file are required");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("client_id", activeClient.id);

    try {
      setUploadLoading(true);
      setError("");
      setSuccess("");
      await api.post("/api/documents/upload", formData);
      setSuccess("Uploaded successfully");

      // Hide success message after 30 seconds
      setTimeout(() => setSuccess(""), 10000);

      setSelectedFile(null);
      setUploadedDate("");
      setDoctorName("");
      setOpenUploadModal(false);
      fetchClientDocuments(activeClient.id);
    } catch {
      setError("Upload failed");
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm("Delete this document?")) return;
    try {
      await api.delete(`/api/documents/staff/${docId}`);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      setSuccess("Document deleted");
    } catch {
      setError("You can only delete your uploaded documents");
    }
  };

 

  const getRoleColor = (role) => {
    switch (role?.toLowerCase()) {
      case "admin":
        return "error";
      case "doctor":
        return "secondary";
      case "receptionist":
        return "warning";
      case "staff":
        return "primary";
      default:
        return "success";
    }
  };

  const filteredDocuments = documents.filter((doc) => {
    if (roleFilter === "all") return true;
    return doc.uploaded_by_role?.toLowerCase() === roleFilter.toLowerCase();
  });

  const UploadSectionMainPage = () => (
    <Box
      sx={{
        borderRadius: 3,
        p: 4,
        textAlign: "center",
        minHeight: 200,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        position: "fixed",
      }}
    >
      <Box sx={{ border: "2px dashed #5A9BA5", borderRadius: 3, p: 1, width: 240, height: 150 }}>
        <FolderIcon sx={{ fontSize: 45, color: "#5A9BA5" }} />
        <Typography fontSize="0.95rem" color="text.secondary" mb={0}>
          Drop your documents or,
        </Typography>
        <Button
          component="label"
          sx={{
            textTransform: "none",
            color: "#5A9BA5",
            fontWeight: 600,
            fontSize: "0.95rem",
            textDecoration: "underline",
            mb: 3,
            "&:hover": { bgcolor: "transparent", textDecoration: "underline" },
          }}
        >
          Click to browse
          <input type="file" hidden onChange={(e) => setSelectedFile(e.target.files[0])} />
        </Button>
      </Box>

      <Divider sx={{ width: "100%", my: 2, backgroundColor: "#5A9BA5", height: 2 }} />

      <Stack spacing={1} width="80%" maxHeight="100vh" sx={{ backgroundColor: "none" }}>
        {/* SEARCHABLE PATIENT DROPDOWN */}
        <Autocomplete
          options={clients}
          getOptionLabel={(option) => `CI - ${option.id} (${option.name})`}
          value={clients.find(c => c.id === selectedClientForUpload) || null}
          onChange={(event, newValue) => setSelectedClientForUpload(newValue?.id || "")}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Select Patient"
              size="small"
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 0,
                  borderBottom: "2px solid #5A9BA5",
                  "& fieldset": { border: "none" },
                },
              }}
            />
          )}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          clearOnEscape
        />

        {/* File Name */}
        <TextField
          placeholder="File Name"
          size="small"
          disabled
          value={selectedFile?.name || "File Name"}
          InputProps={{ sx: { "& input": { textAlign: "center" } } }}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 0,
              borderBottom: "2px solid #5A9BA5",
              "& fieldset": { border: "none" },
            },
          }}
        />

        {/* Upload Button */}
        <Button
          variant="contained"
          fullWidth
          onClick={handleUploadFromMainPage}
          disabled={uploadLoading || !selectedFile || !selectedClientForUpload}
          sx={{
            bgcolor: "#5A9BA5",
            textTransform: "lowercase",
            borderRadius: 2,
            py: 0.5,
            fontSize: "0.95rem",
            "&:hover": { bgcolor: "#4A8A94" },
            "&:disabled": { bgcolor: "#B0BEC5" },
          }}
        >
          {uploadLoading ? <CircularProgress size={24} color="inherit" /> : "upload file"}
        </Button>
      </Stack>
    </Box>
  );


  const UploadSectionDocView = () => (
    <Box
      sx={{
        border: "2px dashed #5A9BA5",
        borderRadius: 3,
        p: 4,
        textAlign: "center",
        minHeight: 200,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <FolderIcon sx={{ fontSize: 80, color: "#5A9BA5", mb: 1 }} />

      <Typography fontSize="0.95rem" color="text.secondary" mb={1}>
        Drop your documents or,
      </Typography>

      <Button
        component="label"
        sx={{
          textTransform: "none",
          color: "#5A9BA5",
          fontWeight: 600,
          fontSize: "0.95rem",
          textDecoration: "underline",
          mb: 3,
          "&:hover": {
            bgcolor: "transparent",
            textDecoration: "underline",
          },
        }}
      >
        Click to browse
        <input
          type="file"
          hidden
          onChange={(e) => setSelectedFile(e.target.files[0])}
        />
      </Button>

      <Divider sx={{ width: "100%", mb: 3, height: "100vh" }} />

      <Stack spacing={2.5} width="100%">
        <TextField
          placeholder="Client ID"
          size="small"
          fullWidth
          disabled
          value={activeClient?.id ? `CI - ${activeClient.id}` : "Client ID"}
          InputProps={{
            sx: {
              bgcolor: "white",
              "& input": { textAlign: "center" },
            },
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 0,
              borderBottom: "2px solid #5A9BA5",
              "& fieldset": { border: "none" },
            },
          }}
        />

        <TextField
          placeholder="File Name"
          size="small"
          fullWidth
          disabled
          value={selectedFile?.name || "File Name"}
          InputProps={{
            sx: {
              bgcolor: "white",
              "& input": { textAlign: "center" },
            },
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 0,
              borderBottom: "2px solid #5A9BA5",
              "& fieldset": { border: "none" },
            },
          }}
        />

        <Button
          variant="contained"
          fullWidth
          onClick={handleUploadFromDocView}
          disabled={uploadLoading || !selectedFile}
          sx={{
            bgcolor: "#5A9BA5",
            textTransform: "lowercase",
            borderRadius: 2,
            py: 1.2,
            fontSize: "0.95rem",
            "&:hover": {
              bgcolor: "#4A8A94",
            },
            "&:disabled": {
              bgcolor: "#B0BEC5",
            },
          }}
        >
          {uploadLoading ? <CircularProgress size={24} color="inherit" /> : "upload file"}
        </Button>
      </Stack>
    </Box>
  );


 


const verifyOtp = async () => {
  if (!otpDoc) {
    setError("Document not selected");
    return;
  }
  try {
    setVerifyingOtp(true);
    await api.post("/api/documents/verify-otp", {
      documentId: otpDoc.id,
      otp,
    });
    setOtpDialogOpen(false);

    if (pendingAction === "view") {
      await fetchAndShowDocument(otpDoc);
    } else if (pendingAction === "download") {
      await downloadDocument(otpDoc);
    }
  } catch (err) {
    setError(err?.response?.data?.message || "OTP verification failed");
  } finally {
    setVerifyingOtp(false);
    setPendingAction(null);
  }
};


const fetchAndShowDocument = async (doc) => {
  try {
    setDocLoading(true);
      const res = await api.get(`/api/documents/view-safe/${doc.id}`, {
      responseType: "blob",
    });

    const contentType = res.headers["content-type"];

    const blob = new Blob(
      [res.data],
      {
        type: contentType
      }
    );

    const url = URL.createObjectURL(blob);

    setViewDocUrl(url);

    setOpenViewer(true);
  } catch (err) {
    if (err.response?.data instanceof Blob) {
      const text = await err.response.data.text();
      try {
        setError(JSON.parse(text).message);
      } catch {
        setError("Failed to load document");
      }
    } else {
      setError(err.response?.data?.message || "Failed to load document");
    }
  } finally {
    setDocLoading(false);
  }
};

const downloadDocument = async (doc) => {
  try {
    const res = await api.get(`/api/documents/download-safe/${doc.id}`, {
      responseType: "blob",
    });
    const url = window.URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.file_name;
    a.click();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    if (err.response?.data instanceof Blob) {
      const text = await err.response.data.text();
      try {
        setError(JSON.parse(text).message);
      } catch {
        setError("Download failed");
      }
    } else {
      setError(err.response?.data?.message || "Download failed");
    }
  }
};


const checkOtpStatusAndProceed = async (doc, action) => {
  try {
    const res = await api.get(`/api/documents/otp-status/${doc.id}`);

    if (res.data.status === "verified") {
      // still within the verified access window — skip OTP entirely
      if (action === "view") {
        await fetchAndShowDocument(doc);
      } else if (action === "download") {
        await downloadDocument(doc);
      }
      return;
    }
  } catch {
    // if the status check fails, fall through to normal OTP flow
  }

  sendOtp(doc, action);
};

const handleView = (doc) => {
  checkOtpStatusAndProceed(doc, "view");   // CHANGED: was sendOtp(doc, "view")
};

const handleDownload = (doc) => {
  checkOtpStatusAndProceed(doc, "download");   // CHANGED: was sendOtp(doc, "download")
};


const sendOtp = async (doc, action) => {
  try {
    setSendingOtp(true);

    // show skeleton loader
    setOtpSendingSkeleton(true);

    const res = await api.post(`/api/documents/send-otp/${doc.id}`);


    // Already verified - no OTP required
    if (res.data.alreadyVerified) {

      setOtpSendingSkeleton(false);

      if (action === "view") {
        await fetchAndShowDocument(doc);
      } 
      else if (action === "download") {
        await downloadDocument(doc);
      }

      return;
    }


    // OTP sent successfully
    setOtpSendingSkeleton(false);


    // Open OTP popup
    setOtpDoc(doc);
    setPendingAction(action);
    setOtp("");

    setOtpDialogOpen(true);

    setSuccess(res.data.message);


  } catch (err) {

    setOtpSendingSkeleton(false);

    setError(
      err?.response?.data?.message || "Failed to send OTP"
    );

  } finally {

    setSendingOtp(false);

  }
};


  return (
    <Box sx={{ bgcolor: "#F5F5F5", maxHeight: "100vh", overflow: "hidden" }}>
      <Box px={3} pb={1}>
        {error && (
          <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" onClose={() => setSuccess("")} sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {/* ================= CLIENT LIST VIEW WITH UPLOAD ================= */}
        {!activeClient && (
          <>
            {/* Search Card */}
            <Box
              sx={{
                bgcolor: "#5A9BA5",
                borderRadius: 4,
                p: 2,
                mb: 2,
                maxWidth: 600,
                color: "white",
                borderTopRightRadius: 80,
              }}
            >
              <Grid
                container
                spacing={2}
                alignItems="center"
              >
                {/* LEFT COLUMN - TEXT */}
                <Grid item xs={12} md={6}>
                  <Typography fontWeight={700} fontSize="1.1rem" mb={0.5}>
                    Enter Client ID
                  </Typography>
                  <Typography fontSize="0.9rem" sx={{ opacity: 0.9 }}>
                    To View The Documents
                  </Typography>
                </Grid>

                {/* RIGHT COLUMN - SEARCH */}
                <Grid item xs={12} md={6} display="flex" justifyContent="flex-end">
                  <TextField
                    placeholder="Search"
                    size="small"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    sx={{
                      bgcolor: "white",
                      borderRadius: 2,
                      width: { xs: "100%", md: 280 },
                      "& .MuiOutlinedInput-root fieldset": {
                        border: "none",
                      },
                    }}
                  />
                </Grid>
              </Grid>
            </Box>


            {/* Mobile Upload Button */}
            <Button
              variant="contained"
              fullWidth
              sx={{
                display: { xs: "flex", lg: "none" },
                mb: 3,
                bgcolor: "#5A9BA5",
                textTransform: "none",
                borderRadius: 2,
                py: 1.5,
                mt: { xs: 5, md: 2 },
                "&:hover": { bgcolor: "#4A8A94" },
              }}
              onClick={() => setOpenUploadModal(true)}
            >
              Upload Document
            </Button>

            <Grid container spacing={3} sx={{ flexWrap: "nowrap" }}>
              {/* LEFT SIDE — CLIENT CARDS */}
              <Grid item xs={12} md={6} lg={5} xl={5}>
                <Box
                  sx={{
                    maxHeight: { xs: "calc(100vh - 280px)", lg: "calc(100vh - 280px)" },
                    overflowY: "auto",
                    pr: 1,
                    "&::-webkit-scrollbar": {
                      width: "8px",
                    },
                    "&::-webkit-scrollbar-track": {
                      background: "#f1f1f1",
                      borderRadius: "10px",
                    },
                    "&::-webkit-scrollbar-thumb": {
                      background: "#5A9BA5",
                      borderRadius: "10px",
                    },
                  }}
                >
                  {loadingClients ? (
                    <Box display="flex" justifyContent="center" mt={2}>
                      <CircularProgress sx={{ color: "#5A9BA5" }} />
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: {
                          xs: "1fr",        // mobile → 1 card
                          sm: "repeat(2, 1fr)", // tablet → 2 cards
                          md: "repeat(3, 1fr)", // laptop → 2 cards
                          lg: "repeat(3, 1fr)", // desktop → 2 cards
                          xl: "repeat(4, 1fr)", // ultra-wide → still 2
                        },
                        gap: 2,
                      }}
                    >
                      {clients
                        .filter((c) =>
                          c.name.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .map((client) => (
                          <Card
                            key={client.id}
                            sx={{
                              borderRadius: 3,
                              height: 200,
                              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                              transition: "transform 0.2s, box-shadow 0.2s",
                              "&:hover": {
                                transform: "translateY(-4px)",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                              },
                            }}
                          >
                            <CardContent>
                              <Box
                                sx={{
                                  bgcolor: "#D9ECEE",
                                  borderRadius: 2,
                                  p: 2,
                                  display: "flex",
                                  justifyContent: "center",
                                  mb: 2,
                                }}
                              >
                                <FolderIcon sx={{ fontSize: 40, color: "#5A9BA5" }} />
                              </Box>

                              <Typography fontSize="0.9rem" mb={0.5}>
                                Patient ID :{" "}
                                <span style={{ color: "#5A9BA5", fontWeight: 600 }}>
                                  CI - {client.id}
                                </span>
                              </Typography>

                              <Typography fontSize="0.9rem" mb={0.5}>
                                Patient Name :{" "}
                                <span style={{ color: "#5A9BA5", fontWeight: 600 }}>
                                  {client.name}
                                </span>
                              </Typography>

                              <Button
                                fullWidth
                                variant="contained"
                                onClick={() => handleViewClient(client)}
                                sx={{
                                  bgcolor: "#5A9BA5",
                                  textTransform: "none",
                                  borderRadius: 2,
                                  py: 0.5,
                                  fontSize: "0.9rem",
                                  "&:hover": {
                                    bgcolor: "#4A8A94",
                                  },
                                }}
                              >
                                View Documents
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                    </Box>

                  )}
                </Box>
              </Grid>

              {/* DIVIDER */}
              <Grid item sx={{ display: { xs: "none", lg: "block" } }}>
                <Box sx={{ width: 3, height: "100%", backgroundColor: "#437986" }} />
              </Grid>

              {/* RIGHT SIDE — UPLOAD SECTION */}
              {/* RIGHT SIDE — UPLOAD SECTION */}
              <Grid item xs={12} md={6} lg={6} sx={{ display: { xs: "none", lg: "block" } }}>
                <Box
                  sx={{
                    position: "sticky",
                    top: 20,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  }}
                >
                  <UploadSectionMainPage />
                </Box>
              </Grid>

            </Grid>



            {/* UPLOAD MODAL (Mobile - Homepage) */}
            <Dialog
              open={openUploadModal}
              onClose={() => setOpenUploadModal(false)}
              maxWidth="sm"
              fullWidth
              sx={{ display: { xs: "block", lg: "none" } }}
            >
              <IconButton
                aria-label="close"
                onClick={() => setOpenUploadModal(false)}
                sx={{
                  position: "absolute",
                  right: 8,
                  top: 8,
                }}
              >
                <CloseIcon />
              </IconButton>
              <DialogTitle>Upload Document</DialogTitle>
              <DialogContent>
                <UploadSectionMainPage />
              </DialogContent>
            </Dialog>
          </>
        )}

        {/* ================= DOCUMENT VIEW WITH UPLOAD ================= */}
        {activeClient && (
          <>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={handleBack}
              sx={{
                mb: 2,
                textTransform: "none",
                color: "#5A9BA5",
                fontWeight: 600,
              }}
            >
              Back to Clients
            </Button>

            {/* FILTER & UPLOAD BUTTON */}
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              mb={1}
              alignItems={{ xs: "stretch", sm: "center" }}
              justifyContent="space-between"
            >
              <Stack direction="row" spacing={3} alignItems="center">
                <FilterListIcon sx={{ color: "#5A9BA5" }} />
                <FormControl size="small" sx={{ minWidth: 160, bgcolor: "white" }}>
                  <InputLabel>Role</InputLabel>
                  <Select
                    value={roleFilter}
                    label="Role"
                    onChange={(e) => setRoleFilter(e.target.value)}
                  >
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="admin">Admin</MenuItem>
                    <MenuItem value="doctor">Doctor</MenuItem>
                    <MenuItem value="receptionist">Receptionist</MenuItem>
                    <MenuItem value="staff">Client</MenuItem>
                  </Select>
                </FormControl>
              </Stack>

              <Button
                variant="contained"
                startIcon={<UploadFileIcon />}
                sx={{
                  bgcolor: "#5A9BA5",
                  textTransform: "none",
                  borderRadius: 2,
                  px: 3,
                  alignSelf: { xs: "flex-start", sm: "auto" },
                  "&:hover": { bgcolor: "#4A8A94" },
                }}
                onClick={() => setOpenUploadModal(true)}
              >
                Upload Document
              </Button>
            </Stack>

            {/* DOCUMENTS CARD - WITH SCROLL AFTER 2 ROWS */}
            <Card
              sx={{
                borderRadius: 3,
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                p: 3,
              }}
            >
              <Box
                sx={{
                  maxHeight: "calc(100vh - 300px)",
                  overflowY: "auto",
                  pr: 1,
                  "&::-webkit-scrollbar": {
                    width: "8px",
                  },
                  "&::-webkit-scrollbar-track": {
                    background: "#f1f1f1",
                    borderRadius: "10px",
                  },
                  "&::-webkit-scrollbar-thumb": {
                    background: "#5A9BA5",
                    borderRadius: "10px",
                  },
                }}
              >
                {loadingDocs ? (
                  <Box display="flex" justifyContent="center" mt={4}>
                    <CircularProgress sx={{ color: "#5A9BA5" }} />
                  </Box>
                ) : filteredDocuments.length === 0 ? (
                  <Box sx={{ p: 4, textAlign: "center" }}>
                    <Typography>No documents found</Typography>
                  </Box>
                ) : (
                  <Grid container spacing={2}>
                    {filteredDocuments.map((doc) => (
                      <Grid item xs={12} sm={6} md={4} lg={3} key={doc.id} >
                        <Card
                          sx={{
                            height: { md: 130, xs: 120 },
                            width: { md: 200, xs: 200 },
                            backgroundColor: "rgba(104, 101, 101, 0.08)",
                            borderRadius: 3,
                            boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
                            display: "flex",
                            flexDirection: "column",
                            transition: "all 0.25s ease",
                            "&:hover": {
                              boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
                              transform: "translateY(-2px)",
                            },
                          }}
                        >
                          <CardContent
                            sx={{
                              flexGrow: 1,
                              display: "flex",
                              flexDirection: "column",
                              p: 1,
                            }}
                          >
                            {/* FILE NAME */}
                            <Tooltip title={doc.file_name} arrow>
                              <Typography
                                fontWeight={600}
                                fontSize="0.9rem"
                                sx={{
                                  mb: 1,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  cursor: "default",
                                }}
                              >
                                {doc.file_name}
                              </Typography>
                            </Tooltip>

                            {/* ROLE */}
                            <Chip
                              label={doc.uploaded_by_role}
                              color={getRoleColor(doc.uploaded_by_role)}
                              size="small"
                              sx={{ mb: 1, alignSelf: "flex-start" }}
                            />
                            <span style={{ fontSize: "0.75rem", color: "#555" }}>
                              Uploaded on {new Date(doc.uploaded_at).toLocaleDateString()}
                            </span>

                            {/* SPACER */}
                            <Box sx={{ flexGrow: 1 }} />

                            {/* ACTION BAR */}
                            <Stack
                              direction="row"
                              spacing={1}
                              justifyContent="flex-start"
                              alignItems="center"
                            >
                              <Tooltip title="View Document" arrow>
                                <IconButton
                                  size="small"
                                  sx={{
                                    border: "1px solid #5A9BA5",
                                    color: "#5A9BA5",
                                    "&:hover": {
                                      bgcolor: "rgba(90,155,165,0.1)",
                                    },
                                  }}
                                  onClick={() => handleView(doc)}
                                >
                                  <VisibilityIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>

                              {/* <Tooltip title="Download" arrow>
                                <IconButton
                                  size="small"
                                  sx={{
                                    border: "1px solid #5A9BA5",
                                    color: "#5A9BA5",
                                    "&:hover": {
                                      bgcolor: "rgba(90,155,165,0.1)",
                                    },
                                  }}
                                  onClick={() => handleDownload(doc)}
                                >
                                  <DownloadIcon fontSize="small" />
                                </IconButton>
                              </Tooltip> */}

                              {doc.uploaded_by_role?.toLowerCase() === "doctor" && (
                                <Tooltip title="Delete" arrow>
                                  <IconButton
                                    size="small"
                                    color="error"
                                    sx={{ border: "1px solid rgba(211,47,47,0.4)" }}
                                    onClick={() => handleDelete(doc.id)}
                                  >
                                    <DeleteOutlineIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Stack>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Box>
            </Card>

            {/* UPLOAD MODAL (All screen sizes) */}
            <Dialog
              open={openUploadModal}
              onClose={() => setOpenUploadModal(false)}
              maxWidth="sm"
              fullWidth
            >
              <IconButton
                aria-label="close"
                onClick={() => setOpenUploadModal(false)}
                sx={{
                  position: "absolute",
                  right: 8,
                  top: 8,
                }}
              >
                <CloseIcon />
              </IconButton>
              <DialogTitle>Upload Document</DialogTitle>
              <DialogContent>
                <UploadSectionDocView />
              </DialogContent>
            </Dialog>

            {/* DOCUMENT VIEWER MODAL */}
          <Dialog
  open={openViewer}
  onClose={() => setOpenViewer(false)}
  maxWidth={false}
  PaperProps={{
    sx: {
      width: {
        xs: "95%",
        sm: "80%",
        md: "70%",
      },
      height: {
        xs: "85vh",
        sm: "80vh",
        md: "75vh",
      },
      maxHeight: "90vh",
      borderRadius: 3,
      overflow: "hidden",
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      m: 0,
    },
  }}
>
  <IconButton
    onClick={() => setOpenViewer(false)}
    sx={{
      position: "absolute",
      right: 10,
      top: 10,
      zIndex: 2,
      bgcolor: "white",
      boxShadow: 2,
    }}
  >
    <CloseIcon />
  </IconButton>


  <DialogTitle sx={{ textAlign:"center" }}>
    Document Preview
  </DialogTitle>


  <DialogContent
    sx={{
      p:0,
      height:"100%",
      overflow:"hidden",
    }}
  >

    {docLoading ? (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100%"
      >
        <CircularProgress />
      </Box>
    ) : (

      <iframe
        src={`${viewDocUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
        title="Document Preview"
        width="100%"
        height="100%"
        style={{
          border:"none",
          display:"block"
        }}
      />

    )}

  </DialogContent>

</Dialog>

<Dialog
  open={otpSendingSkeleton}
  maxWidth="xs"
  fullWidth
>
  <DialogContent>

    <Box
      sx={{
        p:3,
        display:"flex",
        flexDirection:"column",
        alignItems:"center"
      }}
    >

      {/* Header */}
      <Skeleton
        variant="text"
        width="60%"
        height={35}
      />


      {/* Description */}
      <Skeleton
        variant="text"
        width="90%"
        height={25}
      />


      {/* OTP Field */}
      <Skeleton
        variant="rounded"
        width="100%"
        height={55}
        sx={{
          mt:3,
          borderRadius:2
        }}
      />


      {/* Buttons */}
      <Box
        sx={{
          display:"flex",
          justifyContent:"flex-end",
          gap:2,
          width:"100%",
          mt:3
        }}
      >

        <Skeleton
          variant="rounded"
          width={80}
          height={36}
        />


        <Skeleton
          variant="rounded"
          width={90}
          height={36}
        />

      </Box>


    </Box>

  </DialogContent>
</Dialog>

          <Dialog open={otpDialogOpen} onClose={() => setOtpDialogOpen(false)} maxWidth="xs" fullWidth>
  <DialogTitle>OTP Verification</DialogTitle>
  <DialogContent>
    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
      Enter the OTP sent to the patient's whatsapp.
    </Typography>
    <TextField
      fullWidth
      label="OTP"
      value={otp}
      onChange={(e) => setOtp(e.target.value)}
      inputProps={{ maxLength: 6 }}
    />
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setOtpDialogOpen(false)}>Cancel</Button>
    <Button
      variant="contained"
      sx={{ bgcolor: "#5A9BA5" }}
      disabled={verifyingOtp}
      onClick={verifyOtp}
    >
      {verifyingOtp ? <CircularProgress size={20} color="inherit" /> : "Verify"}
    </Button>
  </DialogActions>
</Dialog>
          </>
        )}
      </Box>
    </Box>
  );
}

export default Documents;