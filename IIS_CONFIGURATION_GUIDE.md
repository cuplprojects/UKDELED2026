# IIS Configuration Guide for React SPA Deployment

## Current Issue
Getting 500 Internal Server Error on `https://ukdeled.com/admin/`

## Root Causes to Check

### 1. **IIS Application Configuration**
The `/admin/` path must be configured as an IIS Application (not just a Virtual Directory).

**Steps to fix in IIS Manager:**
1. Open IIS Manager on your server
2. Navigate to: Sites → Your Site → /admin/
3. Right-click on `/admin/` → Convert to Application
4. Application Pool should be set to the same pool as the main site
5. Click OK

### 2. **Verify URL Rewrite Module is Installed**
The web.config rules require the URL Rewrite module.

**To check:**
1. In IIS Manager, go to Server level
2. Look for "URL Rewrite" in the list
3. If not present, install it from Microsoft Downloads

**To install:**
- Download: https://www.iis.net/downloads/microsoft/url-rewrite
- Run the installer on your server

### 3. **Check Handler Mappings**
IIS needs to know how to handle all requests.

**In IIS Manager:**
1. Go to `/admin/` application
2. Double-click "Handler Mappings"
3. You should see these entries:
   - `StaticFile` (*.*)
   - `aspNetCore` (if using .NET)
4. If missing, click "Add Module Mapping":
   - Request path: `*`
   - Module: `StaticFileModule`
   - Executable: (leave blank)
   - Name: `StaticFile`

### 4. **Enable Directory Browsing (Optional, for debugging)**
To see if files are being served:

In IIS Manager at `/admin/`:
1. Double-click "Directory Browsing"
2. Enable it
3. Test by visiting `https://ukdeled.com/admin/` (if enabled, you'll see file listing)

## Updated web.config Features

The new web.config includes:

```xml
<!-- MIME Types for modern assets -->
<mimeMap fileExtension=".json" mimeType="application/json" />
<mimeMap fileExtension=".woff2" mimeType="application/font-woff2" />

<!-- Static files are NOT rewritten -->
<rule name="IsFile">
  <match url=".*" />
  <conditions>
    <add input="{REQUEST_FILENAME}" matchType="IsFile" />
  </conditions>
  <action type="None" />
</rule>

<!-- Routes all non-file requests to index.html -->
<rule name="ReactRouter">
  <match url=".*" />
  <action type="Rewrite" url="/index.html" />
</rule>
```

## Deployment Steps

### Local Testing
```bash
# In AdminUI directory
npm run build
cd dist
# Copy web.config from AdminUI/dist/web.config to the dist folder
```

### Server Deployment
1. Build the project: `npm run build`
2. Copy entire `dist` folder contents to `/admin/` application folder on IIS
3. Ensure `web.config` is present in `/admin/` folder
4. Verify permissions (IIS user needs read access)

## IIS Application Structure Should Look Like

```
wwwroot/
├── index.html (main app)
├── web.config (main site config)
├── api/ (proxy to .NET backend)
└── admin/ (React SPA - as Application)
    ├── index.html
    ├── web.config
    ├── assets/
    └── (other static files)
```

## Testing After Deployment

1. **Test static files:**
   ```
   https://ukdeled.com/admin/index.html ✅ Should show HTML
   https://ukdeled.com/admin/favicon.ico ✅ Should show icon (if exists)
   ```

2. **Test routing:**
   ```
   https://ukdeled.com/admin/ ✅ Should show React app
   https://ukdeled.com/admin/dashboard ✅ Should show React app (not 404)
   https://ukdeled.com/admin/login ✅ Should show React app (not 404)
   ```

3. **Check IIS logs:**
   - Location: `C:\inetpub\logs\LogFiles\W3SVC{site-id}\`
   - Look for 500 errors and check the substatus code
   - 500.19 = Config error
   - 500.0 = Module error

## Common IIS Errors and Fixes

### Error 500.19 (Config error in web.config)
- **Cause:** Syntax error or missing module
- **Fix:** Check XML syntax, ensure URL Rewrite module is installed

### Error 500.21 (Module not recognized)
- **Cause:** URL Rewrite module not installed
- **Fix:** Install URL Rewrite from Microsoft Downloads

### Error 500.0 (General error)
- **Cause:** Various issues
- **Fix:** Check IIS logs in `C:\inetpub\logs\`

## Debugging Commands (on server)

If you have RDP access, run these commands:

```powershell
# Check if URL Rewrite is installed
Get-WindowsFeature Web-Rewrite

# Restart IIS
iisreset

# Check IIS logs
Get-Content "C:\inetpub\logs\LogFiles\W3SVC1\*.log" | Select-String "admin"
```

## CORS Headers Added

The web.config now includes CORS headers to allow API calls:

```xml
<add name="Access-Control-Allow-Origin" value="*" />
<add name="Access-Control-Allow-Methods" value="GET, POST, PUT, DELETE, OPTIONS, PATCH" />
<add name="Access-Control-Allow-Headers" value="Content-Type, Authorization, Accept" />
```

This allows your React app to make requests to:
- `https://ukdeled.com/api/...` (if proxied)
- Cross-origin API endpoints

## Next Steps

1. ✅ Web.config files have been updated locally
2. ⚠️ **Deploy the updated files to your server**
3. ⚠️ **Verify IIS application configuration** (see section 1 above)
4. ⚠️ **Check URL Rewrite module** (see section 2 above)
5. Test the deployment
6. Check IIS logs if issues persist

## Files Updated

- ✅ `d:\DELED2026\AdminUI\public\web.config`
- ✅ `d:\DELED2026\AdminUI\dist\web.config`
- ✅ `d:\DELED2026\UI\public\web.config`
- ✅ `d:\DELED2026\UI\dist\web.config`
