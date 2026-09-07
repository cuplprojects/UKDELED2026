import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";

export default function InstructionsPage() {
  const navigate = useNavigate();
  const [lang, setLang] = useState("en"); // Default to English as shown in the screenshot
  const [agreed, setAgreed] = useState(false);

  return (
    <Layout className="min-h-screen flex flex-col bg-amber-50/20 font-sans">
      <main className="flex-1 flex items-center justify-center px-2 sm:px-4 md:px-8 py-6 sm:py-10">
        <div className="w-full max-w-6xl bg-white rounded shadow-sm border border-gray-300 p-6 sm:p-8 md:p-12">
          
          {/* Lang Tabs */}
          <div className="flex gap-2 mb-8 border-b border-gray-200 pb-1">
            <button
              onClick={() => setLang("en")}
              className={`px-5 sm:px-8 py-2.5 text-base sm:text-lg font-bold rounded-t border ${
                lang === "en"
                  ? "border-blue-400 bg-sky-50 text-blue-700 border-b-white"
                  : "border-gray-200 bg-gray-50 text-blue-600 hover:bg-gray-100"
              }`}
            >
              Read in English
            </button>
            <button
              onClick={() => setLang("hi")}
              className={`px-5 sm:px-8 py-2.5 text-base sm:text-lg font-bold rounded-t border ${
                lang === "hi"
                  ? "border-blue-400 bg-sky-50 text-blue-700 border-b-white"
                  : "border-gray-200 bg-gray-50 text-blue-600 hover:bg-gray-100"
              }`}
            >
              हिन्दी में पढ़ें
            </button>
          </div>

          {/* Content Box */}
          <div className="space-y-6 text-base sm:text-lg md:text-[18px] text-gray-900 leading-[1.8] font-normal">
            {lang === "hi" ? (
              <>
                <div className="text-center space-y-2 mb-10">
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#1e40af] tracking-wide uppercase">
                    ऑनलाइन आवेदन
                  </h2>
                  <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-black">
                    उत्तराखण्ड डी०एल०एड० प्रवेश परीक्षा 2025
                  </h3>
                  <h4 className="text-xl sm:text-2xl md:text-3xl font-black text-red-600 uppercase">
                    अभ्यर्थियों के लिए महत्वपूर्ण दिशानिर्देश
                  </h4>
                </div>

                <div className="space-y-4 sm:space-y-5">
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 font-bold">1.</span>
                    <p>अभ्यर्थी परिषद् वेबसाइट <span className="font-bold text-black">www.ukdeled.com</span> पर डी०एल०एड० प्रवेश परीक्षा 2025 के लिए ऑनलाइन आवेदन कर सकते हैं।</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 font-bold">2.</span>
                    <p>परिषद् वेबसाइट पर अपलोड उत्तराखण्ड डी०एल०एड० प्रवेश परीक्षा 2025 सूचना विवरणिका में उत्तराखण्ड डी०एल०एड० प्रवेश परीक्षा 2025 हेतु निर्धारित अर्हताओं का अध्ययन कर निर्धारित अर्हताएं पूर्ण होने पर ही परीक्षा में सम्मिलित होने हेतु आवेदन करें।</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 font-bold">3.</span>
                    <p>अभ्यर्थी अपनी विवरण जैसे नाम, पिता का नाम, माता का नाम एवं जन्मतिथि अपने कक्षा 10 के प्रमाणपत्र के अनुसार ही प्रविष्ट करें।</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 font-bold">4.</span>
                    <p>ऑनलाइन आवेदन पत्र भरने से पहले कृपया दिशानिर्देशों एवं विवरण को सावधानीपूर्वक पढ़ें। उम्मीदवारों को बोर्ड की वेबसाइट पर उपलब्ध D.El.Ed प्रवेश परीक्षा 2025 सूचना विवरणिका में दिए गए निर्देशों का कड़ाई से पालन अवश्य करना चाहिए।</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 font-bold">5.</span>
                    <p>डी०एल०एड० प्रवेश परीक्षा 2025 हेतु परीक्षा शुल्क विवरण निम्नवत् है-</p>
                  </div>
                  
                  {/* Table */}
                  <div className="my-6 border border-gray-700">
                    <table className="w-full text-center border-collapse text-base sm:text-lg md:text-xl">
                      <thead>
                        <tr className="border-b border-gray-700 bg-gray-50/60">
                          <th className="p-3.5 sm:p-4 border-r border-gray-700 font-bold w-3/4">CATEGORY</th>
                          <th className="p-3.5 sm:p-4 font-bold w-1/4">Fee Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-gray-700">
                          <td className="p-3.5 sm:p-4 border-r border-gray-700 text-center font-medium">सामान्य / अन्य पिछड़ा वर्ग के अभ्यर्थियों के लिए</td>
                          <td className="p-3.5 sm:p-4 font-medium">Rs.600/-</td>
                        </tr>
                        <tr className="border-b border-gray-700">
                          <td className="p-3.5 sm:p-4 border-r border-gray-700 text-center font-medium">अनुसूचित जाति एवं अनुसूचित जनजाति वर्ग के अभ्यर्थियों के लिए</td>
                          <td className="p-3.5 sm:p-4 font-medium">Rs.300/-</td>
                        </tr>
                        <tr>
                          <td className="p-3.5 sm:p-4 border-r border-gray-700 text-center font-medium">सभी वर्ग के निःशक्त (दिव्यांग) अभ्यर्थियों के लिए</td>
                          <td className="p-3.5 sm:p-4 font-medium">Rs.150/-</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="shrink-0 font-bold">6.</span>
                    <p>अभ्यर्थी परिषद् वेबसाइट पर ऑनलाइन आवेदन के मध्य कर सकते हैं। इसके उपरान्त आवेदन विचारणीय नहीं होगा।</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 font-bold">7.</span>
                    <p>अभ्यर्थी के द्वारा शुल्क सहित आवेदन संबंधी सूचना परिषद् वेबसाइट पर अपलोड की जायेगी। अभ्यर्थी अपने अभ्यर्थन एवं सूचनाओं की जाँच वेबसाइट पर कर सकता है। ऐसे अभ्यर्थी जिनकी फीस बोर्ड द्वारा प्राप्त नहीं की गयी हो, के डी० एल० एड० प्रवेश परीक्षा 2025 के अभ्यर्थन पर विचार नहीं किया जाएगा।</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 font-bold">8.</span>
                    <p>प्रवेश पत्र परिषद् की वेबसाइट पर अपलोड किया जाएगा। अभ्यर्थी परीक्षा केंद्र में प्रवेश हेतु वेबसाइट से अपना प्रवेश पत्र डाउनलोड/प्रिंट कर सकेंगे। प्रवेश-पत्र अलग से डाक द्वारा अभ्यर्थियों को नहीं भेजा जाएगा।</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 font-bold">9.</span>
                    <p>अभ्यर्थी को एक परीक्षा के लिए एक ही आवेदन पत्र भरने की अनुमति दी जाती है। एक परीक्षा के लिए एक से अधिक आवेदन करने की स्थिति में आवेदन पत्र निरस्त कर दिया जायेगा।</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 font-bold">10.</span>
                    <p>ऑनलाइन आवेदन के अतिरिक्त अन्य किसी माध्यम यथा फैक्स/डाक/मेल द्वारा भेजे गए आवेदन पत्रों पर किसी भी स्थिति में विचार नहीं किया जाएगा।</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 font-bold">11.</span>
                    <p>अभ्यर्थियों को सलाह दी जाती है कि वे ऑनलाइन आवेदन करने की अंतिम तिथि की प्रतीक्षा किए बिना अपना आवेदन समय के अन्दर ही कर दें।</p>
                  </div>

                  <p className="font-bold text-center text-base sm:text-lg md:text-xl pt-6 text-red-600" style={{ color: "#dc2626" }}>
                    ऑनलाइन आवेदन पत्र अंतिम रूप से भरने के उपरान्त उसमें किसी भी प्रकार के संशोधन या परिवर्तन से संबंधित कोई भी ऑफलाइन/ऑनलाइन प्रार्थना स्वीकार्य नहीं होगी।
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="text-center space-y-2 mb-10">
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#1e40af] tracking-wide uppercase">
                    ONLINE APPLICATION FORM
                  </h2>
                  <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-black">
                    UTTARAKHAND D.El.Ed. Entrance Test 2025
                  </h3>
                  <h4 className="text-xl sm:text-2xl md:text-3xl font-black text-red-600 uppercase">
                    IMPORTANT INSTRUCTIONS/GUIDELINES TO THE CANDIDATE
                  </h4>
                </div>

                <div className="space-y-4 sm:space-y-5">
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 font-bold">1.</span>
                    <p>Candidates can apply online for Uttarakhand D.El.Ed. Entrance Test 2025 on the Board website <span className="font-bold text-black">www.ukdeled.com</span></p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 font-bold">2.</span>
                    <p>Please ensure your eligibility as per the criteria laid down for Uttarakhand D.El.Ed. Entrance Test 2025 in the D.El.Ed. Entrance Test 2025 : INFORMATION BROCHURE uploaded on the Board Website.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 font-bold">3.</span>
                    <p>Candidate should enter his/her particulars i.e. Name, Father's Name, Mother's Name & Date of Birth as per his/her Secondary Education Board Class X Certificate.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 font-bold">4.</span>
                    <p>Please read the instructions and proceed carefully before you start filling the online application form. Candidate must follow the instructions strictly as given in the INFORMATION BROCHURE : D.El.Ed. Entrance Examination 2025 on the Board Website.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 font-bold">5.</span>
                    <p>Examination Fee Details for D.El.Ed. Entrance Test 2025 are as follows:</p>
                  </div>
                  
                  {/* Table */}
                  <div className="my-6 border border-gray-700">
                    <table className="w-full text-center border-collapse text-base sm:text-lg md:text-xl">
                      <thead>
                        <tr className="border-b border-gray-700 bg-gray-50/60">
                          <th className="p-3.5 sm:p-4 border-r border-gray-700 font-bold w-1/2">CATEGORY</th>
                          <th className="p-3.5 sm:p-4 font-bold w-1/2">Fee Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-gray-700">
                          <td className="p-3.5 sm:p-4 border-r border-gray-700 font-medium">General/OBC</td>
                          <td className="p-3.5 sm:p-4 font-medium">Rs.600/-</td>
                        </tr>
                        <tr className="border-b border-gray-700">
                          <td className="p-3.5 sm:p-4 border-r border-gray-700 font-medium">SC/ST</td>
                          <td className="p-3.5 sm:p-4 font-medium">Rs.300/-</td>
                        </tr>
                        <tr>
                          <td className="p-3.5 sm:p-4 border-r border-gray-700 font-medium">Diff. Abled Person (PH)</td>
                          <td className="p-3.5 sm:p-4 font-medium">Rs.150/-</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="shrink-0 font-bold">6.</span>
                    <p>Candidates can apply online on Board Website from . No application will be entertained thereafter.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 font-bold">7.</span>
                    <p>Information regarding the applications of candidates received with fees will be uploaded on the Board's website. The candidates can check their Application for candidature and candidate's particulars on the website. The candidature of the candidate, who's fees has not been received by this Board, will not be considered for the D.El.Ed. Entrance Examination 2025.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 font-bold">8.</span>
                    <p><span className="font-bold text-black">The Admit Cards will be uploaded on the Board website.</span> The Candidates will be able to download/print the Admit Cards for entrance to Examination Centre. The Admit Card will not be sent to Candidates separately by post.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 font-bold">9.</span>
                    <p>Candidate is allowed to submit only one Application Form against same Exam. Multiple Applications for same Exam of a candidate are liable to be rejected.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 font-bold">10.</span>
                    <p>Application Forms through fax/post/email shall not be entertained and Board does not take responsibility to inform such candidates.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 font-bold">11.</span>
                    <p>The applicants are strongly advised to apply online well in time without waiting for the last date of submission of online application.</p>
                  </div>

                  <p className="font-bold text-center text-base sm:text-lg md:text-xl pt-6 text-red-600" style={{ color: "#dc2626" }}>
                    After Final Submission of the Online Application Form, no offline/online request will be accepted regarding correction or any change.
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Accept checkbox and Proceed button */}
          <div className="mt-8 pt-6 border-t border-gray-200 flex flex-col items-center gap-5">
            <div className="flex flex-col items-center max-w-4xl text-center">
              <label className="inline-flex items-center justify-center cursor-pointer select-none text-sm sm:text-base md:text-[15.5px] font-bold text-red-600 leading-normal">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  style={{
                    width: "18px",
                    height: "18px",
                    margin: "0 12px 0 0",
                    position: "relative",
                    top: "3px",
                    cursor: "pointer",
                    accentColor: "#1e40af",
                    flexShrink: 0
                  }}
                />
                <span className="text-red-600" style={{ color: "#dc2626" }}>
                  I acknowledge that I have read carefully, and do hereby accept the terms and conditions contained on this page.
                </span>
              </label>
              <p 
                onClick={() => setAgreed(!agreed)}
                className="text-xs sm:text-sm md:text-[14.5px] font-bold text-center mt-2 cursor-pointer select-none text-red-600"
                style={{ color: "#dc2626" }}
              >
                मैंने इस पृष्ठ पर निहित नियमों और शर्तों को ध्यानपूर्वक पढ़ा है और स्वीकार करता हूं
              </p>
            </div>

            <button
              onClick={() => {
                if (agreed) {
                  navigate("/new-registration");
                }
              }}
              disabled={!agreed}
              className={`px-8 sm:px-10 py-2.5 sm:py-3 font-bold text-sm sm:text-base rounded transition ${
                agreed
                  ? "bg-[#1e40af] hover:bg-[#1e3a8a] text-white shadow-md cursor-pointer"
                  : "bg-[#1e40af]/40 text-white/80 cursor-not-allowed"
              }`}
            >
              Proceed to Registration
            </button>
          </div>

        </div>
      </main>
    </Layout>
  );
}
