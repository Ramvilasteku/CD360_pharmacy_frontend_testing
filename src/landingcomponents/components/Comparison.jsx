import React, { useState, useRef, useEffect } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import WestIcon from "@mui/icons-material/West";
import "./Comparison.css";
import Contactmodal from "./Contactmodal";
import Register from "./Register";
import EastIcon from "@mui/icons-material/East";
import DigitalVisibilityPlan from "./DigitalVisibilityPlan";
import Navbar from "./Navbar";

import heroImage from "../Assets/pricehero.png";
import Footer from "./Footer";

const Comparison = () => {
  const [open, setOpen] = useState(false);
  const [subscriptions, setSubscriptions] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentopen, setPaymentOpen] = useState(false);
  const swiperRef = useRef(null);

  const features = [
    {
      animation: "/animations/marketing.json",
      label: "Marketing",
      sectionId: "marketing",
    },
  ];

  const fetchSubscriptionPlans = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_PAYMENT_BACKEND_URL}/api/phonepe/plans`);
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

  const getPlanId = (name) => {
    const id = subscriptions.find((p) => p.plan_name === name)?.id;
    console.log("Plan:", name, "ID:", id);
    return id;
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

          {/* FREEMIUM */}
          <div className="freemium-card">
            <div className="free-price">
              <h3>Freemium</h3>
              <h2>₹10,000</h2>
            </div>
            <ul>
              <li>Custom Advanced Website</li>
              <li>
                Practice Management Software –{" "}
                <b style={{ color: "#46db14" }}>FREE</b>
              </li>
            </ul>
          </div>

          {/* DESKTOP */}
          <div className="plans-desktop">
            <div className="plan-card">
              <div className="plan-header">
                <h3>Growth</h3>

                <h2>₹10,000 x 3</h2>
                <p>(Quarterly)</p>
                <hr />
                <h2>₹8,333 x 12</h2>
                <p>(Annually)</p>
              </div>

              <ul className="plan-features">
                <li>Website and Practice Management Software.</li>

                <li>
                  Social media management and content creation (up to 6 posts
                  and 2 reels per month).
                </li>

                <li>Festive posts.</li>

                <li>
                  GMB optimization, 4 blogs every month, and LinkedIn
                  optimization.
                </li>

                <li>1 UGC influencer support, OOH, and DOOH ad support.</li>

                <li>1 Meta awareness campaign.</li>

                <li>Branding support and reputation management.</li>

                <li>
                  High-quality reels every month covering preventive care,
                  treatment awareness, aftercare guidance, patient education,
                  and patient testimonials.
                </li>

                <li>
                  Multiple patient touchpoints across 6 powerful digital
                  platforms, ensuring patients find and trust you wherever they
                  search.
                </li>
              </ul>

              <button onClick={() => setOpen(true)} className="plan-btn">
                Request Access
              </button>

              <button
                onClick={() => {
                  setSelectedPlan(getPlanId("Growth"));
                  setPaymentOpen(true);
                }}
                className="plan-btn"
              >
                GetStarted
              </button>
            </div>

            <div className="plan-card">
              <div className="plan-header">
                <div className="corner-ribbon">
                  <span>BEST SELLER</span>
                </div>
                <h3>Scale</h3>
                <h2>₹15,000 x 3</h2>
                <p>(Quarterly)</p>
                <hr />
                <h2>₹12,500 X 12</h2>
                <p>(Annually)</p>
              </div>
              <ul className="plan-features">
                <li>Website and Practice Management Software.</li>
                <li>
                  Social media management and content creation (up to 8 posts
                  and 4 reels per month).
                </li>
                <li>Festive posts.</li>
                <li>
                  GMB and LinkedIn optimization, 6 blogs every month, and 2–3
                  LinkedIn articles every month.
                </li>
                <li>2 UGC influencers, OOH, and DOOH ad support.</li>
                <li>Multi Meta awareness campaign.</li>
                <li>2 content shoots and training for your team.</li>
                <li>Up to 3 specialties.</li>
                <li>
                  Priority support, branding support, and reputation management.
                </li>
                <li>
                  High-quality reels every month covering preventive care,
                  treatment awareness, aftercare guidance, patient education,
                  and patient testimonials.
                </li>
                <li>
                  Multiple patient touchpoints across 6 powerful digital
                  platforms, ensuring patients find and trust you wherever they
                  search.
                </li>
              </ul>
              <button onClick={() => setOpen(true)} className="plan-btn">
                Request Access
              </button>
              <button
                onClick={() => {
                  setSelectedPlan(getPlanId("Scale"));
                  setPaymentOpen(true);
                }}
                className="plan-btn"
              >
                GetStarted
              </button>
            </div>

            <div className="plan-card">
              <div className="plan-header">
                <h3>Legacy</h3>
                <h2>₹45,000 x 3</h2>
                <p>(Quarterly)</p>
                <hr />
                <h2>₹37,500 X 12</h2>
                <p>(Annually)</p>
              </div>
              <ul className="plan-features">
                <li>Website and Practice Management Software.</li>
                <li>
                  Social media management and content creation (up to 20 posts
                  and 12 reels per month).
                </li>
                <li>Festive Posts.</li>
                <li>
                  GMB and LinkedIn optimization, 8 blogs every month, and 2–3
                  LinkedIn articles every month.
                </li>
                <li>4 UGC influencers, OOH, and DOOH ad support.</li>
                <li>Multi Meta & Google awareness campaigns.</li>

                <li>4 content shoots and training for your team.</li>

                <li>Multi specialties.</li>
                <li>
                  Priority support, branding support, reputation management,
                  content shoots, and training.
                </li>
                <li>Custom landing pages for the website and ads.</li>
                <li>Dedicated ad specialist.</li>
                <li>3 YouTube videos every month.</li>
                <li>8 blogs every month.</li>
                <li>
                  High-quality reels every month covering preventive care,
                  treatment awareness, aftercare guidance, patient education,
                  and patient testimonials.
                </li>
                <li>
                  Multiple patient touchpoints across 6 powerful digital
                  platforms, ensuring patients find and trust you wherever they
                  search.
                </li>
              </ul>
              <button onClick={() => setOpen(true)} className="plan-btn">
                Request Access
              </button>
              <button
                onClick={() => {
                  setSelectedPlan(getPlanId("Legacy"));
                  setPaymentOpen(true);
                }}
                className="plan-btn"
              >
                GetStarted
              </button>
            </div>
          </div>

          {/* MOBILE — Swiper with custom arrows */}
          <div className="plans-mobile">
            <div className="swiper-container-wrapper">
              {/* CUSTOM LEFT ARROW */}
              <button
                className="custom-arrow custom-arrow-prev"
                onClick={() => swiperRef.current?.slidePrev()}
              >
                <WestIcon />
              </button>

              <Swiper
                modules={[Autoplay]}
                autoplay={{
                  delay: 5000, // 3 seconds per slide
                  disableOnInteraction: false, // keeps autoplaying after user swipes
                }}
                spaceBetween={0}
                slidesPerView={1}
                autoHeight={true}
                loop={true} // infinite loop
                onSwiper={(swiper) => (swiperRef.current = swiper)}
              >
                <SwiperSlide>
                  <div className="plan-card">
                    <div className="plan-header">
                      <h3>Growth</h3>

                      <h2>₹10,000 x 3</h2>
                      <p>(Quarterly)</p>
                      <hr />
                      <h2>₹8,333 x 12</h2>
                      <p>(Annually)</p>
                    </div>

                    <ul className="plan-features">
                      <li>Website and Practice Management Software.</li>

                      <li>
                        Social media management and content creation (up to 6
                        posts and 2 reels per month).
                      </li>

                      <li>Festive posts.</li>

                      <li>
                        GMB optimization, 4 blogs every month, and LinkedIn
                        optimization.
                      </li>

                      <li>
                        1 UGC influencer support, OOH, and DOOH ad support.
                      </li>

                      <li>1 Meta awareness campaign.</li>

                      <li>Branding support and reputation management.</li>

                      <li>
                        High-quality reels every month covering preventive care,
                        treatment awareness, aftercare guidance, patient
                        education, and patient testimonials.
                      </li>

                      <li>
                        Multiple patient touchpoints across 6 powerful digital
                        platforms, ensuring patients find and trust you wherever
                        they search.
                      </li>
                    </ul>

                    <button onClick={() => setOpen(true)} className="plan-btn">
                      Request Access
                    </button>
                    <button
                      onClick={() => {
                        setSelectedPlan(getPlanId("Growth"));
                        setPaymentOpen(true);
                      }}
                      className="plan-btn"
                    >
                      GetStarted
                    </button>
                  </div>
                </SwiperSlide>

                <SwiperSlide>
                  <div className="plan-card">
                    <div className="plan-header">
                      <div className="corner-ribbon">
                        <span>BEST SELLER</span>
                      </div>
                      <h3>Scale</h3>
                      <h2>₹15,000 x 3</h2>
                      <p>(Quarterly)</p>
                      <hr />
                      <h2>₹12,500 X 12</h2>
                      <p>(Annually)</p>
                    </div>
                    <ul className="plan-features">
                      <li>Website and Practice Management Software.</li>
                      <li>
                        Social media management and content creation (up to 8
                        posts and 4 reels per month).
                      </li>
                      <li>Festive posts.</li>
                      <li>
                        GMB and LinkedIn optimization, 6 blogs every month, and
                        2–3 LinkedIn articles every month.
                      </li>
                      <li>2 UGC influencers, OOH, and DOOH ad support.</li>
                      <li>Multi Meta awareness campaign.</li>
                      <li>2 content shoots and training for your team.</li>
                      <li>Up to 3 specialties.</li>
                      <li>
                        Priority support, branding support, and reputation
                        management.
                      </li>
                      <li>
                        High-quality reels every month covering preventive care,
                        treatment awareness, aftercare guidance, patient
                        education, and patient testimonials.
                      </li>
                      <li>
                        Multiple patient touchpoints across 6 powerful digital
                        platforms, ensuring patients find and trust you wherever
                        they search.
                      </li>
                    </ul>
                    <button onClick={() => setOpen(true)} className="plan-btn">
                      Request Access
                    </button>
                    <button
                      onClick={() => {
                        setSelectedPlan(getPlanId("Scale"));
                        setPaymentOpen(true);
                      }}
                      className="plan-btn"
                    >
                      GetStarted
                    </button>
                  </div>
                </SwiperSlide>

                <SwiperSlide>
                  <div className="plan-card">
                    <div className="plan-header">
                      <h3>Legacy</h3>
                      <h2>₹45,000 x 3</h2>
                      <p>(Quarterly)</p>
                      <hr />
                      <h2>₹37,500 X 12</h2>
                      <p>(Annually)</p>
                    </div>
                    <ul className="plan-features">
                      <li>Website and Practice Management Software.</li>
                      <li>
                        Social media management and content creation (up to 20
                        posts and 12 reels per month).
                      </li>
                      <li>Festive Posts.</li>
                      <li>
                        GMB and LinkedIn optimization, 8 blogs every month, and
                        2–3 LinkedIn articles every month.
                      </li>
                      <li>4 UGC influencers, OOH, and DOOH ad support.</li>
                      <li>Multi Meta & Google awareness campaigns.</li>

                      <li>4 content shoots and training for your team.</li>

                      <li>Multi specialties.</li>
                      <li>
                        Priority support, branding support, reputation
                        management, content shoots, and training.
                      </li>
                      <li>Custom landing pages for the website and ads.</li>
                      <li>Dedicated ad specialist.</li>
                      <li>3 YouTube videos every month.</li>
                      <li>8 blogs every month.</li>
                      <li>
                        High-quality reels every month covering preventive care,
                        treatment awareness, aftercare guidance, patient
                        education, and patient testimonials.
                      </li>
                      <li>
                        Multiple patient touchpoints across 6 powerful digital
                        platforms, ensuring patients find and trust you wherever
                        they search.
                      </li>
                    </ul>
                    <button onClick={() => setOpen(true)} className="plan-btn">
                      Request Access
                    </button>
                    <button
                      onClick={() => {
                        setSelectedPlan(getPlanId("Legacy"));
                        setPaymentOpen(true);
                      }}
                      className="plan-btn"
                    >
                      GetStarted
                    </button>
                  </div>
                </SwiperSlide>

                <SwiperSlide>
                  <div className="plan-card">
                    <div className="plan-header">
                      <h3>Scale Advantage</h3>

                      <h2>₹20,000 x 3</h2>
                      <p>(Quarterly)</p>

                      <hr />
                      <h2>₹16,666 x 12</h2>
                      <p>(Annually)</p>
                    </div>

                    <ul className="plan-features">
                      <li>Website and Practice Management Software.</li>
                      <li>
                        Social media management and content creation (up to 8
                        posts and 6 reels per month).
                      </li>
                      <li>Festive posts.</li>
                      <li>
                        GMB and LinkedIn optimization, 6 blogs every month, and
                        2–3 LinkedIn articles every month.
                      </li>
                      <li>2 UGC influencers, OOH, and DOOH ad support.</li>
                      <li>Multi Meta awareness campaign.</li>
                      <li>2 content shoots and training for your team.</li>
                      <li>Up to 3 specialties.</li>
                      <li>50,000 Reach Assured</li>

                      <li>
                        Priority support, branding support, and reputation
                        management.
                      </li>
                      <li>
                        High-quality reels every month covering preventive care,
                        treatment awareness, aftercare guidance, patient
                        education, and patient testimonials.
                      </li>
                      <li>
                        Multiple patient touchpoints across 6 powerful digital
                        platforms, ensuring patients find and trust you wherever
                        they search.
                      </li>
                    </ul>

                    <button onClick={() => setOpen(true)} className="plan-btn">
                      Request Access
                    </button>
                    <button
                      onClick={() => {
                        setSelectedPlan(getPlanId("Scale Advantage"));
                        setPaymentOpen(true);
                      }}
                      className="plan-btn"
                    >
                      GetStarted
                    </button>
                  </div>
                </SwiperSlide>

                <SwiperSlide>
                  <div className="plan-card">
                    <div className="plan-header">
                      <h3>Scale Advantage Plus</h3>

                      <h2>₹30,000 x 3</h2>
                      <p>(Quarterly)</p>

                      <hr />
                      <h2>₹25,000 x 12</h2>
                      <p>(Annually)</p>
                    </div>
                    <ul className="plan-features">
                      <li>Website and Practice Management Software.</li>
                      <li>
                        Social media management and content creation (up to 10
                        posts and 8 reels per month).
                      </li>
                      <li>Festive posts.</li>
                      <li>
                        GMB and LinkedIn optimization, 6 blogs every month, and
                        2–3 LinkedIn articles every month.
                      </li>
                      <li>2 UGC influencers, OOH, and DOOH ad support.</li>
                      <li>Multi Meta awareness campaign.</li>
                      <li>2 content shoots and training for your team.</li>
                      <li>Up to 3 specialties.</li>
                      <li>1,00,000+ Reach Assured</li>
                      <li>Upto 10 Blogs per month.</li>

                      <li>
                        Priority support, branding support, and reputation
                        management.
                      </li>
                      <li>
                        High-quality reels every month covering preventive care,
                        treatment awareness, aftercare guidance, patient
                        education, and patient testimonials.
                      </li>
                      <li>
                        Multiple patient touchpoints across 6 powerful digital
                        platforms, ensuring patients find and trust you wherever
                        they search.
                      </li>
                    </ul>

                    <button onClick={() => setOpen(true)} className="plan-btn">
                      Request Access
                    </button>
                    <button
                      onClick={() => {
                        setSelectedPlan(getPlanId("Scale Advantage Plus"));
                        setPaymentOpen(true);
                      }}
                      className="plan-btn"
                    >
                      GetStarted
                    </button>
                  </div>
                </SwiperSlide>
              </Swiper>

              {/* CUSTOM RIGHT ARROW */}
              <button
                className="custom-arrow custom-arrow-next"
                onClick={() => swiperRef.current?.slideNext()}
              >
                <EastIcon />
              </button>
            </div>
          </div>

          {/* ADVANCED PLANS */}

          <div className="advanced-plans">
            <div className="plan-card">
              <div className="plan-header">
                <h3>Scale Advantage</h3>

                <h2>₹20,000 x 3</h2>
                <p>(Quarterly)</p>

                <hr />
                <h2>₹16,666 x 12</h2>
                <p>(Annually)</p>
              </div>

              <ul className="plan-features">
                <li>Website and Practice Management Software.</li>
                <li>
                  Social media management and content creation (up to 8 posts
                  and 6 reels per month).
                </li>
                <li>Festive posts.</li>
                <li>
                  GMB and LinkedIn optimization, 6 blogs every month, and 2–3
                  LinkedIn articles every month.
                </li>
                <li>2 UGC influencers, OOH, and DOOH ad support.</li>
                <li>Multi Meta awareness campaign.</li>
                <li>2 content shoots and training for your team.</li>
                <li>Up to 3 specialties.</li>
                <li>50,000 Reach Assured</li>

                <li>
                  Priority support, branding support, and reputation management.
                </li>
                <li>
                  High-quality reels every month covering preventive care,
                  treatment awareness, aftercare guidance, patient education,
                  and patient testimonials.
                </li>
                <li>
                  Multiple patient touchpoints across 6 powerful digital
                  platforms, ensuring patients find and trust you wherever they
                  search.
                </li>
              </ul>

              <button onClick={() => setOpen(true)} className="plan-btn">
                Request Access
              </button>
              <button
                onClick={() => {
                  setSelectedPlan(getPlanId("Scale Advantage"));
                  setPaymentOpen(true);
                }}
                className="plan-btn"
              >
                GetStarted
              </button>
            </div>

            <div className="plan-card">
              <div className="plan-header">
                <h3>Scale Advantage Plus</h3>

                <h2>₹30,000 x 3</h2>
                <p>(Quarterly)</p>

                <hr />
                <h2>₹25,000 x 12</h2>
                <p>(Annually)</p>
              </div>
              <ul className="plan-features">
                <li>Website and Practice Management Software.</li>
                <li>
                  Social media management and content creation (up to 10 posts
                  and 8 reels per month).
                </li>
                <li>Festive posts.</li>
                <li>
                  GMB and LinkedIn optimization, 6 blogs every month, and 2–3
                  LinkedIn articles every month.
                </li>
                <li>2 UGC influencers, OOH, and DOOH ad support.</li>
                <li>Multi Meta awareness campaign.</li>
                <li>2 content shoots and training for your team.</li>
                <li>Up to 3 specialties.</li>
                <li>1,00,000+ Reach Assured</li>
                <li>Upto 10 Blogs per month.</li>

                <li>
                  Priority support, branding support, and reputation management.
                </li>
                <li>
                  High-quality reels every month covering preventive care,
                  treatment awareness, aftercare guidance, patient education,
                  and patient testimonials.
                </li>
                <li>
                  Multiple patient touchpoints across 6 powerful digital
                  platforms, ensuring patients find and trust you wherever they
                  search.
                </li>
              </ul>

              <button onClick={() => setOpen(true)} className="plan-btn">
                Request Access
              </button>
              <button
                onClick={() => {
                  setSelectedPlan(getPlanId("Scale Advantage Plus"));
                  setPaymentOpen(true);
                }}
                className="plan-btn"
              >
                GetStarted
              </button>
            </div>
          </div>

          <div className="plan-card-dvp-price-layout">
            <div className="dvp-price-card">
              <h3 className="dvp-price-heading">Enterprise Starts From</h3>
              <h1 className="dvp-price-amount">
                ₹1,00,000<span> Per Month</span>
              </h1>
            </div>

            <div className="dvp-price-description">
              <p>
                <ul>
                  <li>
                    Suitable for clinics/hospitals with an Ad spend of minimum 1
                    lakh/Month.
                  </li>
                  <li>
                    Pricing is customized based on your specific needs, features
                    required, scale of operations, and level of support.
                  </li>
                  {/* <li>Upto 15 Blogs per month.</li> */}
                </ul>
              </p>
            </div>
          </div>

          <DigitalVisibilityPlan />

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
        <Register open={paymentopen} onClose={() => setPaymentOpen(false)} plan={selectedPlan} />
      </section>

      <Footer />
    </>
  );
};

export default Comparison;
