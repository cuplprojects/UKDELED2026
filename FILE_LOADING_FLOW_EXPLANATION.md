# File Loading Flow - ApplicationDashboard & PreviewStep

## Answer: Files are NOT picking from root folder

**Files are being served from the API's configured FilePath (Z:\DELED2026), NOT from React root.**

---

## Complete Flow Chart

### Step 1: ApplicationDashboard Fetches Files
```javascript
// File: d:\DELED2026\UI\src\pages\ApplicationDashboard.jsx (Line 128)

const uploadsRes = await api.get(`/api/Uploads/user`);
// API returns:
{
  "photoFile": "photos/123_PassportSizePhoto.jpg",        // Relative path
  "signatureFile": "signatures/123_SignaturePhoto.jpg",   // Relative path
  "thumbImp": "thumbs/123_ThumbPhoto.jpg"                 // Relative path
}
```

### Step 2: Construct Full URL with API BaseURL
```javascript
// ApplicationDashboard.jsx (Lines 131-141)

setUploads({
  photoFilePreview: uploadObj.photoFile
    ? `${api.defaults.baseURL}/${uploadObj.photoFile}`  // Constructs FULL URL
    : "",
});

// Result:
// api.defaults.baseURL = "https://localhost:7026" (local) or "https://ukdeled.com/API" (hosted)
// uploadObj.photoFile = "photos/123_PassportSizePhoto.jpg"
// Full URL = "https://localhost:7026/photos/123_PassportSizePhoto.jpg"
//        or "https://ukdeled.com/API/photos/123_PassportSizePhoto.jpg"
```

### Step 3: Image Tag Uses Full URL
```javascript
// ApplicationDashboard.jsx (Line 1084)

<img
  src={uploads.photoFilePreview}  // Uses the full URL constructed above
  alt="Candidate"
  className="w-full h-full object-cover"
/>

// Browser requests: https://ukdeled.com/API/photos/123_PassportSizePhoto.jpg
```

### Step 4: API Server Responds
```
Browser Request:
  GET https://ukdeled.com/API/photos/123_PassportSizePhoto.jpg

API Server (Program.cs) receives request:
  1. Reads FilePath from appsettings.json: "Z:\DELED2026"
  2. Converts URL path to disk path:
     - Request path: /photos/123_PassportSizePhoto.jpg
     - Disk path: Z:\DELED2026\photos\123_PassportSizePhoto.jpg
  3. Serves file from disk using StaticFiles middleware

Response:
  ✅ Image file returned from Z:\DELED2026\photos\123_PassportSizePhoto.jpg
```

---

## PreviewStep.jsx - Same Flow

```javascript
// File: d:\DELED2026\UI\src\components\PreviewStep.jsx (Line 91)

<QRCode
  value={`https://ukdeled.com/dbtest26/verify/${formData.applicantId || 'N/A'}`}
  size={128}
  level="M"
  includeMargin={true}
  className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28"
/>

// And for images:
<img
  src={formData.photoFilePreview}  // This is the full URL with api.defaults.baseURL
  alt="Candidate Photo"
  className="w-full h-full object-cover"
/>
```

---

## Print Preview - HTML Template

```javascript
// ApplicationDashboard.jsx - handlePrint() function (Line 305)

const htmlDoc = `
  ...
  <div class="photo-box large">
    ${uploads.photoFilePreview ? `<img src="${uploads.photoFilePreview}" alt="Photo">` : '...'}
  </div>
  ...
`;

// When printed, the img src is:
// <img src="https://ukdeled.com/API/photos/123_PassportSizePhoto.jpg" alt="Photo">

// When browser prints, it requests this URL and embeds the image in print
```

---

## File Path Configuration Chain

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. API appsettings.json                                        │
│    "FilePath": "Z:\DELED2026"                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. Program.cs - StaticFiles Configuration                       │
│    app.UseStaticFiles(new StaticFileOptions {                  │
│      FileProvider = new PhysicalFileProvider(filePath),        │
│      RequestPath = ""                                           │
│    })                                                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. FileStorageService - Saves files                             │
│    _baseStoragePath = filePath;  // Z:\DELED2026               │
│    var fullPath = Path.Combine(_baseStoragePath, filePath);   │
│    // Result: Z:\DELED2026\photos\123_PassportSizePhoto.jpg    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. UploadsController - Returns relative paths                   │
│    Database stores: "photos/123_PassportSizePhoto.jpg"         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. UI (.env file)                                               │
│    VITE_API_URL="https://localhost:7026"                       │
│    or                                                            │
│    VITE_API_URL="https://ukdeled.com/API"                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. apiStore.js - Creates axios instance                         │
│    api = axios.create({                                         │
│      baseURL: VITE_API_URL                                     │
│    })                                                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. ApplicationDashboard & PreviewStep                            │
│    uploads.photoFilePreview = `${api.defaults.baseURL}/${path}` │
│    // Result: "https://ukdeled.com/API/photos/123_...jpg"      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 8. Browser Renders Image                                        │
│    <img src="https://ukdeled.com/API/photos/123_...jpg" />      │
│    Browser requests: GET /photos/123_...jpg from ukdeled.com    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 9. API StaticFiles Middleware Serves File                       │
│    Disk location: Z:\DELED2026\photos\123_PassportSizePhoto.jpg │
│    ✅ Image returned to browser                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Environment Variables - Local vs Hosted

### Local Development (.env)
```
VITE_API_URL="https://localhost:7026"
```
When you upload a photo:
- Relative path in DB: `photos/123_PassportSizePhoto.jpg`
- Full URL constructed: `https://localhost:7026/photos/123_PassportSizePhoto.jpg`
- API serves from: `{CurrentDirectory}/wwwroot/photos/123_PassportSizePhoto.jpg`

### Hosted Environment (.env for production build)
```
VITE_API_URL="https://ukdeled.com/API"
```
When you upload a photo:
- Relative path in DB: `photos/123_PassportSizePhoto.jpg`
- Full URL constructed: `https://ukdeled.com/API/photos/123_PassportSizePhoto.jpg`
- API serves from: `Z:\DELED2026\photos\123_PassportSizePhoto.jpg` (from appsettings.json)

---

## How to Verify Files Are Not From Root

### Test 1: Check Network Request
1. Open browser DevTools → Network tab
2. Upload a file
3. In the Network tab, find the image request
4. Look at the full URL
5. If it's `https://ukdeled.com/API/photos/...` → Files from API configured path ✅
6. If it's `https://ukdeled.com/photos/...` → Files from React root ❌

### Test 2: Try Accessing File Directly
```
Try accessing: https://ukdeled.com/API/photos/123_PassportSizePhoto.jpg
- If you see the image → files are served from API path ✅
- If you get 404 → files are NOT from that path ❌
```

### Test 3: Check Console Logs
1. Open DevTools → Console
2. Look for logs like:
```
[API Store] Initialized with baseURL: https://ukdeled.com/API
[API] GET /api/Uploads/user
```
This confirms the API baseURL being used.

### Test 4: Inspect HTML Source
1. Right-click image → Inspect Element
2. Look at the `src` attribute
3. If it contains `api.defaults.baseURL` in construction, files are from API ✅

---

## Print Preview Specific

### How Print Preview Gets Images

```javascript
// ApplicationDashboard.jsx - handlePrint() (Line 305)

const htmlDoc = `
  ...
  <img src="${uploads.photoFilePreview}" alt="Photo">
  ...
`;

// uploads.photoFilePreview is already constructed as:
// "https://ukdeled.com/API/photos/123_PassportSizePhoto.jpg"

printWindow.document.write(htmlDoc);
```

**When you print:**
1. Browser opens new window with HTML
2. HTML contains: `<img src="https://ukdeled.com/API/photos/123_...jpg">`
3. Browser fetches image from this URL
4. API serves from: `Z:\DELED2026\photos\123_...jpg`
5. Image embedded in print

**Result:** Print preview shows images from API configured path, NOT from root folder ✅

---

## Key Takeaways

✅ **Files are served from**: API configured FilePath (`Z:\DELED2026`)
✅ **Not from**: React root folder
✅ **How it works**: 
   1. API returns relative paths from database
   2. React constructs full URLs using `api.defaults.baseURL`
   3. Browser requests full URL from API
   4. API serves file from disk using StaticFiles middleware
✅ **In Print Preview**: Same process - constructs full URL, browser fetches from API
✅ **Environment agnostic**: Works same way locally and hosted

---

## Troubleshooting - If Files Don't Show

### Issue: Images showing 404 in print preview

**Causes:**
1. API baseURL incorrect in .env
2. FilePath not configured in appsettings.json
3. Files not in Z:\DELED2026
4. API StaticFiles middleware not working

**Check:**
```
1. Verify .env has correct VITE_API_URL
2. Verify appsettings.json has correct FilePath
3. Test: https://ukdeled.com/API/photos/123_xxx.jpg directly
4. Check IIS logs for 404/500 errors
```

### Issue: Files showing but from wrong location

**Causes:**
1. Fallback to wwwroot instead of configured path
2. appsettings.json FilePath is invalid

**Solution:**
1. Check if directory exists: `Z:\DELED2026`
2. Check directory permissions for IIS user
3. Restart API application pool

---

## Summary Table

| Component | Configuration | Purpose |
|-----------|---------------|---------|
| appsettings.json | `"FilePath": "Z:\DELED2026"` | Where files are stored on disk |
| Program.cs | StaticFiles middleware | Serves files via HTTP |
| .env | `VITE_API_URL` | Where React tells browser to fetch files |
| apiStore.js | axios baseURL | Constructs API requests |
| ApplicationDashboard | Constructs full URLs | Builds image URLs for display |
| PreviewStep | Uses full URLs | Displays images in preview |
| Print Preview | Embeds full URLs | Shows images in print document |

**Result: All files served from API configured path, NOT React root** ✅
