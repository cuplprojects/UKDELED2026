# Where Logs Are Stored & How to View Them

## Current Setup (After Implementation)

Your logging is now configured in **Program.cs** to use three providers:

### 1. Console Output ✅ (DEFAULT)
**Location**: Console window / Terminal output  
**How to view**: 
- Visual Studio → Debug output window
- Command prompt where API is running
- Terminal where dotnet command runs

**Example output:**
```
[14:35:22 INF] GenerateToken: Starting token generation for UserId: 75, Amount: 30
[14:35:23 INF] GenerateToken: Token generated successfully - AtomTokenId: TOKEN_ABC123
[14:35:40 INF] CheckPaymentStatusAdvanced: Transaction already SUCCESS for user 75
```

### 2. Debug Output ✅ (VISUAL STUDIO)
**Location**: Visual Studio Debug Output window  
**How to view**:
1. Visual Studio → Debug → Windows → Output
2. Select "Debug" from dropdown
3. View real-time logs

**Perfect for**: Local development and testing

### 3. Event Viewer ✅ (WINDOWS)
**Location**: Windows Event Viewer  
**How to view**:
1. Windows → Event Viewer
2. Windows Logs → Application
3. Search for entries from your application

**Perfect for**: Production Windows servers

---

## For Production - Add File Logging

To store logs to files (recommended for production), uncomment this line in Program.cs:

```csharp
// Uncomment to enable file logging
builder.Logging.AddFile("logs/deled-{Date}.log");
```

**Requires NuGet package**:
```powershell
Install-Package Serilog.Extensions.Logging.File
```

---

## Production Setup Options

### Option 1: File Logging (Simple, No Extra Cost)
```csharp
builder.Logging.AddFile("D:/logs/deled-{Date}.log");
```

**Log files location**:
- Windows: `D:\logs\deled-2026-07-02.log`
- Linux: `/var/log/deled-2026-07-02.log`

**View logs**:
```bash
# Windows
type D:\logs\deled-2026-07-02.log

# Linux
tail -f /var/log/deled-2026-07-02.log

# Search for specific user
grep "UserId: 75" /var/log/deled-*.log
```

---

### Option 2: Application Insights (Recommended - Enterprise)
```csharp
builder.Services.AddApplicationInsightsTelemetry();
```

**Setup**:
1. Create Azure account
2. Add Application Insights NuGet package
3. Get Instrumentation Key from Azure
4. Add to appsettings.json

**View logs**:
1. Azure Portal → Application Insights
2. Logs tab → Write queries
3. Search by user, transaction, timestamp

**Query example**:
```kusto
traces
| where message contains "RequeryPayment"
| where customDimensions.UserId == 75
| project timestamp, severityLevel, message
```

---

### Option 3: Docker Container Logs
If running in Docker:

**View logs**:
```bash
docker logs -f container-name
docker logs container-name --tail 100
docker logs container-name | grep "CheckPayment"
```

---

### Option 4: ELK Stack (Advanced)
**Setup**: Elasticsearch + Logstash + Kibana

```csharp
builder.Logging.AddElasticsearch(
    new Uri("http://localhost:9200"),
    "deled-logs"
);
```

**View in Kibana**:
- URL: http://localhost:5601
- Create index pattern: `deled-logs-*`
- View real-time logs

---

## Local Development - View Logs Now

### Method 1: Visual Studio Debug Window
```
1. Run your API in Visual Studio
2. Debug → Windows → Output
3. Change dropdown to "Debug"
4. Watch logs appear as you make payment requests
```

### Method 2: Console Window
```
1. Open Command Prompt / PowerShell
2. Navigate to API folder
3. Run: dotnet run
4. Watch logs in the console
```

### Method 3: Terminal Output
```bash
cd D:\DELED2026\API\DELED
dotnet run
# Logs will appear here
```

---

## What You'll See

### Payment Success
```
[INF] GenerateToken: Starting token generation for UserId: 75, Amount: 30
[DBG] GenerateToken: Generated MerchantTxnId: REG75_1782483455_4dbe5f9f for UserId: 75
[INF] GenerateToken: Token generated successfully - AtomTokenId: TOKEN_ABC123
[INF] CheckPaymentStatusAdvanced: Transaction already SUCCESS for user 75
```

### Payment Verification
```
[INF] CheckPaymentStatusAdvanced: Checking transaction status for user 75, TxnId: REG75_1782483455_4dbe5f9f, Status: PENDING
[INF] CheckPaymentStatusAdvanced: Attempting requery for user 75
[WRN] RequeryPayment: HTTP error from Atom API - Status: 403
[INF] CheckPaymentStatusAdvanced: Returning PENDING status for user 75
```

---

## Filter & Search Logs

### Search for Specific User
```bash
# Windows
findstr "UserId: 75" deled-2026-07-02.log

# Linux
grep "UserId: 75" deled-2026-07-02.log

# PowerShell
Select-String "UserId: 75" deled-2026-07-02.log
```

### Search for Errors
```bash
# Windows
findstr "ERR\|ERROR" deled-2026-07-02.log

# Linux
grep -E "ERR|ERROR" deled-2026-07-02.log
```

### Search for Specific Transaction
```bash
# Windows
findstr "REG75_1782483455_4dbe5f9f" deled-2026-07-02.log

# Linux
grep "REG75_1782483455_4dbe5f9f" deled-2026-07-02.log
```

---

## Recommended Setup by Environment

### Local Development
```csharp
✓ Console (automatic)
✓ Debug Output (from Program.cs)
```

### Testing/Staging
```csharp
✓ Console
✓ Debug Output
✓ File logging (logs/ folder)
```

### Production
```csharp
✓ Console (optional)
✓ File logging (logs/ folder)
✓ Application Insights (recommended)
OR
✓ ELK Stack
OR
✓ Datadog
```

---

## Log Levels Explained

| Level | Display | When | Example |
|-------|---------|------|---------|
| **Debug** | [DBG] | Detailed diagnostic | Payload created, config loaded |
| **Information** | [INF] | Normal operations | Payment verified, token generated |
| **Warning** | [WRN] | Expected issues | Requery failed, mock mode |
| **Error** | [ERR] | Exceptions | HTTP 403, payment error |
| **Critical** | [CRT] | System failures | Service down |

---

## Viewing Logs by Severity

### View Only Errors
```bash
# Linux
grep "\[ERR\]\|\[CRT\]" deled-2026-07-02.log

# PowerShell
Select-String "\[ERR\]|\[CRT\]" deled-2026-07-02.log
```

### View Information + Above
```bash
# Linux
grep -E "\[INF\]|\[WRN\]|\[ERR\]|\[CRT\]" deled-2026-07-02.log
```

---

## Real-Time Monitoring

### Linux - Watch Log File
```bash
tail -f /var/log/deled-2026-07-02.log
```

### Windows - Monitor File
```powershell
Get-Content deled-2026-07-02.log -Wait -Tail 50
```

### Docker - Stream Logs
```bash
docker logs -f api-container-name
```

---

## Log Rotation Setup

To prevent logs from growing too large:

```csharp
builder.Logging.AddFile(
    "logs/deled-{Date}.log",
    fileSizeLimitBytes: 10485760, // 10 MB
    retainedFileCountLimit: 30    // Keep 30 days
);
```

---

## Troubleshooting - Logs Not Showing

### Issue: No logs appearing
**Solution**:
1. Check log level in Program.cs (should be Information or Debug)
2. Verify logging is added: `builder.Logging.AddConsole()`
3. Check Visual Studio output window is set to "Debug"

### Issue: Logs appear in console but not in file
**Solution**:
1. Uncomment file logging line
2. Install Serilog NuGet package
3. Verify log directory exists and is writable
4. Check file permissions

### Issue: Too many logs (too verbose)
**Solution**:
1. Increase log level to Warning or Error
2. Filter specific namespaces
3. Use proper logging in Program.cs

---

## Example - Configure for Production

Add this to your **Program.cs**:

```csharp
// For Production - File + Console
if (app.Environment.IsProduction())
{
    builder.Logging.ClearProviders();
    builder.Logging.AddConsole();
    builder.Logging.AddFile("logs/deled-{Date}.log");
    
    // Only log Warning and above in production
    builder.Logging.LogLevel.Default = LogLevel.Warning;
    builder.Logging.LogLevel.Microsoft = LogLevel.Error;
}
```

---

## Storage Summary

| Environment | Storage | Location | How to View |
|-------------|---------|----------|------------|
| **Local Dev** | Console | Visual Studio Output | Debug Window |
| **Testing** | File | logs/ folder | Text editor / tail |
| **Production** | File + Cloud | logs/ + Azure/Datadog | Portal/Dashboard |
| **Docker** | Container | docker logs | `docker logs` command |

---

## Next Steps

1. **Local Testing**: Run API and watch Debug Output
2. **Add File Logging**: Uncomment line in Program.cs (for staging/prod)
3. **Production Deployment**: Configure file paths and monitoring
4. **Set Up Alerts**: Monitor for error logs automatically

---

**Current Setup**: Console + Debug Output (ready to use now!)  
**Recommended Addition**: File logging for production  
**Enterprise Option**: Application Insights or ELK Stack

