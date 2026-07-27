import React, { useState } from "react";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import InputAdornment from "@mui/material/InputAdornment";
import EmailIcon from "@mui/icons-material/Email";
import LockIcon from "@mui/icons-material/Lock";
import { useLocation, useNavigate } from "react-router-dom";
import ForgotPassword from "../Pages/ForgotPassword";
import CircularProgress from "@mui/material/CircularProgress";
import Snackbar from "@mui/material/Snackbar";
import MuiAlert from "@mui/material/Alert";
import logo from "../images/caredesk360logonew.jpeg";
import { useRef } from "react";
import { useEffect } from "react";
import axios from "axios";
import Fade from "@mui/material/Fade";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import IconButton from "@mui/material/IconButton";
import KeyboardBackspaceIcon from "@mui/icons-material/KeyboardBackspace";
import Link from "@mui/material/Link";
import CreatePatientDialog from "./PatientRegister";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const [openForgot, setOpenForgot] = useState(false);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success", // success | error | warning | info
  });

  const Alert = React.forwardRef(function Alert(props, ref) {
    return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
  });

  const submitdetails = async () => {
    setLoading(true);
    setLoginStep("validating");
    try {
      const response = await fetch(process.env.REACT_APP_LOGIN, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      console.log("Login response data:", data);
      if (!response.ok) {
        setSnackbar({
          open: true,
          message: data.message || "Login failed",
          severity: "error",
        });
        return;
      }

      // if (data.user.role === "admin") {
      //   navigate("/AdminDashboard");
      //   localStorage.setItem("adminId", data.user.id);
      //   localStorage.setItem("adminName", data.user.name);
      //   localStorage.setItem("role", data.user.role);

      // } else if (data.user.role === "doctor") {
      //   localStorage.setItem("userId", data.user.id);
      //   localStorage.setItem("userName", data.user.name);
      //   localStorage.setItem("role", data.user.role);
      //   localStorage.setItem("adminId", data.user.adminId);
      //   navigate("/doctor/dashboard");
      // } else if (data.user.role === "receptionist") {
      //   localStorage.setItem("userId", data.user.id);
      //   localStorage.setItem("userName", data.user.name);
      //   localStorage.setItem("role", data.user.role);
      //   localStorage.setItem("adminId", data.user.adminId);
      //   navigate("/receptionist/dashboard");
      // } else if (data.user.role === "client") {
      //   localStorage.setItem("id", data.user.id);
      //   localStorage.setItem("userName", data.user.name);
      //   localStorage.setItem("adminId", data.user.adminId);
      //   localStorage.setItem("role", data.user.role);

      //   navigate("/client");
      // } else {
      //   navigate("/");
      // }
      // navigate("/otp-verify");

      setLoginStep("sendingOtp");

      setSnackbar({
        open: true,
        message: "Login successful. OTP has been sent to your email.",
        severity: "success",
      });

      localStorage.setItem("otpStartTime", Date.now().toString());

      navigate("/otp-verify");
    } catch (error) {
      console.error("Network error:", error);
      setSnackbar({
        open: true,
        message: "Unable to connect to the server. Please try again.",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const location = useLocation();

  const isOtpStep = location.pathname === "/otp-verify";

  const OTP_LENGTH = 6;

  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(""));
  const inputRefs = useRef([]);

  const [timeLeft, setTimeLeft] = useState(0);
  const [expired, setExpired] = useState(false);
  const [loginStep, setLoginStep] = useState("login");

  useEffect(() => {
    if (!isOtpStep) return;

    const startTime = Number(localStorage.getItem("otpStartTime"));

    if (!startTime) {
      navigate("/login");
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);

      const remaining = 600 - elapsed;

      if (remaining <= 0) {
        clearInterval(interval);

        localStorage.removeItem("otpStartTime");

        setExpired(true);

        setTimeout(() => {
          navigate("/login");
        }, 1500);
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isOtpStep, navigate]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;

    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const handleChange = (value, index) => {
    if (!/^\d?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;

    setOtp(newOtp);

    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData("text").slice(0, OTP_LENGTH);

    if (!/^\d+$/.test(pasted)) return;

    const values = pasted.split("");

    setOtp(values);

    inputRefs.current[values.length - 1]?.focus();
  };

  const handleOtpVerify = async () => {
    const enteredOtp = otp.join("");

    if (enteredOtp.length !== OTP_LENGTH) {
      setSnackbar({
        open: true,
        message: "Please enter the complete 6-digit OTP.",
        severity: "warning",
      });

      return;
    }

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_URL}/verify-otp/`,
        {
          otp: enteredOtp,
        },
        {
          withCredentials: true,
        },
      );

      const data = response.data.user;

      setSnackbar({
        open: true,
        message: "Verification successful. Redirecting...",
        severity: "success",
      });

      if (data.role === "admin") {
        localStorage.setItem("adminId", data.id);
        localStorage.setItem("adminName", data.name);
        localStorage.setItem("role", data.role);
        localStorage.setItem("modules", JSON.stringify(data.modules));
        localStorage.setItem("branch", data.branch || "");

        navigate("/AdminDashboard");
      } else if (data.role === "doctor") {
        localStorage.setItem("userId", data.id);
        localStorage.setItem("userName", data.name);
        localStorage.setItem("role", data.role);
        localStorage.setItem("adminId", data.adminId);

        localStorage.setItem("modules", JSON.stringify(data.modules));
        localStorage.setItem("branch", data.branch || "");

        navigate("/doctor/dashboard");
      } else if (data.role === "receptionist") {
        localStorage.setItem("userId", data.id);
        localStorage.setItem("userName", data.name);
        localStorage.setItem("role", data.role);
        localStorage.setItem("adminId", data.adminId);
        localStorage.setItem("modules", JSON.stringify(data.modules));
        localStorage.setItem("branch", data.branch || "");

        navigate("/receptionist/dashboard");
      } else if (data.role === "client") {
        localStorage.setItem("id", data.id);
        localStorage.setItem("userName", data.name);
        localStorage.setItem("adminId", data.adminId);
        localStorage.setItem("role", data.role);
        localStorage.setItem("modules", JSON.stringify(data.modules));
        localStorage.setItem("branch", data.branch || "");

        navigate("/client");
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message:
          error.response?.data?.message ||
          "Invalid or expired OTP. Please try again.",
        severity: "error",
      });
    }
  };

  const maskEmail = (email) => {
    if (!email) return "";

    const [name, domain] = email.split("@");

    if (name.length <= 4) {
      return `${name.slice(0, 2)}...@${domain}`;
    }

    // return `${name.slice(0, 2)}...${name.slice(-2)}@${domain}`;
    return `${name.slice(0, 3)}...`;
  };

  return (
    <>
      <Box
        sx={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #667eea, #764ba2)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          p: 2,
        }}
      >
        <Paper
          elevation={15}
          sx={{
            maxWidth: 900,
            width: "100%",
            height: { xs: "auto", md: 450 },
            minHeight: { xs: "100%", md: 450 },
            borderRadius: { xs: "18px", md: "24px" },
            overflow: "hidden",
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
          }}
        >
          {/* Left Image Section */}
          <Box
            onClick={() => window.open("https://caredesk360.com", "_blank")}
            sx={{
              flex: 0.8,
              position: "relative",
              backgroundImage: `url(${logo})`,
              backgroundSize: { xs: "50%", md: "90%" },
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center",
              minHeight: { xs: 170, md: 300 },
              borderRadius: 0,
              overflow: "hidden",
            }}
          >
            {/* Overlay (optional for better text visibility) */}
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(to top, rgba(0,0,0,0.6), transparent)",
              }}
            />

            {/* Text at bottom */}
            <Box
              sx={{
                position: "absolute",
                bottom: 16,
                left: 16,
                zIndex: 2,
              }}
            >
              {/* <Typography
                sx={{
                  color: "#fff",
                  fontWeight: 700,
                  textDecoration: "underline",
                  cursor: "pointer",
                  fontFamily: "Inter, sans-serif",
                  fontSize: {
                    xs: "16px",
                    md: "22px",
                  },
                }}
              >
                CareDesk360
              </Typography>
              <Typography
            
                sx={{
                  color: "#e0e0e0",
                  fontFamily: "Inter, sans-serif",
                  fontSize: {
                    xs: "13px",
                    md: "18px",
                  },
                }}
              >
                Advancing Healthcare.Enchancing Lives
              </Typography> */}
            </Box>
          </Box>

          {/* Right Login Section */}
          <Box
            sx={{
              flex: 0.8,
              p: { xs: 3, md: 5 },
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <Fade in timeout={500}>
              <Box>
                {!isOtpStep ? (
                  <>
                    <Typography
                      sx={{
                        fontSize: {
                          xs: "22px",
                          md: "26px",
                        },
                      }}
                      fontWeight="bold"
                      gutterBottom
                    >
                      Welcome to{" "}
                      <span
                        style={{
                          fontWeight: "900",
                          background: "linear-gradient(135deg,#667eea,#764ba2)",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                        }}
                      >
                        CareDesk360
                      </span>
                    </Typography>

                    <Typography variant="body2" color="text.secondary" mb={2}>
                      Please login to your account
                    </Typography>

                    <TextField
                      label="Email"
                      variant="outlined"
                      fullWidth
                      margin="normal"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <EmailIcon />
                          </InputAdornment>
                        ),
                      }}
                    />

                    <TextField
                      label="Password"
                      type="password"
                      variant="outlined"
                      fullWidth
                      margin="normal"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <LockIcon />
                          </InputAdornment>
                        ),
                      }}
                    />

                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        mt: 1,
                      }}
                    >
                      <Typography
                        sx={{
                          cursor: "pointer",
                          color: "primary.main",
                          fontSize: 14,
                          width: "125px",
                          textAlign: "right",
                        }}
                        onClick={() => setOpenForgot(true)}
                      >
                        Forgot Password ?
                      </Typography>
                    </Box>

                    <Button
                      onClick={submitdetails}
                      variant="contained"
                      fullWidth
                      size="large"
                      disabled={loading}
                      sx={{
                        mt: 2,
                        py: 1.5,
                        borderRadius: "16px",
                        fontWeight: 700,
                        fontSize: 16,
                        textTransform: "none",
                        color: "white",
                        background: "linear-gradient(135deg,#667eea,#764ba2)",

                        "&:hover": {
                          transform: "translateY(-2px)",
                          boxShadow: "0 12px 30px rgba(102,126,234,.3)",
                        },

                        transition: "all .3s ease",
                      }}
                    >
                      {loading ? (
                        <>
                          <CircularProgress
                            size={18}
                            thickness={5}
                            sx={{
                              color: "#fff",
                              mr: 1,
                            }}
                          />
                          <span style={{ color: "#ffffff" }}>
                            {loginStep === "validating"
                              ? "Verifying credentials..."
                              : "Sending OTP..."}
                          </span>
                        </>
                      ) : (
                        "Login"
                      )}
                    </Button>
                    <Typography
                      variant="body2"
                      sx={{
                        mt: 2,
                        textAlign: "center",
                        color: "text.secondary",
                      }}
                    >
                      Are you a new user?{"  "}
                      <Link
                        component="button"
                        variant="body2"
                        onClick={() => navigate("/register")}
                        sx={{
                          color: "primary.main",
                          textDecoration: "underline",
                        }}
                      >
                        Register here
                      </Link>
                    </Typography>

                    {/* <CreatePatientDialog
                      open={open}
                      onClose={() => setOpen(false)}
                      onSuccess={() => {
                      }}
                    /> */}
                  </>
                ) : (
                  <>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        mb: 2,
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <IconButton
                          onClick={() => navigate("/login")}
                          sx={{
                            background: "#f5f5f5",
                            mr: 1,

                            "&:hover": {
                              background: "#e8e8e8",
                              transform: "translateX(-2px)",
                            },

                            transition: "all .3s ease",
                          }}
                        >
                          <KeyboardBackspaceIcon fontSize="small" />
                        </IconButton>

                        <Typography
                          sx={{
                            cursor: "pointer",
                            fontWeight: 600,
                            color: "#666",
                          }}
                          onClick={() => {
                            localStorage.removeItem("otpStartTime");
                            setTimeLeft(0);
                            setExpired(false);

                            navigate("/login");
                          }}
                        >
                          Back
                        </Typography>
                      </Box>
                    </Box>
                    <Typography
                      fontSize={{
                        xs: "28px",
                        md: "34px",
                      }}
                      ariant="h4"
                      fontWeight={900}
                      textAlign="center"
                      sx={{
                        background: "linear-gradient(135deg,#667eea,#764ba2)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        mb: 2,
                      }}
                    >
                      Verify OTP
                    </Typography>

                    <Typography
                      textAlign="center"
                      color="text.secondary"
                      mb={1}
                      sx={{
                        fontSize: "15px",
                        fontWeight: 500,
                      }}
                    >
                      We've sent a verification code to your {maskEmail(email)}
                    </Typography>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      textAlign="center"
                      mb={3}
                      sx={{
                        lineHeight: 1.6,
                      }}
                    >
                      Enter the 6-digit OTP below to verify your account
                    </Typography>
                    <Box
                      display="flex"
                      flexWrap="nowrap"
                      justifyContent="center"
                      gap={{ xs: 0.5, sm: 1 }}
                      mb={1}
                      onPaste={handlePaste}
                    >
                      {otp.map((digit, index) => (
                        <TextField
                          key={index}
                          value={digit}
                          inputRef={(el) => (inputRefs.current[index] = el)}
                          onChange={(e) => handleChange(e.target.value, index)}
                          onKeyDown={(e) => handleKeyDown(e, index)}
                          inputProps={{
                            maxLength: 1,
                            style: {
                              height: 20,
                              textAlign: "center",
                              fontSize: window.innerWidth < 600 ? 20 : 24,
                              fontWeight: 700,
                            },
                          }}
                          sx={{
                            width: {
                              xs: 42,
                              sm: 50,
                            },
                            "& .MuiOutlinedInput-root": {
                              borderRadius: "16px",
                              background: "#fafafa",

                              "&.Mui-focused": {
                                transform: "translateY(-2px)",
                              },

                              transition: "all .3s ease",
                            },
                          }}
                        />
                      ))}
                    </Box>

                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "flex-end",
                        mt: 1,
                      }}
                    >
                      <Box
                        sx={{
                          px: 2,
                          py: 1,
                          borderRadius: "30px",
                          fontWeight: 700,
                          color: "#fb2e2e",
                          fontSize: 14,
                        }}
                      >
                        ⏱ {formatTime(timeLeft)}
                      </Box>
                    </Box>

                    <Button
                      fullWidth
                      size="large"
                      onClick={handleOtpVerify}
                      sx={{
                        py: 1.5,
                        borderRadius: "16px",
                        fontWeight: 700,
                        fontSize: 16,
                        textTransform: "none",
                        color: "white",
                        background: "linear-gradient(135deg,#667eea,#764ba2)",

                        "&:hover": {
                          transform: "translateY(-2px)",
                          boxShadow: "0 12px 30px rgba(102,126,234,.3)",
                        },

                        transition: "all .3s ease",
                      }}
                    >
                      Verify & Continue →
                    </Button>
                  </>
                )}
              </Box>
            </Fade>
          </Box>
        </Paper>

        <Box
          sx={{
            width: "100%",
            textAlign: "center",
            py: { xs: 1, md: 2 },
          }}
        >
          <Typography sx={{ fontSize: 12, color: "#fff" }}>
            powered by{" "}
            <a
              href="https://ridgeveda.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "#fff",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Ridgeveda
            </a>
          </Typography>
        </Box>
      </Box>

      <ForgotPassword open={openForgot} onClose={() => setOpenForgot(false)} />
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default Login;
