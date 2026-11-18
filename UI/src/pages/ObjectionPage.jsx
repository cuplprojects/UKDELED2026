import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { api } from "../stores/apiStore";
import ObjectionRouteGuard from "../components/ObjectionRouteGuard";
import {
  FaUserGraduate,
  FaFileAlt,
  FaTrash,
  FaEdit,
  FaUpload,
  FaCheckCircle,
  FaExclamationTriangle,
  FaLock,
  FaPrint,
  FaArrowLeft,
  FaInfoCircle,
  FaTimes,
  FaFilePdf,
  FaEye,
  FaSpinner,
  FaDownload,
  FaBook,
  FaKey,
  FaExternalLinkAlt,
} from "react-icons/fa";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.js?url";

if (typeof window !== "undefined" && pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    pdfWorker ||
    "/pdf.worker.min.js" ||
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || "3.11.174"}/pdf.worker.min.js`;
}

// Utility to inspect PDF page count
const countPdfPages = async (file) => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    try {
      if (pdfjsLib && pdfjsLib.getDocument) {
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const doc = await loadingTask.promise;
        if (doc && doc.numPages) return doc.numPages;
      }
    } catch (e) {
      console.warn("pdfjsLib getDocument notice:", e);
    }

    // Binary fallback scan for /Type /Pages /Count or /Type /Page
    const text = new TextDecoder("latin1").decode(new Uint8Array(arrayBuffer));
    const countMatch = text.match(/\/Type\s*\/Pages[\s\S]*?\/Count\s+(\d+)/i);
    if (countMatch && countMatch[1]) {
      return parseInt(countMatch[1], 10);
    }
    const pageMatches = text.match(/\/Type\s*\/Page\b/g);
    return pageMatches ? pageMatches.length : 1;
  } catch (err) {
    console.error("Error determining PDF page count:", err);
    return 1;
  }
};

const BOOKLET_SERIES = ["A", "B", "C", "D"];
const OPTIONS = ["A", "B", "C", "D"];

const ObjectionPage = () => {
  const [loading, setLoading] = useState(true);
  const [candidate, setCandidate] = useState(null);
  const [objections, setObjections] = useState([]);
  const [isFinalSubmitted, setIsFinalSubmitted] = useState(false);
  const [finalSubmittedOn, setFinalSubmittedOn] = useState(null);

  // Form State
  const [bookletSeries, setBookletSeries] = useState("A");
  const [questionNo, setQuestionNo] = useState("");
  const [questionError, setQuestionError] = useState("");
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [specialOption, setSpecialOption] = useState(null); // 'ALL_OF_THE_ABOVE' | 'NONE_OF_THESE' | null
  const [description, setDescription] = useState("");
  const [documentFile, setDocumentFile] = useState(null);
  const [fileChecking, setFileChecking] = useState(false);

  // Edit Mode
  const [editingId, setEditingId] = useState(null);

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [showFinalModal, setShowFinalModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [previewDocUrl, setPreviewDocUrl] = useState(null);

  // Booklets & Answer Keys State
  const [bookletsInfo, setBookletsInfo] = useState([]);
  const [bookletModal, setBookletModal] = useState({
    isOpen: false,
    title: "",
    url: null,
    downloadUrl: "",
    series: "",
    type: "",
  });

  const fileInputRef = useRef(null);

  // Load candidate info and existing objections
  const loadCandidateData = async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const res = await api.get("/api/Objection/candidate-info");
      if (res.data) {
        setCandidate(res.data);
        setIsFinalSubmitted(res.data.isFinalSubmitted || false);
        setFinalSubmittedOn(res.data.finalSubmittedOn || null);
        if (Array.isArray(res.data.objections)) {
          setObjections(res.data.objections);
          if (res.data.objections.length > 0 && res.data.objections[0].bookletSeries) {
            setBookletSeries(res.data.objections[0].bookletSeries);
          }
        }
      }
    } catch (err) {
      console.error("Error loading candidate objection info:", err);
      setErrorMessage(err.response?.data?.message || "Failed to load candidate information.");
    } finally {
      setLoading(false);
    }
  };

  // Load Question Booklets & Answer Keys info
  const loadBooklets = async () => {
    try {
      const res = await api.get("/api/Objection/booklets");
      if (res.data?.success && Array.isArray(res.data.booklets)) {
        setBookletsInfo(res.data.booklets);
      }
    } catch (err) {
      console.log("Booklets info notice:", err);
    }
  };

  useEffect(() => {
    loadCandidateData();
    loadBooklets();
  }, []);

  // View Booklet or Answer Key in Modal
  const handleViewBookletOrKey = async (series, type) => {
    try {
      const isKey = type === "answerkey" || type === "answer";
      const title = isKey
        ? `उत्तर कुंजी (Official Answer Key) - सीरीज ${series}`
        : `प्रश्न पुस्तिका (Question Booklet) - सीरीज ${series}`;

      const res = await api.get(`/api/Objection/booklet-file?series=${series}&type=${type}&download=false`, {
        responseType: "blob",
      });
      const blobUrl = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      setBookletModal({
        isOpen: true,
        title,
        url: blobUrl,
        downloadUrl: `/api/Objection/booklet-file?series=${series}&type=${type}&download=true`,
        series,
        type,
      });
    } catch (err) {
      let errMsg = err.message;
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          if (json?.message) errMsg = json.message;
        } catch (_) {}
      } else if (err.response?.data?.message) {
        errMsg = err.response.data.message;
      }
      alert("फाइल लोड करने में असमर्थ (File not available): " + errMsg);
    }
  };

  // Direct download Booklet or Answer Key
  const handleDownloadBookletOrKey = async (series, type) => {
    try {
      const isKey = type === "answerkey" || type === "answer";
      const res = await api.get(`/api/Objection/booklet-file?series=${series}&type=${type}&download=true`, {
        responseType: "blob",
      });
      const blobUrl = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = isKey
        ? `UKDELED_2026_AnswerKey_Series_${series}.pdf`
        : `UKDELED_2026_QuestionBooklet_Series_${series}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (err) {
      let errMsg = err.message;
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          if (json?.message) errMsg = json.message;
        } catch (_) {}
      } else if (err.response?.data?.message) {
        errMsg = err.response.data.message;
      }
      alert("डाउनलोड करने में असमर्थ (Download not available): " + errMsg);
    }
  };

  const closeBookletModal = () => {
    if (bookletModal.url) {
      URL.revokeObjectURL(bookletModal.url);
    }
    setBookletModal({
      isOpen: false,
      title: "",
      url: null,
      downloadUrl: "",
      series: "",
      type: "",
    });
  };

  // Real-time validation for Question Number
  const validateQuestionNumber = (val) => {
    if (val === "" || val === null || val === undefined) {
      setQuestionError("कृपया 1 से 200 के मध्य प्रश्न संख्या दर्ज करें (Enter Q. No 1 - 200)");
      return false;
    }
    const q = parseInt(val, 10);
    if (isNaN(q) || q < 1 || q > 200) {
      setQuestionError("प्रश्न संख्या केवल 1 से 200 के बीच होनी चाहिए (Question must be 1 to 200)");
      return false;
    }
    setQuestionError("");
    return true;
  };

  const handleQuestionChange = (e) => {
    const val = e.target.value;
    setQuestionNo(val);
    validateQuestionNumber(val);
  };

  // Toggle individual option (A, B, C, D) - supports multi-selection
  const handleToggleOption = (opt) => {
    setSpecialOption(null); // Clear special choice when clicking individual options
    setSelectedOptions((prev) => {
      if (prev.includes(opt)) {
        return prev.filter((x) => x !== opt);
      } else {
        return [...prev, opt].sort();
      }
    });
  };

  // Toggle special options: "ALL_OF_THE_ABOVE" or "NONE_OF_THESE"
  const handleSelectSpecial = (type) => {
    if (specialOption === type) {
      setSpecialOption(null);
    } else {
      setSpecialOption(type);
      setSelectedOptions([]); // Clear individual options
    }
  };

  // Reset Form
  const resetForm = () => {
    setEditingId(null);
    setQuestionNo("");
    setQuestionError("");
    setSelectedOptions([]);
    setSpecialOption(null);
    setDescription("");
    setDocumentFile(null);
    setFileChecking(false);
    if (objections.length > 0 && objections[0].bookletSeries) {
      setBookletSeries(objections[0].bookletSeries);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Populate form for editing
  const handleEdit = (item) => {
    setEditingId(item.id);
    setBookletSeries(item.bookletSeries || "A");
    setQuestionNo(item.questionNo.toString());
    setQuestionError("");

    const ans = (item.candidateAnswer || "").trim();
    const ansLower = ans.toLowerCase();

    if (ansLower.includes("all of the above") || ans.includes("उपर्युक्त सभी")) {
      setSpecialOption("ALL_OF_THE_ABOVE");
      setSelectedOptions([]);
    } else if (ansLower.includes("none") || ans.includes("कोई नहीं")) {
      setSpecialOption("NONE_OF_THESE");
      setSelectedOptions([]);
    } else {
      setSpecialOption(null);
      const matched = ans.match(/[ABCD]/g);
      if (matched && matched.length > 0) {
        setSelectedOptions([...new Set(matched)].sort());
      } else {
        setSelectedOptions([]);
      }
    }

    setDescription(item.description || "");
    setDocumentFile(null);
    setFileChecking(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    window.scrollTo({ top: 300, behavior: "smooth" });
  };

  // Handle Document Selection with File Size (<=5MB) and Page Count (<=3 pages for PDF)
  const handleDocumentChange = async (e) => {
    const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    if (!file) {
      setDocumentFile(null);
      return;
    }

    // 1. Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      alert("साक्ष्य दस्तावेज का आकार 5 MB से अधिक नहीं होना चाहिए (File size must not exceed 5 MB).");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setDocumentFile(null);
      return;
    }

    // 2. If PDF, strictly validate page count (<= 3 pages)
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (isPdf) {
      try {
        setFileChecking(true);
        const pages = await countPdfPages(file);
        if (pages > 3) {
          alert(
            `साक्ष्य दस्तावेज अधिकतम 3 पृष्ठों (3 Pages) का ही होना चाहिए।\n\nआपके द्वारा चयनित PDF में ${pages} पृष्ठ हैं। कृपया केवल अधिकतम 3 पृष्ठों का दस्तावेज अपलोड करें।\n(Uploaded PDF contains ${pages} pages. Maximum allowed is 3 pages.)`
          );
          if (fileInputRef.current) fileInputRef.current.value = "";
          setDocumentFile(null);
          return;
        }
      } catch (err) {
        console.error("Page count inspection error:", err);
      } finally {
        setFileChecking(false);
      }
    }

    setDocumentFile(file);
  };

  // Save Draft Objection
  const handleSaveObjection = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    // Frontend validation for single booklet series rule
    if (objections.length > 0 && objections[0].bookletSeries && bookletSeries !== objections[0].bookletSeries) {
      setErrorMessage(`अभ्यर्थी केवल एक ही सीरीज (${objections[0].bookletSeries}) में आपत्ति दर्ज कर सकते हैं (You can add objections only in Booklet Series ${objections[0].bookletSeries}).`);
      return;
    }

    // Frontend validation for question number
    const isValidQ = validateQuestionNumber(questionNo);
    const qNum = parseInt(questionNo, 10);

    if (!isValidQ || isNaN(qNum) || qNum < 1 || qNum > 200) {
      setErrorMessage("कृपया 1 से 200 के बीच वैध प्रश्न संख्या दर्ज करें (Please enter a valid Question Number between 1 and 200).");
      return;
    }

    // Determine final claimed answer
    let finalClaim = "";
    if (specialOption === "ALL_OF_THE_ABOVE") {
      finalClaim = "All of the above";
    } else if (specialOption === "NONE_OF_THESE") {
      finalClaim = "None of these";
    } else if (selectedOptions.length > 0) {
      finalClaim = [...selectedOptions].sort().join(", ");
    }

    if (!finalClaim) {
      setErrorMessage("कृपया अभ्यर्थी का दावा / उत्तर विकल्प चुनें (Please select one or more options, None of these, or All of the above).");
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append("ExamName", candidate?.examName || "UK D.El.Ed. Entrance Examination 2026");
      formData.append("BookletSeries", bookletSeries);
      formData.append("QuestionNo", qNum);
      formData.append("CandidateAnswer", finalClaim);
      formData.append("Description", description || "");
      if (documentFile) {
        formData.append("DocumentFile", documentFile);
      }

      if (editingId) {
        // Update
        const res = await api.post(`/api/Objection/update/${editingId}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setSuccessMessage(res.data?.message || `Question #${qNum} challenge updated.`);
      } else {
        // Create new
        const res = await api.post("/api/Objection/submit", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setSuccessMessage(res.data?.message || `Question #${qNum} challenge saved to drafts.`);
      }

      resetForm();
      await loadCandidateData();
    } catch (err) {
      console.error("Error saving objection:", err);
      setErrorMessage(err.response?.data?.message || "Failed to save objection. Please check inputs.");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Draft
  const handleDelete = async (id, qNum) => {
    if (!window.confirm(`Are you sure you want to remove draft objection for Question #${qNum}?`)) {
      return;
    }
    try {
      setLoading(true);
      setErrorMessage("");
      const res = await api.delete(`/api/Objection/delete/${id}`);
      setSuccessMessage(res.data?.message || `Question #${qNum} objection removed.`);
      if (editingId === id) resetForm();
      await loadCandidateData();
    } catch (err) {
      console.error("Error deleting objection:", err);
      setErrorMessage(err.response?.data?.message || "Failed to delete objection.");
    } finally {
      setLoading(false);
    }
  };

  // Final Submit
  const handleFinalSubmit = async () => {
    try {
      setSubmitting(true);
      setErrorMessage("");
      const res = await api.post("/api/Objection/final-submit");
      setSuccessMessage(res.data?.message || "Objections successfully Final Submitted and locked.");
      setShowFinalModal(false);
      await loadCandidateData();
    } catch (err) {
      console.error("Error in final submission:", err);
      setErrorMessage(err.response?.data?.message || "Final submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  // Document Viewer
  const handleViewDoc = async (id) => {
    try {
      const res = await api.get(`/api/Objection/document/${id}`, { responseType: "blob" });
      const blobUrl = URL.createObjectURL(res.data);
      setPreviewDocUrl(blobUrl);
    } catch (err) {
      alert("Unable to open proof document: " + (err.response?.data?.message || err.message));
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  if (loading && !candidate) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-600 font-medium text-sm">लोड हो रहा है... (Loading Candidate Workspace)</p>
      </div>
    );
  }

  return (
    <ObjectionRouteGuard>
      <div className="min-h-screen bg-slate-100/70 py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden no-print">
            <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-800 text-white p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-700/60 text-blue-100 text-xs font-semibold tracking-wide uppercase">
                      उत्तराखण्ड द्विवर्षीय डी०एल०एड० 2026
                    </span>
                    {isFinalSubmitted ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500 text-white text-xs font-bold">
                        <FaLock className="text-xs" /> अंतिम रूप से जमा (Locked)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400 text-amber-950 text-xs font-bold">
                        ड्राफ्ट मोड (Draft Mode)
                      </span>
                    )}
                  </div>
                  <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                    अनंतिम उत्तर कुंजी आपत्ति प्रबंधन पोर्टल
                  </h1>
                  <p className="text-xs sm:text-sm text-blue-200 mt-0.5">
                    Provisional Answer Key Challenge System (Candidate Portal)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    to="/application"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition"
                  >
                    <FaArrowLeft /> डैशबोर्ड
                  </Link>
                  <Link
                    to="/objection-instructions"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition"
                  >
                    <FaFileAlt /> निर्देश (Instructions)
                  </Link>
                  {isFinalSubmitted && (
                    <button
                      type="button"
                      onClick={handlePrintReceipt}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition shadow-sm"
                    >
                      <FaPrint /> रसीद प्रिंट करें
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Candidate Metadata Strip */}
            <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 sm:px-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block">पंजीकरण संख्या (Reg No)</span>
                  <span className="font-bold text-slate-800 text-sm">{candidate?.registrationNo || "-"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">अभ्यर्थी का नाम (Candidate)</span>
                  <span className="font-bold text-slate-800 text-sm">{candidate?.fullName || "-"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">अनुक्रमांक (Roll Number)</span>
                  <span className="font-bold text-blue-800 text-sm">{candidate?.rollNo || "-"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">आवेदित वर्ग (Applied Stream)</span>
                  <span className="font-bold text-slate-800 text-sm">{candidate?.appliedCategory || "-"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Feedback Messages */}
          {errorMessage && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl flex items-center justify-between text-red-800 text-sm no-print">
              <div className="flex items-center gap-2">
                <FaExclamationTriangle className="text-red-500 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button onClick={() => setErrorMessage("")} className="text-red-500 hover:text-red-700">
                <FaTimes />
              </button>
            </div>
          )}
          {successMessage && (
            <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-xl flex items-center justify-between text-emerald-800 text-sm no-print">
              <div className="flex items-center gap-2">
                <FaCheckCircle className="text-emerald-500 flex-shrink-0" />
                <span>{successMessage}</span>
              </div>
              <button onClick={() => setSuccessMessage("")} className="text-emerald-500 hover:text-emerald-700">
                <FaTimes />
              </button>
            </div>
          )}

          {/* If NOT Final Submitted -> Objection Entry Form */}
          {!isFinalSubmitted ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 no-print space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                  <FaEdit className="text-blue-700" />
                  {editingId ? `प्रश्न संख्या #${questionNo} पर आपत्ति संपादित करें` : "नई प्रश्न आपत्ति दर्ज करें (Add Question Challenge)"}
                </h2>
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-xs text-red-600 hover:text-red-800 font-semibold underline"
                  >
                    संपादित करना रद्द करें (Cancel Edit)
                  </button>
                )}
              </div>

              <form onSubmit={handleSaveObjection} className="space-y-5">
                {/* Row 1: Booklet Series, Question Number (1-200), Candidate Claim */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                  {/* Booklet Series */}
                  <div className="sm:col-span-6 lg:col-span-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase">
                        सीरीज (Series) <span className="text-red-500">*</span>
                      </label>
                      {objections.length > 0 && objections[0].bookletSeries && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          सीरीज लॉक (Locked: {objections[0].bookletSeries})
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {BOOKLET_SERIES.map((s) => {
                        const isLocked = objections.length > 0 && objections[0].bookletSeries && objections[0].bookletSeries !== s;
                        return (
                          <button
                            key={s}
                            type="button"
                            disabled={isLocked}
                            onClick={() => {
                              if (!isLocked) setBookletSeries(s);
                            }}
                            className={`py-2 text-center rounded-lg font-extrabold text-sm border transition ${
                              bookletSeries === s
                                ? "bg-blue-700 text-white border-blue-700 shadow-sm ring-2 ring-blue-400"
                                : isLocked
                                ? "bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed opacity-60"
                                : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100 cursor-pointer"
                            }`}
                            title={isLocked ? `आप केवल सीरीज ${objections[0].bookletSeries} में ही आपत्ति दर्ज कर सकते हैं` : `Series ${s}`}
                          >
                            {s}
                          </button>
                        );
                      })}
                    </div>
                    {objections.length > 0 && objections[0].bookletSeries && (
                      <p className="text-[10px] text-amber-800 font-medium mt-1">
                        * एक अभ्यर्थी केवल एक ही सीरीज ({objections[0].bookletSeries}) में आपत्ति दर्ज कर सकता है।
                      </p>
                    )}

                    {/* Small clean links showing only the candidate's selected series */}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2 text-xs">
                      <span className="font-semibold text-slate-500 text-[11px]">सीरीज {bookletSeries}:</span>
                      <button
                        type="button"
                        onClick={() => handleViewBookletOrKey(bookletSeries, "booklet")}
                        className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900 font-bold hover:underline cursor-pointer text-xs"
                      >
                        <FaEye className="text-blue-600 text-xs" /> पुस्तिका देखें
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadBookletOrKey(bookletSeries, "booklet")}
                        className="text-slate-400 hover:text-blue-700 transition cursor-pointer"
                        title={`सीरीज ${bookletSeries} पुस्तिका डाउनलोड करें`}
                      >
                        <FaDownload className="text-[10px]" />
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => handleViewBookletOrKey(bookletSeries, "answerkey")}
                        className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-bold hover:underline cursor-pointer text-xs"
                      >
                        <FaKey className="text-amber-500 text-xs" /> उत्तर कुंजी देखें
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadBookletOrKey(bookletSeries, "answerkey")}
                        className="text-slate-400 hover:text-emerald-700 transition cursor-pointer"
                        title={`सीरीज ${bookletSeries} उत्तर कुंजी डाउनलोड करें`}
                      >
                        <FaDownload className="text-[10px]" />
                      </button>
                    </div>
                  </div>

                  {/* Manual Question Number Input (Range 1-200) */}
                  <div className="sm:col-span-6 lg:col-span-3">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      प्रश्न संख्या (Question No. 1 - 200) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max="200"
                        step="1"
                        value={questionNo}
                        onChange={handleQuestionChange}
                        onBlur={() => validateQuestionNumber(questionNo)}
                        required
                        placeholder="1 - 200"
                        className={`w-full px-3 py-2 border rounded-lg text-sm font-extrabold text-slate-900 focus:ring-2 ${
                          questionError
                            ? "border-red-500 focus:ring-red-400 bg-red-50/30"
                            : "border-slate-300 focus:ring-blue-500 focus:border-blue-500"
                        }`}
                      />
                    </div>
                    {questionError ? (
                      <span className="text-[11px] text-red-600 font-semibold mt-1 block">
                        {questionError}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500 mt-1 block">
                        मान्य रेंज: 1 से 200 (Valid range: 1 to 200)
                      </span>
                    )}
                  </div>

                  {/* Candidate Claim (Supports Multiple Selection, None of these, All of the above) */}
                  <div className="sm:col-span-12 lg:col-span-6">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        अभ्यर्थी का दावा (Claimed Answer) <span className="text-red-500">*</span>
                      </label>
                      <span className="text-[10px] text-blue-700 font-semibold">
                        (बहु-विकल्प / विशेष विकल्प चयन अनुमन्य)
                      </span>
                    </div>

                    <div className="space-y-2">
                      {/* Individual Options A, B, C, D (Multi-Selectable) */}
                      <div className="grid grid-cols-4 gap-1.5">
                        {OPTIONS.map((opt) => {
                          const isSelected = selectedOptions.includes(opt);
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => handleToggleOption(opt)}
                              className={`py-2 text-center rounded-lg font-black text-sm border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                                isSelected
                                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-400"
                                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                              }`}
                              title={`Option ${opt} चयन करें (Click to toggle)`}
                            >
                              <span>Option {opt}</span>
                              {isSelected && <FaCheckCircle className="text-xs" />}
                            </button>
                          );
                        })}
                      </div>

                      {/* Special Options: All of the above & None of these */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleSelectSpecial("ALL_OF_THE_ABOVE")}
                          className={`py-2 px-2 text-center rounded-lg font-bold text-xs border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                            specialOption === "ALL_OF_THE_ABOVE"
                              ? "bg-blue-700 text-white border-blue-700 shadow-sm ring-2 ring-blue-400"
                              : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                          }`}
                        >
                          <span>उपर्युक्त सभी (All of the above)</span>
                          {specialOption === "ALL_OF_THE_ABOVE" && <FaCheckCircle className="text-xs" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSelectSpecial("NONE_OF_THESE")}
                          className={`py-2 px-2 text-center rounded-lg font-bold text-xs border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                            specialOption === "NONE_OF_THESE"
                              ? "bg-purple-700 text-white border-purple-700 shadow-sm ring-2 ring-purple-400"
                              : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                          }`}
                        >
                          <span>इनमें से कोई नहीं (None of these)</span>
                          {specialOption === "NONE_OF_THESE" && <FaCheckCircle className="text-xs" />}
                        </button>
                      </div>

                      {/* Realtime Selection Feedback Indicator */}
                      <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">आपका दावा (Selected Claim):</span>
                        {specialOption === "ALL_OF_THE_ABOVE" ? (
                          <span className="font-extrabold text-blue-800 bg-blue-100 px-2 py-0.5 rounded">
                            All of the above (उपर्युक्त सभी)
                          </span>
                        ) : specialOption === "NONE_OF_THESE" ? (
                          <span className="font-extrabold text-purple-800 bg-purple-100 px-2 py-0.5 rounded">
                            None of these (इनमें से कोई नहीं)
                          </span>
                        ) : selectedOptions.length > 0 ? (
                          <span className="font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                            Option {selectedOptions.join(", ")}
                            {selectedOptions.length > 1 && " (Multiple Options)"}
                          </span>
                        ) : (
                          <span className="font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                            कोई विकल्प चयनित नहीं (Please select an option)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Row 2: Justification & Proof Upload */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {/* Academic Justification */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      आपत्ति का आधार / विवरण (Academic Justification / Book Reference)
                    </label>
                    <textarea
                      rows="3"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="पुस्तक का नाम, लेखक, संस्करण, पृष्ठ संख्या एवं संक्षिप्त व्याख्या दर्ज करें..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
                    ></textarea>
                  </div>

                  {/* Proof Document File */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        प्रामाणिक साक्ष्य संलग्न करें (Documentary Proof)
                      </label>
                      <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        अधिकतम 3 पृष्ठ (Max 3 Pages)
                      </span>
                    </div>
                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-3 text-center bg-slate-50/60 hover:bg-slate-50 transition">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleDocumentChange}
                        className="hidden"
                        id="objection-proof-file"
                      />
                      <label htmlFor="objection-proof-file" className="cursor-pointer block">
                        {fileChecking ? (
                          <div className="flex flex-col items-center justify-center py-1">
                            <FaSpinner className="animate-spin text-blue-600 text-lg mb-1" />
                            <span className="text-xs font-semibold text-blue-700">
                              पृष्ठ संख्या जांची जा रही है (Verifying page count...)...
                            </span>
                          </div>
                        ) : (
                          <>
                            <FaUpload className="mx-auto text-slate-400 text-lg mb-1" />
                            <span className="text-xs font-semibold text-blue-700 hover:underline">
                              {documentFile ? documentFile.name : "दस्तावेज चुनें (Click to choose file)"}
                            </span>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              {documentFile
                                ? `${(documentFile.size / 1024 / 1024).toFixed(2)} MB चयनित (मान्य साक्ष्य)`
                                : "PDF या Image (अधिकतम 5 MB एवं अधिकतम 3 पृष्ठ)"}
                            </p>
                          </>
                        )}
                      </label>
                    </div>
                  </div>
                </div>

                {/* Form Buttons */}
                <div className="pt-2 flex items-center justify-end gap-3">
                  {editingId && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100"
                    >
                      रद्द करें (Cancel)
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <FaCheckCircle />
                    {submitting
                      ? "सहेजा जा रहा है..."
                      : editingId
                      ? "आपत्ति अपडेट करें (Update Challenge)"
                      : "ड्राफ्ट आपत्ति जोड़ें (Save Draft Challenge)"}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* Locked State Advisory */
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-emerald-900 no-print flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xl flex-shrink-0">
                  <FaLock />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">आपत्ति आवेदन अंतिम रूप से जमा एवं लॉक हो चुका है</h3>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Your challenges have been permanently locked on{" "}
                    {finalSubmittedOn
                      ? new Date(finalSubmittedOn).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
                      : "N/A"}{" "}
                    IST. Any further modifications are disallowed.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handlePrintReceipt}
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition shadow-sm flex items-center gap-2 whitespace-nowrap cursor-pointer"
              >
                <FaPrint /> रसीद प्रिंट करें (Print Confirmation)
              </button>
            </div>
          )}

          {/* Draft/Submitted Objections Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden no-print">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
                  <FaFileAlt className="text-blue-700" />
                  दर्ज की गई आपत्तियों की सूची (List of Challenged Questions)
                  <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-bold">
                    कुल: {objections.length}
                  </span>
                </h3>
              </div>

              {!isFinalSubmitted && objections.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowFinalModal(true)}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  <FaLock /> अंतिम रूप से जमा करें (Final Submit & Lock)
                </button>
              )}
            </div>

            {objections.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <FaInfoCircle className="mx-auto text-3xl text-slate-300 mb-2" />
                <p className="text-sm font-medium">अभी तक कोई आपत्ति दर्ज नहीं की गई है।</p>
                <p className="text-xs mt-1">
                  ऊपर दिए गए फॉर्म में प्रश्न संख्या (1 - 200) एवं साक्ष्य भरकर "ड्राफ्ट आपत्ति जोड़ें" पर क्लिक करें।
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 uppercase font-bold text-[11px] text-slate-600">
                    <tr>
                      <th className="py-3 px-3 text-center">क्र०</th>
                      <th className="py-3 px-3 text-center">सीरीज</th>
                      <th className="py-3 px-3 text-center">प्रश्न संख्या (1 - 200)</th>
                      <th className="py-3 px-3 text-center">अभ्यर्थी का दावा (Claimed Answer)</th>
                      <th className="py-3 px-3">साक्ष्य (Proof)</th>
                      <th className="py-3 px-3">स्थिति (Status)</th>
                      {!isFinalSubmitted && <th className="py-3 px-3 text-center">कार्रवाई (Action)</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {objections.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-3 text-center font-semibold text-slate-500">{idx + 1}</td>
                        <td className="py-3 px-3 text-center font-extrabold text-blue-800">{item.bookletSeries}</td>
                        <td className="py-3 px-3 text-center">
                          <span className="inline-block px-3 py-1 bg-slate-900 text-white font-extrabold rounded-md text-xs">
                            Q. {item.questionNo}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-emerald-700">{item.candidateAnswer}</td>
                        <td className="py-3 px-3">
                          {item.documentPath ? (
                            <button
                              type="button"
                              onClick={() => handleViewDoc(item.id)}
                              className="inline-flex items-center gap-1 text-blue-700 hover:underline font-semibold"
                            >
                              <FaEye /> देखें
                            </button>
                          ) : (
                            <span className="text-slate-400 italic">None</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.status === "Accepted"
                                ? "bg-emerald-100 text-emerald-800"
                                : item.status === "Rejected"
                                ? "bg-red-100 text-red-800"
                                : item.status === "Under Review"
                                ? "bg-purple-100 text-purple-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {item.status || "Submitted"}
                          </span>
                        </td>
                        {!isFinalSubmitted && (
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleEdit(item)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition"
                                title="Edit"
                              >
                                <FaEdit />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(item.id, item.questionNo)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
                                title="Delete"
                              >
                                <FaTrash />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Printable Official Confirmation Receipt */}
          <div className="print-only bg-white p-8 border border-slate-300 rounded-xl space-y-6">
            <div className="text-center border-b-2 border-slate-800 pb-4">
              <h2 className="text-xl font-extrabold uppercase tracking-wide">
                उत्तराखण्ड विद्यालयी शिक्षा परिषद्, रामनगर (नैनीताल)
              </h2>
              <h3 className="text-base font-bold text-slate-800 mt-1">
                द्विवर्षीय डी०एल०एड० प्रवेश परीक्षा - 2026
              </h3>
              <p className="text-sm font-semibold text-slate-600 mt-0.5">
                अनंतिम उत्तर कुंजी आपत्ति रसीद (Objection Confirmation Slip)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs border border-slate-300 p-4 rounded-lg bg-slate-50">
              <div>
                <p><strong>पंजीकरण संख्या (Registration No):</strong> {candidate?.registrationNo}</p>
                <p className="mt-1"><strong>अभ्यर्थी का नाम (Candidate Name):</strong> {candidate?.fullName}</p>
                <p className="mt-1"><strong>पिता का नाम (Father's Name):</strong> {candidate?.fatherName}</p>
              </div>
              <div>
                <p><strong>अनुक्रमांक (Roll No):</strong> {candidate?.rollNo || "-"}</p>
                <p className="mt-1"><strong>आवेदित वर्ग (Applied Category):</strong> {candidate?.appliedCategory}</p>
                <p className="mt-1">
                  <strong>अंतिम सबमिशन तिथि (Submitted On):</strong>{" "}
                  {finalSubmittedOn ? new Date(finalSubmittedOn).toLocaleString("en-IN") : "Draft"}
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase mb-2">चुनौती दिए गए प्रश्नों का विवरण (Contested Questions):</h4>
              <table className="w-full text-left text-xs border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-200">
                    <th className="border border-slate-300 p-2 text-center">क्र०</th>
                    <th className="border border-slate-300 p-2 text-center">सीरीज</th>
                    <th className="border border-slate-300 p-2 text-center">प्रश्न सं० (1 - 200)</th>
                    <th className="border border-slate-300 p-2 text-center">अभ्यर्थी का दावा (Claimed Answer)</th>
                    <th className="border border-slate-300 p-2">साक्ष्य स्थिति</th>
                  </tr>
                </thead>
                <tbody>
                  {objections.map((o, idx) => (
                    <tr key={o.id}>
                      <td className="border border-slate-300 p-2 text-center">{idx + 1}</td>
                      <td className="border border-slate-300 p-2 text-center font-bold">{o.bookletSeries}</td>
                      <td className="border border-slate-300 p-2 text-center font-bold">Q. {o.questionNo}</td>
                      <td className="border border-slate-300 p-2 text-center font-bold">{o.candidateAnswer}</td>
                      <td className="border border-slate-300 p-2">{o.documentPath ? "Attached" : "None"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-slate-300 pt-4 text-[11px] text-slate-600 leading-relaxed space-y-1">
              <p><strong>घोषणा (Declaration):</strong> प्रमाणित किया जाता है कि मेरे द्वारा अनंतिम उत्तर कुंजी पर दर्ज कराई गई समस्त आपत्तियां सत्य एवं प्रामाणिक हैं।</p>
              <p>नोट: यह कम्प्यूटर जनित पुष्टि पर्ची (Computer-generated Confirmation Slip) है, जिस पर हस्ताक्षर की आवश्यकता नहीं है।</p>
            </div>
          </div>
        </div>

        {/* Final Submission Modal */}
        {showFinalModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm no-print">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
              <div className="bg-red-700 text-white p-5 text-center">
                <FaLock className="mx-auto text-3xl mb-2" />
                <h3 className="text-lg font-bold">क्या आप अंतिम रूप से जमा करना चाहते हैं?</h3>
                <p className="text-xs text-red-100 mt-1">Final Submission & Lock Confirmation</p>
              </div>

              <div className="p-6 space-y-4 text-xs text-slate-700 leading-relaxed">
                <p className="font-semibold text-slate-900">
                  कृपया ध्यानपूर्वक जाँच लें: आपने कुल <span className="text-red-700 font-bold">{objections.length}</span> प्रश्नों पर आपत्ति दर्ज की है।
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-900">
                  <FaExclamationTriangle className="inline mr-1.5 text-amber-600" />
                  <strong>महत्वपूर्ण चेतावनी:</strong> "Final Submit" करने के पश्चात आप किसी भी प्रश्न की आपत्ति को न तो संपादित कर सकेंगे और न ही हटा अथवा नई आपत्ति जोड़ सकेंगे।
                </div>
                <p>Are you sure you want to permanently lock and submit these objections?</p>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowFinalModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-100 cursor-pointer"
                >
                  रद्द करें (Cancel)
                </button>
                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-red-700 hover:bg-red-800 text-white font-bold text-xs transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "जमा हो रहा है..." : "हाँ, अंतिम रूप से जमा करें (Confirm Lock)"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Evidence Document Preview Modal */}
        {previewDocUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm no-print">
            <div className="max-w-3xl w-full h-[80vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
              <div className="p-4 bg-slate-800 text-white flex items-center justify-between">
                <span className="font-bold text-sm flex items-center gap-2">
                  <FaFilePdf /> साक्ष्य दस्तावेज पूर्वावलोकन (Evidence Document Preview)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    URL.revokeObjectURL(previewDocUrl);
                    setPreviewDocUrl(null);
                  }}
                  className="text-white hover:text-red-400 font-bold text-lg cursor-pointer"
                >
                  <FaTimes />
                </button>
              </div>
              <div className="flex-1 bg-slate-100 p-2">
                <iframe src={previewDocUrl} title="Document Preview" className="w-full h-full rounded border-0" />
              </div>
            </div>
          </div>
        )}

        {/* Question Booklet & Answer Key Modal */}
        {bookletModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-sm no-print">
            <div className="max-w-4xl w-full h-[88vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fadeIn">
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FaFilePdf className="text-red-400 text-lg" />
                  <span className="font-bold text-sm sm:text-base">
                    {bookletModal.title}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleDownloadBookletOrKey(bookletModal.series, bookletModal.type)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
                  >
                    <FaDownload /> डाउनलोड करें
                  </button>
                  <button
                    type="button"
                    onClick={closeBookletModal}
                    className="text-slate-300 hover:text-white p-1 text-lg rounded-lg hover:bg-slate-800 transition cursor-pointer"
                  >
                    <FaTimes />
                  </button>
                </div>
              </div>
              <div className="flex-1 bg-slate-100 p-2">
                {bookletModal.url ? (
                  <iframe
                    src={bookletModal.url}
                    title="Booklet / Key Preview"
                    className="w-full h-full rounded-xl border border-slate-300 shadow-inner"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm">
                    दस्तावेज लोड हो रहा है...
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </ObjectionRouteGuard>
  );
};

export default ObjectionPage;
