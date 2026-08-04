import React, { useState } from "react";
import "./Footer.css";
import Contactmodal from "./Contactmodal";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Modal from "@mui/material/Modal";
import CloseIcon from "@mui/icons-material/Close";
import { HashLink } from "react-router-hash-link";
import { NavLink, useNavigate } from "react-router-dom";

import nameLogo from "../Assets/caredesk360newlogo.jpeg";

const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "60%",
  height: 600,
  overflowY: "scroll",
  bgcolor: "background.paper",
  border: "0px solid #000",
  boxShadow: 24,
  p: 4,
};

const Footer = () => {
  const [open, setOpen] = useState(false);
  const [tcopen, setTcopen] = useState(false);
  const [ppopen, setPpopen] = useState(false);

  // const handleClose = () => setOpen(false);
  const handleTcClose = () => setTcopen(false);
  const handlePpClose = () => setPpopen(false);

  const navigate = useNavigate();

  const scrollToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
};

  return (
    <footer className="footer">
      <div className="footer-top">
        <div className="container footer-top-inner">
          {/* BRAND */}
          <div className="footer-brand">
            <div className="footer-logo">
              <img src={nameLogo} alt="logo" style={{ width: "40%" }} />
            </div>

            <p>
              CareDesk360 is a healthcare management software designed for
              clinics, hospitals, and medical practitioners. It simplifies
              patient records, appointments, staff coordination, and operational
              workflows to ensure smooth, efficient, and quality healthcare
              delivery.
            </p>

            <div className="footer-socials">
              <a
                href="https://www.linkedin.com/company/109917971/admin/dashboard/"
                className="social-link"
              >
                <lord-icon
                  src="/animations/social/in.json"
                  trigger="loop"
                  delay="2000"
                  // colors="primary:#ffffff"
                  style={{ width: "38px", height: "38px" }}
                ></lord-icon>
              </a>
              <a
                href="https://www.instagram.com/ridgeveda/"
                className="social-link"
              >
                <lord-icon
                  src="/animations/social/insta.json"
                  trigger="loop"
                  delay="2000"
                  // colors="primary:#ffffff"
                  style={{ width: "38px", height: "38px" }}
                ></lord-icon>
              </a>

              <a
                href="https://www.facebook.com/profile.php?id=61583992647403"
                className="social-link"
              >
                <lord-icon
                  src="/animations/social/face.json"
                  trigger="loop"
                  delay="2000"
                  // colors="primary:#ffffff"
                  style={{ width: "38px", height: "38px" }}
                ></lord-icon>
              </a>

              <a href="https://x.com/RidgeVeda18911" className="social-link">
                <lord-icon
                  src="/animations/social/x.json"
                  trigger="loop"
                  delay="2000"
                  // colors="primary:#ffffff"
                  style={{ width: "38px", height: "38px" }}
                ></lord-icon>
              </a>

              <a
                href="https://youtube.com/@ridgeveda?si=_hHhDZqjtCmKOiti"
                className="social-link"
              >
                <lord-icon
                  src="/animations/social/youtube.json"
                  trigger="loop"
                  delay="2000"
                  // colors="primary:#ffffff"
                  style={{ width: "38px", height: "38px" }}
                ></lord-icon>
              </a>
            </div>
            <iframe
              className="map-container"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3444.0734418496095!2d78.39370847516679!3d17.468086183432963!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bcb91ac14184255%3A0xc38e5d80832a86ea!2sRidgeveda%20Solutions%20Pvt%20Ltd!5e1!3m2!1sen!2sin!4v1780721362693!5m2!1sen!2sin"
              allowFullScreen
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Google Map"
            />
          </div>

          {/* LINKS SECTION */}
          <div className="footer-links">
            {/* COMPANY */}
            <div className="footer-col">
              <h4>Company</h4>
              <ul>
                <li>
                  <HashLink smooth to="/">
                    Home
                  </HashLink>
                </li>

                <li>
                  <HashLink smooth to="/#features">
                    Features
                  </HashLink>
                </li>

                 <li>
                  <HashLink smooth to="/aboutus" onClick={scrollToTop}>
                    About Us
                  </HashLink>
                </li>

                <li>
                  <NavLink to="/pricing"  onClick={scrollToTop}>Pricing</NavLink>
                </li>
              

                <li>
                  <HashLink smooth to="/whyus" onClick={scrollToTop}>
                    Why CareDesk360
                  </HashLink>
                </li>

                <li>
                  <a href="mailto:info@caredesk360.com">Support & Help</a>
                </li>

                <li>
                  <button
                    type="button"
                    className="footer-link-button"
                    onClick={() => setTcopen(true)}
                  >
                    Terms and Conditions
                  </button>
                </li>

                <li>
                  <button
                    type="button"
                    className="footer-link-button"
                    onClick={() => setPpopen(true)}
                  >
                    Privacy Policy
                  </button>
                </li>
              </ul>
            </div>

            {/* USEFUL LINKS */}
            <div className="footer-col">
              <h4>Useful links</h4>
              <ul>
                <li>
                  <button
                    type="button"
                    className="footer-link-button"
                    onClick={() => navigate("/login")}
                  >
                    Login
                  </button>
                </li>

                <li>
                  <button
                    type="button"
                    className="footer-link-button"
                    onClick={() => setOpen(true)}
                  >
                    Signup
                  </button>
                </li>

                <li>
                  <button
                    type="button"
                    className="footer-link-button"
                    onClick={() => setOpen(true)}
                  >
                    Free Demo
                  </button>
                </li>

                <li>
                  <button
                    type="button"
                    className="footer-link-button"
                    onClick={() => setOpen(true)}
                  >
                    Contact Us
                  </button>
                </li>
              </ul>
            </div>

            {/* CONTACT */}
            <div className="footer-col">
              <h4>Get in touch</h4>
              <ul>
                {/* <li>Call</li> */}
                <a href="tel:+918977108950">
                  <li>📞 +91 8977108950</li>
                </a>
                {/* <li>Email</li> */}
                <a href="mailto:info@ridgeveda.com">
                  <li>✉️ info@ridgeveda.com</li>
                </a>
              </ul>

              <div style={{ marginTop: "15px" }}>
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg"
                  alt="Google Play"
                  style={{ width: "140px" }}
                />
                <p style={{ fontSize: "12px", marginTop: "5px" }}>
                  coming soon...
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM */}
      <div className="footer-bottom">
        <div className="container footer-bottom-inner">
          <p>
            © {new Date().getFullYear()} Ridgeveda Solutions Private Limited.
            All rights reserved
          </p>

          <p>Powered by CareDesk360</p>
        </div>
        <div></div>
      </div>
      <Contactmodal open={open} handleClose={() => setOpen(false)} />

      {/* Terms and conditions */}
      <Modal
        open={tcopen}
        onClose={handleTcClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box sx={style}>
          <div className="d-flex align-items-center justify-content-between mb-3">
            <Typography variant="h4" gutterBottom>
              TERMS & CONDITIONS
            </Typography>

            <Button
              variant="text"
              onClick={handleTcClose}
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                textTransform: "none",
                color: "red",
              }}
            >
              <CloseIcon /> Close
            </Button>
          </div>
          <Typography variant="h6" gutterBottom>
            {" "}
            CareDesk360 – Clinic & Healthcare Management Platform{" "}
          </Typography>{" "}
          <Typography variant="body2" paragraph>
            {" "}
            Effective Date: 26 May 2026{" "}
          </Typography>{" "}
          <Typography variant="body2" paragraph>
            {" "}
            These Terms & Conditions ("Terms", "Agreement") govern the access,
            subscription, usage, licensing, and operation of CareDesk360, a
            proprietary healthcare technology product owned and operated by
            Ridgeveda Solutions Private Limited ("Company", "Ridgeveda", "we",
            "our", or "us").{" "}
          </Typography>{" "}
          <Typography variant="body2" paragraph>
            {" "}
            By accessing, registering, subscribing to, or using CareDesk360, the
            clinic, hospital, healthcare institution, doctor, administrator,
            consultant, employee, representative, or authorized user ("User")
            acknowledges that they have read, understood, and agreed to be
            legally bound by these Terms.{" "}
          </Typography>{" "}
          <Typography variant="body2" paragraph>
            {" "}
            If the User does not agree to these Terms, the User must immediately
            discontinue usage of the Platform.{" "}
          </Typography>{" "}
          {/* 1. DEFINITIONS */}{" "}
          <Typography variant="h5" sx={{ mt: 3, mb: 2 }}>
            {" "}
            1. DEFINITIONS{" "}
          </Typography>{" "}
          <Typography variant="body2" paragraph>
            {" "}
            For the purposes of this Agreement:{" "}
          </Typography>{" "}
          <Typography variant="body2" paragraph>
            {" "}
            • "Platform" refers to CareDesk360, including its software systems,
            dashboards, mobile applications, APIs, websites, communication
            systems, and associated digital services.{" "}
          </Typography>{" "}
          <Typography variant="body2" paragraph>
            {" "}
            • "Company" refers to Ridgeveda Solutions Private Limited.{" "}
          </Typography>{" "}
          <Typography variant="body2" paragraph>
            {" "}
            • "User" refers to any clinic, hospital, healthcare institution,
            doctor, employee, consultant, staff member, or authorized
            representative using the Platform.{" "}
          </Typography>{" "}
          <Typography variant="body2" paragraph>
            {" "}
            • "Services" refers to all operational, administrative, technical,
            software, automation, reporting, and healthcare management
            functionalities offered through CareDesk360.{" "}
          </Typography>{" "}
          <Typography variant="body2" paragraph>
            {" "}
            • "Data" refers to all information uploaded, processed, stored, or
            generated through the Platform.{" "}
          </Typography>{" "}
          {/* 2. NATURE OF SERVICES */}{" "}
          <Typography variant="h5" sx={{ mt: 3, mb: 2 }}>
            {" "}
            2. NATURE OF SERVICES{" "}
          </Typography>{" "}
          <Typography variant="body2" paragraph>
            {" "}
            CareDesk360 is a healthcare operations and clinic management
            software platform intended to assist healthcare institutions
            with:{" "}
          </Typography>{" "}
          <Typography variant="body2" paragraph>
            • Appointment management
          </Typography>{" "}
          <Typography variant="body2" paragraph>
            • Clinic operations
          </Typography>{" "}
          <Typography variant="body2" paragraph>
            • Patient workflow management
          </Typography>{" "}
          <Typography variant="body2" paragraph>
            • Billing and invoicing
          </Typography>{" "}
          <Typography variant="body2" paragraph>
            • Inventory management
          </Typography>{" "}
          <Typography variant="body2" paragraph>
            • Staff and consultant management
          </Typography>{" "}
          <Typography variant="body2" paragraph>
            • Reporting systems
          </Typography>{" "}
          <Typography variant="body2" paragraph>
            • Payroll administration
          </Typography>{" "}
          <Typography variant="body2" paragraph>
            • Healthcare business operations
          </Typography>{" "}
          <Typography variant="body2" paragraph>
            {" "}
            The Platform functions strictly as a software and technology
            infrastructure provider.{" "}
          </Typography>{" "}
          <Typography variant="body2" paragraph>
            {" "}
            CareDesk360 does not:{" "}
          </Typography>{" "}
          <Typography variant="body2" paragraph>
            • Provide medical consultation
          </Typography>{" "}
          <Typography variant="body2" paragraph>
            • Participate in diagnosis or treatment
          </Typography>{" "}
          <Typography variant="body2" paragraph>
            • Guarantee medical outcomes
          </Typography>{" "}
          <Typography variant="body2" paragraph>
            • Supervise healthcare professionals
          </Typography>{" "}
          <Typography variant="body2" paragraph>
            • Assume responsibility for patient care decisions
          </Typography>{" "}
          <Typography variant="body2" paragraph>
            {" "}
            All medical responsibility remains solely with the healthcare
            provider.{" "}
          </Typography>{" "}
          {/* 3. ELIGIBILITY */}{" "}
          <Typography variant="h5" sx={{ mt: 3, mb: 2 }}>
            {" "}
            3. ELIGIBILITY{" "}
          </Typography>{" "}
          <Typography variant="body2" paragraph>
            {" "}
            By using the Platform, the User represents and warrants that:{" "}
          </Typography>{" "}
          <Typography variant="body2" paragraph>
            {" "}
            • They possess legal authority to enter into this Agreement.{" "}
          </Typography>{" "}
          <Typography variant="body2" paragraph>
            {" "}
            • All information provided is accurate and lawful.{" "}
          </Typography>{" "}
          <Typography variant="body2" paragraph>
            {" "}
            • They shall comply with all applicable laws and regulations.{" "}
          </Typography>{" "}
          <Typography variant="body2" paragraph>
            {" "}
            • They are authorized to act on behalf of the clinic or organization
            where applicable.{" "}
          </Typography>{" "}
          <Typography variant="body2" paragraph>
            {" "}
            Unauthorized use of the Platform is strictly prohibited.{" "}
          </Typography>{" "}
          {/* Continue the exact same structure for Sections 4–19 */}{" "}
          <Typography variant="h5" sx={{ mt: 3, mb: 2 }}>
            {" "}
            4. ACCOUNT ACCESS & SECURITY{" "}
          </Typography>{" "}
          <Typography variant="body2" paragraph>
            {" "}
            Users are solely responsible for maintaining confidentiality of
            login credentials, restricting unauthorized access, safeguarding
            passwords, monitoring user activity within their organization, and
            ensuring lawful internal usage of the Platform.{" "}
          </Typography>{" "}
          <Typography variant="body2" paragraph>
            {" "}
            Any activity conducted through authorized accounts shall be deemed
            the responsibility of the respective User.{" "}
          </Typography>{" "}
          <Typography variant="body2" paragraph>
            {" "}
            CareDesk360 shall not be liable for losses arising from credential
            misuse, unauthorized access, or negligence by Users.{" "}
          </Typography>
          {/* 5. DATA OWNERSHIP */}
          <Typography variant="h5" sx={{ mt: 3, mb: 2 }}>
            5. DATA OWNERSHIP
          </Typography>
          <Typography variant="body2" paragraph>
            All patient records, clinic information, operational records,
            healthcare documentation, reports, prescriptions, and uploaded
            materials remain the exclusive property of the respective healthcare
            institution or User.
          </Typography>
          <Typography variant="body2" paragraph>
            Ridgeveda Solutions Private Limited does not claim ownership over
            User or patient data stored within the Platform.
          </Typography>
          <Typography variant="body2" paragraph>
            The Company acts solely as a technology service provider and data
            processor.
          </Typography>
          {/* 6. PATIENT DATA & CONFIDENTIALITY */}
          <Typography variant="h5" sx={{ mt: 3, mb: 2 }}>
            6. PATIENT DATA & CONFIDENTIALITY
          </Typography>
          <Typography variant="body2" paragraph>
            CareDesk360 maintains strict confidentiality obligations regarding
            healthcare-related information.
          </Typography>
          <Typography variant="body2" paragraph>
            Accordingly:
          </Typography>
          <Typography variant="body2" paragraph>
            • Patient data shall not be sold, rented, traded, or commercially
            exploited.
          </Typography>
          <Typography variant="body2" paragraph>
            • Patient information shall not be used for marketing or advertising
            purposes.
          </Typography>
          <Typography variant="body2" paragraph>
            • Access to patient records shall remain restricted and controlled.
          </Typography>
          <Typography variant="body2" paragraph>
            • Any technical-access requirement shall remain limited,
            confidential, monitored, and purpose-specific.
          </Typography>
          <Typography variant="body2" paragraph>
            Users remain solely responsible for:
          </Typography>
          <Typography variant="body2" paragraph>
            • Obtaining patient consent where legally required.
          </Typography>
          <Typography variant="body2" paragraph>
            • Ensuring lawful data collection.
          </Typography>
          <Typography variant="body2" paragraph>
            • Complying with healthcare privacy regulations.
          </Typography>
          <Typography variant="body2" paragraph>
            • Maintaining regulatory compliance within their jurisdiction.
          </Typography>
          {/* 7. LICENSE & PERMITTED USE */}
          <Typography variant="h5" sx={{ mt: 3, mb: 2 }}>
            7. LICENSE & PERMITTED USE
          </Typography>
          <Typography variant="body2" paragraph>
            Subject to compliance with these Terms, CareDesk360 grants the User
            a limited, non-transferable, non-exclusive, revocable license to
            access and use the Platform for legitimate healthcare operational
            purposes.
          </Typography>
          <Typography variant="body2" paragraph>
            The User shall not:
          </Typography>
          <Typography variant="body2" paragraph>
            • Copy, replicate, or redistribute the Platform.
          </Typography>
          <Typography variant="body2" paragraph>
            • Reverse engineer or decompile the software.
          </Typography>
          <Typography variant="body2" paragraph>
            • Create derivative works.
          </Typography>
          <Typography variant="body2" paragraph>
            • Sublicense or commercially resell the Platform.
          </Typography>
          <Typography variant="body2" paragraph>
            • Attempt unauthorized access to infrastructure.
          </Typography>
          <Typography variant="body2" paragraph>
            • Interfere with system security.
          </Typography>
          <Typography variant="body2" paragraph>
            • Misuse APIs, databases, or operational workflows.
          </Typography>
          <Typography variant="body2" paragraph>
            Any unauthorized usage may result in immediate suspension, legal
            action, or termination.
          </Typography>
          {/* 8. SUBSCRIPTION, BILLING, PAYMENT & REFUND POLICY */}
          <Typography variant="h5" sx={{ mt: 3, mb: 2 }}>
            8. SUBSCRIPTION, BILLING, PAYMENT & REFUND POLICY
          </Typography>
          <Typography variant="body2" paragraph>
            By subscribing to, purchasing, or using CareDesk360 ("Services"),
            the User expressly acknowledges, understands, and agrees to the
            following commercial terms and conditions:
          </Typography>
          <Typography variant="h6" sx={{ mt: 2 }}>
            8.1 Subscription & Payment Obligations
          </Typography>
          <Typography variant="body2" paragraph>
            a. The User shall pay all applicable subscription fees, onboarding
            charges, implementation fees, customization charges, and any other
            charges specified by Ridgeveda Solutions Private Limited.
          </Typography>
          <Typography variant="body2" paragraph>
            b. Subscription fees are payable in advance and are due immediately
            upon invoice generation unless otherwise agreed in writing.
          </Typography>
          <Typography variant="body2" paragraph>
            c. Access to the Services is contingent upon successful receipt of
            payment.
          </Typography>
          <Typography variant="body2" paragraph>
            d. Failure to make timely payments may result in suspension,
            restriction, or termination without prior notice.
          </Typography>
          <Typography variant="body2" paragraph>
            e. The Company reserves the right to revise pricing, plans, and
            commercial terms with reasonable prior notice.
          </Typography>
          <Typography variant="h6" sx={{ mt: 2 }}>
            8.2 Refund Eligibility
          </Typography>
          <Typography variant="body2" paragraph>
            a. Refund requests may be submitted within twenty-four (24) hours of
            the initial subscription purchase.
          </Typography>
          <Typography variant="body2" paragraph>
            b. Requests received after twenty-four (24) hours may be rejected.
          </Typography>
          <Typography variant="body2" paragraph>
            c. Refund requests must be submitted through official support
            channels with proof of payment.
          </Typography>
          <Typography variant="body2" paragraph>
            d. Approval remains subject to transaction verification.
          </Typography>
          <Typography variant="h6" sx={{ mt: 2 }}>
            8.3 Non-Refundable Circumstances
          </Typography>
          <Typography variant="body2" paragraph>
            • Partial usage of Services.
          </Typography>
          <Typography variant="body2" paragraph>
            • Failure to utilize Services after purchase.
          </Typography>
          <Typography variant="body2" paragraph>
            • Dissatisfaction based on preferences or expectations.
          </Typography>
          <Typography variant="body2" paragraph>
            • Lack of training or technical knowledge.
          </Typography>
          <Typography variant="body2" paragraph>
            • Suspension due to Terms violations.
          </Typography>
          <Typography variant="body2" paragraph>
            • Subscription renewals not cancelled before renewal.
          </Typography>
          <Typography variant="body2" paragraph>
            • Custom development, integrations, onboarding, consulting,
            migration, or training services.
          </Typography>
          <Typography variant="body2" paragraph>
            • Requests submitted after the refund window.
          </Typography>
          <Typography variant="h6" sx={{ mt: 2 }}>
            8.4 Refund Processing
          </Typography>
          <Typography variant="body2" paragraph>
            a. Approved refunds shall be processed through the original payment
            method.
          </Typography>
          <Typography variant="body2" paragraph>
            b. Refunds are generally credited within five (5) to seven (7)
            business days.
          </Typography>
          <Typography variant="body2" paragraph>
            c. The Company is not liable for delays caused by banks or payment
            providers.
          </Typography>
          <Typography variant="h6" sx={{ mt: 2 }}>
            8.5 Chargebacks & Payment Disputes
          </Typography>
          <Typography variant="body2" paragraph>
            a. Users agree not to initiate chargebacks before giving the Company
            an opportunity to resolve the issue.
          </Typography>
          <Typography variant="body2" paragraph>
            b. Fraudulent chargebacks may result in suspension, termination, and
            legal action.
          </Typography>
          <Typography variant="body2" paragraph>
            c. The Company may submit usage logs, invoices, payment records, and
            other evidence in dispute proceedings.
          </Typography>
          <Typography variant="h6" sx={{ mt: 2 }}>
            8.6 Governing Law & Jurisdiction
          </Typography>
          <Typography variant="body2" paragraph>
            This Refund Policy and all related commercial matters shall be
            governed by the laws of Telangana and India.
          </Typography>
          <Typography variant="body2" paragraph>
            Courts located in Greater Hyderabad, Telangana shall have exclusive
            jurisdiction over disputes relating to subscriptions, payments, or
            refunds.
          </Typography>
          {/* 9. SERVICE AVAILABILITY */}
          <Typography variant="h5" sx={{ mt: 3, mb: 2 }}>
            9. SERVICE AVAILABILITY
          </Typography>
          <Typography variant="body2" paragraph>
            While CareDesk360 endeavors to maintain uninterrupted access, the
            Company does not guarantee:
          </Typography>
          <Typography variant="body2" paragraph>
            • Uninterrupted uptime.
          </Typography>
          <Typography variant="body2" paragraph>
            • Error-free operation.
          </Typography>
          <Typography variant="body2" paragraph>
            • Permanent service availability.
          </Typography>
          <Typography variant="body2" paragraph>
            • Compatibility with all external systems or devices.
          </Typography>
          <Typography variant="body2" paragraph>
            Temporary interruptions may occur due to:
          </Typography>
          <Typography variant="body2" paragraph>
            • Maintenance.
          </Typography>
          <Typography variant="body2" paragraph>
            • Upgrades.
          </Typography>
          <Typography variant="body2" paragraph>
            • Cybersecurity events.
          </Typography>
          <Typography variant="body2" paragraph>
            • Server failures.
          </Typography>
          <Typography variant="body2" paragraph>
            • Third-party infrastructure disruptions.
          </Typography>
          <Typography variant="body2" paragraph>
            • Force majeure events.
          </Typography>
          {/* 10. THIRD-PARTY SERVICES */}
          <Typography variant="h5" sx={{ mt: 3, mb: 2 }}>
            10. THIRD-PARTY SERVICES
          </Typography>
          <Typography variant="body2" paragraph>
            The Platform may integrate with or utilize third-party services
            including:
          </Typography>
          <Typography variant="body2" paragraph>
            • Payment gateways.
          </Typography>
          <Typography variant="body2" paragraph>
            • Cloud hosting systems.
          </Typography>
          <Typography variant="body2" paragraph>
            • Communication providers.
          </Typography>
          <Typography variant="body2" paragraph>
            • Analytics systems.
          </Typography>
          <Typography variant="body2" paragraph>
            • Infrastructure vendors.
          </Typography>
          <Typography variant="body2" paragraph>
            CareDesk360 shall not be liable for interruptions, losses, breaches,
            or damages attributable to third-party providers beyond reasonable
            control.
          </Typography>
          {/* 11. INTELLECTUAL PROPERTY RIGHTS */}
          <Typography variant="h5" sx={{ mt: 3, mb: 2 }}>
            11. INTELLECTUAL PROPERTY RIGHTS
          </Typography>
          <Typography variant="body2" paragraph>
            All intellectual property associated with CareDesk360, including:
          </Typography>
          <Typography variant="body2" paragraph>
            • Software architecture.
          </Typography>
          <Typography variant="body2" paragraph>
            • Source code.
          </Typography>
          <Typography variant="body2" paragraph>
            • Workflows.
          </Typography>
          <Typography variant="body2" paragraph>
            • Dashboards.
          </Typography>
          <Typography variant="body2" paragraph>
            • UI/UX structures.
          </Typography>
          <Typography variant="body2" paragraph>
            • Branding.
          </Typography>
          <Typography variant="body2" paragraph>
            • Business methodologies.
          </Typography>
          <Typography variant="body2" paragraph>
            • Operational systems.
          </Typography>
          <Typography variant="body2" paragraph>
            • Proprietary documentation.
          </Typography>
          <Typography variant="body2" paragraph>
            Shall remain the exclusive property of Ridgeveda Solutions Private
            Limited.
          </Typography>
          <Typography variant="body2" paragraph>
            Nothing within these Terms transfers ownership rights to the User.
          </Typography>
          <Typography variant="body2" paragraph>
            Unauthorized reproduction, copying, resale, or commercial
            exploitation is strictly prohibited.
          </Typography>
          {/* 12. PROHIBITED ACTIVITIES */}
          <Typography variant="h5" sx={{ mt: 3, mb: 2 }}>
            12. PROHIBITED ACTIVITIES
          </Typography>
          <Typography variant="body2" paragraph>
            Users shall not:
          </Typography>
          <Typography variant="body2" paragraph>
            • Upload unlawful or fraudulent information.
          </Typography>
          <Typography variant="body2" paragraph>
            • Misuse patient records.
          </Typography>
          <Typography variant="body2" paragraph>
            • Violate healthcare regulations.
          </Typography>
          <Typography variant="body2" paragraph>
            • Attempt hacking or unauthorized access.
          </Typography>
          <Typography variant="body2" paragraph>
            • Disrupt Platform operations.
          </Typography>
          <Typography variant="body2" paragraph>
            • Transmit malware or harmful code.
          </Typography>
          <Typography variant="body2" paragraph>
            • Use the Platform for unlawful purposes.
          </Typography>
          <Typography variant="body2" paragraph>
            • Interfere with system security mechanisms.
          </Typography>
          <Typography variant="body2" paragraph>
            Violation may result in immediate account suspension and legal
            proceedings.
          </Typography>
          {/* 13. LIMITATION OF LIABILITY */}
          <Typography variant="h5" sx={{ mt: 3, mb: 2 }}>
            13. LIMITATION OF LIABILITY
          </Typography>
          <Typography variant="body2" paragraph>
            To the maximum extent permissible under applicable law, CareDesk360
            and Ridgeveda Solutions Private Limited shall not be liable for:
          </Typography>
          <Typography variant="body2" paragraph>
            • Medical negligence by healthcare providers.
          </Typography>
          <Typography variant="body2" paragraph>
            • Treatment outcomes.
          </Typography>
          <Typography variant="body2" paragraph>
            • Patient disputes.
          </Typography>
          <Typography variant="body2" paragraph>
            • Loss of profits or business opportunities.
          </Typography>
          <Typography variant="body2" paragraph>
            • Indirect or consequential damages.
          </Typography>
          <Typography variant="body2" paragraph>
            • Cyberattacks.
          </Typography>
          <Typography variant="body2" paragraph>
            • Infrastructure failures.
          </Typography>
          <Typography variant="body2" paragraph>
            • Internet interruptions.
          </Typography>
          <Typography variant="body2" paragraph>
            • Unauthorized access caused by User negligence.
          </Typography>
          <Typography variant="body2" paragraph>
            • Data corruption caused by external systems.
          </Typography>
          <Typography variant="body2" paragraph>
            • Force majeure events.
          </Typography>
          <Typography variant="body2" paragraph>
            In all circumstances, aggregate liability shall not exceed the
            subscription fees paid by the User during the preceding three (3)
            months.
          </Typography>
          {/* 14. INDEMNIFICATION */}
          <Typography variant="h5" sx={{ mt: 3, mb: 2 }}>
            14. INDEMNIFICATION
          </Typography>
          <Typography variant="body2" paragraph>
            The User agrees to indemnify, defend, and hold harmless CareDesk360
            and Ridgeveda Solutions Private Limited from any claims,
            liabilities, damages, penalties, losses, or legal expenses arising
            from:
          </Typography>
          <Typography variant="body2" paragraph>
            • Violation of these Terms.
          </Typography>
          <Typography variant="body2" paragraph>
            • Unlawful use of the Platform.
          </Typography>
          <Typography variant="body2" paragraph>
            • Healthcare regulatory violations.
          </Typography>
          <Typography variant="body2" paragraph>
            • Patient disputes.
          </Typography>
          <Typography variant="body2" paragraph>
            • Data misuse.
          </Typography>
          <Typography variant="body2" paragraph>
            • Negligence.
          </Typography>
          <Typography variant="body2" paragraph>
            • Unauthorized activities conducted by the User.
          </Typography>
          {/* 15. TERMINATION & SUSPENSION */}
          <Typography variant="h5" sx={{ mt: 3, mb: 2 }}>
            15. TERMINATION & SUSPENSION
          </Typography>
          <Typography variant="body2" paragraph>
            CareDesk360 reserves the absolute right to suspend, restrict, or
            terminate access without prior notice where:
          </Typography>
          <Typography variant="body2" paragraph>
            • Payment defaults occur.
          </Typography>
          <Typography variant="body2" paragraph>
            • Unlawful activities are detected.
          </Typography>
          <Typography variant="body2" paragraph>
            • Cybersecurity threats arise.
          </Typography>
          <Typography variant="body2" paragraph>
            • Misuse of the Platform occurs.
          </Typography>
          <Typography variant="body2" paragraph>
            • Operational integrity is threatened.
          </Typography>
          <Typography variant="body2" paragraph>
            Termination shall not affect accrued payment obligations or legal
            remedies available to the Company.
          </Typography>
          {/* 16. FORCE MAJEURE */}
          <Typography variant="h5" sx={{ mt: 3, mb: 2 }}>
            16. FORCE MAJEURE
          </Typography>
          <Typography variant="body2" paragraph>
            The Company shall not be liable for failure or delay in performance
            caused by circumstances beyond reasonable control, including:
          </Typography>
          <Typography variant="body2" paragraph>
            • Natural disasters.
          </Typography>
          <Typography variant="body2" paragraph>
            • Cyberattacks.
          </Typography>
          <Typography variant="body2" paragraph>
            • War.
          </Typography>
          <Typography variant="body2" paragraph>
            • Governmental restrictions.
          </Typography>
          <Typography variant="body2" paragraph>
            • Internet outages.
          </Typography>
          <Typography variant="body2" paragraph>
            • Infrastructure failures.
          </Typography>
          <Typography variant="body2" paragraph>
            • Labor disputes.
          </Typography>
          <Typography variant="body2" paragraph>
            • Force majeure events.
          </Typography>
          {/* 17. MODIFICATION OF TERMS */}
          <Typography variant="h5" sx={{ mt: 3, mb: 2 }}>
            17. MODIFICATION OF TERMS
          </Typography>
          <Typography variant="body2" paragraph>
            Ridgeveda Solutions Private Limited reserves the unilateral right to
            revise, amend, or modify these Terms at any time.
          </Typography>
          <Typography variant="body2" paragraph>
            Continued use of the Platform following modifications shall
            constitute acceptance of the revised Terms.
          </Typography>
          {/* 18. GOVERNING LAW & JURISDICTION */}
          <Typography variant="h5" sx={{ mt: 3, mb: 2 }}>
            18. GOVERNING LAW & JURISDICTION
          </Typography>
          <Typography variant="body2" paragraph>
            These Terms shall be governed and interpreted in accordance with the
            laws of India.
          </Typography>
          <Typography variant="body2" paragraph>
            Any disputes arising out of or relating to these Terms shall be
            subject to the exclusive jurisdiction of the competent courts
            located in Greater Hyderabad Area, Telangana, India.
          </Typography>
          {/* 19. CONTACT INFORMATION */}
          <Typography variant="h5" sx={{ mt: 3, mb: 2 }}>
            19. CONTACT INFORMATION
          </Typography>
          <Typography variant="body2" paragraph>
            Legal & Compliance Department
          </Typography>
          <Typography variant="body2" paragraph>
            CareDesk360 – A Product of Ridgeveda Solutions Private Limited
          </Typography>
          <Typography variant="body2" paragraph>
            Email: info@ridgeveda.com
          </Typography>
          <Typography variant="body2" paragraph>
            Website:{" "}
            <a
              href="https://caredesk360.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              https://caredesk360.com
            </a>
          </Typography>
        </Box>
      </Modal>

      {/* Privacy Policy */}
      <Modal
        open={ppopen}
        onClose={handlePpClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box sx={style}>
          <div className="d-flex align-items-center justify-content-between mb-3">
            <Typography variant="h4" gutterBottom>
              PRIVACY POLICY
            </Typography>

            <Button
              variant="text"
              onClick={handlePpClose}
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                textTransform: "none",
                color: "red",
              }}
            >
              <CloseIcon /> Close
            </Button>
          </div>

          <Typography variant="h6" gutterBottom>
            CareDesk360 – Clinic & Healthcare Management Platform
          </Typography>

          <Typography variant="body1" gutterBottom>
            Effective Date: 26 May 2026
          </Typography>

          <Typography variant="body1" paragraph>
            This Privacy Policy (“Policy”) governs the collection, processing,
            storage, protection, disclosure, and use of information by
            CareDesk360, a product and proprietary healthcare technology
            platform owned, operated, and managed by Ridgeveda Solutions Private
            Limited (“Company”, “Ridgeveda”, “we”, “our”, or “us”), in
            connection with its healthcare software products, clinic management
            systems, applications, APIs, websites, communication systems, and
            associated digital services.
          </Typography>

          <Typography variant="body1" paragraph>
            By accessing, subscribing to, registering with, or using
            CareDesk360, the clinic, hospital, healthcare institution, doctor,
            consultant, employee, administrator, or authorized representative
            (“User”) acknowledges, understands, and agrees to the terms,
            obligations, and legal conditions set forth herein.
          </Typography>

          <Typography variant="h5" gutterBottom>
            1. COMPANY INFORMATION
          </Typography>

          <Typography variant="body1" paragraph>
            CareDesk360 is a proprietary healthcare technology product
            developed, owned, licensed, and operated by:
          </Typography>

          <Typography variant="body1" paragraph>
            Ridgeveda Solutions Private Limited
          </Typography>

          <Typography variant="body1" paragraph>
            India
          </Typography>

          <Typography variant="body1" paragraph>
            CareDesk360 functions as a secure digital clinic and healthcare
            management platform intended to support healthcare institutions
            through operational automation, workflow digitization, patient
            management systems, appointment scheduling, billing systems,
            reporting tools, inventory management, and administrative healthcare
            infrastructure.
          </Typography>

          <Typography variant="h5" gutterBottom>
            2. LEGAL STATUS OF CAREDESK360
          </Typography>

          <Typography variant="body1" paragraph>
            CareDesk360 operates strictly as a software technology platform and
            infrastructure provider.
          </Typography>

          <Typography variant="body1" paragraph>
            The Platform does not:
          </Typography>

          <ul>
            <li>
              <Typography variant="body1">provide medical advice</Typography>
            </li>
            <li>
              <Typography variant="body1">practice medicine</Typography>
            </li>
            <li>
              <Typography variant="body1">
                interfere with clinical decision-making
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                guarantee medical outcomes
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                own patient healthcare records
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                assume responsibility for diagnosis or treatment decisions
              </Typography>
            </li>
          </ul>

          <Typography variant="body1" paragraph>
            All clinical responsibility, healthcare judgment, treatment
            decisions, prescriptions, and patient care obligations remain solely
            with the respective healthcare provider, clinic, hospital, or
            licensed medical practitioner.
          </Typography>

          <Typography variant="h5" gutterBottom>
            3. DATA PRIVACY & CONFIDENTIALITY COMMITMENT
          </Typography>

          <Typography variant="body1" paragraph>
            Ridgeveda Solutions Private Limited recognizes the highly
            confidential nature of healthcare and patient-related information
            and is committed to maintaining strict privacy, confidentiality, and
            cybersecurity standards.
          </Typography>

          <Typography variant="body1" paragraph>
            CareDesk360 follows industry-standard privacy and security
            principles, including operational alignment with:
          </Typography>

          <ul>
            <li>
              <Typography variant="body1">
                GDPR (General Data Protection Regulation) principles
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                confidentiality obligations applicable to healthcare systems
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                data minimization standards
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                controlled-access frameworks
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                commercially reasonable cybersecurity practices
              </Typography>
            </li>
          </ul>

          <Typography variant="body1" paragraph>
            The Company maintains a strict policy against unauthorized
            commercial usage of patient information.
          </Typography>

          <Typography variant="h5" gutterBottom>
            4. INFORMATION COLLECTED
          </Typography>

          <Typography variant="body1" paragraph>
            The Platform may collect and process information including, but not
            limited to:
          </Typography>

          <Typography variant="h6" gutterBottom>
            A. Clinic & Organizational Information
          </Typography>

          <ul>
            <li>
              <Typography variant="body1">Clinic or hospital name</Typography>
            </li>
            <li>
              <Typography variant="body1">
                Business registration details
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                GST and billing information
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                Administrative contact details
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                Branch and operational information
              </Typography>
            </li>
          </ul>

          <Typography variant="h6" gutterBottom>
            B. Healthcare Operational Data
          </Typography>

          <ul>
            <li>
              <Typography variant="body1">
                Appointment scheduling records
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                Billing and invoicing data
              </Typography>
            </li>
            <li>
              <Typography variant="body1">Prescription workflows</Typography>
            </li>
            <li>
              <Typography variant="body1">
                Staff and consultant management data
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                Inventory and medicine records
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                Operational reports and analytics
              </Typography>
            </li>
          </ul>

          <Typography variant="h6" gutterBottom>
            C. Patient-Related Information
          </Typography>

          <Typography variant="body1" paragraph>
            Authorized healthcare providers may independently upload
            patient-related information into the Platform, including:
          </Typography>

          <ul>
            <li>
              <Typography variant="body1">
                patient identification details
              </Typography>
            </li>
            <li>
              <Typography variant="body1">consultation records</Typography>
            </li>
            <li>
              <Typography variant="body1">prescriptions</Typography>
            </li>
            <li>
              <Typography variant="body1">appointment histories</Typography>
            </li>
            <li>
              <Typography variant="body1">diagnostic references</Typography>
            </li>
            <li>
              <Typography variant="body1">healthcare documentation</Typography>
            </li>
          </ul>

          <Typography variant="body1" paragraph>
            Such information is uploaded solely under the authority and
            responsibility of the respective healthcare institution or
            practitioner.
          </Typography>

          <Typography variant="h6" gutterBottom>
            D. Technical & Security Information
          </Typography>

          <ul>
            <li>
              <Typography variant="body1">IP addresses</Typography>
            </li>
            <li>
              <Typography variant="body1">
                browser and device information
              </Typography>
            </li>
            <li>
              <Typography variant="body1">login timestamps</Typography>
            </li>
            <li>
              <Typography variant="body1">audit trails</Typography>
            </li>
            <li>
              <Typography variant="body1">activity logs</Typography>
            </li>
            <li>
              <Typography variant="body1">
                security monitoring information
              </Typography>
            </li>
          </ul>

          <Typography variant="h5" gutterBottom>
            5. OWNERSHIP OF DATA
          </Typography>

          <Typography variant="body1" paragraph>
            All clinic records, operational data, patient information,
            healthcare documents, reports, prescriptions, and uploaded materials
            remain the exclusive property and confidential information of the
            respective healthcare provider or institution.
          </Typography>

          <Typography variant="body1" paragraph>
            Neither CareDesk360 nor Ridgeveda Solutions Private Limited claims
            ownership over:
          </Typography>

          <ul>
            <li>
              <Typography variant="body1">patient medical records</Typography>
            </li>
            <li>
              <Typography variant="body1">
                clinic operational information
              </Typography>
            </li>
            <li>
              <Typography variant="body1">medical documentation</Typography>
            </li>
            <li>
              <Typography variant="body1">
                healthcare reports stored within the Platform
              </Typography>
            </li>
          </ul>

          <Typography variant="body1" paragraph>
            The Company acts solely as a secure technology processor and
            infrastructure provider.
          </Typography>

          <Typography variant="h5" gutterBottom>
            6. STRICT NON-USE OF PATIENT DATA
          </Typography>

          <Typography variant="body1" paragraph>
            CareDesk360 and Ridgeveda Solutions Private Limited maintain a
            strict policy prohibiting unauthorized access, usage, sale,
            exploitation, or disclosure of patient-related information.
          </Typography>

          <Typography variant="body1" paragraph>
            Accordingly:
          </Typography>

          <ul>
            <li>
              <Typography variant="body1">
                Patient data shall not be sold, rented, traded, or commercially
                exploited
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                Patient records shall not be used for marketing, advertising,
                profiling, or promotional activities
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                Internal personnel are prohibited from unauthorized access to
                medical records
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                Data access, if required for technical support purposes, shall
                remain limited, confidential, monitored, and purpose-specific
              </Typography>
            </li>
          </ul>
          <Typography variant="h5" gutterBottom>
            7. DATA SECURITY & CYBER PROTECTION
          </Typography>

          <Typography variant="body1" paragraph>
            CareDesk360 implements commercially reasonable and industry-standard
            safeguards designed to protect data processed through the Platform.
          </Typography>

          <Typography variant="body1" paragraph>
            Security measures may include:
          </Typography>

          <ul>
            <li>
              <Typography variant="body1">encrypted communications</Typography>
            </li>
            <li>
              <Typography variant="body1">
                secure cloud infrastructure
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                role-based access controls
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                authentication and authorization protocols
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                restricted database access
              </Typography>
            </li>
            <li>
              <Typography variant="body1">backup systems</Typography>
            </li>
            <li>
              <Typography variant="body1">
                firewall and monitoring systems
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                periodic security assessments
              </Typography>
            </li>
          </ul>

          <Typography variant="body1" paragraph>
            While the Company adopts strict security practices, Users
            acknowledge that no digital infrastructure or internet-based system
            can guarantee absolute security.
          </Typography>

          <Typography variant="body1" paragraph>
            Accordingly, CareDesk360 and Ridgeveda Solutions Private Limited
            disclaim liability for cyber incidents, unauthorized intrusions,
            infrastructure failures, or security breaches occurring beyond
            commercially reasonable control.
          </Typography>

          <Typography variant="h5" gutterBottom>
            8. GDPR & DATA PROTECTION PRINCIPLES
          </Typography>

          <Typography variant="body1" paragraph>
            CareDesk360 endeavors to maintain operational alignment with
            internationally recognized data protection principles, including:
          </Typography>

          <ul>
            <li>
              <Typography variant="body1">lawful processing</Typography>
            </li>
            <li>
              <Typography variant="body1">transparency</Typography>
            </li>
            <li>
              <Typography variant="body1">purpose limitation</Typography>
            </li>
            <li>
              <Typography variant="body1">confidentiality</Typography>
            </li>
            <li>
              <Typography variant="body1">integrity</Typography>
            </li>
            <li>
              <Typography variant="body1">accountability standards</Typography>
            </li>
          </ul>

          <Typography variant="body1" paragraph>
            Healthcare providers using the Platform remain independently
            responsible for:
          </Typography>

          <ul>
            <li>
              <Typography variant="body1">
                obtaining legally required patient consents
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                maintaining lawful grounds for data processing
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                complying with healthcare and privacy regulations applicable
                within their jurisdiction
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                ensuring the legitimacy of uploaded information
              </Typography>
            </li>
          </ul>

          <Typography variant="body1" paragraph>
            The Company shall not be liable for regulatory violations
            attributable to the User or healthcare institution.
          </Typography>

          <Typography variant="h5" gutterBottom>
            9. USER RESPONSIBILITIES
          </Typography>

          <Typography variant="body1" paragraph>
            Users agree and undertake to:
          </Typography>

          <ul>
            <li>
              <Typography variant="body1">
                maintain confidentiality of access credentials
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                restrict unauthorized access
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                comply with applicable laws and regulations
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                upload only lawfully obtained information
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                maintain necessary patient consent obligations
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                avoid misuse or unlawful extraction of system data
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                preserve operational security practices
              </Typography>
            </li>
          </ul>

          <Typography variant="body1" paragraph>
            The User shall remain solely responsible for all activities
            conducted through its authorized accounts.
          </Typography>

          <Typography variant="h5" gutterBottom>
            10. THIRD-PARTY SERVICES & INFRASTRUCTURE
          </Typography>

          <Typography variant="body1" paragraph>
            CareDesk360 may utilize trusted third-party service providers
            including:
          </Typography>

          <ul>
            <li>
              <Typography variant="body1">cloud hosting vendors</Typography>
            </li>
            <li>
              <Typography variant="body1">payment gateways</Typography>
            </li>
            <li>
              <Typography variant="body1">analytics systems</Typography>
            </li>
            <li>
              <Typography variant="body1">communication providers</Typography>
            </li>
            <li>
              <Typography variant="body1">
                cybersecurity infrastructure partners
              </Typography>
            </li>
          </ul>

          <Typography variant="body1" paragraph>
            Such integrations are implemented solely for operational continuity
            and service delivery purposes.
          </Typography>

          <Typography variant="body1" paragraph>
            The Company shall not be liable for interruptions, losses, or
            failures attributable to third-party infrastructure providers beyond
            reasonable control.
          </Typography>

          <Typography variant="h5" gutterBottom>
            11. SUBSCRIPTION, BILLING & NON-REFUND POLICY
          </Typography>

          <Typography variant="body1" paragraph>
            By subscribing to CareDesk360, the User expressly acknowledges and
            agrees that:
          </Typography>

          <ul>
            <li>
              <Typography variant="body1">
                All subscription fees and payments are final and legally
                non-refundable
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                Subscription payments once processed cannot be revoked,
                reversed, disputed, or refunded
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                Partial usage, dissatisfaction, operational changes, non-usage,
                or business closure shall not constitute grounds for refund
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                Failure to renew subscriptions may result in suspension or
                restriction of Platform access
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                The Company reserves the right to modify pricing structures,
                subscription plans, and commercial terms with prior notice
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                The User expressly waives any chargeback, reversal, or refund
                claims except where mandatorily required under applicable law
              </Typography>
            </li>
          </ul>

          <Typography variant="h5" gutterBottom>
            12. LIMITATION OF LIABILITY
          </Typography>

          <Typography variant="body1" paragraph>
            To the maximum extent permissible under applicable law, CareDesk360
            and Ridgeveda Solutions Private Limited shall not be liable for:
          </Typography>

          <ul>
            <li>
              <Typography variant="body1">
                indirect or consequential damages
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                medical negligence by healthcare providers
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                unauthorized access caused by User negligence
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                cyberattacks or external security breaches
              </Typography>
            </li>
            <li>
              <Typography variant="body1">operational interruptions</Typography>
            </li>
            <li>
              <Typography variant="body1">internet failures</Typography>
            </li>
            <li>
              <Typography variant="body1">
                third-party infrastructure failures
              </Typography>
            </li>
            <li>
              <Typography variant="body1">force majeure events</Typography>
            </li>
            <li>
              <Typography variant="body1">
                regulatory non-compliance by Users
              </Typography>
            </li>
          </ul>

          <Typography variant="body1" paragraph>
            In all circumstances, aggregate liability, if any, shall not exceed
            the subscription fees paid by the User during the preceding three
            (3) Years.
          </Typography>
          <Typography variant="h5" gutterBottom>
            13. INTELLECTUAL PROPERTY & CONFIDENTIALITY
          </Typography>

          <Typography variant="body1" paragraph>
            All software systems, workflows, dashboards, business methodologies,
            operational structures, source materials, designs, and proprietary
            technologies associated with CareDesk360 constitute the exclusive
            intellectual property of Ridgeveda Solutions Private Limited.
          </Typography>

          <Typography variant="body1" paragraph>
            Unauthorized copying, reverse engineering, resale, sublicensing,
            duplication, or commercial exploitation is strictly prohibited.
          </Typography>

          <Typography variant="h5" gutterBottom>
            14. TERMINATION OF ACCESS
          </Typography>

          <Typography variant="body1" paragraph>
            CareDesk360 reserves the absolute right to suspend or terminate
            access to the Platform without prior notice where:
          </Typography>

          <ul>
            <li>
              <Typography variant="body1">
                unlawful activity is detected
              </Typography>
            </li>
            <li>
              <Typography variant="body1">payment defaults occur</Typography>
            </li>
            <li>
              <Typography variant="body1">security threats arise</Typography>
            </li>
            <li>
              <Typography variant="body1">
                misuse of the Platform is identified
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                actions threaten operational integrity or cybersecurity
                stability
              </Typography>
            </li>
          </ul>

          <Typography variant="body1" paragraph>
            Termination shall not affect accrued payment obligations or legal
            remedies available to the Company.
          </Typography>

          <Typography variant="h5" gutterBottom>
            15. POLICY MODIFICATIONS
          </Typography>

          <Typography variant="body1" paragraph>
            Ridgeveda Solutions Private Limited reserves the unilateral right to
            amend, revise, update, or modify this Privacy Policy at any time.
          </Typography>

          <Typography variant="body1" paragraph>
            Continued use of the Platform following such modifications shall
            constitute deemed acceptance of the revised Policy.
          </Typography>

          <Typography variant="h5" gutterBottom>
            16. GOVERNING LAW & JURISDICTION
          </Typography>

          <Typography variant="body1" paragraph>
            This Policy shall be governed and interpreted in accordance with the
            laws of India.
          </Typography>

          <Typography variant="body1" paragraph>
            Any disputes arising out of or relating to this Policy shall be
            subject to the exclusive jurisdiction of the competent courts
            located in Hyderabad, Telangana, India.
          </Typography>

          <Typography variant="h5" gutterBottom>
            17. CONTACT INFORMATION
          </Typography>

          <Typography variant="body1" paragraph>
            For legal, compliance, privacy, or security-related communications:
          </Typography>

          <Typography variant="body1" paragraph>
            Legal & Compliance Department
          </Typography>

          <Typography variant="body1" paragraph>
            CareDesk360 – A Product of Ridgeveda Solutions Private Limited
          </Typography>

          <Typography variant="body1" paragraph>
            Email: caredesk360@gmail.com
          </Typography>

          <Typography variant="body1" paragraph>
            Website:{" "}
            <a
              href="https://caredesk360.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              https://caredesk360.com
            </a>
          </Typography>
        </Box>
      </Modal>
    </footer>
  );
};

export default Footer;
