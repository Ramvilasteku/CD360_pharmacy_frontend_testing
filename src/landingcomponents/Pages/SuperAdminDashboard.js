import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Tabs,
  Tab,
  Paper,
  IconButton,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogActions,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import LogoutIcon from "@mui/icons-material/Logout";
import axios from "axios";

export default function SuperAdminDashboard() {
  const [tab, setTab] = useState(0);
  const [data, setData] = useState([]);
  const [deleteId, setDeleteId] = useState(null);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    type: "success",
  });

  const token = localStorage.getItem("token");

  const fetchData = async () => {
    try {
      const url =
        tab === 0
          ? `${process.env.REACT_APP_URL}/landingpage/contact/get`
          :`${process.env.REACT_APP_URL}/landingpage/demo/get`;

      const res = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setData(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [tab]);

  const confirmDelete = async () => {
    try {
      const url =
        tab === 0
          ? `https://api.caredesk360.com/contact/delete/${deleteId}`
          : `https://api.caredesk360.com/demo/delete/${deleteId}`;

      await axios.delete(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setSnackbar({
        open: true,
        message: "Deleted successfully",
        type: "success",
      });

      setDeleteId(null);
      fetchData();
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Delete failed",
        type: "error",
      });
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    window.location.href = "/admin";
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "#f5f6fa",
        p: 4,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h4" fontWeight="bold">
          Admin Dashboard
        </Typography>

        <Button
          variant="contained"
          color="error"
          startIcon={<LogoutIcon />}
          onClick={logout}
        >
          Logout
        </Button>
      </Box>

      {/* Tabs */}
      <Paper sx={{ borderRadius: 3, p: 2 }}>
        <Tabs
          value={tab}
          onChange={(e, newValue) => setTab(newValue)}
          textColor="primary"
          indicatorColor="primary"
        >
          <Tab label="Contact Requests" />
          <Tab label="Demo Requests" />
        </Tabs>

        {/* Table */}
        {data.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 5 }}>
            <Typography variant="h6" color="text.secondary">
              No Data Found
            </Typography>
          </Box>
        ) : (
          <Table sx={{ mt: 2 }}>
            <TableHead>
              <TableRow>
                {Object.keys(data[0]).map((key) => (
                  <TableCell key={key} sx={{ fontWeight: "bold" }}>
                    {key}
                  </TableCell>
                ))}
                <TableCell sx={{ fontWeight: "bold" }}>
                  Action
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {data.map((row) => (
                <TableRow key={row.id} hover>
                  {Object.values(row).map((val, i) => (
                    <TableCell key={i}>{val}</TableCell>
                  ))}

                  <TableCell>
                    <IconButton
                      color="error"
                      onClick={() => setDeleteId(row.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* Delete Confirmation Dialog */}
      <Dialog open={Boolean(deleteId)} onClose={() => setDeleteId(null)}>
        <DialogTitle>
          Are you sure you want to delete this record?
        </DialogTitle>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button color="error" onClick={confirmDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() =>
          setSnackbar({ ...snackbar, open: false })
        }
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={snackbar.type} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}