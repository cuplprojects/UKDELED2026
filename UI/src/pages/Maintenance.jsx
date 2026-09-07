import React, { useState } from "react";
import axios from "axios";

const Maintenance = () => {
  const [checking, setChecking] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const API_BASE_URL = import.meta.env.VITE_API_URL || "";

  const handleRetry = async () => {
    setChecking(true);
    setStatusMessage("");
    try {
      // Send a quick ping to a public/unprotected route, e.g., timelines or count or even a simple ping
      // We use raw axios here to avoid triggering the global interceptor's redirect loop
      await axios.get(`${API_BASE_URL}/api/RegistrationTimeline`, { timeout: 3000 });
      setStatusMessage("Connection restored! Redirecting...");
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    } catch (err) {
      setStatusMessage("Server is still unreachable. Please try again later.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center px-2 sm:px-3 md:px-4 py-6 sm:py-8 md:py-10 relative overflow-hidden font-sans">
      {/* Decorative blurred background circles */}
      <div className="absolute top-1/4 left-1/4 w-64 sm:w-80 md:w-96 h-64 sm:h-80 md:h-96 bg-amber-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-64 sm:w-80 md:w-96 h-64 sm:h-80 md:h-96 bg-blue-500/10 rounded-full blur-3xl"></div>

      <div className="max-w-sm w-full text-center z-10 space-y-6 sm:space-y-8">
        {/* Animated Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-20 sm:w-24 md:w-24 h-20 sm:h-24 md:h-24 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/30 animate-pulse">
              <svg
                className="w-10 sm:w-12 md:w-12 h-10 sm:h-12 md:h-12 text-amber-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            {/* Pulsing outer ring */}
            <div className="absolute inset-0 rounded-2xl border-2 border-amber-500/20 scale-110 animate-ping opacity-75"></div>
          </div>
        </div>

        {/* Text Content */}
        <div className="space-y-2 sm:space-y-3">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent">
            System Maintenance
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm md:text-base font-medium leading-relaxed px-2">
            Our servers are currently undergoing scheduled maintenance or are temporarily unreachable. We will be back online shortly.
          </p>
        </div>

        {/* Retry Actions */}
        <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-4 sm:p-5 md:p-6 border border-slate-800 space-y-3 sm:space-y-4">
          <button
            onClick={handleRetry}
            disabled={checking}
            className={`w-full py-2.5 sm:py-3 md:py-3 px-3 sm:px-4 md:px-4 rounded-xl font-bold text-xs sm:text-sm md:text-base tracking-wide transition shadow-lg flex items-center justify-center gap-2 ${
              checking
                ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                : "bg-amber-500 hover:bg-amber-600 text-slate-950 hover:shadow-amber-500/10"
            }`}
          >
            {checking ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-4 sm:h-5 w-4 sm:w-5 text-slate-500"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Checking Status...
              </>
            ) : (
              "Check Connection Again"
            )}
          </button>

          {statusMessage && (
            <p
              className={`text-xs sm:text-xs font-bold transition-all duration-300 ${
                statusMessage.includes("restored") ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {statusMessage}
            </p>
          )}
        </div>

        {/* Footer info */}
        <p className="text-xs sm:text-xs text-slate-600 font-medium">
          Uttarakhand Board of School Education &bull; DELED 2026
        </p>
      </div>
    </div>
  );
};

export default Maintenance;
