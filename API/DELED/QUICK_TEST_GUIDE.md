# Quick Test Guide - Registration API

## 🚀 Quick Start

### Step 1: Register User
```bash
POST http://localhost:7290/api/UserRegistrations/Register
Content-Type: application/json

{
  "fullName": "Amit Kumar",
  "fatherName": "Rajesh Kumar",
  "phoneNumber": "+919876543210",
  "email": "amit@example.com"
}
```

**Expected Response:**
```json
{
  "success": true,
  "userId": 1,
  "emailStatus": "Email sent",
  "smsStatus": "success",
  "otp": "123456"
}
```

✅ **Check:** Email received with OTP
✅ **Check:** SMS received with OTP

---

### Step 2: Verify OTP (Email or Mobile)
```bash
POST http://localhost:7290/api/UserRegistrations/VerifyEmailOTP
Content-Type: application/json

{
  "userId": 1,
  "otp": "123456"
}
```

**Expected Response:**
```json
{
  "success": true,
  "email": "amit@example.com",
  "password": "AutoGen123"
}
```

✅ **Check:** Email received with password
✅ **Check:** SMS received with password

---

### Step 3: Login
```bash
POST http://localhost:7290/api/Login
Content-Type: application/json

{
  "email": "amit@example.com",
  "password": "AutoGen123"
}
```

**Expected Response:**
```json
{
  "token": "eyJhbGc...",
  "userId": 1
}
```

---

## 📱 Phone Number Formats (All Work Now!)

| Format | Status |
|--------|--------|
| `+919876543210` | ✅ Works |
| `919876543210` | ✅ Works |
| `9876543210` | ✅ Works |
| `+91 98765 43210` | ✅ Works |
| `91-9876-543210` | ✅ Works |

---

## 🐛 Troubleshooting

### Email Not Received?
1. Check spam folder
2. Verify: `"emailStatus": "Email sent"`
3. Check console logs
4. Verify email in appsettings.json

### SMS Not Received?
1. Check `smsStatus` in response
2. Verify phone number is valid Indian number (10 digits starting with 6-9)
3. Check SMS gateway balance
4. Check console logs for gateway response

### OTP Expired?
- Default: 2 minutes
- Register again to get new OTP

---

## ⚙️ Configuration Check

### appsettings.json
```json
{
  "EmailSettings": {
    "Email": "noreply.ccsu@gmail.com",
    "Password": "feuokxlmngkowamt",
    "Host": "smtp.gmail.com",
    "Port": 587
  }
}
```

### SMS Gateway
- ✅ API Key: `6042614833445292185`
- ✅ User ID: `diversified`
- ✅ Sender ID: `REGNOW`
- ✅ Template ID: `1207161207955867884`

---

## 📊 Response Status Meanings

| Field | Meaning |
|-------|---------|
| `"emailStatus": "Email sent"` | ✅ Email delivered |
| `"emailStatus": "Error: ..."` | ❌ Email failed, see error |
| `"smsStatus": "success"` | ✅ SMS delivered |
| `"smsStatus": "Error: ..."` | ❌ SMS failed, see error |

---

## 🔒 Security (Remove Before Production!)

**Remove these fields from responses:**
```csharp
// In Register API:
otp = otp  // ❌ Remove this line

// In Verify APIs:
password = generatedPassword  // ❌ Remove this line
```

---

## ✨ What's Working Now

✅ Email OTP delivery
✅ SMS OTP delivery to Indian numbers
✅ Phone number format handling (+91, 91, 10-digit)
✅ Email credentials delivery
✅ SMS credentials delivery
✅ Error reporting in responses
✅ Console logging for debugging
✅ OTP expiry validation
✅ Duplicate email/phone check

---

## 🎯 Test Scenarios

### Test 1: Complete Flow
1. Register → Get OTP → Verify → Get Password → Login

### Test 2: Different Phone Formats
1. Test with `+919876543210`
2. Test with `919876543210`
3. Test with `9876543210`

### Test 3: Error Cases
1. Register with duplicate email
2. Register with duplicate phone
3. Verify with wrong OTP
4. Verify with expired OTP

---

## 📞 Support

**Console Logs Show:**
- Email sending status
- SMS gateway responses
- Error messages
- OTP generation details

**Check Logs For:**
- `Email sent` or error message
- `SMS Response: {...}`
- Any exception messages
