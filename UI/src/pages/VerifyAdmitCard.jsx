import React, { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Spin } from "antd";
import {
  FaShieldAlt,
  FaIdCard,
  FaUserCheck,
  FaMapMarkerAlt,
  FaTimesCircle,
  FaCheck,
  FaSignature,
  FaLock
} from "react-icons/fa";
import Layout from "../components/Layout";
import { api } from "../stores/apiStore";

export default function VerifyAdmitCard() {
  const { token: routeToken, registrationNo: routeRegNo } = useParams();
  const [searchParams] = useSearchParams();

  // Extract security token or registration identifier from query params & route param
  const queryToken =
    searchParams.get("token") ||
    searchParams.get("enc") ||
    searchParams.get("q") ||
    searchParams.get("c") ||
    searchParams.get("id") ||
    searchParams.get("regNo") ||
    searchParams.get("regno") ||
    searchParams.get("registrationNo") ||
    searchParams.get("registration_no") ||
    searchParams.get("reg_no") ||
    "";

  const targetInput = (routeToken || routeRegNo || queryToken || "").trim();

  const [loading, setLoading] = useState(false);
  const [candidateData, setCandidateData] = useState(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [signatureUrl, setSignatureUrl] = useState("");
  const [photoError, setPhotoError] = useState(false);
  const [signatureError, setSignatureError] = useState(false);
  const [photoAttempt, setPhotoAttempt] = useState(0);
  const [signatureAttempt, setSignatureAttempt] = useState(0);
  const [photoCandidates, setPhotoCandidates] = useState([]);
  const [signatureCandidates, setSignatureCandidates] = useState([]);
  const [verificationTime, setVerificationTime] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSecurityDenied, setIsSecurityDenied] = useState(false);

  // Helper to generate candidate static URLs with automatic fallback (/photos, /uploads, etc.)
  const generateAssetCandidates = (rawPath, defaultFolder) => {
    if (!rawPath) return [];
    if (rawPath.startsWith("http://") || rawPath.startsWith("https://") || rawPath.startsWith("data:")) {
      return [rawPath];
    }
    const baseUrl = (api.defaults.baseURL || "").replace(/\/+$/, "");
    const clean = rawPath.replace(/^\/+/, "");
    const fileName = clean.split("/").pop();

    const candidates = [
      `${baseUrl}/${clean}`,
      `${baseUrl}/uploads/${fileName}`,
      `${baseUrl}/${defaultFolder}/${fileName}`,
      `${baseUrl}/photos/${fileName}`,
      `${baseUrl}/signatures/${fileName}`
    ];
    return [...new Set(candidates)];
  };

  // Format Date of Birth (YYYY-MM-DD -> DD-MM-YYYY)
  const formatDob = (dobStr) => {
    if (!dobStr) return "N/A";
    const clean = dobStr.split("T")[0];
    const parts = clean.split("-");
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dobStr;
  };

  // Format Current Live IST Timestamp
  const getLiveIstTimestamp = () => {
    return new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    });
  };

  // Fetch candidate details for verification
  // 1. Strictly requires AES URL-Safe encrypted security token
  // 2. Direct registration number input or tampered URL is immediately blocked
  const verifyCandidate = async (inputVal) => {
    if (!inputVal || !inputVal.trim()) {
      setCandidateData(null);
      setErrorMessage("");
      setIsSecurityDenied(false);
      return;
    }

    const cleanInput = inputVal.trim();
    setLoading(true);
    setErrorMessage("");
    setIsSecurityDenied(false);
    setCandidateData(null);
    setPhotoError(false);
    setSignatureError(false);
    setPhotoAttempt(0);
    setSignatureAttempt(0);

    // 1. Client-Side Security Guard:
    // If someone tries to manually enter or alter the URL to a numeric registration number (e.g. 26200001, 26200002)
    // instead of the official AES encrypted security token:
    const isDirectNumericRegNo = /^\d{5,15}$/.test(cleanInput);
    if (isDirectNumericRegNo) {
      setIsSecurityDenied(true);
      setErrorMessage(
        "Direct access by modifying the registration number in the URL is strictly prohibited. The verification portal requires an encrypted digital security token. Please scan the official encrypted QR code on the physical Admit Card."
      );
      setLoading(false);
      return;
    }

    try {
      const res = await api.get(
        `/api/UserPersonalDetails/verify-admit-card/${encodeURIComponent(cleanInput)}`
      );

      if (res?.data && res.data.success) {
        const payload = res.data.data || {};
        const uploadObj = res.data.uploads || {};
        const rollNo = res.data.rollNumber || payload.rollNumber || res.data.allotment?.rollNumber || "";
        const assignedCityVal = res.data.assignedCity || payload.assignedCity || res.data.allotment?.assignedCityDisplay || res.data.allotment?.assignedCity || "";
        const assignedCentreVal = res.data.assignedCentre || payload.assignedCentre || res.data.allotment?.assignedCentreDisplay || res.data.allotment?.assignedCentre || "";

        setCandidateData({
          ...payload,
          rollNumber: rollNo,
          assignedCity: assignedCityVal,
          assignedCentre: assignedCentreVal,
          allotment: res.data.allotment || {}
        });
        setVerificationTime(getLiveIstTimestamp());

        // Get photo and signature ONLY from upload table
        const photoList = generateAssetCandidates(uploadObj.photoFile, "photos");
        const sigList = generateAssetCandidates(uploadObj.signatureFile, "signatures");

        setPhotoCandidates(photoList);
        setSignatureCandidates(sigList);
        setPhotoUrl(photoList[0] || "");
        setSignatureUrl(sigList[0] || "");
      } else {
        setErrorMessage(
          res?.data?.message ||
            "Candidate admit card record not found for the provided security token."
        );
      }
    } catch (err) {
      console.warn("Admit card verification error:", err);
      if (err.response?.status === 403 || err.response?.data?.isSecurityViolation) {
        setIsSecurityDenied(true);
        setErrorMessage(
          err.response?.data?.message ||
            "Access Denied: Invalid, expired, or tampered verification URL. Direct access using registration number is not permitted. Please scan the official encrypted QR code on the physical Admit Card."
        );
      } else {
        const msg =
          err.response?.data?.message ||
          "Admit card record could not be verified. Please scan the official encrypted QR code.";
        setErrorMessage(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // Auto-verify on mount or whenever parameter changes
  useEffect(() => {
    if (targetInput) {
      verifyCandidate(targetInput);
    } else {
      setCandidateData(null);
      setErrorMessage("");
      setIsSecurityDenied(false);
    }
  }, [targetInput]);

  // Handle image load error fallback for photo
  const handlePhotoError = () => {
    const nextIdx = photoAttempt + 1;
    if (nextIdx < photoCandidates.length) {
      setPhotoAttempt(nextIdx);
      setPhotoUrl(photoCandidates[nextIdx]);
    } else {
      setPhotoError(true);
    }
  };

  // Handle image load error fallback for signature
  const handleSignatureError = () => {
    const nextIdx = signatureAttempt + 1;
    if (nextIdx < signatureCandidates.length) {
      setSignatureAttempt(nextIdx);
      setSignatureUrl(signatureCandidates[nextIdx]);
    } else {
      setSignatureError(true);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-slate-100 py-6 sm:py-10 px-3 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-4xl mx-auto space-y-5">

          {/* Loading State */}
          {loading && (
            <div className="bg-white rounded-2xl p-12 text-center shadow-md border border-slate-200 space-y-4">
              <Spin size="large" />
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-slate-800">
                  Verifying Admit Card Credentials...
                </h3>
                <p className="text-xs sm:text-sm text-slate-500">
                  Connecting to Uttarakhand Board of School Education central database
                </p>
              </div>
            </div>
          )}

          {/* Security Access Denied State (Direct Registration Number or Tampered URL detected) */}
          {!loading && isSecurityDenied && (
            <div className="bg-white rounded-2xl p-6 sm:p-8 text-center shadow-lg border-2 border-red-500 space-y-4 max-w-2xl mx-auto">
              <div className="w-16 h-16 mx-auto bg-red-100 text-red-600 rounded-full flex items-center justify-center shadow-inner">
                <FaLock className="w-8 h-8" />
              </div>
              <div className="space-y-3">
                <span className="inline-block px-3.5 py-1 bg-red-600 text-white font-black text-[11px] sm:text-xs rounded-full uppercase tracking-wider shadow-xs">
                  ✕ Security Access Denied / पहुंच अस्वीकृत
                </span>
                <h2 className="text-lg sm:text-xl font-black text-slate-800">
                  Direct Registration Number Access Prohibited
                </h2>
                <div className="bg-red-50 text-red-900 p-4 sm:p-5 rounded-xl border border-red-200 text-xs sm:text-sm font-medium leading-relaxed text-left space-y-2.5">
                  <p className="flex items-start gap-2.5">
                    <span className="text-red-600 font-black text-base shrink-0 leading-none mt-0.5">•</span>
                    <span><strong>URL Modification Blocked:</strong> Candidate admit card records cannot be viewed by simply typing or altering the registration number in the browser URL.</span>
                  </p>
                  <p className="flex items-start gap-2.5">
                    <span className="text-red-600 font-black text-base shrink-0 leading-none mt-0.5">•</span>
                    <span><strong>Encrypted Token Mandatory:</strong> Access strictly requires a tamper-proof AES encrypted token issued only by the Uttarakhand Board of School Education (UBSE) server.</span>
                  </p>
                  <p className="flex items-start gap-2.5">
                    <span className="text-red-600 font-black text-base shrink-0 leading-none mt-0.5">•</span>
                    <span><strong>Official QR Scan Required:</strong> To verify this candidate, please scan the genuine encrypted QR code printed on their physical Admit Card.</span>
                  </p>
                </div>
                <div className="pt-1 text-[11px] sm:text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200 text-left">
                  <strong>Notice for Exam Center Invigilators:</strong> In case of any dispute or unreadable QR code, please verify the candidate using their original government Photo ID proof and contact the Centre Superintendent.
                </div>
              </div>
            </div>
          )}

          {/* General Error / Not Found State (When not a security denial) */}
          {!loading && !isSecurityDenied && errorMessage && (
            <div className="bg-white rounded-2xl p-6 sm:p-8 text-center shadow-md border border-red-200 space-y-4 max-w-2xl mx-auto">
              <div className="w-16 h-16 mx-auto bg-red-100 text-red-600 rounded-full flex items-center justify-center shadow-inner">
                <FaTimesCircle className="w-9 h-9" />
              </div>
              <div className="space-y-2 max-w-lg mx-auto">
                <span className="inline-block px-3 py-1 bg-red-100 text-red-800 font-extrabold text-[11px] sm:text-xs rounded-full uppercase tracking-wider border border-red-300">
                  ✕ Verification Failed / सत्यापन विफल
                </span>
                <h2 className="text-lg sm:text-xl font-black text-slate-800">
                  Admit Card Record Not Verified
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                  {errorMessage}
                </p>
                <div className="pt-2 text-[11px] sm:text-xs text-slate-400 bg-slate-50 p-3 rounded-lg border border-slate-200 text-left">
                  <strong>Notice for Exam Center Invigilators:</strong> If the candidate claims valid registration, please request their physical identity document and contact the Centre Superintendent or Central Control Room.
                </div>
              </div>
            </div>
          )}

          {/* Empty State when no registration number parameter is provided */}
          {!loading && !errorMessage && !candidateData && (
            <div className="bg-white rounded-2xl p-8 sm:p-12 text-center shadow-md border border-slate-200 space-y-5">
              <div className="w-16 h-16 mx-auto bg-blue-50 text-blue-700 rounded-2xl flex items-center justify-center border border-blue-200 shadow-inner">
                <FaIdCard className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <h2 className="text-lg sm:text-xl font-black text-slate-800">
                  Admit Card Verification Portal
                </h2>
                <p className="text-xs sm:text-sm text-slate-600">
                  Please scan the official QR code printed on the UK D.El.Ed. Entrance Exam Admit Card to verify candidate credentials.
                </p>
              </div>
            </div>
          )}

          {/* Verified Candidate Sheet */}
          {!loading && candidateData && (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
              {/* Verified Status Bar (Card Header matching theme blue) */}
              <div className="bg-blue-600 text-white px-5 sm:px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 bg-white text-blue-600 rounded-full flex items-center justify-center shadow-xs shrink-0">
                    <FaCheck className="w-4 h-4 stroke-[3]" />
                  </span>
                  <div>
                    <h2 className="text-sm sm:text-base font-black tracking-wide uppercase flex items-center gap-2">
                      <span>OFFICIALLY VERIFIED CANDIDATE</span>
                      <span className="hidden sm:inline-block text-blue-200">|</span>
                      <span className="text-xs sm:text-sm font-bold text-blue-100">सत्यापित अभ्यर्थी</span>
                    </h2>
                    <p className="text-[11px] text-blue-100 font-medium mt-0.5">
                      Two-Year D.El.Ed. Entrance Examination - 2026 (द्विवर्षीय डी.एल.एड. प्रवेश परीक्षा - 2026)
                    </p>
                  </div>
                </div>
                <div className="text-[11px] sm:text-xs font-bold text-white bg-blue-700 px-3.5 py-1.5 rounded-full border border-blue-400/40 flex items-center gap-1.5 shrink-0 shadow-xs">
                  <FaShieldAlt className="w-3.5 h-3.5 text-blue-200" />
                  <span>Verified On: {verificationTime || getLiveIstTimestamp()}</span>
                </div>
              </div>

              {/* Main Candidate Content */}
              <div className="p-4 sm:p-6 md:p-8 space-y-6">

                {/* Candidate Photo & Signature Row (Photo and Signature ONLY, No Thumb, No QR) */}
                <div className="bg-slate-50 rounded-xl p-4 sm:p-5 border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-5">
                  <div className="flex items-center gap-6 sm:gap-8 flex-wrap justify-center sm:justify-start">
                    {/* Candidate Photo (From Upload table via UserId) */}
                    <div className="text-center space-y-1.5">
                      <div className="w-28 h-36 sm:w-32 sm:h-40 bg-white border-2 border-slate-300 rounded-lg overflow-hidden shadow-xs flex items-center justify-center relative">
                        {photoUrl && !photoError ? (
                          <img
                            src={photoUrl}
                            alt="Candidate Photograph"
                            className="w-full h-full object-cover"
                            onError={handlePhotoError}
                          />
                        ) : (
                          <div className="text-slate-400 flex flex-col items-center gap-1 p-2">
                            <FaUserCheck className="w-8 h-8 text-slate-300" />
                            <span className="text-[10px] font-bold">Photo on Record</span>
                          </div>
                        )}
                        <span className="absolute bottom-0 inset-x-0 bg-blue-900/80 text-white text-[9px] font-extrabold uppercase py-0.5 text-center">
                          PHOTO
                        </span>
                      </div>
                    </div>

                    {/* Candidate Signature (From Upload table via UserId) */}
                    <div className="text-center space-y-1.5">
                      <div className="w-36 h-20 sm:w-44 sm:h-24 bg-white border-2 border-slate-300 rounded-lg overflow-hidden shadow-xs flex items-center justify-center p-1.5 relative">
                        {signatureUrl && !signatureError ? (
                          <img
                            src={signatureUrl}
                            alt="Candidate Signature"
                            className="w-full h-full object-contain"
                            onError={handleSignatureError}
                          />
                        ) : (
                          <div className="text-slate-400 flex flex-col items-center gap-0.5">
                            <FaSignature className="w-6 h-6 text-slate-300" />
                            <span className="text-[10px] font-bold">Signature on Record</span>
                          </div>
                        )}
                        <span className="absolute bottom-0 inset-x-0 bg-blue-900/80 text-white text-[8px] font-extrabold uppercase py-0.5 text-center">
                          SIGNATURE
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Invigilator Guidance Notice */}
                  <div className="flex-1 max-w-md bg-blue-50/80 rounded-xl p-3.5 sm:p-4 border border-blue-200 space-y-2 text-left">
                    <div className="flex items-center gap-2 text-blue-900 font-extrabold text-xs sm:text-sm uppercase tracking-wide">
                      <FaShieldAlt className="w-4 h-4 text-blue-700 shrink-0" />
                      <span>Centre Invigilator Cross-Check</span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-blue-950 font-semibold leading-relaxed">
                      परीक्षा केंद्र निरीक्षक कृपया परीक्षा कक्ष में उपस्थित अभ्यर्थी का मिलान उपर्युक्त फोटो एवं हस्ताक्षर से करें।
                    </p>
                  </div>
                </div>

                {/* Candidate Particulars Structured Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <div className="bg-slate-100 px-4 sm:px-5 py-2.5 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="text-xs sm:text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <FaUserCheck className="w-4 h-4 text-blue-700" />
                      <span>CANDIDATE DETAILS (अभ्यर्थी का विवरण)</span>
                    </h3>
                    <span className="text-[10px] sm:text-xs font-extrabold text-blue-800 bg-blue-100 px-2.5 py-0.5 rounded-full border border-blue-200">
                      UK D.El.Ed 2026
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 text-xs sm:text-sm">
                    {/* Left Column */}
                    <div className="divide-y divide-slate-200">
                      <div className="p-3 sm:p-3.5 flex justify-between bg-white hover:bg-slate-50/50">
                        <span className="font-bold text-slate-500">Roll Number (अनुक्रमांक):</span>
                        <span className="font-mono font-black text-blue-700 text-sm sm:text-base">
                          {candidateData.rollNumber || "N/A"}
                        </span>
                      </div>

                      <div className="p-3 sm:p-3.5 flex justify-between bg-white hover:bg-slate-50/50">
                        <span className="font-bold text-slate-500">Candidate's Name (अभ्यर्थी का नाम):</span>
                        <span className="font-black text-slate-900 uppercase">
                          {candidateData.applicantName || candidateData.fullName || "N/A"}
                        </span>
                      </div>

                      <div className="p-3 sm:p-3.5 flex justify-between bg-white hover:bg-slate-50/50">
                        <span className="font-bold text-slate-500">Father's Name (पिता का नाम):</span>
                        <span className="font-bold text-slate-800 uppercase">
                          {candidateData.fatherName || "N/A"}
                        </span>
                      </div>

                      <div className="p-3 sm:p-3.5 flex justify-between bg-white hover:bg-slate-50/50">
                        <span className="font-bold text-slate-500">Mother's Name (माता का नाम):</span>
                        <span className="font-bold text-slate-800 uppercase">
                          {candidateData.motherName || "N/A"}
                        </span>
                      </div>

                      <div className="p-3 sm:p-3.5 flex justify-between bg-white hover:bg-slate-50/50">
                        <span className="font-bold text-slate-500">Date of Birth (जन्म तिथि):</span>
                        <span className="font-bold text-slate-800">
                          {formatDob(candidateData.dob || candidateData.DOB)}
                        </span>
                      </div>

                      <div className="p-3 sm:p-3.5 flex justify-between bg-white hover:bg-slate-50/50">
                        <span className="font-bold text-slate-500">Gender (लिंग):</span>
                        <span className="font-bold text-slate-800 uppercase">
                          {candidateData.gender || "N/A"}
                        </span>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="divide-y divide-slate-200">
                      <div className="p-3 sm:p-3.5 flex justify-between bg-white hover:bg-slate-50/50">
                        <span className="font-bold text-slate-500">Category (श्रेणी):</span>
                        <span className="font-bold text-slate-900 uppercase">
                          {candidateData.category || "GENERAL"}
                        </span>
                      </div>

                      <div className="p-3 sm:p-3.5 flex justify-between bg-white hover:bg-slate-50/50">
                        <span className="font-bold text-slate-500">Applied Exam (परीक्षा):</span>
                        <span className="font-bold text-blue-900 uppercase">
                          {candidateData.applicationFor || "D.El.Ed. Entrance Exam 2026"}
                        </span>
                      </div>

                      <div className="p-3 sm:p-3.5 flex justify-between items-center bg-white hover:bg-slate-50/50">
                        <span className="font-bold text-slate-500">Assigned City (आवंटित शहर):</span>
                        <span className="font-bold text-slate-900 uppercase font-mono text-sm">
                          {candidateData.assignedCity || candidateData.allotment?.assignedCityDisplay || candidateData.allotment?.assignedCity || "N/A"}
                        </span>
                      </div>

                      <div className="p-3 sm:p-3.5 flex justify-between items-start gap-3 bg-white hover:bg-slate-50/50">
                        <span className="font-bold text-slate-500 shrink-0">Assigned Centre (आवंटित केन्द्र):</span>
                        <span className="font-bold text-slate-900 text-right leading-snug">
                          {candidateData.assignedCentre || candidateData.allotment?.assignedCentreDisplay || candidateData.allotment?.assignedCentre || "N/A"}
                        </span>
                      </div>

                      <div className="p-3 sm:p-3.5 flex justify-between bg-white hover:bg-slate-50/50">
                        <span className="font-bold text-slate-500">ID Proof (पहचान पत्र):</span>
                        <span className="font-bold text-slate-900 uppercase">
                          {candidateData.identityProof || "Aadhaar Card / Official ID"}
                        </span>
                      </div>

                      <div className="p-3 sm:p-3.5 flex justify-between bg-white hover:bg-slate-50/50">
                        <span className="font-bold text-slate-500">ID Number (पहचान पत्र संख्या):</span>
                        <span className="font-mono font-black text-blue-900">
                          {candidateData.identityProofNo || "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Verification Authenticity Notice */}
                <div className="pt-2 flex items-center gap-2 text-xs text-slate-500 font-medium border-t border-slate-200">
                  <FaLock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Central DB Authenticated Electronic Record. No physical signature required for QR validation.</span>
                </div>

              </div>

              {/* Official Footer Verification Note */}
              <div className="bg-slate-50 border-t border-slate-200 p-3 sm:p-4 text-center text-[10px] sm:text-[11px] text-slate-500 font-medium">
                Uttarakhand Board of School Education, Ramnagar (Nainital) © 2026. Electronic Verification System for D.El.Ed Entrance Exam 2026.
              </div>
            </div>
          )}

        </div>
      </div>
    </Layout>
  );
}
