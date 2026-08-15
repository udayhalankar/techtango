import React from 'react';
import "./navbar.scss";
import Image from './ttlogo.png';
import { BsSearch, BsLifePreserver, BsBoxes, BsBell, BsPersonCircle } from "react-icons/bs";
import { AiFillSetting } from "react-icons/ai";
import { Link, useLocation } from 'react-router-dom';

const Navbar = () => {
  const location = useLocation();
  const firstname = localStorage.getItem("firstname");
  const lastname = localStorage.getItem("lastname");
  const picture = localStorage.getItem("picture");
  const token = localStorage.getItem("token");
  let tokenFirst = "";
  let tokenLast = "";
  try {
    if (token && token.includes(".")) {
      const payload = JSON.parse(atob(token.split(".")[1] || ""));
      tokenFirst = payload?.first_name || payload?.firstname || "";
      tokenLast = payload?.last_name || payload?.lastname || "";
    }
  } catch {}
  const displayName =
    [firstname, lastname].filter(Boolean).join(" ") ||
    firstname ||
    localStorage.getItem("name") ||
    [tokenFirst, tokenLast].filter(Boolean).join(" ");

  const isExperiencePageMode = React.useMemo(() => {
    if (location.pathname !== "/experiencebuilder") return false;
    const params = new URLSearchParams(location.search || "");
    return Boolean(params.get("page"));
  }, [location.pathname, location.search]);

  const currentExperiencePageUrl = React.useMemo(() => {
    if (location.pathname !== "/experiencebuilder") return null;
    const params = new URLSearchParams(location.search || "");
    const pageId = params.get("page");
    if (!pageId) return null;
    return `${window.location.origin}${location.pathname}?page=${encodeURIComponent(pageId)}&preview=1`;
  }, [location.pathname, location.search]);

  const handleExperienceAction = (label) => (event) => {
    event.preventDefault();
    if (label === "View Page" && currentExperiencePageUrl) {
      window.dispatchEvent(
        new CustomEvent("experiencebuilder:prepare-preview", {
          detail: { pageId: new URLSearchParams(location.search || "").get("page") },
        })
      );
      window.open(currentExperiencePageUrl, "_blank", "noopener,noreferrer");
      return;
    }
    if (label === "Save") {
      window.dispatchEvent(new CustomEvent("experiencebuilder:save-page"));
      return;
    }
    if (label === "Publish Page") {
      window.dispatchEvent(new CustomEvent("experiencebuilder:publish-page"));
      return;
    }
    console.log(`[experiencebuilder] ${label} clicked`);
  };

  return (
    <div className="app-navbar">
      <div className="logo">
        <Link to="/">
          <img src={Image} alt="logo" className="logo-img" />
        </Link>
      </div>

      <nav className="nav-menu">
        <Link to="/workflowassignments" className="nav-link">Assignments</Link>
        <Link to="/forms" className="nav-link">Forms</Link>
        <Link to="/businessautomation" className="nav-link">Business Automation</Link>
        <Link to="/rms" className="nav-link">RMS</Link>
      </nav>

      {isExperiencePageMode && (
        <div className="experience-actions" aria-label="Experience page actions">
          <ButtonLike onClick={handleExperienceAction("View Page")}>View Page</ButtonLike>
          <ButtonLike onClick={handleExperienceAction("Save")}>Save</ButtonLike>
          <ButtonLike onClick={handleExperienceAction("Publish Page")}>Publish Page</ButtonLike>
        </div>
      )}

      <div className="icons">
        <BsSearch />
        <BsBoxes />
        <BsLifePreserver />

        <div className="notification">
          <BsBell />
        </div>

        <div className="user-info">
          {picture && <img src={picture} alt="Profile" className="avatar" />}
          {firstname && <span className="username">Hi, {firstname}</span>}
        </div>

        <AiFillSetting />

        <div
          className="nav-user-icon"
          data-name={displayName || ''}
          aria-label={displayName ? `Logged in as ${displayName}` : 'User'}
        >
          <BsPersonCircle />
        </div>

        <Link to="/logout" className="logout-link">Logout</Link>
      </div>
    </div>
  );
};

function ButtonLike({ children, onClick }) {
  return (
    <button type="button" className="experience-action-btn" onClick={onClick}>
      {children}
    </button>
  );
}

export default Navbar;
