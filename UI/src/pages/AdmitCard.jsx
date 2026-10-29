import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import PdfViewer from "../components/PdfViewer";
import { api } from "../stores/apiStore";
import {
  FaSearch,
  FaFilePdf,
  FaPrint,
  FaDownload,
  FaSyncAlt,
  FaIdCard,
  FaCalendarAlt,
  FaUser,
  FaTimes,
  FaCheckCircle,
  FaExclamationTriangle,
  FaInfoCircle,
  FaFilter,
  FaUsers
} from "react-icons/fa";

export default function AdmitCard() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ fullName: "", dob: "" });
  const [captchaCode, setCaptchaCode] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  const [timelineLoading, setTimelineLoading] = useState(true);
  const [timeline, setTimeline] = useState({
    isOpen: false,
    message: "",
    startDateFormatted: "",
    endDateFormatted: ""
  });

  const [searchResults, setSearchResults] = useState([]);
  const [filterText, setFilterText] = useState(""); // Instant disambiguation filter
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // PDF Preview Modal States
  const [pdfBlob, setPdfBlob] = useState(null);
  const [activeCandidate, setActiveCandidate] = useState(null);
  const [showPdfModal, setShowPdfModal] = useState(false);

  // Generate 5-digit random CAPTCHA
  const refreshCaptcha = () => {
    const code = Math.floor(10000 + Math.random() * 90000).toString();
    setCaptchaCode(code);
    setCaptchaInput("");
  };

  useEffect(() => {
    refreshCaptcha();

    // Fetch live timeline status
    api.get("/api/AdmitCard/timeline-status")
      .then((res) => {
        if (res.data && res.data.success) {
          setTimeline(res.data);
        }
      })
      .catch((err) => {
        console.warn("Could not retrieve timeline status:", err);
      })
      .finally(() => {
        setTimelineLoading(false);
      });
  }, []);

  // Form submit handler with strict captcha verification
  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setSearchResults([]);
    setFilterText("");

    if (!timeline.isOpen) {
      setErrorMessage(timeline.message || "Admit Card download is currently closed.");
      return;
    }

    if (!formData.fullName.trim()) {
      setErrorMessage("Candidate Name is required.");
      return;
    }
    if (!formData.dob) {
      setErrorMessage("Date of Birth is required.");
      return;
    }

    // Strict Captcha validation
    if (captchaInput.trim() !== captchaCode) {
      setErrorMessage("Invalid Captcha code entered. Please try again.");
      refreshCaptcha();
      return;
    }

    setLoading(true);
    try {
      const res = await api.get("/api/AdmitCard/search-candidates", {
        params: {
          query: formData.fullName.trim(),
          dob: formData.dob
        }
      });

      if (res.data && res.data.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
        setSearchResults(res.data.data);
        setSuccessMessage(`Found ${res.data.data.length} candidate record(s) matching your credentials.`);
      } else {
        setErrorMessage("No candidate records found matching the provided Name and Date of Birth.");
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Record not found. Please verify candidate details.";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  // Instant real-time filter for multiple candidates (Disambiguation)
  const filteredCandidates = useMemo(() => {
    if (!filterText.trim()) return searchResults;
    const q = filterText.toLowerCase().trim();
    return searchResults.filter((c) =>
      (c.fullName && c.fullName.toLowerCase().includes(q)) ||
      (c.registrationNo && c.registrationNo.toLowerCase().includes(q)) ||
      (c.fatherName && c.fatherName.toLowerCase().includes(q)) ||
      (c.district && c.district.toLowerCase().includes(q)) ||
      (c.homeDistrict && c.homeDistrict.toLowerCase().includes(q))
    );
  }, [searchResults, filterText]);

  // Fetch PDF Stream & Open High-Performance Canvas Viewer Modal
  const handleOpenAdmitCard = async (candidate) => {
    setDownloading(true);
    setErrorMessage("");

    try {
      const response = await api.post(
        "/api/AdmitCard/download",
        {
          registrationNo: candidate.registrationNo,
          dob: candidate.dob || formData.dob,
          fullName: candidate.fullName,
          isLogin: false
        },
        { responseType: "blob" }
      );

      const blob = new Blob([response.data], { type: "application/pdf" });
      setPdfBlob(blob);
      setActiveCandidate(candidate);
      setShowPdfModal(true);
    } catch (err) {
      let errorText = "Admit Card is not yet available. Please check back later.";
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text);
          if (parsed.message) errorText = parsed.message;
        } catch (_) {}
      } else if (err.response?.data?.message) {
        errorText = err.response.data.message;
      }
      if (/drive|storage|vault|path|folder|directory|\.pdf|[A-Z]:\\/i.test(errorText)) {
        errorText = "प्रवेश पत्र अभी उपलब्ध नहीं है। कृपया कुछ समय बाद पुनः प्रयास करें। (Admit Card is not yet available. Please try again later.)";
      }
      setErrorMessage(errorText);
    } finally {
      setDownloading(false);
    }
  };

  // Trigger File Download & Telemetry Log
  const triggerDownload = () => {
    if (!pdfBlob || !activeCandidate) return;

    const regNo = activeCandidate.registrationNo || "Candidate";
    const url = window.URL.createObjectURL(pdfBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AdmitCard_${regNo}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);

    // Asynchronous Audit Telemetry
    api.post("/api/AdmitCard/log-download", {
      registrationNo: regNo,
      isLogin: false
    }).catch(console.error);
  };

  // Trigger Native Browser Print & Telemetry Log
  const triggerPrint = () => {
    if (!pdfBlob || !activeCandidate) return;

    const url = window.URL.createObjectURL(pdfBlob);
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.src = url;

    document.body.appendChild(iframe);

    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        // Fallback for browsers with strict iframe restrictions
        const printWin = window.open(url);
        if (printWin) {
          printWin.focus();
          printWin.print();
        }
      } finally {
        setTimeout(() => {
          iframe.remove();
          window.URL.revokeObjectURL(url);
        }, 60000);
      }
    };

    // Asynchronous Audit Telemetry
    api.post("/api/AdmitCard/log-download", {
      registrationNo: activeCandidate.registrationNo,
      isLogin: false
    }).catch(console.error);
  };

  return (
    <Layout className="min-h-screen flex flex-col bg-slate-50 font-sans">
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 md:p-8">
        
        {/* Page Top Banner */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-blue-100 text-xs font-bold uppercase tracking-wider mb-2">
                  <FaIdCard className="w-3.5 h-3.5" />
                  <span>DELED 2026 Examination Pass</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                  Download Examination Admit Card (प्रवेश पत्र)
                </h1>
                <p className="text-blue-100 text-xs sm:text-sm mt-1 max-w-2xl font-medium">
                  Uttarakhand Board of School Education (UBSE) — Two-Year D.El.Ed. Entrance Exam 2026
                </p>
              </div>

              {/* Status Pill Indicator */}
              <div className="shrink-0">
                {timeline.isOpen ? (
                  <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-300 text-white text-xs font-bold backdrop-blur-sm shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Download Open</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/30 border border-amber-300 text-white text-xs font-bold backdrop-blur-sm shadow-xs">
                    <FaExclamationTriangle className="text-amber-300 text-xs" />
                    <span>Download Closed</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Timeline Status Bar */}
          {!timeline.isOpen ? (
            <div className="bg-amber-50 border-b border-amber-200 px-6 py-4 flex items-start sm:items-center gap-3 text-amber-900 text-sm">
              <FaExclamationTriangle className="text-amber-600 shrink-0 text-lg mt-0.5 sm:mt-0" />
              <div>
                <p className="font-bold text-amber-800">
                  {timeline.message || "Admit Card download is currently closed."}
                </p>
                {timeline.startDateFormatted && (
                  <p className="text-xs text-amber-700 mt-0.5">
                    Permitted Download Schedule: <strong>{timeline.startDateFormatted}</strong> to <strong>{timeline.endDateFormatted}</strong>
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50/70 border-b border-emerald-100 px-6 py-3 flex items-center gap-2 text-emerald-800 text-xs font-semibold">
              <FaCheckCircle className="text-emerald-600 shrink-0" />
              <span>
                Download window is currently active. Search with Candidate Name and Date of Birth to view and print your admit card.
              </span>
            </div>
          )}
        </div>

        {/* Main Section: Only show form & buttons when date is in range */}
        {timelineLoading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center max-w-xl mx-auto my-8">
            <FaSyncAlt className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-700">Verifying Admit Card timeline schedule...</p>
          </div>
        ) : !timeline.isOpen ? (
          <div className="bg-white rounded-2xl shadow-sm border border-amber-200 p-8 sm:p-12 text-center max-w-2xl mx-auto my-8">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-3xl mx-auto mb-5 shadow-inner">
              <FaCalendarAlt />
            </div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-black uppercase tracking-wider mb-3">
              Schedule Inactive / समयावधि से बाहर
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-800 mb-3">
              प्रवेश पत्र डाउनलोड समयावधि सक्रिय नहीं है
            </h2>
            <p className="text-sm sm:text-base text-slate-600 font-semibold mb-6">
              {timeline.message || "Admit Card download is not available at this moment according to the official examination schedule."}
            </p>

            {(timeline.startDateFormatted || timeline.endDateFormatted) && (
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 mb-6 text-left max-w-md mx-auto">
                <p className="text-xs font-bold text-amber-900 uppercase tracking-wide mb-2 text-center">
                  आधिकारिक डाउनलोड अनुसूची (Official Schedule)
                </p>
                <div className="space-y-1.5 text-xs text-amber-950">
                  <div className="flex justify-between border-b border-amber-200/60 pb-1">
                    <span className="font-semibold text-amber-800">प्रारंभ तिथि (Starts):</span>
                    <span className="font-extrabold">{timeline.startDateFormatted || "—"}</span>
                  </div>
                  <div className="flex justify-between pt-0.5">
                    <span className="font-semibold text-amber-800">अंतिम तिथि (Closes):</span>
                    <span className="font-extrabold">{timeline.endDateFormatted || "—"}</span>
                  </div>
                </div>
              </div>
            )}

            <p className="text-xs text-slate-500 mb-6">
              अनुसूची प्रारंभ होने के पश्चात ही प्रवेश पत्र डाउनलोड लिंक और खोज सुविधा उपलब्ध होगी।
            </p>

            <button
              type="button"
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition shadow hover:shadow-md cursor-pointer"
            >
              <span>← मुख्य पृष्ठ पर वापस जाएँ (Back to Home)</span>
            </button>
          </div>
        ) : (
          /* Main Grid: Form + Search/Disambiguation Results */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Search Credentials Card (5 Cols) */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between transition lg:col-span-5">
            <div>
              <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 mb-5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                  timeline.isOpen ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
                }`}>
                  <FaSearch className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">Candidate Search</h2>
                  <p className="text-xs text-slate-400">Search credentials for examination pass</p>
                </div>
              </div>

              {/* Error Message Alert */}
              {errorMessage && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-start gap-2">
                  <FaExclamationTriangle className="shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Search Form */}
              <form onSubmit={handleSearchSubmit} className="space-y-4">
                {/* Candidate Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Candidate Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition uppercase"
                  />
                </div>

                {/* Date of Birth */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Date of Birth (DOB) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition cursor-pointer"
                  />
                </div>

                {/* 5-Digit Security Captcha */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Security Captcha <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="px-5 py-2 bg-gradient-to-r from-slate-800 to-slate-900 text-emerald-400 font-mono font-black text-lg tracking-widest rounded-lg select-none shadow-inner border border-slate-700">
                      {captchaCode}
                    </div>
                    <button
                      type="button"
                      onClick={refreshCaptcha}
                      className="p-2.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition cursor-pointer border border-blue-200"
                      title="Generate new Captcha"
                    >
                      <FaSyncAlt className="w-4 h-4" />
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={5}
                    value={captchaInput}
                    onChange={(e) => setCaptchaInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition"
                  />
                </div>

                {/* Search Submit Action Button */}
                <button
                  type="submit"
                  disabled={loading || downloading || !timeline.isOpen}
                  className={`w-full mt-2 py-3 text-white font-extrabold text-sm rounded-xl transition shadow-md flex items-center justify-center gap-2 ${
                    timeline.isOpen
                      ? "bg-blue-600 hover:bg-blue-700 hover:shadow-lg cursor-pointer"
                      : "bg-slate-400 cursor-not-allowed opacity-60"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loading ? (
                    <>
                      <FaSyncAlt className="animate-spin" />
                      <span>Searching Records...</span>
                    </>
                  ) : (
                    <>
                      <FaSearch />
                      <span>Search & Download Admit Card</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Helper Notes Footer */}
            <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
              <p>• Admit Cards will not be sent separately by post.</p>
              <p>• Only candidates with completed fee payments are eligible.</p>
              <p>• Please bring a valid government photo ID along with printed Admit Card.</p>
            </div>
          </div>

          {/* Right Column: Disambiguation Panel & Candidate Cards (7 Cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col">
            
            {/* Header + Count Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <FaUsers className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">
                    Candidate Disambiguation Panel
                  </h2>
                  <p className="text-xs text-slate-400">
                    {searchResults.length > 0
                      ? `${searchResults.length} candidate(s) matched your credentials`
                      : "Candidate cards will display here after search"}
                  </p>
                </div>
              </div>

              {searchResults.length > 0 && (
                <span className="self-start sm:self-auto px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
                  {searchResults.length} Matched
                </span>
              )}
            </div>

            {/* Instant Filter Input (for multiple candidate disambiguation) */}
            {searchResults.length > 1 && (
              <div className="mb-4 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <FaFilter className="w-3 h-3" />
                </div>
                <input
                  type="text"
                  placeholder="Filter candidate by Name, Reg No, Father's Name, or District..."
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                />
              </div>
            )}

            {/* Success Alert Banner */}
            {successMessage && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
                <FaCheckCircle className="shrink-0 text-emerald-600" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Default Empty State */}
            {searchResults.length === 0 && !loading && (
              <div className="flex-1 flex flex-col items-center justify-center py-14 px-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center mb-4 shadow-inner">
                  <FaFilePdf className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-700 mb-1">
                  Ready to Search Candidate
                </h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  Fill in candidate details on the left form and click Search to locate your admit card and open the in-browser canvas preview.
                </p>
              </div>
            )}

            {/* Loading Spinner */}
            {loading && (
              <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
                <FaSyncAlt className="w-8 h-8 text-blue-600 animate-spin mb-3" />
                <p className="text-sm font-bold text-slate-700">Locating Candidate Records...</p>
                <p className="text-xs text-slate-400 mt-1">Filtering name and date of birth in database</p>
              </div>
            )}

            {/* Candidate Cards Disambiguation List */}
            {filteredCandidates.length > 0 && (
              <div className="space-y-3.5 overflow-y-auto max-h-[500px] pr-1">
                {filteredCandidates.map((cand) => (
                  <div
                    key={cand.registrationNo}
                    className="p-4 sm:p-5 rounded-2xl border border-slate-200 hover:border-blue-400 bg-gradient-to-br from-white to-slate-50 transition shadow-sm hover:shadow-md"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      {/* Candidate Details */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-base text-slate-900 tracking-wide uppercase">
                            {cand.fullName}
                          </span>
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-mono font-bold text-xs rounded-md">
                            {cand.registrationNo}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">
                          <span className="font-semibold text-slate-400">Father's Name:</span> {cand.fatherName || "N/A"}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-1">
                          <span>
                            <span className="font-semibold text-slate-400">DOB:</span> {cand.dob || "N/A"}
                          </span>
                          {(cand.district || cand.homeDistrict) && (
                            <span>
                              <span className="font-semibold text-slate-400">District:</span> {cand.district || cand.homeDistrict}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* View Button */}
                      <div className="shrink-0 flex items-center">
                        <button
                          type="button"
                          onClick={() => handleOpenAdmitCard(cand)}
                          disabled={downloading}
                          className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          {downloading ? (
                            <>
                              <FaSyncAlt className="animate-spin text-xs" />
                              <span>Opening...</span>
                            </>
                          ) : (
                            <>
                              <FaFilePdf className="text-sm" />
                              <span>View Admit Card</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Filter Empty State */}
            {searchResults.length > 0 && filteredCandidates.length === 0 && (
              <div className="py-12 text-center text-slate-400 text-xs">
                No candidates match the filter keyword "<strong>{filterText}</strong>".
              </div>
            )}

          </div>

        </div>
        )}

      </main>

      {/* In-Browser Canvas PDF Preview Modal */}
      {showPdfModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 z-50 animate-fadeIn">
          <div className="bg-slate-900 rounded-2xl w-full max-w-5xl h-[94vh] flex flex-col overflow-hidden shadow-2xl border border-slate-700">
            {/* Modal Topbar */}
            <div className="bg-slate-900 text-white px-5 sm:px-6 py-3.5 flex items-center justify-between gap-3 border-b border-slate-800">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
                  <FaIdCard />
                </div>
                <div className="truncate">
                  <h3 className="font-bold text-sm sm:text-base truncate">
                    Admit Card: {activeCandidate?.fullName} ({activeCandidate?.registrationNo})
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    DELED 2026 Official Examination Pass
                  </p>
                </div>
              </div>

              {/* Action Buttons: Print, Download, Close */}
              <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={triggerPrint}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold rounded-lg border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                  title="Print Admit Card"
                >
                  <FaPrint />
                  <span className="hidden sm:inline">Print</span>
                </button>
                <button
                  type="button"
                  onClick={triggerDownload}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                  title="Download PDF File"
                >
                  <FaDownload />
                  <span className="hidden sm:inline">Download PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPdfModal(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg transition cursor-pointer text-base ml-1"
                  title="Close Preview"
                >
                  <FaTimes />
                </button>
              </div>
            </div>

            {/* In-Browser Canvas PDF Viewer with DPI scaling & zoom controls */}
            <div className="flex-1 overflow-hidden relative">
              {pdfBlob ? (
                <PdfViewer pdfBlob={pdfBlob} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm">
                  Loading preview...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
}
