import React, { useState } from "react";
import "./CTABanner.css";
import Contactmodal from "./Contactmodal";
import axios from "axios";
import { Snackbar, Alert } from "@mui/material";

const CTABanner = () => {
  const [open, setOpen] = useState(false);

  // ✅ Demo form state
  const [demoData, setDemoData] = useState({
    name: "",
    email: "",
    phone: "",
    requirements: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const handleChange = (e) => {
    setDemoData({
      ...demoData,
      [e.target.name]: e.target.value,
    });
  };

  // ✅ Basic Validation
  const validateForm = () => {
    let newErrors = {};

    if (!demoData.name.trim())
      newErrors.name = "Name is required";

    if (!demoData.email.trim())
      newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(demoData.email))
      newErrors.email = "Invalid email format";

    if (!demoData.phone.trim())
      newErrors.phone = "Phone is required";
    else if (!/^[0-9]{10}$/.test(demoData.phone))
      newErrors.phone = "Enter valid 10 digit number";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      await axios.post(`${process.env.REACT_APP_URL}/landingpage/demo/post`, demoData);

      setSnackbar({
        open: true,
        message: "Demo Request Sent Successfully ✅",
        severity: "success",
      });

      setDemoData({
        name: "",
        email: "",
        phone: "",
        requirements: "",
      });

      setErrors({});
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

  return (
    <section className="cta-banner" id="contact">
      <div className="cta-bg-overlay"></div>
      <div className="container cta-inner">
        <div className="cta-left">
          <h2 className="cta-title">
            Build Smarter Healthcare Operations with CareDesk360
          </h2>
          <p className="cta-sub">
            All-in-one healthcare management solution designed for hospitals,
            clinics, and medical practices. Manage patients, appointments,
            prescriptions, reports, billing, and staff — all from a single secure
            and easy-to-use system.
          </p>
          <div className="cta-buttons">
            <a onClick={() => setOpen(true)} className="cta-btn-white">
              Get Started
            </a>
            <a href="tel:+918977108950" className="cta-btn-outline">
              📞 Call Us Now
            </a>
          </div>
        </div>

        {/* ✅ RIGHT SIDE FORM (Updated Only Logic) */}
        <div className="cta-right">
          <div className="cta-form-card">
            <h3>Get Free Demo</h3>
            <p>Tell us about your project. No commitment required.</p>

            <div className="form-group">
              <input
                type="text"
                name="name"
                value={demoData.name}
                onChange={handleChange}
                placeholder="Your Name *"
                className="form-input"
              />
              {errors.name && <small className="error-text">{errors.name}</small>}
            </div>

            <div className="form-group">
              <input
                type="email"
                name="email"
                value={demoData.email}
                onChange={handleChange}
                placeholder="Your Email *"
                className="form-input"
              />
              {errors.email && <small className="error-text">{errors.email}</small>}
            </div>

            <div className="form-group">
              <input
                type="tel"
                name="phone"
                value={demoData.phone}
                onChange={handleChange}
                placeholder="Phone Number *"
                className="form-input"
              />
              {errors.phone && <small className="error-text">{errors.phone}</small>}
            </div>

            <div className="form-group">
              <textarea
                name="requirements"
                value={demoData.requirements}
                onChange={handleChange}
                placeholder="Tell us about your requirements..."
                className="form-input"
                rows="3"
              ></textarea>
            </div>

            <button
              className="btn-primary full-width"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? "Sending..." : "Get Free Demo →"}
            </button>
          </div>
        </div>
      </div>

      <Contactmodal open={open} handleClose={() => setOpen(false)} />

      {/* ✅ Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </section>
  );
};

export default CTABanner;