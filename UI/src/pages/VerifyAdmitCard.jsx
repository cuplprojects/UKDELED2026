import React, { useState, useEffect, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Spin } from "antd";
import {
  FaShieldAlt,
  FaIdCard,
  FaUserCheck,
  FaCheck,
  FaSignature,
  FaQrcode
} from "react-icons/fa";
import { QRCodeSVG as QRCode } from "qrcode.react";
import Layout from "../components/Layout";
import PageNotFound from "./PageNotFound";
import { api } from "../stores/apiStore";
import { formatDateToDDMMYYYY } from "../utils/dateUtils";

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
  const [isNotFound, setIsNotFound] = useState(false);
  const [showRawData, setShowRawData] = useState(false);

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
  const formatDob = (dobStr) => formatDateToDDMMYYYY(dobStr) || "N/A";

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
  const verifyCandidate = async (inputVal) => {
    if (!inputVal || !inputVal.trim()) {
      setCandidateData(null);
      setIsNotFound(false);
      return;
    }

    const cleanInput = inputVal.trim();
    setLoading(true);
    setIsNotFound(false);
    setCandidateData(null);
    setPhotoError(false);
    setSignatureError(false);
    setPhotoAttempt(0);
    setSignatureAttempt(0);

    // If direct numeric registration number is used instead of encrypted token, treat as page not found
    const isDirectNumericRegNo = /^\d{5,15}$/.test(cleanInput);
    if (isDirectNumericRegNo) {
      setIsNotFound(true);
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
          registrationNo: payload.registrationNo || res.data.registrationNo || "",
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
        setIsNotFound(true);
      }
    } catch (err) {
      console.warn("Admit card verification error:", err);
      setIsNotFound(true);
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
      setIsNotFound(false);
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

  // If candidate record is not found or direct registration number is entered, render 404 Page Not Found
  if (isNotFound) {
    return <PageNotFound />;
  }

  return (
    <Layout hideHeader hideNavbar>
      <div className="min-h-screen bg-slate-100 py-6 sm:py-10 px-3 sm:px-6 lg:px-8 font-sans">
        <div className="w-full max-w-screen-2xl mx-auto space-y-5">

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

          {/* Empty State when no registration number or token parameter is provided */}
          {!loading && !candidateData && (
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
          {!loading && candidateData && (() => {
            const candidateNameVal = candidateData.applicantName || candidateData.fullName || "N/A";
            const rollNumberVal = candidateData.rollNumber || "N/A";
            const registrationNoVal = candidateData.registrationNo || "N/A";
            const assignedCityVal = candidateData.assignedCity || candidateData.allotment?.assignedCityDisplay || candidateData.allotment?.assignedCity || "N/A";
            const assignedCentreVal = candidateData.assignedCentre || candidateData.allotment?.assignedCentreDisplay || candidateData.allotment?.assignedCentre || "N/A";

            const staticQrData = [
              `Roll No: ${rollNumberVal}`,
              `Candidate Name: ${candidateNameVal}`,
              `Father's Name: ${candidateData.fatherName || "N/A"}`,
              `Date of Birth: ${formatDob(candidateData.dob || candidateData.DOB)}`,
              `Assigned Centre: ${assignedCentreVal}`
            ].join("\n");

            const renderPhotoBox = () => (
              <div className="inline-flex flex-col border-2 border-slate-300 rounded-lg overflow-hidden shadow-xs bg-white">
                <div className="w-24 h-32 sm:w-28 sm:h-36 bg-white flex items-center justify-center">
                  {photoUrl && !photoError ? (
                    <img
                      src={photoUrl}
                      alt="Candidate Photograph"
                      className="w-full h-full object-cover"
                      onError={handlePhotoError}
                    />
                  ) : (
                    <div className="text-slate-400 flex flex-col items-center gap-1 p-2">
                      <FaUserCheck className="w-7 h-7 sm:w-8 sm:h-8 text-slate-300" />
                      <span className="text-[9px] sm:text-[10px] font-bold text-center">Photo on Record</span>
                    </div>
                  )}
                </div>
                <span className="bg-blue-900 text-white text-[9px] sm:text-[10px] font-extrabold uppercase py-1 px-2 text-center tracking-wider">
                  PHOTO
                </span>
              </div>
            );

            const renderSignatureBox = () => (
              <div className="inline-flex flex-col border-2 border-slate-300 rounded-lg overflow-hidden shadow-xs bg-white">
                <div className="w-28 h-14 sm:w-36 sm:h-16 bg-white flex items-center justify-center p-1.5">
                  {signatureUrl && !signatureError ? (
                    <img
                      src={signatureUrl}
                      alt="Candidate Signature"
                      className="w-full h-full object-contain"
                      onError={handleSignatureError}
                    />
                  ) : (
                    <div className="text-slate-400 flex flex-col items-center gap-0.5">
                      <FaSignature className="w-5 h-5 sm:w-6 sm:h-6 text-slate-300" />
                      <span className="text-[9px] sm:text-[10px] font-bold text-center">Signature on Record</span>
                    </div>
                  )}
                </div>
                <span className="bg-blue-900 text-white text-[9px] font-extrabold uppercase py-1 px-2 text-center tracking-wider">
                  SIGNATURE
                </span>
              </div>
            );

            return (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
              {/* Verified Status Bar */}
              <div className="bg-blue-600 text-white px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 bg-white text-blue-600 rounded-full flex items-center justify-center shadow-xs shrink-0">
                    <FaCheck className="w-4 h-4 stroke-[3]" />
                  </span>
                  <div>
                    <h2 className="text-sm sm:text-base font-black tracking-wide uppercase flex flex-wrap items-center gap-x-2">
                      <span>Candidate Details</span>
                      <span className="hidden sm:inline-block text-blue-200">|</span>
                      <span className="text-xs sm:text-sm font-bold text-blue-100">अभ्यर्थी विवरण</span>
                      <span className="text-[10px] sm:text-xs font-black text-blue-900 bg-blue-100 px-2.5 py-0.5 rounded-full border border-blue-200 shrink-0">
                        UK D.El.Ed 2026
                      </span>
                    </h2>
                  </div>
                </div>
                <div className="text-[11px] sm:text-xs font-bold text-white bg-blue-700 px-3 py-1.5 rounded-full border border-blue-400/40 flex items-center gap-1.5 shrink-0 shadow-xs max-w-full">
                  <FaShieldAlt className="w-3.5 h-3.5 text-blue-200 shrink-0" />
                  <span className="truncate">Verified On: {verificationTime || getLiveIstTimestamp()}</span>
                </div>
              </div>

              {/* Main Candidate Content */}
              <div className="p-3 sm:p-6">
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white">
                  {/* ── MOBILE layout (< md = < 768px) ── */}
                  <div className="block md:hidden">
                    {/* Photo + Signature: side by side, centered */}
                    <div className="flex flex-row items-end justify-center gap-3 py-3 border-b border-slate-200 bg-slate-50/60">
                      {renderPhotoBox()}
                      {renderSignatureBox()}
                    </div>

                    {/* Detail rows: label left, value right */}
                    {[
                      { label: "Candidate Name (नाम):", value: candidateNameVal, valClass: "font-black text-slate-900 uppercase" },
                      { label: "Father's Name (पिता):", value: candidateData.fatherName || "N/A", valClass: "font-bold text-slate-800 uppercase" },
                      { label: "Reg. No. (पंजीकरण):", value: registrationNoVal, valClass: "font-mono font-black text-indigo-800" },
                      { label: "Roll No. (अनुक्रमांक):", value: rollNumberVal, valClass: "font-mono font-black text-blue-700" },
                      { label: "Assigned City (शहर):", value: assignedCityVal, valClass: "font-bold text-slate-900 uppercase font-mono" },
                      { label: "Assigned Centre (केन्द्र):", value: assignedCentreVal, valClass: "font-bold text-slate-900 leading-snug" },
                      { label: "Date of Birth (जन्म तिथि):", value: formatDob(candidateData.dob || candidateData.DOB), valClass: "font-bold text-slate-800" },
                      { label: "Gender (लिंग):", value: candidateData.gender || "N/A", valClass: "font-bold text-slate-800 uppercase" },
                      { label: "Category (श्रेणी):", value: candidateData.category || "GENERAL", valClass: "font-bold text-slate-900 uppercase" },
                      {
                        label: "ID Proof & No.:",
                        valClass: "font-bold text-slate-900 uppercase",
                        renderValue: () => candidateData.identityProof ? (
                          <>
                            {candidateData.identityProof}
                            {candidateData.identityProofNo && (
                              <span className="font-mono font-black text-blue-900 tracking-wider normal-case">
                                {" "}({candidateData.identityProofNo})
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="font-mono font-black text-blue-900 break-all">
                            {candidateData.identityProofNo || "N/A"}
                          </span>
                        )
                      }
                    ].map(({ label, value, valClass, renderValue }, i, arr) => (
                      <div
                        key={label}
                        className={`flex items-start gap-2 px-3 py-2 text-[11px] ${i < arr.length - 1 ? "border-b border-slate-200" : ""} ${i % 2 === 0 ? "" : "bg-slate-50/40"}`}
                      >
                        <span className="shrink-0 w-[46%] font-semibold text-slate-500 leading-snug">{label}</span>
                        <span className={`flex-1 min-w-0 break-words ${valClass}`}>
                          {renderValue ? renderValue() : value}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* ── DESKTOP table (≥ md = ≥ 768px) ── */}
                  <div className="hidden md:block w-full">
                    <table className="w-full border-collapse text-xs md:text-sm table-auto">
                      <tbody>
                        {/* Row 1: Candidate Name | Father's Name | Photo+Sig (rowspan 5) */}
                        <tr className="border-b border-slate-200 hover:bg-slate-50/40 transition-colors">
                          <td className="bg-slate-50 p-3 font-semibold text-slate-600 border-r border-slate-200 align-middle whitespace-nowrap w-[18%]">
                            Candidate Name (नाम):
                          </td>
                          <td className="p-3 font-black text-slate-900 uppercase border-r border-slate-200 align-middle w-[25%] break-words">
                            {candidateNameVal}
                          </td>
                          <td className="bg-slate-50 p-3 font-semibold text-slate-600 border-r border-slate-200 align-middle whitespace-nowrap w-[18%]">
                            Father's Name (पिता):
                          </td>
                          <td className="p-3 font-bold text-slate-800 uppercase border-r border-slate-200 align-middle w-[25%] break-words">
                            {candidateData.fatherName || "N/A"}
                          </td>
                          {/* Photo & Signature — side by side — spanning all 5 rows */}
                          <td
                            rowSpan={5}
                            className="p-3 text-center align-middle bg-slate-50/70 border-l border-slate-200 w-[14%] min-w-[180px]"
                          >
                            <div className="flex flex-row items-end justify-center gap-3">
                              {renderPhotoBox()}
                              {renderSignatureBox()}
                            </div>
                          </td>
                        </tr>

                        {/* Row 2: Registration No. | Roll Number */}
                        <tr className="border-b border-slate-200 hover:bg-slate-50/40 transition-colors">
                          <td className="bg-slate-50 p-3 font-semibold text-slate-600 border-r border-slate-200 align-middle whitespace-nowrap">
                            Reg. No. (पंजीकरण):
                          </td>
                          <td className="p-3 font-mono font-black text-indigo-800 border-r border-slate-200 align-middle break-words">
                            {registrationNoVal}
                          </td>
                          <td className="bg-slate-50 p-3 font-semibold text-slate-600 border-r border-slate-200 align-middle whitespace-nowrap">
                            Roll No. (अनुक्रमांक):
                          </td>
                          <td className="p-3 font-mono font-black text-blue-700 border-r border-slate-200 align-middle break-words">
                            {rollNumberVal}
                          </td>
                        </tr>

                        {/* Row 3: Assigned City | Assigned Centre */}
                        <tr className="border-b border-slate-200 hover:bg-slate-50/40 transition-colors">
                          <td className="bg-slate-50 p-3 font-semibold text-slate-600 border-r border-slate-200 align-middle whitespace-nowrap">
                            Assigned City (शहर):
                          </td>
                          <td className="p-3 font-bold text-slate-900 uppercase font-mono border-r border-slate-200 align-middle break-words">
                            {assignedCityVal}
                          </td>
                          <td className="bg-slate-50 p-3 font-semibold text-slate-600 border-r border-slate-200 align-middle whitespace-nowrap">
                            Assigned Centre (केन्द्र):
                          </td>
                          <td className="p-3 font-bold text-slate-900 leading-snug border-r border-slate-200 align-middle break-words">
                            {assignedCentreVal}
                          </td>
                        </tr>

                        {/* Row 4: Date of Birth | Gender */}
                        <tr className="border-b border-slate-200 hover:bg-slate-50/40 transition-colors">
                          <td className="bg-slate-50 p-3 font-semibold text-slate-600 border-r border-slate-200 align-middle whitespace-nowrap">
                            Date of Birth (जन्म तिथि):
                          </td>
                          <td className="p-3 font-bold text-slate-800 border-r border-slate-200 align-middle break-words">
                            {formatDob(candidateData.dob || candidateData.DOB)}
                          </td>
                          <td className="bg-slate-50 p-3 font-semibold text-slate-600 border-r border-slate-200 align-middle whitespace-nowrap">
                            Gender (लिंग):
                          </td>
                          <td className="p-3 font-bold text-slate-800 uppercase border-r border-slate-200 align-middle break-words">
                            {candidateData.gender || "N/A"}
                          </td>
                        </tr>

                        {/* Row 5: Category | ID Proof & ID Number (combined) */}
                        <tr className="hover:bg-slate-50/40 transition-colors">
                          <td className="bg-slate-50 p-3 font-semibold text-slate-600 border-r border-slate-200 align-middle whitespace-nowrap">
                            Category (श्रेणी):
                          </td>
                          <td className="p-3 font-bold text-slate-900 uppercase border-r border-slate-200 align-middle break-words">
                            {candidateData.category || "GENERAL"}
                          </td>
                          <td className="bg-slate-50 p-3 font-semibold text-slate-600 border-r border-slate-200 align-middle whitespace-nowrap">
                            ID Proof &amp; No.:
                          </td>
                          <td className="p-3 font-bold text-slate-900 border-r border-slate-200 align-middle break-words">
                            {candidateData.identityProof ? (
                              <span className="uppercase text-slate-800">
                                {candidateData.identityProof}
                                {candidateData.identityProofNo && (
                                  <span className="font-mono font-black text-blue-900 tracking-wider normal-case">
                                    {" "}({candidateData.identityProofNo})
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="font-mono font-black text-blue-900 break-all">
                                {candidateData.identityProofNo || "N/A"}
                              </span>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ── Official Static Verification QR Section ── */}
                <div className="mt-4 sm:mt-6 p-4 sm:p-5 bg-gradient-to-r from-slate-50 via-blue-50/25 to-slate-50 border border-slate-200 rounded-xl shadow-xs">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
                    {/* QR Code Graphic Box */}
                    <div className="inline-flex flex-col items-center bg-white border-2 border-slate-300 rounded-xl p-3 shadow-xs shrink-0">
                      <QRCode
                        value={staticQrData}
                        size={120}
                        level="M"
                        includeMargin={false}
                        className="w-28 h-28 sm:w-32 sm:h-32"
                      />
                      <span className="bg-blue-900 text-white text-[9px] font-extrabold uppercase py-0.5 px-2.5 rounded-sm tracking-wider mt-2 flex items-center gap-1 shadow-xs">
                        <FaQrcode className="w-2.5 h-2.5" />
                        STATIC DATA QR
                      </span>
                    </div>

                    {/* QR Description & Offline Info */}
                    <div className="flex-1 text-center sm:text-left space-y-2 min-w-0">
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                        <h4 className="text-sm sm:text-base font-extrabold text-slate-800 tracking-wide uppercase">
                          Official Static Verification QR Code
                        </h4>
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                          Offline Readable
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl">
                        Scan this QR code with any smartphone camera, Google Lens, or barcode scanner to view candidate credentials instantly in static plain text format without requiring internet access.
                      </p>

                      <div className="pt-1 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                        <button
                          type="button"
                          onClick={() => setShowRawData((prev) => !prev)}
                          className="text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-100/70 hover:bg-blue-100 px-2.5 py-1 rounded-md border border-blue-200 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <FaQrcode className="w-3 h-3 text-blue-600" />
                          {showRawData ? "Hide Scanned Text Preview" : "Preview Scanned Static Text"}
                        </button>
                      </div>

                      {/* Collapsible Scanned Text Preview */}
                      {showRawData && (
                        <div className="mt-3 p-3 bg-slate-900 text-emerald-400 font-mono text-[11px] sm:text-xs rounded-lg overflow-x-auto whitespace-pre leading-relaxed shadow-inner border border-slate-700 text-left">
                          {staticQrData}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            );
          })()}

        </div>
      </div>
    </Layout>
  );
}
