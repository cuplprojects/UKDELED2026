import React from "react";

export default function UploadDocumentsStep({
  formData,
  handleFileChange,
  handleNext,
  handlePrevious,
  isLocked
}) {
  return (
    <div className="space-y-6 sm:space-y-8 md:space-y-10 py-2 sm:py-3 md:py-4 font-sans text-gray-800 px-2 sm:px-3 md:px-0">
      {/* Row 1: Colour Photograph */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4 md:gap-6 border-b border-gray-100 pb-6 sm:pb-8">
        <div className="flex-1 space-y-2">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900">Colour Photograph (रंगीन फोटो) <span className="text-red-500 font-bold ml-1">*</span></h3>
          <p className="text-red-600 text-sm sm:text-base font-bold font-mono">.jpg / .jpeg (05 - 100 KB)</p>
          <p className="text-red-600 text-sm sm:text-base font-bold">नोट : फोटो का बैकग्राउंड प्लेन(एक कलर में) होना आवश्यक है</p>
          <p className="text-red-600 text-sm sm:text-base font-bold">आवश्यक आकार (Pixel) : Width : 140, Height : 170</p>
          <a href="https://ukdeled.com/Photo/index.html" target="_blank" rel="noopener noreferrer" className="inline-block text-[#1a56db] hover:underline text-sm sm:text-base font-bold mt-1">
            Online Tool to Create Photo
          </a>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-3 w-full md:w-auto">
          <div className="w-full sm:w-[140px] md:w-[160px] aspect-video sm:aspect-auto sm:h-[170px] md:h-[190px] border border-gray-400 bg-gray-50 flex items-center justify-center overflow-hidden rounded-sm">
            {formData.photoFilePreview ? (
              <img src={formData.photoFilePreview} alt="Photo Preview" className="w-full h-full object-contain" />
            ) : (
              <div className="text-center p-2 text-gray-400 text-xs leading-tight">
                <div className="mx-auto mb-1 text-2xl">🖼️</div>
                Image<br />not available
              </div>
            )}
          </div>
          <div className="border border-sky-400 rounded-md bg-white overflow-hidden flex items-center w-full md:w-auto">
            <label className={`bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm sm:text-base px-4 py-2.5 border-r border-gray-300 font-bold select-none shrink-0 ${isLocked ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
              Choose File
              <input
                type="file"
                accept="image/jpeg,.jpg,.jpeg"
                onChange={(e) => handleFileChange(e, "photoFile")}
                disabled={isLocked}
                className="hidden"
              />
            </label>
            <span className="text-sm sm:text-base text-gray-600 px-3.5 truncate max-w-[200px]">
              {formData.photoFile ? formData.photoFile.name : "No file chosen"}
            </span>
          </div>
        </div>
      </div>

      {/* Row 2: Signature */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4 md:gap-6 border-b border-gray-100 pb-6 sm:pb-8">
        <div className="flex-1 space-y-2">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900">Signature (हस्ताक्षर) <span className="text-red-500 font-bold ml-1">*</span></h3>
          <p className="text-red-600 text-sm sm:text-base font-bold font-mono">.jpg / .jpeg (02 - 50 KB)</p>
          <p className="text-red-600 text-sm sm:text-base font-bold">नोट : हस्ताक्षर सफ़ेद कागज पर करके अपलोड करें</p>
          <p className="text-red-600 text-sm sm:text-base font-bold">आवश्यक आकार (Pixel) : Width : 180, Height : 70</p>
          <a href="https://ukdeled.com/Sign/index.html" target="_blank" rel="noopener noreferrer" className="inline-block text-[#1a56db] hover:underline text-sm sm:text-base font-bold mt-1">
            Online Tool to Create Signature
          </a>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-3 w-full md:w-auto">
          <div className="w-full sm:w-[180px] md:w-[210px] h-auto sm:h-[80px] md:h-[90px] border border-gray-400 bg-gray-50 flex items-center justify-center overflow-hidden rounded-sm">
            {formData.signatureFilePreview ? (
              <img src={formData.signatureFilePreview} alt="Signature Preview" className="w-full h-full object-contain" />
            ) : (
              <div className="text-center p-1 text-gray-400 text-xs leading-tight">
                Image<br />not available
              </div>
            )}
          </div>
          <div className="border border-sky-400 rounded-md bg-white overflow-hidden flex items-center w-full md:w-auto">
            <label className={`bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm sm:text-base px-4 py-2.5 border-r border-gray-300 font-bold select-none shrink-0 ${isLocked ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
              Choose File
              <input
                type="file"
                accept="image/jpeg,.jpg,.jpeg"
                onChange={(e) => handleFileChange(e, "signatureFile")}
                disabled={isLocked}
                className="hidden"
              />
            </label>
            <span className="text-sm sm:text-base text-gray-600 px-3.5 truncate max-w-[200px]">
              {formData.signatureFile ? formData.signatureFile.name : "No file chosen"}
            </span>
          </div>
        </div>
      </div>

      {/* Row 3: Left Hand Thumb Impression */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4 md:gap-6">
        <div className="flex-1 space-y-2">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900">Left Hand Thumb Impression(बाएं हाँथ के अंगूठे का निशान) <span className="text-red-500 font-bold ml-1">*</span></h3>
          <p className="text-red-600 text-sm sm:text-base font-bold font-mono">.jpg / .jpeg (10 - 150 KB)</p>
          <p className="text-red-600 text-sm sm:text-base font-bold">नोट : सफ़ेद कागज पर नीली स्याही से अंगूठे का निशान लगाकर ही अपलोड करें</p>
          <p className="text-red-600 text-sm sm:text-base font-bold">आवश्यक आकार (Pixel) : Width : 250, Height : 150</p>
          <a href="https://ukdeled.com/Thumb/index.html" target="_blank" rel="noopener noreferrer" className="inline-block text-[#1a56db] hover:underline text-sm sm:text-base font-bold mt-1">
            Online Tool to Create Thumb
          </a>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-3 w-full md:w-auto">
          <div className="w-full sm:w-[220px] md:w-[270px] aspect-video sm:aspect-auto sm:h-[140px] md:h-[170px] border border-gray-400 bg-gray-50 flex items-center justify-center overflow-hidden rounded-sm">
            {formData.thumbFilePreview ? (
              <img src={formData.thumbFilePreview} alt="Thumb Preview" className="w-full h-full object-contain" />
            ) : (
              <div className="text-center p-2 text-gray-400 text-xs leading-tight">
                <div className="mx-auto mb-1 text-2xl">👍</div>
                Image<br />not available
              </div>
            )}
          </div>
          <div className="border border-sky-400 rounded-md bg-white overflow-hidden flex items-center w-full md:w-auto">
            <label className={`bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm sm:text-base px-4 py-2.5 border-r border-gray-300 font-bold select-none shrink-0 ${isLocked ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
              Choose File
              <input
                type="file"
                accept="image/jpeg,.jpg,.jpeg"
                onChange={(e) => handleFileChange(e, "thumbFile")}
                disabled={isLocked}
                className="hidden"
              />
            </label>
            <span className="text-sm sm:text-base text-gray-600 px-3.5 truncate max-w-[200px]">
              {formData.thumbFile ? formData.thumbFile.name : "No file chosen"}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-4 mt-8 pt-6 border-t border-gray-200">
        <button
          onClick={handlePrevious}
          disabled={isLocked}
          className={`font-bold py-3 px-7 rounded-lg text-base sm:text-lg transition text-white w-full sm:w-auto ${
            isLocked ? "bg-gray-300 cursor-not-allowed" : "bg-gray-500 hover:bg-gray-600"
          }`}
        >
          Previous
        </button>
        <button
          onClick={handleNext}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg text-base sm:text-lg transition w-full sm:w-auto"
        >
          {isLocked ? "Next" : "Save & Next"}
        </button>
      </div>
    </div>
  );
}
