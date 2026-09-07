# ILogger Implementation - Payment Status Check Endpoints

## Overview
All `Console.WriteLine` calls have been replaced with `ILogger` for proper production logging.

## What Changed

### Before (Console.WriteLine)
```csharp
Console.WriteLine($"[CheckStatus] Payment verified successfully for user {userId}");
```

### After (ILogger)
```csharp
_logger.LogInformation("CheckPaymentStatus: Payment verified successfully for user {UserId}", userId);
```

## Benefits

✅ **Production-Ready**: Logs go to configured providers (file, Azure, ELK, etc.)  
✅ **Structured Logging**: All important data is captured with proper parameters  
✅ **Log Levels**: Different severity levels (Information, Warning, Error)  
✅ **Performance**: Logging won't impact console performance  
✅ **Searchable**: Can search/filter logs by user ID, transaction ID, etc.  

## Endpoints Updated

### GET /api/payment/check-status
- Uses `_logger.LogInformation()` for successful operations
- Uses `_logger.LogWarning()` for potential issues
- Uses `_logger.LogError()` for exceptions

### GET /api/payment/check-status-advanced
- Same logging levels as above
- More detailed logging with transaction information

## Log Messages You'll See in Production

### Successful Payment Check
```
CheckPaymentStatusAdvanced: Checking transaction status for user 82, TxnId: REG75_1782483455_4dbe5f9f, Status: SUCCESS
CheckPaymentStatusAdvanced: Transaction already SUCCESS for user 82, TxnId: REG75_1782483455_4dbe5f9f
```

### Payment Still Pending
```
CheckPaymentStatusAdvanced: Checking transaction status for user 82, TxnId: REG75_1782483455_4dbe5f9f, Status: PENDING
CheckPaymentStatusAdvanced: Attempting requery for user 82, TxnId: REG75_1782483455_4dbe5f9f, Date: 2026-06-26
CheckPaymentStatusAdvanced: Requery returned false for user 82, TxnId: REG75_1782483455_4dbe5f9f
```

### Error Occurred
```
CheckPaymentStatus: Error occurred. Message: [exception details]
CheckPaymentStatusAdvanced: Requery failed for user 82, TxnId: REG75_1782483455_4dbe5f9f, Error: HTTP 403
```

## Log Levels Used

### LogInformation
- Normal operation flow
- Successful transactions
- Status checks completed
- Example: "Payment verified successfully for user 82"

### LogWarning
- Expected issues that don't break functionality
- Requery returned false
- Transaction not found
- Example: "Requery returned false for user 82"

### LogError
- Unexpected exceptions
- Errors in requery attempt
- Critical issues
- Example: "Requery failed for user 82: Exception details"

## How to View Logs in Production

### Option 1: Application Insights (Azure)
If configured in Program.cs:
```csharp
builder.Services.AddApplicationInsightsTelemetry();
```

**View logs:**
- Go to Azure Portal → Application Insights
- Search for logs with query:
```kusto
traces
| where message contains "CheckPaymentStatusAdvanced"
| where customDimensions.UserId == "82"
| order by timestamp desc
```

### Option 2: File Logging
If configured to write to files:

**Common locations:**
- Windows: `C:\logs\application.log`
- Linux: `/var/log/application.log`
- Docker: `/app/logs/application.log`

**View logs:**
```bash
tail -f /var/log/application.log | grep CheckPayment
```

### Option 3: Event Log (Windows)
If configured with Windows Event Log:

**View in Event Viewer:**
- Windows Event Viewer
- Applications and Services Logs
- [Your Application Name]
- Filter for "CheckPaymentStatusAdvanced"

### Option 4: Custom Configuration
Check your `appsettings.json` or `appsettings.Production.json`:

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft": "Warning",
      "DELED.Controllers.PaymentController": "Information"
    },
    "Console": {
      "IncludeScopes": true
    }
  }
}
```

## Typical Log Messages Explained

### Transaction Status SUCCESS
```
[Information] CheckPaymentStatusAdvanced: Transaction already SUCCESS for user 82, TxnId: REG75_1782483455_4dbe5f9f
```
**Meaning**: Payment was already marked as completed. Return immediately with success.

### Requery Attempted
```
[Information] CheckPaymentStatusAdvanced: Attempting requery for user 82, TxnId: REG75_1782483455_4dbe5f9f, Date: 2026-06-26
```
**Meaning**: Transaction is PENDING. Sending query to Atom API to verify.

### Requery Failed (Expected)
```
[Warning] CheckPaymentStatusAdvanced: Requery returned false for user 82, TxnId: REG75_1782483455_4dbe5f9f
```
**Meaning**: Atom API returned false (or 403). This is handled gracefully. Payment status remains pending.

### Requery Exception
```
[Error] CheckPaymentStatusAdvanced: Requery failed for user 82, TxnId: REG75_1782483455_4dbe5f9f, Error: HTTP 403 Forbidden
```
**Meaning**: Exception occurred during requery. Logged and handled gracefully.

### User Not Found
```
[Warning] CheckPaymentStatusAdvanced: User 82 not found
```
**Meaning**: User ID from token doesn't exist in database. Return 404.

## Searching Production Logs

### By User ID
Find all payment operations for a specific user:
```
"User 82" OR "UserId: 82"
```

### By Transaction ID
Track specific transaction:
```
"REG75_1782483455_4dbe5f9f"
```

### By Endpoint
Find all calls to check-status:
```
"CheckPaymentStatusAdvanced"
```

### By Log Level
Find only errors:
```
[Error] AND (CheckPaymentStatus OR CheckPaymentStatusAdvanced)
```

### By Time Range
Last 1 hour:
```
timestamp >= ago(1h)
AND (message contains "CheckPayment")
```

## Integration with Monitoring Tools

### Datadog
```
service:payment_api
resource:CheckPaymentStatusAdvanced
env:production
user_id:82
```

### Splunk
```
sourcetype="aspnet_core"
index="payments"
"CheckPaymentStatusAdvanced"
```

### ELK Stack
```json
{
  "message": "CheckPaymentStatusAdvanced",
  "level": "Information",
  "UserId": 82,
  "MerchantTxnId": "REG75_1782483455_4dbe5f9f"
}
```

## Log Message Format

Each log message includes:

1. **Method Name**: Where the log came from
   - `CheckPaymentStatus:`
   - `CheckPaymentStatusAdvanced:`

2. **Action**: What happened
   - "Checking transaction status"
   - "Payment verified successfully"
   - "Requery failed"

3. **User ID**: Which user (for filtering)
   - `User 82`
   - `UserId: 82`

4. **Transaction ID**: For tracking (if applicable)
   - `TxnId: REG75_1782483455_4dbe5f9f`

5. **Additional Data**: Context-specific info
   - Date, Status, Error message

## Production Monitoring Recommendations

### Set Up Alerts For:

1. **Errors**
```
LogLevel = Error AND CheckPaymentStatus
→ Alert immediately (something broke)
```

2. **Failed Requery**
```
"Requery returned false"
→ Alert after 5+ occurrences (Atom API down?)
```

3. **High Volume**
```
count(CheckPaymentStatusAdvanced) > 100 per minute
→ Unusual spike (investigate)
```

4. **Specific User Issues**
```
"User not found"
→ Alert (data inconsistency)
```

## Code Reference

### Adding New Logs

For any new logging in similar endpoints:

```csharp
// Information level - successful operation
_logger.LogInformation("MethodName: What happened for user {UserId}, TxnId: {MerchantTxnId}", 
    userId, merchantTxnId);

// Warning level - expected issue
_logger.LogWarning("MethodName: What went wrong for user {UserId}", userId);

// Error level - unexpected exception
_logger.LogError(ex, "MethodName: Error occurred for user {UserId}. Message: {Message}", 
    userId, ex.Message);
```

---

**Key Point**: The ILogger implementation provides production-ready logging with proper categorization, searchability, and integration with modern monitoring tools.

Last Updated: July 2, 2026
