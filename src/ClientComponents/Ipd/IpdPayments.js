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
  Button
} from "@mui/material";
import PaymentsIcon from '@mui/icons-material/Payments';

export default function IpdPayments() {

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    ipd_id: "",
    bill_id: "",
    payment_type: "",
    payment_method: "",
    date: "",
  });

  const [page, setPage] = useState(1);

  const rowsPerPage = 5;

  const theme = useTheme();

  const isMobile = useMediaQuery(
    theme.breakpoints.down("sm")
  );

  const isTablet = useMediaQuery(
    theme.breakpoints.between("sm", "md")
  );

  /* =========================================
     FETCH PAYMENTS
  ========================================= */

  const fetchPayments = async () => {

    try {

      setLoading(true);

      const params = {};

      if (filters.ipd_id) {
        params.ipd_id = filters.ipd_id;
      }

      if (filters.bill_id) {
        params.bill_id = filters.bill_id;
      }

      if (filters.payment_type) {
        params.payment_type =
          filters.payment_type;
      }

      if (filters.payment_method) {
        params.payment_method =
          filters.payment_method;
      }

      if (filters.date) {
        params.date = filters.date;
      }

      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/getall/payments`,
        {
          params,
          withCredentials: true,
        }
      );

      if (response.data.success) {
        setPayments(
          response.data.data || []
        );
      }

      console.log("payments data is",response.data.data);

    } catch (error) {

      console.error(
        "Failed to fetch payments:",
        error
      );

    } finally {

      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [filters]);

  /* =========================================
     PAGINATION
  ========================================= */

  const totalPages = Math.ceil(
    payments.length / rowsPerPage
  );


   const downloadReceipt = async (paymentId) => {
  try {
    const response = await axios.get(
      `${process.env.REACT_APP_API_URL}/get/bill/payment-receipt/${paymentId}`,
      {
        responseType: "blob",
        withCredentials: true,
      }
    );

    const url = window.URL.createObjectURL(
      new Blob([response.data], { type: "application/pdf" })
    );

    window.open(url, "_blank");
  } catch (error) {
    console.error("Receipt download failed:", error);
  }
};


  const paginatedPayments =
    payments.slice(
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

      <Typography
        variant={isMobile ? "h6" : "h5"}
        fontWeight="bold"
        sx={{ mb: 3 }}
      >
        IPD Payments
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

          <Grid item xs={12} sm={6} md={3}>
            <TextField
              select
              fullWidth
              size="small"
              label="Payment Type"
              value={filters.payment_type}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  payment_type:
                    e.target.value,
                })
              }

              style={{width:"200px"}}
            >
              <MenuItem value="">
                All
              </MenuItem>

              <MenuItem value="advance">
                Advance
              </MenuItem>

              <MenuItem value="partial">
                Partial
              </MenuItem>

              <MenuItem value="final">
                Final
              </MenuItem>

              <MenuItem value="refund">
                Refund
              </MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="Date"
              InputLabelProps={{
                shrink: true,
              }}
              value={filters.date}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  date: e.target.value,
                })
              }
            />
          </Grid>

        </Grid>
      </Paper>

      {/* =========================================
         MOBILE VIEW
      ========================================= */}

      {(isMobile || isTablet) && (
        <Stack spacing={2}>

          {paginatedPayments.length > 0 ? (

            paginatedPayments.map(
              (payment, index) => (

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
                        Receipt:
                        {" "}
                        {payment.receipt_number}
                      </Typography>

                      <Divider />

                      <Typography>
                        <strong>IPD ID:</strong>
                        {" "}
                        {payment.ipd_id}
                      </Typography>

                      <Typography>
                        <strong>Bill ID:</strong>
                        {" "}
                        {payment.bill_id}
                      </Typography>

                      <Typography>
                        <strong>Amount:</strong>
                        {" "}
                        ₹{payment.amount}
                      </Typography>

                      <Typography>
                        <strong>Method:</strong>
                        {" "}
                        {payment.payment_method}
                      </Typography>

                      <Box>
                        <Chip
                          label={
                            payment.payment_type
                          }
                          color={
                            payment.payment_type ===
                            "final"
                              ? "success"
                              : payment.payment_type ===
                                "refund"
                              ? "error"
                              : "info"
                          }
                          size="small"
                        />
                      </Box>

                      <Typography>
                        <strong>Date:</strong>
                        {" "}
                        {new Date(
                          payment.payment_date
                        ).toLocaleDateString()}
                      </Typography>

                      <Button
                  fullWidth
                  variant="contained"
                  startIcon={<PaymentsIcon />}
                  onClick={() =>
                    downloadReceipt(payment.id)
                  }
                  sx={{ mt: 1 }}
                >
                  Download Receipt
                </Button>

                    </Stack>

                  </CardContent>
                </Card>
              )
            )

          ) : (

            <Paper
              sx={{
                p: 3,
                textAlign: "center",
              }}
            >
              No payments found
            </Paper>
          )}

        </Stack>
      )}

      {/* =========================================
         DESKTOP TABLE
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

              <TableRow
                sx={{
                  backgroundColor:
                    "#437986",
                }}
              >

                <TableCell
                  sx={{
                    color: "white",
                    fontWeight: "bold",
                  }}
                >
                  Receipt No
                </TableCell>

                <TableCell
                  sx={{
                    color: "white",
                    fontWeight: "bold",
                  }}
                >
                  IPD ID
                </TableCell>

                <TableCell
                  sx={{
                    color: "white",
                    fontWeight: "bold",
                  }}
                >
                  Bill ID
                </TableCell>

                <TableCell
                  sx={{
                    color: "white",
                    fontWeight: "bold",
                  }}
                >
                  Amount
                </TableCell>

                <TableCell
                  sx={{
                    color: "white",
                    fontWeight: "bold",
                  }}
                >
                  Method
                </TableCell>

                <TableCell
                  sx={{
                    color: "white",
                    fontWeight: "bold",
                  }}
                >
                  Type
                </TableCell>

                <TableCell
                  sx={{
                    color: "white",
                    fontWeight: "bold",
                  }}
                >
                  Date
                </TableCell>


            <TableCell
              sx={{
                color: "white",
                fontWeight: "bold",
              }}
            >
              Action
            </TableCell>
              </TableRow>

            </TableHead>

            <TableBody>

              {paginatedPayments.length > 0 ? (

                paginatedPayments.map(
                  (payment, index) => (

                    <TableRow
                      key={index}
                      hover
                    >

                      <TableCell>
                        {
                          payment.receipt_number
                        }
                      </TableCell>

                      <TableCell>
                        {payment.ipd_id}
                      </TableCell>

                      <TableCell>
                        {payment.bill_id}
                      </TableCell>

                      <TableCell>
                        ₹{payment.amount}
                      </TableCell>

                      <TableCell>
                        {
                          payment.payment_method
                        }
                      </TableCell>

                      <TableCell>

                        <Chip
                          label={
                            payment.payment_type
                          }
                          color={
                            payment.payment_type ===
                            "final"
                              ? "success"
                              : payment.payment_type ===
                                "refund"
                              ? "error"
                              : "info"
                          }
                          size="small"
                        />

                      </TableCell>

                      <TableCell>
                        {new Date(
                          payment.payment_date
                        ).toLocaleDateString()}
                      </TableCell>

                        <TableCell>
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<PaymentsIcon />}
                            onClick={() =>
                              downloadReceipt(payment.id)
                            }
                          >
                            Receipt
                          </Button>
                        </TableCell>


                    </TableRow>
                  )
                )

              ) : (

                <TableRow>

                  <TableCell
                    colSpan={7}
                    align="center"
                  >
                    No payments found
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

      {payments.length > rowsPerPage && (

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
            onChange={(e, value) =>
              setPage(value)
            }
            color="primary"
            shape="rounded"
          />
        </Box>
      )}

    </Box>
  );
}

