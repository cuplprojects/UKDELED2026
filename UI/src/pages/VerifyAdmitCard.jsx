import React, { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Spin } from "antd";
import {
  FaShieldAlt,
  FaIdCard,
  FaUserCheck,
  FaCheck,
  FaSignature
} from "react-icons/fa";
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

            const mobileDetailRows = [
              { label: "Candidate's Name (अभ्यर्थी का नाम)", value: candidateNameVal, valueClass: "font-black text-slate-900 uppercase text-sm" },
              { label: "Roll Number (अनुक्रमांक)", value: rollNumberVal, valueClass: "font-mono font-black text-blue-700 text-base" },
              { label: "Registration Number (पंजीकरण संख्या)", value: registrationNoVal, valueClass: "font-mono font-black text-indigo-800 text-sm" },
              { label: "Father's Name (पिता का नाम)", value: candidateData.fatherName || "N/A", valueClass: "font-bold text-slate-800 uppercase" },
              { label: "Mother's Name (माता का नाम)", value: candidateData.motherName || "N/A", valueClass: "font-bold text-slate-800 uppercase" },
              { label: "Date of Birth (जन्म तिथि)", value: formatDob(candidateData.dob || candidateData.DOB), valueClass: "font-bold text-slate-800" },
              { label: "Gender (लिंग)", value: candidateData.gender || "N/A", valueClass: "font-bold text-slate-800 uppercase" },
              { label: "Category (श्रेणी)", value: candidateData.category || "GENERAL", valueClass: "font-bold text-slate-900 uppercase" },
              { label: "Applied Exam (परीक्षा)", value: candidateData.applicationFor || "D.El.Ed. Entrance Exam 2026", valueClass: "font-bold text-blue-900 uppercase" },
              { label: "ID Proof (पहचान पत्र)", value: candidateData.identityProof || "Aadhaar Card / Official ID", valueClass: "font-bold text-slate-900 uppercase" },
              { label: "ID Number (पहचान पत्र संख्या)", value: candidateData.identityProofNo || "N/A", valueClass: "font-mono font-black text-blue-900 break-all" },
              { label: "Assigned City (आवंटित शहर)", value: assignedCityVal, valueClass: "font-bold text-slate-900 uppercase font-mono" },
              { label: "Assigned Centre (आवंटित केन्द्र)", value: assignedCentreVal, valueClass: "font-bold text-slate-900 leading-snug" }
            ];

            const renderPhotoBox = () => (
              <div className="inline-flex flex-col border-2 border-slate-300 rounded-lg overflow-hidden shadow-xs bg-white">
                <div className="w-28 h-36 bg-white flex items-center justify-center">
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
                </div>
                <span className="bg-blue-900 text-white text-[10px] font-extrabold uppercase py-1 px-2 text-center tracking-wider">
                  PHOTO
                </span>
              </div>
            );

            const renderSignatureBox = () => (
              <div className="inline-flex flex-col border-2 border-slate-300 rounded-lg overflow-hidden shadow-xs bg-white">
                <div className="w-36 h-16 bg-white flex items-center justify-center p-1.5">
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
                </div>
                <span className="bg-blue-900 text-white text-[9px] font-extrabold uppercase py-1 px-2 text-center tracking-wider">
                  SIGNATURE
                </span>
              </div>
            );

            return (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
              {/* Verified Status Bar (Card Header matching theme blue) */}
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
                  {/* Table Sub-Header */}
                  <div className="bg-slate-100 px-3 sm:px-5 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-xs sm:text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2 min-w-0">
                      <FaUserCheck className="w-4 h-4 text-blue-700 shrink-0" />
                      <span className="break-words">CANDIDATE DETAILS (अभ्यर्थी का विवरण)</span>
                    </h3>
                    <span className="text-[10px] sm:text-xs font-extrabold text-blue-800 bg-blue-100 px-2.5 py-0.5 rounded-full border border-blue-200 shrink-0">
                      UK D.El.Ed 2026
                    </span>
                  </div>

                  {/* Mobile Responsive Layout (No Horizontal Scroll): Photo -> Signature -> Name -> Roll No -> Reg No -> Other Details */}
                  <div className="block md:hidden">
                    <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-col items-center justify-center gap-3">
                      {renderPhotoBox()}
                      {renderSignatureBox()}
                    </div>
                    <div className="divide-y divide-slate-200">
                      {mobileDetailRows.map((item, idx) => (
                        <div key={idx} className="px-3.5 py-2.5 flex flex-col gap-0.5">
                          <span className="text-[11px] font-semibold text-slate-500">
                            {item.label}:
                          </span>
                          <span className={`text-xs break-words ${item.valueClass}`}>
                            {item.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Desktop Synchronized Table Layout */}
                  <div className="hidden md:block">
                    <table className="w-full border-collapse text-xs sm:text-sm">
                      <tbody>
                        {/* Row 1: Candidate's Name & Roll Number */}
                        <tr className="border-b border-slate-200 hover:bg-slate-50/40 transition-colors">
                          <td className="w-[18%] bg-slate-50 p-3 font-semibold text-slate-600 border-r border-slate-200 align-middle">
                            Candidate's Name (अभ्यर्थी का नाम):
                          </td>
                          <td className="w-[23%] p-3 font-black text-slate-900 uppercase border-r border-slate-200 align-middle">
                            {candidateNameVal}
                          </td>
                          <td className="w-[18%] bg-slate-50 p-3 font-semibold text-slate-600 border-r border-slate-200 align-middle">
                            Roll Number (अनुक्रमांक):
                          </td>
                          <td className="w-[23%] p-3 font-mono font-black text-blue-700 text-base border-r border-slate-200 align-middle">
                            {rollNumberVal}
                          </td>
                          {/* Right Hand Column: Photo & Signature spanning all rows */}
                          <td
                            rowSpan={7}
                            className="w-[18%] min-w-[165px] p-3 text-center align-middle bg-slate-50/70 border-l border-slate-200"
                          >
                            <div className="flex flex-col items-center justify-center gap-3.5">
                              {renderPhotoBox()}
                              {renderSignatureBox()}
                            </div>
                          </td>
                        </tr>

                        {/* Row 2: Registration Number & Applied Exam */}
                        <tr className="border-b border-slate-200 hover:bg-slate-50/40 transition-colors">
                          <td className="bg-slate-50 p-3 font-semibold text-slate-600 border-r border-slate-200 align-middle">
                            Registration Number (पंजीकरण संख्या):
                          </td>
                          <td className="p-3 font-mono font-black text-indigo-800 border-r border-slate-200 align-middle">
                            {registrationNoVal}
                          </td>
                          <td className="bg-slate-50 p-3 font-semibold text-slate-600 border-r border-slate-200 align-middle">
                            Applied Exam (परीक्षा):
                          </td>
                          <td className="p-3 font-bold text-blue-900 uppercase border-r border-slate-200 align-middle">
                            {candidateData.applicationFor || "D.El.Ed. Entrance Exam 2026"}
                          </td>
                        </tr>

                        {/* Row 3: Father's Name & Mother's Name */}
                        <tr className="border-b border-slate-200 hover:bg-slate-50/40 transition-colors">
                          <td className="bg-slate-50 p-3 font-semibold text-slate-600 border-r border-slate-200 align-middle">
                            Father's Name (पिता का नाम):
                          </td>
                          <td className="p-3 font-bold text-slate-800 uppercase border-r border-slate-200 align-middle">
                            {candidateData.fatherName || "N/A"}
                          </td>
                          <td className="bg-slate-50 p-3 font-semibold text-slate-600 border-r border-slate-200 align-middle">
                            Mother's Name (माता का नाम):
                          </td>
                          <td className="p-3 font-bold text-slate-800 uppercase border-r border-slate-200 align-middle">
                            {candidateData.motherName || "N/A"}
                          </td>
                        </tr>

                        {/* Row 4: Date of Birth & Gender */}
                        <tr className="border-b border-slate-200 hover:bg-slate-50/40 transition-colors">
                          <td className="bg-slate-50 p-3 font-semibold text-slate-600 border-r border-slate-200 align-middle">
                            Date of Birth (जन्म तिथि):
                          </td>
                          <td className="p-3 font-bold text-slate-800 border-r border-slate-200 align-middle">
                            {formatDob(candidateData.dob || candidateData.DOB)}
                          </td>
                          <td className="bg-slate-50 p-3 font-semibold text-slate-600 border-r border-slate-200 align-middle">
                            Gender (लिंग):
                          </td>
                          <td className="p-3 font-bold text-slate-800 uppercase border-r border-slate-200 align-middle">
                            {candidateData.gender || "N/A"}
                          </td>
                        </tr>

                        {/* Row 5: Category & ID Proof */}
                        <tr className="border-b border-slate-200 hover:bg-slate-50/40 transition-colors">
                          <td className="bg-slate-50 p-3 font-semibold text-slate-600 border-r border-slate-200 align-middle">
                            Category (श्रेणी):
                          </td>
                          <td className="p-3 font-bold text-slate-900 uppercase border-r border-slate-200 align-middle">
                            {candidateData.category || "GENERAL"}
                          </td>
                          <td className="bg-slate-50 p-3 font-semibold text-slate-600 border-r border-slate-200 align-middle">
                            ID Proof (पहचान पत्र):
                          </td>
                          <td className="p-3 font-bold text-slate-900 uppercase border-r border-slate-200 align-middle">
                            {candidateData.identityProof || "Aadhaar Card / Official ID"}
                          </td>
                        </tr>

                        {/* Row 6: ID Number & Assigned City */}
                        <tr className="border-b border-slate-200 hover:bg-slate-50/40 transition-colors">
                          <td className="bg-slate-50 p-3 font-semibold text-slate-600 border-r border-slate-200 align-middle">
                            ID Number (पहचान पत्र संख्या):
                          </td>
                          <td className="p-3 font-mono font-black text-blue-900 border-r border-slate-200 align-middle">
                            {candidateData.identityProofNo || "N/A"}
                          </td>
                          <td className="bg-slate-50 p-3 font-semibold text-slate-600 border-r border-slate-200 align-middle">
                            Assigned City (आवंटित शहर):
                          </td>
                          <td className="p-3 font-bold text-slate-900 uppercase font-mono text-sm border-r border-slate-200 align-middle">
                            {assignedCityVal}
                          </td>
                        </tr>

                        {/* Row 7: Assigned Centre */}
                        <tr className="hover:bg-slate-50/40 transition-colors">
                          <td className="bg-slate-50 p-3 font-semibold text-slate-600 border-r border-slate-200 align-middle">
                            Assigned Centre (आवंटित केन्द्र):
                          </td>
                          <td colSpan={3} className="p-3 font-bold text-slate-900 leading-snug border-r border-slate-200 align-middle">
                            {assignedCentreVal}
                          </td>
                        </tr>
                      </tbody>
                    </table>
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
