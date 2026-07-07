import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  TextField,
  Button,
  Typography,
  Box,
  IconButton,
  Snackbar,
  Alert,
  MenuItem,
  CircularProgress,
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";
import BusinessIcon from "@mui/icons-material/Business";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

import axios from "axios";
import "./contactmodal.css";
import logo from "../Assets/caredesk360.png";

export default function Contactmodal({ open, handleClose }) {
  const [formData, setFormData] = useState({
    full_name: "",
    hospital_name: "",
    mobile: "",
    email: "",
    address: "",
    plan: "",
    date: "",
    time: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const validateForm = () => {
    let newErrors = {};

    if (!formData.full_name.trim())
      newErrors.full_name = "Full name is required";

    if (!formData.hospital_name.trim())
      newErrors.hospital_name = "Hospital name is required";

    if (!formData.mobile.trim()) newErrors.mobile = "Mobile number is required";
    else if (!/^[0-9]{10}$/.test(formData.mobile))
      newErrors.mobile = "Enter a valid 10-digit mobile number";

    if (!formData.email.trim()) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email))
      newErrors.email = "Enter a valid email";

    if (!formData.plan) newErrors.plan = "Please select a plan";

    if (!formData.address.trim()) newErrors.address = "Address is required";

    if (!formData.date) newErrors.date = "Preferred date is required";

    if (!formData.time) newErrors.time = "Preferred time is required";

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      await axios.post(
        `${process.env.REACT_APP_URL}/landingpage/contact/post`,
        formData,
      );

      setSnackbar({
        open: true,
        message: "Registration Successful ✅",
        severity: "success",
      });

      setShowSuccess(true);

      setTimeout(() => {
        setShowSuccess(false);
        handleModalClose();
      }, 2000);
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Something went wrong ❌",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      full_name: "",
      hospital_name: "",
      mobile: "",
      email: "",
      address: "",
      plan: "",
      date: "",
      time: "",
    });

    setErrors({});
  };

  const handleModalClose = () => {
    resetForm();
    handleClose();
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={handleModalClose}
        fullWidth
        maxWidth={false}
        PaperProps={{
          sx: {
            width: {
              xs: "96%",
              sm: "92%",
              md: "800px",
              lg: "1000px",
            },
            maxWidth: "1150px",
            borderRadius: "20px",
            overflow: "hidden",
            boxShadow: "0 30px 90px rgba(0,0,0,.25)",
          },
        }}
      >
        <DialogContent sx={{ p: 0 }}>
          <Box className="modal-wrapper">
            {/* LEFT PANEL */}

            <Box className="modal-left">
              <img src={logo} width={180} />
              <Typography variant="h3" fontWeight={900} color="#184791" zIndex={100}>
                CareDesk360
              </Typography>

              {/* <Typography variant="body1">
                Empowering Hospitals with Intelligent Practice Management,
                Patient Engagement, Billing & Growth Solutions.
              </Typography> */}
            </Box>

            {/* RIGHT PANEL */}

            <Box className="modal-right">
              {showSuccess && (
                <Box className="success-overlay">
                  <CheckCircleIcon className="success-icon" />

                  <Typography variant="h5" fontWeight={700}>
                    Registration Successful
                  </Typography>

                  <Typography color="text.secondary">
                    Thank you for your request.
                  </Typography>
                </Box>
              )}

              <IconButton
                onClick={handleModalClose}
                sx={{
                  position: "absolute",
                  top: 16,
                  right: 16,
                }}
              >
                <CloseIcon />
              </IconButton>

              <Typography variant="h5" mb={3}>
                Request Form
              </Typography>

              <Box className="form-fields">
                <div className="row">
                  <TextField
                    label="Full Name"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    error={!!errors.full_name}
                    helperText={errors.full_name}
                  />

                  <TextField
                    label="Hospital Name"
                    name="hospital_name"
                    value={formData.hospital_name}
                    onChange={handleChange}
                    error={!!errors.hospital_name}
                    helperText={errors.hospital_name}
                  />
                </div>

                <div className="row">
                  <TextField
                    label="Mobile Number"
                    name="mobile"
                    value={formData.mobile}
                    onChange={handleChange}
                    error={!!errors.mobile}
                    helperText={errors.mobile}
                  />

                  <TextField
                    label="Email Address"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    error={!!errors.email}
                    helperText={errors.email}
                  />
                </div>

                <div className="row">
                  <TextField
                    type="date"
                    label="Preferred Date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    InputLabelProps={{ shrink: true }}
                    error={!!errors.date}
                    helperText={errors.date}
                  />

                  <TextField
                    type="time"
                    label="Preferred Time"
                    name="time"
                    value={formData.time}
                    onChange={handleChange}
                    InputLabelProps={{ shrink: true }}
                    error={!!errors.time}
                    helperText={errors.time}
                  />
                </div>

                <TextField
                  select
                  label="Select Plan"
                  name="plan"
                  className="address"
                  value={formData.plan}
                  onChange={handleChange}
                  error={!!errors.plan}
                  helperText={errors.plan}
                  
                >
                  <MenuItem value="">Select Plan</MenuItem>

                  <MenuItem value="Growth">Growth</MenuItem>

                  <MenuItem value="Scale">Scale ⭐ Best Seller</MenuItem>

                  <MenuItem value="Legacy">Legacy</MenuItem>

                  <MenuItem value="Scale Advantage">Scale Advantage</MenuItem>

                  <MenuItem value="Scale Advantage Plus">
                    Scale Advantage Plus
                  </MenuItem>

                  <MenuItem value="Enterprise">Enterprise</MenuItem>

                  <MenuItem value="Digital Visibility Monthly">
                    Digital Visibility Monthly
                  </MenuItem>

                  <MenuItem value="Digital Visibility Annual">
                    Digital Visibility Annual
                  </MenuItem>
                </TextField>

                <TextField
                  multiline
                  rows={3}
                  label="Address"
                  className="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  error={!!errors.address}
                  helperText={errors.address}
                />

                <div className="button-wrapper">
                  <Button
                    variant="contained"
                    disabled={loading}
                    onClick={handleSubmit}
                  >
                    {loading ? (
                      <>
                        <CircularProgress
                          size={22}
                          sx={{
                            color: "#fff",
                            mr: 1,
                          }}
                        />
                        Submitting...
                      </>
                    ) : (
                      "Submit Request"
                    )}
                  </Button>
                </div>
              </Box>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() =>
          setSnackbar({
            ...snackbar,
            open: false,
          })
        }
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
      >
        <Alert severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
