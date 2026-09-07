# DELED Registration API Guide

## Overview
The registration system has been updated with proper error handling and debugging support to help identify OTP delivery issues.

## Changes Made

### 1. **Better Error Handling**
- All email and SMS sending operations now have try-catch blocks
- Errors are logged to console for debugging
- API responses include delivery status for both email and SMS

### 2. **Testing Support**
- OTP is included in the registration response (remove in production)
- Password is included in verification response (remove in production)
- Email and SMS status messages are returned

### 3. **Fixed DateTime Issue**
- Changed from `DateTime.UtcNow` to `DateTime.Now` to match your model

## API Endpoints

### 1. POST `/api/UserRegistrations/Register`

**Request Body:**
```json
{
  "fullName": "John Doe",
  "fatherName": "Robert Doe",
  "phoneNumber": "+919876543210",
  "email": "john.doe@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent to your email and mobile number.",
  "userId": 1,
  "otpExpiry": "2026-06-19T12:35:00",
  "emailStatus": "Email sent",
  "smsStatus": "{SMS API Response}",
  "otp": "123456"
}
```

**What to Check:**
- `emailStatus`: Should be "Email sent" if successful
- `smsStatus`: Check the SMS gateway response
- `otp`: Use this for testing (remove in production)

---

### 2. POST `/api/UserRegistrations/VerifyEmailOTP`

**Request Body:**
```json
{
  "userId": 1,
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email OTP verified successfully. Password sent to your email and mobile.",
  "email": "john.doe@example.com",
  "password": "AutoGen123"
}
```

---

### 3. POST `/api/UserRegistrations/VerifyMobileOTP`

**Request Body:**
```json
{
  "userId": 1,
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Mobile OTP verified successfully. Password sent to your email and mobile.",
  "email": "john.doe@example.com",
  "password": "AutoGen123"
}
```

## Troubleshooting OTP Issues

### Email Not Being Sent?

1. **Check Email Configuration in appsettings.json:**
   ```json
   "EmailSettings": {
     "Email": "cupl199935@gmail.com",
     "Password": "svpkyvjwkdyvqlol",
     "Host": "smtp.gmail.com",
     "Port": 587
   }
   ```

2. **Verify Gmail Settings:**
   - Make sure "App Password" is valid (not regular password)
   - Enable "Less secure app access" or use "App Password" from Google Account settings
   - Check if 2FA is enabled (requires App Password)

3. **Check Console Logs:**
   - Look for error messages in the console output
   - The API will show the actual error in `emailStatus` field

4. **Test Email Service Directly:**
   - The EmailService returns error messages now
   - Check the response: `"emailStatus": "Email sent"` or error details

### SMS Not Being Sent?

1. **Check SMS Gateway Credentials:**
   - API URL: `https://www.smsgateway.center/SMSApi/rest/send`
   - API Key: `6042614833445292185`
   - User ID: `diversified`
   - Sender ID: `REGNOW`
   - Password: `23Dbspl74@`

2. **Verify SMS Gateway Status:**
   - Check if the SMS gateway account is active
   - Verify sufficient balance in the SMS gateway account
   - Check template ID: `1207161207955867884`

3. **Check Console Logs:**
   - SMS gateway response will be logged
   - The API response includes `smsStatus` with gateway response

4. **Phone Number Format:**
   - Ensure phone numbers are in correct format (e.g., +919876543210 or 9876543210)
   - Check if international format is required

## Common Issues

### Issue 1: "Email sent" but email not received
- Check spam/junk folder
- Verify recipient email address
- Check Gmail account daily sending limits (500 emails/day for free accounts)

### Issue 2: SMS gateway returns error
- Check account balance
- Verify template ID is approved
- Check if sender ID is registered
- Verify phone number is in correct format

### Issue 3: OTP expired
- Default expiry is 2 minutes
- Generate a new OTP by registering again
- You can change expiry time in OtpService constructor

## Security Notes

### Before Production:
1. **Remove OTP from response:**
   - Line in Register API: `otp = otp` ❌ Remove this
   
2. **Remove password from response:**
   - Lines in Verify APIs: `password = generatedPassword` ❌ Remove these

3. **Add rate limiting:**
   - Limit registration attempts per IP
   - Limit OTP requests per email/phone

4. **Enable HTTPS:**
   - All APIs should use HTTPS in production

5. **Secure sensitive data:**
   - Never log OTPs or passwords
   - Use environment variables for credentials

## Testing Flow

1. **Register a user:**
   ```bash
   POST /api/UserRegistrations/Register
   ```
   - Note the `userId` and `otp` from response
   - Check console for email/SMS delivery status

2. **Verify OTP (either email or mobile):**
   ```bash
   POST /api/UserRegistrations/VerifyEmailOTP
   # OR
   POST /api/UserRegistrations/VerifyMobileOTP
   ```
   - Use the `userId` and `otp` from step 1
   - Note the auto-generated password

3. **Login:**
   ```bash
   POST /api/Login
   Body: { "email": "user@example.com", "password": "AutoGen123" }
   ```

## Configuration Checklist

- [ ] Email settings configured in appsettings.json
- [ ] Gmail App Password generated (if using Gmail)
- [ ] SMS gateway credentials verified
- [ ] SMS gateway account has sufficient balance
- [ ] Template ID approved by SMS gateway
- [ ] Database connection string configured
- [ ] OTP service registered in Program.cs
- [ ] Test with real email and phone number

## Support

If OTP is still not being sent after checking all the above:

1. Check the API response fields: `emailStatus` and `smsStatus`
2. Check application console logs for detailed error messages
3. Verify email/SMS gateway credentials are active
4. Test email service with a simple test endpoint
5. Contact SMS gateway provider for API issues
