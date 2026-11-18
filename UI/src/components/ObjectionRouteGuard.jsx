import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../stores/apiStore";
import { FaClock, FaExclamationTriangle, FaArrowLeft, FaPhoneAlt, FaEnvelope } from "react-icons/fa";

const ObjectionRouteGuard = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [timeline, setTimeline] = useState({
    isOpen: true,
    isBefore: false,
    isAfter: false,
    message: "",
    startDate: null,
    closeDate: null,
  });
  const navigate = useNavigate();

  useEffect(() => {
    const checkTimeline = async () => {
      try {
        const res = await api.get("/api/Objection/timeline-status");
        if (res.data) {
          setTimeline(res.data);
        }
      } catch (err) {
        console.error("Failed to check objection timeline status:", err);
      } finally {
        setLoading(false);
      }
    };

    checkTimeline();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-600 font-medium text-sm">Checking Objection Window Timeline...</p>
      </div>
    );
  }

  if (!timeline.isOpen) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/40 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden">
          <div className={`p-6 text-white text-center ${timeline.isBefore ? "bg-amber-600" : "bg-red-700"}`}>
            <div className="w-16 h-16 mx-auto mb-3 bg-white/20 rounded-full flex items-center justify-center text-3xl">
              {timeline.isBefore ? <FaClock /> : <FaExclamationTriangle />}
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              {timeline.isBefore ? "आपत्ति पोर्टल अभी प्रारंभ नहीं हुआ है" : "आपत्ति पोर्टल समाप्त हो चुका है"}
            </h1>
            <p className="text-sm opacity-90 mt-1">
              {timeline.isBefore
                ? "Answer Key Objection Portal Not Active Yet"
                : "Answer Key Objection Window is Closed"}
            </p>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
              <p className="text-sm font-medium text-slate-800 leading-relaxed">
                {timeline.message || "उत्तराखण्ड द्विवर्षीय डी०एल०एड० प्रवेश परीक्षा 2026 की उत्तर कुंजी पर आपत्ति दर्ज कराने की समय-सीमा निर्धारित है।"}
              </p>
              {timeline.startDate && (
                <div className="mt-3 text-xs text-slate-600">
                  <span className="font-semibold text-slate-700">प्रारंभ तिथि (Start Date):</span>{" "}
                  {new Date(timeline.startDate).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST
                </div>
              )}
              {timeline.closeDate && (
                <div className="mt-1 text-xs text-slate-600">
                  <span className="font-semibold text-slate-700">अंतिम तिथि (End Date):</span>{" "}
                  {new Date(timeline.closeDate).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 pt-4">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                सहायता एवं सम्पर्क (Helpdesk)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <FaEnvelope className="text-blue-600" />
                  <span>helpdesk@ukutet.com</span>
                </div>
                <div className="flex items-center gap-2">
                  <FaPhoneAlt className="text-emerald-600" />
                  <span>+91-9105151520</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-center">
              <Link
                to="/application"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-medium text-sm transition shadow-sm"
              >
                <FaArrowLeft /> वापस डैशबोर्ड पर जाएं (Back to Dashboard)
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return children;
};

export default ObjectionRouteGuard;
