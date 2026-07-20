import React from "react";
import "./Comparison.css";
import Navbar from "./Navbar";
import Footer from "./Footer";
import WhyUs from "./WhyUs";
import Contactmodal from "./Contactmodal";
import { useState } from "react";
import logo from "../Assets/caredesk360.png";

const Comparison = () => {
  const features = [
    // Dashboards & Access
    {
      category: "Dashboards & Access",
      items: [
        { name: "Admin Dashboard", us: true, competitor: true },
        { name: "Doctor Dashboard", us: true, competitor: true },
        {
          name: "Receptionist Dashboard",
          us: true,
          competitor: false,
          exclusive: true,
        },
        {
          name: "Patient Dashboard",
          us: true,
          competitor: false,
          exclusive: true,
        },
      ],
    },
    // Core Features
    {
      category: "Core Features",
      items: [
        { name: "Appointment Scheduling", us: true, competitor: true },
        { name: "Patient Records Management", us: true, competitor: true },
        { name: "E-Prescription Management", us: true, competitor: true },
        { name: "Billing & Invoicing", us: true, competitor: true },
        {
          name: "Document Management",
          us: true,
          competitor: false,
          exclusive: true,
        },
        {
          name: "Role & Permission Control",
          us: true,
          competitor: false,
          exclusive: true,
        },
        {
          name: "Multi-Branch Management",
          us: true,
          competitor: false,
          exclusive: true,
        },
      ],
    },

    // Digital Marketing Suite
    {
      category: "Digital Marketing Suite",
      items: [
        {
          name: "Google My Business (GMB)",
          us: true,
          competitor: true,
          exclusive: false,
        },

        {
          name: "Instagram Management",
          us: true,
          competitor: true,
          exclusive: false,
        },

        {
          name: "Facebook Management",
          us: true,
          competitor: true,
          exclusive: false,
        },
        {
          name: "LinkedIn Management",
          us: true,
          competitor: false,
          exclusive: true,
        },
        {
          name: "Youtube Management",
          us: true,
          competitor: false,
          exclusive: true,
        },
        {
          name: "Campaign Post Creation",
          us: true,
          competitor: false,
          exclusive: true,
        },

        {
          name: "Reel Video Creation",
          us: true,
          competitor: false,
          exclusive: true,
        },
        {
          name: "Social Media Analytics",
          us: true,
          competitor: false,
          exclusive: true,
        },
      ],
    },
    // Add-ons & Integrations
    {
      category: "Add-ons & Integrations",
      items: [
        {
          name: "WhatsApp Message Integration",
          us: true,
          competitor: false,
          exclusive: true,
        },
        { name: "Invoice Customization", us: true, competitor: true },
        // {
        //   name: "Inventory Management",
        //   us: true,
        //   competitor: false,
        //   exclusive: true,
        // },
      ],
    },
    // Support & Maintenance
    {
      category: "Support & Maintenance",
      items: [
        { name: "Support", us: true, competitor: true, exclusive: false },
        {
          name: "Dedicated Account Manager",
          us: true,
          competitor: false,
          exclusive: true,
        },
        {
          name: "Website Hosting & Maintenance",
          us: true,
          competitor: false,
          exclusive: true,
        },
        {
          name: "Updates & Upgrades",
          us: true,
          competitor: false,
          exclusive: true,
        },
      ],
    },
  ];

  const [open, setOpen] = useState(false);

  return (
    <>
      <Navbar />

      <section className="comp-wrapper">
        {/* Header */}
        <div className="about-header">
          <span className="badge">Smarter Healthcare Starts Here</span>
          <h1>Why Choose CareDesk360</h1>
          <p className="subtitle">
            CareDesk360 is designed to simplify healthcare management while
            improving efficiency, accuracy, and patient satisfaction. Our
            platform brings everything you need into one secure and easy-to-use
            system.
          </p>
        </div>

        {/* Pricing Section */}
        <div className="comp-pricing-section">
          <div className="comp-pricing-card us-pricing">
            <div className="comp-pricing-badge">BEST SELLER PLAN</div>
            <h3 className="comp-pricing-title">
              CareDesk360
              {/* <img src={logo} width={"8%"} height={"50px"} />  */}
            </h3>
            <div className="comp-price">
              <span className="comp-price-amount">₹15,000</span>
              <span className="comp-price-period">/ Month</span>
            </div>
            <ul className="comp-pricing-includes">
              <li>
                {" "}
                <span className="comp-check">✓</span> Digital Marketing Suite
              </li>
              <li>
                {" "}
                <span className="comp-check">✓</span> Professional Website
              </li>
              <li>
                <span className="comp-check">✓</span> Practice Management
                Software
                <span className="comp-price-period"> / (1 Year)</span>
              </li>
            </ul>
          </div>

          <div className="comp-pricing-card competitor-pricing">
            <div className="comp-pricing-badge competitor">COMPETITORS</div>
            <h3 className="comp-pricing-title">Others</h3>
            <div className="comp-price">
              <span className="comp-price-amount">₹15,000 Others</span>
              <span className="comp-price-period">/ Month</span>
            </div>
            <ul className="comp-pricing-includes">
              <li>
                {" "}
                <span className="comp-check">✓</span> Digital Marketing Suite
              </li>

              <li>
                <span className="comp-cross">✗</span> No Professional Website
              </li>
              <li>
                <span className="comp-cross">✗</span> No Practice Management
                Software{" "}
              </li>
            </ul>
          </div>
        </div>

        {/* Features Comparison */}
        <div className="comp-features-section">
          <h3 className="comp-features-title">Complete Feature Breakdown</h3>

          {features.map((section, index) => (
            <div key={index} className="comp-feature-group">
              <h4 className="comp-feature-category">{section.category}</h4>

              <div className="comp-table-wrapper">
                <div className="comp-table-header">
                  <div className="comp-feature-head-name">Feature</div>
                  <div className="comp-feature-column us">Our Plan</div>
                  <div className="comp-feature-column competitor">
                    Others Plan
                  </div>
                </div>

                {section.items.map((item, itemIndex) => (
                  <div key={itemIndex} className="comp-table-row">
                    <div className="comp-feature-name">
                      <span>{item.name}</span>
                      {item.exclusive && (
                        <span className="comp-exclusive-badge">ONLY US</span>
                      )}
                    </div>
                    <div className="comp-feature-column us">
                      {item.us ? (
                        <span className="comp-check">✓</span>
                      ) : (
                        <span className="comp-cross">✗</span>
                      )}
                    </div>
                    <div className="comp-feature-column competitor">
                      {item.competitor ? (
                        <span className="comp-check">✓</span>
                      ) : (
                        <span className="comp-cross">✗</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="comp-cta-section">
          <h3>Ready to Transform Your Clinic?</h3>
          <p>Get everything you need in one affordable plan</p>
          <button className="comp-cta-button" onClick={() => setOpen(true)}>
            Book A Demo
          </button>
        </div>
      </section>
      <Footer />
      <Contactmodal open={open} handleClose={() => setOpen(false)} />
    </>
  );
};

export default Comparison;
