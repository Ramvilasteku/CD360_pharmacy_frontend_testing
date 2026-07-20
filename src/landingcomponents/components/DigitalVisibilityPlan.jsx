import React from "react";
import "./DigitalVisibilityPlan.css";
import { useState } from "react";

const DigitalVisibilityPlan = () => {
  const [activePlan, setActivePlan] = useState("annual");

  return (
    <section className="dvp-wrapper">
      {/* Heading */}
      <div className="dvp-header-section">
        <div className="dvp-line"></div>

        <div className="dvp-heading-content">
          <h2 className="dvp-main-title">DIGITAL VISIBILITY PLAN</h2>
          <p className="dvp-sub-title">
            Website + Clinic/Hospital Management Software
          </p>
        </div>
        <div className="dvp-line"></div>
      </div>

      {/* Slider section start */}

      <div className="dvp-plan-tabs">
        <button
          className={activePlan === "monthly" ? "active" : ""}
          onClick={() => setActivePlan("monthly")}
        >
          <span className="full-text">Monthly</span>
          <span className="short-text">1Mon</span>
        </button>

        <button
          className={activePlan === "quarterly" ? "active" : ""}
          onClick={() => setActivePlan("quarterly")}
        >
          <span className="full-text">Quarterly</span>
          <span className="short-text">3Mon</span>
        </button>

        <button
          className={activePlan === "annual" ? "active" : ""}
          onClick={() => setActivePlan("annual")}
        >
          <span className="full-text">Annual</span>
          <span className="short-text">12Mon</span>
        </button>
      </div>

      <div key={activePlan} className="plan-content">
        {activePlan === "monthly" && (
          <div className="dvp-price-layout">
            <div className="dvp-price-card">
              <h3 className="dvp-price-heading">Monthly Plan</h3>
              <h1 className="dvp-price-amount">₹10,000 +</h1>
              <span className="dvp-price-month">₹3,999/month</span>
            </div>

            <div className="dvp-price-description">
              <p>
                Website and setup fee :<strong> ₹10,000/year</strong>.
                <br />
                <p>
                  Build your digital presence, streamline operations,
                  <br />
                  and grow your patient base.
                </p>
              </p>
            </div>
          </div>
        )}

        {activePlan === "quarterly" && (
          <div className="dvp-price-layout">
            <div className="dvp-price-card">
              <h3 className="dvp-price-heading">Quarterly Plan</h3>

              <h1 className="dvp-price-amount">
                ₹4,999 <span>x 3</span>
              </h1>
            </div>

            <div className="dvp-price-description">
              <p>
                Build your digital presence, streamline operations,
                <br />
                and grow your patient base.
              </p>
            </div>
          </div>
        )}

        {activePlan === "annual" && (
          <div className="dvp-price-layout annual-popular">
            <div className="dvp-price-card">
              <h3 className="dvp-price-heading">Annual Plan</h3>

              <h1 className="dvp-price-amount">
                ₹3,999 <span>x 12</span>
              </h1>
            </div>

            <div className="dvp-price-description">
              <p>
                Build your digital presence, streamline operations,
                <br />
                and grow your patient base.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Slider section end */}

      {/* Cards */}

      <div className="dvp-grid-layout">
        {/* LEFT */}

        <div className="dvp-info-card">
          <div className="dvp-card-top">
            <lord-icon
              src="/animations/digital/computer.json"
              trigger="loop"
              delay="2000"
              style={{ width: "55px", height: "55px" }}
            ></lord-icon>

            <div>
              <h3 className="dvp-card-title">WHAT'S INCLUDED</h3>

              <p className="dvp-card-subtext">
                Everything you need to grow digitally & efficiently.
              </p>
            </div>
          </div>

          <div className="dvp-card-section">
            <h4 className="dvp-section-heading">1. WEBSITE</h4>

            <ul className="dvp-list">
              <li>Professional, Mobile-Friendly Website</li>
              <li>SEO-Optimized Pages</li>
              <li>Contact Forms & Click-to-Call</li>
              <li>Google Maps Integration</li>
              <li>SSL Certificate & Basic Security</li>
              <li>Website Hosting & Maintenance</li>
            </ul>
          </div>

          <div className="dvp-card-section">
            <h4 className="dvp-section-heading">
              2. CLINIC / HOSPITAL MANAGEMENT SOFTWARE
            </h4>

            <ul className="dvp-list">
              <li>Appointment Scheduling</li>
              <li>Patient Registration & Records</li>
              <li>OPD Management</li>
              <li>Billing & Invoicing</li>
              <li>Prescription Management</li>
              <li>Inventory Management</li>
              <li>Staff & Role Management</li>
              <li>Reports & Analytics Dashboard</li>
            </ul>
          </div>
        </div>

        {/* RIGHT */}

        <div className="dvp-info-card">
          <div className="dvp-card-top">
            <lord-icon
              src="/animations/digital/marketing.json"
              trigger="loop"
              delay="2000"
              style={{ width: "55px", height: "55px" }}
            ></lord-icon>

            <div>
              <h3 className="dvp-card-title">DIGITAL VISIBILITY & MARKETING</h3>

              <p className="dvp-card-subtext">
                Get discovered, build trust and attract more patients.
              </p>
            </div>
          </div>

          <div className="dvp-card-section">
            <h4 className="dvp-section-heading">
              3. PROFILE OPTIMIZATION & MANAGEMENT
            </h4>

            <ul className="dvp-list">
              <li>Google My Business (GMB)</li>
              <li>Website</li>
              <li>LinkedIn</li>
              <li>Instagram</li>
              <li>Facebook</li>
              <li>YouTube</li>
            </ul>
          </div>

          <div className="dvp-card-section">
            <h4 className="dvp-section-heading">4. CONTENT & MARKETING</h4>

            <ul className="dvp-list">
              <li>Design of 12 Creatives for Social Media Every Month</li>
              <li>
                12 Reel Videos per Year (1 Reel per Month, up to 60 Seconds
                Each)
              </li>
              <li>1 Ad Campaign Management Per Month</li>
            </ul>
          </div>

          <div className="dvp-card-section">
            <h4 className="dvp-section-heading">5. ADD-ONS</h4>

            <ul>
              <li>
                Each service starts at ₹3,000 - Video Editing, AI Clone Videos &
                Shoot Services (2 videos, 30 seconds each).
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DigitalVisibilityPlan;
