import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { message } from "antd";
import { api } from "../stores/apiStore";
import Layout from "../components/Layout";
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
  const [bookletSeries, setBookletSeries] = useState("");
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
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { id, qNum }
  const [fileError, setFileError] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [previewDocUrl, setPreviewDocUrl] = useState(null);

  // Booklets & Answer Keys State
  const [bookletsInfo, setBookletsInfo] = useState([]);

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

  // Direct URL for Question Booklet or Answer Key PDF
  const getBookletUrl = (series, type, download = false) => {
    const apiBase = import.meta.env.VITE_API_URL || "";
    const cleanBase = apiBase.endsWith("/") ? apiBase.slice(0, -1) : apiBase;
    return `${cleanBase}/api/Objection/booklet-file?series=${encodeURIComponent(series)}&type=${encodeURIComponent(type)}&download=${download}`;
  };

  // View Booklet or Answer Key directly as PDF on its URL page
  const handleViewBookletOrKey = (series, type) => {
    if (!series) {
      message.warning("Please select a booklet series first.");
      return;
    }
    const url = getBookletUrl(series, type, false);
    window.open(url, "_blank");
  };

  // Direct download Booklet or Answer Key
  const handleDownloadBookletOrKey = (series, type) => {
    if (!series) {
      message.warning("Please select a booklet series first.");
      return;
    }
    const url = getBookletUrl(series, type, true);
    window.open(url, "_blank");
  };

  // Real-time validation for Question Number
  const validateQuestionNumber = (val) => {
    if (val === "" || val === null || val === undefined) {
      setQuestionError("");
      return false;
    }
    const q = parseInt(val, 10);
    if (isNaN(q) || q < 1 || q > 200) {
      setQuestionError("Question number must be between 1 and 200");
      return false;
    }
    setQuestionError("");
    return true;
  };

  const handleQuestionChange = (e) => {
    const val = e.target.value;
    setQuestionNo(val);
    const valid = validateQuestionNumber(val);
    if (!val || !val.trim() || !valid) {
      setSelectedOptions([]);
      setSpecialOption(null);
    }
  };

  const handleQuestionBlur = () => {
    if (questionNo === "" || questionNo === null || questionNo === undefined) {
      if (bookletSeries) {
        setQuestionError("Please enter a Question Number between 1 and 200");
      }
    } else {
      validateQuestionNumber(questionNo);
    }
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
    setFileError("");
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

  // Handle Document Selection with File Size (<=5MB) and Page Count (<=5 pages for PDF)
  const handleDocumentChange = async (e) => {
    const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    if (!file) {
      setDocumentFile(null);
      setFileError("");
      return;
    }

    // 1. Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      const msg = "Proof document size must not exceed 5 MB.";
      setFileError(msg);
      message.error(msg);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setDocumentFile(null);
      return;
    }

    // 2. If PDF, strictly validate page count (<= 5 pages)
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (isPdf) {
      try {
        setFileChecking(true);
        const pages = await countPdfPages(file);
        if (pages > 5) {
          const msg = `Proof document must not exceed 5 pages. (Uploaded PDF contains ${pages} pages).`;
          setFileError(msg);
          message.error(msg);
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

    setFileError("");
    setDocumentFile(file);
  };

  // Save Draft Objection
  const handleSaveObjection = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    // Frontend validation for booklet series selection
    if (!bookletSeries) {
      const msg = "Please select your Question Booklet Series above first.";
      setErrorMessage(msg);
      message.warning(msg);
      return;
    }

    // Frontend validation for single booklet series rule
    if (objections.length > 0 && objections[0].bookletSeries && bookletSeries !== objections[0].bookletSeries) {
      const msg = `You can submit objections only in Booklet Series ${objections[0].bookletSeries}.`;
      setErrorMessage(msg);
      message.warning(msg);
      return;
    }

    // Frontend validation for question number
    const isValidQ = validateQuestionNumber(questionNo);
    const qNum = parseInt(questionNo, 10);

    if (!isValidQ || isNaN(qNum) || qNum < 1 || qNum > 200) {
      const msg = "Please enter a valid Question Number between 1 and 200.";
      setErrorMessage(msg);
      message.warning(msg);
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
      const msg = "Please select your claimed answer (Option A-D, All of the above, or None of these).";
      setErrorMessage(msg);
      message.warning(msg);
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append("ExamName", "UK D.El.Ed. Entrance Exam 2026");
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
        const successMsg = res.data?.message || `Question #${qNum} challenge updated.`;
        setSuccessMessage(successMsg);
        message.success(successMsg);
      } else {
        // Create new
        const res = await api.post("/api/Objection/submit", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        const successMsg = res.data?.message || `Question #${qNum} challenge saved to drafts.`;
        setSuccessMessage(successMsg);
        message.success(successMsg);
      }

      resetForm();
      await loadCandidateData();
    } catch (err) {
      console.error("Error saving objection:", err);
      const errMsg = err.response?.data?.message || "Failed to save objection. Please check inputs.";
      setErrorMessage(errMsg);
      message.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Draft Execution
  const executeDelete = async (id, qNum) => {
    try {
      setLoading(true);
      setErrorMessage("");
      const res = await api.delete(`/api/Objection/delete/${id}`);
      const successMsg = res.data?.message || `Question #${qNum} objection removed.`;
      setSuccessMessage(successMsg);
      message.success(successMsg);
      if (editingId === id) resetForm();
      await loadCandidateData();
    } catch (err) {
      console.error("Error deleting objection:", err);
      const errMsg = err.response?.data?.message || "Failed to delete objection.";
      setErrorMessage(errMsg);
      message.error(errMsg);
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
      const successMsg = res.data?.message || "Objections successfully Final Submitted and locked.";
      setSuccessMessage(successMsg);
      message.success(successMsg);
      setShowFinalModal(false);
      await loadCandidateData();
    } catch (err) {
      console.error("Error in final submission:", err);
      const errMsg = err.response?.data?.message || "Final submission failed.";
      setErrorMessage(errMsg);
      message.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // Document Viewer
  const getDocUrl = (docId) => {
    const rawBase = api.defaults.baseURL || "";
    if (rawBase.startsWith("http://") || rawBase.startsWith("https://")) {
      return `${rawBase.replace(/\/+$/, "")}/api/Objection/document/${docId}`;
    }
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const cleanBase = rawBase.replace(/\/+$/, "");
    return `${origin}${cleanBase}/api/Objection/document/${docId}`;
  };

  const handleViewDoc = async (id) => {
    try {
      const res = await api.get(`/api/Objection/document/${id}`, { responseType: "blob" });
      const blobUrl = URL.createObjectURL(res.data);
      setPreviewDocUrl(blobUrl);
    } catch (err) {
      const errMsg = "Unable to open proof document: " + (err.response?.data?.message || err.message);
      message.error(errMsg);
      setErrorMessage(errMsg);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  if (loading && !candidate) {
    return (
      <Layout className="min-h-screen flex flex-col bg-slate-50 font-sans">
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600 font-medium text-sm">Loading Candidate Workspace...</p>
        </div>
      </Layout>
    );
  }

  const isQuestionTyped = Boolean(
    bookletSeries &&
    questionNo &&
    questionNo.toString().trim() !== "" &&
    !questionError &&
    parseInt(questionNo, 10) >= 1 &&
    parseInt(questionNo, 10) <= 200
  );

  return (
    <Layout className="min-h-screen flex flex-col bg-slate-100/70 font-sans">
      {/* Printable Styling */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-objection-receipt, #printable-objection-receipt * {
            visibility: visible;
          }
          #printable-objection-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            display: block !important;
          }
          #printable-objection-receipt a {
            color: #1d4ed8 !important;
            text-decoration: underline !important;
          }
        }
      `}</style>

      <ObjectionRouteGuard>
        <div className="flex-1 py-6 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto space-y-6">
          {/* Header Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:hidden">
            <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-800 text-white p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-700/60 text-blue-100 text-xs font-semibold tracking-wide uppercase">
                      UK D.El.Ed. 2026
                    </span>
                    {isFinalSubmitted ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500 text-white text-xs font-bold">
                        <FaLock className="text-xs" /> Final Submitted (Locked)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400 text-amber-950 text-xs font-bold">
                        Draft Mode
                      </span>
                    )}
                  </div>
                  <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                    Answer Key Objection Portal
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
                    <FaArrowLeft /> Dashboard
                  </Link>
                  <Link
                    to="/objection-instructions"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition"
                  >
                    <FaFileAlt /> Instructions
                  </Link>
                  {isFinalSubmitted && (
                    <button
                      type="button"
                      onClick={handlePrintReceipt}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition shadow-sm cursor-pointer"
                    >
                      <FaPrint /> Print Receipt
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Candidate Metadata Strip */}
            <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 sm:px-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block">Registration No</span>
                  <span className="font-bold text-slate-800 text-sm">{candidate?.registrationNo || "-"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Candidate Name</span>
                  <span className="font-bold text-slate-800 text-sm">{candidate?.fullName || "-"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Roll Number</span>
                  <span className="font-bold text-blue-800 text-sm">{candidate?.rollNo || "-"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Applied Stream</span>
                  <span className="font-bold text-slate-800 text-sm">{candidate?.appliedCategory || "-"}</span>
                </div>
              </div>
            </div>

            {/* Booklet Series Selection & Resources Strip (Just below Candidate Details) */}
            <div className="bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50 border-t border-slate-200 px-5 py-3 sm:px-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                {/* Series Buttons */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                    <FaBook className="text-blue-700" /> Booklet Series:
                  </span>
                  <div className="flex items-center gap-1.5">
                    {BOOKLET_SERIES.map((s) => {
                      const isLocked = objections.length > 0 && objections[0].bookletSeries && objections[0].bookletSeries !== s;
                      const isSelected = bookletSeries === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          disabled={isLocked || isFinalSubmitted}
                          onClick={() => {
                            if (!isLocked && !isFinalSubmitted) {
                              setBookletSeries(s);
                              setErrorMessage("");
                            }
                          }}
                          className={`w-9 h-9 flex items-center justify-center rounded-lg font-black text-sm border transition ${
                            isSelected
                              ? "bg-blue-700 text-white border-blue-700 shadow-md ring-2 ring-blue-400 scale-105"
                              : isLocked
                              ? "bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed opacity-50"
                              : "bg-white text-slate-700 border-slate-300 hover:border-blue-500 hover:bg-blue-50/50 cursor-pointer"
                          }`}
                          title={isLocked ? `Locked: Objections restricted to Series ${objections[0].bookletSeries}` : `Select Series ${s}`}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                  {objections.length > 0 && objections[0].bookletSeries && (
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                      Locked: Series {objections[0].bookletSeries}
                    </span>
                  )}
                </div>

                {/* Viewing Booklet and Answer Key */}
                <div className="flex items-center">
                  {bookletSeries ? (
                    <div className="flex flex-wrap items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs shadow-xs">
                      <span className="font-bold text-slate-700">Series {bookletSeries}:</span>
                      <a
                        href={getBookletUrl(bookletSeries, "booklet", false)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900 font-bold hover:underline cursor-pointer"
                        title={`View Series ${bookletSeries} Question Booklet PDF`}
                      >
                        <FaEye className="text-blue-600 text-xs" /> View Booklet
                      </a>
                      <a
                        href={getBookletUrl(bookletSeries, "booklet", true)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-blue-700 transition cursor-pointer p-0.5"
                        title={`Download Series ${bookletSeries} Question Booklet`}
                      >
                        <FaDownload className="text-[11px]" />
                      </a>
                      <span className="text-slate-300">|</span>
                      <a
                        href={getBookletUrl(bookletSeries, "answerkey", false)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-bold hover:underline cursor-pointer"
                        title={`View Series ${bookletSeries} Answer Key PDF`}
                      >
                        <FaKey className="text-amber-500 text-xs" /> View Key
                      </a>
                      <a
                        href={getBookletUrl(bookletSeries, "answerkey", true)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-emerald-700 transition cursor-pointer p-0.5"
                        title={`Download Series ${bookletSeries} Answer Key`}
                      >
                        <FaDownload className="text-[11px]" />
                      </a>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic flex items-center gap-1.5">
                      <FaInfoCircle className="text-blue-500 text-xs" /> Select Booklet Series to view booklet & answer key
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* If NOT Final Submitted -> Objection Entry Form */}
          {!isFinalSubmitted ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 print:hidden space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                  <FaEdit className="text-blue-700" />
                  {editingId ? `Edit Objection for Question #${questionNo}` : "Add Question Objection"}
                </h2>
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-xs text-red-600 hover:text-red-800 font-semibold underline"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              <form onSubmit={handleSaveObjection} className="space-y-5">
                {!bookletSeries && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <FaInfoCircle className="text-amber-600 flex-shrink-0 text-base" />
                    <span>Please select your Question Booklet Series above to start entering questions and objections.</span>
                  </div>
                )}

                {/* Row 1: Question Number (1-200) & Candidate Claim */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  {/* Manual Question Number Input (Range 1-200) */}
                  <div className="lg:col-span-4">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Question Number (1 - 200) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max="200"
                        step="1"
                        value={questionNo}
                        onChange={handleQuestionChange}
                        onBlur={handleQuestionBlur}
                        disabled={!bookletSeries}
                        required
                        placeholder={bookletSeries ? "1 - 200" : "Select Series above first..."}
                        className={`w-full px-3 py-2 border rounded-lg text-sm font-extrabold focus:ring-2 transition ${
                          !bookletSeries
                            ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                            : questionError
                            ? "border-red-500 focus:ring-red-400 bg-red-50/30 text-slate-900"
                            : "border-slate-300 focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-900"
                        }`}
                      />
                    </div>
                    {questionError ? (
                      <span className="text-[11px] text-red-600 font-semibold mt-1 block">
                        {questionError}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500 mt-1 block">
                        {bookletSeries ? "Valid range: 1 to 200" : "Series selection required"}
                      </span>
                    )}
                  </div>

                  {/* Candidate Claim (Supports Multiple Selection, None of these, All of the above) */}
                  <div className="lg:col-span-8">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Claimed Answer <span className="text-red-500">*</span>
                      </label>
                      {isQuestionTyped ? (
                        <span className="text-[10px] text-blue-700 font-semibold">
                          (Multiple options / special choices allowed)
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-600 font-semibold">
                          (Enter valid Question No. first to select answer)
                        </span>
                      )}
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
                              disabled={!isQuestionTyped}
                              onClick={() => isQuestionTyped && handleToggleOption(opt)}
                              className={`py-2 text-center rounded-lg font-black text-sm border transition flex items-center justify-center gap-1.5 ${
                                !isQuestionTyped
                                  ? "bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed opacity-60"
                                  : isSelected
                                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-400 cursor-pointer"
                                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100 cursor-pointer"
                              }`}
                              title={isQuestionTyped ? `Select Option ${opt}` : "Enter Question Number first"}
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
                          disabled={!isQuestionTyped}
                          onClick={() => isQuestionTyped && handleSelectSpecial("ALL_OF_THE_ABOVE")}
                          className={`py-2 px-2 text-center rounded-lg font-bold text-xs border transition flex items-center justify-center gap-1.5 ${
                            !isQuestionTyped
                              ? "bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed opacity-60"
                              : specialOption === "ALL_OF_THE_ABOVE"
                              ? "bg-blue-700 text-white border-blue-700 shadow-sm ring-2 ring-blue-400 cursor-pointer"
                              : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100 cursor-pointer"
                          }`}
                        >
                          <span>All of the above</span>
                          {specialOption === "ALL_OF_THE_ABOVE" && <FaCheckCircle className="text-xs" />}
                        </button>

                        <button
                          type="button"
                          disabled={!isQuestionTyped}
                          onClick={() => isQuestionTyped && handleSelectSpecial("NONE_OF_THESE")}
                          className={`py-2 px-2 text-center rounded-lg font-bold text-xs border transition flex items-center justify-center gap-1.5 ${
                            !isQuestionTyped
                              ? "bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed opacity-60"
                              : specialOption === "NONE_OF_THESE"
                              ? "bg-purple-700 text-white border-purple-700 shadow-sm ring-2 ring-purple-400 cursor-pointer"
                              : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100 cursor-pointer"
                          }`}
                        >
                          <span>None of these</span>
                          {specialOption === "NONE_OF_THESE" && <FaCheckCircle className="text-xs" />}
                        </button>
                      </div>
                    
                    </div>
                  </div>
                </div>

                {/* Row 2: Justification & Proof Upload */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {/* Academic Justification */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Academic Justification / Reference
                    </label>
                    <textarea
                      rows="3"
                      value={description}
                      disabled={!bookletSeries}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={bookletSeries ? "Enter book title, author, edition, page number, and explanation..." : "Select Booklet Series first..."}
                      className={`w-full px-3 py-2 border rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 transition ${
                        !bookletSeries ? "bg-slate-100 border-slate-200 cursor-not-allowed text-slate-400" : "border-slate-300 bg-white"
                      }`}
                    ></textarea>
                  </div>

                  {/* Proof Document File */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Documentary Proof (Optional)
                      </label>
                      <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        Max 5 Pages
                      </span>
                    </div>
                    <div className={`border-2 border-dashed rounded-xl p-3 text-center transition ${
                      !bookletSeries ? "border-slate-200 bg-slate-100/60 cursor-not-allowed" : "border-slate-300 bg-slate-50/60 hover:bg-slate-50 cursor-pointer"
                    }`}>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleDocumentChange}
                        disabled={!bookletSeries}
                        className="hidden"
                        id="objection-proof-file"
                      />
                      <label htmlFor={bookletSeries ? "objection-proof-file" : undefined} className={bookletSeries ? "cursor-pointer block" : "cursor-not-allowed block"}>
                        {fileChecking ? (
                          <div className="flex flex-col items-center justify-center py-1">
                            <FaSpinner className="animate-spin text-blue-600 text-lg mb-1" />
                            <span className="text-xs font-semibold text-blue-700">
                              Verifying page count...
                            </span>
                          </div>
                        ) : (
                          <>
                            <FaUpload className={`mx-auto text-lg mb-1 ${!bookletSeries ? "text-slate-300" : "text-slate-400"}`} />
                            <span className={`text-xs font-semibold ${!bookletSeries ? "text-slate-400" : "text-blue-700 hover:underline"}`}>
                              {documentFile ? documentFile.name : bookletSeries ? "Choose File (PDF or Image)" : "Select Series first..."}
                            </span>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              {documentFile
                                ? `${(documentFile.size / 1024 / 1024).toFixed(2)} MB selected`
                                : "PDF or Image (Max 5 MB & up to 5 pages)"}
                            </p>
                          </>
                        )}
                      </label>
                    </div>
                    {fileError && (
                      <span className="text-[11px] text-red-600 font-semibold mt-1.5 block">
                        {fileError}
                      </span>
                    )}
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
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={!bookletSeries || !isQuestionTyped || submitting}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FaCheckCircle />
                    {submitting
                      ? "Saving..."
                      : !bookletSeries
                      ? "Select Series First"
                      : !isQuestionTyped
                      ? "Enter Question No."
                      : editingId
                      ? "Update Objection"
                      : "Save Draft Objection"}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* Locked State Advisory */
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-emerald-900 print:hidden flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xl flex-shrink-0">
                  <FaLock />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">Objections Submitted & Locked</h3>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Your challenges were permanently locked on{" "}
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
                <FaPrint /> Print Confirmation Slip
              </button>
            </div>
          )}

          {/* Draft/Submitted Objections Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
                  <FaFileAlt className="text-blue-700" />
                  List of Challenged Questions
                  <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-bold">
                    Total: {objections.length}
                  </span>
                </h3>
              </div>

              {!isFinalSubmitted && objections.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowFinalModal(true)}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  <FaLock /> Final Submit & Lock
                </button>
              )}
            </div>

            {objections.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <FaInfoCircle className="mx-auto text-3xl text-slate-300 mb-2" />
                <p className="text-sm font-medium">No objections submitted yet.</p>
                <p className="text-xs mt-1">
                  Use the form above to add a question objection and click "Save Draft Objection".
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 uppercase font-bold text-[11px] text-slate-600">
                    <tr>
                      <th className="py-3 px-3 text-center">S.No.</th>
                      <th className="py-3 px-3 text-center">Series</th>
                      <th className="py-3 px-3 text-center">Question No.</th>
                      <th className="py-3 px-3 text-center">Claimed Answer</th>
                      <th className="py-3 px-3">Proof</th>
                      <th className="py-3 px-3">Status</th>
                      {!isFinalSubmitted && <th className="py-3 px-3 text-center">Action</th>}
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
                              <FaEye /> View
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
                                onClick={() => setDeleteConfirm({ id: item.id, qNum: item.questionNo })}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition cursor-pointer"
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
          <div id="printable-objection-receipt" className="hidden print:block bg-white p-8 border border-slate-300 rounded-xl space-y-6">
            <div className="text-center border-b-2 border-slate-800 pb-4">
              <h2 className="text-xl font-extrabold uppercase tracking-wide">
                Uttarakhand Board of School Education, Ramnagar (Nainital)
              </h2>
              <h3 className="text-base font-bold text-slate-800 mt-1">
                UK D.El.Ed. Entrance Examination - 2026
              </h3>
              <p className="text-sm font-semibold text-slate-600 mt-0.5">
                Provisional Answer Key Objection Confirmation Slip
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs border border-slate-300 p-4 rounded-lg bg-slate-50">
              <div>
                <p><strong>Registration No:</strong> {candidate?.registrationNo}</p>
                <p className="mt-1"><strong>Candidate Name:</strong> {candidate?.fullName}</p>
                <p className="mt-1"><strong>Father's Name:</strong> {candidate?.fatherName}</p>
              </div>
              <div>
                <p><strong>Roll No:</strong> {candidate?.rollNo || "-"}</p>
                <p className="mt-1"><strong>Applied Stream:</strong> {candidate?.appliedCategory}</p>
                <p className="mt-1">
                  <strong>Submitted On:</strong>{" "}
                  {finalSubmittedOn ? new Date(finalSubmittedOn).toLocaleString("en-IN") : "Draft"}
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase mb-2">Contested Questions Summary:</h4>
              <table className="w-full text-left text-xs border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-200">
                    <th className="border border-slate-300 p-2 text-center">S.No.</th>
                    <th className="border border-slate-300 p-2 text-center">Series</th>
                    <th className="border border-slate-300 p-2 text-center">Question No.</th>
                    <th className="border border-slate-300 p-2 text-center">Claimed Answer</th>
                    <th className="border border-slate-300 p-2 text-center">Evidence Status</th>
                  </tr>
                </thead>
                <tbody>
                  {objections.map((o, idx) => (
                    <tr key={o.id}>
                      <td className="border border-slate-300 p-2 text-center">{idx + 1}</td>
                      <td className="border border-slate-300 p-2 text-center font-bold">{o.bookletSeries}</td>
                      <td className="border border-slate-300 p-2 text-center font-bold">Q. {o.questionNo}</td>
                      <td className="border border-slate-300 p-2 text-center font-bold">{o.candidateAnswer}</td>
                      <td className="border border-slate-300 p-2 text-center">
                        {o.documentPath ? (
                          <a
                            href={getDocUrl(o.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-700 underline font-semibold hover:text-blue-900"
                            title="Click to view attached document"
                          >
                            Attached (View Document)
                          </a>
                        ) : (
                          <span className="text-slate-400 italic">None</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-slate-300 pt-4 text-[11px] text-slate-600 leading-relaxed space-y-1">
              <p><strong>Declaration:</strong> Certified that all objections submitted by me against the provisional answer key are genuine and accurate.</p>
              <p>Note: This is a computer-generated confirmation slip and does not require an ink signature.</p>
            </div>
          </div>
        </div>

        {/* Final Submission Modal */}
        {showFinalModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:hidden">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
              <div className="bg-blue-700 text-white p-5 text-center">
                <FaLock className="mx-auto text-3xl mb-2" />
                <h3 className="text-lg font-bold">Confirm Final Submission & Lock</h3>
                <p className="text-xs text-red-100 mt-1">Objection Lock Confirmation</p>
              </div>

              <div className="p-6 space-y-4 text-xs text-slate-700 leading-relaxed">
                <p className="font-semibold text-slate-900">
                  Please review carefully: You have challenged a total of <span className="text-red-700 font-bold">{objections.length}</span> question(s).
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-900">
                  <FaExclamationTriangle className="inline mr-1.5 text-amber-600" />
                  <strong>Important Warning:</strong> Once "Final Submit & Lock" is completed, your objections will be permanently locked. You will NOT be able to edit, delete, or add any new objections.
                </div>
                <p>Are you sure you want to permanently lock and submit these objections?</p>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowFinalModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-green-700 hover:bg-green-800 text-white font-bold text-xs transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Yes, Final Submit & Lock"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:hidden">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn">
              <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-800 text-white p-5 text-center">
                <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-white/10 flex items-center justify-center text-blue-200 shadow-inner">
                  <FaTrash className="text-xl" />
                </div>
                <h3 className="text-lg font-bold tracking-tight">Remove Draft Objection</h3>
                <p className="text-xs text-blue-200 mt-0.5">Confirm Deletion</p>
              </div>

              <div className="p-6 text-center space-y-2 text-slate-700">
                <p className="text-sm font-medium">
                  Are you sure you want to remove the draft objection for <strong className="text-slate-900">Question #{deleteConfirm.qNum}</strong>?
                </p>
                <p className="text-xs text-slate-500">
                  This action cannot be undone.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const { id, qNum } = deleteConfirm;
                    setDeleteConfirm(null);
                    executeDelete(id, qNum);
                  }}
                  className="px-5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs transition shadow-sm cursor-pointer"
                >
                  Yes, Remove Objection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Evidence Document Preview Modal */}
        {previewDocUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm print:hidden">
            <div className="max-w-3xl w-full h-[80vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
              <div className="p-4 bg-slate-800 text-white flex items-center justify-between">
                <span className="font-bold text-sm flex items-center gap-2">
                  <FaFilePdf /> Evidence Document Preview
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
        </div>
      </ObjectionRouteGuard>
    </Layout>
  );
};

export default ObjectionPage;
