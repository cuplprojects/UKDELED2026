# Payment Callback Fix - Complete Guide

## Issues Fixed

### 1. **Database Not Updating Status to SUCCESS**
**Problem:** Even when payment returned from NTT Data as successful, the database wasn't updating `IsPaymentCompleted = true` on the UserRegistration table.

**Root Cause:** The transaction was being saved immediately with status "SUCCESS"/"FAILED", then the requery validation was happening. If requery failed, the user updates never happened, but the redirect still occurred.

**Solution:** 
- Moved all database updates into a logical flow
- Update PaymentTransaction first with the response
- Then validate with RequeryPayment
- Only update UserRegistration and create Payment record if requery validation passes
- Transaction status reflects actual validation result

### 2. **Missing Frontend Return URL Configuration**
**Problem:** `NTTData:FrontendReturnUrl` was not configured in appsettings.json, causing it to default to `http://localhost:3000/application`.

**Solution:** Added the configuration to appsettings.json:
```json
"FrontendReturnUrl": "http://localhost:3000/application"
```

### 3. **HTTP 404 Error on React Redirect**
**Problem:** "This localhost page can't be found: http://localhost:3000/application"

**Root Causes:**
- React dev server not running on port 3000
- Redirect happening before React is fully loaded

**Solution:** Ensure React dev server is running:
```bash
cd d:\DELED2026\UI
npm start
```

## Updated Callback Flow

```
1. Receive encrypted payment response from NTT Data
2. Decrypt and parse response JSON
3. Extract: statusCode, atomTxnId, merchantTxnId, amount, etc.
4. Find PaymentTransaction by merchantTxnId
5. UPDATE PaymentTransaction with response details
6. IF statusCode == "OTS0000" (SUCCESS):
   a. Call RequeryPayment() for validation
   b. IF requery passes (isPaymentValid = true):
      - UPDATE UserRegistration: IsPaymentCompleted = true, PaymentDate = now
      - CREATE new Payment record with SUCCESS status
      - CREATE UserStepProgress for step 4
      - Save all changes
7. UPDATE PaymentTransaction.Status based on isPaymentValid result
8. REDIRECT to frontend with status parameter
```

## What You Need to Do

### 1. **Stop and Restart Your Backend**
```powershell
# Stop the current running instance (Ctrl+C in the terminal)
# Rebuild and run
cd d:\DELED2026\API\DELED
dotnet clean
dotnet build
dotnet run
```

### 2. **Ensure React Dev Server is Running**
```bash
# In a NEW terminal window
cd d:\DELED2026\UI
npm start
```

### 3. **Test Payment Flow**
1. Register a new user (or use existing)
2. Complete steps 1-3 (Personal Details, Uploads, Preview)
3. Proceed to Payment step
4. Complete payment with NTT Data
5. Should be redirected to: `http://localhost:3000/application?step=4&status=SUCCESS&txnId=XXXXX`
6. Check database:
   - `PaymentTransactions` table: Status should be "SUCCESS", Amount filled
   - `Payments` table: New record with Status "SUCCESS"
   - `UserRegistration` table: IsPaymentCompleted = 1, PaymentDate filled
   - `UserStepProgresses` table: StepNumber 4 should exist

## Configuration for Production

In production, update `appsettings.json`:
```json
"FrontendReturnUrl": "https://yourdomain.com/application"
```

This should point to your actual frontend domain, not localhost.

## Debugging Tips

If payment still doesn't update:

1. **Check RequeryPayment Response:**
   - Add logging in AtomPaymentService.RequeryPayment()
   - Verify the requery is actually being called
   - Check if statusCode in requery response is "OTS0000"

2. **Check Transaction Creation:**
   - Ensure PaymentTransaction exists before callback is received
   - Verify merchantTxnId matches

3. **Check API Error Response:**
   - Look at browser developer console for any API errors
   - Check the PaymentResponse endpoint as well (if being used)

4. **Database Connection:**
   - Verify database user has write permissions
   - Check connection string in appsettings.json
