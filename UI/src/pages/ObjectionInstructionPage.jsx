import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ObjectionRouteGuard from "../components/ObjectionRouteGuard";
import {
  FaBook,
  FaCheckCircle,
  FaExclamationCircle,
  FaFileAlt,
  FaArrowRight,
  FaArrowLeft,
  FaShieldAlt,
} from "react-icons/fa";

const ObjectionInstructionPage = () => {
  const [acknowledged, setAcknowledged] = useState(false);
  const navigate = useNavigate();

  const handleProceed = () => {
    if (!acknowledged) return;
    navigate("/objection");
  };

  return (
    <ObjectionRouteGuard>
      <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-800 via-indigo-900 to-blue-900 text-white p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-semibold tracking-wider uppercase">
                UK D.El.Ed. Entrance Exam 2026
              </span>
              <span className="px-3 py-1 bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 rounded-full text-xs font-semibold">
                उत्तर कुंजी आपत्ति
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              अनंतिम उत्तर कुंजी आपत्ति हेतु दिशा-निर्देश
            </h1>
            <p className="text-sm sm:text-base text-blue-100 mt-1">
              Instructions for Challenging Provisional Answer Key (D.El.Ed. - 2026)
            </p>
          </div>

          {/* Content Body */}
          <div className="p-6 sm:p-8 space-y-6">
            {/* Hindi Instructions */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2 flex items-center gap-2">
                <FaBook className="text-blue-700" /> महत्वपूर्ण दिशा-निर्देश (हिन्दी में)
              </h2>
              <ul className="space-y-3 text-sm text-slate-700 leading-relaxed list-disc list-inside">
                <li>
                  उत्तराखण्ड द्विवर्षीय डी०एल०एड० प्रवेश परीक्षा 2026 की अनंतिम उत्तर कुंजी पर केवल वही अभ्यर्थी आपत्ति दर्ज करा सकते हैं जो परीक्षा में उपस्थित हुए हैं।
                </li>
                <li>
                  <strong>प्रश्न पुस्तिका सीरीज (Booklet Series - केवल एक सीरीज अनुमन्य):</strong> अभ्यर्थी अपनी वास्तविक प्रश्न पुस्तिका सीरीज (<strong>A, B, C अथवा D</strong>) का ही चयन करें। <strong>एक अभ्यर्थी केवल एक ही सीरीज में आपत्तियां दर्ज कर सकता है।</strong> एक बार किसी सीरीज में पहली आपत्ति दर्ज करने के उपरांत आपकी सभी आपत्तियां उसी सीरीज में मान्य होंगी; किसी अन्य सीरीज में आपत्ति स्वीकार्य नहीं होगी।
                </li>
                <li>
                  <strong>प्रश्न संख्या (Question Number 1 to 200):</strong> परीक्षा में कुल 200 प्रश्न पूछे गए हैं। अभ्यर्थी को किसी भी वर्ग या भाग (Section) का विभाजन करने की आवश्यकता नहीं है; आप सीधे प्रश्न संख्या <strong>1 से 200</strong> के मध्य जिस प्रश्न पर आपत्ति दर्ज कराना चाहते हैं, उस प्रश्न संख्या को मैनुअली प्रविष्ट (Enter) कर सकते हैं।
                </li>
                <li>
                  <strong>प्रामाणिक साक्ष्य (Documentary Evidence):</strong> आपत्ति के समर्थन में केवल मानक एवं प्रामाणिक संदर्भ पुस्तकों (NCERT / SCERT / विश्वविद्यालयी पाठ्यपुस्तकें) का साक्ष्य ही मान्य होगा। किसी निजी ब्लॉग, सोशल मीडिया अथवा कोचिंग नोट्स का साक्ष्य स्वीकार्य नहीं होगा। साक्ष्य फाइल (PDF / JPG / PNG) अधिकतम 5 MB एवं अधिकतम 3 पृष्ठों (Maximum 3 Pages) तक की ही मान्य होगी।
                </li>
                <li>
                  <strong>ड्राफ्ट एवं अंतिम जमा (Draft & Final Submit):</strong> आप अपनी आपत्तियों को ड्राफ्ट के रूप में जोड़ सकते हैं, संपादित (Edit) कर सकते हैं अथवा हटा (Delete) सकते हैं। सभी आपत्तियां दर्ज करने के पश्चात <strong>"Final Submit (अंतिम रूप से जमा करें)"</strong> बटन दबाकर लॉक करना अनिवार्य है।
                </li>
                <li className="text-red-700 font-semibold">
                  चेतावनी: एक बार Final Submit करने के उपरांत किसी भी आपत्ति में किसी भी प्रकार का परिवर्तन, विलोपन अथवा नई आपत्ति जोड़ना सम्भव नहीं होगा।
                </li>
              </ul>
            </div>

            {/* English Summary */}
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <h2 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2 flex items-center gap-2">
                <FaFileAlt className="text-indigo-700" /> Instructions in English
              </h2>
              <ul className="space-y-2 text-sm text-slate-700 leading-relaxed list-disc list-inside">
                <li><strong>Single Booklet Series Rule:</strong> Candidates can raise challenges only against questions from one single Booklet Series assigned to them (A, B, C, or D). Once a challenge is registered under a series, all subsequent challenges by that candidate must be in that same series. Cross-series challenges are strictly prohibited.</li>
                <li>Multiple questions can be challenged under one submission session as drafts.</li>
                <li>Each challenge must specify the claimed correct option and a clear academic justification with documentary proof.</li>
                <li>Accepted proof documents include PDF, JPG, and PNG files up to 5 MB in size and maximum 3 pages.</li>
                <li>Review all your drafted challenges thoroughly before clicking <strong>"Final Submit"</strong>. Once locked, submissions are immutable.</li>
              </ul>
            </div>

            {/* Security Box */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-amber-900 text-xs sm:text-sm">
              <FaShieldAlt className="text-amber-600 text-lg flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">महत्वपूर्ण सूचना (Statutory Note):</p>
                <p className="mt-0.5 leading-relaxed">
                  विषय विशेषज्ञों की समिति द्वारा प्राप्त सभी आपत्तियों का सम्यक परीक्षण किया जाएगा। समिति की संस्तुति के आधार पर जारी की जाने वाली अंतिम उत्तर कुंजी (Final Answer Key) ही अंतिम एवं सर्वमान्य होगी।
                </p>
              </div>
            </div>

            {/* Declaration Checkbox */}
            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                  मैंने उपर्युक्त सभी दिशा-निर्देशों एवं शर्तों को ध्यानपूर्वक पढ़ व समझ लिया है। मैं प्रमाणित करता/करती हूँ कि मेरे द्वारा प्रस्तुत की जाने वाली आपत्ति एवं संलग्न साक्ष्य पूर्णतः सत्य एवं प्रामाणिक हैं।
                  <span className="block text-slate-500 text-xs mt-1">
                    (I have carefully read and understood all the above instructions and agree to abide by the rules.)
                  </span>
                </span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <Link
                to="/application"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-medium text-sm transition"
              >
                <FaArrowLeft /> वापस डैशबोर्ड (Dashboard)
              </Link>
              <button
                type="button"
                onClick={handleProceed}
                disabled={!acknowledged}
                className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm transition shadow-sm ${
                  acknowledged
                    ? "bg-blue-700 hover:bg-blue-800 text-white cursor-pointer"
                    : "bg-slate-300 text-slate-500 cursor-not-allowed"
                }`}
              >
                आगे बढ़ें (Proceed to Challenge) <FaArrowRight />
              </button>
            </div>
          </div>
        </div>
      </div>
    </ObjectionRouteGuard>
  );
};

export default ObjectionInstructionPage;
