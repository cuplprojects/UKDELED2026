import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import Layout from "../components/Layout";
import { api } from "../stores/apiStore";
import { FaEye, FaEyeSlash, FaSyncAlt, FaUserPlus, FaIdCard, FaDownload } from "react-icons/fa";

export default function Home() {
  const navigate = useNavigate();
  const { login, loading, error: authError } = useAuthStore();
  const [loginData, setLoginData] = useState({
    registrationNo: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [captchaVal, setCaptchaVal] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");

  const generateCaptcha = () => {
    const val = Math.floor(10000 + Math.random() * 90000).toString();
    setCaptchaVal(val);
  };

  useEffect(() => {
    generateCaptcha();
    const expiredMsg = sessionStorage.getItem("session_expired_message");
    if (expiredMsg) {
      setError(expiredMsg);
      sessionStorage.removeItem("session_expired_message");
    }
  }, []);
  const [activeTab, setActiveTab] = useState("circulars");
  const [circulars, setCirculars] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [timelines, setTimelines] = useState([
    // { key: "starts", label: "REGISTRATION STARTS", dateValue: "23 May 2026", subLabel: "11:00 AM onwards" },
    // { key: "closes", label: "REGISTRATION CLOSES", dateValue: "30 May 2026", subLabel: "Till 11:59 PM" },
    // { key: "fee", label: "LAST DATE FOR FEE", dateValue: "07 August 2025", subLabel: "Till 11:59 PM" }
  ]);
  const [alerts, setAlerts] = useState([]);
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(true);
  const [admitTimelineStatus, setAdmitTimelineStatus] = useState(null);
  const [loginMode, setLoginMode] = useState("login"); // "login" | "admitCard"
  const [admitFormData, setAdmitFormData] = useState({ candidateName: "", dob: "" });
  const [admitLoading, setAdmitLoading] = useState(false);

  useEffect(() => {
    const checkIsNew = (doc) => {
      if (!doc) return false;
      return doc.status === 1 || doc.Status === 1 || doc.status === "1" || doc.isNew === true;
    };

    const fetchNotices = async () => {
      try {
        const response = await api.get("/api/Notice/all");
        if (response.data && response.data.success && Array.isArray(response.data.data)) {
          // Define the mapping from DB name (lowercase) to UI display label
          const mapping = {
            "vigyapti": "विज्ञप्ति-06/10/2026",
            "deledsyllabus": "DELED-Syllabus (पाठ्यक्रम)",
            "deled_i_2025": "DELED-I 2025 Question Booklet",
            "deled_ii_2025": "DELED-II 2025 Question Booklet",
            "deled26notice": "DELED 2026 Notice (विज्ञप्ति)",
            "deled_i_2024": "DELED-I 2024 Question Booklet",
            "deled_ii_2024": "DELED-II 2024 Question Booklet",
            "deled_i_2023": "DELED-I 2023 Question Booklet",
            "deled_ii_2023": "DELED-II 2023 Question Booklet",
            "deled_i_2022": "DELED-I 2022 Question Booklet",
            "deled_ii_2022": "DELED-II 2022 Question Booklet",
            "deled21_i": "DELED-I 2021 Question Booklet",
            "deled21_ii": "DELED-II 2021 Question Booklet",
            "deled_i_2020": "DELED-I 2020 Question Booklet",
            "deled_ii_2020": "DELED-II 2020 Question Booklet",
            "deled_i_2019": "DELED-I 2019 Question Booklet",
            "deled_ii_2019": "DELED-II 2019 Question Booklet"
          };

          // Order key sequence to preserve UI visual order
          const orderKeys = [
            "vigyapti",
            "deled26notice",
            "deledsyllabus",
            "deled_i_2025",
            "deled_ii_2025",
            "deled_i_2024",
            "deled_ii_2024",
            "deled_i_2023",
            "deled_ii_2023",
            "deled_i_2022",
            "deled_ii_2022",
            "deled21_i",
            "deled21_ii",
            "deled_i_2020",
            "deled_ii_2020",
            "deled_i_2019",
            "deled_ii_2019"
          ];

          // Create a lookup map of lowercase dbName -> item
          const dbNoticesMap = {};
          response.data.data.forEach(item => {
            const key = (item.name || "").toLowerCase().trim();
            dbNoticesMap[key] = item;
          });

          // Build ordered list
          const orderedMappedList = [];
          
          // First, add predefined ones in exact order
          orderKeys.forEach(key => {
            if (dbNoticesMap[key]) {
              const item = dbNoticesMap[key];
              orderedMappedList.push({
                id: item.noticeId || item.NoticeId || item.id,
                label: typeof mapping[key] === "object" ? mapping[key].label : (mapping[key] || item.name),
                link: item.url,
                status: item.status ?? item.Status ?? 0,
                isNew: checkIsNew(item)
              });
              delete dbNoticesMap[key];
            }
          });

          // Then, append any other notices uploaded that are not in our predefined list
          Object.values(dbNoticesMap).forEach(item => {
            orderedMappedList.push({
              id: item.noticeId || item.NoticeId || item.id,
              label: item.name,
              link: item.url,
              status: item.status ?? item.Status ?? 0,
              isNew: checkIsNew(item)
            });
          });

          // Sort to ensure all "New" items are visible at first while maintaining relative order
          const prioritizedList = [...orderedMappedList].sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
          console.log("Fetched and ordered circulars:", prioritizedList);
          setCirculars(prioritizedList);
        }
      } catch (err) {
        console.error("Failed to fetch notices:", err);
      }
    };

    const fetchDocuments = async () => {
      try {
        const response = await api.get("/api/ImpDocument/all");
        if (response.data && response.data.success && Array.isArray(response.data.data)) {
          // Define mapping from DB name (lowercase) to UI label
          const mapping = {
            "amend_2_26":"शासनादेश 406 307 दिनांक 18 जून 2026",
            "amend_1_26":"शासनादेश 41 2650 दिनांक 13 जुलाई 2026",
            
            "phinstructions": "दिव्यांग अभ्यर्थियों हेतु निर्देश एवं प्रपत्र",
            "phgo": "दिव्यांग अभ्यर्थियों हेतु शासनादेश",
            //"deled25go": "DELED-2025 GO (शासनादेश)",
            "ncte-minimun-qualification-2011": "NCTE-Minimum Qualification-2011",
            "ncte_gazette_notification_2010": "NCTE-Gazette Notification-2010",
            "ncte_gazette_notification_2019": "NCTE-Gazette Notification-2019",
            "ncte_gazette_notification_2021": "NCTE-Gazette Notification-2021",
            "stategomain": "State GO regarding DELED Main",
            "amend_1": "State GO regarding DELED - Amend I",
            "amend_1_1": "State GO regarding DELED - Amend II",
            "amend_3": "State GO regarding DELED - Amend III",
            "amend_6": "State GO regarding DELED - Amend IV",
            "amend_v": "State GO regarding DELED - Amend V",
            "amend_7": "State GO regarding DELED - Amend VI",
            "amend_8": "State GO regarding DELED - Amend VII",
            "eligibility-code-for-deled1&2": "Eligibility Code for DELED-I & II",
          };

          // Order key sequence to preserve UI visual order
          const orderKeys = [
            "amend_2_26",
            "amend_1_26",
            
            "phinstructions",
            "phgo",
            //"deled25go",
            "ncte_gazette_notification_2010",
            "ncte-minimun-qualification-2011",
            
            "ncte_gazette_notification_2019",
            "ncte_gazette_notification_2021",
            "stategomain",
            "amend_1",
            "amend_1_1",
            "amend_3",
            "amend_6",
            "amend_v",
            "amend_7",
            "amend_8",
            "eligibility-code-for-deled1&2",
          ];

          // Create lookup map of lowercase dbName -> item
          const dbDocsMap = {};
          response.data.data.forEach(item => {
            const key = (item.name || "").toLowerCase().trim();
            dbDocsMap[key] = item;
          });

          // Build ordered list
          const orderedMappedList = [];
          
          // First, add predefined ones in exact order
          orderKeys.forEach(key => {
            if (dbDocsMap[key]) {
              const item = dbDocsMap[key];
              orderedMappedList.push({
                id: item.impDocumentId || item.ImpDocumentId || item.id,
                label: mapping[key] || item.name,
                link: item.url,
                status: item.status ?? item.Status ?? 0,
                isNew: checkIsNew(item)
              });
              delete dbDocsMap[key];
            }
          });

          // Then, append any other documents uploaded that are not in our predefined list
          Object.values(dbDocsMap).forEach(item => {
            orderedMappedList.push({
              id: item.impDocumentId || item.ImpDocumentId || item.id,
              label: item.name,
              link: item.url,
              status: item.status ?? item.Status ?? 0,
              isNew: checkIsNew(item)
            });
          });

          // Sort to ensure all "New" items are visible at first while maintaining relative order
          const prioritizedList = [...orderedMappedList].sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
          setDocuments(prioritizedList);
        }
      } catch (err) {
        console.error("Failed to fetch documents:", err);
      }
    };

    fetchNotices();
    fetchDocuments();

    const fetchTimelines = async () => {
      try {
        const response = await api.get("/api/RegistrationTimeline");
        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          const normalized = response.data.map(item => ({
            id: item.id || item.Id,
            key: item.key || item.Key,
            label: item.label || item.Label,
            dateValue: item.dateValue || item.DateValue,
            subLabel: item.subLabel || item.SubLabel,
            status: item.status !== undefined ? Number(item.status) : (item.Status !== undefined ? Number(item.Status) : 1)
          }));
          setTimelines(normalized);
        }
      } catch (err) {
        console.error("Failed to fetch timelines:", err);
      }
    };

    const fetchTimelineStatus = async () => {
      try {
        const response = await api.get("/api/RegistrationTimeline/status");
        if (response.data) {
          setIsRegistrationOpen(response.data.isOpen);
        }
      } catch (err) {
        console.error("Failed to fetch timeline status:", err);
      }
    };

    const fetchAlerts = async () => {
      try {
        const response = await api.get("/api/SystemAlerts");
        if (response.data && Array.isArray(response.data)) {
          setAlerts(response.data);
        }
      } catch (err) {
        console.error("Failed to fetch system alerts:", err);
      }
    };

    const fetchAdmitTimelineStatus = async () => {
      try {
        const response = await api.get("/api/AdmitCard/timeline-status");
        if (response.data) {
          setAdmitTimelineStatus(response.data);
        }
      } catch (err) {
        console.error("Failed to fetch admit card timeline status:", err);
      }
    };

    fetchTimelines();
    fetchTimelineStatus();
    fetchAdmitTimelineStatus();
    fetchAlerts();
  }, []);

  const handleInputChange = (e) => {
    setLoginData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const getTimelineValue = (key, field, defaultValue) => {
    let found = null;
    if (key === "starts") {
      found = timelines.find(t => (t.key === "starts" || t.key === "reg_starts") && !(t.label || "").toUpperCase().includes("CORRECTION"));
    } else if (key === "closes") {
      found = timelines.find(t => (t.key === "closes" || t.key === "reg_closes") && !(t.label || "").toUpperCase().includes("CORRECTION"));
    } else if (key === "corr_starts") {
      found = timelines.find(t => t.key === "corr_starts" || t.key === "correction_starts" || ((t.key === "starts" || t.key === "corr_starts") && (t.label || "").toUpperCase().includes("CORRECTION")));
    } else if (key === "corr_closes") {
      found = timelines.find(t => t.key === "corr_closes" || t.key === "correction_closes" || ((t.key === "closes" || t.key === "corr_closes") && (t.label || "").toUpperCase().includes("CORRECTION")));
    } else {
      found = timelines.find(t => t.key === key);
    }
    return (found && found[field] !== undefined && found[field] !== null && found[field] !== "") ? found[field] : defaultValue;
  };

  const isCardVisible = (key) => {
    let found = null;
    if (key === "starts") {
      found = timelines.find(t => (t.key === "starts" || t.key === "reg_starts") && !(t.label || "").toUpperCase().includes("CORRECTION"));
    } else if (key === "closes") {
      found = timelines.find(t => (t.key === "closes" || t.key === "reg_closes") && !(t.label || "").toUpperCase().includes("CORRECTION"));
    } else if (key === "corr_starts") {
      found = timelines.find(t => t.key === "corr_starts" || t.key === "correction_starts" || ((t.key === "starts" || t.key === "corr_starts") && (t.label || "").toUpperCase().includes("CORRECTION")));
    } else if (key === "corr_closes") {
      found = timelines.find(t => t.key === "corr_closes" || t.key === "correction_closes" || ((t.key === "closes" || t.key === "corr_closes") && (t.label || "").toUpperCase().includes("CORRECTION")));
    } else {
      found = timelines.find(t => t.key === key);
    }
    // Only rows with status 1 are visible in cards
    return !!(found && found.dateValue && Number(found.status) === 1);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const showLoginError = (msg) => {
      setError(msg);
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const isRegEmpty = !loginData.registrationNo.trim();
    const isPassEmpty = !loginData.password.trim();

    // Validate basic fields
    if (isRegEmpty || isPassEmpty) {
      if (isRegEmpty) return showLoginError("Registration No. is required.");
      if (isPassEmpty) return showLoginError("Password is required.");
    }

    if (captchaInput !== captchaVal) {
      showLoginError("Invalid Captcha Code. Please try again.");
      setCaptchaInput("");
      generateCaptcha();
      return;
    }

    try {
      const result = await login(loginData.registrationNo, loginData.password, "");
      if (result.success) {
        setSuccess("Login successful! Redirecting...");
        setTimeout(() => {
          navigate("/application");
        }, 1200);
      } else {
        showLoginError(result.error || "Invalid Email ID or Password");
        setCaptchaInput("");
        generateCaptcha();
      }
    } catch (err) {
      console.error("Login error:", err);
      showLoginError("Login failed. Please try again.");
      setCaptchaInput("");
      generateCaptcha();
    }
  };

  const handleAdmitCardSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!admitFormData.candidateName.trim()) {
      setError("Candidate Name is required.");
      return;
    }
    if (!admitFormData.dob) {
      setError("Date of Birth is required.");
      return;
    }
    if (captchaInput !== captchaVal) {
      setError("Invalid Captcha Code. Please try again.");
      setCaptchaInput("");
      generateCaptcha();
      return;
    }

    setAdmitLoading(true);
    try {
      const response = await api.post(
        "/api/AdmitCard/download",
        {
          fullName: admitFormData.candidateName.trim(),
          dob: admitFormData.dob,
          isLogin: false
        },
        { responseType: "blob" }
      );

      // Determine downloaded file name
      const contentDisposition = response.headers["content-disposition"];
      let filename = `AdmitCard_${admitFormData.candidateName.trim().replace(/\s+/g, "_")}.pdf`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (match && match[1]) {
          filename = match[1].replace(/['"]/g, "");
        }
      }

      const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setSuccess("Admit Card downloaded successfully!");
      setCaptchaInput("");
      generateCaptcha();
    } catch (err) {
      console.error("Admit Card download error:", err);
      let errorDesc = "Failed to download Admit Card. Please verify Candidate Name and Date of Birth.";
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text);
          if (parsed.message) errorDesc = parsed.message;
        } catch (_) {}
      } else if (err.response?.data?.message) {
        errorDesc = err.response.data.message;
      }
      setError(errorDesc);
      setCaptchaInput("");
      generateCaptcha();
    } finally {
      setAdmitLoading(false);
    }
  };



  const activeAlerts = alerts
    .filter(a => a.isActive && a.text && a.text.trim() !== "")
    .map(a => a.text.trim());

  const alertText = activeAlerts.length > 0 
    ? activeAlerts.join("   •   ") 
    : "डी० एल० एड० (DELED) 2026 के लिए ऑनलाइन पंजीकरण की अंतिम तिथि 30 मई 2026 है। अंतिम समय की भीड़ से बचने के लिए जल्द आवेदन करें।";

  return (
    <Layout className="min-h-screen bg-[#f0f7ff] font-sans text-gray-800 flex flex-col w-full">

      {/* Headline Ticker */}
      <div className="w-full bg-amber-50 border-b border-amber-200 h-12 sm:h-14 overflow-hidden flex items-center gap-3 px-3 sm:px-4 md:px-6 shrink-0">
        <span className="bg-red-600 text-white text-xs sm:text-sm md:text-base font-black uppercase px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-md shrink-0 shadow-xs tracking-wide">
          Alert
        </span>
        <marquee className="text-base sm:text-lg md:text-[19px] text-red-700 font-bold cursor-pointer">
          {alertText}
        </marquee>
      </div>

      {/* Main Container - Stretching fully across viewport */}
      <main className="flex-1 w-full p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-5 md:space-y-6">
        
        {/* Top Section - Interactive Dashboard Style Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-12 gap-4 sm:gap-5 md:gap-6 w-full">
          
          {/* Welcome & Timelines Card (Stretches across columns 1-8 on large screens) */}
          <div className="lg:col-span-2 xl:col-span-8 bg-white rounded-lg sm:rounded-xl shadow-md border border-gray-150 overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-blue-700 to-blue-600 text-white p-4 sm:p-5 md:p-6">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black mb-1.5 leading-tight">द्विवर्षीय डी० एल० एड० (D.El.Ed.) प्रशिक्षण प्रवेश परीक्षा 2026</h2>
              <p className="text-blue-100 text-sm sm:text-base md:text-[17px] font-semibold">
                Welcome to the Online Registration & Application Portal of Uttarakhand Board of School Education.
              </p>
            </div>

            <div className="p-4 sm:p-5 md:p-6 flex-1 flex flex-col justify-center">
              <div className="mb-4 border-b border-gray-100 pb-3">
                <h3 className="text-[#b81d24] font-black text-base sm:text-lg md:text-xl">
                  आवश्यक सूचना :
                </h3>
                <p className="text-gray-800 font-extrabold text-sm sm:text-base md:text-lg mt-1.5">
                  डी0 एल0 एड0 2026 के आवेदन की महत्वपूर्ण तिथियाँ-
                </p>
              </div>
              {(() => {
                // Automatically display all active timelines (status === 1 with dateValue)
                const activeTimelines = timelines.filter(t => t.dateValue && Number(t.status) === 1);

                if (activeTimelines.length === 0) {
                  return (
                    <div className="bg-amber-50/70 border border-amber-200 rounded-lg sm:rounded-xl p-4 sm:p-5 flex items-center gap-3">
                      <div className="p-2 bg-amber-100 rounded-lg text-amber-700">
                        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-sm sm:text-base font-bold text-gray-800">
                          महत्वपूर्ण तिथियाँ समाप्त हो चुकी हैं (All Process Schedules Ended)
                        </h4>
                        <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
                          डी0 एल0 एड0 2026 हेतु ऑनलाइन आवेदन, संशोधन एवं संबंधित प्रक्रिया की निर्धारित तिथियाँ पूर्ण हो चुकी हैं।
                        </p>
                      </div>
                    </div>
                  );
                }

                const visibleCardsCount = activeTimelines.length;
                const gridColsClass = visibleCardsCount === 1
                  ? "grid-cols-1 max-w-sm"
                  : visibleCardsCount === 2
                  ? "grid-cols-1 sm:grid-cols-2 max-w-2xl"
                  : visibleCardsCount === 3
                  ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
                  : visibleCardsCount === 4
                  ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
                  : visibleCardsCount === 5
                  ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
                  : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6";

                return (
                  <div className={`grid ${gridColsClass} gap-3 sm:gap-4 md:gap-5`}>
                    {activeTimelines.map((item, idx) => (
                      <div
                        key={item.id || item.key || idx}
                        className="bg-blue-50/50 p-3.5 sm:p-4 rounded-lg sm:rounded-xl border border-blue-100 relative overflow-hidden group shadow-2xs hover:shadow-xs transition"
                      >
                        <span className="block text-xs sm:text-sm font-extrabold text-gray-500 uppercase tracking-wider line-clamp-1">
                          {item.label}
                        </span>
                        <span className="block text-lg sm:text-xl md:text-2xl font-black text-emerald-800 mt-1">
                          {item.dateValue}
                        </span>
                        {item.subLabel ? (
                          <span className="block text-xs sm:text-sm font-bold text-blue-700 mt-0.5">
                            {item.subLabel}
                          </span>
                        ) : (
                          <span className="block text-xs sm:text-sm font-medium text-transparent mt-0.5 select-none">
                            &nbsp;
                          </span>
                        )}
                        <div className="absolute right-3 bottom-2 opacity-20 group-hover:scale-110 transition duration-300 pointer-events-none">
                          <svg className="w-10 h-10 text-emerald-850" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

          </div>

          {/* Login / Download Admit Card Container */}
          <div className="lg:col-span-1 xl:col-span-4 bg-white rounded-lg sm:rounded-xl shadow-md border border-gray-200 overflow-hidden flex flex-col justify-between">
            <div className="bg-blue-600 text-white px-4 sm:px-5 py-3.5 sm:py-4 flex items-center justify-between font-bold text-base sm:text-lg md:text-xl border-b border-blue-700">
              <span className="flex items-center gap-2.5 min-w-0">
                {loginMode === "admitCard" ? (
                  <>
                    <FaIdCard className="w-5 h-5 sm:w-6 sm:h-6 text-white shrink-0" />
                    <span className="truncate">Download Admit Card (प्रवेश पत्र)</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white inline-block shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m-3.418 4.818l-2.828 2.828m0 0A2 2 0 0110 17H8v2H6v2H3v-3l2.828-2.828m0 0A2 2 0 018 12h2m4-2a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <span className="truncate">Applicant Login</span>
                  </>
                )}
              </span>
            </div>

            {loginMode === "admitCard" ? (
              /* Admit Card Mode Form */
              <form autoComplete="off" onSubmit={handleAdmitCardSubmit} className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 flex-1">
                {error && (
                  <div className="bg-red-50 text-red-700 p-2.5 sm:p-3 rounded-lg text-xs sm:text-sm font-semibold border border-red-200 animate-shake">
                    ⚠️ {error}
                  </div>
                )}

                {success && (
                  <div className="bg-emerald-50 text-emerald-800 p-2.5 sm:p-3 rounded-lg text-xs sm:text-sm font-semibold border border-emerald-200">
                    ✓ {success}
                  </div>
                )}

                {/* Candidate Name in place of Registration No. */}
                <div>
                  <label className="block text-xs sm:text-sm md:text-[14.5px] font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                    Candidate Name (अभ्यर्थी का नाम)<span className="text-red-600 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={admitLoading}
                    value={admitFormData.candidateName}
                    onChange={(e) => setAdmitFormData({ ...admitFormData, candidateName: e.target.value })}
                    className="w-full px-3.5 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm sm:text-base outline-hidden transition uppercase font-semibold"
                  />
                </div>

                {/* Date of Birth in place of Password */}
                <div>
                  <label className="block text-xs sm:text-sm md:text-[14.5px] font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                    Date of Birth (जन्म तिथि)<span className="text-red-600 font-bold">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    disabled={admitLoading}
                    value={admitFormData.dob}
                    onChange={(e) => setAdmitFormData({ ...admitFormData, dob: e.target.value })}
                    className="w-full px-3.5 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm sm:text-base outline-hidden transition font-semibold cursor-pointer"
                  />
                </div>

                {/* Captcha Section */}
                <div className="space-y-1.5 my-2">
                  <label className="block text-xs sm:text-sm md:text-[14.5px] font-bold text-gray-700 mb-1">
                    Enter Captcha Code (कैप्चा कोड)
                  </label>
                  <div className="flex gap-2 items-center flex-wrap sm:flex-nowrap">
                    <input
                      type="text"
                      name="captchaInput"
                      value={captchaInput}
                      onChange={(e) => setCaptchaInput(e.target.value.replace(/\D/g, ""))}
                      placeholder="Captcha"
                      required
                      disabled={admitLoading}
                      className="flex-1 min-w-0 px-3.5 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm sm:text-base outline-hidden transition"
                    />
                    <div className="bg-blue-200 border border-blue-300 select-none px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-mono text-base sm:text-xl tracking-wider font-black text-blue-900 line-through decoration-double decoration-blue-800 shrink-0">
                      {captchaVal}
                    </div>
                    <button
                      type="button"
                      onClick={generateCaptcha}
                      title="Reload Captcha"
                      disabled={admitLoading}
                      className="p-2.5 sm:p-3 border border-gray-300 rounded-lg hover:bg-gray-100 text-sm transition flex items-center justify-center shrink-0 cursor-pointer"
                    >
                      <FaSyncAlt className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>

                {/* Download Admit Card Action Button */}
                <div className="mt-3">
                  <button
                    type="submit"
                    disabled={admitLoading}
                    className="w-full py-2.5 sm:py-3 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-bold text-xs sm:text-sm md:text-[15px] tracking-wide transition shadow-md hover:shadow-lg uppercase flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer disabled:opacity-50"
                  >
                    <FaDownload className="w-4 h-4 text-white" />
                    <span>{admitLoading ? "Downloading Admit Card..." : "Download Admit Card (प्रवेश पत्र डाउनलोड करें)"}</span>
                  </button>
                </div>

                {/* Switch back to regular login */}
                <div className="text-center pt-2 sm:pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginMode("login");
                      setError("");
                      setSuccess("");
                      setCaptchaInput("");
                      generateCaptcha();
                    }}
                    className="bg-transparent border-0 p-0 text-sm sm:text-base font-bold text-blue-700 hover:text-blue-900 hover:underline cursor-pointer transition flex items-center justify-center gap-1.5 mx-auto"
                  >
                    <span>← Back to Applicant Login (लॉगिन पर वापस जाएँ)</span>
                  </button>
                </div>
              </form>
            ) : (
              /* Normal Applicant Login Form */
              <form autoComplete="off" onSubmit={handleLoginSubmit} className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 flex-1">
                {error && (
                  <div className="bg-red-50 text-red-700 p-2.5 sm:p-3 rounded-lg text-xs sm:text-sm font-semibold border border-red-200 animate-shake">
                    ⚠️ {error}
                  </div>
                )}

                {success && (
                  <div className="bg-blue-50 text-blue-700 p-2.5 sm:p-3 rounded-lg text-xs sm:text-sm font-semibold border border-blue-200">
                    ✓ {success}
                  </div>
                )}

                <div>
                  <label className="block text-xs sm:text-sm md:text-[14.5px] font-bold text-gray-700 mb-1.5">
                    Registration No. (पंजीकरण संख्या)<span className="text-red-600 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    name="registrationNo"
                    value={loginData.registrationNo}
                    onChange={handleInputChange}
                    placeholder="Enter Registration No."
                    required
                    disabled={loading}
                    className="w-full px-3.5 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm sm:text-base outline-hidden transition"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm md:text-[14.5px] font-bold text-gray-700 mb-1.5">
                    Password (पासवर्ड)<span className="text-red-600 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={loginData.password}
                      onChange={handleInputChange}
                      placeholder="Enter Password"
                      required
                      disabled={loading}
                      className="w-full px-3.5 py-2.5 sm:py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm sm:text-base outline-hidden transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-base select-none cursor-pointer focus:outline-hidden"
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>

                {/* Captcha Section */}
                <div className="space-y-1.5 my-2">
                  <label className="block text-xs sm:text-sm md:text-[14.5px] font-bold text-gray-700 mb-1">
                    Enter Captcha Code (कैप्चा कोड) 
                  </label>
                  <div className="flex gap-2 items-center flex-wrap sm:flex-nowrap">
                    <input
                      type="text"
                      name="captchaInput"
                      value={captchaInput}
                      onChange={(e) => setCaptchaInput(e.target.value.replace(/\D/g, ""))}
                      placeholder="Captcha"
                      required
                      disabled={loading}
                      className="flex-1 min-w-0 px-3.5 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm sm:text-base outline-hidden transition"
                    />
                    <div className="bg-blue-200 border border-blue-300 select-none px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-mono text-base sm:text-xl tracking-wider font-black text-blue-900 line-through decoration-double decoration-blue-800 shrink-0">
                      {captchaVal}
                    </div>
                    <button
                      type="button"
                      onClick={generateCaptcha}
                      title="Reload Captcha"
                      disabled={loading}
                      className="p-2.5 sm:p-3 border border-gray-300 rounded-lg hover:bg-gray-100 text-sm transition flex items-center justify-center shrink-0 cursor-pointer"
                    >
                      <FaSyncAlt className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 sm:gap-2.5 mt-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (!isRegistrationOpen) {
                        setError("ऑनलाइन पंजीकरण की अंतिम तिथि समाप्त हो चुकी है। नए पंजीकरण की अनुमति नहीं है।");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                        return;
                      }
                      navigate("/register");
                    }}
                    className={`flex-1 py-2.5 sm:py-3 ${!isRegistrationOpen ? 'bg-gray-400 hover:bg-gray-500 cursor-not-allowed' : 'bg-blue-700 hover:bg-blue-800 cursor-pointer'} text-white rounded-lg font-bold text-xs sm:text-sm md:text-[15px] tracking-wide transition shadow-md hover:shadow-lg uppercase flex items-center justify-center gap-1.5 whitespace-nowrap`}
                  >
                    <FaUserPlus className="w-4 h-4 text-[#93c5fd] shrink-0" />
                    <span>NEW REGISTRATION</span>
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 sm:py-3 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-bold text-xs sm:text-sm md:text-[15px] tracking-wide transition shadow-md hover:shadow-lg uppercase whitespace-nowrap cursor-pointer"
                  >
                    {loading ? "Logging in..." : "Login (लॉगिन करें)"}
                  </button>
                </div>

                {/* Download Admit Card Link - Date-wise visibility based on active timeline schedule */}
                {admitTimelineStatus?.isOpen && (
                  <div className="text-center pt-3 pb-1 border-b border-gray-100">
                    <button
                      type="button"
                      onClick={() => {
                        setLoginMode("admitCard");
                        setError("");
                        setSuccess("");
                        setCaptchaInput("");
                        generateCaptcha();
                      }}
                      className="bg-transparent border-0 p-0 text-sm sm:text-base font-extrabold text-blue-700 hover:text-blue-900 hover:underline cursor-pointer transition flex items-center justify-center gap-2 mx-auto"
                    >
                      <FaIdCard className="w-4 h-4 text-blue-600" />
                      <span>Download Admit Card (प्रवेश पत्र डाउनलोड करें)</span>
                    </button>
                  </div>
                )}

                <div className="text-center pt-2 sm:pt-3">
                  <button
                    type="button"
                    onClick={() => navigate("/forgot-password")}
                    className="bg-transparent border-0 p-0 text-base sm:text-lg md:text-[17.5px] font-bold text-blue-700 hover:text-blue-900 hover:underline cursor-pointer transition"
                  >
                    Forgot Password? (पासवर्ड भूल गए?)
                  </button>
                </div>
              </form>
            )}
          </div>

        </div>

        {/* Tabbed Documents & Circulars Area (Spans full page width) */}
        <div className="w-full bg-white rounded-lg sm:rounded-xl shadow-md border border-gray-200 overflow-hidden">
          {/* Tab header buttons */}
          <div className="bg-gray-50 border-b border-gray-200 px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button
              onClick={() => setActiveTab("circulars")}
              className={`px-4 sm:px-5 py-2.5 rounded-lg text-xs sm:text-sm md:text-base font-extrabold transition flex items-center justify-center sm:justify-start gap-2 ${
                activeTab === "circulars"
                  ? "bg-blue-700 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <svg className={`w-4 h-4 sm:w-5 sm:h-5 ${activeTab === 'circulars' ? 'text-white' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6m-6 4h3" />
              </svg>
              <span className="truncate">NOTICES / CIRCULARS</span>
            </button>
            <button
              onClick={() => setActiveTab("documents")}
              className={`px-4 sm:px-5 py-2.5 rounded-lg text-xs sm:text-sm md:text-base font-extrabold transition flex items-center justify-center sm:justify-start gap-2 ${
                activeTab === "documents"
                  ? "bg-blue-700 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <svg className={`w-4 h-4 sm:w-5 sm:h-5 ${activeTab === 'documents' ? 'text-white' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="truncate">IMPORTANT DOCUMENTS</span>
            </button>
          </div>

          {/* Grid listing items fully using the width */}
          <div className="p-3 sm:p-4 md:p-6">
            {activeTab === "circulars" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3 md:gap-4">
                {circulars.length === 0 ? (
                  <div className="col-span-full text-center py-8 sm:py-10 text-gray-500 font-semibold bg-gray-50 rounded-lg sm:rounded-xl border border-dashed border-gray-200 flex flex-col items-center justify-center gap-2">
                    <svg className="w-6 sm:w-8 h-6 sm:h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0V9a2 2 0 00-2-2H6a2 2 0 00-2 2v4.5m16 0h-3.586a1 1 0 00-.707.293l-1.414 1.414a1 1 0 01-.707.293H8.414a1 1 0 01-.707-.293L6.293 13.793a1 1 0 00-.707-.293H2" />
                    </svg>
                    <span className="text-xs sm:text-sm">No notices or circulars are available at the moment.</span>
                  </div>
                ) : (
                  circulars.map((item, idx) => (
                    <a
                      key={idx}
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex justify-between items-center p-2.5 sm:p-3 md:p-4 bg-gray-50 rounded-lg sm:rounded-xl hover:bg-blue-50/50 border border-gray-100 hover:border-emerald-200 transition group"
                    >
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-hover:text-blue-700 transition shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-xs sm:text-sm text-gray-700 font-bold group-hover:text-blue-700 truncate">
                          {item.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        {item.isNew && (
                          <span className="bg-red-500 text-white font-black text-[7px] sm:text-[8px] px-1 sm:px-1.5 py-0.5 rounded-full uppercase shrink-0">
                            New
                          </span>
                        )}
                        <span className="text-[10px] sm:text-xs text-gray-400 group-hover:text-blue-700 transition group-hover:translate-x-1 duration-200">
                          →
                        </span>
                      </div>
                    </a>
                  ))
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3 md:gap-4">
                {documents.length === 0 ? (
                  <div className="col-span-full text-center py-8 sm:py-10 text-gray-500 font-semibold bg-gray-50 rounded-lg sm:rounded-xl border border-dashed border-gray-200 flex flex-col items-center justify-center gap-2">
                    <svg className="w-6 sm:w-8 h-6 sm:h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0V9a2 2 0 00-2-2H6a2 2 0 00-2 2v4.5m16 0h-3.586a1 1 0 00-.707.293l-1.414 1.414a1 1 0 01-.707.293H8.414a1 1 0 01-.707-.293L6.293 13.793a1 1 0 00-.707-.293H2" />
                    </svg>
                    <span className="text-xs sm:text-sm">No important documents are available at the moment.</span>
                  </div>
                ) : (
                  documents.map((item, idx) => (
                    <a
                      key={idx}
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex justify-between items-center p-2.5 sm:p-3 md:p-4 bg-gray-50 rounded-lg sm:rounded-xl hover:bg-blue-50/50 border border-gray-100 hover:border-emerald-200 transition group"
                    >
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-hover:text-blue-700 transition shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6m-6 4h3" />
                        </svg>
                        <span className="text-xs sm:text-sm text-gray-700 font-bold group-hover:text-blue-700 truncate">
                          {item.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        {item.isNew && (
                          <span className="bg-red-500 text-white font-black text-[7px] sm:text-[8px] px-1 sm:px-1.5 py-0.5 rounded-full uppercase shrink-0">
                            New
                          </span>
                        )}
                        <span className="text-[10px] sm:text-xs text-gray-400 group-hover:text-blue-700 transition group-hover:translate-x-1 duration-200">
                          →
                        </span>
                      </div>
                    </a>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

      </main>
    </Layout>
  );
}
