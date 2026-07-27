import React, { useState } from "react";
import axios from "axios";

import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  MenuItem,
  Button,
  CircularProgress,
  InputAdornment,
  IconButton,
  Divider,
} from "@mui/material";

import {
  Person,
  Email,
  Phone,
  Lock,
  Home,
  Bloodtype,
  Wc,
  CalendarMonth,
  Visibility,
  VisibilityOff,
  LocalHospital,
} from "@mui/icons-material";

import { toast } from "react-toastify";

import logo from "../images/caredesk360logonew.jpeg";

const genderOptions = ["male", "female", "other"];

const bloodGroups = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
];

const PatientRegister = () => {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    mobile: "",
    address: "",
    gender: "",
    dob: "",
    blood_group: "",
    status: 1,
  });

  const handleChange = (e) => {
    let { name, value } = e.target;

    if (name === "mobile") {
      value = value.replace(/\D/g, "").slice(0, 10);
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      password: "",
      mobile: "",
      address: "",
      gender: "",
      dob: "",
      blood_group: "",
      status: 1,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim())
      return toast.error("Patient name is required.");

    if (!formData.email.trim())
      return toast.error("Email is required.");

    if (!formData.password.trim())
      return toast.error("Password is required.");

    try {
      setLoading(true);

      const res = await axios.post(
        `${process.env.REACT_APP_URL}/api/patient/create`,
        formData,
        {
          withCredentials: true,
        }
      );

      toast.success(
        res.data.message || "User created successfully."
      );

      resetForm();
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Failed to create patient."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg,#4f7cff 0%,#6a5af9 100%)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        p: {
          xs: 2,
          md: 4,
        },
      }}
    >
      <Paper
        elevation={18}
        sx={{
          width: "100%",
          maxWidth: 1400,
          borderRadius: 6,
          overflow: "hidden",
        }}
      >
        <Grid container>
          {/* LEFT PANEL */}

          <Grid
            item
            size={{ xs: 12, md: 5 }}
            sx={{
              display: {
                xs: "none",
                md: "flex",
              },
              background:
                "linear-gradient(180deg,#0F52BA,#5F9AA6)",
              color: "#fff",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              p: 6,
              position: "relative",
            }}
          >
            <Box
              sx={{
                width: 130,
                height: 130,
                borderRadius: "0%",
                bgcolor: "#fff",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                mb: 4,
              }}
            >
              <img
                src={logo}
                alt="logo"
                style={{
                  width: "95%",
                }}
              />
            </Box>

            <Typography
              variant="h3"
              fontWeight={700}
              textAlign="center"
            >
              CareDesk360
            </Typography>

            <Typography
              mt={2}
              textAlign="center"
              sx={{
                opacity: .9,
                fontSize: 17,
                lineHeight: 1.8,
              }}
            >
              Smart Healthcare Management

              <br />

              Register patients securely with
              our modern healthcare platform.

            </Typography>

            <Divider
              sx={{
                my: 4,
                width: "70%",
                bgcolor: "rgba(255,255,255,.25)",
              }}
            />

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                mb: 2,
              }}
            >
              <LocalHospital sx={{ fontSize: 35 }} />

              <Typography fontSize={18}>
                Secure Patient Records
              </Typography>
            </Box>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
              }}
            >
              <LocalHospital sx={{ fontSize: 35 }} />

              <Typography fontSize={18}>
                Trusted by Healthcare Professionals
              </Typography>
            </Box>
          </Grid>

          {/* RIGHT PANEL */}

          <Grid
            item
            size={{ xs: 12, md: 7 }}
            sx={{
              bgcolor: "#fff",
              p: {
                xs: 3,
                sm: 4,
                md: 5,
              },
            }}
          >
            <Typography
              variant="h4"
              fontWeight={700}
            >
              Patient Registration
            </Typography>

            <Typography
              color="text.secondary"
              mt={1}
              mb={4}
            >
              Fill in the details below to create a new patient account.
            </Typography>

            <form onSubmit={handleSubmit}>

              <Grid container spacing={3}>
                {/* Patient Name */}

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    required
                    label="Patient Name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Person color="primary" />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "14px",
                        bgcolor: "#fafafa",
                        transition: ".3s",
                        "&:hover": {
                          bgcolor: "#fff",
                        },
                        "&.Mui-focused": {
                          bgcolor: "#fff",
                        },
                      },
                    }}
                  />
                </Grid>

                {/* Email */}

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    required
                    type="email"
                    label="Email Address"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Email color="primary" />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "14px",
                        bgcolor: "#fafafa",
                      },
                    }}
                  />
                </Grid>

                {/* Password */}

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    required
                    label="Password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock color="primary" />
                        </InputAdornment>
                      ),

                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() =>
                              setShowPassword(!showPassword)
                            }
                          >
                            {showPassword ? (
                              <VisibilityOff />
                            ) : (
                              <Visibility />
                            )}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "14px",
                        bgcolor: "#fafafa",
                      },
                    }}
                  />
                </Grid>

                {/* Mobile */}

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Mobile Number"
                    name="mobile"
                    value={formData.mobile}
                    onChange={handleChange}
                    inputProps={{
                      maxLength: 10,
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Phone color="primary" />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "14px",
                        bgcolor: "#fafafa",
                      },
                    }}
                  />
                </Grid>

                {/* Address */}

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment
                          position="start"
                          sx={{
                            alignSelf: "flex-start",
                            mt: 1.5,
                          }}
                        >
                          <Home color="primary" />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "14px",
                        bgcolor: "#fafafa",
                      },
                    }}
                  />
                </Grid>

                {/* Gender */}

                <Grid item xs={12} md={6}>
                  <TextField
                    select
                    fullWidth
                    label="Gender"
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Wc color="primary" />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "14px",
                        bgcolor: "#fafafa",
                      },
                    }}
                  >
                    {genderOptions.map((gender) => (
                      <MenuItem
                        key={gender}
                        value={gender}
                      >
                        {gender.charAt(0).toUpperCase() +
                          gender.slice(1)}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                {/* DOB */}

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Date of Birth"
                    name="dob"
                    value={formData.dob}
                    onChange={handleChange}
                    InputLabelProps={{
                      shrink: true,
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <CalendarMonth color="primary" />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "14px",
                        bgcolor: "#fafafa",
                      },
                    }}
                  />
                </Grid>

                {/* Blood Group */}

                <Grid item xs={12} md={6}>
                  <TextField
                    select
                    fullWidth
                    label="Blood Group"
                    name="blood_group"
                    value={formData.blood_group}
                    onChange={handleChange}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Bloodtype color="primary" />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "14px",
                        bgcolor: "#fafafa",
                      },
                    }}
                  >
                    {bloodGroups.map((group) => (
                      <MenuItem
                        key={group}
                        value={group}
                      >
                        {group}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                {/* Status */}

                <Grid item xs={12} md={6}>
                  <TextField
                    select
                    fullWidth
                    label="Status"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "14px",
                        bgcolor: "#fafafa",
                      },
                    }}
                  >
                    <MenuItem value={1}>Active</MenuItem>
                    <MenuItem value={0}>Inactive</MenuItem>
                  </TextField>
                </Grid>
                {/* Action Buttons */}

                <Grid
                  item
                  xs={12}
                  sx={{
                    mt: 2,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 2,
                  }}
                >
                  <Typography
                    variant="body2"
                    color="text.secondary"
                  >
                    Please verify all patient details before creating the account.
                  </Typography>

                  <Box
                    sx={{
                      display: "flex",
                      gap: 2,
                      width: {
                        xs: "100%",
                        sm: "auto",
                      },
                    }}
                  >
                    <Button
                      variant="outlined"
                      onClick={resetForm}
                      disabled={loading}
                      sx={{
                        flex: 1,
                        height: 52,
                        borderRadius: "14px",
                        textTransform: "none",
                        fontWeight: 600,
                        borderColor: "#5F9AA6",
                        color: "#5F9AA6",
                        px: 4,

                        "&:hover": {
                          borderColor: "#0F52BA",
                          color: "#0F52BA",
                          backgroundColor: "#eef5ff",
                        },
                      }}
                    >
                      Reset
                    </Button>

                    <Button
                      type="submit"
                      disabled={loading}
                      variant="contained"
                      sx={{
                        flex: 1,
                        height: 52,
                        px: 5,
                        borderRadius: "14px",
                        textTransform: "none",
                        fontSize: 16,
                        fontWeight: 700,
                        color: "#fff",

                        background:
                          "linear-gradient(90deg,#0F52BA,#5F9AA6)",

                        boxShadow:
                          "0 10px 30px rgba(15,82,186,.35)",

                        transition: ".3s",

                        "&:hover": {
                          transform: "translateY(-2px)",
                          boxShadow:
                            "0 15px 35px rgba(15,82,186,.45)",

                          background:
                            "linear-gradient(90deg,#0d47a1,#4e8d99)",
                        },
                      }}
                    >
                      {loading ? (
                        <CircularProgress
                          size={24}
                          color="inherit"
                        />
                      ) : (
                        "Submit"
                      )}
                    </Button>
                  </Box>
                </Grid>

              </Grid>
            </form>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default PatientRegister;