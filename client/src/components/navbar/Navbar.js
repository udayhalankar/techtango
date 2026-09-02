import React from "react";
import "./navbar.scss";
import Image from "./ttlogo.png";

import {
  BsSearch,
  BsBell,
  BsPersonCircle,
  BsX,
} from "react-icons/bs";

import { AiFillSetting } from "react-icons/ai";
import { Link, useLocation, useNavigate } from "react-router-dom";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const firstname = localStorage.getItem("firstname");
  const lastname = localStorage.getItem("lastname");
  const picture = localStorage.getItem("picture");
  const token = localStorage.getItem("token");

  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  const searchWrapperRef = React.useRef(null);
  const searchInputRef = React.useRef(null);

  let tokenFirst = "";
  let tokenLast = "";

  try {
    if (token && token.includes(".")) {
      const payload = JSON.parse(
        atob(token.split(".")[1] || "")
      );

      tokenFirst =
        payload?.first_name ||
        payload?.firstname ||
        "";

      tokenLast =
        payload?.last_name ||
        payload?.lastname ||
        "";
    }
  } catch {}

  const displayName =
    [firstname, lastname].filter(Boolean).join(" ") ||
    firstname ||
    localStorage.getItem("name") ||
    [tokenFirst, tokenLast].filter(Boolean).join(" ");

  // ---------------------------------------------------------------------------
  // EXPERIENCE BUILDER
  // ---------------------------------------------------------------------------

  const isExperiencePageMode = React.useMemo(() => {
    if (location.pathname !== "/experiencebuilder") {
      return false;
    }

    const params = new URLSearchParams(
      location.search || ""
    );

    return Boolean(params.get("page"));
  }, [location.pathname, location.search]);

  const currentExperiencePageUrl = React.useMemo(() => {
    if (location.pathname !== "/experiencebuilder") {
      return null;
    }

    const params = new URLSearchParams(
      location.search || ""
    );

    const pageId = params.get("page");

    if (!pageId) return null;

    return `${window.location.origin}${location.pathname}?page=${encodeURIComponent(
      pageId
    )}&preview=1`;
  }, [location.pathname, location.search]);

  const handleExperienceAction =
    (label) => (event) => {
      event.preventDefault();

      if (
        label === "View Page" &&
        currentExperiencePageUrl
      ) {
        window.dispatchEvent(
          new CustomEvent(
            "experiencebuilder:prepare-preview",
            {
              detail: {
                pageId: new URLSearchParams(
                  location.search || ""
                ).get("page"),
              },
            }
          )
        );

        window.open(
          currentExperiencePageUrl,
          "_blank",
          "noopener,noreferrer"
        );

        return;
      }

      if (label === "Save") {
        window.dispatchEvent(
          new CustomEvent(
            "experiencebuilder:save-page"
          )
        );

        return;
      }

      if (label === "Publish Page") {
        window.dispatchEvent(
          new CustomEvent(
            "experiencebuilder:publish-page"
          )
        );

        return;
      }

      console.log(
        `[experiencebuilder] ${label} clicked`
      );
    };

  // ---------------------------------------------------------------------------
  // SEARCH
  // ---------------------------------------------------------------------------

  const toggleSearch = () => {
    setSearchOpen((prev) => {
      const next = !prev;

      if (!next) {
        setSearchQuery("");
      }

      return next;
    });
  };

  React.useEffect(() => {
    if (searchOpen) {
      window.setTimeout(() => {
        searchInputRef.current?.focus();
      }, 120);
    }
  }, [searchOpen]);

  // close search when clicking outside
  React.useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        searchWrapperRef.current &&
        !searchWrapperRef.current.contains(
          event.target
        )
      ) {
        setSearchOpen(false);
        setSearchQuery("");
      }
    };

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  const handleSearchSubmit = (event) => {
    event.preventDefault();

    const value = searchQuery.trim();

    if (!value) return;

    /*
      GLOBAL SEARCH ROUTE

      This assumes /search will be your global search page.

      Example:
      /search?q=invoice

      Later we can wire this to search:
      - applications
      - forms
      - workflows
      - documents
      - RMS
    */

    navigate(
      `/search?q=${encodeURIComponent(value)}`
    );

    setSearchOpen(false);
  };

  const clearSearch = () => {
    setSearchQuery("");
    searchInputRef.current?.focus();
  };

  return (
    <div className="app-navbar">
      {/* =============================================================== */}
      {/* LOGO */}
      {/* =============================================================== */}

      <div className="logo">
        <Link to="/">
          <span className="logo-image-wrap">
            <img src={Image} alt="AUGMIS" className="logo-img" />
          </span>
          <span className="logo-tagline">AI AUGMENTED INFORMATION SYSTEMS</span>
        </Link>
      </div>

      {/* =============================================================== */}
      {/* MAIN NAVIGATION */}
      {/* =============================================================== */}

      <nav className="nav-menu">
        <Link
          to="/workflowassignments"
          className="nav-link"
        >
          Assignments
        </Link>

        <Link
          to="/forms"
          className="nav-link"
        >
          Forms
        </Link>

        <Link
          to="/businessautomation"
          className="nav-link"
        >
          Business Automation
        </Link>

        <Link
          to="/rms"
          className="nav-link"
        >
          RMS
        </Link>
      </nav>

      {/* =============================================================== */}
      {/* EXPERIENCE BUILDER ACTIONS */}
      {/* =============================================================== */}

      {isExperiencePageMode && (
        <div
          className="experience-actions"
          aria-label="Experience page actions"
        >
          <ButtonLike
            onClick={handleExperienceAction(
              "View Page"
            )}
          >
            View Page
          </ButtonLike>

          <ButtonLike
            onClick={handleExperienceAction(
              "Save"
            )}
          >
            Save
          </ButtonLike>

          <ButtonLike
            onClick={handleExperienceAction(
              "Publish Page"
            )}
          >
            Publish Page
          </ButtonLike>
        </div>
      )}

      {/* =============================================================== */}
      {/* RIGHT SIDE */}
      {/* =============================================================== */}

      <div className="icons">
        {/* EXPANDING SEARCH */}

        <div
          ref={searchWrapperRef}
          className={`navbar-search ${
            searchOpen ? "open" : ""
          }`}
        >
          <form
            onSubmit={handleSearchSubmit}
            className="navbar-search-form"
          >
            <div className="navbar-search-input-wrapper">
              <BsSearch className="search-inside-icon" />

              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) =>
                  setSearchQuery(e.target.value)
                }
                placeholder="Search AUGMIS..."
                aria-label="Search AUGMIS"
              />

              {searchQuery && (
                <button
                  type="button"
                  className="search-clear-button"
                  onClick={clearSearch}
                  aria-label="Clear search"
                >
                  <BsX />
                </button>
              )}
            </div>
          </form>

          <button
            type="button"
            className="navbar-icon-button search-trigger"
            onClick={toggleSearch}
            aria-label={
              searchOpen
                ? "Close search"
                : "Open search"
            }
            title="Search"
          >
            <BsSearch />
          </button>
        </div>

        {/* NOTIFICATION */}

        <button
          type="button"
          className="navbar-icon-button notification"
          aria-label="Notifications"
          title="Notifications"
        >
          <BsBell />
        </button>

        {/* SETTINGS */}

        <button
          type="button"
          className="navbar-icon-button"
          aria-label="Settings"
          title="Settings"
        >
          <AiFillSetting />
        </button>

        {/* EXISTING USER PICTURE */}

        {picture && (
          <div className="user-info">
            <img
              src={picture}
              alt="Profile"
              className="avatar"
            />
          </div>
        )}

        {/* USER ICON */}

        <div
          className="nav-user-icon"
          data-name={displayName || ""}
          aria-label={
            displayName
              ? `Logged in as ${displayName}`
              : "User"
          }
        >
          <BsPersonCircle />
        </div>

        {/* LOGOUT */}

        <Link
          to="/logout"
          className="logout-link"
        >
          Logout
        </Link>
      </div>
    </div>
  );
};

function ButtonLike({
  children,
  onClick,
}) {
  return (
    <button
      type="button"
      className="experience-action-btn"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default Navbar;
