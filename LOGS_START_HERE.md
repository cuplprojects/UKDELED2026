# Logs - START HERE 🚀

## Quick Answer: Where Are Logs Stored?

### Right Now (Default)
- **Console** - Visual Studio Debug Output or command prompt where API runs
- **Event Viewer** - Windows Event Viewer (if on Windows server)

### After Setup (Production Ready)
- **Files** - logs/ folder in your application directory
- **Cloud** - Azure Application Insights (optional)

---

## View Logs Now - Choose Your Setup

### Option 1: Visual Studio (Easiest)
```
1. Open Visual Studio
2. Run the API (F5)
3. Go to Debug → Windows → Output
4. Make a payment test
5. Watch logs appear in real-time
```

**You'll see**:
```
[14:35:22 INF] GenerateToken: Starting token generation for UserId: 75
[14:35:23 INF] GenerateToken: Token generated successfully
```

---

### Option 2: Command Line / Terminal
```bash
cd D:\DELED2026\API\DELED
dotnet run
```

**Logs will appear**:
```
info: DELED.Services.AtomPaymentService[0]
      GenerateToken: Starting token generation for UserId: 75, Amount: 30
```

---

### Option 3: Windows Event Viewer (Production)
```
1. Windows → Event Viewer
2. Windows Logs → Application
3. Filter by app name
4. View all payment logs
```

---

## Add File Logging (Recommended)

### Step 1: Install Package
```powershell
# In Package Manager Console
Install-Package Serilog.Extensions.Logging.File
```

### Step 2: Uncomment in Program.cs
```csharp
// File logging (optional - uncomment to enable)
builder.Logging.AddFile("logs/deled-{Date}.log");
```

### Step 3: Create logs folder
```bash
mkdir logs
```

### Step 4: Done!
Logs now appear in:
- **Windows**: `D:\DELED2026\API\DELED\logs\deled-2026-07-02.log`
- **Linux**: `/var/log/deled-2026-07-02.log`

---

## View File Logs

### Windows
```powershell
# Open in Notepad
notepad logs\deled-2026-07-02.log

# View in PowerShell (last 50 lines, live)
Get-Content logs\deled-2026-07-02.log -Wait -Tail 50
```

### Linux
```bash
# View last 50 lines with live update
tail -f logs/deled-2026-07-02.log

# Search for specific user
grep "UserId: 75" logs/deled-*.log
```

---

## What You'll See

### Payment Completed Successfully
```
[INF] GenerateToken: Starting token generation for UserId: 75, Amount: 30
[DBG] GenerateToken: Generated MerchantTxnId: REG75_1782483455_4dbe5f9f
[INF] GenerateToken: Token generated successfully - AtomTokenId: TOKEN_ABC123
[INF] CheckPaymentStatusAdvanced: Transaction already SUCCESS for user 75
```

### Payment Pending (Waiting for completion)
```
[INF] CheckPaymentStatusAdvanced: Checking transaction status for user 75
[INF] CheckPaymentStatusAdvanced: Attempting requery for user 75
[WRN] RequeryPayment: HTTP error from Atom API - Status: 403
[INF] CheckPaymentStatusAdvanced: Returning PENDING status
```

### Error During Payment
```
[ERR] GenerateToken: Failed to generate token for UserId: 75, Error: Exception details
[ERR] RequeryPayment: CRITICAL - HTTP 403 Forbidden (merchant credential issue)
```

---

## Search Logs

### Find Logs for User 75
```bash
# Linux
grep "UserId: 75" logs/deled-*.log

# Windows PowerShell
Select-String "UserId: 75" logs\deled-*.log

# Windows CMD
findstr "UserId: 75" logs\deled-*.log
```

### Find All Errors
```bash
# Linux
grep "\[ERR\]" logs/deled-2026-07-02.log

# Windows PowerShell
Select-String "\[ERR\]" logs\deled-*.log
```

### Find Specific Transaction
```bash
# Linux
grep "REG75_1782483455_4dbe5f9f" logs/deled-*.log

# Windows
findstr "REG75_1782483455_4dbe5f9f" logs\deled-*.log
```

---

## Production Deployment

### For Windows Server
```csharp
// In Program.cs
builder.Logging.AddFile(@"C:\Logs\DELED\deled-{Date}.log");
```

**Logs will be stored**: `C:\Logs\DELED\deled-2026-07-02.log`

### For Linux Server
```csharp
// In Program.cs
builder.Logging.AddFile("/var/log/deled/deled-{Date}.log");
```

**Logs will be stored**: `/var/log/deled/deled-2026-07-02.log`

---

## Summary

| When | Where | How to View |
|------|-------|-------------|
| **Local Dev (now)** | Console | Visual Studio Output window |
| **Local Dev (now)** | Debug | Visual Studio Debug window |
| **After setup** | Files | Text editor or `tail -f` command |
| **Production** | Files + Event Viewer | File or Windows Event Viewer |
| **Enterprise** | Cloud | Azure Portal or Datadog |

---

## Three Steps to Start

1. ✅ **Logging is already set up** (Program.cs configured)
2. 📂 **Run the API** and watch logs in Visual Studio
3. 📝 **(Optional) Enable file logging** by uncommenting one line

---

## Verify Logs Working

### Make a Test Payment
1. Open browser and navigate to your application
2. Start a payment process
3. Go to Visual Studio → Debug → Output
4. You should see:
   ```
   [INF] GenerateToken: Starting token generation...
   ```

**If you see this, logs are working!** ✅

---

## Cheat Sheet

```bash
# View logs (Linux)
tail -f /var/log/deled-2026-07-02.log

# View logs (Windows PowerShell)
Get-Content logs\deled-2026-07-02.log -Wait -Tail 50

# Search for user 75
grep "UserId: 75" logs/deled-*.log

# Search for errors only
grep "\[ERR\]" logs/deled-*.log

# Count total log entries
wc -l logs/deled-2026-07-02.log

# Follow live logs (Linux)
tail -f logs/deled-2026-07-02.log | grep "Payment"
```

---

**Ready to go!** Logs are working right now. Just run your API and watch them appear. 🚀

