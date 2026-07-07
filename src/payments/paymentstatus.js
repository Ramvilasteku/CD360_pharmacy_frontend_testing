import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";

import {
    Box,
    CircularProgress,
    Typography,
    Button,
    Paper
} from "@mui/material";

export default function PaymentStatus() {

    const [searchParams] = useSearchParams();

    const merchantOrderId =
        searchParams.get("merchantOrderId");

    const [loading, setLoading] = useState(true);

    const [payment, setPayment] = useState(null);

    useEffect(() => {

        if (!merchantOrderId) return;

        fetchStatus();

    }, [merchantOrderId]);

    const fetchStatus = async () => {

        try {

            const { data } = await axios.get(

                `${process.env.REACT_APP_PAYMENT_BACKEND_URL}/api/phonepe/payment/status`,

                {
                    params: {
                        merchantOrderId
                    }
                }

            );

            setPayment(data);

        } catch (err) {

            console.log(err);

        } finally {

            setLoading(false);

        }

    };

    const retryPayment = async () => {

    try {

        const { data } = await axios.post(

            `${process.env.REACT_APP_PAYMENT_BACKEND_URL}/api/phonepe/retry-payment`,

            {
                merchantOrderId
            }

        );

        window.location.href = data.redirectUrl;

    } catch (err) {

        alert(
            err.response?.data?.message ||
            "Unable to retry payment."
        );

    }

};

    if (loading) {

        return (

            <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                height="100vh"
            >

                <CircularProgress />

            </Box>

        );

    }

    return (

        <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight="100vh"
            bgcolor="#f5f5f5"
        >

            <Paper
                sx={{
                    width: 500,
                    p: 5,
                    textAlign: "center",
                }}
            >
                {payment.success ? (
                    <>
                        <Typography
                            variant="h4"
                            color="success.main"
                            gutterBottom
                        >
                            Payment Successful
                        </Typography>

                        <Typography>
                            Merchant Order ID
                        </Typography>

                        <Typography fontWeight="bold">
                            {merchantOrderId}
                        </Typography>

                        <Typography sx={{ mt: 2 }}>
                            Company Registered Successfully.
                        </Typography>

                        <Button
                            variant="contained"
                            sx={{ mt: 4 }}
                            href="/login"
                            fullWidth
                        >
                            Go to Login
                        </Button>
                    </>
                ) : (
                    <>
                        <Typography
                            variant="h4"
                            color="error.main"
                            gutterBottom
                        >
                            Payment Failed
                        </Typography>

                        <Typography sx={{ mt: 2 }}>
                            {payment?.message || "Your payment could not be completed."}
                        </Typography>

                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mt: 1 }}
                        >
                            Your registration has been saved. You can retry the payment later.
                        </Typography>

                        <Box
                            sx={{
                                mt: 4,
                                display: "flex",
                                gap: 2,
                                justifyContent: "center",
                            }}
                        >
                            <Button
                                variant="outlined"
                                href="/pricing"
                            >
                                Back to Pricing
                            </Button>

                            <Button
                                variant="contained"
                                onClick={retryPayment}
                            >
                                Retry Payment
                            </Button>
                        </Box>
                    </>
                )}
            </Paper>

        </Box>

    );

}