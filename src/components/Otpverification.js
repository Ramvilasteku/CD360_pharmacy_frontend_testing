import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import {
    Box,
    Typography,
    TextField,
    Button,
    Card,
    CardContent,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

const OTP_LENGTH = 6;

export default function OtpVerification() {
    const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(""));
    const inputRefs = useRef([]);
    const navigate = useNavigate();

    const OTP_EXPIRY_TIME = 600; // 10 minutes (seconds)

    const [timeLeft, setTimeLeft] = useState(OTP_EXPIRY_TIME);
    const [expired, setExpired] = useState(false);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? "0" : ""}${s}`;
    };


    useEffect(() => {
        if (timeLeft <= 0) {
            setExpired(true);

            // Redirect after short delay
            setTimeout(() => {
                navigate("/login");
            }, 2000);

            return;
        }

        const timer = setInterval(() => {
            setTimeLeft((prev) => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft, navigate]);


    const handleChange = (value, index) => {
        if (!/^\d?$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        if (value && index < OTP_LENGTH - 1) {
            inputRefs.current[index + 1].focus();
        }
    };

    const handleKeyDown = (e, index) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            inputRefs.current[index - 1].focus();
        }
    };

    const handlePaste = (e) => {
        const pasteData = e.clipboardData.getData("text").slice(0, OTP_LENGTH);
        if (!/^\d+$/.test(pasteData)) return;

        const pasteOtp = pasteData.split("");
        setOtp(pasteOtp);

        inputRefs.current[pasteOtp.length - 1].focus();
    };

   const handleSubmit = async () => {
        const enteredOtp = otp.join("");

        if (enteredOtp.length < OTP_LENGTH) {
            alert("Please enter complete OTP");
            return;
        }

        try {
            const response = await axios.post(
                `${process.env.REACT_APP_URL}/verify-otp`,
                { otp: enteredOtp },
                {
                    withCredentials: true, // 🔑 required for httpOnly cookie
                }
            );

            console.log("OTP Verified:", response.data);

            alert(response.data.message);

            // ✅ Redirect based on role
            const data = response.data.user;

            if (data.role === "admin") {
                navigate("/AdminDashboard");
                localStorage.setItem("adminId", data.id);
                localStorage.setItem("adminName", data.name);
                localStorage.setItem("role", data.role);
                localStorage.setItem("modules", JSON.stringify(data.modules));
            } else if (data.role === "doctor") {
                localStorage.setItem("userId", data.id);
                localStorage.setItem("userName", data.name);
                localStorage.setItem("role", data.role);
                localStorage.setItem("adminId", data.adminId);
                localStorage.setItem("modules", JSON.stringify(data.modules));
                // localStorage.setItem("id", data.user.id);
                // localStorage.setItem("role", data.user.role);
                // localStorage.setItem("name", data.user.name);
                navigate("/doctor/dashboard");
            } else if (data.role === "receptionist") {
                localStorage.setItem("userId", data.id);
                localStorage.setItem("userName", data.name);
                localStorage.setItem("role", data.role);
                localStorage.setItem("adminId", data.adminId);
               
                localStorage.setItem("branch", data.branch || "");  // ← always set, even if empty
                localStorage.setItem("modules", JSON.stringify(data.modules));
                // localStorage.setItem("id", data.id);
                // localStorage.setItem("role", data.user.role);
                // localStorage.setItem("name", data.user.name);
                navigate("/receptionist/dashboard");
            } else if (data.role === "client") {
                localStorage.setItem("id", data.id);
                localStorage.setItem("userName", data.name);
                localStorage.setItem("adminId", data.adminId);
                localStorage.setItem("role", data.role);
                localStorage.setItem("modules", JSON.stringify(data.modules));

                navigate("/client");
            } else {
                navigate("/");
            }

            if (expired) {
                alert("OTP has expired. Please login again.");
                navigate("/");
                return;
            }

        } catch (error) {
            console.error("OTP Verification Error:", error);

            alert(
                error.response?.data?.message ||
                "OTP verification failed. Please try again."
            );
        }
    };

    return (
        <Box
            sx={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "#f5f7fb",
            }}
        >
            <Card sx={{ width: 380, p: 2 }}>
                <CardContent>
                    <Typography variant="h5" align="center" fontWeight="bold" mb={1}>
                        OTP Verification
                    </Typography>

                    <Typography variant="body2" align="center" color="text.secondary" mb={3}>
                        Enter the 6-digit OTP sent to your registered Whatsapp number.
                    </Typography>

                    <Box
                        display="flex"
                        justifyContent="space-between"
                        gap={1}
                        mb={3}
                        onPaste={handlePaste}
                    >
                        {otp.map((digit, index) => (
                            <TextField
                                key={index}
                                inputRef={(el) => (inputRefs.current[index] = el)}
                                value={digit}
                                onChange={(e) => handleChange(e.target.value, index)}
                                onKeyDown={(e) => handleKeyDown(e, index)}
                                inputProps={{
                                    maxLength: 1,
                                    style: { textAlign: "center", fontSize: 20 },
                                }}
                                sx={{ width: 48 }}
                                disabled={expired}
                            />
                        ))}
                    </Box>
                    <Typography
                        align="end"
                        variant="body2"
                        color={expired ? "error" : "#1976d2"}
                        mb={2}
                    >
                        {expired
                            ? "OTP expired. Redirecting to login..."
                            : `OTP expires in ${formatTime(timeLeft)}`}
                    </Typography>

                    <Button
                        fullWidth
                        variant="contained"
                        size="large"
                        disabled={expired}
                        onClick={handleSubmit}
                    >
                        Verify OTP
                    </Button>
                </CardContent>
            </Card>
        </Box>
    );
}
