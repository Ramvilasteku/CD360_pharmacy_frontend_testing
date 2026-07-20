import React, { useState, useEffect } from "react";

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

const Pricing = () => {
  const [open, setOpen] = useState(false);
  const [subscriptions, setSubscriptions] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentopen, setPaymentOpen] = useState(false);

  const [openFeature, setOpenFeature] = useState(null);

  const toggleFeatures = (plan) => {
    setOpenFeature(openFeature === plan ? null : plan);
  };

  const plans = [
    {
      name: "Growth",
      quarterly: "₹10,000 x 3",
      annual: "₹8,333 x 12",
      planId: "Growth",
      features: [
        "Website and Practice Management Software.",
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
      features: [
        "Website and Practice Management Software.",
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
      name: "Legacy",
      quarterly: "₹45,000 x 3",
      annual: "₹37,500 x 12",
      planId: "Legacy",
      features: [
        "Website and Practice Management Software.",
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
    {
      name: "Scale Advantage",
      quarterly: "₹20,000 x 3",
      annual: "₹16,666 x 12",
      planId: "Scale Advantage",
      features: [
        "Website and Practice Management Software.",
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
      features: [
        "Website and Practice Management Software.",
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
  ];

  const basicPlans = plans.slice(0, 5);

  const advancedPlans = plans.slice(3, 5);

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

  const getSelectedPlan = (name) => {
    const plan = subscriptions.find((p) => p.plan_name === name);

    if (!plan) return null;
    return {
      id: plan.id,
      name: plan.plan_name,

      monthlyPrice: Number(plan.quarterly_price) / 3,
      quarterlyPrice: Number(plan.quarterly_price),
      yearlyPrice: Number(plan.yearly_price),

      quarterly: `₹${(Number(plan.quarterly_price) / 3).toLocaleString("en-IN")} × 3`,
      annual: `₹${(Number(plan.yearly_price) / 10).toLocaleString("en-IN")} × 10`,
    };
  };

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

          {/* Trial Plan */}

          <div className="lifetime-card">
            <div className="free-price">
              <h3>Trail Plan</h3>
              <div className="price-box">
                <h2>₹10,000</h2>
                <span className="setup-tag">One Year HMS Free</span>
              </div>
            </div>
            <div className="lifetime-card-btn">
              <ul>
                <li> Custom Advanced Website</li>
                <li>
                  Practice Management Software –{" "}
                  <b style={{ color: "#46db14" }}>FREE</b>
                </li>
              </ul>
              <Box className="btn-div">
                <button
                  onClick={() => {
                    setSelectedPlan(getSelectedPlan());
                    setPaymentOpen(true);
                  }}
                  className="lifetime-plan-btn"
                >
                  Get Started
                </button>
              </Box>
            </div>
          </div>

          {/* Liftime */}

          <div className="lifetime-card life-time">
            <div className="free-price">
              <h3>Lifetime Plan</h3>
              <div className="price-box">
                <h2>₹10,000</h2>
                <span className="setup-tag">
                  Offer Valid First 1,000 Clinics/Hospitals
                  {/* Limited to First 1000 Clinics / Hospitals */}
                </span>
              </div>
            </div>
            <div className="lifetime-card-btn">
              <ul>
                <li> Lifetime Practice Management Software (10yrs)</li>
                <li> No Monthly Subscription </li>
              </ul>

              <Box className="btn-div">
                <button
                  onClick={() => {
                    setSelectedPlan(getSelectedPlan());
                    setPaymentOpen(true);
                  }}
                  className="lifetime-plan-btn"
                >
                  Get Started
                </button>
              </Box>
            </div>
          </div>

          {/* DESKTOP */}
          <div className="plans-desktop">
            {basicPlans.map((plan) => (
              <div className="plan-card" key={plan.name}>
                <div className="plan-header">
                  {plan.bestSeller && (
                    <div className="corner-ribbon">
                      <span>BEST SELLER</span>
                    </div>
                  )}

                  <h3>{plan.name}</h3>

                  <h2>{plan.quarterly}</h2>
                  <p>(Quarterly)</p>

                  <hr />

                  <h2>{plan.annual}</h2>
                  <p>(Annually)</p>
                </div>

                <ul className="plan-features">
                  {plan.features.map((feature, index) => (
                    <li key={index}>{feature}</li>
                  ))}
                </ul>

                <Box className="btn-box">
                  <button
                    onClick={() => {
                      setSelectedPlan(getSelectedPlan(plan.planId));
                      setPaymentOpen(true);
                    }}
                    className="plan-btn"
                  >
                    Get Started
                  </button>{" "}
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
                  onClick={() => {
                    setSelectedPlan(getSelectedPlan(plan.planId));
                    setPaymentOpen(true);
                  }}
                >
                  GET STARTED
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

          <div className="lifetime-card">
            <div className="free-price">
              <h3>Enterprise Starts From</h3>
              <div className="price-box">
                <h2>₹1,00,000</h2>
                <span className="setup-tag">Per Month</span>
              </div>
            </div>
            <div className="lifetime-card-btn">
              <ul>
                <li>
                  Suitable for clinics/hospitals with an Ad spend of minimum 1
                  lakh/Month.
                </li>
                <li>
                  Pricing is customized based on your specific needs, features
                  required, scale of operations, and level of support.
                </li>
              </ul>
            </div>
          </div>

          <DigitalVisibilityPlan />

          <div className="div-btn-book-demo">
            <button className="btn-book-demo" onClick={() => setOpen(true)}>
              Book A Demo
            </button>
          </div>

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
        />
      </section>

      <Footer />
    </>
  );
};

export default Pricing;
