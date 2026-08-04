import React from "react";
import "./FeaturesStrip.css";

const features = [
  {
    animation: "/animations/marketing.json",
    label: "Marketing",
    sectionId: "marketing",
  },
  {
    animation: "/animations/branding.json",
    label: "Branding",
    sectionId: "marketing",
  },
  {
    animation: "/animations/content.json",
    label: "Content Creation",
    sectionId: "content-creation",
  },
  {
    animation:
      "/animations/wired-gradient-970-video-conference-hover-pinch.json",
    label: "Scheduling",
    sectionId: "scheduling",
  },
  {
    animation: "/animations/patient.json",
    label: "Patient Portal",
    sectionId: "admin-portal",
  },
  {
    animation: "/animations/documents.json",
    label: "Documents",
    sectionId: "documents",
  },
  {
    animation: "/animations/prescription.json",
    label: "e-Prescribing",
    sectionId: "eprescribing",
  },
  {
    animation: "/animations/billing.json",
    label: "Medical Billing",
    sectionId: "billing",
  },
  {
    animation: "/animations/admin.json",
    label: "Admin Portal",
    sectionId: "admin-portal",
  },
  {
    animation: "/animations/concierge.json",
    label: "Concierge Services",
    sectionId: "admin-portal",
  },
];

const FeaturesStrip = () => {
  return (
    <section className="features-strip" id="features">
      <div className="container">
        <p className="strip-title">
          Everything You Need From Scheduling to Admin Portal
        </p>

        <div className="strip-grid">
          {features.map((feature, index) => (
         
              <div className="strip-item">
                <lord-icon
                  src={feature.animation}
                  trigger="loop"
                  delay="1000"
                  colors="primary:#0f172a,secondary:#2563eb"
                  style={{ width: "60px", height: "60px" }}
                ></lord-icon>

                <span className="strip-label">{feature.label}</span>
              </div>

          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesStrip;