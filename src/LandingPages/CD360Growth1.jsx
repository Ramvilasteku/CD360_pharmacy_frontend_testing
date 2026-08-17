"use client";

import { useEffect, useRef, useState } from "react";
import "./CD360Growth1.css";
import Logoimg from "./Assets/caredesk360  new logo-04.png";
import Logowhite from "./Assets/caredesk360-logo-transparent.png";
import founderImageSrc from "./Assets/nagaraju-tatipally1.jpg";


// ⬇️ PASTE YOUR APPS SCRIPT WEB APP URL HERE (must end with /exec)
const SHEET_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbyVjNs3OIcXlZ-p7IIcjJP3gdWiG_EjdjBT49CIU4H9eOy7ZqYB_MgHFhBFaYpI7qGyUw/exec";

const outcomes = [
  [
    "01",
    "New Patient Acquisition",
    "Improve local visibility and turn patient interest into appointment opportunities.",
  ],
  [
    "02",
    "Treatment Acceptance",
    "Support informed decisions with clear education and structured follow-ups.",
  ],
  [
    "03",
    "Patient Retention",
    "Stay connected through reminders, aftercare and consistent engagement.",
  ],
  [
    "04",
    "Operational Efficiency",
    "Bring appointments, communication and everyday workflows into one system.",
  ],
];

const services = [
  [
    "01",
    "Platform visibility",
    "A coordinated digital presence across six platforms, designed to make your clinic easier to discover and trust.",
  ],
  [
    "02",
    "Website development",
    "High-converting clinic websites with customization and patient-first journeys.",
  ],
  [
    "03",
    "WhatsApp automation",
    "Simplify enquiries, appointment updates, reminders and follow-up communication.",
  ],
  [
    "04",
    "Smart clinic software",
    "Manage the patient journey and key clinic workflows from one connected platform.",
  ],
  [
    "05",
    "Content production",
    "Professional shoots, patient testimonials and high-quality social content.",
  ],
  [
    "06",
    "Patient education",
    "3D animation, awareness, procedure guidance and aftercare videos patients understand.",
  ],
];

const comparisonRows = [
  [
    "Clinic growth strategy",
    "Clinic-specific growth roadmap",
    "Often no clear clinic-growth strategy",
    "Not a marketing focus",
    "Split across providers",
  ],
  [
    "Content approach",
    "Built around the patient journey",
    "Often generic content posting",
    "Usually not included",
    "Agency-dependent",
  ],
  [
    "Patient journey expertise",
    "Discovery to booking, treatment and retention",
    "Usually not mapped",
    "Workflow-focused",
    "Fragmented across teams",
  ],
  [
    "Acquisition, treatment acceptance, retention & operations",
    "Primary business outcomes",
    "Often not primary",
    "Not a primary growth focus",
    "No single owner",
  ],
  [
    "Clinic management software",
    "Included",
    "No software",
    "Core product",
    "Separate subscription",
  ],
  [
    "Setup time",
    "Initial work starts from Day 1*",
    "Often takes 1–2 months",
    "After configuration",
    "Depends on every vendor",
  ],
  [
    "Monthly execution",
    "Continuous, accountable delivery",
    "May start after a month or late in the month",
    "Product support only",
    "Different schedules",
  ],
  [
    "Marketing + tech support",
    "Your extended team",
    "Usually content and social scope",
    "Software support only",
    "Multiple teams",
  ],
  [
    "Pricing structure",
    "From ₹3,999/month",
    "Retainers plus add-ons",
    "Software subscription",
    "Multiple bills and retainers",
  ],
];

const faqs = [
  [
    "Who is CareDesk360 for?",
    "CareDesk360 is built for clinics, hospitals and healthcare providers that want to improve patient acquisition, communication, retention and operational efficiency.",
  ],
  [
    "What is included in the starting plan?",
    "Plans are tailored to each provider. Selected plans can include software, digital visibility, content, website support and automation. We recommend the right scope during your growth call.",
  ],
  [
    "How does the Independence Day offer work?",
    "The offer is available from 12–31 August 2026 to the first 80 eligible providers. A 20% discount applies to selected plans, subject to plan terms and availability.",
  ],
  [
    "Can you support international and NRI patients?",
    "Through our international healthcare partnership, CareDesk360 is building demand-generation and patient-coordination pathways across multiple countries worldwide—helping international and NRI patients and their families connect with trusted care in India.",
  ],
];

function Logo() {
  return (
    <span className="CDG1-logo">
     <img src={Logoimg} alt="" width={"50%"} />
    </span>
  );
}

function FooterLogo() {
  return (
    <span className="CDG1-logo">
     <img src={Logowhite} alt="" width={"30%"} />
    </span>
  );
}

function Arrow() {
  return <span aria-hidden="true">↗</span>;
}

function WhatsAppIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path
        d="M20 11.6a8 8 0 0 1-11.8 7L4 20l1.4-4A8 8 0 1 1 20 11.6Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M9 8.2c.2-.4.4-.4.7-.4h.5c.2 0 .3.1.4.4l.7 1.7c.1.3 0 .4-.1.6l-.6.7c-.2.2-.1.4 0 .6.6 1 1.4 1.8 2.5 2.3.2.1.4.1.6-.1l.8-1c.2-.2.4-.2.6-.1l1.8.9c.3.1.3.3.3.5 0 .5-.3 1.4-.8 1.7-.5.4-1.2.7-2.2.5-1.3-.3-2.9-1-4.6-2.6-1.4-1.3-2.4-2.9-2.7-4.2-.3-1 .1-1.7.4-2.1.4-.4.9-.6 1.4-.6"
        fill="currentColor"
      />
    </svg>
  );
}

export default function CD360GroWth1({
  leadEndpoint = SHEET_ENDPOINT,
}) {
  const growthFormRef = useRef(null);
  const [submissionState, setSubmissionState] = useState("idle");
  const [savedMessage, setSavedMessage] = useState("");
  const [submissionError, setSubmissionError] = useState("");

  useEffect(() => {
    const cards = Array.from(
      document.querySelectorAll(
        ".CDG1-outcome-card, .CDG1-claim-card, .CDG1-focus-band, .CDG1-typewriter-heading, .CDG1-seal, .CDG1-founder-card, .CDG1-trust-card",
      ),
    );
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduceMotion || !("IntersectionObserver" in window)) {
      cards.forEach((card) => card.classList.add("CDG1-is-visible"));
      return;
    }

    cards.forEach((card) => card.classList.add("CDG1-motion-enabled"));
    const timers = [];
    const observer = new IntersectionObserver(
      (entries) => {
        const entering = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => cards.indexOf(a.target) - cards.indexOf(b.target));

        entering.forEach((entry, index) => {
          const card = entry.target;
          timers.push(
            window.setTimeout(
              () => card.classList.add("CDG1-is-visible"),
              index * 110,
            ),
          );
          observer.unobserve(card);
        });
      },
      { threshold: 0.18, rootMargin: "0px 0px -40px" },
    );

    cards.forEach((card) => observer.observe(card));
    return () => {
      observer.disconnect();
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  const getLeadDetails = () => {
    const form = growthFormRef.current;
    if (!form || !form.reportValidity()) return null;

    const data = new FormData(form);
    const doctorName = String(data.get("doctorName") || "").trim();
    const phone = String(data.get("phone") || "").trim();
    const preferredTime = String(data.get("preferredTime") || "").trim();
    const clinicName = String(data.get("clinicName") || "").trim();
    const location = String(data.get("location") || "").trim();
    const consent = data.get("consent") === "on";
    const timeZone =
      Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
    const readableTime = preferredTime
      ? new Intl.DateTimeFormat("en-IN", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(preferredTime))
      : "Not provided";

    const message = [
      "New CareDesk360 Growth Call Request",
      "",
      `Doctor name: ${doctorName}`,
      `Phone number: ${phone}`,
      `Preferred call time: ${readableTime} (${timeZone})`,
      `Clinic name: ${clinicName || "Not provided"}`,
      `Location: ${location || "Not provided"}`,
      "",
      "Source: CareDesk360 Growth Offer",
    ].join("\n");

    return {
      message,
      payload: {
        doctorName,
        phone,
        preferredTime,
        timeZone,
        clinicName,
        location,
        consent,
        website: String(data.get("website") || ""),
      },
    };
  };

  const saveLead = async (event) => {
    event.preventDefault();
    if (submissionState === "saving" || submissionState === "saved") return;

    const details = getLeadDetails();
    if (!details) return;

    setSavedMessage(details.message);
    setSubmissionState("saving");
    setSubmissionError("");

    try {
      // NOTE: Content-Type is text/plain on purpose.
      // application/json makes the browser send a CORS preflight that Apps Script
      // does not answer, which blocks the request. Plain text keeps it a "simple
      // request" (no preflight); the script still JSON.parse()s the body.
      const response = await fetch(leadEndpoint, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" }, // ✅ the real one, already here
        body: JSON.stringify(details.payload),
        redirect: "follow",
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok || result.result === "error") {
        throw new Error(result.error || "We could not save your request.");
      }

      setSubmissionState("saved");
    } catch (error) {
      setSubmissionError(
        error instanceof Error
          ? error.message
          : "We could not save your request.",
      );
      setSubmissionState("error");
    }
  };

  const getShareMessage = () => savedMessage || getLeadDetails()?.message || "";

  const sendOnWhatsApp = () => {
    const message = getShareMessage();
    if (!message) return;
    window.open(
      `https://wa.me/917093111075?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const sendByEmail = () => {
    const message = getShareMessage();
    if (!message) return;
    const subject = "CareDesk360 Growth Call Request";
    window.location.href = `mailto:info@ridgeveda.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
  };

  return (
    <main className="CDG1-main">
      <header className="CDG1-header">
        <a href="#top" aria-label="CareDesk360 home">
          <Logo />
        </a>
        <nav aria-label="Primary navigation">
          <a href="#outcomes">Outcomes</a>
          <a href="#platform">What you get</a>
          <a href="#comparison">Compare</a>
          <a href="#offer">Special offer</a>
        </nav>
        <a
          className="CDG1-button CDG1-button-dark CDG1-attention-shake"
          href="#growth-call-form"
        >
          Book a growth call <Arrow />
        </a>
      </header>

      <section className="CDG1-hero CDG1-shell" id="top">
        <div className="CDG1-hero-copy">
          <div className="CDG1-eyebrow">
            <i /> Hyderabad&apos;s fast-growing healthcare growth partner
          </div>
          <h1>
            Hello Doctor,
            <br />
            meet <span>CareDesk360.</span>
          </h1>
          <p>
            Smart clinic management, patient engagement and complete growth
            support—brought together in one connected healthcare ecosystem.
          </p>
          <div className="CDG1-hero-actions">
            <a
              className="CDG1-button CDG1-button-primary"
              href="#growth-call-form"
            >
              Book a free growth call <Arrow />
            </a>
            <a className="CDG1-link" href="#platform">
              Explore the growth stack ↓
            </a>
          </div>
          <div className="CDG1-proof">
            <div>
              <strong>100+</strong>
              <span>Clinics partnered</span>
            </div>
            <div>
              <strong>₹3,999</strong>
              <span>Plans start monthly</span>
            </div>
            <div>
              <strong>One</strong>
              <span>Connected growth partner</span>
            </div>
          </div>
        </div>

        <div
          className="CDG1-hero-art"
          aria-label="Connected clinic growth system illustration"
        >
          <div className="CDG1-orb" />
          <div className="CDG1-orbit CDG1-orbit-one" />
          <div className="CDG1-orbit CDG1-orbit-two" />
          <div className="CDG1-float-pill CDG1-pill-top">
            <i /> Patient journey connected
          </div>
          <div className="CDG1-dashboard">
            <div className="CDG1-dash-title">
              <div>
                <small>Your clinic growth desk</small>
                <strong>Everything in sync</strong>
              </div>
              <span>C</span>
            </div>
            <div className="CDG1-growth-signal">
              <b>↗</b>
              <div>
                <small>Growth engine</small>
                <strong>Active across the patient journey</strong>
              </div>
            </div>
            <div className="CDG1-mini-grid">
              <div className="CDG1-mini CDG1-mint">
                <small>Appointments</small>
                <strong>Organised</strong>
                <i />
              </div>
              <div className="CDG1-mini CDG1-violet">
                <small>WhatsApp</small>
                <strong>Automated</strong>
                <i />
              </div>
              <div className="CDG1-mini CDG1-peach">
                <small>Visibility</small>
                <strong>Strengthened</strong>
                <i />
              </div>
            </div>
            <div className="CDG1-journey">
              <span>Discover</span>
              <i />
              <span>Book</span>
              <i />
              <span>Visit</span>
              <i />
              <span>Return</span>
            </div>
          </div>
          <div className="CDG1-float-pill CDG1-pill-bottom">
            <span className="CDG1-tricolour">
              <i />
              <i />
              <i />
            </span>{" "}
            80th Independence Day offer
          </div>
        </div>
      </section>

      <div className="CDG1-ticker" aria-label="CareDesk360 positioning">
        <span>SMART OPERATIONS</span>
        <i>✦</i>
        <span>STRONGER VISIBILITY</span>
        <i>✦</i>
        <span>BETTER PATIENT EXPERIENCE</span>
        <i>✦</i>
        <span>CONNECTED GROWTH</span>
      </div>

      <section className="CDG1-outcomes CDG1-shell" id="outcomes">
        <div className="CDG1-section-head">
          <div>
            <span className="CDG1-kicker">Experts in clinic growth</span>
            <h2>Built around the outcomes that matter.</h2>
          </div>
          <p>
            CareDesk360 helps healthcare practices strengthen every stage of the
            patient journey—from discovery and booking to treatment, follow-up
            and retention.
          </p>
        </div>
        <div className="CDG1-outcome-grid">
          {outcomes.map(([number, title, copy]) => (
            <article className="CDG1-outcome-card" key={number}>
              <span>{number}</span>
              <i />
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="CDG1-platform" id="platform">
        <div className="CDG1-shell">
          <div className="CDG1-platform-head">
            <span className="CDG1-kicker">
              One partner. One connected growth stack.
            </span>
            <h2 style={{color:"white"}}>
              Everything your clinic needs to be seen, trusted and chosen.
            </h2>
            <p>
              Replace fragmented vendors and disconnected tools with a
              healthcare-focused team that understands growth, content,
              technology and patient experience.
            </p>
          </div>
          <div className="CDG1-service-grid">
            {services.map(([number, title, copy]) => (
              <article className="CDG1-service-card" key={number}>
                <span>{number}</span>
                <div>
                  <h3
                    className={
                      number === "01"
                        ? "CDG1-platform-service-title"
                        : undefined
                    }
                  >
                    {number === "01" && (
                      <b className="CDG1-platform-count">6</b>
                    )}
                    <span>{title}</span>
                  </h3>
                  <p>{copy}</p>
                </div>
              </article>
            ))}
          </div>
          <div className="CDG1-support-band">
            <div>
              <small>Also included in selected plans</small>
              <strong>Offline branding support</strong>
            </div>
            <p>
              Consistent clinic communication—from the screen to the street.
            </p>
          </div>
        </div>
      </section>

      <section
        className="CDG1-focus-band CDG1-shell"
        aria-labelledby="focus-band-title"
      >
        <div className="CDG1-focus-band-copy">
          <span className="CDG1-kicker">Your extended clinic team</span>
          <h2 id="focus-band-title">
            <span>You focus on patient care.</span> We&apos;ll take care of the
            marketing and technology.
          </h2>
        </div>
        <div className="CDG1-focus-band-support">
          <p>
            CareDesk360 works as your dedicated marketing and tech team—bringing
            strategy, content, software, websites, WhatsApp, branding and
            ongoing support under one accountable partner.
          </p>
          <div
            className="CDG1-focus-tags"
            aria-label="CareDesk360 support areas"
          >
            <span>Marketing team</span>
            <span>Technology team</span>
            <span>Growth support</span>
          </div>
        </div>
      </section>

      <section className="CDG1-comparison CDG1-shell" id="comparison">
        <div className="CDG1-comparison-head">
          <div>
            <span className="CDG1-kicker">Why CareDesk360</span>
            <h2>One connected growth partner versus a fragmented setup.</h2>
          </div>
          <p>
            Bring healthcare software, growth strategy, content, patient
            engagement and operational support together—without managing
            separate platforms, agencies and vendors.
          </p>
        </div>

        <div className="CDG1-claim-grid">
          <article className="CDG1-claim-card CDG1-claim-mint">
            <strong className="CDG1-range-stat" aria-label="75 to 95 percent">
              <span>75</span>
              <i>to</i>
              <span>95</span>
              <sup>%</sup>
            </strong>
            <h3>Lower estimated cost</h3>
            <p>
              Across selected CareDesk360 plans compared with sourcing a
              comparable combined scope separately.
            </p>
          </article>
          <article className="CDG1-claim-card CDG1-claim-violet">
            <strong>Day 1</strong>
            <h3>Work begins</h3>
            <p>
              Onboarding and initial execution start once the scope, access and
              required clinic inputs are confirmed.
            </p>
          </article>
          <article className="CDG1-claim-card CDG1-claim-peach">
            <strong>Up to 2X</strong>
            <h3>Stronger-results target</h3>
            <p>
              Our connected model is designed to outperform fragmented execution
              across the patient journey.
            </p>
          </article>
          <article className="CDG1-claim-card CDG1-claim-blue">
            <strong className="CDG1-range-stat" aria-label="10 to 15 percent">
              <span>10</span>
              <i>to</i>
              <span>15</span>
              <sup>%</sup>
            </strong>
            <h3>Organic growth reported</h3>
            <p>
              Selected partner clinics have reported growth without paid-ad
              spend during their measured period.
            </p>
          </article>
        </div>

        <div className="CDG1-swipe-hint" aria-hidden="true">
          <span>Swipe to compare</span>
          <i>→</i>
        </div>
        <div className="CDG1-comparison-table-wrap">
          <table className="CDG1-comparison-table">
            <caption className="CDG1-sr-only">
              CareDesk360 compared with a typical content-only agency model,
              standalone clinic software and multiple-vendor setups
            </caption>
            <thead>
              <tr>
                <th scope="col">What your clinic needs</th>
                <th scope="col">
                  <span>CareDesk360</span>
                  <small>Connected partner</small>
                </th>
                <th scope="col">
                  <span>Typical content-only agency</span>
                  <small>Posting-led model</small>
                </th>
                <th scope="col">
                  <span>Standalone software</span>
                  <small>Operations-led</small>
                </th>
                <th scope="col">
                  <span>Multiple vendors</span>
                  <small>Fragmented setup</small>
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map(
                ([need, caredesk, agency, software, vendors]) => (
                  <tr key={need}>
                    <th scope="row">{need}</th>
                    <td className="CDG1-caredesk-cell">
                      <b aria-hidden="true">✓</b>
                      {caredesk}
                    </td>
                    <td>{agency}</td>
                    <td>{software}</td>
                    <td>{vendors}</td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>

        <div className="CDG1-comparison-foot">
          <p>
            *Comparisons and savings are CareDesk360 internal estimates based on
            comparable bundled scopes and common content-only agency/vendor
            models. Actual agency capabilities, timelines, pricing, inclusions
            and outcomes vary. Reported client outcomes are examples, not
            guaranteed results.
          </p>
          <a className="CDG1-button CDG1-button-dark" href="#growth-call-form">
            Compare the right plan for your clinic <Arrow />
          </a>
        </div>
      </section>

      <section className="CDG1-nri CDG1-shell">
        <div>
          <span className="CDG1-kicker">Global patient reach</span>
          <h2>Connecting global patient demand with trusted care in India.</h2>
          <p>
            Through our international healthcare partnership, CareDesk360 will
            support patient demand generation across multiple countries
            worldwide—helping international and NRI patients and their families
            discover, connect with and coordinate trusted healthcare in India.
          </p>
          <a className="CDG1-link" href="#growth-call-form">
            Discuss global patient outreach <Arrow />
          </a>
        </div>
        <div className="CDG1-map" aria-hidden="true">
          <div className="CDG1-map-dots" />
          <div className="CDG1-place">
            <i /> GLOBAL
          </div>
          <div className="CDG1-route">
            <i />
            <i />
            <i />
          </div>
          <div className="CDG1-place">
            <i /> INDIA
          </div>
          <small>Global patient demand, connected to care in India.</small>
        </div>
      </section>

      <section className="CDG1-offer CDG1-shell" id="offer">
        <div className="CDG1-offer-card">
          <div className="CDG1-offer-copy">
            <div className="CDG1-flag-line">
              <i />
              <i />
              <i />
            </div>
            <span className="CDG1-kicker">
              80th Independence Day Growth Offer
            </span>
            <h2
              className="CDG1-typewriter-heading"
              aria-label="Grow independently. Grow intelligently."
            >
              <span className="CDG1-type-line">Grow independently.</span>
              <span className="CDG1-type-line">Grow intelligently.</span>
            </h2>
            <p>
              Join the first 80 eligible healthcare providers between 12–31
              August 2026 and unlock <strong>20% off selected plans.</strong>
            </p>
            <div className="CDG1-offer-meta">
              <span>
                <b>12–31</b>August 2026
              </span>
              <span>
                <b>80</b>Provider slots
              </span>
              <span>
                <b>20%</b>Off selected plans
              </span>
            </div>
          </div>
          <div className="CDG1-seal">
            <small>LIMITED</small>
            <strong>
              20<sup>%</sup>
            </strong>
            <small>OFF</small>
          </div>
        </div>
      </section>

      <section className="CDG1-founder CDG1-shell" id="founder">
        <article className="CDG1-founder-card">
          <figure className="CDG1-founder-photo">
            <span className="CDG1-founder-photo-frame">
              <img
                src={founderImageSrc}
                alt="Nagaraju Tatipally, Founder and CEO of CareDesk360"
                width="300"
                height="300"
                loading="lazy"
                decoding="async"
              />
            </span>
            <figcaption>Founder</figcaption>
          </figure>
          <div className="CDG1-founder-copy">
            <span className="CDG1-kicker">Meet the founder</span>
            <h2>Nagaraju Tatipally</h2>
            <strong>Founder &amp; CEO · CareDesk360</strong>
            <p>
              Building a healthcare growth ecosystem where doctors can focus on
              patient care while one accountable team manages their marketing,
              technology, patient experience and practice-growth support.
            </p>
          </div>
          <a
            className="CDG1-linkedin-button"
            href="https://www.linkedin.com/in/nagaraju-tatipally-a9b5619b?utm_source=share_via&amp;utm_content=profile&amp;utm_medium=member_android"
            target="_blank"
            rel="noreferrer"
            aria-label="Connect with Nagaraju Tatipally on LinkedIn"
          >
            <span aria-hidden="true">in</span>
            <b>Connect on LinkedIn</b>
            <Arrow />
          </a>
        </article>
      </section>

      <section className="CDG1-book CDG1-shell" id="growth-call-form">
        <div className="CDG1-book-inner">
          <div className="CDG1-book-copy">
            <span className="CDG1-kicker">Your next growth chapter</span>
            <h2 style={{color:"white"}}>Let&apos;s plan your clinic&apos;s next stage of growth.</h2>
            <p>
              Share a convenient time to speak. Our healthcare growth team will
              understand your current needs and recommend the right technology,
              visibility and patient-engagement plan.
            </p>
            <div className="CDG1-starting-price">
              <small>Plans start at</small>
              <div className="CDG1-price">
                <sup>₹</sup>3,999<span>/month</span>
              </div>
            </div>
          </div>

          <form
            className="CDG1-growth-form"
            ref={growthFormRef}
            onSubmit={saveLead}
          >
            <div className="CDG1-form-heading">
              <span>Free growth consultation</span>
              <h3>
                Book your <b>growth call</b>
              </h3>
              <p>
                Submit once to save your request. WhatsApp and email are
                optional after your enquiry is saved.
              </p>
            </div>

            <fieldset
              className="CDG1-form-fields"
              disabled={
                submissionState === "saving" || submissionState === "saved"
              }
            >
              <label className="CDG1-trap-field" aria-hidden="true">
                Website
                <input
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                />
              </label>

              <div className="CDG1-form-grid">
                <label className="CDG1-form-field">
                  <span>
                    Doctor name <b>*</b>
                  </span>
                  <input
                    name="doctorName"
                    type="text"
                    autoComplete="name"
                    placeholder="Dr. Your Name"
                    required
                  />
                </label>
                <label className="CDG1-form-field">
                  <span>
                    Phone number <b>*</b>
                  </span>
                  <input
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+91 98765 43210"
                    minLength={7}
                    maxLength={20}
                    required
                  />
                </label>
                <label className="CDG1-form-field CDG1-form-field-wide">
                  <span>
                    Available time for the call <b>*</b>
                  </span>
                  <input name="preferredTime" type="datetime-local" required />
                </label>
                <label className="CDG1-form-field">
                  <span>
                    Clinic name <em>Optional</em>
                  </span>
                  <input
                    name="clinicName"
                    type="text"
                    autoComplete="organization"
                    placeholder="Your clinic name"
                  />
                </label>
                <label className="CDG1-form-field">
                  <span>
                    Location <em>Optional</em>
                  </span>
                  <input
                    name="location"
                    type="text"
                    autoComplete="address-level2"
                    placeholder="Area and city"
                  />
                </label>
              </div>

              <label className="CDG1-consent-field">
                <input name="consent" type="checkbox" required />
                <span>
                  I agree to be contacted by CareDesk360 about this growth
                  consultation request.
                </span>
              </label>
            </fieldset>

            {submissionState !== "saved" && (
              <button
                className="CDG1-save-lead-button"
                type="submit"
                disabled={submissionState === "saving"}
              >
                <span>
                  {submissionState === "saving"
                    ? "Saving your request…"
                    : submissionState === "error"
                      ? "Try saving again"
                      : "Save & book growth call"}
                </span>
                <Arrow />
              </button>
            )}

            <div className="CDG1-submission-status" aria-live="polite">
              {submissionState === "saved" && (
                <div className="CDG1-saved-message">
                  <span aria-hidden="true">✓</span>
                  <div>
                    <strong>Your growth call request is saved.</strong>
                    <p>
                      Our team can now contact you using the details provided.
                    </p>
                  </div>
                </div>
              )}
              {submissionState === "error" && (
                <div className="CDG1-error-message">
                  <strong>We couldn&apos;t save the request.</strong>
                  <span>
                    {submissionError} You can retry or use either option below.
                  </span>
                </div>
              )}
            </div>

            {(submissionState === "saved" || submissionState === "error") && (
              <div className="CDG1-optional-delivery">
                <div className="CDG1-optional-heading">
                  <span>Optional</span>
                  <p>
                    For faster confirmation, you can also send the same details
                    through WhatsApp or email.
                  </p>
                </div>
                <div className="CDG1-form-actions">
                  <button
                    className="CDG1-send-button CDG1-send-whatsapp"
                    type="button"
                    onClick={sendOnWhatsApp}
                  >
                    <WhatsAppIcon />
                    <span className="CDG1-send-copy">
                      Send on WhatsApp<small>To +91 70931 11075</small>
                    </span>
                    <Arrow />
                  </button>
                  <button
                    className="CDG1-send-button CDG1-send-email"
                    type="button"
                    onClick={sendByEmail}
                  >
                    <span className="CDG1-email-icon" aria-hidden="true">
                      @
                    </span>
                    <span className="CDG1-send-copy">
                      Send by Email<small>To info@ridgeveda.com</small>
                    </span>
                    <Arrow />
                  </button>
                </div>
              </div>
            )}

            <p className="CDG1-form-note">
              Your submitted details are stored for this enquiry. WhatsApp and
              email open with a pre-filled message for you to review and send.
            </p>
          </form>
        </div>
      </section>

      <section className="CDG1-faq CDG1-shell">
        <div>
          <span className="CDG1-kicker">Good to know</span>
          <h2>Frequently asked questions.</h2>
        </div>
        <div className="CDG1-faq-list">
          {faqs.map(([question, answer], index) => (
            <details key={question} open={index === 0}>
              <summary>
                {question}
                <span>+</span>
              </summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="CDG1-trust" aria-labelledby="trust-title">
        <div className="CDG1-trust-inner CDG1-shell">
          <div className="CDG1-trust-head">
            <span className="CDG1-kicker">Trust by design</span>
            <h2 id="trust-title" style={{color:"white"}}>Built for trusted healthcare technology.</h2>
            <p>
              Standards-aware foundations for safer data exchange, connected
              care and responsible growth.
            </p>
          </div>
          <div className="CDG1-trust-grid">
            <article className="CDG1-trust-card">
              <span className="CDG1-trust-icon" aria-hidden="true">
                ↔
              </span>
              <div>
                <strong>FHIR-ready</strong>
                <p>
                  Designed for standards-based exchange of clinical information.
                </p>
              </div>
            </article>
            <article className="CDG1-trust-card">
              <span className="CDG1-trust-icon" aria-hidden="true">
                ✓
              </span>
              <div>
                <strong>HIPAA-aligned</strong>
                <p>
                  Privacy and security controls designed around HIPAA
                  safeguards.
                </p>
              </div>
            </article>
            <article className="CDG1-trust-card">
              <span className="CDG1-trust-icon" aria-hidden="true">
                ＋
              </span>
              <div>
                <strong>ABDM-ready</strong>
                <p>
                  Prepared for integration with India&apos;s digital health
                  ecosystem.
                </p>
              </div>
            </article>
            <article className="CDG1-trust-card">
              <span className="CDG1-trust-icon" aria-hidden="true">
                ◇
              </span>
              <div>
                <strong>Data encrypted</strong>
                <p>
                  Encryption controls for data in transit and storage, subject
                  to deployment configuration.
                </p>
              </div>
            </article>
          </div>
          <p className="CDG1-trust-note">
            Readiness and alignment are not certifications. Availability depends
            on the selected plan, deployment, integrations, policies, agreements
            and implementation scope. Verification details are available on
            request.
          </p>
        </div>
      </section>

      <footer>
        <div className="CDG1-footer-inner">
          <FooterLogo />
          <p>Practice Growth · Patient Experience · Operational Excellence</p>
          <a href="https://caredesk360.com" target="_blank" rel="noreferrer">
            caredesk360.com <Arrow />
          </a>
        </div>
      </footer>
      <a
        className="CDG1-whatsapp-cta CDG1-attention-shake"
        href="https://wa.me/917093111075?text=Hello%20CareDesk360%2C%20I%20would%20like%20to%20book%20a%20growth%20call."
        target="_blank"
        rel="noreferrer"
        aria-label="Book a CareDesk360 growth call on WhatsApp"
      >
        <WhatsAppIcon />
        <span>WhatsApp us</span>
      </a>
      <a
        className="CDG1-mobile-cta CDG1-attention-shake"
        href="#growth-call-form"
      >
        Book a free growth call <Arrow />
      </a>
    </main>
  );
}
