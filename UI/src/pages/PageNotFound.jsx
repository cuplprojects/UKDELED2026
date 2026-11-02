import React from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";

export default function PageNotFound() {
  return (
    <Layout>
      <div className="flex-1 bg-white flex flex-col items-center justify-center py-16 px-4 sm:px-6 font-sans">
        <div className="max-w-md w-full flex flex-col items-center text-center space-y-6">

          {/* 404 Illustration matching design */}
          <div className="w-64 h-52 sm:w-72 sm:h-60 relative flex items-center justify-center">
            <svg
              viewBox="0 0 240 180"
              className="w-full h-full select-none"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Ground Shadow */}
              <ellipse
                cx="88"
                cy="158"
                rx="42"
                ry="4"
                fill="#e2e8f0"
                opacity="0.8"
              />

              {/* Action Sparks / Dashes Top-Left */}
              <line
                x1="46"
                y1="56"
                x2="38"
                y2="50"
                stroke="#38bdf8"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <line
                x1="55"
                y1="48"
                x2="52"
                y2="39"
                stroke="#38bdf8"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <line
                x1="67"
                y1="47"
                x2="72"
                y2="39"
                stroke="#38bdf8"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Browser Window Box */}
              <rect
                x="48"
                y="62"
                width="82"
                height="78"
                rx="6"
                fill="#f0f9ff"
                stroke="#38bdf8"
                strokeWidth="2"
              />

              {/* Browser Top Bar Line */}
              <line
                x1="48"
                y1="77"
                x2="130"
                y2="77"
                stroke="#bae6fd"
                strokeWidth="1.5"
              />

              {/* Browser 3 Window Dots */}
              <circle cx="56" cy="69.5" r="1.5" fill="#94a3b8" />
              <circle cx="61" cy="69.5" r="1.5" fill="#94a3b8" />
              <circle cx="66" cy="69.5" r="1.5" fill="#94a3b8" />

              {/* Cute Worried Face Inside Browser */}
              {/* Left Eye */}
              <circle cx="76" cy="98" r="2.8" fill="#475569" />
              {/* Right Eye */}
              <circle cx="102" cy="98" r="2.8" fill="#475569" />
              {/* Left Rosy Cheek */}
              <ellipse cx="70" cy="105" rx="3" ry="2" fill="#f472b6" opacity="0.85" />
              {/* Right Rosy Cheek */}
              <ellipse cx="108" cy="105" rx="3" ry="2" fill="#f472b6" opacity="0.85" />
              {/* Worried Open Mouth */}
              <ellipse cx="89" cy="110" rx="4.5" ry="5.5" fill="#64748b" />

              {/* 404 Speech Bubble Tail */}
              <path
                d="M 124 92 C 118 110 102 116 97 116 C 112 116 128 106 134 98 Z"
                fill="#38bdf8"
              />

              {/* 404 Speech Bubble Circle */}
              <circle cx="156" cy="66" r="40" fill="#38bdf8" />

              {/* 404 Text inside Bubble */}
              <text
                x="156"
                y="75"
                fill="#ffffff"
                fontSize="24"
                fontWeight="500"
                fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                textAnchor="middle"
              >
                404
              </text>
            </svg>
          </div>

          {/* Heading */}
          <h1 className="text-3xl sm:text-4xl font-normal text-sky-400 tracking-wide uppercase">
            PAGE NOT FOUND
          </h1>

          {/* Subtext */}
          <div className="space-y-1 text-slate-500 text-sm sm:text-base leading-relaxed">
            <p>We looked everywhere for this page.</p>
            <p>Are you sure the website URL is correct?</p>
            <p>Get in touch with the site owner.</p>
          </div>

          {/* Go Back Home Button */}
          <div className="pt-2">
            <Link
              to="/"
              className="inline-block px-7 py-2.5 rounded-full border border-sky-400 text-sky-400 hover:bg-sky-400 hover:text-white transition-colors duration-200 text-sm sm:text-base font-normal tracking-wide shadow-xs"
            >
              Go Back Home
            </Link>
          </div>

        </div>
      </div>
    </Layout>
  );
}
