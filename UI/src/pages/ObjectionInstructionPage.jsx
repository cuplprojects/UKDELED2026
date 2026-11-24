import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
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
  const [lang, setLang] = useState("en"); // Default to English as shown in official screenshot
  const [acknowledged, setAcknowledged] = useState(false);
  const navigate = useNavigate();

  const handleProceed = () => {
    if (!acknowledged) return;
    navigate("/objection");
  };

  return (
    <Layout className="min-h-screen flex flex-col bg-slate-50 font-sans">
      <ObjectionRouteGuard>
        <div className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
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
                {lang === "hi"
                  ? "अनंतिम उत्तर कुंजी आपत्ति हेतु दिशा-निर्देश"
                  : "Instructions for Challenging Provisional Answer Key"}
              </h1>
              <p className="text-sm sm:text-base text-blue-100 mt-1">
                D.El.Ed. Entrance Exam 2026 — Answer Key Objection Portal
              </p>
            </div>

            {/* Language Switcher Bar */}
            <div className="bg-slate-100 px-6 sm:px-8 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs sm:text-sm font-bold text-slate-700">
                {lang === "hi" ? "दिशा-निर्देश भाषा (Instruction Language):" : "Instruction Language (दिशा-निर्देश भाषा):"}
              </span>
              <div className="inline-flex rounded-lg p-1 bg-white border border-slate-300 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setLang("hi")}
                  className={`px-4 py-1.5 rounded-md font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                    lang === "hi"
                      ? "bg-blue-700 text-white shadow-xs"
                      : "text-slate-600 hover:text-blue-700 hover:bg-slate-50"
                  }`}
                >
                  हिन्दी (Hindi)
                </button>
                <button
                  type="button"
                  onClick={() => setLang("en")}
                  className={`px-4 py-1.5 rounded-md font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                    lang === "en"
                      ? "bg-blue-700 text-white shadow-xs"
                      : "text-slate-600 hover:text-blue-700 hover:bg-slate-50"
                  }`}
                >
                  English
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-6 sm:p-8 space-y-6">
              {lang === "hi" ? (
                /* Hindi Instructions */
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
                      <strong>प्रश्न संख्या (Question Number 1 to 200):</strong> परीक्षा में कुल 200 प्रश्न पूछे गए हैं। अभ्यर्थी को किसी भी वर्ग या भाग (Section) का विभाजन करने की आवश्यकता नहीं है; आप सीधे प्रश्न संख्या <strong>1 से 200</strong> के मध्य जिस प्रश्न पर आपत्ति दर्ज कराना चाहते हैं, उस प्रश्न संख्या को सीधे प्रविष्ट (Enter) कर सकते हैं।
                    </li>
                    <li>
                      <strong>प्रामाणिक साक्ष्य (Documentary Evidence):</strong> आपत्ति के समर्थन में केवल मानक एवं प्रामाणिक संदर्भ पुस्तकों (NCERT / SCERT / विश्वविद्यालयी पाठ्यपुस्तकें) का साक्ष्य ही मान्य होगा। किसी निजी ब्लॉग, सोशल मीडिया अथवा कोचिंग नोट्स का साक्ष्य स्वीकार्य नहीं होगा। साक्ष्य फाइल (PDF / JPG / PNG) अधिकतम 5 MB एवं अधिकतम 5 पृष्ठों (Maximum 5 Pages) तक की ही मान्य होगी।
                    </li>
                    <li>
                      <strong>ड्राफ्ट एवं अंतिम जमा (Draft & Final Submit):</strong> आप अपनी आपत्तियों को ड्राफ्ट के रूप में जोड़ सकते हैं, संपादित (Edit) कर सकते हैं अथवा हटा (Delete) सकते हैं। सभी आपत्तियां दर्ज करने के पश्चात <strong>"Final Submit (अंतिम रूप से जमा करें)"</strong> बटन दबाकर लॉक करना अनिवार्य है।
                    </li>
                    <li className="text-red-700 font-semibold">
                      चेतावनी: एक बार Final Submit करने के उपरांत किसी भी आपत्ति में किसी भी प्रकार का परिवर्तन, विलोपन अथवा नई आपत्ति जोड़ना सम्भव नहीं होगा।
                    </li>
                  </ul>
                </div>
              ) : (
                /* English Instructions */
                <div className="space-y-4">
                  <h2 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2 flex items-center gap-2">
                    <FaFileAlt className="text-indigo-700" /> Important Instructions (in English)
                  </h2>
                  <ul className="space-y-3 text-sm text-slate-700 leading-relaxed list-disc list-inside">
                    <li>
                      Only candidates who appeared in the Uttarakhand 2-Year D.El.Ed. Entrance Examination 2026 are eligible to submit challenges against the provisional answer key.
                    </li>
                    <li>
                      <strong>Question Booklet Series (Only One Series Allowed):</strong> Candidates must select their actual Question Booklet Series (<strong>A, B, C, or D</strong>). <strong>A candidate is permitted to submit challenges in ONE series only.</strong> Once your first challenge is registered under a series, all subsequent challenges must belong to that same series. Challenges across different series are strictly prohibited.
                    </li>
                    <li>
                      <strong>Question Number (1 to 200):</strong> The question paper consists of a total of 200 questions. Candidates do not need to choose sections or subjects; you can directly enter the question number between <strong>1 and 200</strong> that you wish to challenge.
                    </li>
                    <li>
                      <strong>Academic Documentary Evidence:</strong> Only standard and authentic academic reference books (such as NCERT, SCERT, or authorized university textbooks) are accepted as valid evidence. Unofficial blogs, social media posts, or coaching notes will not be accepted. Supporting files (PDF / JPG / PNG) must not exceed 5 MB and maximum 5 pages.
                    </li>
                    <li>
                      <strong>Draft & Final Submit:</strong> You can add multiple challenges as drafts, preview them, edit, or delete them before final submission. After recording all your challenges, it is mandatory to click <strong>"Final Submit"</strong> to permanently lock and register them.
                    </li>
                    <li className="text-red-700 font-semibold">
                      Warning: Once you Final Submit and lock your challenges, no modifications, deletions, or new challenges can be submitted under any circumstances.
                    </li>
                  </ul>
                </div>
              )}

              {/* Security Box */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-amber-900 text-xs sm:text-sm">
                <FaShieldAlt className="text-amber-600 text-lg flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">
                    {lang === "hi" ? "महत्वपूर्ण सूचना (Statutory Note):" : "Important Note (महत्वपूर्ण सूचना):"}
                  </p>
                  <p className="mt-0.5 leading-relaxed">
                    {lang === "hi"
                      ? "विषय विशेषज्ञों की समिति द्वारा प्राप्त सभी आपत्तियों का सम्यक परीक्षण किया जाएगा। समिति की संस्तुति के आधार पर जारी की जाने वाली अंतिम उत्तर कुंजी (Final Answer Key) ही अंतिम एवं सर्वमान्य होगी।"
                      : "All challenges received will be thoroughly scrutinized by a committee of subject matter experts. The Final Answer Key released on the basis of the committee's recommendations shall be final and binding on all candidates."}
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
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                  />
                  <span className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                    {lang === "hi" ? (
                      <>
                        मैंने उपर्युक्त सभी दिशा-निर्देशों एवं शर्तों को ध्यानपूर्वक पढ़ व समझ लिया है। मैं प्रमाणित करता/करती हूँ कि मेरे द्वारा प्रस्तुत की जाने वाली आपत्ति एवं संलग्न साक्ष्य पूर्णतः सत्य एवं प्रामाणिक हैं।
                        <span className="block text-slate-500 text-xs mt-1">
                          (I have carefully read and understood all the above instructions and agree to abide by the rules.)
                        </span>
                      </>
                    ) : (
                      <>
                        I have carefully read and understood all the above instructions, rules, and conditions. I certify that the challenges submitted by me and the attached supporting documentary evidence are completely true and authentic.
                        <span className="block text-slate-500 text-xs mt-1">
                          (मैंने उपर्युक्त सभी दिशा-निर्देशों एवं शर्तों को ध्यानपूर्वक पढ़ व समझ लिया है।)
                        </span>
                      </>
                    )}
                  </span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <Link
                  to="/application"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-medium text-sm transition"
                >
                  <FaArrowLeft /> {lang === "hi" ? "वापस डैशबोर्ड (Dashboard)" : "Back to Dashboard"}
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
                  {lang === "hi" ? "आगे बढ़ें (Proceed to Challenge)" : "Proceed to Challenge"} <FaArrowRight />
                </button>
              </div>
            </div>
          </div>
        </div>
      </ObjectionRouteGuard>
    </Layout>
  );
};

export default ObjectionInstructionPage;
