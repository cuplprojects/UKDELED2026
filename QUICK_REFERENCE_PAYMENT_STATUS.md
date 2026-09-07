# Payment Status Check - Quick Reference

## Two Ways to Check Payment Status

### 1. Simple Check (Recommended for normal use)
```
GET /api/payment/check-status

Frontend button: "🔍 Check Status"
- Uses local database only
- Instant response
- No external API calls
- Shows: isPaid (true/false)
```

### 2. Advanced Check (Includes Atom verification attempt)
```
GET /api/payment/check-status-advanced

Frontend button: "🔐 Verify Payment"
- Checks local database first
- Attempts Atom requery if PENDING
- Gracefully handles Atom API failures
- Shows: isPaid, transactionId, amount, message
```

## Frontend Implementation

### Button: "Check Status"
```javascript
const handleCheckPaymentStatus = async () => {
  const result = await checkAtomPaymentStatus()
  // result.success, result.isPaid, result.message
}
```

### Button: "Verify Payment"
```javascript
const handleCheckPaymentStatusAdvanced = async () => {
  const response = await api.get('/api/payment/check-status-advanced')
  // response.data.success, response.data.isPaid, response.data.transactionId
}
```

## How It Actually Works

### When Payment is Completed (via callback)
```
1. User completes payment in Atom gateway ✅
2. Atom sends encrypted response to server ✅
3. Server decrypts and validates ✅
4. Transaction marked SUCCESS in database ✅
5. User receives confirmation email ✅

When user clicks "Check Status":
→ Backend finds transaction in database
→ Status is "SUCCESS"
→ Returns: isPaid: true ✅
→ No Atom API call needed
```

### When Payment is Pending
```
1. User initiates payment
2. User doesn't complete (closes browser, etc.)
3. Transaction marked PENDING in database

When user clicks "Check Status":
→ Backend finds transaction
→ Status is "PENDING"
→ Tries to query Atom (may fail with 403)
→ Returns: isPaid: false ℹ️
→ Message: "Please try again later"
```

## Expected User Responses

### Scenario 1: Payment Completed
```
User sees: "Payment Confirmed ✅"
Message: "Your payment has been successfully verified. Transaction ID: XYZ"
Next: Can proceed to next step
```

### Scenario 2: Payment Still Pending
```
User sees: "Payment Pending ℹ️"
Message: "Your payment is still being verified. Please try again in a few moments."
Next: Can click "Verify Payment" again later
```

### Scenario 3: Error During Check
```
User sees: "Error ❌"
Message: "Failed to check payment status. Please try again."
Next: Can retry or contact support
```

## Common Issues & Solutions

### Issue: "Transaction status is PENDING" - still seeing pending after payment
**Cause:** Payment callback might not have been processed yet
**Solution:** Wait a few moments and click "Verify Payment" again

### Issue: "Atom API unavailable" - 403 error in logs
**Cause:** Atom's status API has credential issues (not your app)
**Solution:** 
- Payment still went through (callback working)
- User's payment is verified via callback
- Status check fails gracefully, not blocking anything

### Issue: "Payment verification in progress"
**Cause:** Requery attempt failed, but payment might have gone through
**Solution:** 
- Click "Check Status" to see updated status
- If already marked SUCCESS → payment confirmed
- If still PENDING → wait and try again

## Database Schema Relevant Fields

```
PaymentTransactions table:
- MerchantTxnId: unique transaction ID
- UserId: which user this payment is for
- Status: "PENDING", "SUCCESS", or "FAILED"
- Amount: how much was charged
- AtomTxnId: Atom's transaction ID
- ResponseJson: encrypted response from Atom
- CreatedOn: when transaction was initiated
```

## API Responses Explained

### GET /api/payment/check-status

**Success - Payment Completed:**
```json
{
  "success": true,
  "isPaid": true
}
```

**Success - Payment Pending:**
```json
{
  "success": true,
  "isPaid": false
}
```

**Error:**
```json
{
  "success": false,
  "message": "Status check failed: [reason]"
}
```

### GET /api/payment/check-status-advanced

**Success - Payment Completed:**
```json
{
  "success": true,
  "isPaid": true,
  "message": "Payment verified successfully",
  "transactionId": "ATOMTXN123...",
  "amount": 30
}
```

**Success - Payment Pending:**
```json
{
  "success": true,
  "isPaid": false,
  "message": "Payment is still being verified. Please try again in a few moments.",
  "status": "PENDING"
}
```

## Testing Payment Status

### Test 1: Verify Working Payment
```
1. Complete full payment via Atom gateway
2. See success notification
3. Click "Verify Payment"
4. Should show: "Payment Confirmed ✅"
```

### Test 2: Verify Manual Status Check
```
1. Complete payment (as above)
2. Refresh page
3. Go back to payment step
4. Click "Check Status"
5. Should show: isPaid = true
```

### Test 3: Check PENDING Transaction
```
1. Log database directly
2. Insert PENDING transaction for test user
3. Click "Check Status"
4. Should show: isPaid = false
```

## Server Console Logs to Watch

**Good Log (Payment Completed):**
```
[CheckStatus] Transaction already marked as SUCCESS locally
✅ User will see payment confirmed
```

**Good Log (Payment Pending):**
```
[AdvancedCheckStatus] Transaction: REG75_..., Status: PENDING
[AdvancedCheckStatus] Attempting requery for TxnId: REG75_...
[REQUERY] HTTP 403 from Atom API
✅ Gracefully handled, user sees "still pending"
```

**Bad Log (Database Issue):**
```
[ERROR] Status check failed: [exception]
❌ Something wrong with database or user auth
```

## Key Takeaways

1. ✅ **Payments work** - callback is processing correctly
2. ✅ **Status checks work** - using local database
3. ✅ **Atom 403 handled** - doesn't crash the app
4. ✅ **User-friendly** - always get a response
5. ✅ **Resilient** - works even if Atom API is down

---
**Remember:** The callback is the source of truth for payment status, not the requery API!
