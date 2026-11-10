import React, { useLayoutEffect, useRef, useState } from "react";
import { useQuest } from "../context/QuestContext";
import { MODULES, COMPARISON_ROWS, FAQS, LEVELS } from "../data";
import { THEME } from "../theme";
import useInView from "../hooks/useInView";
import { prefersReduced } from "../utils/storage";
import { AwardSection, Reveal, ScrollLink, cx } from "./common";
import { HashLink } from "react-router-hash-link";
import nameLogo from "../../../Assets/caredesk360  new logo-04.png";
import founderImageSrc from "../Assets/nagaraju-tatipally1.jpg";

/* ================= OUTCOMES ================= */
const TRACK = `rgba(${THEME.shadowRgb},.10)`;

function OViz({ type, col, pct = 75 }) {
  const [ref, inView] = useInView(0.4);
  const lineRef = useRef(null);

  useLayoutEffect(() => {
    if (!inView || !lineRef.current) return;
    const p = lineRef.current;
    const L = p.getTotalLength();
    p.style.strokeDasharray = L;
    p.style.strokeDashoffset = L;
    p.getBoundingClientRect();
    p.style.transition = "stroke-dashoffset 1.4s cubic-bezier(.3,.7,.2,1)";
    p.style.strokeDashoffset = "0";
  }, [inView]);

  let svg = null;
  if (type === "spark") {
    svg = (
      <svg viewBox="0 0 120 44">
        <path
          ref={lineRef}
          d="M2 38 L20 34 L38 35 L56 26 L74 22 L92 12 L118 4"
          fill="none"
          stroke={col}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="118" cy="4" r="4" fill={col}>
          <animate
            attributeName="r"
            values="4;6;4"
            dur="1.8s"
            repeatCount="indefinite"
          />
        </circle>
      </svg>
    );
  } else if (type === "ring") {
    const r = 17;
    const circ = 2 * Math.PI * r;
    const off = circ * (1 - pct / 100);
    svg = (
      <svg viewBox="0 0 120 44">
        <g transform="translate(60,22)">
          <circle r={r} fill="none" stroke={TRACK} strokeWidth="6" />
          <circle
            r={r}
            fill="none"
            stroke={col}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circ}
            transform="rotate(-90)"
            style={{
              strokeDashoffset: inView ? off : circ,
              transition: "stroke-dashoffset 1.4s cubic-bezier(.3,.7,.2,1) .2s",
            }}
          />
          <text
            y="4"
            textAnchor="middle"
            fontSize="10"
            fontWeight="700"
            fill={col}
            fontFamily="monospace"
          >
            {pct}%
          </text>
        </g>
      </svg>
    );
  } else if (type === "loop") {
    svg = (
      <svg viewBox="0 0 120 44">
        <path
          d="M30 22 a15 15 0 1 1 4 10"
          fill="none"
          stroke={col}
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <path
          d="M30 30 L34 32 L36 26"
          fill="none"
          stroke={col}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M62 30 h10 M62 22 h22 M62 14 h16"
          stroke={`rgba(${THEME.shadowRgb},.22)`}
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    );
  } else {
    svg = (
      <svg viewBox="0 0 120 44">
        {[14, 22, 12, 30, 20, 36].map((h, i) => (
          <rect
            key={i}
            x={18 + i * 15}
            y={40 - h}
            width="9"
            height="0"
            rx="2.5"
            fill={i === 5 ? col : `rgba(${THEME.shadowRgb},.15)`}
          >
            <animate
              attributeName="height"
              to={h}
              dur="0.7s"
              begin={i * 0.12 + "s"}
              fill="freeze"
            />
            <animate
              attributeName="y"
              to={40 - h}
              dur="0.7s"
              begin={i * 0.12 + "s"}
              fill="freeze"
            />
          </rect>
        ))}
      </svg>
    );
  }
  return (
    <div ref={ref} className="ccgs-oviz">
      {svg}
    </div>
  );
}

export function Outcomes() {
  const cards = [
    [
      "01",
      "spark",
      THEME.primary,
      "New Patient Acquisition",
      "Visibility that turns interest into appointments.",
    ],
    [
      "02",
      "ring",
      THEME.sky,
      "Treatment Acceptance",
      "Clear education, structured follow-ups.",
      78,
    ],
    [
      "03",
      "loop",
      THEME.accent,
      "Patient Retention",
      "Reminders and aftercare that bring patients back.",
    ],
    [
      "04",
      "bars",
      THEME.primaryDeep,
      "Operational Efficiency",
      "One system for bookings, chats and workflows.",
    ],
  ];
  return (
    <AwardSection awardId="outcomes" className="ccgs-section">
      <div className="ccgs-wrap">
        <Reveal className="ccgs-eyebrow">Experts in clinic growth</Reveal>
        <Reveal as="h2" className="ccgs-big">
          Built around the outcomes that matter.
        </Reveal>
        <Reveal as="p" className="ccgs-lede">
          CareDesk360 helps healthcare practices strengthen every stage of the
          patient journey — from discovery and booking to treatment, follow-up
          and retention.
        </Reveal>
        <div className="ccgs-grid-4">
          {cards.map(([n, type, col, h, p, pct]) => (
            <Reveal key={n} className="ccgs-ocard">
              <div className="ccgs-num">{n}</div>
              <OViz type={type} col={col} pct={pct} />
              <h3>{h}</h3>
              <p>{p}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </AwardSection>
  );
}

/* ================= PLATFORM / COLLECTIBLES ================= */
export function Platform() {
  const { game } = useQuest();
  const [flipped, setFlipped] = useState([]);

  const flip = (m) => {
    if (flipped.includes(m.n)) return;
    const next = [...flipped, m.n];
    setFlipped(next);
    game.add(20, m.t + " unlocked", "Growth module " + m.n + " collected");
    if (next.length === 6) {
      game.unlock("collector");
      game.add(
        30,
        "Full stack assembled",
        "All 6 growth modules connected",
        true,
      );
    }
  };

  return (
    <AwardSection
      awardId="platform"
      className="ccgs-section"
      style={{
        background:
          "linear-gradient(180deg,var(--ccgs-bg),var(--ccgs-surface))",
      }}
    >
      <div className="ccgs-wrap">
        <Reveal className="ccgs-eyebrow">
          One partner. One connected growth stack.
        </Reveal>
        <Reveal as="h2" className="ccgs-big">
          Everything your clinic needs to be seen, trusted and chosen.
        </Reveal>
        <Reveal as="p" className="ccgs-lede">
          Replace fragmented vendors and disconnected tools with a
          healthcare-focused team that understands growth, content, technology
          and patient experience.{" "}
          <b style={{ color: "var(--ccgs-primary)" }}>
            Flip all six cards to complete your stack.
          </b>
        </Reveal>

        <div className="ccgs-grid-3">
          {MODULES.map((m) => (
            <Reveal
              key={m.n}
              className={cx(
                "ccgs-fcard",
                flipped.includes(m.n) && "ccgs-flipped",
              )}
              onClick={() => flip(m)}
            >
              <div className="ccgs-fcard-in">
                <div className="ccgs-fface ccgs-front">
                  <div className="ccgs-fnum">{m.n}</div>
                  <div className="ccgs-ficon">{m.ic}</div>
                  <h3>{m.t}</h3>
                  <div className="ccgs-hint">▸ tap to unlock module</div>
                </div>
                <div className="ccgs-fface ccgs-back">
                  <div className="ccgs-fnum">{m.n}</div>
                  <h3>{m.t}</h3>
                  <p>{m.d}</p>
                  <div className="ccgs-got">✓ Module collected · +20 GP</div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal className="ccgs-collect-bar">
          <div className="ccgs-dots">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={cx("ccgs-cdot", i < flipped.length && "ccgs-on")}
              />
            ))}
          </div>
          <div className="ccgs-txt">
            {flipped.length} / 6 growth modules collected
          </div>
        </Reveal>

        <Reveal className="ccgs-pill-note">
          Also included in selected plans — <b>Offline branding support:</b>
          &nbsp;consistent clinic communication, from the screen to the street.
        </Reveal>
      </div>
    </AwardSection>
  );
}

/* ================= EXTENDED TEAM ================= */
export function Team() {
  return (
    <section className="ccgs-section">
      <div className="ccgs-wrap">
        <Reveal className="ccgs-eyebrow">Your extended clinic team</Reveal>
        <Reveal as="h2" className="ccgs-big">
          You focus on patient care. We handle marketing and technology.
        </Reveal>
        <Reveal as="p" className="ccgs-lede">
          CareDesk360 works as your dedicated marketing and tech team — bringing
          strategy, content, software, websites, WhatsApp, branding and ongoing
          support under one accountable partner.
        </Reveal>
        <div className="ccgs-grid-3">
          <Reveal className="ccgs-ocard">
            <div className="ccgs-ficon" style={{ fontSize: 24 }}>
              🎯
            </div>
            <h3>Marketing team</h3>
            <p>
              Growth strategy, content and campaigns built around the patient
              journey.
            </p>
          </Reveal>
          <Reveal className="ccgs-ocard">
            <div className="ccgs-ficon" style={{ fontSize: 24 }}>
              ⚙️
            </div>
            <h3>Technology team</h3>
            <p>
              Websites, clinic software, automation and integrations under one
              roof.
            </p>
          </Reveal>
          <Reveal className="ccgs-ocard">
            <div className="ccgs-ficon" style={{ fontSize: 24 }}>
              🤝
            </div>
            <h3>Growth support</h3>
            <p>
              Continuous, accountable execution with one point of ownership.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ================= WHY / STATS ================= */
function CountUp({ target, suffix }) {
  const [val, setVal] = useState("0");
  const [ref] = useInView(0.5, () => {
    if (prefersReduced()) {
      setVal(target + suffix);
      return;
    }
    let cur = 0;
    const inc = Math.max(1, target / 40);
    const run = () => {
      cur += inc;
      if (cur >= target) setVal(target + suffix);
      else {
        setVal(Math.floor(cur) + suffix.replace(/[–%].*/, ""));
        requestAnimationFrame(run);
      }
    };
    run();
  });
  return (
    <div ref={ref} className="ccgs-n">
      {val}
    </div>
  );
}

export function Why() {
  return (
    <section className="ccgs-section ccgs-why">
      <div className="ccgs-wrap">
        <Reveal className="ccgs-eyebrow">Why CareDesk360</Reveal>
        <Reveal as="h2" className="ccgs-big">
          One connected growth partner versus a fragmented setup.
        </Reveal>
        <Reveal as="p" className="ccgs-lede">
          Bring healthcare software, growth strategy, content, patient
          engagement and operational support together — without managing
          separate platforms, agencies and vendors.
        </Reveal>
        <div className="ccgs-why-grid">
          <Reveal className="ccgs-wstat">
            <CountUp target={75} suffix="–95%" />
            <h3>Lower estimated cost</h3>
            <p>
              Across selected plans vs. sourcing a comparable combined scope
              separately.
            </p>
          </Reveal>
          <Reveal className="ccgs-wstat">
            <div className="ccgs-n">Day 1</div>
            <h3>Work begins</h3>
            <p>
              Onboarding and initial execution start once scope, access and
              inputs are confirmed.
            </p>
          </Reveal>
          <Reveal className="ccgs-wstat">
            <div className="ccgs-n">Up to 2X</div>
            <h3>Stronger-results target</h3>
            <p>
              Our connected model is designed to outperform fragmented
              execution.
            </p>
          </Reveal>
          <Reveal className="ccgs-wstat">
            <CountUp target={10} suffix="–15%" />
            <h3>Organic growth reported</h3>
            <p>
              Selected partner clinics reported growth without paid-ad spend in
              their measured period.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ================= COMPARISON ================= */
export function Comparison() {
  const { game } = useQuest();
  const [shown, setShown] = useState(false);
  const reveal = () => {
    setShown(true);
    game.once("cmp", 40, "Matchup revealed", "CareDesk360 comes out ahead");
    game.unlock("strategist");
  };
  return (
    <AwardSection awardId="comparison" className="ccgs-section">
      <div className="ccgs-wrap">
        <Reveal className="ccgs-eyebrow">Head to head</Reveal>
        <Reveal as="h2" className="ccgs-big">
          Connected partner vs. everyone else.
        </Reveal>
        <Reveal as="p" className="ccgs-lede">
          CareDesk360 compared with a typical content-only agency, standalone
          clinic software and multiple-vendor setups.
        </Reveal>

        <Reveal className="ccgs-cmp-btn-reveal">
          <button
            className="ccgs-btn ccgs-btn-primary"
            onClick={reveal}
            disabled={shown}
          >
            {shown ? "✓ Matchup revealed" : "⚔️ Reveal the matchup"}
          </button>
        </Reveal>

        <Reveal
          className={cx(
            "ccgs-cmp-wrap",
            "ccgs-cmp-reveal",
            shown && "ccgs-shown",
          )}
        >
          <div className="ccgs-cmp-head">
            <div className="ccgs-need">
              <span className="ccgs-ct">What your clinic needs</span>
            </div>
            <div className="ccgs-hero-col">
              <span className="ccgs-ct">CareDesk360</span>
              <div className="ccgs-cs">Connected partner</div>
            </div>
            <div>
              <span className="ccgs-ct">Content-only agency</span>
              <div className="ccgs-cs">Posting-led</div>
            </div>
            <div>
              <span className="ccgs-ct">Standalone software</span>
              <div className="ccgs-cs">Operations-led</div>
            </div>
            <div>
              <span className="ccgs-ct">Multiple vendors</span>
              <div className="ccgs-cs">Fragmented</div>
            </div>
          </div>
          {COMPARISON_ROWS.map(([need, us, a, b, c]) => (
            <div className="ccgs-cmp-row" key={need}>
              <div className="ccgs-need">{need}</div>
              <div className="ccgs-hero-col">
                <span className="ccgs-yes">✓</span>
                {us}
              </div>
              <div>{a}</div>
              <div>{b}</div>
              <div>{c}</div>
            </div>
          ))}
        </Reveal>

        <div className="ccgs-cmp-cta">
          <ScrollLink to="offer" className="ccgs-btn ccgs-btn-ghost">
            🎡 Unlock 10–20% off your plan ↗
          </ScrollLink>
        </div>
        <p className="ccgs-disc">
          *Comparisons and savings are CareDesk360 internal estimates based on
          comparable bundled scopes and common content-only agency/vendor
          models. Actual capabilities, timelines, pricing, inclusions and
          outcomes vary. Reported client outcomes are examples, not guaranteed
          results.
        </p>
      </div>
    </AwardSection>
  );
}

/* ================= GLOBAL REACH ================= */
export function Reach() {
  return (
    <section className="ccgs-section ccgs-reach">
      <div className="ccgs-wrap">
        <Reveal className="ccgs-reach-inner">
          <div className="ccgs-eyebrow">Global patient reach</div>
          <h2 className="ccgs-big">
            Connecting global patient demand with trusted care in India.
          </h2>
          <p className="ccgs-lede">
            Through our international healthcare partnership, CareDesk360 will
            support patient demand generation across multiple countries —
            helping international and NRI patients and their families discover,
            connect with and coordinate trusted healthcare in India.
          </p>
          <div className="ccgs-reach-orbit">
            <div className="ccgs-orbit-line" />
            <div className="ccgs-travel" />
            <div className="ccgs-node ccgs-g">
              <div className="ccgs-ball">GLOBAL</div>
              <div className="ccgs-l">Patient demand</div>
            </div>
            <div className="ccgs-node ccgs-i">
              <div className="ccgs-ball">INDIA</div>
              <div className="ccgs-l">Trusted care</div>
            </div>
          </div>
          <ScrollLink
            to="offer"
            className="ccgs-btn ccgs-btn-ghost"
            style={{ marginTop: 26 }}
          >
            🎡 Spin for your discount first ↗
          </ScrollLink>
        </Reveal>
      </div>
    </section>
  );
}

/* ================= FOUNDER ================= */
export function Founder() {
  const { game } = useQuest();
  const [imgOk, setImgOk] = useState(true);

  return (
    <section className="ccgs-section">
      <div className="ccgs-wrap">
        <div className="ccgs-founder-grid">
          <Reveal className="ccgs-founder-photo">
            {imgOk ? (
              <img
                src={founderImageSrc}
                alt="Nagaraju Tatipally, Founder and CEO of CareDesk360"
                width="120"
                height="120"
                loading="lazy"
                decoding="async"
                className="ccgs-avatar"
                onError={() => setImgOk(false)}
              />
            ) : (
              <div className="ccgs-avatar ccgs-avatar-fallback">NT</div>
            )}
            <div className="ccgs-fname">Nagaraju Tatipally</div>
            <div className="ccgs-frole">Founder &amp; CEO · CareDesk360</div>
            <a
              className="ccgs-fli"
              href="https://www.linkedin.com/in/nagaraju-tatipally-a9b5619b"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => game.once('li', 20, 'Met the founder', 'Nagaraju Tatipally, CareDesk360')}
            >
              in Connect on LinkedIn ↗
            </a>
          </Reveal>
          <Reveal>
            <div className="ccgs-eyebrow">Meet the founder</div>
            <h2 className="ccgs-big">Building a healthcare growth ecosystem.</h2>
            <p className="ccgs-lede">
              A place where doctors can focus on patient care while one accountable team manages their
              marketing, technology, patient experience and practice-growth support.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
/* ================= FAQ ================= */
function FaqItem({ q, a }) {
  const { game } = useQuest();
  const [open, setOpen] = useState(false);
  const bodyRef = useRef(null);
  return (
    <Reveal className={cx("ccgs-faq-item", open && "ccgs-open")}>
      <button
        className="ccgs-faq-q"
        onClick={() => {
          if (!open)
            game.once(
              "faq",
              10,
              "Curiosity rewarded",
              "Reading the fine print",
            );
          setOpen(!open);
        }}
      >
        {q}
        <span className="ccgs-tog">+</span>
      </button>
      <div
        ref={bodyRef}
        className="ccgs-faq-a"
        style={{
          maxHeight:
            open && bodyRef.current
              ? bodyRef.current.scrollHeight + "px"
              : null,
        }}
      >
        <div>{a}</div>
      </div>
    </Reveal>
  );
}

export function Faq() {
  return (
    <section
      className="ccgs-section"
      style={{
        background:
          "linear-gradient(180deg,var(--ccgs-surface),var(--ccgs-bg))",
      }}
    >
      <div className="ccgs-wrap">
        <Reveal className="ccgs-eyebrow">Good to know</Reveal>
        <Reveal as="h2" className="ccgs-big">
          Frequently asked questions.
        </Reveal>
        <div style={{ marginTop: 36, maxWidth: 820 }}>
          {FAQS.map(([q, a]) => (
            <FaqItem key={q} q={q} a={a} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================= TRUST ================= */
export function Trust() {
  const cards = [
    [
      "↔",
      "FHIR-ready",
      "Designed for standards-based exchange of clinical information.",
    ],
    [
      "✓",
      "HIPAA-aligned",
      "Privacy and security controls designed around HIPAA safeguards.",
    ],
    [
      "＋",
      "ABDM-ready",
      "Prepared for integration with India's digital health ecosystem.",
    ],
    [
      "◇",
      "Data encrypted",
      "Encryption controls for data in transit and storage, per deployment.",
    ],
  ];
  return (
    <section className="ccgs-section">
      <div className="ccgs-wrap">
        <Reveal className="ccgs-eyebrow">Trust by design</Reveal>
        <Reveal as="h2" className="ccgs-big">
          Built for trusted healthcare technology.
        </Reveal>
        <Reveal as="p" className="ccgs-lede">
          Standards-aware foundations for safer data exchange, connected care
          and responsible growth.
        </Reveal>
        <div className="ccgs-trust-grid">
          {cards.map(([ti, h, p]) => (
            <Reveal key={h} className="ccgs-tcard">
              <div className="ccgs-ti">{ti}</div>
              <h3>{h}</h3>
              <p>{p}</p>
            </Reveal>
          ))}
        </div>
        <p className="ccgs-disc">
          Readiness and alignment are not certifications. Availability depends
          on the selected plan, deployment, integrations, policies, agreements
          and implementation scope. Verification details are available on
          request.
        </p>
      </div>
    </section>
  );
}

/* ================= FOOTER ================= */
export function Footer() {
  const { game } = useQuest();
  return (
    <footer className="ccgs-footer">
      <div className="ccgs-wrap">
        <div className="ccgs-footer-top">
          <div>
            <HashLink smooth to="/#" className="navbar-logo">
              <div className="logo-icon">
                {/* <span className="logo-text">CareDesk</span> */}
                <img
                  src={nameLogo}
                  alt="logo"
                  style={{ width: "180%", height: "60px" }}
                />
              </div>
            </HashLink>

            <div className="ccgs-tagline">
              Practice Growth · Patient Experience · Operational Excellence
            </div>
          </div>
          <div className="ccgs-footer-links">
            <a
              href="https://caredesk360.com"
              target="_blank"
              rel="noopener noreferrer"
              className="ccgs-btn ccgs-btn-ghost"
            >
              caredesk360.com ↗
            </a>
            <a
              href="https://wa.me/917093111075?text=Hello%20CareDesk360%2C%20I%20would%20like%20to%20book%20a%20growth%20call."
              target="_blank"
              rel="noopener noreferrer"
              className="ccgs-btn ccgs-btn-ghost"
            >
              WhatsApp us
            </a>
            <ScrollLink
              to="growth-call-form"
              className="ccgs-btn ccgs-btn-primary"
            >
              Book a free growth call ↗
            </ScrollLink>
          </div>
        </div>
        <div className="ccgs-footer-bot">
          <div>
            © 2026 CareDesk360. Reported outcomes are examples, not guaranteed
            results.
          </div>
          <div className="ccgs-footer-score">
            Your growth run:{" "}
            <span>
              {game.gp} GP · Level {game.level + 1} ({LEVELS[game.level].name})
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
