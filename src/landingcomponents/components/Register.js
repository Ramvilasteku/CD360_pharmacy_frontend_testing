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
  Paper,
  Divider,
  Box,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

import logo from "../Assets/caredesk360.png";
import { GST_RATE, inr, normalizeCycle } from "./planPricing";


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

export default function Register({
  open,
  onClose,
  selectedPlan,
  defaultBillingCycle,
}) {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);

  const cycles = selectedPlan?.cycles || [];

  useEffect(() => {
    if (!open) {
      setForm(initialForm);
      setLoading(false);
      return;
    }

    const wanted = normalizeCycle(defaultBillingCycle);
    const match = cycles.find((c) => c.value === wanted);

    setForm({
      ...initialForm,
      planId: selectedPlan?.id || "",
      // plans with a single cycle lock to it automatically
      billingCycle:
        match?.value || (cycles.length === 1 ? cycles[0].value : ""),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedPlan, defaultBillingCycle]);

  /* ---------- price maths ---------- */

  const activeCycle = cycles.find((c) => c.value === form.billingCycle) || null;
  const lineItems = activeCycle?.lineItems || [];

  const subTotal = lineItems.reduce((sum, i) => sum + Number(i.amount || 0), 0);
  const gstAmount = Math.round(subTotal * GST_RATE);
  const grandTotal = subTotal + gstAmount;

  const isFree = Boolean(activeCycle) && grandTotal === 0;

  /* ---------- handlers ---------- */

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

    if (!form.billingCycle) {
      alert("Please select a billing cycle");
      return;
    }

    if (!selectedPlan?.id) {
      alert("This plan is unavailable right now. Please try again shortly.");
      return;
    }

    // free plans never touch the payment gateway
    const paymentTab = isFree ? null : window.open("", "_blank");

    try {
      setLoading(true);

      const registerResponse = await axios.post(
        `${process.env.REACT_APP_PAYMENT_BACKEND_URL}/api/phonepe/register`,
        form,
      );
      const registrationId = registerResponse.data.registrationId;

      if (isFree) {
        alert("Registration successful. Our team will contact you shortly.");
        onClose();
        return;
      }

      const paymentResponse = await axios.post(
        `${process.env.REACT_APP_PAYMENT_BACKEND_URL}/api/phonepe/create-payment`,
        {
          registrationId,
        },
      );

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
    gap: 2,
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
          width: { xs: "95%", sm: "95%", md: "1000px" },
          maxWidth: "1000px",
          height: { xs: "100vh", sm: "90vh" },
          m: { xs: 0, sm: 2 },
          borderRadius: 4,
          overflow: "hidden",
        },
      }}
    >
      <Box sx={{ display: "flex", height: "100%", overflow: "hidden" }}>
        {/* ---------- Left Panel ---------- */}
        <Box
          className="modal-left"
          sx={{
            width: "38%",
            display: { xs: "none", md: "flex" },
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            borderRight: "1px solid #ECECEC",
            p: 5,
          }}
        >
          <Box component="img" src={logo} sx={{ width: 170, mb: 3 }} />

          <Typography
            variant="h4"
            fontWeight={800}
            sx={{ opacity: 0.9, lineHeight: 1.8, color: "#233D81" }}
          >
            CareDesk360
          </Typography>

          <Typography sx={{ opacity: 0.9, lineHeight: 1.8, color: "#233D81" }}>
            Intelligent Practice Management &amp; Digital Growth Platform for
            Modern Healthcare.
          </Typography>
        </Box>

        {/* ---------- Right Panel ---------- */}
        <Box
          sx={{
            width: { xs: "100%", md: "62%" },
            display: "flex",
            flexDirection: "column",
            height: "100%",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <Box
            sx={{
              flexShrink: 0,
              bgcolor: "#fff",
              borderBottom: "1px solid #e5e7eb",
              px: { xs: 2, sm: 4 },
              py: 1.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ py: 1.5 }}>
              <DialogTitle
                sx={{
                  p: 0,
                  fontWeight: 700,
                  fontSize: { xs: 14, sm: 24 },
                  color: "#1976d2",
                }}
              >
                Create Your CareDesk360 Account
              </DialogTitle>

              <Typography
                color="text.secondary"
                sx={{
                  display: { xs: "none", md: "block" },
                  fontSize: { xs: 9, sm: 16 },
                }}
              >
                {isFree
                  ? "Complete your registration to activate your free plan."
                  : "Complete your registration and proceed to secure payment."}
              </Typography>
            </Box>

            <IconButton onClick={handleClose} disabled={loading}>
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Form + Footer */}
          <form
            onSubmit={register}
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              overflow: "hidden",
            }}
          >
            <DialogContent
              sx={{
                flex: 1,
                overflowY: "auto",
                px: { xs: 2, sm: 4 },
                py: 1.5,
                "&::-webkit-scrollbar": { width: 6 },
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

              {/* ---------- PAYMENT SUMMARY ---------- */}
              <Paper
                elevation={0}
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
                  <Typography fontWeight={600}>
                    {selectedPlan?.name || "--"}
                  </Typography>
                </Box>

                <Box sx={summaryRow}>
                  <Typography color="text.secondary">Billing Cycle</Typography>

                  {cycles.length > 1 ? (
                    <TextField
                      select
                      size="small"
                      name="billingCycle"
                      value={form.billingCycle}
                      onChange={handleChange}
                      SelectProps={{ displayEmpty: true }}
                      sx={{
                        minWidth: 170,
                        "& .MuiOutlinedInput-root": {
                          bgcolor: "#fff",
                          borderRadius: 2,
                          fontWeight: 600,
                        },
                      }}
                    >
                      <MenuItem value="" disabled>
                        Select cycle
                      </MenuItem>
                      {cycles.map((c) => (
                        <MenuItem key={c.value} value={c.value}>
                          {c.label} {c.note}
                        </MenuItem>
                      ))}
                    </TextField>
                  ) : (
                    <Typography fontWeight={600}>
                      {activeCycle?.label || "--"}{" "}
                      <Typography
                        component="span"
                        sx={{ fontSize: "0.8rem", color: "text.secondary" }}
                      >
                        {activeCycle?.note}
                      </Typography>
                    </Typography>
                  )}
                </Box>

                {/* one row per charge */}
                {lineItems.map((item) => (
                  <Box sx={summaryRow} key={item.label}>
                    <Typography color="text.secondary" sx={{ fontSize: 14 }}>
                      {item.label}
                    </Typography>
                    <Typography
                      fontWeight={600}
                      color={item.amount === 0 ? "success.main" : "inherit"}
                      sx={{ whiteSpace: "nowrap" }}
                    >
                      {item.amount === 0 ? "FREE" : inr(item.amount)}
                    </Typography>
                  </Box>
                ))}

                <Divider sx={{ my: 1.5 }} />

                <Box sx={summaryRow}>
                  <Typography color="text.secondary">Sub Total</Typography>
                  <Typography fontWeight={600}>
                    {activeCycle ? inr(subTotal) : "--"}
                  </Typography>
                </Box>

                <Box sx={summaryRow}>
                  <Typography color="text.secondary">GST (18%)</Typography>
                  <Typography fontWeight={600}>
                    {activeCycle ? inr(gstAmount) : "--"}
                  </Typography>
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
                    Total{" "}
                    <Typography
                      component="span"
                      sx={{ fontSize: "0.8rem", color: "text.secondary" }}
                    >
                      (incl. GST)
                    </Typography>
                  </Typography>

                  <Typography variant="h5" fontWeight={800} color="#1565C0">
                    {activeCycle ? inr(grandTotal) : "--"}
                  </Typography>
                </Box>
              </Paper>
            </DialogContent>

            {/* Submit */}
            <div className="button-wrapper">
              <DialogActions
                sx={{
                  flexShrink: 0,
                  bgcolor: "#fff",
                  borderTop: "1px solid #ECECEC",
                  px: { xs: 2, sm: 4 },
                  py: 2,
                }}
              >
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={loading || !form.billingCycle}
                  sx={{ px: 3, borderRadius: 2 }}
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
                  ) : isFree ? (
                    "Create Free Account"
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
