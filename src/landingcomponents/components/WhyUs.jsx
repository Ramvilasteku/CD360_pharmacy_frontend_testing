import React from "react";
import "./WhyUs.css";

const reasons = [
  {
    icon: "/animations/Why/design.json",
    title: "Designed for Simplicity",
    desc: "CareDesk360 is built with both healthcare professionals and patients in mind. Its clean, intuitive interface ensures smooth usage without complex training.",
  },
  {
    icon: "/animations/Why/dash.json",
    title: "Centralized Healthcare Management",
    desc: "Manage patients, appointments, prescriptions, reports, billing, and staff — all from a single unified platform. No more scattered systems or manual processes.",
  },
  {
    icon: "/animations/Why/user.json",
    title: "User-Friendly for Staff & Patients",
    desc: "An intuitive interface ensures smooth navigation for healthcare providers and convenient access for patients, making daily operations faster and simpler.",
  },
  {
    icon: "/animations/Why/digital.json",
    title: "Secure Digital Records",
    desc: "Protect sensitive medical information with reliable, secure data storage and controlled access, ensuring privacy and compliance at all times.",
  },
  {
    icon: "/animations/Why/control.json",
    title: "Streamlined Administrative Control",
    desc: "Automate workflows, monitor operations, and manage resources efficiently with complete administrative oversight.",
  },
  {
    icon: "/animations/Why/fast.json",
    title: "Faster Service, Better Care",
    desc: "Reduce waiting times, improve coordination, and deliver seamless care — enhancing overall patient satisfaction.",
  },
  {
    icon: "/animations/Why/marketing.json",
    title: "Marketing & Growth",
    desc: "Drive visibility and reach with strategic digital marketing. From social media and campaigns to performance tracking, we help attract the right audience and convert attention into measurable growth.",
  },
  {
    icon: "/animations/Why/branding.json",
    title: "Brand Identity",
    desc: "Build a consistent and recognizable brand presence. We help define your brand voice, visuals, and messaging to ensure your organization stands out with clarity, credibility, and professionalism.",
  },
  {
    icon: "/animations/Why/content.json",
    title: "Content Creation",
    desc: "Engage your audience with high-quality content tailored for Hospitals/Clinics. From visuals to messaging, we create meaningful content that builds trust and communicates value clearly across platforms.",
  },
];

const WhyUs = () => (
  <section className="why-us" id="whyus">
    <div className="container">
      <div className="about-header">
        <span className="badge">Smarter Healthcare Starts Here</span>
        <h1>Why Choose CareDesk360</h1>
        <p className="subtitle">
          CareDesk360 is designed to simplify healthcare management while
          improving efficiency, accuracy, and patient satisfaction. Our platform
          brings everything you need into one secure and easy-to-use system.
        </p>
      </div>
      <div className="section-header">
        <div className="section-label"></div>
        <h2 className="section-title"></h2>
        <p className="section-subtitle"></p>
      </div>
      <div className="why-grid">
        {reasons.map((r, i) => (
          <div className="why-card" key={i}>
            <lord-icon
              src={r.icon}
              trigger="loop"
              delay="1000"
              colors="primary:#0f172a,secondary:#2563eb"
              style={{ width: "60px", height: "60px" }}
            ></lord-icon>
            <h3 className="why-title">{r.title}</h3>
            <p className="why-desc">{r.desc}</p>
          </div>
        ))}
      </div>

      <iframe
        src="https://widgets.sociablekit.com/google-reviews/iframe/25687238"
        frameborder="0"
        width="100%"
        height="1000px"
      ></iframe>

      <iframe
        src="https://widgets.sociablekit.com/instagram-reels/iframe/25687241"
        frameborder="0"
        width="100%"
        height="1000px"
      ></iframe>

    </div>
  </section>
);

export default WhyUs;
