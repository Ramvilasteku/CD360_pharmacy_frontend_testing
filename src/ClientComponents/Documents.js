import React, { useEffect, useState } from "react";
import axios from "axios";

import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  MenuItem,
  CircularProgress,
  Card,
  CardContent,
  Stack,
  Chip,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  IconButton,
  Tooltip,
} from "@mui/material";

import VisibilityIcon from "@mui/icons-material/Visibility";
import DownloadIcon from "@mui/icons-material/Download";
import DeleteIcon from "@mui/icons-material/Delete";
import DescriptionIcon from "@mui/icons-material/Description";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import AddIcon from '@mui/icons-material/Add';

const documentTypes = [
  "Prescription",
  "Blood Report",
  "Lab Report",
  "X-Ray",
  "MRI Scan",
  "CT Scan",
  "Discharge Summary",
  "Insurance Document",
  "Medical Certificate",
  "Other",
];

export default function Documents() {
  const [openUpload, setOpenUpload] = useState(false);

  const [documentType, setDocumentType] = useState("");
  const [file, setFile] = useState(null);

  const [uploading, setUploading] = useState(false);

  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  const [openRequests, setOpenRequests] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [processingRequest, setProcessingRequest] = useState(null);
  const [previewOpen,setPreviewOpen] = useState(false);
  const [previewDoc,setPreviewDoc] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null); // NEW: per-doc download loading state

  const fetchDocuments = async () => {
    try {
      setLoadingDocs(true);

      const res = await axios.get(
        `${process.env.REACT_APP_URL}/api/documents/client`,
        {
          withCredentials: true,
        }
      );

      setDocuments(res.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingDocs(false);
    }
  };

  const fetchRequests = async () => {
  try {
    setLoadingRequests(true);

    const res = await axios.get(
      `${process.env.REACT_APP_URL}/api/documents/pending-requests`,
      {
        withCredentials: true,
      }
    );

    setRequests(res.data.data || []);
  } catch (err) {
    console.error(err);
  } finally {
    setLoadingRequests(false);
  }
};

  useEffect(() => {
    fetchDocuments();
    fetchRequests();
  }, []);

  const handleFileChange = (event) => {
    if (event.target.files?.length) {
      setFile(event.target.files[0]);
    }
  };

  const handleOpenRequests = async () => {
    setOpenRequests(true);
    await fetchRequests();
  };

  const approveRequest = async (requestId) => {
    try {
      setProcessingRequest(requestId);

      await axios.put(
        `${process.env.REACT_APP_URL}/api/documents/approve-access`,
        {
          requestId,
        },
        {
          withCredentials: true,
        }
      );

      await fetchRequests();

      alert("Access approved");
    } catch (err) {
      console.error(err);

      alert(
        err?.response?.data?.message ||
        "Failed to approve request"
      );
    } finally {
      setProcessingRequest(null);
    }
  };

  const rejectRequest = async (requestId) => {
    try {
      setProcessingRequest(requestId);

      await axios.put(
        `${process.env.REACT_APP_URL}/api/documents/reject-access`,
        {
          requestId,
        },
        {
          withCredentials: true,
        }
      );

      await fetchRequests();

      alert("Access rejected");
    } catch (err) {
      console.error(err);

      alert(
        err?.response?.data?.message ||
        "Failed to reject request"
      );
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleUpload = async () => {
    try {
      if (!documentType) {
        alert("Please select document type");
        return;
      }

      if (!file) {
        alert("Please select a file");
        return;
      }

      setUploading(true);

      const formData = new FormData();

      formData.append("file", file);
      formData.append("document_type", documentType);

      const res = await axios.post(
        `${process.env.REACT_APP_URL}/api/documents/upload`,
        formData,
        {
          withCredentials: true,
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      alert(res.data.message);

      setDocumentType("");
      setFile(null);

      setOpenUpload(false);

      await fetchDocuments();
    } catch (error) {
      console.error(error);

      alert(
        error?.response?.data?.message ||
        "Failed to upload document"
      );
    } finally {
      setUploading(false);
    }
  };

  const isImage = (path) => {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(path || "");
  };


  // Used only for inline preview (view icon / thumbnail) — NOT for downloads
  const getFileUrl = (id)=>{
  return `${process.env.REACT_APP_URL}/api/documents/view/${id}`;
};


const handlePreview=(doc)=>{
  setPreviewDoc(doc);
  setPreviewOpen(true);
};


  // FIXED: was pointing an <a href> at the "view" endpoint, which has no
  // Content-Disposition header and is cross-origin, so the browser just
  // opened it in a new tab instead of downloading. Now we fetch the file
  // as a blob from the "download-safe" endpoint (which sets
  // Content-Disposition: attachment) and trigger a save from the blob.
  const handleDownload = async (doc) => {
    try {
      setDownloadingId(doc.id);

      const res = await axios.get(
        `${process.env.REACT_APP_URL}/api/documents/download-safe/${doc.id}`,
        {
          responseType: "blob",
          withCredentials: true,
        }
      );

      const url = window.URL.createObjectURL(res.data);
      const link = document.createElement("a");

      link.href = url;
      link.download = doc.file_name;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);

      // err.response.data is a Blob here because responseType is "blob" —
      // parse it to get the real error message from the server
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text);
          alert(parsed.message || "Download failed");
        } catch {
          alert("Download failed");
        }
      } else {
        alert(err?.response?.data?.message || "Download failed");
      }
    } finally {
      setDownloadingId(null);
    }
  };


  // FIXED: was calling DELETE /api/documents/:id, which doesn't exist on
  // the backend (only /documents/client/:id, /documents/staff/:id,
  // /documents/admin/:id do). Now hits the correct client-scoped route.
  const handleDelete=async(id)=>{

 try{

   if(!window.confirm("Delete this document?"))
      return;


   await axios.delete(
    `${process.env.REACT_APP_URL}/api/documents/client/${id}`,
    {
      withCredentials:true
    }
   );


   fetchDocuments();


 }
 catch(err){

   console.log(err);
   alert(err?.response?.data?.message || "Delete failed");

 }

};


const isPdf=(file)=>{

 return /\.pdf$/i.test(file || "");

};


const isDoc=(file)=>{

 return /\.(doc|docx)$/i.test(file || "");

};


  return (
    <Box p={3}>
      {/* Header */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h5" fontWeight={700}>
          My Documents
        </Typography>

        <Box display="flex" gap={2}>
          <Button
            variant="contained"
            sx={{
              backgroundColor: "#437986",
              textTransform: "none",
              color: "white",
            }}
            onClick={() => setOpenUpload(true)}
          >
            <AddIcon />
            Upload Document
          </Button>
        </Box>
      </Box>

<Dialog
 open={previewOpen}
 onClose={()=>setPreviewOpen(false)}
 fullWidth
 maxWidth="md"
>

<DialogTitle>
 {previewDoc?.file_name}
</DialogTitle>


<DialogContent>

{
previewDoc && isImage(previewDoc.file) &&

<img
 src={getFileUrl(previewDoc.id)}
 alt=""
 style={{
 width:"100%",
 maxHeight:"600px",
 objectFit:"contain"
 }}
/>
}


{
previewDoc && isPdf(previewDoc.file) &&

<iframe
 src={getFileUrl(previewDoc.id)}
 width="100%"
 height="600px"
 title="preview"
/>

}



{
previewDoc && isDoc(previewDoc.file) &&

<Box
 textAlign="center"
 py={5}
>

<DescriptionIcon
 sx={{
 fontSize:80,
 color:"#437986"
 }}
/>

<Typography>
 Word document preview is not supported.
</Typography>


<Button
 variant="contained"
 sx={{
 mt:2,
 background:"#437986"
 }}
 onClick={()=>handleDownload(previewDoc)}
>
Download File
</Button>


</Box>

}


</DialogContent>


<DialogActions>

<Button
 onClick={()=>setPreviewOpen(false)}
>
Close
</Button>

</DialogActions>


</Dialog>


      {/* Upload Dialog */}
      <Dialog
        open={openUpload}
        onClose={() => setOpenUpload(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Upload Medical Document
        </DialogTitle>

        <DialogContent>
          <TextField
            select
            fullWidth
            label="Document Type"
            value={documentType}
            onChange={(e) =>
              setDocumentType(e.target.value)
            }
            sx={{ mt: 2 }}
          >
            {documentTypes.map((type) => (
              <MenuItem
                key={type}
                value={type}
              >
                {type}
              </MenuItem>
            ))}
          </TextField>

          <Button
            variant="outlined"
            component="label"
            fullWidth
            sx={{ mt: 3 }}
          >
            Select File

            <input
              hidden
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={handleFileChange}
            />
          </Button>

          {file && (
            <Typography
              variant="body2"
              mt={2}
            >
              {file.name}
            </Typography>
          )}
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() => setOpenUpload(false)}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            sx={{ backgroundColor: "#437986", textTransform: "none", color: "white" }}
            onClick={handleUpload}
            disabled={uploading}
          >
            {uploading ? (
              <CircularProgress
                size={20}
                color="inherit"
              />
            ) : (
              "Upload"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* requests Dialog */}
      <Dialog
        open={openRequests}
        onClose={() => setOpenRequests(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          Document Access Requests
        </DialogTitle>

        <DialogContent>
          {loadingRequests ? (
            <Box
              display="flex"
              justifyContent="center"
              py={4}
            >
              <CircularProgress />
            </Box>
          ) : requests.length === 0 ? (
            <Typography>
              No pending requests.
            </Typography>
          ) : (
            <Stack spacing={2} mt={1}>
              {requests.map((req) => (
                <Card key={req.request_id}>
                  <CardContent>
                    <Typography fontWeight={600}>
                      Dr. {req.doctor_name}
                    </Typography>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                    >
                      Requested access to:
                      {" "}
                      {req.file_name}
                    </Typography>

                    <Typography
                      variant="caption"
                      display="block"
                      mt={1}
                    >
                      {new Date(
                        req.requested_at
                      ).toLocaleString()}
                    </Typography>

                    <Box
                      mt={2}
                      display="flex"
                      gap={2}
                    >
                      <Button
                        variant="contained"
                        color="success"
                        disabled={
                          processingRequest === req.request_id
                        }
                        onClick={() =>
                          approveRequest(req.request_id)
                        }
                      >
                        Approve
                      </Button>

                      <Button
                        variant="contained"
                        color="error"
                        disabled={
                          processingRequest === req.request_id
                        }
                        onClick={() =>
                          rejectRequest(req.request_id)
                        }
                      >
                        Reject
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() => setOpenRequests(false)}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
      {/* request Dialog */}

      {/* Documents */}
      {loadingDocs ? (
        <Box
          display="flex"
          justifyContent="center"
          mt={5}
        >
          <CircularProgress />
        </Box>
      ) : documents.length === 0 ? (
        <Paper sx={{ p: 4 }}>
          <Typography>
            No documents uploaded yet
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {documents.map((doc) => (
            <Grid
              size={{ xs: 12, sm: 6, md: 4, lg: 3 }}
              key={doc.id}
            >
              <Card
                sx={{
                  height: "100%",
                  borderRadius: 3,
                }}
              >
                {/* THUMBNAIL: shows the actual image for image docs,
                    falls back to a file-type icon otherwise */}
                <Box
                  sx={{
                    width: "100%",
                    height: 140,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: "#f0f4f5",
                    borderTopLeftRadius: 12,
                    borderTopRightRadius: 12,
                    overflow: "hidden",
                    cursor: "pointer",
                  }}
                  onClick={() => handlePreview(doc)}
                >
                  {isImage(doc.file) ? (
                    <img
                      src={getFileUrl(doc.id)}
                      alt={doc.file_name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : isPdf(doc.file) ? (
                    <PictureAsPdfIcon
                      sx={{ fontSize: 60, color: "#437986" }}
                    />
                  ) : (
                    <DescriptionIcon
                      sx={{ fontSize: 60, color: "#437986" }}
                    />
                  )}
                </Box>

                <CardContent>


                  <Typography
                    variant="h6"
                    fontWeight={600}
                    noWrap
                  >
                    {doc.file_name}
                  </Typography>

                  <Typography
                    variant="caption"
                    display="block"
                    mt={2}
                  >
                    {new Date(
                      doc.uploaded_at
                    ).toLocaleString()}
                  </Typography>

                  <Stack
                direction="row"
                justifyContent="center"
                spacing={1}
                mt={2}
                >


                <Tooltip title="View">

                <IconButton
                sx={{
                color:"#437986"
                }}
                onClick={()=>handlePreview(doc)}
                >

                <VisibilityIcon/>

                </IconButton>

                </Tooltip>



                <Tooltip title="Download">

                <IconButton
                sx={{
                color:"#437986"
                }}
                disabled={downloadingId === doc.id}
                onClick={()=>handleDownload(doc)}
                >

                {downloadingId === doc.id ? (
                  <CircularProgress size={20} sx={{ color: "#437986" }} />
                ) : (
                  <DownloadIcon/>
                )}

                </IconButton>

                </Tooltip>




                {
                /* FIXED: API returns uploaded_by_role, not uploaded_by —
                   this condition never matched before, so the delete
                   button never rendered for anyone. */
                doc.uploaded_by_role === "client" &&

                <Tooltip title="Delete">

                <IconButton
                color="error"
                onClick={()=>handleDelete(doc.id)}
                >

                <DeleteIcon/>

                </IconButton>

                </Tooltip>

                }


                </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}