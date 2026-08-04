import "./Comparison.css";
import logo from "../Assets/caredesk360.png";
import React, { useState } from "react";
// import "./EnhancedComparison.css";
import Navbar from "./Navbar";
import Footer from "./Footer";
import Contactmodal from "./Contactmodal";

const Comparison = () => {
  const [open, setOpen] = useState(false);

  // Bundled Services Comparison
  const bundledServices = [
    {
      service: "Digital Marketing Suite",
      description: "Social media, campaigns, content creation",
      caredesk: true,
      marketingOnly: true,
      softwareOnly: false,
    },
    {
      service: "Professional Website",
      description: "Custom, SEO-optimized, mobile-friendly",
      caredesk: true,
      marketingOnly: false,
      softwareOnly: false,
    },
    {
      service: "Clinic/Hospital Management Software",
      description: "Appointments, billing, patient records, EMR",
      caredesk: true,
      marketingOnly: false,
      softwareOnly: true,
    },
    {
      service: "Integrated Solution",
      description: "All 3 working together seamlessly",
      caredesk: true,
      marketingOnly: false,
      softwareOnly: false,
    },
  ];

  // Growth Stats from PDF
  const growthStats = [
    {
      metric: "Month-on-Month Growth",
      value: "10-20%",
      description: "Proven growth for clients with growth plan",
      icon: "📈",
    },
    {
      metric: "Implementation Timeline",
      value: "90 Days",
      description: "Clear roadmap from setup to patient acquisition",
      icon: "🎯",
    },
    {
      metric: "Feature Count",
      value: "25+",
      description: "Comprehensive features across all modules",
      icon: "⚙️",
    },
    {
      metric: "Digital Platforms",
      value: "6",
      description: "Multiple touchpoints for patient discovery",
      icon: "🌐",
    },
  ];

  // Detailed Feature Comparison
  const detailedFeatures = [
    {
      category: "Marketing & Branding",
      features: [
        { name: "Social Media Management", caredesk: "Yes", marketing: "Yes", software: "No" },
        { name: "Content Creation (Posts, Reels)", caredesk: "Yes", marketing: "Yes", software: "No" },
        { name: "Campaign Management", caredesk: "Yes", marketing: "Yes", software: "No" },
        { name: "GMB Optimization", caredesk: "Yes", marketing: "Yes", software: "No" },
        { name: "Brand Strategy & Identity", caredesk: "Yes", marketing: "Yes", software: "No" },
      ],
    },
    {
      category: "Website & Online Presence",
      features: [
        { name: "Professional Website", caredesk: "Yes", marketing: "No", software: "No" },
        { name: "SEO Optimization", caredesk: "Yes", marketing: "No", software: "No" },
        { name: "Mobile Responsive Design", caredesk: "Yes", marketing: "No", software: "No" },
        { name: "Contact Forms & Click-to-Call", caredesk: "Yes", marketing: "No", software: "No" },
      ],
    },
    {
      category: "Clinic Management Software",
      features: [
        { name: "Appointment Scheduling", caredesk: "Yes", marketing: "No", software: "Yes" },
        { name: "Patient Records (EMR)", caredesk: "Yes", marketing: "No", software: "Yes" },
        { name: "Billing & Invoicing", caredesk: "Yes", marketing: "No", software: "Yes" },
        { name: "E-Prescription Management", caredesk: "Yes", marketing: "No", software: "Yes" },
        { name: "Inventory Management", caredesk: "Yes", marketing: "No", software: "Yes" },
        { name: "Staff & Role Management", caredesk: "Yes", marketing: "No", software: "Yes" },
        { name: "Analytics & Reports Dashboard", caredesk: "Yes", marketing: "No", software: "Yes" },
      ],
    },
    {
      category: "Integration & Support",
      features: [
        { name: "Integrated Platform", caredesk: "Yes", marketing: "No", software: "No" },
        { name: "Dedicated Account Manager", caredesk: "Yes", marketing: "No", software: "No" },
        { name: "WhatsApp Integration", caredesk: "Yes", marketing: "No", software: "No" },
        { name: "Website Hosting & Maintenance", caredesk: "Yes", marketing: "No", software: "No" },
      ],
    },
  ];

  return (
    <>
      <Navbar />

      <section className="enhanced-comp-wrapper">
        {/* Header Section */}
        <div className="enhanced-comp-header">
          <span className="enhanced-badge">Why Choose CareDesk360</span>
          <h1>The ONLY Complete Healthcare Growth Platform</h1>
          <p className="enhanced-subtitle">
            While competitors offer fragmented solutions (marketing OR software), 
            CareDesk360 is the only platform that integrates everything you need 
            in one powerful, affordable system.
          </p>
        </div>

        {/* Bundled Services Section */}
        <div className="bundled-services-section">
          <h2>What You Get vs What You Don't</h2>

          <div className="bundled-comparison-grid">
            {/* CareDesk360 Card */}
            <div className="bundled-card caredesk-bundled">
              <div className="bundled-badge">✓ COMPLETE SOLUTION</div>
              <h3>CareDesk360</h3>
              <div className="bundled-price">
                <span className="price-amount">₹15,000</span>
                <span className="price-period">/month</span>
              </div>

              <div className="bundled-services-list">
                {bundledServices.map((item, idx) => (
                  <div key={idx} className="bundled-service-item caredesk-yes">
                    <span className="bundled-check">✓</span>
                    <div className="bundled-service-content">
                      <span className="service-name">{item.service}</span>
                      <span className="service-desc">{item.description}</span>
                    </div>
                  </div>
                ))}
              </div>

              <button className="bundled-cta" onClick={() => setOpen(true)}>
                Start Your 90-Day Sprint
              </button>
            </div>

            {/* Marketing-Only Competitor Card */}
            <div className="bundled-card competitor-marketing">
              <div className="bundled-badge competitor">✗ FRAGMENTED</div>
              <h3>Marketing-Only<br /><small>Competitor</small></h3>
              <div className="bundled-price">
                <span className="price-amount">₹10,000+</span>
                <span className="price-period">/month</span>
              </div>

              <div className="bundled-services-list">
                {bundledServices.map((item, idx) => (
                  <div
                    key={idx}
                    className={`bundled-service-item ${
                      item.marketingOnly ? "available" : "unavailable"
                    }`}
                  >
                    <span className={item.marketingOnly ? "check" : "cross"}>
                      {item.marketingOnly ? "✓" : "✗"}
                    </span>
                    <div className="bundled-service-content">
                      <span className="service-name">{item.service}</span>
                      <span className="service-desc">{item.description}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="missing-warning">
                <strong>Missing:</strong> Website + Software<br />
                <small>Need separate providers & extra costs</small>
              </div>
            </div>

            {/* Software-Only Competitor Card */}
            <div className="bundled-card competitor-software">
              <div className="bundled-badge competitor">✗ FRAGMENTED</div>
              <h3>Software-Only<br /><small>Competitor</small></h3>
              <div className="bundled-price">
                <span className="price-amount">₹8,000+</span>
                <span className="price-period">/month</span>
              </div>

              <div className="bundled-services-list">
                {bundledServices.map((item, idx) => (
                  <div
                    key={idx}
                    className={`bundled-service-item ${
                      item.softwareOnly ? "available" : "unavailable"
                    }`}
                  >
                    <span className={item.softwareOnly ? "check" : "cross"}>
                      {item.softwareOnly ? "✓" : "✗"}
                    </span>
                    <div className="bundled-service-content">
                      <span className="service-name">{item.service}</span>
                      <span className="service-desc">{item.description}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="missing-warning">
                <strong>Missing:</strong> Marketing + Website<br />
                <small>No growth visibility, patient acquisition</small>
              </div>
            </div>
          </div>
        </div>

        {/* Growth Stats Section */}
        <div className="growth-stats-section">
          <h2>Proven Results with CareDesk360</h2>
          <p className="stats-subtitle">Real outcomes for your practice</p>

          <div className="stats-grid">
            {growthStats.map((stat, idx) => (
              <div key={idx} className="stat-card">
                <div className="stat-icon">{stat.icon}</div>
                <div className="stat-value">{stat.value}</div>
                <div className="stat-metric">{stat.metric}</div>
                <div className="stat-description">{stat.description}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 90-Day Roadmap Highlight */}
        <div className="roadmap-highlight-section">
          <div className="roadmap-content">
            <h2>Your 90-Day Growth Sprint</h2>
            <p>
              A clear roadmap from setup to patient acquisition with measurable outcomes at every stage.
            </p>

            <div className="roadmap-stages">
              <div className="roadmap-stage">
                <div className="stage-number">1</div>
                <div className="stage-title">Days 1-30</div>
                <div className="stage-desc">Build Professional Online Presence</div>
              </div>
              <div className="roadmap-arrow">→</div>
              <div className="roadmap-stage">
                <div className="stage-number">2</div>
                <div className="stage-title">Days 31-60</div>
                <div className="stage-desc">Improve Visibility & Reviews</div>
              </div>
              <div className="roadmap-arrow">→</div>
              <div className="roadmap-stage">
                <div className="stage-number">3</div>
                <div className="stage-title">Days 61-90</div>
                <div className="stage-desc">Increase Appointment Inquiries</div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Feature Breakdown */}
        <div className="detailed-features-section">
          <h2>Complete Feature Breakdown</h2>

          {detailedFeatures.map((section, idx) => (
            <div key={idx} className="feature-category-group">
              <h3 className="category-title">{section.category}</h3>

              <div className="detailed-comparison-table">
                <div className="table-header">
                  <div className="feature-col-name">Feature</div>
                  <div className="feature-col-caredesk">CareDesk360</div>
                  <div className="feature-col-marketing">Marketing-Only</div>
                  <div className="feature-col-software">Software-Only</div>
                </div>

                {section.features.map((feature, fIdx) => (
                  <div key={fIdx} className="table-row">
                    <div className="feature-col-name">{feature.name}</div>
                    <div className="feature-col-caredesk">
                      {feature.caredesk === "Yes" ? (
                        <span className="feature-check">✓</span>
                      ) : (
                        <span className="feature-cross">✗</span>
                      )}
                    </div>
                    <div className="feature-col-marketing">
                      {feature.marketing === "Yes" ? (
                        <span className="feature-check">✓</span>
                      ) : (
                        <span className="feature-cross">✗</span>
                      )}
                    </div>
                    <div className="feature-col-software">
                      {feature.software === "Yes" ? (
                        <span className="feature-check">✓</span>
                      ) : (
                        <span className="feature-cross">✗</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Why Bundled is Better Section */}
        <div className="why-bundled-section">
          <h2>Why Bundled is Better</h2>
          <div className="bundled-benefits-grid">
            <div className="benefit-card">
              <div className="benefit-number">1</div>
              <h4>Single Dashboard</h4>
              <p>Manage marketing AND operations in one unified platform. No switching between tools.</p>
            </div>
            <div className="benefit-card">
              <div className="benefit-number">2</div>
              <h4>Integrated Data</h4>
              <p>Patient inquiries from marketing feed directly into your appointment system.</p>
            </div>
            <div className="benefit-card">
              <div className="benefit-number">3</div>
              <h4>Cost Effective</h4>
              <p>Save ₹20,000+ per month compared to buying marketing + software separately.</p>
            </div>
            <div className="benefit-card">
              <div className="benefit-number">4</div>
              <h4>Faster Growth</h4>
              <p>Proven 10-20% MoM growth with higher-tier plans unlocking accelerated outcomes.</p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="enhanced-comp-cta">
          <h2>Ready to Transform Your Clinic?</h2>
          <p>Get a complete bundled solution that actually drives patient growth</p>
          <button className="enhanced-cta-button" onClick={() => setOpen(true)}>
            Book Your Free Demo
          </button>
        </div>
      </section>

      <Footer />
      <Contactmodal open={open} handleClose={() => setOpen(false)} />
    </>
  );
};

export default Comparison;

