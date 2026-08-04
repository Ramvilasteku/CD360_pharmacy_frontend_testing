import React, { useState, useEffect } from "react";
import { HashLink } from "react-router-hash-link";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import "./Navbar.css";
import Contactmodal from "./Contactmodal";
import logo from "../Assets/caredesk360.png";
import nameLogo from "../Assets/caredesk360newlogo.jpeg";

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [open, setOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);

    window.addEventListener("scroll", handleScroll);

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className={`navbar ${scrolled ? "scrolled" : ""}`}>
      <div className="container navbar-inner">
        {/* Logo */}
        <HashLink smooth to="/#" className="navbar-logo">
          <div className="logo-icon">

            {/* <span className="logo-text">CareDesk</span> */}
            <img
              src={nameLogo}
              alt="logo"
              style={{ width: "160%", height: "60px" }}
            />
          </div>
        </HashLink>

        {/* Navigation */}
        <ul className={`navbar-links ${mobileOpen ? "open" : ""}`}>
          <li>
            <HashLink smooth to="/#" onClick={() => setMobileOpen(false)}>
              Home
            </HashLink>
          </li>

          <li>
            <HashLink
              smooth
              to="/#features"
              onClick={() => setMobileOpen(false)}
            >
              Features
            </HashLink>
          </li>

          <li>
          <NavLink
              to="/aboutus"
              onClick={() => {
                setMobileOpen(false);

                window.scrollTo(0, 0);
              }}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              About
            </NavLink>
          </li>

          <li>
            <NavLink
              to="/pricing"
              onClick={() => {
                setMobileOpen(false);

                window.scrollTo(0, 0);
              }}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              Pricing
            </NavLink>
          </li>

          <li>
            <NavLink
              to="/whyus"
              onClick={() => {
                setMobileOpen(false);
                window.scrollTo(0, 0);
              }}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
                 Why Us
            </NavLink>
          </li>

          {/* Mobile Buttons */}
          <li className="mobile-buttons">
            <button onClick={() => setOpen(true)} className="btn-primary full">
              Book A Demo
            </button>

            <button
              onClick={() => navigate("/login")}
              className="btn-outline full"
            >
              Login
            </button>
          </li>
        </ul>

        {/* Desktop Buttons */}
        <div className="navbar-actions">
          <button onClick={() => setOpen(true)} className="btn-primary">
            Book A Demo
          </button>
        </div>

        <div className="navbar-actions">
          <button onClick={() => navigate("/login")} className="btn-outline">
            Login
          </button>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className={`mobile-toggle ${mobileOpen ? "active" : ""}`}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      <Contactmodal open={open} handleClose={() => setOpen(false)} />
    </nav>
  );
};

export default Navbar;
