# DELED Correction Window Field Analysis Document

This document lists all application form fields in the DELED portal and classifies them into **Editable** and **Non-Editable** categories for the upcoming **Correction Window**, along with their corresponding validation constraints and conditional logic.

---

## 🚫 Non-Editable Fields

As per security and verification guidelines, the following fields cannot be modified during the correction window:

| S.No. | Field Name (English) | Field Name (Hindi) | Technical Key | Constraints & Reasons |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Apply For** | आवेदन का चयन | `applyFor` | Determines exam fees and step validation; cannot be changed after payment. |
| **2** | **Candidate's Full Name** | अभ्यर्थी का पूरा नाम | `applicantName` | Crucial identity field; linked directly to registration. |
| **3** | **Mobile Number** | मोबाइल नंबर | `mobileNo` | Primary key for login/OTP communication. |
| **4** | **Email ID** | ईमेल आईडी | `emailId` | Primary key for login/verification communication. |
| **5** | **Category** | वर्ग | `category` | Directly impacts fee structure and cut-offs. |
| **6** | **Sub Category** | उप वर्ग | `subCategory` | Directly impacts fee structure and age relaxation rules. |
| **7** | **PH YES or No** | दिव्यांग है/नहीं है | `phyHandicapped` | Directly impacts fee concessions and scribe allocation. |
| **8** | **PH Type** | नि:शक्तता (दिव्यांगता) का प्रकार | `phyType` | Specific sub-classification of PH status. |
| **9** | **Scribe Required** | श्रुतलेखक की आवश्यकता | `scribeRequired` | Logistical field dependent on PH Type. |
| **10** | **Retirement Date** | सेवानिवृत्ति की तिथि | `retirementDate` | Sub-field of **Sub Category**; visible/applicable only if Sub Category is *EX-SERVICEMAN (Self)*. |

---

## ✅ Editable Fields

The following fields can be corrected by the candidate during the correction window.

### 1. Personal & Identity Details

| S.No. | Field Name (English) | Field Name (Hindi) | Technical Key | Validation Rules / Details |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Father's Name** | पिता का नाम | `fatherName` | Max 50 chars, alphabets, spaces and dots (`.`) only. |
| **2** | **Mother's Name** | माता का नाम | `motherName` | Max 50 chars, alphabets, spaces and dots (`.`) only. |
| **3** | **Date of Birth** | जन्म तिथि | `dateOfBirth` | Must show candidate is at least 18 years old. Selected via date picker. |
| **4** | **Gender** | लिंग | `gender` | Options: `MALE`, `FEMALE`, `TRANSGENDER`. |
| **5** | **Husband's Name** | विवाहित महिला के पति का नाम | `husbandName` | Max 50 chars. Editable/Visible only if `gender` is set to `FEMALE`. |
| **6** | **Home District** | गृह जनपद | `homeDistrict` | Dropdown populated with Uttarakhand districts. |
| **7** | **Identity Proof Type** | पहचान पत्र का प्रकार | `idProofType` | Options: `Aadhar Card`, `Pan Card`, `Voter ID`, `Driving License`, `Passport`. |
| **8** | **Identity Proof No.** | पहचान नं. | `idProofNo` | Must match pattern of chosen `idProofType` (e.g., Aadhar: 12 digits, PAN: 5 letters + 4 digits + 1 letter). |

### 2. Academic & Exam Preferences

| S.No. | Field Name (English) | Field Name (Hindi) | Technical Key | Validation Rules / Details |
| :--- | :--- | :--- | :--- | :--- |
| **9** | **First Language** | प्रथम भाषा | `firstLanguage` | Options: `HINDI`, `ENGLISH`. |
| **10** | **Second Language** | द्वितीय भाषा | `secondLanguage` | Options: `SANSKRIT`, `URDU`, `ENGLISH`, `HINDI`. Must be different from `firstLanguage`. |
| **11** | **Subject for DELED II** | DELED II हेतु विषय | `subjectCode` | Options: `MATHS & SCIENCE`, `SOCIAL STUDIES`. Applicable only if `applyFor` includes DELED-II. |
| **12** | **Exam City 1st Preference** | परीक्षा शहर प्रथम वरीयता | `examCity1` | Options from Uttarakhand exam cities. Must not be same as `examCity2`. |
| **13** | **Exam City 2nd Preference** | परीक्षा शहर द्वितीय वरीयता | `examCity2` | Options from Uttarakhand exam cities. Must not be same as `examCity1`. |

### 3. DELED-I Training Details (Applicable if applied for DELED-I or BOTH)

| S.No. | Field Name (English) | Field Name (Hindi) | Technical Key | Validation Rules / Details |
| :--- | :--- | :--- | :--- | :--- |
| **14** | **Training Qualification (DELED I)** | प्रशिक्षण योग्यता | `deled1TrainingQualification` | Options: `B.T.C.`, `D.El.Ed`, `B.El.Ed`, `D.Ed. (Sp.Edu.)`, `In Service Teachers`. |
| **15** | **Training Status (DELED I)** | प्रशिक्षण योग्यता की स्थिति | `deled1TrainingStatus` | Options: `PASSED`, `ENROLLED`. Automatically locked to `PASSED` if qualification is `In Service Teachers`. |
| **16** | **Training Year (DELED I)** | प्रशिक्षण वर्ष | `deled1TrainingYear` | Select from dropdown (past 45 years up to current year). |
| **17** | **Eligibility Code (DELED I)** | पात्रता कोड | `eligibilityCodeDELED1` | Filtered list based on chosen Training Qualification (e.g., `7` for `In Service Teachers`). |
| **18** | **Training Name (DELED I)** | प्रशिक्षण का नाम | `deled1InServiceTraining` | Options: `B.T.C.`, `Vishisht B.T.C.`, `Others`. Only visible if qualification is `In Service Teachers`. |
| **19** | **Write Training Name (DELED I)** | प्रशिक्षण का नाम लिखें | `deled1InServiceTrainingOthers` | Text input. Max 50 chars. Visible only if training name is `Others`. |
| **20** | **U-DISE Code (DELED I)** | यू-डायस कोड | `deled1UdiseCode` | 11-digit numeric code. Must start with state code `05`. Visible only if eligibility code is `7`. |
| **21** | **Type of School (DELED I)** | विद्यालय का प्रकार | `deled1SchoolType` | Options: `Government`, `Government Aided`, `Recognized Unaided`. Visible only if eligibility code is `7`. |

### 4. DELED-II Training Details (Applicable if applied for DELED-II or BOTH)

| S.No. | Field Name (English) | Field Name (Hindi) | Technical Key | Validation Rules / Details |
| :--- | :--- | :--- | :--- | :--- |
| **22** | **Training Qualification (DELED II)** | प्रशिक्षण योग्यता | `deled2TrainingQualification` | Options: `B.T.C.`, `D.El.Ed`, `B.El.Ed`, `B.Ed.`, `B.A. Edu`, `B.Sc. Edu.`, `L.T.`, `Shiksha Shastri`, `B.Ed. (Sp.Edu.)`, `In Service Teachers`. |
| **23** | **Training Status (DELED II)** | प्रशिक्षण योग्यता की स्थिति | `deled2TrainingStatus` | Options: `PASSED`, `ENROLLED`. Automatically locked to `PASSED` if qualification is `In Service Teachers`. |
| **24** | **Training Year (DELED II)** | प्रशिक्षण वर्ष | `deled2TrainingYear` | Select from dropdown (past 45 years up to current year). |
| **25** | **Eligibility Code (DELED II)** | पात्रता कोड | `eligibilityCodeDELED2` | Filtered list based on chosen Training Qualification (e.g., `8` for `In Service Teachers`). |
| **26** | **Training Name (DELED II)** | प्रशिक्षण का नाम | `deled2InServiceTraining` | Options: `B.T.C.`, `D.El.Ed`, `B.Ed`, `L.T.`, `Shiksha Shastri`, `Others`. Only visible if qualification is `In Service Teachers`. |
| **27** | **Write Training Name (DELED II)** | प्रशिक्षण का नाम लिखें | `deled2InServiceTrainingOthers` | Text input. Max 50 chars. Visible only if training name is `Others`. |
| **28** | **U-DISE Code (DELED II)** | यू-डायस कोड | `deled2UdiseCode` | 11-digit numeric code. Must start with state code `05`. Visible only if eligibility code is `8`. |
| **29** | **Type of School (DELED II)** | विद्यालय का प्रकार | `deled2SchoolType` | Options: `Government`, `Government Aided`, `Recognized Unaided`. Visible only if eligibility code is `8`. |

### 5. Contact & Address Details

| S.No. | Field Name (English) | Field Name (Hindi) | Technical Key | Validation Rules / Details |
| :--- | :--- | :--- | :--- | :--- |
| **30** | **Correspondence Address** | पत्राचार का पता | `address` | Text area, max 200 chars. Special validation: Email address format not allowed. |
| **31** | **State** | राज्य | `state` | Dropdown list of all Indian states. |
| **32** | **District** | जनपद | `district` | Dropdown list of districts within the selected State. |
| **33** | **Pin Code** | पिन कोड | `pincode` | Exactly 6 digits numeric. |

### 6. Document & Image Uploads (Step 2)

| S.No. | Document Type | Technical Key | Specifications / Constraints |
| :--- | :--- | :--- | :--- |
| **34** | **Colour Photograph (रंगीन फोटो)** | `photoFile` | Format: `.jpg` / `.jpeg`. Size: 05 - 100 KB. Width: 140px, Height: 170px. Plain background. |
| **35** | **Signature (हस्ताक्षर)** | `signatureFile` | Format: `.jpg` / `.jpeg`. Size: 02 - 50 KB. Width: 180px, Height: 70px. White background. |
| **36** | **Left Hand Thumb Impression** | `thumbFile` | Format: `.jpg` / `.jpeg`. Size: 10 - 150 KB. Width: 250px, Height: 150px. Blue ink on white paper. |

---

## 🛠️ Dynamic Conditional Logic Summary

The portal operates on several state-driven rules which should continue to apply during editing:
1. **Gender Rule**: If Gender is set to `MALE` or `TRANSGENDER`, the `husbandName` field is programmatically cleared and disabled.
2. **First / Second Language Rule**: `secondLanguage` options list excludes the language selected as `firstLanguage` (e.g., if First Language is `HINDI`, Second Language options cannot contain `HINDI`).
3. **Training Status Rule**: If training qualification is `In Service Teachers` for either exam level, its status is forced to `PASSED` and disabled.
4. **Eligibility Code Filter**: Eligibility codes are dynamically filtered to ensure invalid combinations of training qualification and eligibility codes cannot be saved.
5. **U-DISE & School Type Visibility**:
   - `deled1UdiseCode` & `deled1SchoolType` are visible/editable **only** if `eligibilityCodeDELED1` is `7`.
   - `deled2UdiseCode` & `deled2SchoolType` are visible/editable **only** if `eligibilityCodeDELED2` is `8`.
6. **State and District Options**: The `district` dropdown options are fetched dynamically from the backend relative to the chosen `state`. If state is `Uttarakhand`, the option `OTHERS`/`OTHER` is filtered out of the list.
