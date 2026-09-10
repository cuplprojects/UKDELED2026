import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FaHome, FaDownload, FaExternalLinkAlt, FaUser, FaPowerOff } from "react-icons/fa";
import { useAuthStore } from "../stores/authStore";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuthStore();

  const isHome = location.pathname === "/" || location.pathname === "/application";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const userName = user?.fullName || user?.name || user?.candidateName || "";

  return (
    <nav className="bg-blue-600 px-4 sm:px-8 py-2 flex items-center justify-between gap-4 text-white text-sm md:text-base font-bold w-full select-none shadow-xs">
      {/* Left Side: HOME, INFORMATION BROCHURE, UBSE WEBSITE */}
      <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
        <button
          onClick={() => navigate(isAuthenticated ? "/application" : "/")}
          className={`flex items-center gap-2 px-3.5 py-1.5 hover:bg-blue-700 transition whitespace-nowrap cursor-pointer rounded-xs ${isHome ? "bg-blue-700" : ""}`}
        >
          <FaHome className="w-4 h-4 text-white" />
          <span>HOME</span>
        </button>
        <div className="w-px h-5 bg-white/30"></div>
        <a
          href={`${import.meta.env.VITE_API_URL || ""}/api/ImpDocument/brochure`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-3.5 py-1.5 hover:bg-blue-700 transition whitespace-nowrap rounded-xs"
        >
          <FaDownload className="w-4 h-4 text-white" />
          <span>INFORMATION BROCHURE</span>
        </a>
        <div className="w-px h-5 bg-white/30"></div>
        <a
          href="https://ubse.uk.gov.in"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-3.5 py-1.5 hover:bg-blue-700 transition whitespace-nowrap rounded-xs"
        >
          <FaExternalLinkAlt className="w-3.5 h-3.5 text-white" />
          <span>UBSE WEBSITE</span>
        </a>
      </div>

      {/* Right Side: Welcome User & Log Out */}
      {isAuthenticated && (
        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-2 text-white">
            <FaUser className="w-4 h-4 text-white" />
            <span className="hidden sm:inline">Welcome</span>
            <span className="font-extrabold uppercase tracking-wide">{userName || "APPLICANT"}</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 transition text-white rounded-xs cursor-pointer font-bold"
          >
            <FaPowerOff className="w-4 h-4 text-white" />
            <span>Log Out</span>
          </button>
        </div>
      )}
    </nav>
  );
}

