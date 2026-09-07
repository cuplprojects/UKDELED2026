# Payment Verification Flow Diagram

## Timeline Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PAYMENT REQUERY SCHEDULER SERVICE                        │
│                     (Runs continuously in background)                       │
└─────────────────────────────────────────────────────────────────────────────┘

                              Every 15 minutes
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
         ┌──────────▼──────────┐         ┌──────────▼──────────┐
         │  VERIFY PENDING     │         │  Every 60 minutes?  │
         │  TRANSACTIONS       │         │  (Hourly Check)     │
         └──────────┬──────────┘         └──────────┬──────────┘
                    │                               │ YES
         ┌──────────▼──────────┐         ┌──────────▼──────────┐
         │ Find all PENDING    │         │ VERIFY SUCCESSFUL   │
         │ transactions        │         │ TRANSACTIONS        │
         │ older than 30 min   │         │ from last 7 days    │
         └──────────┬──────────┘         └──────────┬──────────┘
                    │                               │
         ┌──────────▼──────────┐         ┌──────────▼──────────┐
         │ Requery Atom API    │         │ Requery Atom API    │
         │ for each TxnId      │         │ for each TxnId      │
         └──────────┬──────────┘         └──────────┬──────────┘
                    │                               │
          ┌─────────┴─────────┐         ┌──────────┴──────────┐
          │                   │         │                     │
      ┌───▼────┐         ┌────▼──┐  ┌──▼────┐            ┌───▼────┐
      │SUCCESS │         │FAILED │  │VALID  │            │INVALID │
      └───┬────┘         └────┬──┘  └──┬────┘            └───┬────┘
          │                   │        │                     │
     ┌────▼────────┐    ┌────▼───┐  ┌─▼──────────┐    ┌────▼────────┐
     │Update Status│    │Update  │  │Log Success │    │REVERT to    │
     │to SUCCESS   │    │Status  │  │Verification│    │FAILED       │
     │Mark User    │    │to      │  │in Database │    │Update User  │
     │Paid         │    │FAILED  │  │            │    │Mark as      │
     │Create       │    │Log     │  │            │    │Unpaid       │
     │Payment      │    │Event   │  │            │    │Update       │
     │Record       │    │in DB   │  │            │    │Payment      │
     │             │    │        │  │            │    │Record to    │
     │             │    │        │  │            │    │FAILED       │
     └─────────────┘    └────────┘  └────────────┘    └─────────────┘
          │                   │           │                   │
          └─────────┬─────────┴───────────┴───────────────────┘
                    │
          ┌─────────▼──────────┐
          │ Log Summary Stats  │
          │ Total: X           │
          │ Success: X         │
          │ Failed: X          │
          │ Errors: X          │
          └────────────────────┘
```

## Verification Cycle Details

### **CYCLE 1: Process PENDING Payments (Every 15 minutes)**

```
Time: T + 0min, T + 15min, T + 30min, T + 45min, ...

Step 1: Fetch PENDING transactions
  └─ WHERE Status = "PENDING" AND CreatedOn <= NOW - 30 minutes

Step 2: For each PENDING transaction
  ├─ Get MerchantTxnId, Amount, CreatedOn
  ├─ Call Atom API RequeryPayment(TxnId, Amount, Date)
  │
  ├─ IF Atom returns SUCCESS (isPaid = true):
  │   ├─ Update PaymentTransaction.Status = "SUCCESS"
  │   ├─ Update Users.IsPaymentCompleted = true
  │   ├─ Create Payment record
  │   ├─ Add UserStepProgress Step 4
  │   └─ Log: "✓ Payment verified"
  │
  └─ IF Atom returns FAILED (isPaid = false):
      ├─ Update PaymentTransaction.Status = "FAILED"
      └─ Log: "✗ Payment FAILED - [Atom Status Code: OTS0600]"
```

### **CYCLE 2: Verify SUCCESS Payments (Every 60 minutes)**

```
Time: T + 0min (then T + 60min, T + 120min, ...)

Step 1: Fetch SUCCESS transactions from last 7 days
  └─ WHERE Status = "SUCCESS" AND CreatedOn >= NOW - 7 days

Step 2: For each SUCCESS transaction
  ├─ Get MerchantTxnId, Amount, CreatedOn
  ├─ Call Atom API RequeryPayment(TxnId, Amount, Date)
  │
  ├─ IF Atom returns SUCCESS (isPaid = true):
  │   ├─ Keep Status = "SUCCESS"
  │   └─ Log: "✓ SUCCESS verified - Payment still valid"
  │
  └─ IF Atom returns FAILED (isPaid = false): ⚠️ CRITICAL
      ├─ Update PaymentTransaction.Status = "FAILED"
      ├─ Update Users.IsPaymentCompleted = false
      ├─ Update Payment record Status = "FAILED"
      └─ Log: "✗ CRITICAL - SUCCESS payment reverted to FAILED"
```

## Example Scenario

### Scenario: Payment becomes invalid after verification

```
Hour 0:00
├─ User makes payment Rs. 600
├─ Atom returns SUCCESS → Status = SUCCESS
├─ User marked as PAID
└─ Logs: "Payment verified"

Hour 1:00 (First SUCCESS Verification)
├─ System checks SUCCESS payment
├─ Atom API returns: FAILED (OTS0600)
├─ System detects inconsistency
├─ REVERTS: Status = FAILED
├─ Updates: Users.IsPaymentCompleted = false
├─ Logs: "CRITICAL - SUCCESS payment reverted to FAILED"
└─ User account now requires re-payment
```

## Log Output Examples

### Pending Payment Processing
```
PaymentRequeryScheduler: Found 5 pending transactions to verify.
PaymentRequeryScheduler: Requerying TxnId: REG3498_1784138009_13fae053 for UserId: 3498
PaymentRequeryScheduler: ✓ Payment verified for TxnId: REG3498_1784138009_13fae053 - Status: OTS0000
PaymentRequeryScheduler: ✗ Payment FAILED for TxnId: REG3499_1784138010_14fbf064. Status: OTS0600, Message: FAILED
PaymentRequeryScheduler: Requery Summary - Total: 5, Success: 3, Failed: 2, Errors: 0
```

### SUCCESS Verification Processing
```
PaymentRequeryScheduler: Running hourly verification of successful payments.
PaymentRequeryScheduler: Verifying 15 successful transactions against Atom API.
PaymentRequeryScheduler: Verifying SUCCESS TxnId: REG3495_1784137009_12eae951 for UserId: 3495
PaymentRequeryScheduler: ✓ SUCCESS verified - TxnId: REG3495_1784137009_12eae951 is still valid
PaymentRequeryScheduler: ✗ CRITICAL - SUCCESS payment is now INVALID! TxnId: REG3496_1784138000_13fbf052
PaymentRequeryScheduler: Verification Summary - Total: 15, Verified: 14, Failed: 1, Errors: 0
```

## Database Tables Updated

| Table | Field | When Updated | Value |
|-------|-------|--------------|-------|
| PaymentTransactions | Status | Both cycles | SUCCESS or FAILED |
| PaymentTransactions | UpdatedOn | Both cycles | Current timestamp |
| Users | IsPaymentCompleted | Cycle 1 (SUCCESS) or Cycle 2 (revert) | true/false |
| Users | PaymentDate | Cycle 1 (SUCCESS) | Timestamp |
| Payments | Status | Cycle 1 (SUCCESS) or Cycle 2 (revert) | SUCCESS/FAILED |
| UserStepProgress | StepNumber 4 | Cycle 1 (SUCCESS) | Added if not exists |
| PaymentEventLogs | Message | Both cycles | Event description |

## Current Status

✅ **Pending Payment Verification**: Running every 15 minutes
✅ **SUCCESS Payment Verification**: Running every 60 minutes
✅ **Logging**: All events logged to database and console
✅ **Error Handling**: Graceful error handling with detailed logs
✅ **Data Integrity**: Reverts invalid SUCCESS payments automatically
