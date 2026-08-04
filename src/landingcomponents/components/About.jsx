import React, { useState } from "react";
import "./About.css";
import Footer from "./Footer";
import Navbar from "./Navbar";
import aboutHero from "../Assets/about-hero.png";
import Contactmodal from "./Contactmodal";

const features = [
  "Appointment Management",
  "Electronic Medical Records (EMR)",
  "Billing & Invoicing",
  "Patient Management",
  "Financial Analytics",
  "Staff Coordination",
  "Follow-up Automation",
  "Patient Communication",
  "Operational Reporting",
  "Healthcare Marketing Automation",
  "Review Management",
  "Patient Acquisition & Retention",
  "Care Concierge",
  "Care Connect 360"
];

const AboutCareDesk360 = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Navbar />

      {/* Hero Section */}
      <section className="about-hero">
        <div className="about-hero-container">
          <div className="about-hero-content">
            <span className="about-badge">About CareDesk360</span>

            <h1>
              Transforming
              <span> Modern Healthcare</span>
            </h1>

            <p>
              CareDesk360 is an AI-powered Practice Management, Patient
              Relationship Management (PRM), and Healthcare Marketing platform
              that helps clinics streamline operations, improve patient
              experience, and accelerate sustainable growth.
            </p>

            <div className="about-buttons">
              <button
                className="primary-btn"
                onClick={() =>
                  document
                    .getElementById("about")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                Learn More
              </button>

              <button className="secondary-btn" onClick={()=>setOpen(true)}>Contact Us</button>
            </div>
          </div>

          <div className="about-hero-image">
            <img src={aboutHero} alt="About CareDesk360" />
          </div>
        </div>
      </section>

      <section className="about-caredesk" id="about">
        <div className="about-container">
          <div className="about-header">
            <span className="badge">AI-Powered Healthcare Platform</span>
            <h1>About CareDesk360</h1>
            <p className="subtitle">
              Practice Management, Patient Relationship Management (PRM), and
              Healthcare Marketing Technology (MarTech) — Unified into One
              Powerful Ecosystem.
            </p>
          </div>

          <div className="about-content">
            <div className="about-text">
              <p>
                <strong>CareDesk360</strong> is an AI-powered Practice
                Management and Healthcare Growth Platform developed by{" "}
                <strong>Ridgeveda Solutions Pvt. Ltd.</strong> that combines
                Practice Management, Patient Relationship Management (PRM), and
                Healthcare Marketing Technology (MarTech) into one unified
                ecosystem.
              </p>

              <p>
                Healthcare practices today face two major challenges — managing
                daily operations efficiently and consistently attracting and
                retaining patients. CareDesk360 addresses both by streamlining
                clinic operations while helping practices grow their patient
                base.
              </p>

              <p>
                Built specifically for modern healthcare providers, CareDesk360
                enables doctors, clinics, dental practices, diagnostic centers,
                and healthcare organizations to digitize operations, improve
                patient experiences, increase retention, and drive sustainable
                growth from a single platform.
              </p>

              <p>
                Our mission is to empower healthcare businesses with technology
                that not only improves operational efficiency but also creates
                measurable business growth.
              </p>
            </div>

            <div className="mission-card">
              <h3 className="text-center">Our Vision</h3>
              <p>
                To become the complete growth operating system for healthcare
                practices by bridging the gap between healthcare operations and
                healthcare marketing.
              </p>

              <div className="stats">
                <div>
                  <h2>360°</h2>
                  <span>Healthcare Growth</span>
                </div>

                <div>
                  <h2>AI</h2>
                  <span>Powered Automation</span>
                </div>

                <div>
                  <h2>1</h2>
                  <span>Unified Platform</span>
                </div>
              </div>
            </div>
          </div>

          <div className="features-section">
            <h2>Everything Your Practice Needs</h2>

            <div className="features-grid">
              {features.map((feature, index) => (
                <div className="feature-card" key={index}>
                  <div className="feature-icon">✓</div>
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bottom-banner">
            <h2 className="text-white">
              Manage Your Practice. Engage Your Patients. Grow Your Healthcare
              Business.
            </h2>

            <p>
              From managing appointments and medical records to acquiring new
              patients and strengthening patient relationships, CareDesk360
              helps healthcare providers scale efficiently and sustainably.
            </p>
          </div>
        </div>
      </section>
      <Footer />
       <Contactmodal open={open} handleClose={() => setOpen(false)} />
    </>
  );
};

export default AboutCareDesk360;
