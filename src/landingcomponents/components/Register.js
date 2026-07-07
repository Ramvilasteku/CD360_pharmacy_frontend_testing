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
} from "@mui/material";

export default function Register({ open, onClose, plan }) {
    const [form, setForm] = useState({
        companyName: "",
        gst: "",
        adminName: "",
        email: "",
        mobile: "",
        password: "",
        planId: plan,
        billingCycle: "",
    });

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        console.log("Received plan:", plan);
        setForm((prev) => ({
            ...prev,
            planId: plan || "",
        }));
    }, [plan]);

    const handleChange = (e) => {
        setForm((prev) => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
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
                form
            );

            const registrationId = registerResponse.data.registrationId;

            console.log("Registration ID:", registrationId);

            // Step 2: Create Payment
            const paymentResponse = await axios.post(
                `${process.env.REACT_APP_PAYMENT_BACKEND_URL}/api/phonepe/create-payment`,
                {
                    registrationId,
                }
            );

            console.log("Payment Response:", paymentResponse.data);

            // Step 3: Redirect to PhonePe payment page
            // Replace paymentUrl with the actual key returned by your API
             paymentTab.location.href = paymentResponse.data.redirectUrl;

            onClose();

        } catch (err) {
            console.error(err);
            if (paymentTab) paymentTab.close();

            alert(
                err.response?.data?.message || "Registration Failed"
            );
        } finally {
            setLoading(false);
        }
    };
    return (
        <Dialog
            open={open}
            onClose={loading ? undefined : onClose}
            maxWidth="sm"
            fullWidth
        >
            <DialogTitle>Create CareDesk360 Account</DialogTitle>

            <form onSubmit={register}>
                <DialogContent>

                    <TextField
                        fullWidth
                        margin="normal"
                        label="Company Name"
                        name="companyName"
                        value={form.companyName}
                        onChange={handleChange}
                        required
                    />

                    <TextField
                        fullWidth
                        margin="normal"
                        label="GST Number"
                        name="gst"
                        value={form.gst}
                        onChange={handleChange}
                        required
                    />

                    <TextField
                        fullWidth
                        margin="normal"
                        label="Admin Name"
                        name="adminName"
                        value={form.adminName}
                        onChange={handleChange}
                        required
                    />

                    <TextField
                        fullWidth
                        margin="normal"
                        label="Email"
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={handleChange}
                        required
                    />

                    <TextField
                        fullWidth
                        margin="normal"
                        label="Mobile Number"
                        name="mobile"
                        value={form.mobile}
                        onChange={handleChange}
                        required
                    />

                    <TextField
                        fullWidth
                        margin="normal"
                        label="Password"
                        name="password"
                        type="password"
                        value={form.password}
                        onChange={handleChange}
                        required
                    />

                    <TextField
                        select
                        fullWidth
                        margin="normal"
                        label="Billing Cycle"
                        name="billingCycle"
                        value={form.billingCycle}
                        onChange={handleChange}
                    >
                        <MenuItem value="QUARTERLY">Quarterly</MenuItem>
                        <MenuItem value="YEARLY">Yearly</MenuItem>
                    </TextField>

                </DialogContent>

                <DialogActions sx={{ p: 2 }}>
                    <Button
                        onClick={onClose}
                        disabled={loading}
                    >
                        Cancel
                    </Button>

                    <Button
                        type="submit"
                        variant="contained"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <CircularProgress
                                    size={18}
                                    sx={{ mr: 1 }}
                                />
                                Please Wait...
                            </>
                        ) : (
                            "Continue"
                        )}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}