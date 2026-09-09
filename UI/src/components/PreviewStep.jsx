import React, { useEffect } from "react";
import { api } from "../stores/apiStore";
import { QRCodeSVG as QRCode } from "qrcode.react";

export default function PreviewStep({
  formData,
  setFormData,
  handleNext,
  handlePrevious,
  isLocked,
  isCorrectionMode = false,
}) {
  useEffect(() => {
    if (isLocked) {
      setFormData((prev) => ({ ...prev, agreedTerms: true }));
    }
  }, [isLocked, setFormData]);

  const formatDob = (dobStr) => {
    if (!dobStr) return "N/A";
    const cleanStr = dobStr.split("T")[0];
    const parts = cleanStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dobStr;
  };

  return (
    <div className="font-sans text-xs sm:text-sm md:text-base text-gray-800 space-y-4 sm:space-y-5 md:space-y-6">
      {/* Header crest and title */}
      <div className="w-full border border-gray-300 mb-4 sm:mb-5 md:mb-6">
        <table className="w-full border-collapse">
          <tbody>
            <tr>
              <td className="w-[20%] border border-gray-300 p-2 sm:p-3 text-center align-middle">
                {api.defaults.baseURL ? (
                  <img
                    src={`${api.defaults.baseURL}/Logo/ubse_white.jpg`}
                    alt="UBSE Logo"
                    className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 mx-auto object-contain"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                ) : (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 mx-auto bg-gray-100 flex items-center justify-center text-gray-500">
                    Logo
                  </div>
                )}
              </td>
              <td className="w-[60%] border border-gray-300 p-2 sm:p-3 text-center align-middle">
                <h2 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-gray-900 leading-tight mb-1 sm:mb-2">
                  उत्तराखण्ड विद्यालयी शिक्षा परिषद् रामनगर (नैनीताल)
                </h2>
                <h3 className="text-xs sm:text-sm md:text-base font-bold text-gray-800 leading-tight mb-1 sm:mb-2">
                  द्विवर्षीय डी०एल०एड० (D.El.Ed.) प्रवेश परीक्षा 2026
                </h3>
                <h3 className="text-xs sm:text-sm md:text-base font-bold text-gray-800 leading-tight">
                  आवेदन पत्र समीक्षा (Application Review)
                </h3>
                {!formData.isPaymentCompleted && (
                  <div className="text-[10px] sm:text-xs md:text-sm font-bold text-red-600 mt-1 sm:mt-2">
                    (UNPAID APPLICATION PREVIEW)
                  </div>
                )}
              </td>
              <td className="w-[20%] border border-gray-300 p-2 sm:p-3 text-center align-middle">
                <div className="flex justify-center">
                  <QRCode
                    value={`https://ukdeled.com/verify/${formData.applicantId || 'N/A'}`}
                    size={128}
                    level="M"
                    includeMargin={true}
                    className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {!formData.isPaymentCompleted && (
        <div className="text-center text-red-600 font-extrabold text-[13px] border border-red-200 bg-red-50/50 p-3 rounded-lg leading-relaxed mb-4">
          आवेदक ऑनलाइन रजिस्ट्रेशन के समय भरे गये विवरण, ऑनलाइन फीस पेमेंट रसीद
          का प्रिंट आउट तथा पूर्ण आवेदन का प्रिंट आउट अपने पास अवश्य सुरक्षित
          रखें। इनकी आवश्यकता इस प्रक्रिया के अगले चरणों में पड़ेगी।
        </div>
      )}

      {/* Review sheet with Photo / Sign / Thumb beside it */}
      <div className="flex flex-row gap-2 sm:gap-3 md:gap-4 items-start">
        <div className="flex-1 min-w-0 overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300 text-left min-w-[320px] text-sm sm:text-base">
            <tbody>
              <tr>
                <th className="border border-gray-300 bg-gray-50 px-3 sm:px-4 py-2 sm:py-2.5 font-bold w-1/4 text-sm sm:text-base">
                  Registration No.
                </th>
                <td className="border border-gray-300 px-3 sm:px-4 py-2 sm:py-2.5 font-bold text-gray-900 w-1/4 text-sm sm:text-base">
                  {formData.applicantId || formData.registrationNo || "N/A"}
                </td>
                <th className="border border-gray-300 bg-gray-50 px-3 sm:px-4 py-2 sm:py-2.5 font-bold w-1/4 text-sm sm:text-base">
                  प्रशिक्षण हेतु आवेदित वर्ग
                </th>
                <td className="border border-gray-300 px-3 sm:px-4 py-2 sm:py-2.5 font-bold text-gray-900 w-1/4 text-sm sm:text-base">
                  {formData.appliedCategory || formData.subjectCode || "2-विज्ञानेत्तर वर्ग"}
                </td>
              </tr>
              <tr>
                <th className="border border-gray-300 bg-gray-50 px-3 sm:px-4 py-2 sm:py-2.5 font-bold text-sm sm:text-base">
                  Graduation Course
                </th>
                <td className="border border-gray-300 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base font-semibold">
                  {formData.graduationCourse || formData.deled1TrainingQualification || "N/A"}
                </td>
                <th className="border border-gray-300 bg-gray-50 px-3 sm:px-4 py-2 sm:py-2.5 font-bold text-sm sm:text-base">
                  University Name
                </th>
                <td className="border border-gray-300 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base font-semibold">
                  {formData.graduationUniversity || formData.eligibilityCodeDELED1 || "N/A"}
                </td>
              </tr>
              <tr>
                <th className="border border-gray-300 bg-gray-50 px-3 sm:px-4 py-2 sm:py-2.5 font-bold text-sm sm:text-base">
                  Graduation Date
                </th>
                <td className="border border-gray-300 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base font-semibold">
                  {formatDob(formData.graduationDate || formData.deled1TrainingYear)}
                </td>
                <th className="border border-gray-300 bg-gray-50 px-3 sm:px-4 py-2 sm:py-2.5 font-bold text-sm sm:text-base">
                  Candidate's Name
                </th>
                <td className="border border-gray-300 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base font-bold text-gray-900">
                  {formData.applicantName || "N/A"}
                </td>
              </tr>
              <tr>
                <th className="border border-gray-300 bg-gray-50 px-3 sm:px-4 py-2 sm:py-2.5 font-bold text-sm sm:text-base">
                  Mobile Number
                </th>
                <td className="border border-gray-300 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base font-semibold">
                  {formData.mobileNo || "N/A"}
                </td>
                <th className="border border-gray-300 bg-gray-50 px-3 sm:px-4 py-2 sm:py-2.5 font-bold text-sm sm:text-base">
                  Email ID
                </th>
                <td className="border border-gray-300 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base font-semibold break-all">
                  {formData.emailId || "N/A"}
                </td>
              </tr>
              <tr>
                <th className="border border-gray-300 bg-gray-50 px-3 sm:px-4 py-2 sm:py-2.5 font-bold text-sm sm:text-base">
                  Gender
                </th>
                <td className="border border-gray-300 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base font-semibold">
                  {formData.gender || "N/A"}
                </td>
                <th className="border border-gray-300 bg-gray-50 px-3 sm:px-4 py-2 sm:py-2.5 font-bold text-sm sm:text-base">
                  Date of Birth
                </th>
                <td className="border border-gray-300 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base font-semibold">
                  {formatDob(formData.dateOfBirth)}
                </td>
              </tr>
              <tr>
                <th className="border border-gray-300 bg-gray-50 px-3 sm:px-4 py-2 sm:py-2.5 font-bold text-sm sm:text-base">
                  Father's Name
                </th>
                <td className="border border-gray-300 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base font-semibold">
                  {formData.fatherName || "N/A"}
                </td>
                <th className="border border-gray-300 bg-gray-50 px-3 sm:px-4 py-2 sm:py-2.5 font-bold text-sm sm:text-base">
                  Mother's Name
                </th>
                <td className="border border-gray-300 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base font-semibold">
                  {formData.motherName || "N/A"}
                </td>
              </tr>
              <tr>
                <th className="border border-gray-300 bg-gray-50 px-3 sm:px-4 py-2 sm:py-2.5 font-bold text-sm sm:text-base">
                  Husband's Name
                </th>
                <td className="border border-gray-300 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base font-semibold">
                  {formData.husbandName || "N/A"}
                </td>
                <th className="border border-gray-300 bg-gray-50 px-3 sm:px-4 py-2 sm:py-2.5 font-bold text-sm sm:text-base">
                  Category
                </th>
                <td className="border border-gray-300 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base font-semibold">
                  {formData.category || "N/A"}
                </td>
              </tr>
              <tr>
                <th className="border border-gray-300 bg-gray-50 px-3 sm:px-4 py-2 sm:py-2.5 font-bold text-sm sm:text-base">
                  Sub Category
                </th>
                <td className="border border-gray-300 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base font-semibold">
                  {formData.subCategory || "N/A"}
                </td>
                <th className="border border-gray-300 bg-gray-50 px-3 sm:px-4 py-2 sm:py-2.5 font-bold text-sm sm:text-base">
                  Retirement Date
                </th>
                <td className="border border-gray-300 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base font-semibold">
                  {formData.retirementDate ? formatDob(formData.retirementDate) : "N/A"}
                </td>
              </tr>
              <tr>
                <th className="border border-gray-300 bg-gray-50 px-3 sm:px-4 py-2 sm:py-2.5 font-bold text-sm sm:text-base">
                  खेल का प्रकार
                </th>
                <td className="border border-gray-300 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base font-semibold">
                  {formData.sportsType || formData.eligibilityCodeDELED2 || "None"}
                </td>
                <th className="border border-gray-300 bg-gray-50 px-3 sm:px-4 py-2 sm:py-2.5 font-bold text-sm sm:text-base">
                  Physically Handicapped
                </th>
                <td className="border border-gray-300 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base font-semibold">
                  {formData.phyHandicapped === "YES"
                    ? `YES (${formData.phyType || "N/A"})`
                    : "NO"}
                </td>
              </tr>
              <tr>
                <th className="border border-gray-300 bg-gray-50 px-3 sm:px-4 py-2 sm:py-2.5 font-bold text-sm sm:text-base">
                  Scribe Required
                </th>
                <td className="border border-gray-300 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base font-semibold">
                  {formData.scribeRequired || "N/A"}
                </td>
                <th className="border border-gray-300 bg-gray-50 px-3 sm:px-4 py-2 sm:py-2.5 font-bold text-sm sm:text-base">
                  Exam City 1ˢᵗ
                </th>
                <td className="border border-gray-300 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base font-semibold">
                  {formData.examCity1 || "N/A"}
                </td>
              </tr>
              <tr>
                <th className="border border-gray-300 bg-gray-50 px-3 sm:px-4 py-2 sm:py-2.5 font-bold text-sm sm:text-base">
                  Exam City 2ⁿᵈ
                </th>
                <td className="border border-gray-300 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base font-semibold">
                  {formData.examCity2 || "N/A"}
                </td>
                <th className="border border-gray-300 bg-gray-50 px-3 sm:px-4 py-2 sm:py-2.5 font-bold text-sm sm:text-base">
                  Complete Mailing Address
                </th>
                <td className="border border-gray-300 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base font-semibold">
                  {formData.address || "N/A"}
                </td>
              </tr>
              <tr>
                <th className="border border-gray-300 bg-gray-50 px-3 sm:px-4 py-2 sm:py-2.5 font-bold text-sm sm:text-base">
                  State
                </th>
                <td className="border border-gray-300 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base font-semibold">
                  {formData.state || "N/A"}
                </td>
                <th className="border border-gray-300 bg-gray-50 px-3 sm:px-4 py-2 sm:py-2.5 font-bold text-sm sm:text-base">
                  District
                </th>
                <td className="border border-gray-300 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base font-semibold">
                  {formData.district || "N/A"}
                </td>
              </tr>
              <tr>
                <th className="border border-gray-300 bg-gray-50 px-3 sm:px-4 py-2 sm:py-2.5 font-bold text-sm sm:text-base">
                  PIN Code
                </th>
                <td className="border border-gray-300 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base font-semibold">
                  {formData.pincode || "N/A"}
                </td>
                <th className="border border-gray-300 bg-gray-50 px-3 sm:px-4 py-2 sm:py-2.5 font-bold text-sm sm:text-base">
                  Identity Proof
                </th>
                <td className="border border-gray-300 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base font-semibold">
                  {formData.idProofType
                    ? `${formData.idProofType} (${formData.idProofNo || "N/A"})`
                    : "N/A"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Profile photo + thumb + signature block */}
        <div className="w-28 sm:w-36 md:w-44 flex flex-col gap-3 sm:gap-4 shrink-0 items-center">
          {/* Photo */}
          <div className="flex flex-col items-center w-full gap-1">
            <div className="w-full h-32 sm:h-40 md:h-48 border-2 border-gray-300 bg-gray-50 rounded flex items-center justify-center overflow-hidden">
              {formData.photoFilePreview ? (
                <img
                  src={formData.photoFilePreview}
                  alt="Candidate Photo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-gray-400 text-xs">
                  Photo
                </span>
              )}
            </div>
            <p className="text-xs text-gray-600 font-bold text-center leading-tight">
              Photo
            </p>
          </div>
          {/* Thumb */}
          <div className="flex flex-col items-center w-full gap-1">
            <div className="w-full h-16 sm:h-18 md:h-20 border-2 border-gray-300 bg-white flex items-center justify-center overflow-hidden">
              {formData.thumbFilePreview ? (
                <img
                  src={formData.thumbFilePreview}
                  alt="Left Thumb"
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-xs text-gray-400">
                  Thumb
                </span>
              )}
            </div>
            <p className="text-xs text-gray-600 font-bold text-center leading-tight">
              Left Thumb
            </p>
          </div>
          {/* Signature */}
          <div className="flex flex-col items-center w-full gap-1">
            <div className="w-full h-14 sm:h-16 md:h-18 border-2 border-gray-300 bg-white flex items-center justify-center overflow-hidden">
              {formData.signatureFilePreview ? (
                <img
                  src={formData.signatureFilePreview}
                  alt="Signature"
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-xs text-gray-400">
                  Sign
                </span>
              )}
            </div>
            <p className="text-xs text-gray-600 font-bold text-center leading-tight">
              Signature
            </p>
          </div>
        </div>
      </div>

      {/* Declaration */}
      <div className="border border-gray-300 p-4 sm:p-5 rounded-lg bg-gray-50 space-y-3">
        <h4 className="font-extrabold text-gray-900 text-base sm:text-lg">घोषणा (Declaration):</h4>
        <p className="text-sm sm:text-base text-gray-800 leading-relaxed font-medium">
          मैं प्रमाणित करता/करती हूँ कि मेरे द्वारा आवेदन पत्र में दी गई समस्त प्रविष्टियाँ पूर्णतः सत्य एवं सही हैं। यदि कोई भी प्रविष्टि असत्य या गलत पाई जाती है तो मेरा अभ्यर्थन किसी भी स्तर पर निरस्त किया जा सकता है।
        </p>
        <div className="pt-2 flex items-center gap-3">
          <input
            type="checkbox"
            id="agreedTerms"
            checked={formData.agreedTerms || false}
            onChange={(e) => setFormData((prev) => ({ ...prev, agreedTerms: e.target.checked }))}
            disabled={isLocked}
            className="w-5 h-5 text-blue-600 rounded cursor-pointer shrink-0"
          />
          <label htmlFor="agreedTerms" className="text-sm sm:text-base font-bold text-gray-900 cursor-pointer">
            I accept all the terms and declare that the information provided is true to the best of my knowledge.
          </label>
        </div>
      </div>

      {/* Navigation Actions */}
      <div className="flex justify-between items-center pt-5 border-t border-gray-200">
        <button
          type="button"
          onClick={handlePrevious}
          disabled={isLocked}
          className="px-6 py-3 border border-gray-300 hover:bg-gray-100 text-gray-800 font-bold text-base sm:text-lg rounded-lg transition cursor-pointer"
        >
          Previous
        </button>

        <button
          type="button"
          onClick={handleNext}
          disabled={!formData.agreedTerms}
          className="px-8 py-3 bg-blue-700 hover:bg-blue-800 disabled:bg-gray-400 text-white font-extrabold text-base sm:text-lg rounded-lg shadow-md transition cursor-pointer"
        >
          {isLocked ? "Proceed to Payment" : "Confirm & Proceed to Payment"}
        </button>
      </div>
    </div>
  );
}
