# User Personal Details API Documentation

## Overview
Complete CRUD API for managing user personal details in the DELED system.

## Base URL
```
/api/UserPersonalDetails
```

## Authentication
All endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

---

## Endpoints

### 1. GET All Personal Details
**Endpoint:** `GET /api/UserPersonalDetails`

**Description:** Retrieve all user personal details

**Response:**
```json
[
  {
    "personalDetailId": 1,
    "userId": 1,
    "applicationFor": "DELED-I",
    "applicantName": "John Doe",
    "mobileNo": "9876543210",
    "emailId": "john@example.com",
    "gender": "Male",
    "dob": "1990-01-15",
    "fatherName": "Robert Doe",
    "motherName": "Mary Doe",
    "husbandName": null,
    "homeDistrict": "Delhi",
    "category": "General",
    "subCategory": "None",
    "isPhysicallyHandicapped": false,
    "disabilityType": null,
    "scribeRequired": false,
    "firstLanguage": "English",
    "secondLanguage": "Hindi",
    "subjectCode": null,
    "deled1TrainingQualification": "B.Ed",
    "deled1TrainingStatus": "Passed",
    "deled1TrainingYear": "2020",
    "deled2TrainingQualification": null,
    "deled2TrainingStatus": null,
    "deled2TrainingYear": null,
    "eligibilityCodeDELED1": "A1",
    "eligibilityCodeDELED2": null,
    "examCity1": "Delhi",
    "examCity2": "Gurgaon",
    "mailingAddress": "123 Main St",
    "state": "Delhi",
    "district": "Central Delhi",
    "pinCode": "110001",
    "identityProof": "Aadhaar",
    "identityProofNo": "1234 5678 9012",
    "createdOn": "2026-06-19T10:00:00",
    "updatedOn": null,
    "isActive": true
  }
]
```

---

### 2. GET Personal Details by ID
**Endpoint:** `GET /api/UserPersonalDetails/{id}`

**Parameters:**
- `id` (path) - PersonalDetailId

**Response:**
```json
{
  "personalDetailId": 1,
  "userId": 1,
  "applicationFor": "DELED-I",
  ...
}
```

---

### 3. GET Personal Details by User ID
**Endpoint:** `GET /api/UserPersonalDetails/user/{userId}`

**Parameters:**
- `userId` (path) - User ID

**Description:** Get personal details for a specific user

**Response:**
```json
{
  "personalDetailId": 1,
  "userId": 1,
  "applicationFor": "DELED-I",
  ...
}
```

---

### 4. CREATE Personal Details
**Endpoint:** `POST /api/UserPersonalDetails`

**Request Body:**
```json
{
  "userId": 1,
  "applicationFor": "DELED-I",
  "applicantName": "John Doe",
  "mobileNo": "9876543210",
  "emailId": "john@example.com",
  "gender": "Male",
  "dob": "1990-01-15T00:00:00",
  "fatherName": "Robert Doe",
  "motherName": "Mary Doe",
  "husbandName": null,
  "homeDistrict": "Delhi",
  "category": "General",
  "subCategory": "None",
  "isPhysicallyHandicapped": false,
  "disabilityType": null,
  "scribeRequired": false,
  "firstLanguage": "English",
  "secondLanguage": "Hindi",
  "subjectCode": null,
  "deled1TrainingQualification": "B.Ed",
  "deled1TrainingStatus": "Passed",
  "deled1TrainingYear": "2020",
  "deled2TrainingQualification": null,
  "deled2TrainingStatus": null,
  "deled2TrainingYear": null,
  "eligibilityCodeDELED1": "A1",
  "eligibilityCodeDELED2": null,
  "examCity1": "Delhi",
  "examCity2": "Gurgaon",
  "mailingAddress": "123 Main St, Delhi",
  "state": "Delhi",
  "district": "Central Delhi",
  "pinCode": "110001",
  "identityProof": "Aadhaar",
  "identityProofNo": "1234 5678 9012"
}
```

**Validations:**
- `applicantName` is required
- `userId` must exist in Users table
- Personal details must not already exist for the user

**Response (Success):**
```json
{
  "success": true,
  "message": "Personal details created successfully.",
  "data": {
    "personalDetailId": 1,
    "userId": 1,
    ...
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Personal details already exist for this user. Use PUT to update."
}
```

---

### 5. UPDATE Personal Details by ID
**Endpoint:** `PUT /api/UserPersonalDetails/{id}`

**Parameters:**
- `id` (path) - PersonalDetailId

**Request Body:** Same as POST

**Response (Success):**
```json
{
  "success": true,
  "message": "Personal details updated successfully.",
  "data": {
    "personalDetailId": 1,
    "userId": 1,
    ...
  }
}
```

---

### 6. UPDATE Personal Details by User ID
**Endpoint:** `PUT /api/UserPersonalDetails/user/{userId}`

**Parameters:**
- `userId` (path) - User ID

**Request Body:** Same as POST

**Description:** Update personal details for a specific user

**Response (Success):**
```json
{
  "success": true,
  "message": "Personal details updated successfully.",
  "data": {
    "personalDetailId": 1,
    "userId": 1,
    ...
  }
}
```

---

### 7. DELETE Personal Details by ID
**Endpoint:** `DELETE /api/UserPersonalDetails/{id}`

**Parameters:**
- `id` (path) - PersonalDetailId

**Response (Success):**
```json
{
  "success": true,
  "message": "Personal details deleted successfully."
}
```

---

### 8. DELETE Personal Details by User ID
**Endpoint:** `DELETE /api/UserPersonalDetails/user/{userId}`

**Parameters:**
- `userId` (path) - User ID

**Response (Success):**
```json
{
  "success": true,
  "message": "Personal details deleted successfully."
}
```

---

### 9. ACTIVATE Personal Details
**Endpoint:** `PATCH /api/UserPersonalDetails/{id}/activate`

**Parameters:**
- `id` (path) - PersonalDetailId

**Description:** Set IsActive to true

**Response (Success):**
```json
{
  "success": true,
  "message": "Personal details activated successfully."
}
```

---

### 10. DEACTIVATE Personal Details
**Endpoint:** `PATCH /api/UserPersonalDetails/{id}/deactivate`

**Parameters:**
- `id` (path) - PersonalDetailId

**Description:** Set IsActive to false

**Response (Success):**
```json
{
  "success": true,
  "message": "Personal details deactivated successfully."
}
```

---

## Field Descriptions

### Basic Information
- **ApplicationFor**: `"DELED-I"`, `"DELED-II"`, or `"BOTH"`
- **ApplicantName**: Full name of applicant (Required)
- **MobileNo**: 10-digit phone number
- **EmailId**: Valid email address
- **Gender**: `"Male"`, `"Female"`, or `"Other"`
- **DOB**: Date of birth (DateTime)

### Family Information
- **FatherName**: Father's name
- **MotherName**: Mother's name
- **HusbandName**: Husband's name (optional, for married women)

### Category & Disability
- **Category**: `"General"`, `"SC"`, `"ST"`, `"OBC"`, etc.
- **SubCategory**: Sub-category details
- **IsPhysicallyHandicapped**: Boolean
- **DisabilityType**: Type of disability (if applicable)
- **ScribeRequired**: Whether scribe is needed

### Language & Subject
- **FirstLanguage**: First language preference
- **SecondLanguage**: Second language preference
- **SubjectCode**: For DELED-II - `"Maths/Science"` or `"Social Studies"`

### DELED-I Training
- **DELED1TrainingQualification**: Qualification (e.g., "B.Ed", "D.El.Ed")
- **DELED1TrainingStatus**: `"Passed"`, `"In Training"`, or `"Enrolled"`
- **DELED1TrainingYear**: Year of training

### DELED-II Training
- **DELED2TrainingQualification**: Qualification
- **DELED2TrainingStatus**: Status
- **DELED2TrainingYear**: Year

### Eligibility & Exam
- **EligibilityCodeDELED1**: Eligibility code for DELED-I
- **EligibilityCodeDELED2**: Eligibility code for DELED-II
- **ExamCity1**: First preference for exam city
- **ExamCity2**: Second preference for exam city

### Address & Identity
- **MailingAddress**: Complete mailing address
- **State**: State name
- **District**: District name
- **PinCode**: PIN code
- **IdentityProof**: Type (`"Aadhaar"`, `"PAN"`, `"Passport"`, `"DL"`)
- **IdentityProofNo**: Identity proof number

### Audit Fields
- **CreatedOn**: Auto-generated on creation
- **UpdatedOn**: Auto-updated on modification
- **IsActive**: Boolean flag for soft delete

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Applicant name is required."
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Personal details not found."
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Error: [error details]"
}
```

---

## Usage Examples

### Create Personal Details
```bash
POST /api/UserPersonalDetails
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": 1,
  "applicationFor": "BOTH",
  "applicantName": "Amit Kumar",
  "mobileNo": "9876543210",
  "emailId": "amit@example.com",
  "gender": "Male",
  "dob": "1995-05-20",
  "fatherName": "Rajesh Kumar",
  "motherName": "Sunita Kumar",
  "homeDistrict": "Sonipat",
  "category": "General",
  "subCategory": "None",
  "isPhysicallyHandicapped": false,
  "scribeRequired": false,
  "firstLanguage": "Hindi",
  "secondLanguage": "English",
  "subjectCode": "Maths/Science",
  "deled1TrainingQualification": "D.El.Ed",
  "deled1TrainingStatus": "Passed",
  "deled1TrainingYear": "2022",
  "deled2TrainingQualification": "B.Ed",
  "deled2TrainingStatus": "Passed",
  "deled2TrainingYear": "2023",
  "eligibilityCodeDELED1": "A1",
  "eligibilityCodeDELED2": "B1",
  "examCity1": "Delhi",
  "examCity2": "Chandigarh",
  "mailingAddress": "Village Kharkhoda, Sonipat",
  "state": "Haryana",
  "district": "Sonipat",
  "pinCode": "131001",
  "identityProof": "Aadhaar",
  "identityProofNo": "1234 5678 9012"
}
```

### Update by User ID
```bash
PUT /api/UserPersonalDetails/user/1
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": 1,
  "applicationFor": "DELED-II",
  ...
}
```

### Get by User ID
```bash
GET /api/UserPersonalDetails/user/1
Authorization: Bearer <token>
```

---

## Notes

1. **Authorization Required**: All endpoints require valid JWT token
2. **Unique Constraint**: One personal details record per user
3. **Soft Delete**: Use activate/deactivate instead of hard delete when possible
4. **Audit Trail**: CreatedOn and UpdatedOn are automatically managed
5. **Validation**: Required fields are validated before saving

---

## Testing Checklist

- [ ] Create personal details for a new user
- [ ] Attempt to create duplicate (should fail)
- [ ] Get by PersonalDetailId
- [ ] Get by UserId
- [ ] Update by PersonalDetailId
- [ ] Update by UserId
- [ ] Activate/Deactivate
- [ ] Delete by PersonalDetailId
- [ ] Delete by UserId
- [ ] Get all personal details
