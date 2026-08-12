import React, { useState, useEffect, useRef } from "react";

import "swiper/css";
import "swiper/css/pagination";
import "./Pricing.css";
import Contactmodal from "./Contactmodal";
import Register from "./Register";
import DigitalVisibilityPlan from "./DigitalVisibilityPlan";
import Navbar from "./Navbar";

import heroImage from "../Assets/pricehero.png";
import Footer from "./Footer";
import { Box } from "@mui/material";
import { resolvePlan } from "./planPricing";

const Pricing = () => {
  const [open, setOpen] = useState(false);
  const [subscriptions, setSubscriptions] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentopen, setPaymentOpen] = useState(false);

  const [openFeature, setOpenFeature] = useState(null);
  const [activeTopPlan, setActiveTopPlan] = useState("lifetime");
  const [billingCycle, setBillingCycle] = useState("annual");
  const [activeCompare, setActiveCompare] = useState("Growth");

  /* Horizontal scroll progress for the mobile compare tabs */
  const cmpTabsRef = useRef(null);
  const [tabIndicator, setTabIndicator] = useState({ width: 100, left: 0 });

  const toggleFeatures = (plan) => {
    setOpenFeature(openFeature === plan ? null : plan);
  };

  const updateTabIndicator = () => {
    const el = cmpTabsRef.current;
    if (!el) return;

    const max = el.scrollWidth - el.clientWidth;

    // Nothing to scroll - fill the whole track
    if (max <= 0) {
      setTabIndicator({ width: 100, left: 0 });
      return;
    }

    const width = Math.max((el.clientWidth / el.scrollWidth) * 100, 22);
    const progress = el.scrollLeft / max;

    setTabIndicator({ width, left: progress * (100 - width) });
  };

  useEffect(() => {
    const el = cmpTabsRef.current;
    if (!el) return;

    updateTabIndicator();
    el.addEventListener("scroll", updateTabIndicator, { passive: true });
    window.addEventListener("resize", updateTabIndicator);

    return () => {
      el.removeEventListener("scroll", updateTabIndicator);
      window.removeEventListener("resize", updateTabIndicator);
    };
  }, []);

  const topPlans = [
    {
      id: "software",
      label: "Software Plan",
      shortLabel: "Software",
      isFree: true,
      price: "FREE",
      tag: "One Year CMS",
      highlight: false,
      features: ["Clinic/Hospital Management Software"],
    },
    {
      id: "website",
      label: "Website Plan",
      shortLabel: "Website",
      isFree: false,
      price: "₹10,000",
      tag: "One Year CMS Free",
      highlight: false,
      features: [
        "Custom Advanced Website",
        "Clinic/Hospital Management Software",
      ],
    },
    {
      id: "lifetime",
      label: "Lifetime Plan",
      shortLabel: "Lifetime",
      isFree: false,
      price: "₹10,000",
      tag: "Offer First 100 Clinics/Hospitals",
      highlight: true,
      features: [
        "Lifetime Clinic/Hospital Management Software (10yrs)",
        "No Monthly or Annual Subscription Fees",
      ],
    },
  ];

  const currentTopPlan =
    topPlans.find((p) => p.id === activeTopPlan) || topPlans[0];

  const plans = [
    {
      name: "Growth",
      quarterly: "₹10,000 x 3",
      annual: "₹8,333 x 12",
      planId: "Growth",
      buttonName: "Choose Growth",
      features: [
        "Website and Clinic/Hospital Management Software.",
        "Social media management and content creation (up to 6 posts and 2 reels per month).",
        "Festive posts.",
        "GMB optimization, 4 blogs every month, and LinkedIn optimization.",
        "1 UGC influencer support, OOH, and DOOH ad support.",
        "1 Meta awareness campaign.",
        "Dedicated Account Manager.",
        "Branding support and reputation management.",
        "High-quality reels every month covering preventive care, treatment awareness, aftercare guidance, patient education, and patient testimonials.",
        "Multiple patient touchpoints across 6 powerful digital platforms, ensuring patients find and trust you wherever they search.",
      ],
    },
    {
      name: "Scale",
      quarterly: "₹15,000 x 3",
      annual: "₹12,500 x 12",
      planId: "Scale",
      bestSeller: true,
      buttonName: "Choose Scale",
      features: [
        "Website and Clinic/Hospital Management Software.",
        "Social media management and content creation (up to 8 posts and 4 reels per month).",
        "Festive posts.",
        "GMB and LinkedIn optimization, 6 blogs every month, and 2–3 LinkedIn articles every month.",
        "2 UGC influencers, OOH, and DOOH ad support.",
        "Multi Meta awareness campaign.",
        "Dedicated Account Manager.",
        "2 content shoots and training for your team.",
        "Up to 3 specialties.",
        "Priority support, branding support, and reputation management.",
        "High-quality reels every month covering preventive care, treatment awareness, aftercare guidance, patient education, and patient testimonials.",
        "Multiple patient touchpoints across 6 powerful digital platforms, ensuring patients find and trust you wherever they search.",
      ],
    },
    {
      name: "Scale Advantage",
      quarterly: "₹20,000 x 3",
      annual: "₹16,666 x 12",
      planId: "Scale Advantage",
      buttonName: "Choose Advantage",
      features: [
        "Website and Clinic/Hospital Management Software.",
        "Social media management and content creation (up to 8 posts and 6 reels per month).",
        "Festive posts.",
        "GMB and LinkedIn optimization, 6 blogs every month, and 2–3 LinkedIn articles every month.",
        "2 UGC influencers, OOH, and DOOH ad support.",
        "Multi Meta awareness campaign.",
        "Dedicated Account Manager.",
        "2 content shoots and training for your team.",
        "Up to 3 specialties.",
        "50,000 Reach Assured.",
        "Priority support, branding support, and reputation management.",
        "High-quality reels every month covering preventive care, treatment awareness, aftercare guidance, patient education, and patient testimonials.",
        "Multiple patient touchpoints across 6 powerful digital platforms, ensuring patients find and trust you wherever they search.",
      ],
    },
    {
      name: "Scale Advantage Plus",
      quarterly: "₹30,000 x 3",
      annual: "₹25,000 x 12",
      planId: "Scale Advantage Plus",
      buttonName: "Choose Adv Plus",
      features: [
        "Website and Clinic/Hospital Management Software.",
        "Social media management and content creation (up to 10 posts and 8 reels per month).",
        "Festive posts.",
        "GMB and LinkedIn optimization, 6 blogs every month, and 2–3 LinkedIn articles every month.",
        "2 UGC influencers, OOH, and DOOH ad support.",
        "Multi Meta awareness campaign.",
        "Dedicated Account Manager.",
        "2 content shoots and training for your team.",
        "Up to 3 specialties.",
        "1,00,000+ Reach Assured.",
        "Up to 10 blogs per month.",
        "Priority support, branding support, and reputation management.",
        "High-quality reels every month covering preventive care, treatment awareness, aftercare guidance, patient education, and patient testimonials.",
        "Multiple patient touchpoints across 6 powerful digital platforms, ensuring patients find and trust you wherever they search.",
      ],
    },
    {
      name: "Legacy",
      quarterly: "₹45,000 x 3",
      annual: "₹37,500 x 12",
      planId: "Legacy",
      buttonName: "Choose Legacy",
      features: [
        "Website and Clinic/Hospital Management Software.",
        "Social media management and content creation (up to 20 posts and 12 reels per month).",
        "Festive Posts.",
        "GMB and LinkedIn optimization, 8 blogs every month, and 2–3 LinkedIn articles every month.",
        "4 UGC influencers, OOH, and DOOH ad support.",
        "Multi Meta & Google awareness campaigns.",
        "Dedicated Account Manager.",
        "4 content shoots and training for your team.",
        "Multi specialties.",
        "Priority support, branding support, reputation management, content shoots, and training.",
        "Custom landing pages for the website and ads.",
        "Dedicated ad specialist.",
        "3 YouTube videos every month.",
        "8 blogs every month.",
        "High-quality reels every month covering preventive care, treatment awareness, aftercare guidance, patient education, and patient testimonials.",
        "Multiple patient touchpoints across 6 powerful digital platforms, ensuring patients find and trust you wherever they search.",
      ],
    },
  ];

  const basicPlans = plans.slice(0, 5);

  /* =========================================================
     FEATURE COMPARISON MATRIX
     values[] follows the same order as comparePlans below.
     true  -> shows a tick
     false -> shows a dash
     "6"   -> shows the number / text as-is
  ========================================================= */
  const comparePlans = [
    "Growth",
    "Scale",
    "Scale Advantage",
    "Scale Advantage Plus",
    "Legacy",
  ];

  const compareRows = [
    {
      feature: "Website & Clinic/Hospital Management Software",
      values: [true, true, true, true, true],
    },
    {
      feature: "Social Media Posts (per month)",
      values: ["6", "8", "8", "10", "20"],
    },
    { feature: "Reels (per month)", values: ["2", "4", "6", "8", "12"] },
    {
      feature: "YouTube Shorts (per month)",
      values: ["2", "4", "6", "8", "12"],
    },
    { feature: "Festive Posts", values: [true, true, true, true, true] },
    { feature: "Blogs (per month)", values: ["4", "6", "6", "6", "10"] },

    { feature: "GMB Optimization", values: [true, true, true, true, true] },
    {
      feature: "LinkedIn Optimization",
      values: [true, true, true, true, true],
    },
    { feature: "UGC Influencers", values: ["1", "2", "2", "2", "4"] },
    {
      feature: "OOH & DOOH Ad Support",
      values: [true, true, true, true, true],
    },
    {
      feature: "Meta Awareness Campaigns",
      values: ["1", "1", "1", "1", "Multi"],
    },

    {
      feature: "Dedicated Account Manager",
      values: [true, true, true, true, true],
    },

    { feature: "Branding Support", values: [true, true, true, true, true] },
    {
      feature: "Reputation Management",
      values: [true, true, true, true, true],
    },
    {
      feature: "Digital Platform Touchpoints",
      values: ["6", "6", "6", "6", "6"],
    },
    {
      feature: "LinkedIn Articles (per month)",
      values: [false, "1", "1", "1", "2"],
    },
    { feature: "Content Shoots", values: [false, "2", "2", "2", "4"] },
    { feature: "Team Training", values: [false, true, true, true, true] },
    { feature: "Priority Support", values: [false, true, true, true, true] },
    {
      feature: "Specialties Covered",
      values: [false, "3", "3", "3", "Multi"],
    },
    {
      feature: "Assured Monthly Reach",
      values: [false, false, "50,000", "1,00,000+", false],
    },

    {
      feature: "Followers Gain (per month)",
      values: [false, false, "200+", "400+", false],
    },
    {
      feature: "YouTube Long Videos (per month)",
      values: [false, false, false, false, "3"],
    },
    {
      feature: "Google Awareness Campaigns",
      values: [false, false, false, false, true],
    },
    {
      feature: "Custom Landing Pages",
      values: [false, false, false, false, true],
    },
    {
      feature: "Dedicated Ad Specialist",
      values: [false, false, false, false, true],
    },
  ];

  const renderCompareValue = (value) => {
    if (value === true) return <span className="cmp-tick">✓</span>;
    if (value === false || value === null || value === undefined)
      return <span className="cmp-dash">—</span>;
    return <span className="cmp-num">{value}</span>;
  };

  const activeCompareIndex = Math.max(comparePlans.indexOf(activeCompare), 0);

  // const advancedPlans = plans.slice(3, 5);

  const fetchSubscriptionPlans = async () => {
    try {
       const response = await fetch(
        `${process.env.REACT_APP_PAYMENT_BACKEND_URL}/api/phonepe/plans`,
      );
      const data = await response.json();
      setSubscriptions(data.data);
      console.log("Fetched subscription plans:", data);
    } catch (error) {
      console.error("Error fetching subscription plans:", error);
    }
  };

  useEffect(() => {
    fetchSubscriptionPlans();
  }, []);


  return (
    <>
      <Navbar />

      {/* Hero Section */}
      <section className="pricing-hero">
        <div className="container pricing-hero-container">
          <div className="pricing-content">
            <span className="pricing-badge"> CareDesk360 Pricing</span>
            <h1>
              Simple Pricing for
              <span> Modern Healthcare</span>
            </h1>

            <div className="animation">
              <lord-icon
                src="/animations/coin.json"
                trigger="loop"
                delay="500"
                colors="primary:#0f172a,secondary:#2563eb"
              ></lord-icon>
              <p>
                Flexible pricing for clinics of every size - designed to
                simplify operations and fuel growth.
              </p>
            </div>

            <div className="pricing-buttons">
              <button
                className="primary-btn"
                onClick={() =>
                  document
                    .getElementById("plans")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                View Plans
              </button>

              <button className="secondary-btn" onClick={() => setOpen(true)}>
                Contact Sales
              </button>
            </div>
          </div>

          <div className="pricing-image">
            <img src={heroImage} alt="CareDesk360 Pricing" />
          </div>
        </div>
      </section>

      <section className="pricing-section" id="plans">
        <div className="container">
          <div className="section-header">
            <div className="section-label">CareDesk360 Plans</div>
            <h2 className="section-title">Simple, Transparent Pricing</h2>
          </div>

          {/* ===== TOP PRICING CARDS SECTION ===== */}

          <div className="tp-section">
            {/* Tabs */}
            <div className="tp-plan-tabs">
              {topPlans.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  className={activeTopPlan === plan.id ? "active" : ""}
                  onClick={() => setActiveTopPlan(plan.id)}
                >
                  <span className="tp-full-text">{plan.label}</span>
                  <span className="tp-short-text">{plan.shortLabel}</span>
                </button>
              ))}
            </div>

            {/* Single card - content changes with the active tab */}
            <div key={activeTopPlan} className="tp-plan-content">
              <div
                className={`lifetime-card ${
                  currentTopPlan.highlight ? "life-time" : ""
                }`}
              >
                <div className="free-price">
                  <h3>{currentTopPlan.label}</h3>
                  <div className="price-box">
                    {currentTopPlan.isFree ? (
                      <div className="free-text">{currentTopPlan.price}</div>
                    ) : (
                      <h2>{currentTopPlan.price}</h2>
                    )}
                    <span className="setup-tag">{currentTopPlan.tag}</span>
                  </div>
                </div>

                <div className="lifetime-card-btn">
                  <ul>
                    {currentTopPlan.features.map((feature, index) => (
                      <li key={index}>
                        <span style={{ color: "#0d2550" }}>✓</span> {feature}
                      </li>
                    ))}
                  </ul>

                  <Box className="btn-div">
                    <button
                      onClick={() => {
                        setSelectedPlan(
                          resolvePlan(currentTopPlan.id, subscriptions),
                        );
                        setPaymentOpen(true);
                      }}
                      className="lifetime-plan-btn"
                    >
                      Get Started
                    </button>
                  </Box>
                </div>
              </div>
            </div>
          </div>

          {/* ===== PLANS SECTION ===== */}

          {/* <div className="section-header pc-heading">
            <div className="section-label">Growth Plans</div>
            <h2 className="section-title">Choose the Plan That Fits You</h2>
          </div> */}

          {/* BILLING CYCLE TABS */}

          <div className="pc-billing-tabs">
            <span className="pc-full-text">
              <b>Choose the Plan That Works Best for You</b>
            </span>

            <button
              type="button"
              className={billingCycle === "quarterly" ? "active" : ""}
              onClick={() => setBillingCycle("quarterly")}
            >
              <span className="pc-full-text">Quarterly</span>
            </button>
            <button
              type="button"
              className={billingCycle === "annual" ? "active" : ""}
              onClick={() => setBillingCycle("annual")}
            >
              <span className="pc-full-text">Annual</span>
            </button>
          </div>

          {/* =====================================================
              DESKTOP - VARIANT A : feature list scrolls inside card
              Delete this whole block if you prefer Variant B.
          ====================================================== */}

          <div className="plans-desktop plans-row-5 pc-scroll">
            {basicPlans.map((plan) => (
              <div className="plan-card" key={plan.name}>
                <div className="plan-header">
                  {plan.bestSeller && (
                    <div className="corner-ribbon">
                      <span>BEST SELLER</span>
                    </div>
                  )}

                  <h3>{plan.name}</h3>

                  <h2 key={billingCycle}>
                    {billingCycle === "quarterly"
                      ? plan.quarterly
                      : plan.annual}
                  </h2>
                  <p>
                    {billingCycle === "quarterly"
                      ? "(3 Months)"
                      : "(12 Months)"}
                  </p>
                </div>

                <ul className="plan-features">
                  {plan.features.map((feature, index) => (
                    <li key={index}>{feature}</li>
                  ))}
                </ul>

                <Box className="btn-box">
                  <button onClick={() => setOpen(true)} className="plan-btn">
                    {plan.buttonName}
                  </button>
                </Box>
              </div>
            ))}
          </div>

          {/* MOBILE */}
          <div className="plans-mobile-accordion">
            {plans.map((plan) => (
              <div className="mobile-plan-card" key={plan.name}>
                {plan.bestSeller && (
                  <div className="mobile-badge">BEST SELLER</div>
                )}

                <div className="mobile-upper-card">
                  <h2>{plan.name}</h2>
                  <div className="mobile-price">{plan.quarterly}</div>
                  <p className="mobile-subtitle">(Quarterly)</p>

                  <hr />
                  <div className="mobile-price">{plan.annual}</div>
                  <p className="mobile-subtitle">(Annually)</p>
                </div>

                <button
                  className="mobile-access-btn"
                  onClick={() => setOpen(true)}
                >
                  {plan.buttonName}
                </button>
                <button
                  className="mobile-feature-toggle"
                  onClick={() => toggleFeatures(plan.name)}
                >
                  {openFeature === plan.name
                    ? "Hide Features ▲"
                    : "Show Features ▼"}
                </button>

                <div
                  className={`mobile-features ${
                    openFeature === plan.name ? "open" : ""
                  }`}
                >
                  <ul className="plan-features">
                    {plan.features.map((feature, index) => (
                      <li key={index}>{feature}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          {/* ===== FEATURE COMPARISON ===== */}
          <div className="cmp-section">
            <div className="section-header">
              <h2 className="section-title">Feature Comparison</h2>
            </div>

            {/* DESKTOP TABLE */}
            <div className="cmp-table-wrap">
              <table className="cmp-table">
                <thead>
                  <tr>
                    <th className="cmp-feature-col">Feature</th>
                    {comparePlans.map((name) => (
                      <th key={name}>{name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {compareRows.map((row) => (
                    <tr key={row.feature}>
                      <td className="cmp-feature-col">{row.feature}</td>
                      {row.values.map((value, index) => (
                        <td key={index}>{renderCompareValue(value)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MOBILE - plan tabs + scroll progress + single column */}
            <div className="cmp-mobile">
              <div className="cmp-plan-tabs" ref={cmpTabsRef}>
                {comparePlans.map((name) => (
                  <button
                    key={name}
                    type="button"
                    className={activeCompare === name ? "active" : ""}
                    onClick={(e) => {
                      setActiveCompare(name);
                      e.currentTarget.scrollIntoView({
                        behavior: "smooth",
                        inline: "center",
                        block: "nearest",
                      });
                    }}
                  >
                    {name}
                  </button>
                ))}
              </div>

              {/* horizontal scroll progress
              <div className="cmp-tabs-progress" aria-hidden="true">
                <span
                  style={{
                    width: `${tabIndicator.width}%`,
                    left: `${tabIndicator.left}%`,
                  }}
                />
              </div> */}
              <p className="cmp-scroll-hint">Swipe to explore other plans →</p>

              <ul key={activeCompare} className="cmp-mobile-list">
                {compareRows.map((row) => {
                  const value = row.values[activeCompareIndex];
                  const included =
                    value !== false && value !== null && value !== undefined;

                  return (
                    <li
                      key={row.feature}
                      className={included ? "" : "cmp-row-off"}
                    >
                      <span className="cmp-mobile-feature">
                        {included && value !== true && (
                          <span className="cmp-inline-value">{value}</span>
                        )}
                        {row.feature}
                      </span>

                      {included ? (
                        <span className="cmp-tick">✓</span>
                      ) : (
                        <span className="cmp-dash">—</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          <div className="lifetime-card">
            <div className="free-price">
              <h3>Enterprise Starts From</h3>
              <div className="price-box">
                <h2>₹60,000</h2>
                <span className="setup-tag">Per Month</span>
              </div>
            </div>
            <div className="lifetime-card-btn">
              <ul>
                <li>
                  ✓ Suitable for clinics/hospitals with an Ad spend of minimum
                  40,000/Month.
                </li>
                <li>
                  ✓ Pricing is customized based on your specific needs, features
                  required, scale of operations, and level of support.
                </li>
              </ul>
            </div>
          </div>

          <DigitalVisibilityPlan />
          {/* 
          <div className="div-btn-book-demo">
            <button className="btn-book-demo" onClick={() => setOpen(true)}>
              Book A Demo
            </button>
          </div> */}

          {/* ADD-ONS */}
          <div className="addons-section">
            <div className="pricing-note">
              <p>
                <b>Note:</b> All plans are exclusive of GST and any paid
                advertising budget.
              </p>
              <p>
                <b>Caution:</b> Each plan is a strategically designed healthcare
                growth framework. Select the plan that aligns with your goals,
                as the right choice directly influences your growth trajectory.
              </p>
            </div>
          </div>
        </div>

        <Contactmodal open={open} handleClose={() => setOpen(false)} />

        <Register
          open={paymentopen}
          onClose={() => setPaymentOpen(false)}
          selectedPlan={selectedPlan}
          defaultBillingCycle={billingCycle}
        />
      </section>

      <Footer />
    </>
  );
};

export default Pricing;
