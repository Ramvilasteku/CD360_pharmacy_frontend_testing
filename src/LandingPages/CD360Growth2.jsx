import { useEffect, useRef, useState } from "react";
import "./CD360Growth2.css";
import logoAsset from "./Assets/caredesk360  new logo-04.png";

/**
 * CareDesk360 landing page — single-file drop-in component (Create React App friendly).
 *
 * Usage in your React project:
 *   import CareDesk360Landing from "./CareDesk360Landing.jsx";
 *   ...
 *   <CareDesk360Landing />
 *
 * Props (all optional):
 *   leadApiUrl  Endpoint the growth-call form POSTs to.
 *               Defaults to CRA's REACT_APP_LEAD_API_URL if present, else "/api/growth-call".
 *               You can always pass it explicitly:
 *               <CareDesk360Landing leadApiUrl="/api/growth-call" />
 *   logoSrc     Path/URL to the transparent logo. Defaults to
 *               "/caredesk360-logo-transparent.png" (place the PNG in your public folder),
 *               or pass an imported asset: import logo from "./logo.png"; <... logoSrc={logo} />
 */

const LOCAL_LEADS_KEY = "caredesk360_growth_leads";
const DEFAULT_LOGO_SRC = logoAsset;
const googlescript="https://script.google.com/macros/s/AKfycbxkk1SJPoXCAKjV2lzjPXDwZQWIm6KY8S5Q9KM6X3q0ovpCmc7kTT_XWLrC7qdX-Kxw/exec";

// Safe default lead API URL. Reads Create React App's env var when available,
// without referencing Vite-only syntax (import.meta), which CRA cannot parse.
function resolveDefaultLeadApiUrl() {
  try {
    if (typeof process !== "undefined" && process.env && process.env.REACT_APP_LEAD_API_URL) {
      return String(process.env.REACT_APP_LEAD_API_URL).trim();
    }
  } catch {
    /* process.env not available in this environment */
  }
  return "/api/growth-call";
}

const services = [
  ["01", "Smart clinic software", "Appointments, patient communication and everyday workflows in one connected system.", "OPERATE"],
  ["02", "Website support", "A conversion-focused clinic website built and updated around patient needs.", "CONVERT"],
  ["03", "Content shoots", "Healthcare-focused shoots planned to build trust, authority and recognition.", "CREATE"],
  ["04", "Professional edits", "Reels, educational videos, testimonials and polished short-form edits.", "POLISH"],
  ["05", "Social media posts", "Consistent content planning, design, publishing and profile management.", "ENGAGE"],
  ["06", "Google profile growth", "Google Business Profile optimization for stronger local discoverability.", "DISCOVER"],
  ["07", "Review management", "Monitoring, response support and reputation updates across the patient journey.", "BUILD TRUST"],
  ["08", "Six-platform updates", "One coordinated message maintained across six important digital touchpoints.", "STAY VISIBLE"],
  ["09", "WhatsApp automation", "Enquiries, reminders, updates and follow-ups made faster and more consistent.", "RESPOND"],
];

const trustSignals = [
  { name: "FHIR-ready", label: "Interoperability", icon: "↔", copy: "Standards-based health data exchange." },
  { name: "HIPAA-aligned", label: "Privacy", icon: "✓", copy: "Privacy-first safeguards and workflows." },
  { name: "ABDM-ready", label: "India digital health", icon: "+", copy: "Built for connected health ecosystems." },
  { name: "Data encrypted", label: "Security", icon: "◇", copy: "Protection for data in transit and at rest." },
];

const fragmentedStack = [
  "Marketing agency",
  "Clinic software",
  "AI subscriptions",
  "Website vendor",
  "Content crew",
  "WhatsApp provider",
];

const comparisonRows = [
  ["Strategy", "One healthcare-focused roadmap", "Split across tools and vendors"],
  ["Software", "Clinic software included", "Separate subscription and support"],
  ["Website", "Built and supported with the plan", "Separate developer or agency"],
  ["Content", "Shoot, edits and social posts coordinated", "Multiple creators and approvals"],
  ["Google profile", "Optimization and updates included", "Often an add-on or overlooked"],
  ["Reviews", "Monitoring and response support", "Usually handled manually"],
  ["Six platforms", "Coordinated by one team", "Different schedules and messaging"],
  ["WhatsApp", "Automation connected to the journey", "Another vendor and workflow"],
  ["Monthly pricing", "From ₹9,999", "Multiple subscriptions and retainers"],
];

const faqs = [
  ["Is everything really included at ₹9,999 per month?", "The starting plan brings the core CareDesk360 tech + marketing stack together. Exact deliverables, quantities, platforms and automation scope are confirmed during the growth call and documented before onboarding."],
  ["Can AI tools replace this service?", "AI can help create, analyze and automate—but it still needs healthcare context, strategy, approvals, execution and accountability. CareDesk360 combines useful technology with a team responsible for delivery."],
  ["Will Google profile optimization guarantee a higher ranking?", "No provider can responsibly guarantee a specific Google ranking. We optimize the profile, improve consistency, manage updates and support review workflows to strengthen local discoverability over time."],
  ["How does the Independence Day offer work?", "The 20% offer is available on selected eligible plans from 12–31 August 2026 for the first 80 qualifying healthcare providers, subject to availability and plan terms."],
];

function Logo({ src }) {
  return (
    <span className="cd360-brand">
      <img src={src} alt="CareDesk360 — Advancing Healthcare. Enhancing Lives" />
    </span>
  );
}

function Arrow() {
  return <span aria-hidden="true">↗</span>;
}

function WhatsAppIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="M20 11.6a8 8 0 0 1-11.8 7L4 20l1.4-4A8 8 0 1 1 20 11.6Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 8.2c.2-.4.4-.4.7-.4h.5c.2 0 .3.1.4.4l.7 1.7c.1.3 0 .4-.1.6l-.6.7c-.2.2-.1.4 0 .6.6 1 1.4 1.8 2.5 2.3.2.1.4.1.6-.1l.8-1c.2-.2.4-.2.6-.1l1.8.9c.3.1.3.3.3.5 0 .5-.3 1.4-.8 1.7-.5.4-1.2.7-2.2.5-1.3-.3-2.9-1-4.6-2.6-1.4-1.3-2.4-2.9-2.7-4.2-.3-1 .1-1.7.4-2.1.4-.4.9-.6 1.4-.6" fill="currentColor" />
    </svg>
  );
}

export default function CD360Growth2({ leadApiUrl, logoSrc = DEFAULT_LOGO_SRC }) {
  const apiUrl = (leadApiUrl|| googlescript || resolveDefaultLeadApiUrl()).trim();
  const formRef = useRef(null);
  const [submissionState, setSubmissionState] = useState("idle");
  const [savedMessage, setSavedMessage] = useState("");
  const [submissionError, setSubmissionError] = useState("");
  const [savedLocally, setSavedLocally] = useState(false);

  useEffect(() => {
    const items = Array.from(document.querySelectorAll("[data-cd360-reveal]"));
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      items.forEach((item) => item.classList.add("cd360-revealed"));
      return;
    }

    items.forEach((item) => item.classList.add("cd360-reveal-ready"));

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("cd360-revealed");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.04, rootMargin: "0px 0px -25px" });

    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  const getLeadDetails = () => {
    const form = formRef.current;
    if (!form || !form.reportValidity()) return null;
    const data = new FormData(form);
    const doctorName = String(data.get("doctorName") || "").trim();
    const phone = String(data.get("phone") || "").trim();
    const preferredTime = String(data.get("preferredTime") || "").trim();
    const clinicName = String(data.get("clinicName") || "").trim();
    const location = String(data.get("location") || "").trim();
    const consent = data.get("consent") === "on";
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
    const readableTime = preferredTime ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(preferredTime)) : "Not provided";
    const message = [
      "New CareDesk360 ₹9,999 Plan Enquiry", "",
      `Doctor name: ${doctorName}`, `Phone number: ${phone}`,
      `Preferred call time: ${readableTime} (${timeZone})`,
      `Clinic name: ${clinicName || "Not provided"}`,
      `Location: ${location || "Not provided"}`, "",
      "Plan: CareDesk360 Tech + Marketing Partner — ₹9,999/month",
    ].join("\n");
    return { message, payload: { doctorName, phone, preferredTime, timeZone, clinicName, location, consent, website: String(data.get("website") || "") } };
  };

  const storeLeadInBrowser = (payload) => {
    let leads = [];
    try {
      const existing = JSON.parse(localStorage.getItem(LOCAL_LEADS_KEY) || "[]");
      leads = Array.isArray(existing) ? existing : [];
    } catch {
      leads = [];
    }
    leads.push({ ...payload, createdAt: new Date().toISOString() });
    localStorage.setItem(LOCAL_LEADS_KEY, JSON.stringify(leads));
  };

  const saveLead = async (event) => {
    event.preventDefault();
    if (submissionState === "saving" || submissionState === "saved") return;
    const details = getLeadDetails();
    if (!details) return;
    setSavedMessage(details.message);
    setSubmissionState("saving");
    setSubmissionError("");
    setSavedLocally(false);
    try {
const response = await fetch(apiUrl, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(details.payload) });      
const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "We could not save your request.");
      setSubmissionState("saved");
    } catch (error) {
      try {
        storeLeadInBrowser(details.payload);
        setSavedLocally(true);
        setSubmissionState("saved");
      } catch {
        setSubmissionError(error instanceof Error ? error.message : "We could not save your request.");
        setSubmissionState("error");
      }
    }
  };

  const getShareMessage = () => savedMessage || getLeadDetails()?.message || "";
  const sendOnWhatsApp = () => {
    const message = getShareMessage();
    if (message) window.open(`https://wa.me/917093111075?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  };
  const sendByEmail = () => {
    const message = getShareMessage();
    if (message) window.location.href = `mailto:info@ridgeveda.com?subject=${encodeURIComponent("CareDesk360 ₹9,999 Plan Enquiry")}&body=${encodeURIComponent(message)}`;
  };

  return (
    <main className="cd360-root">
      <header className="cd360-site-header">
        <a href="#top" aria-label="CareDesk360 home"><Logo src={logoSrc} /></a>
        <nav aria-label="Primary navigation">
          <a href="#why-one">Why one partner</a>
          <a href="#stack">What you get</a>
          <a href="#compare">Compare</a>
          <a href="#plan">₹9,999 plan</a>
        </nav>
        <a className="cd360-button cd360-button-light cd360-cta-shake" href="#growth-call-form">Book a growth call <Arrow /></a>
      </header>

      <section className="cd360-hero" id="top">
        <div className="cd360-hero-grid cd360-shell">
          <div className="cd360-hero-copy">
            <div className="cd360-eyebrow"><span /> Healthcare-focused tech + marketing partner</div>
            <h1 style={{ color:"white" }}>Why pay for different <em>AI tools</em> and agencies?</h1>
            <p className="cd360-hero-lead">One healthcare technology partner can bring your software, website, content, social presence, Google profile and WhatsApp workflows together.</p>
            <div className="cd360-hero-price">
              <div><small>Your complete growth partner</small><strong><sup>₹</sup>9,999<span>/month</span></strong></div>
              <span className="cd360-price-note">TECH <i>+</i> MARKETING</span>
            </div>
            <div className="cd360-hero-actions">
              <a className="cd360-button cd360-button-mint" href="#growth-call-form">Book a free growth call <Arrow /></a>
              <a className="cd360-text-link" href="#stack">See everything included ↓</a>
            </div>
          </div>

          <div className="cd360-hero-system" aria-label="One connected CareDesk360 growth system">
            <div className="cd360-system-glow" />
            <div className="cd360-system-card">
              <div className="cd360-system-head"><span>YOUR CLINIC GROWTH SYSTEM</span><b>One partner. Everything connected.</b></div>
              <div className="cd360-system-core"><span>C</span><div><small>CAREDESK360</small><strong>Active growth desk</strong></div><i>LIVE</i></div>
              <div className="cd360-system-grid">
                <span>SOFTWARE</span><span>WEBSITE</span><span>CONTENT</span><span>SOCIAL</span><span>GOOGLE</span><span>WHATSAPP</span>
              </div>
              <div className="cd360-system-flow"><span>Discover</span><i /><span>Enquire</span><i /><span>Book</span><i /><span>Return</span></div>
            </div>
            <div className="cd360-float-chip cd360-chip-one"><span>✓</span> One accountable team</div>
            <div className="cd360-float-chip cd360-chip-two"><span>6</span> Platforms in sync</div>
          </div>
        </div>
        <div className="cd360-hero-proof cd360-shell">
          <span><b>01</b> One monthly plan</span>
          <span><b>02</b> Healthcare-focused execution</span>
          <span><b>03</b> Technology + marketing</span>
        </div>
      </section>

      <div className="cd360-ticker" aria-label="CareDesk360 services">
        <div><span>SOFTWARE</span><i>✦</i><span>WEBSITE</span><i>✦</i><span>CONTENT</span><i>✦</i><span>SOCIAL MEDIA</span><i>✦</i><span>GOOGLE PROFILE</span><i>✦</i><span>WHATSAPP</span></div>
      </div>

      <section className="cd360-fragmented cd360-shell" id="why-one">
        <div className="cd360-section-heading" data-cd360-reveal>
          <span className="cd360-kicker">The real cost of fragmentation</span>
          <h2>More tools do not automatically create more growth.</h2>
          <p>AI can assist. Agencies can execute. Software can organize. But clinics still need one healthcare-focused team to connect strategy, patient experience, technology and delivery.</p>
        </div>

        <div className="cd360-choice-grid">
          <article className="cd360-old-way" data-cd360-reveal>
            <div className="cd360-card-label"><span>THE FRAGMENTED WAY</span><b>Multiple bills. Multiple handoffs.</b></div>
            <div className="cd360-vendor-cloud">
              {fragmentedStack.map((item, index) => <span key={item} style={{ "--delay": `${index * 0.08}s` }}>{item}</span>)}
            </div>
            <ul>
              <li><span>×</span> No single owner for the patient journey</li>
              <li><span>×</span> Repeated coordination and inconsistent messaging</li>
              <li><span>×</span> Separate subscriptions, retainers and support teams</li>
            </ul>
          </article>

          <article className="cd360-one-way" data-cd360-reveal>
            <div className="cd360-card-label"><span>THE CAREDESK360 WAY</span><b>One plan. One team. One direction.</b></div>
            <div className="cd360-one-orbit">
              <div className="cd360-orbit-line" />
              <div className="cd360-one-core">C<span>360°</span></div>
              <span className="cd360-orbit-tag cd360-tag-a">Tech</span><span className="cd360-orbit-tag cd360-tag-b">Growth</span><span className="cd360-orbit-tag cd360-tag-c">Content</span>
            </div>
            <ul>
              <li><span>✓</span> Healthcare-focused strategy and execution</li>
              <li><span>✓</span> Connected technology, content and communication</li>
              <li><span>✓</span> One accountable growth partner from ₹9,999/month</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="cd360-services" id="stack">
        <div className="cd360-shell">
          <div className="cd360-section-heading cd360-services-heading" data-cd360-reveal>
            <span className="cd360-kicker">The one-partner stack</span>
            <h2>Nine essential growth functions. One healthcare-focused team.</h2>
            <p>Built to keep your clinic visible, responsive and consistent without making you manage a maze of vendors.</p>
          </div>
          <div className="cd360-service-grid">
            {services.map(([number, title, copy, label]) => (
              <article className="cd360-service-card" data-cd360-reveal key={number}>
                <div className="cd360-service-card-top"><span className="cd360-service-number">{number}</span><span className="cd360-service-tag">{label}</span></div>
                <h3>{title}</h3>
                <p>{copy}</p>
                <span className="cd360-service-arrow">↗</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="cd360-journey-section cd360-shell">
        <div className="cd360-section-heading" data-cd360-reveal>
          <span className="cd360-kicker">Connected around the patient journey</span>
          <h2>Your clinic does not need more disconnected activity.</h2>
          <p>It needs every touchpoint to move a patient forward—from discovery to enquiry, appointment, experience, review and retention.</p>
        </div>
        <div className="cd360-journey-swipe-guide" aria-hidden="true"><span>Swipe to follow the complete journey</span><b><i /><i /><i />→</b></div>
        <div className="cd360-journey-board" data-cd360-reveal>
          <div className="cd360-journey-strip">
            <div className="cd360-journey-track">
              {["Discover", "Trust", "WhatsApp", "Book", "Visit", "Review", "Return"].map((step, index) => (
                <div className="cd360-journey-step" key={step}><span>{String(index + 1).padStart(2, "0")}</span><b>{step}</b>{index < 6 && <i />}</div>
              ))}
            </div>
            <div className="cd360-journey-insight"><strong>One team sees the complete journey.</strong><p>Content builds trust. Google helps discovery. WhatsApp reduces friction. Software supports the experience. Review management strengthens the next decision.</p></div>
          </div>
        </div>
      </section>

      <section className="cd360-compare-section" id="compare">
        <div className="cd360-shell">
          <div className="cd360-section-heading cd360-compare-heading" data-cd360-reveal>
            <span className="cd360-kicker">One partner versus many</span>
            <h2 style={{ color:"white" }}>Choose accountability over agency and AI-tool sprawl.</h2>
            <p>CareDesk360 gives your clinic one coordinated growth system instead of a collection of unrelated subscriptions and vendors.</p>
          </div>
          <div className="cd360-swipe-hint">Swipe to compare <span>→</span></div>
          <div className="cd360-compare-table-wrap" data-cd360-reveal>
            <table className="cd360-compare-table">
              <caption className="cd360-sr-only">CareDesk360 compared with a fragmented mix of AI tools, agencies and vendors</caption>
              <thead><tr><th>What your clinic needs</th><th><span>CareDesk360</span><small>One accountable partner</small></th><th><span>Multiple tools + agencies</span><small>Fragmented responsibility</small></th></tr></thead>
              <tbody>
                {comparisonRows.map(([need, caredesk, fragmented]) => <tr key={need}><th scope="row">{need}</th><td><b>✓</b>{caredesk}</td><td>{fragmented}</td></tr>)}
              </tbody>
            </table>
          </div>
          <p className="cd360-compare-note">Plan inclusions and quantities vary by agreed scope. Third-party tools and agency capabilities vary. CareDesk360 does not guarantee a particular Google ranking, appointment volume or business outcome.</p>
        </div>
      </section>

      <section className="cd360-offer cd360-shell" id="plan">
        <div className="cd360-offer-card" data-cd360-reveal>
          <div className="cd360-offer-copy">
            <div className="cd360-flag-line"><i /><i /><i /></div>
            <span className="cd360-kicker">80th Independence Day growth offer</span>
            <h2>One team.<br />More independence.</h2>
            <p>Join the first 80 eligible healthcare providers between <strong>12–31 August 2026</strong> and unlock <strong>20% off selected plans.</strong></p>
            <div className="cd360-offer-meta"><span><b>12–31</b>August 2026</span><span><b>80</b>Provider slots</span><span><b>20%</b>Off selected plans</span></div>
          </div>
          <div className="cd360-offer-seal"><small>LIMITED</small><strong>20<sup>%</sup></strong><small>OFF</small></div>
        </div>
      </section>

      <section className="cd360-booking cd360-shell" id="growth-call-form">
        <div className="cd360-booking-inner">
          <div className="cd360-booking-copy">
            <span className="cd360-kicker">CareDesk360 one-partner plan</span>
            <h2 style={{ color:"white" }}>Make CareDesk360 your tech + marketing team.</h2>
            <p>Tell us when you are available. We will understand your clinic, confirm the right scope and explain how the connected plan can work for you.</p>
            <div className="cd360-plan-price"><small>Plans start at</small><strong><sup>₹</sup>9,999<span>/month</span></strong></div>
            <ul>
              <li><span>✓</span> Healthcare-focused technology</li>
              <li><span>✓</span> Content and digital execution</li>
              <li><span>✓</span> One accountable growth partner</li>
            </ul>
          </div>

          <form className="cd360-growth-form" ref={formRef} onSubmit={saveLead}>
            <div className="cd360-form-heading"><span>Free growth consultation</span><h3>Book your <b>growth call</b></h3><p>Your request is saved first. WhatsApp and email are optional after submission.</p></div>
            <fieldset disabled={submissionState === "saving" || submissionState === "saved"}>
              <label className="cd360-trap-field" aria-hidden="true">Website<input name="website" type="text" tabIndex={-1} autoComplete="off" /></label>
              <div className="cd360-form-grid">
                <label className="cd360-form-field"><span>Doctor name <b>*</b></span><input name="doctorName" type="text" autoComplete="name" placeholder="Dr. Your Name" required /></label>
                <label className="cd360-form-field"><span>Phone number <b>*</b></span><input name="phone" type="tel" autoComplete="tel" placeholder="+91 98765 43210" minLength={7} maxLength={20} required /></label>
                <label className="cd360-form-field cd360-form-wide"><span>Available time for the call <b>*</b></span><input name="preferredTime" type="datetime-local" required /></label>
                <label className="cd360-form-field"><span>Clinic name <em>Optional</em></span><input name="clinicName" type="text" autoComplete="organization" placeholder="Your clinic name" /></label>
                <label className="cd360-form-field"><span>Location <em>Optional</em></span><input name="location" type="text" autoComplete="address-level2" placeholder="Area and city" /></label>
              </div>
              <label className="cd360-consent"><input name="consent" type="checkbox" required /><span>I agree to be contacted by CareDesk360 about this growth consultation request.</span></label>
            </fieldset>
            {submissionState !== "saved" && <button className="cd360-save-button" type="submit" disabled={submissionState === "saving"}><span>{submissionState === "saving" ? "Saving your request…" : submissionState === "error" ? "Try saving again" : "Save & book growth call"}</span><Arrow /></button>}
            <div className="cd360-submission-status" aria-live="polite">
              {submissionState === "saved" && <div className="cd360-saved-box"><span>✓</span><div><strong>Your request is saved.</strong><p>{savedLocally ? "Saved on this device. Send it by WhatsApp or email to notify the CareDesk360 team." : "Our team can contact you using the details provided."}</p></div></div>}
              {submissionState === "error" && <div className="cd360-error-box"><strong>We could not save the request.</strong><span>{submissionError} You can retry or use an option below.</span></div>}
            </div>
            {(submissionState === "saved" || submissionState === "error") && <div className="cd360-share-actions">
              <p>For faster confirmation, you may also send the same details:</p>
              <div><button type="button" onClick={sendOnWhatsApp}><WhatsAppIcon /><span>Send on WhatsApp<small>+91 70931 11075</small></span></button><button type="button" onClick={sendByEmail}><span className="cd360-mail-icon">@</span><span>Send by email<small>info@ridgeveda.com</small></span></button></div>
            </div>}
            <p className="cd360-form-note">Submitted details are stored for this enquiry. WhatsApp and email open a pre-filled message for you to review and send.</p>
          </form>
        </div>
      </section>

      <section className="cd360-faq cd360-shell">
        <div data-cd360-reveal><span className="cd360-kicker">Good to know</span><h2>Questions before you switch to one partner?</h2></div>
        <div className="cd360-faq-list" data-cd360-reveal>{faqs.map(([question, answer], index) => <details key={question} open={index === 0}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}</div>
      </section>

      <section className="cd360-trust">
        <div className="cd360-trust-inner cd360-shell">
          <div data-cd360-reveal><span className="cd360-kicker">Technology you can trust</span><h2>Healthcare-ready foundations.</h2><p>Standards-aware technology for connected workflows and responsible growth.</p></div>
          <div className="cd360-trust-grid">
            {trustSignals.map((item) => <article className="cd360-trust-card" data-cd360-reveal key={item.name}><span className="cd360-trust-icon">{item.icon}</span><div><small>{item.label}</small><strong>{item.name}</strong><p>{item.copy}</p></div></article>)}
          </div>
          <p className="cd360-trust-note">Readiness and alignment are not certifications. Availability depends on selected plan, deployment, integrations, policies, agreements and implementation scope. Verification details are available on request.</p>
        </div>
      </section>

      <footer>
        <Logo src={logoSrc} />
        <p>Practice Growth · Patient Experience · Operational Excellence</p>
        <a href="https://caredesk360.com" target="_blank" rel="noreferrer">caredesk360.com <Arrow /></a>
      </footer>

      <a className="cd360-whatsapp-float cd360-cta-shake" href="https://wa.me/917093111075?text=Hello%20CareDesk360%2C%20I%20want%20to%20know%20more%20about%20the%20%E2%82%B99%2C999%20Tech%20%2B%20Marketing%20plan." target="_blank" rel="noreferrer" aria-label="Chat with CareDesk360 on WhatsApp"><WhatsAppIcon /><span>WhatsApp us</span></a>
      <a className="cd360-mobile-cta cd360-cta-shake" href="#growth-call-form">Book a free growth call <Arrow /></a>
    </main>
  );
}