import React, { useEffect, useState } from "react";
import axios from "axios";

import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  CircularProgress,
  Pagination,
  Stack,
  Card,
  CardContent,
  Divider,
  useMediaQuery,
  useTheme,
  Grid,
  TextField,
  MenuItem,
} from "@mui/material";

export default function IpdBills() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  /* =========================================
     FILTER STATES
  ========================================= */
  const [filters, setFilters] = useState({
    ipd_id: "",
    bill_id: "",
    date: "",
    status: "",
  });

  /* =========================================
     PAGINATION
  ========================================= */
  const [page, setPage] = useState(1);
  const rowsPerPage = 5;

  const theme = useTheme();

  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(
    theme.breakpoints.between("sm", "md")
  );

  /* =========================================
     FETCH BILLS
  ========================================= */
  const fetchBills = async () => {
    try {
      setLoading(true);

      const params = {};

      if (filters.ipd_id)
        params.ipd_id = filters.ipd_id;

      if (filters.bill_id)
        params.bill_id = filters.bill_id;

      if (filters.date)
        params.date = filters.date;

      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/getall/bills`,
        {
          params,
          withCredentials: true,
        }
      );

      if (response.data.success) {
        let data = response.data.data || [];

        /* =========================================
           STATUS FILTER (frontend)
        ========================================= */
        if (filters.status) {
          data = data.filter(
            (bill) =>
              bill.bill_summary.bill_status
                ?.toLowerCase()
                === filters.status.toLowerCase()
          );
        }

        setBills(data);
      }
    } catch (error) {
      console.error("Failed to fetch bills:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, [filters]);

  /* =========================================
     DOWNLOAD INVOICE
  ========================================= */
  const handleDownloadInvoice = async (billId) => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/get/bill/invoice-pdf/${billId}`,
        {
          responseType: "blob",
          withCredentials: true,
        }
      );

      const url = window.URL.createObjectURL(
        new Blob([response.data])
      );

      const link = document.createElement("a");

      link.href = url;
      link.setAttribute("download", `invoice-${billId}.pdf`);

      document.body.appendChild(link);

      link.click();

      link.remove();
    } catch (error) {
      console.error("Invoice download failed:", error);
    }
  };

  /* =========================================
     PAGINATION
  ========================================= */
  const totalPages = Math.ceil(
    bills.length / rowsPerPage
  );

  const paginatedBills = bills.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  /* =========================================
     LOADING
  ========================================= */
  if (loading) {
    return (
      <Box
        sx={{
          height: "60vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 } }}>
      {/* =========================================
         TITLE
      ========================================= */}
      <Typography
        variant={isMobile ? "h6" : "h5"}
        fontWeight="bold"
        sx={{ mb: 3 }}
      >
        IPD Bills
      </Typography>

      {/* =========================================
         FILTERS
      ========================================= */}
      <Paper
        elevation={2}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 3,
        }}
      >
        <Grid container spacing={2}>
          {/* BILL ID */}
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              label="Bill ID"
              value={filters.bill_id}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  bill_id: e.target.value,
                })
              }
            />
          </Grid>

          {/* IPD ID */}
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              label="IPD ID"
              value={filters.ipd_id}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  ipd_id: e.target.value,
                })
              }
            />
          </Grid>

          {/* DATE */}
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="Date"
              InputLabelProps={{ shrink: true }}
              value={filters.date}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  date: e.target.value,
                })
              }

              style={{width:"200px"}}
            />
          </Grid>

          {/* STATUS */}
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              select
              fullWidth
              size="small"
              label="Bill Status"
              value={filters.status}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  status: e.target.value,
                })
              }

              style={{width:"200px"}}
            >
              <MenuItem value="">
                All
              </MenuItem>

              <MenuItem value="Paid">
                Paid
              </MenuItem>

              <MenuItem value="Pending">
                Pending
              </MenuItem>

              <MenuItem value="Partial">
                Partial
              </MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Paper>

      {/* =========================================
         MOBILE + TABLET CARD VIEW
      ========================================= */}
      {(isMobile || isTablet) && (
        <Stack spacing={2}>
          {paginatedBills.length > 0 ? (
            paginatedBills.map((bill, index) => {
              const summary = bill.bill_summary;

              return (
                <Card
                  key={index}
                  elevation={3}
                  sx={{
                    borderRadius: 3,
                  }}
                >
                  <CardContent>
                    <Stack spacing={1}>
                      <Typography fontWeight="bold">
                        Bill ID: {summary.id}
                      </Typography>

                      <Divider />

                      <Typography>
                        <strong>IPD ID:</strong>{" "}
                        {summary.ipd_id}
                      </Typography>

                      <Typography>
                        <strong>Total:</strong> ₹
                        {summary.total_amount}
                      </Typography>

                      <Typography>
                        <strong>Paid:</strong> ₹
                        {summary.paid_amount}
                      </Typography>

                      <Typography>
                        <strong>Balance:</strong> ₹
                        {summary.balance_amount}
                      </Typography>

                      <Box>
                        <Chip
                          label={summary.bill_status}
                          color={
                            summary.bill_status?.toLowerCase() ===
                            "paid"
                              ? "success"
                              : summary.bill_status?.toLowerCase() ===
                                "partial"
                              ? "info"
                              : "warning"
                          }
                          size="small"
                        />
                      </Box>

                      <Typography>
                        <strong>Date:</strong>{" "}
                        {new Date(
                          summary.created_at
                        ).toLocaleDateString()}
                      </Typography>

                      <Button
                        fullWidth
                        variant="contained"
                       
                        onClick={() =>
                          handleDownloadInvoice(summary.id)
                        }
                        sx={{
                          mt: 1,
                          backgroundColor: "#437986",
                        }}
                      >
                        Download Invoice
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Paper sx={{ p: 3, textAlign: "center" }}>
              No bills found
            </Paper>
          )}
        </Stack>
      )}

      {/* =========================================
         DESKTOP TABLE VIEW
      ========================================= */}
      {!isMobile && !isTablet && (
        <TableContainer
          component={Paper}
          elevation={3}
          sx={{
            borderRadius: 3,
            overflow: "hidden",
          }}
        >
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: "#437986" }}>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                  Bill ID
                </TableCell>

                <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                  IPD ID
                </TableCell>

                <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                  Total Amount
                </TableCell>

                <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                  Paid Amount
                </TableCell>

                <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                  Balance
                </TableCell>

                <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                  Status
                </TableCell>

                <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                  Created At
                </TableCell>

                <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                  Invoice
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {paginatedBills.length > 0 ? (
                paginatedBills.map((bill, index) => {
                  const summary = bill.bill_summary;

                  return (
                    <TableRow key={index} hover>
                      <TableCell>{summary.id}</TableCell>

                      <TableCell>
                        {summary.ipd_id}
                      </TableCell>

                      <TableCell>
                        ₹{summary.total_amount}
                      </TableCell>

                      <TableCell>
                        ₹{summary.paid_amount}
                      </TableCell>

                      <TableCell>
                        ₹{summary.balance_amount}
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={summary.bill_status}
                          color={
                            summary.bill_status?.toLowerCase() ===
                            "paid"
                              ? "success"
                              : summary.bill_status?.toLowerCase() ===
                                "partial"
                              ? "info"
                              : "warning"
                          }
                          size="small"
                        />
                      </TableCell>

                      <TableCell>
                        {new Date(
                          summary.created_at
                        ).toLocaleDateString()}
                      </TableCell>

                      <TableCell>
                        <Button
                          variant="contained"
                          size="small"
                         
                          onClick={() =>
                            handleDownloadInvoice(summary.id)
                          }
                          sx={{
                            backgroundColor: "#437986",
                          }}
                        >
                          Download
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    align="center"
                  >
                    No bills found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* =========================================
         PAGINATION
      ========================================= */}
      {bills.length > rowsPerPage && (
        <Box
          sx={{
            mt: 3,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <Pagination
            count={totalPages}
            page={page}
            onChange={(e, value) => setPage(value)}
            color="primary"
            shape="rounded"
          />
        </Box>
      )}
    </Box>
  );
}