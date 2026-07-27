import React, { useEffect, useState } from "react";
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
  colors,
} from "@mui/material";
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
import axios from "axios";
import DocumentsUploadModal from "./DocumentsUploadModal";
import { COLORS } from "./Themes";
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
  const [otpSendingDialog, setOtpSendingDialog] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError("");
        setSuccess("");
      }, 5000); // 5 seconds

      return () => clearTimeout(timer);
    }
  }, [error, success]);
  // ---------------- Get Clients List ----------------

  const fetchClients = async () => {
    setLoadingClients(true);
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_URL}/api/staff/clients`,
        {
          withCredentials: true,
        }
      );

      setClients(res.data.data || []);
      console.log(res.data.data);
      console.log(res);
    } catch (error) {
      console.error(error);
      setError("Failed to fetch clients");
    } finally {
      setLoadingClients(false);
    }
  };

   
const checkAccess = async (doc) => {
  
  try {
    const res = await axios.get(
      `${process.env.REACT_APP_URL}/api/documents/access-status/${doc.id}`,
      { withCredentials: true }
    );
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
    const res = await axios.post(
      `${process.env.REACT_APP_URL}/api/documents/request-access/${accessDoc.id}`,
      {},
      { withCredentials: true }
    );
    setAccessStatus(res.data.status || "pending");
    setSuccess(res.data.message);
  } catch (err) {
    setError(err?.response?.data?.message || "Failed to request access");
  } finally {
    setRequestingAccess(false);
  }
};

  // ---------------- Get Clients Documents  List ----------------

  const fetchClientDocuments = async (clientId) => {
    setLoadingDocs(true);
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_URL}/api/documents/staff/all`,
        {
          withCredentials: true,
        }
      );
      const clientData = res.data.find((c) => c.client_id === clientId);
      setDocuments(clientData?.documents || []);
    } catch {
      setError("Failed to fetch documents");
    } finally {
      setLoadingDocs(false);
    }
  };

  // ---------------- Get Clients View  ----------------

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

  const handleDelete = async (docId) => {
    if (!window.confirm("Delete this document?")) return;
    try {
      await axios.delete(
        `${process.env.REACT_APP_URL}/api/documents/staff/${docId}`,
        {
          withCredentials: true,
        }
      );
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      setSuccess("Document deleted");
    } catch {
      setError("You can only delete your uploaded documents");
    }
  };

//  const handleView = (doc) => {
//   sendOtp(doc, "view");
// };

// const handleDownload = (doc) => {
//   sendOtp(doc, "download");
// };

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


//    const sendOtp = async (doc, action) => {
//   try {
//     setSendingOtp(true);
//     const res = await axios.post(
//       `${process.env.REACT_APP_URL}/api/documents/send-otp/${doc.id}`,
//       {},
//       { withCredentials: true }
//     );
//     setOtpDoc(doc);
//     setPendingAction(action);
//     setOtp("");
//     setOtpDialogOpen(true);
//     setSuccess(res.data.message);
//   } catch (err) {
//     setError(err?.response?.data?.message || "Failed to send OTP");
//   } finally {
//     setSendingOtp(false);
//   }
// };

  const verifyOtp = async () => {
  if (!otpDoc) {
    setError("Document not selected");
    return;
  }
  try {
    setVerifyingOtp(true);

    await axios.post(
      `${process.env.REACT_APP_URL}/api/documents/verify-otp`,
      { documentId: otpDoc.id, otp },
      { withCredentials: true }
    );

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
    const res = await axios.get(
      `${process.env.REACT_APP_URL}/api/documents/view-safe/${doc.id}`,
      { responseType: "blob", withCredentials: true }
    );
    const url = window.URL.createObjectURL(res.data);
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
    const res = await axios.get(
      `${process.env.REACT_APP_URL}/api/documents/download-safe/${doc.id}`,
      { responseType: "blob", withCredentials: true }
    );
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
    const res = await axios.get(
      `${process.env.REACT_APP_URL}/api/documents/otp-status/${doc.id}`,
      { withCredentials: true }
    );

    if (res.data.status === "verified") {
      // still within the 4-hour verified window — skip OTP entirely
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
    setOtpSendingDialog(true);

    const res = await axios.post(
      `${process.env.REACT_APP_URL}/api/documents/send-otp/${doc.id}`,
      {},
      { withCredentials: true }
    );

    if (res.data.alreadyVerified) {
      setOtpSendingDialog(false);

      if (action === "view") {
        await fetchAndShowDocument(doc);
      } else if (action === "download") {
        await downloadDocument(doc);
      }

      return;
    }

    // close skeleton loader
    setOtpSendingDialog(false);

    // open OTP popup
    setOtpDoc(doc);
    setPendingAction(action);
    setOtp("");
    setOtpDialogOpen(true);

    setSuccess(res.data.message);

  } catch (err) {
    setOtpSendingDialog(false);
    setError(
      err?.response?.data?.message || "Failed to send OTP"
    );
  } finally {
    setSendingOtp(false);
  }
};


  return (
    <Box sx={{ bgcolor: "#F8f6f6", maxHeight: "100vh", overflow: "hidden" }}>
      <Box px={1} pb={1}>
        {error && (
          <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert
            severity="success"
            onClose={() => setSuccess("")}
            sx={{ mb: 2 }}
          >
            {success}
          </Alert>
        )}

        {/* ================= CLIENT LIST VIEW WITH UPLOAD ================= */}
        {!activeClient && (
          <>
            {/* Search Card */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexDirection: { xs: "column", md: "row" },
              }}
            >
              <Box
                sx={{
                  bgcolor: COLORS.primary,
                  borderRadius: 2,
                  p: 2,
                  my: { xs: 1, md: 3 },
                  width: { xs: 250, md: 600 },
                  maxWidth: 600,
                  color: "white",
                  borderTopRightRadius: 80,
                }}
              >
                <Grid container spacing={2} alignItems="center">
                  {/* LEFT COLUMN - TEXT */}
                  <Grid item xs={12} md={6}>
                    <Typography fontWeight={700} fontSize="1.1rem" mb={0.5}>
                      Enter Patient ID
                    </Typography>
                    <Typography fontSize="0.9rem" sx={{ opacity: 0.9 }}>
                      To View The Documents
                    </Typography>
                  </Grid>

                  {/* RIGHT COLUMN - SEARCH */}
                  <Grid
                    item
                    xs={12}
                    md={6}
                    display="flex"
                    justifyContent="flex-end"
                  >
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

              <Box>
                <Button
                  variant="contained"
                  sx={{
                    bgcolor: COLORS.primary,
                    textTransform: "none",
                    borderRadius: 2,
                    py: 1,
                    mb:2,
                    fontSize: { xs: 12, md: 16 },
                    "&:hover": { bgcolor: COLORS.softBg },
                  }}
                  onClick={() => setOpenUploadModal(true)}
                >
                  Upload Document
                </Button>
              </Box>
            </Box>

            <Grid container spacing={3}>
              {/* Client Cards - WITH SCROLL AFTER 2 ROWS */}
              <Grid item xs={12} lg={8}>
                <Box
                  sx={{
                    maxHeight: {
                      xs: "calc(100vh - 300px)",
                      lg: "calc(100vh - 300px)",
                    },
                    overflowY: "auto",
                    pr: 1,
                    "&::-webkit-scrollbar": {
                      width: "8px",
                    },
                    "&::-webkit-scrollbar-track": {
                      background: COLORS.texWhite,
                      borderRadius: "10px",
                    },
                    "&::-webkit-scrollbar-thumb": {
                      background: COLORS.primary,
                      borderRadius: "10px",
                    },
                  }}
                >
                  {loadingClients ? (
                    <Box display="flex" justifyContent="center" mt={2}>
                      <CircularProgress sx={{ color: COLORS.primary }} />
                    </Box>
                  ) : (
                    <Grid container spacing={3}>
                      {clients
                        .filter((c) =>
                          c.name
                            .toLowerCase()
                            .includes(searchTerm.toLowerCase())
                        )
                        .map((client) => (
                          <Grid item xs={12} sm={6} md={4} key={client.id}>
                            <Card
                              sx={{
                                borderRadius: 3,
                                height: { md: 200, xs: 200 },
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
                                    bgcolor: COLORS.activeBg,
                                    borderRadius: 2,
                                    p: 2,
                                    display: "flex",
                                    justifyContent: "center",
                                    mb: 2,
                                  }}
                                >
                                  <FolderIcon
                                    sx={{ fontSize: 40, color: COLORS.primary }}
                                  />
                                </Box>

                                <Typography fontSize="0.9rem" mb={0.5}>
                                  Patient ID :{" "}
                                  <span
                                    style={{
                                      color: COLORS.primary,
                                      fontWeight: 600,
                                    }}
                                  >
                                    PI - {client.id}
                                  </span>
                                </Typography>
                                <Typography fontSize="0.9rem" mb={0.5}>
                                  Name :{" "}
                                  <span
                                    style={{
                                      color: COLORS.primary,
                                      fontWeight: 600,
                                    }}
                                  >
                                    {client.name}
                                  </span>
                                </Typography>

                                {/* <Typography fontSize="0.85rem" color="text.secondary" mb={2}>
                                  Documents : {client.document_count || 12}
                                </Typography> */}

                                <Button
                                  fullWidth
                                  variant="contained"
                                  onClick={() => handleViewClient(client)}
                                  sx={{
                                    bgcolor: COLORS.primary,
                                    textTransform: "none",
                                    borderRadius: 2,
                                    py: 0.5,
                                    fontSize: "0.9rem",
                                    "&:hover": {
                                      bgcolor: COLORS.softBg,
                                    },
                                  }}
                                >
                                  View Documents
                                </Button>
                              </CardContent>
                            </Card>
                          </Grid>
                        ))}
                    </Grid>
                  )}
                </Box>
              </Grid>
            </Grid>
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
                color: COLORS.primary,
                fontWeight: 600,
              }}
            >
              Back to Patient
            </Button>

            {/* FILTER & UPLOAD BUTTON */}
            <Stack
              direction={{ xs: "row" }}
              spacing={1}
              mb={1}
              alignItems={{ xs: "stretch", sm: "center" }}
              justifyContent="space-between"
            >
              <Stack direction="row" spacing={3} alignItems="center">
                <FilterListIcon sx={{ color: COLORS.primary }} />
                <FormControl
                  size="small"
                  sx={{ minWidth: { xs: 100, md: 160 }, bgcolor: "white" }}
                >
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
                    <MenuItem value="client">Patient</MenuItem>
                  </Select>
                </FormControl>
              </Stack>

              <Button
                variant="contained"
                startIcon={<UploadFileIcon />}
                sx={{
                  bgcolor: COLORS.primary,
                  textTransform: "none",
                  borderRadius: 2,
                  fontSize: { xs: 10, md: 14 },
                  px: 3,
                  alignSelf: { xs: "flex-start", sm: "auto" },
                  "&:hover": { bgcolor: COLORS.softBg },
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
                  maxHeight: { xs: 550, md: 400 },
                  overflowY: "auto",
                  "&::-webkit-scrollbar": {
                    width: "8px",
                  },
                  "&::-webkit-scrollbar-track": {
                    background: COLORS.texWhite,
                    borderRadius: "10px",
                  },
                  "&::-webkit-scrollbar-thumb": {
                    background: COLORS.primary,
                    borderRadius: "10px",
                  },
                }}
              >
                {loadingDocs ? (
                  <Box display="flex" justifyContent="center" mt={4}>
                    <CircularProgress sx={{ color: COLORS.primary }} />
                  </Box>
                ) : filteredDocuments.length === 0 ? (
                  <Box sx={{ p: 4, textAlign: "center" }}>
                    <Typography>No documents found</Typography>
                  </Box>
                ) : (
                  <Grid container spacing={2}>
                    {filteredDocuments.map((doc) => (
                      <Grid item xs={12} sm={6} md={4} lg={3} key={doc.id}>
                        <Card
                          sx={{
                            height: { md: 120, xs: 120 },
                            width: { md: 200, xs: 200 },
                            backgroundColor: "rgba(104, 101, 101, 0.08)",
                            borderRadius: 3,
                            boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
                            display: "flex",
                            flexDirection: "column",
                            transition: "all 0.25s ease",
                            "&:hover": {
                              boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
                              border: `${COLORS.primary} solid  2px`,
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
                                    color: COLORS.primary,
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
                                    color: COLORS.primary,
                                    "&:hover": {
                                      bgcolor: "rgba(90,155,165,0.1)",
                                    },
                                  }}
                                  onClick={() => handleDownload(doc)}
                                >
                                  <DownloadIcon fontSize="small" />
                                </IconButton>
                              </Tooltip> */}

                              {doc.uploaded_by_role?.toLowerCase() ===
                                "receptionist" && (
                                <Tooltip title="Delete" arrow>
                                  <IconButton
                                    size="small"
                                    color="error"
                                    sx={{
                                      border: "1px solid rgba(211,47,47,0.4)",
                                    }}
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

         
            {/* ================= DOCUMENT VIEWER MODAL ================= */}
            <Dialog
              open={openViewer}
              onClose={() => setOpenViewer(false)}
              maxWidth={false}
              PaperProps={{
                sx: {
                  width: {
                    xs: "95vw",
                    sm: "80vw",
                    md: "60vw",
                  },
                  height: {
                    xs: "90vh",
                    sm: "85vh",
                    md: "85vh",
                  },
                  margin: "auto",
                  borderRadius: 3,
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                },
              }}
            >
              {/* HEADER */}
              <DialogTitle
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  py: 1.5,
                  px: 2,
                  borderBottom: "1px solid #ddd",
                  flexShrink: 0,
                }}
              >
                <Typography fontWeight={600}>
                  Document Preview
                </Typography>

                <IconButton onClick={() => setOpenViewer(false)}>
                  <CloseIcon />
                </IconButton>
              </DialogTitle>


              {/* DOCUMENT AREA */}
              <DialogContent
                sx={{
                  p: 0,
                  flex: 1,
                  overflow: "hidden",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  bgcolor: "#f5f5f5",
                }}
              >

                {docLoading ? (

                  <CircularProgress />

                ) : (

                  <iframe
                    src={`${viewDocUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                    title="Document Preview"
                    style={{
                      width: "100%",
                      height: "100%",
                      border: "none",
                    }}
                  />

                )}

              </DialogContent>

            </Dialog>
          </>
        )}
      </Box>

      <DocumentsUploadModal
        open={openUploadModal}
        onClose={() => setOpenUploadModal(false)}
        clients={clients}
        activeClient={activeClient}
        onSuccess={() => {
          if (activeClient) {
            fetchClientDocuments(activeClient.id);
          } else {
            fetchClients();
          }
        }}
      />

<Dialog
  open={otpSendingDialog}
  maxWidth="xs"
  fullWidth
>
  <DialogContent>
    <Box
      sx={{
        p: 3,
        textAlign: "center"
      }}
    >

      {/* Title Skeleton */}
      <Skeleton
        variant="text"
        width="60%"
        height={35}
        sx={{ mx: "auto" }}
      />

      {/* Message Skeleton */}
      <Skeleton
        variant="text"
        width="90%"
        height={25}
        sx={{ mx: "auto", mt: 1 }}
      />


      {/* OTP Input Skeleton */}
      <Skeleton
        variant="rounded"
        height={55}
        sx={{
          mt: 3,
          borderRadius: 2
        }}
      />


      {/* Buttons Skeleton */}
      <Box
        sx={{
          display:"flex",
          justifyContent:"flex-end",
          gap:2,
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
      Enter the OTP sent to the patient's email.
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
      sx={{ bgcolor: COLORS.primary }}
      disabled={verifyingOtp}
      onClick={verifyOtp}
    >
      {verifyingOtp ? <CircularProgress size={20} color="inherit" /> : "Verify"}
    </Button>
  </DialogActions>
</Dialog>
    </Box>
  );
}

export default Documents;
