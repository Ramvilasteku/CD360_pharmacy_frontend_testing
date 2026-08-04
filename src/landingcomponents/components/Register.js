import React, { useEffect, useState } from "react";
import axios from "axios";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  MenuItem,
  CircularProgress,
  Typography,
  Grid,
  Paper,
  Divider,
  Box,
  IconButton,
} from "@mui/material";
import logo from "../Assets/caredesk360.png";
import CloseIcon from "@mui/icons-material/Close";

export default function Register({ open, onClose, selectedPlan }) {
  const initialForm = {
    companyName: "",
    gst: "",
    adminName: "",
    email: "",
    mobile: "",
    password: "",
    planId: "",
    billingCycle: "",
  };

  const [form, setForm] = useState(initialForm);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        ...initialForm,
        planId: selectedPlan?.id || "",
      });
    } else {
      setForm(initialForm);
      setLoading(false);
    }
  }, [open, selectedPlan]);


  const selectedPrice =
    form.billingCycle === "QUARTERLY"
      ? {
          display: selectedPlan?.quarterly,
          total: selectedPlan?.quarterlyPrice,
        }
      : form.billingCycle === "YEARLY"
        ? {
            display: selectedPlan?.annual,
            total: selectedPlan?.yearlyPrice,
          }
        : {
            display: "",
            total: "",
          };

  const yearlySaving =
    form.billingCycle === "YEARLY" ? selectedPlan?.monthlyPrice * 2 : 0;

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleClose = () => {
    setForm(initialForm);
    onClose();
  };

  const register = async (e) => {
    e.preventDefault();
    const paymentTab = window.open("", "_blank");

    try {
      setLoading(true);

      console.log("Sending registration:", form);

      // Step 1: Register
      const registerResponse = await axios.post(
        `${process.env.REACT_APP_PAYMENT_BACKEND_URL}/api/phonepe/register`,
        form,
      );

      const registrationId = registerResponse.data.registrationId;

      console.log("Registration ID:", registrationId);

      // Step 2: Create Payment
      const paymentResponse = await axios.post(
        `${process.env.REACT_APP_PAYMENT_BACKEND_URL}/api/phonepe/create-payment`,
        {
          registrationId,
        },
      );

      console.log("Payment Response:", paymentResponse.data);

      // Step 3: Redirect to PhonePe payment page
      // Replace paymentUrl with the actual key returned by your API
      paymentTab.location.href = paymentResponse.data.redirectUrl;

      onClose();
    } catch (err) {
      console.error(err);
      if (paymentTab) paymentTab.close();

      alert(err.response?.data?.message || "Registration Failed");
    } finally {
      setLoading(false);
    }
  };

  const summaryRow = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    py: 1,
  };

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : handleClose}
      fullWidth
      maxWidth="lg"
      PaperProps={{
        sx: {
          width: {
            xs: "95%",
            sm: "95%",
            md: "1000px",
          },
          maxWidth: "1000px",
          height: {
            xs: "100vh",
            sm: "90vh",
          },
          m: {
            xs: 0,
            sm: 2,
          },
          borderRadius: {
            xs: 4,
            sm: 4,
          },
          overflow: "hidden",
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          height: "100%",
          overflow: "hidden",
        }}
      >
        {/* Left Panel */}

        <Box
          className="modal-left"
          sx={{
            width: "38%",
            display: {
              xs: "none",
              md: "flex",
            },
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            borderRight: "1px solid #ECECEC",
            p: 5,
          }}
        >
          <Box
            component="img"
            src={logo}
            sx={{
              width: 170,
              mb: 3,
            }}
          />

          <Typography
            variant="h4"
            fontWeight={800}
            sx={{
              opacity: 0.9,
              lineHeight: 1.8,
              color: "#233D81",
            }}
          >
            CareDesk360
          </Typography>

          <Typography
            sx={{
              opacity: 0.9,
              lineHeight: 1.8,
              color: "#233D81",
            }}
          >
            Intelligent Practice Management & Digital Growth Platform for Modern
            Healthcare.
          </Typography>
        </Box>

        {/* Right Panel */}
        <Box
          sx={{
            width: {
              xs: "100%",
              md: "62%",
            },
            display: "flex",
            flexDirection: "column",
            height: "100%",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <Box
            sx={{
              position: "sticky",
              top: 0,
              zIndex: 10,
              bgcolor: "#fff",
              borderBottom: "1px solid #e5e7eb",
              px: { xs: 2, sm: 4 },
              py: 1.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box
              sx={{
                flexShrink: 0,
                position: "sticky",
                top: 0,
                zIndex: 20,
                bgcolor: "#fff",
                py: 1.5,
              }}
            >
              <DialogTitle
                sx={{
                  p: 0,
                  fontWeight: 700,
                  fontSize: {
                    xs: 14,
                    sm: 24,
                  },

                  color: "#1976d2",
                }}
              >
                Create Your CareDesk360 Account
              </DialogTitle>

              <Typography
                color="text.secondary"
                sx={{
                  display: { xs: "none", md: "block" },
                  fontSize: {
                    xs: 9,
                    sm: 16,
                  },
                }}
              >
                Complete your registration and proceed to secure payment.
              </Typography>
            </Box>

            <Box>
              <IconButton onClick={handleClose} disabled={loading}>
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>

          {/* Form And Footer */}
          <form
            onSubmit={register}
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              overflow: "hidden",
            }}
          >
            {/* Form Fileds */}
            <DialogContent
              sx={{
                flex: 1,
                overflowY: "auto",
                px: {
                  xs: 2,
                  sm: 4,
                },
                py: 1.5,

                "&::-webkit-scrollbar": {
                  width: 6,
                },

                "&::-webkit-scrollbar-thumb": {
                  bgcolor: "#C7C7C7",
                  borderRadius: 5,
                },
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  gap: { xs: 0.5, md: 2 },
                  mt: 0.4,
                  flexDirection: { xs: "column", sm: "row" },
                }}
              >
                <TextField
                  fullWidth
                  margin="normal"
                  label="Enter The Hospital/Clinic Name"
                  name="companyName"
                  value={form.companyName}
                  onChange={handleChange}
                  required
                />

                <TextField
                  fullWidth
                  margin="normal"
                  label="GST No (Optional)"
                  name="gst"
                  value={form.gst}
                  onChange={handleChange}
                />
              </Box>

              <Box
                sx={{
                  display: "flex",
                  gap: { xs: 0.5, md: 2 },
                  mt: 0.4,
                  flexDirection: { xs: "column", sm: "row" },
                }}
              >
                <TextField
                  fullWidth
                  margin="normal"
                  label="Enter The Applicant Name"
                  name="adminName"
                  value={form.adminName}
                  onChange={handleChange}
                  required
                />

                <TextField
                  fullWidth
                  margin="normal"
                  label="Enter The Mobile No"
                  name="mobile"
                  value={form.mobile}
                  onChange={handleChange}
                  required
                />
              </Box>

              <Box
                sx={{
                  display: "flex",
                  gap: { xs: 0.5, md: 2 },
                  mt: 0.4,
                  flexDirection: { xs: "column", sm: "row" },
                }}
              >
                <TextField
                  fullWidth
                  margin="normal"
                  label="Enter The Hospital/Clinic Email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                />

                <TextField
                  fullWidth
                  margin="normal"
                  label="Create The Password"
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
              </Box>

              <TextField
                select
                fullWidth
                margin="normal"
                label="Billing Cycle"
                name="billingCycle"
                value={form.billingCycle}
                onChange={handleChange}
                required
              >
                <MenuItem value="QUARTERLY">Quarterly</MenuItem>
                <MenuItem value="YEARLY">Yearly</MenuItem>
              </TextField>

              <Paper
                sx={{
                  mt: 2,
                  p: 2.5,
                  borderRadius: 3,
                  bgcolor: "#fafafa",
                  border: "1px solid #e0e0e0",
                }}
              >
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                  Payment Summary
                </Typography>

                <Box sx={summaryRow}>
                  <Typography color="text.secondary">Selected Plan</Typography>
                  <Typography fontWeight={600}>{selectedPlan?.name}</Typography>
                </Box>

                <Box sx={summaryRow}>
                  <Typography color="text.secondary">Billing Cycle</Typography>
                  <Typography fontWeight={600}>
                    {form.billingCycle || "--"}
                  </Typography>
                </Box>

                <Box sx={summaryRow}>
                  <Typography color="text.secondary">
                    Amount
                    {form.billingCycle === "YEARLY" && yearlySaving > 0 && (
                      <Typography
                        component="span"
                        sx={{
                          ml: 0.3,
                          color: "success.main",
                          fontWeight: 600,
                          fontSize: "0.8rem",
                        }}
                      >
                        (2 Months Free)
                      </Typography>
                    )}
                  </Typography>
                  <Box textAlign="right">
                    <Typography fontWeight={600}>
                      {selectedPrice.display}
                      {form.billingCycle === "YEARLY" && yearlySaving > 0 && (
                        <Typography
                          component="span"
                          sx={{
                            ml: 0.5,
                            color: "success.main",
                            fontWeight: 600,
                            fontSize: "0.8rem",
                          }}
                        >
                          (Save ₹{yearlySaving.toLocaleString("en-IN")} )
                        </Typography>
                      )}
                    </Typography>
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Typography variant="h6" fontWeight={700}>
                    Total
                  </Typography>

                  <Typography variant="h5" fontWeight={800} color="#1565C0">
                    {selectedPrice.total
                      ? `₹${Number(selectedPrice.total).toLocaleString("en-IN")}`
                      : "--"}
                  </Typography>
                </Box>
              </Paper>
            </DialogContent>

            {/* Submit Button */}
            <div className="button-wrapper">
              <DialogActions
                sx={{
                  flexShrink: 0,
                  position: "sticky",
                  bottom: 0,
                  bgcolor: "#fff",
                  borderTop: "1px solid #ECECEC",
                  px: {
                    xs: 2,
                    sm: 4,
                  },
                  py: 2,
                }}
              >
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={loading}
                  sx={{
                    px: 1,
                    borderRadius: 2,
                  }}
                >
                  {loading ? (
                    <>
                      <CircularProgress
                        size={18}
                        color="inherit"
                        sx={{ mr: 1 }}
                      />
                      Please Wait...
                    </>
                  ) : (
                    "Continue to Payment"
                  )}
                </Button>
              </DialogActions>
            </div>
          </form>
        </Box>
      </Box>
    </Dialog>
  );
}
