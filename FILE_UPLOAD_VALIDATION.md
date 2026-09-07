# File Upload Validation Implementation

## Overview
Added comprehensive file upload validation for Left Hand Thumb Impression (LHTI) and all other document uploads in the UploadDocumentsStep.

## Validation Specifications

### 1. Colour Photograph (रंगीन फोटो)
- **Format**: .jpg / .jpeg
- **File Size**: 5 - 100 KB
- **Dimensions**: 140 × 170 pixels
- **Note**: Plain (single color) background required

### 2. Signature (हस्ताक्षर)
- **Format**: .jpg / .jpeg
- **File Size**: 2 - 50 KB
- **Dimensions**: 180 × 70 pixels
- **Note**: Sign on white paper

### 3. Left Hand Thumb Impression (बाएं हाँथ के अंगूठे का निशान)
- **Format**: .jpg / .jpeg
- **File Size**: 10 - 150 KB
- **Dimensions**: 250 × 150 pixels (exactly)
- **Note**: Use blue ink on white paper

## Implementation Details

### File Validation Specs Object
```javascript
const fileValidationSpecs = {
  photoFile: {
    name: "Colour Photograph",
    minSizeKB: 5,
    maxSizeKB: 100,
    width: 140,
    height: 170,
  },
  signatureFile: {
    name: "Signature",
    minSizeKB: 2,
    maxSizeKB: 50,
    width: 180,
    height: 70,
  },
  thumbFile: {
    name: "Left Hand Thumb Impression",
    minSizeKB: 10,
    maxSizeKB: 150,
    width: 250,
    height: 150,
  },
};
```

### Validation Steps

#### Step 1: Format Validation
```javascript
const validFormats = ["image/jpeg", "image/jpg"];
if (!validFormats.includes(file.type)) {
  alert(`Only .jpg / .jpeg files are allowed.`);
  return;
}
```
- Only accepts JPEG format
- Prevents other image types (PNG, GIF, etc.)

#### Step 2: File Size Validation
```javascript
const fileSizeKB = file.size / 1024;
if (fileSizeKB < spec.minSizeKB || fileSizeKB > spec.maxSizeKB) {
  alert(`File size must be between ${spec.minSizeKB} KB and ${spec.maxSizeKB} KB. 
         Current size: ${fileSizeKB.toFixed(2)} KB.`);
  return;
}
```
- Validates minimum and maximum file size per document type
- Shows user the current file size in the error message

#### Step 3: Dimension Validation
```javascript
const validateImageDimensions = (file, spec) => {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      const width = img.width;
      const height = img.height;
      
      if (width === spec.width && height === spec.height) {
        resolve({ valid: true });
      } else {
        resolve({
          valid: false,
          message: `Image dimensions must be exactly ${spec.width}×${spec.height} pixels. 
                    Current: ${width}×${height} pixels.`,
        });
      }
    };
    
    img.src = url;
  });
};
```
- Loads image to get actual dimensions
- Requires exact pixel dimensions (no tolerance)
- Shows user the current vs required dimensions
- Asynchronous to handle image loading

### User Feedback

When validation fails, the user receives:
1. **File name of the document** (e.g., "Left Hand Thumb Impression")
2. **Specific validation rule that failed** (format, size, or dimensions)
3. **Current value** (actual file size, actual dimensions)
4. **Expected value** (required range/dimensions)

Example alerts:
- ❌ "Left Hand Thumb Impression: Only .jpg / .jpeg files are allowed."
- ❌ "Left Hand Thumb Impression: File size must be between 10 KB and 150 KB. Current size: 200.45 KB."
- ❌ "Left Hand Thumb Impression: Image dimensions must be exactly 250×150 pixels. Current: 255×152 pixels."

## Files Modified
- `d:\DELED2026\UI\src\pages\RegistrationPage.jsx`
  - Added `fileValidationSpecs` object (lines 305-327)
  - Added `validateImageDimensions` function (lines 329-359)
  - Updated `handleFileChange` function (lines 361-402)

## Notes

### Why Exact Dimensions?
The application requires precise pixel dimensions to ensure consistent document quality and prevent issues with document processing systems.

### Online Tools
Users can use the provided online tools to create/crop their documents to the exact required dimensions:
- **Photo**: https://ukdeled.com/t26est/PhotoCropper/photo/index.html
- **Signature**: https://ukdeled.com/t26est/PhotoCropper/sign/index.html
- **Thumb**: https://ukdeled.com/t26est/PhotoCropper/thumb/index.html

### Error Recovery
- When validation fails, the file input is reset (`e.target.value = ""`)
- User must select the file again after fixing the issue
- Previous preview (if any) remains unchanged

### Performance
- Dimension validation is asynchronous, so it doesn't block the UI
- Image objects are properly cleaned up after validation
- `URL.revokeObjectURL()` prevents memory leaks
