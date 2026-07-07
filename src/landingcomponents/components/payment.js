import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";

const API =
  "https://alberta-protective-canal-addressed.trycloudflare.com/api/phonepe";

export default function Payment() {
  const { registrationId } = useParams();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const startPayment = async () => {
    try {
      setLoading(true);

      const { data } = await axios.post(`${process.env.PAYMENT_BACKEND_URL}/api/phonepe/create-payment`, {
        registrationId,
      });

      console.log(data);

      if (data.success) {
        // Redirect to PhonePe
        window.location.href = data.paymentUrl;
      } else {
        setError(data.message || "Unable to initiate payment.");
      }
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.message ||
          "Something went wrong."
      );
    }

    setLoading(false);
  };

  useEffect(() => {
    if (registrationId) {
      startPayment();
    }
  }, [registrationId]);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        background: "#f5f5f5",
      }}
    >
      <div
        style={{
          width: 450,
          background: "#fff",
          padding: 30,
          borderRadius: 10,
          textAlign: "center",
          boxShadow: "0 0 15px rgba(0,0,0,.1)",
        }}
      >
        <h2>Processing Payment</h2>

        {loading && (
          <>
            <p>Please wait...</p>
            <p>Redirecting to PhonePe...</p>
          </>
        )}

        {error && (
          <>
            <p style={{ color: "red" }}>{error}</p>

            <button
              onClick={startPayment}
              style={{
                marginTop: 20,
                padding: "12px 25px",
                cursor: "pointer",
              }}
            >
              Retry Payment
            </button>
          </>
        )}
      </div>
    </div>
  );
}