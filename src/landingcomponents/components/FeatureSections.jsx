import React from "react";
import "./FeatureSections.css";
import branding from "../Assets/Brandingimage.png";
import content from "../Assets/content.png";
import conciergeImg from "../Assets/concierge.png";

const MockScheduler = () => (
  <div className="patient-appointment-container" id="scheduling">
    <div className="patient-appointment-header">
      <span className="patient-appointment-title">📅 Dashboard / Appointment</span>
    </div>

    <div className="patient-appointment-layout">
      <div className="patient-appointment-popup">
        <div className="patient-appointment-left">
          <h4>Select Date</h4>
          <div className="calendar-box">
            <div className="patient-appointment-month">June</div>
            <div className="patient-appointment-days-grid">
              {[...Array(30)].map((_, i) => (
                <div 
                  key={i} 
                  className={`patient-appointment-day ${i === 18 ? "active" : ""}`}
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="patient-appointment-right">
          <h4>Appointment Details</h4>
          <div className="patient-appointment-field" />
          <div className="patient-appointment-field" />
          <div className="patient-appointment-field large" />
          <div className="patient-appointment-submit">Submit</div>
        </div>
      </div>
    </div>
  </div>
);

const MockDocuments = () => (
  <div className="digital-documents-container" id="documents">
    <div className="digital-documents-header">
      <span className="digital-documents-title">📂 Dashboard / Documents</span>
    </div>

    <div className="digital-documents-layout">
      <div className="digital-documents-left-grid">
        {[
          { title: "Prescription", date: "Dec 18, 2025" },
          { title: "Lab Report", date: "Dec 15, 2025" },
          { title: "X-Ray Report", date: "Dec 12, 2025" },
          { title: "Invoice Copy", date: "Dec 10, 2025" },
        ].map((doc, i) => (
          <div className="digital-documents-card" key={i}>
            <div className="digital-documents-icon">📁</div>
            <div className="digital-documents-card-title">{doc.title}</div>
            <div className="digital-documents-date">{doc.date}</div>
          </div>
        ))}
      </div>

      <div className="digital-documents-right">
        <div className="digital-documents-upload-box">
          <div className="digital-documents-upload-icon">📂</div>
          <p>Drop your documents or</p>
          <span className="digital-documents-browse-link">Click to browse</span>
        </div>

        <div className="file-input-mock">
          <div className="file-line"></div>
          <div className="file-label">File Name</div>
        </div>

        <div className="digital-documents-upload-btn">Upload File</div>
      </div>
    </div>
  </div>
);

const MockDigitalPrescription = () => (
  <div className="digital-rx-container" id="eprescribing">
    <div className="digital-rx-header">
      <span className="digital-rx-title">💊 Dashboard / Digital Prescriptions</span>
    </div>

    <div className="digital-rx-layout">
      <div className="digital-rx-left">
        <div className="digital-rx-summary">
          <div className="digital-rx-card">
            <div className="digital-rx-count">24</div>
            <div className="digital-rx-label">Total Prescriptions</div>
          </div>

          <div className="digital-rx-card">
            <div className="digital-rx-count">06</div>
            <div className="digital-rx-label">Pending Review</div>
          </div>
        </div>

        <div className="digital-rx-table">
          <div className="digital-rx-head">
            <span>Patient</span>
            <span>Medication</span>
            <span>Date</span>
            <span>Status</span>
          </div>

          {[
            {
              name: "Rahul",
              med: "Aspirin",
              date: "18/12/25",
              status: "Issued",
            },
            {
              name: "Arjun",
              med: "Celecoxib",
              date: "17/12/25",
              status: "Pending",
            },
            { name: "Ajay", med: "Zenox", date: "30/11/25", status: "Issued" },
            {
              name: "Rupa",
              med: "Ibuprofen",
              date: "16/12/25",
              status: "Issued",
            },
          ].map((rx, i) => (
            <div className="digital-rx-row" key={i}>
              <span>{rx.name}</span>
              <span>{rx.med}</span>
              <span>{rx.date}</span>
              <span className={`digital-rx-badge ${rx.status.toLowerCase()}`}>
                {rx.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="digital-rx-right">
        <div className="digital-rx-form-title">Create Prescription</div>

        <div className="digital-rx-input" />
        <div className="digital-rx-input" />
        <div className="digital-rx-input large" />
        <div className="digital-rx-input" />

        <div className="digital-rx-submit">Generate Prescription</div>
      </div>
    </div>
  </div>
);

const MockBilling = () => (
  <div className="smart-billing-container" id="billing">
    <div className="smart-billing-header">
      <span className="smart-billing-title">💰 Billing & Claims</span>
    </div>
    <div className="smart-billing-rows">
      {[
        {
          id: "BI - 1245",
          appid: "AppID - 1711",
          sub: "10,000",
          tax: "10%",
          total: "Amout - 11,000",
          date: "18/12/25",
          status: "Completed",
        },
        {
          id: "BI - 1246",
          appid: "AppID - 1542",
          sub: "8,500",
          tax: "10%",
          total: "Amout - 9,350",
          date: "19/12/25",
          status: "Completed",
        },
        {
          id: "BI - 1247",
          appid: "AppID - 2129",
          sub: "12,000",
          tax: "10%",
          total: "Amout - 13,200",
          date: "20/12/25",
          status: "Pending",
        },
        {
          id: "BI - 1248",
          appid: "AppID- 1365",
          sub: "6,000",
          tax: "10%",
          total: "Amout - 6,600",
          date: "21/12/25",
          status: "Completed",
        },
        {
          id: "BI - 1256",
          appid: "AppID - 1252",
          sub: "16,000",
          tax: "10%",
          total: "Amout - 17,600",
          date: "24/12/25",
          status: "Completed",
        },
        {
          id: "BI - 1295",
          appid: "AppID - 2119",
          sub: "21,000",
          tax: "10%",
          total: "Amout - 23,200",
          date: "31/12/25",
          status: "Pending",
        },
      ].map((r, i) => (
        <div className="smart-billing-row" key={i}>
          <span className="smart-billing-id">{r.id}</span>
          <span className="smart-billing-id">{r.appid}</span>
          <span className="smart-billing-amount">{r.total}</span>
          <span>{r.date}</span>
          <span className={`smart-billing-status ${r.status.toLowerCase()}`}>
            {r.status}
          </span>
        </div>
      ))}
    </div>
  </div>
);

const MockAttendance = () => (
  <div className="staff-attendance-container" id="admin-portal">
    <div className="staff-attendance-header">
      <span className="staff-attendance-title">📊 Dashboard / Attendance</span>
    </div>

    <div className="staff-attendance-wrapper">
      <div className="staff-attendance-date">Mon, 16 January 2026</div>

      <div className="staff-attendance-summary">
        <div className="staff-attendance-card">
          <div className="staff-attendance-circle"></div>
          <div>
            <div className="staff-attendance-label">Present</div>
            <div className="staff-attendance-value">08</div>
          </div>
        </div>

        <div className="staff-attendance-card">
          <div className="staff-attendance-circle absent"></div>
          <div>
            <div className="staff-attendance-label">Absent</div>
            <div className="staff-attendance-value">05</div>
          </div>
        </div>
      </div>

      <div className="staff-attendance-table">
        <div className="staff-attendance-head">
          <span>Doctor Name</span>
          <span>Attendance</span>
          <span>Check In</span>
          <span>Check Out</span>
        </div>

        {[
          {
            name: "John Wick",
            status: "Present",
            in: "09:00 AM",
            out: "05:00 PM",
          },
          {
            name: "Sarah Lee",
            status: "Absent",
            in: "10:00 AM",
            out: "06:00 PM",
          },
          {
            name: "Mike Ross",
            status: "Present",
            in: "09:15 AM",
            out: "05:10 PM",
          },
          {
            name: "Anna Kim",
            status: "Present",
            in: "08:55 AM",
            out: "05:00 PM",
          },
        ].map((row, i) => (
          <div className="staff-attendance-row" key={i}>
            <span>{row.name}</span>
            <span className={`staff-attendance-badge ${row.status.toLowerCase()}`}>
              {row.status}
            </span>
            <span>{row.in}</span>
            <span>{row.out}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const Branding = () => (
  <div className="branding-marketing-container" id="marketing">
    <img src={branding} alt="Branding&Marketing" />
  </div>
);

const Content = () => (
  <div className="content-creation-container" id="content-creation">
    <img src={content} alt="Content Creation" />
  </div>
);

const concierge = () => (
  <div className="content-creation-container" id="content-creation">
    <img src={conciergeImg} alt="Concierge" />
  </div>
);

const sections = [
  {
    id: "Patient Appointment Scheduling",
    tag: "Patient Appointment Scheduling",
    title: "Convenient appointment management for patients and providers.",
    bullets: [
      "Patients can book appointments easily",
      "Real-time availability tracking",
      "Reduced waiting time",
    ],
    Visual: MockScheduler,
    tagline: "Better scheduling means better patient experience.",
    reverse: true,
  },
  {
    id: "Digital Document Management System",
    tag: "Digital Document Management System",
    title: "Keep all medical and operational documents in one secure location.",
    bullets: [
      "Patient reports and medical history",
      "Lab results and diagnostic files",
      "Prescriptions and treatment records",
      "Administrative documents",
    ],
    Visual: MockDocuments,
    tagline: "Everything is organized and accessible when you need it.",
    reverse: false,
  },
  {
    id: "Digital Prescriptions",
    tag: "Digital Prescriptions",
    title: "Create and manage prescriptions efficiently.",
    bullets: [
      "Generate electronic prescriptions",
      "Access medication history",
      "Reduce manual errors",
      "Easy sharing with patients",
      "Faster consultation workflow",
    ],
    Visual: MockDigitalPrescription,
    tagline: "Simple, accurate, and paperless prescribing.",
    reverse: true,
  },
  {
    id: "Smart Billing System",
    tag: "Smart Billing System",
    title: "Simplify financial management with automated billing.",
    bullets: [
      "Generate patient invoices instantly",
      "Track payments",
      "Billing history and reports",
      "Transparent transaction records",
      "Efficient financial tracking",
    ],
    Visual: MockBilling,
    tagline: "Improve accuracy and save administrative time.",
    reverse: false,
  },
  {
    id: "Simplify Workforce Management",
    tag: "Staff Attendance Tracking",
    title:
      "Track staff attendance, and working hours in real time from one centralized dashboard.",
    bullets: [
      "Real-time staff attendance monitoring",
      "Check-in and check-out tracking",
      "Shift and schedule management",
      "Leave and absence tracking",
      "Automated attendance records",
    ],
    Visual: MockAttendance,
    reverse: true,
  },
  {
    id: "Branding And Marketing",
    tag: "BRANDING & MARKETING",
    title:
      "Build brand visibility and drive growth with smart marketing tools.",
    bullets: [
      "Unified brand identity management",
      "Campaign planning and execution",
      "Social media and digital marketing support",
      "Performance tracking and insights",
      "Consistent branding across all touchpoints",
    ],
    Visual: Branding,
    reverse: false,
  },
  {
    id: "Content Creation",
    tag: "CONTENT CREATION",
    title: "Create, manage, and publish content effortlessly.",
    bullets: [
      "Centralized content creation and editing",
      "Manage blogs, posts, creatives, and media assets",
      "Consistent messaging across platforms",
    ],
    Visual: Content,
    reverse: true,
  },

{
  id: "Concierge Services",
  tag: "CONCIERGE SERVICES",
  title: "Personalized patient assistance from hospital to home.",
  bullets: [
    "Dedicated support from hospital admission until safe arrival home",
    "Doorstep pickup and drop services for patients and attendants",
    "End-to-end coordination for appointments, transportation, and discharge",
    "Comfortable, reliable, and hassle-free assistance throughout the journey",
  ],
  Visual: concierge,
  reverse: false,
},
];

const FeatureSections = () => (
  <div id="features">
    {sections.map((sec) => {
      const Visual = sec.Visual;
      return (
        <section
          className={`feature-section ${sec.reverse ? "reverse" : ""}`}
          key={sec.id}
          id={sec.id}
        >
          <div className="container feature-inner">
            <div className="feature-content">
              <div className="section-label">{sec.tag}</div>
              <h2 className="section-title">{sec.title}</h2>
              <ul className="feature-bullets">
                {sec.bullets.map((b, i) => (
                  <li key={i}>
                    <span className="bullet-check">✓</span>
                    {b}
                  </li>
                ))}
              </ul>
            </div>
            <div className="feature-visual">
              <Visual />
            </div>
          </div>
        </section>
      );
    })}
  </div>
);

export default FeatureSections;