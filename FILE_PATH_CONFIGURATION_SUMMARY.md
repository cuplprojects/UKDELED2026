# File Path Configuration Summary

## Answer: **Your API uses FilePath from appsettings.json**

All file access in your application uses the configured path from `appsettings.json`, NOT directly from the root folder.

---

## Current Configuration

### appsettings.json (Main Config)
```json
"FilePath": "Z:\\DELED2026"
```

**This means all files are stored at: `Z:\DELED2026\`**

### Subdirectories Structure
Files are organized into subdirectories:
```
Z:\DELED2026\
├── photos/          (passport size photos)
├── signatures/      (signature images)
├── thumbs/          (thumb impressions)
└── [other files]
```

---

## How File Access Works

### 1. **Program.cs Initialization**
When the API starts, it reads the FilePath from appsettings:

```csharp
var filePath = builder.Configuration["FilePath"];  // Gets "Z:\DELED2026"

if (!string.IsNullOrWhiteSpace(filePath))
{
    if (!Directory.Exists(filePath))
    {
        Directory.CreateDirectory(filePath);  // Creates if missing
    }

    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new PhysicalFileProvider(filePath),
        RequestPath = ""  // Makes files accessible at root
    });
}
```

**Fallback Logic:**
- If FilePath is missing or invalid → uses `{CurrentDirectory}/wwwroot`
- If wwwroot doesn't exist → creates it automatically

### 2. **FileStorageService.cs**
This service handles all file operations:

```csharp
public FileStorageService(IConfiguration configuration)
{
    string configuredPath = _configuration["FilePath"];
    
    // Use configured path if it exists
    _baseStoragePath = pathExists ? configuredPath 
                                   : Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
}
```

**Storage Methods:**
- `SaveAsync()` - Saves files to `{_baseStoragePath}/{subFolder}/{filename}`
- `DeleteAsync()` - Deletes files from storage
- `FileExistsAsync()` - Checks if file exists

### 3. **UploadsController.cs**
File uploads use FileStorageService:

```csharp
// Defines folder structure
var photoFilePath = Path.Combine("photos", photoFileName);      // photos/userId_PassportSizePhoto.jpg
var signatureFilePath = Path.Combine("signatures", signatureFileName);
var thumbFilePath = Path.Combine("thumbs", thumbFileName);

// Saves using base path
var photoFullPath = Path.Combine(_baseStoragePath, photoFilePath);
// Result: Z:\DELED2026\photos\123_PassportSizePhoto.jpg

using (var stream = new FileStream(photoFullPath, FileMode.Create))
{
    await uploadsDto.Photo.CopyToAsync(stream);
}
```

---

## File Access Flow

### Upload Flow
```
1. User uploads file via API
2. UploadsController receives file
3. Validates file (size, dimensions, type)
4. Generates filename: {userId}_{FileType}.jpg
5. FileStorageService saves to disk:
   Z:\DELED2026\{subfolder}\{filename}
6. Relative path saved to Database:
   photos/123_PassportSizePhoto.jpg
```

### Download/View Flow
```
1. Frontend requests: GET /api/Uploads/user
2. Backend returns relative paths from database
3. Frontend constructs URL: {baseURL}/{relativePath}
   Example: https://ukdeled.com/photos/123_PassportSizePhoto.jpg
4. StaticFiles middleware (configured in Program.cs) serves file from:
   Z:\DELED2026\photos\123_PassportSizePhoto.jpg
```

---

## Storage Organization

### Current Directory Structure
```
Z:\DELED2026\
│
├── photos/
│   ├── 1_PassportSizePhoto.jpg
│   ├── 2_PassportSizePhoto.jpg
│   └── ...
│
├── signatures/
│   ├── 1_SignaturePhoto.jpg
│   ├── 2_SignaturePhoto.jpg
│   └── ...
│
└── thumbs/
    ├── 1_ThumbPhoto.jpg
    ├── 2_ThumbPhoto.jpg
    └── ...
```

### File Naming Convention
- **Photos**: `{UserId}_PassportSizePhoto.jpg`
- **Signatures**: `{UserId}_SignaturePhoto.jpg`
- **Thumbs**: `{UserId}_ThumbPhoto.jpg`

---

## Configuration by Environment

### Development (appsettings.Development.json)
If you have a Development config, you can override here:
```json
{
  "FilePath": "C:\\LocalStorage\\DELED2026"
}
```

### Production (appsettings.json - Current)
```json
{
  "FilePath": "Z:\\DELED2026"
}
```

### Deployment
When deploying to a server, change FilePath to the actual storage location:
```json
{
  "FilePath": "\\\\StorageServer\\Share\\DELED2026"  // Network path
}
// OR
{
  "FilePath": "D:\\AppData\\DELED2026"  // Local path
}
```

---

## How Files Are Accessed via Web

### Static File Serving
When StaticFiles middleware is configured in Program.cs:

```csharp
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(filePath),  // Z:\DELED2026
    RequestPath = ""  // Files accessible at root
});
```

**This means:**
- Physical file: `Z:\DELED2026\photos\123_PassportSizePhoto.jpg`
- Web URL: `https://ukdeled.com/photos/123_PassportSizePhoto.jpg`
- Database stores: `photos/123_PassportSizePhoto.jpg` (relative path)

---

## Validation & Constraints

### File Size Limits (from UploadsController)
- **Photo**: 5 KB - 100 KB
- **Signature**: 2 KB - 50 KB
- **Thumb**: 10 KB - 150 KB

### Image Dimensions
- **Photo**: 140 x 170 pixels
- **Signature**: 180 x 70 pixels
- **Thumb**: 250 x 150 pixels

### File Deletion
When a user deletes an upload:
```csharp
// Relative path from database: "photos/123_PassportSizePhoto.jpg"
// Converted to full path: Z:\DELED2026\photos\123_PassportSizePhoto.jpg
// File is deleted from disk
```

---

## Key Points

✅ **FilePath from appsettings.json** - NOT hardcoded to root
✅ **Z:\DELED2026** - Current configured storage location
✅ **Organized subfolders** - photos/, signatures/, thumbs/
✅ **Relative paths in DB** - Database stores: `photos/123_PhotoFile.jpg`
✅ **Full paths on disk** - Disk stores: `Z:\DELED2026\photos\123_PhotoFile.jpg`
✅ **StaticFiles middleware** - Serves files via web

---

## Change File Path

To change storage location:

### Step 1: Update appsettings.json
```json
"FilePath": "D:\\NewStoragePath\\DELED2026"
```

### Step 2: Update appsettings.Development.json (if needed)
```json
"FilePath": "C:\\Dev\\DELED2026"
```

### Step 3: Ensure directory exists and has permissions
```bash
# Windows Command Prompt
mkdir D:\NewStoragePath\DELED2026
# Or PowerShell
New-Item -ItemType Directory -Path "D:\NewStoragePath\DELED2026"
```

### Step 4: Grant IIS user read/write permissions
- Right-click folder → Properties → Security
- Add IIS AppPool user (or NETWORK SERVICE)
- Grant: Modify, Read, Write permissions

### Step 5: Redeploy/Restart API
```bash
iisreset
# OR restart the specific AppPool
```

---

## Troubleshooting

### Files not being saved?
1. Check FilePath in appsettings.json
2. Verify directory exists: `Z:\DELED2026\`
3. Check IIS user has write permissions
4. Review API logs for errors

### Files not being served?
1. Verify FilePath is correct
2. Check StaticFiles middleware is registered in Program.cs
3. Verify file exists at: `Z:\DELED2026\{relativePath}`
4. Check MIME types are configured (especially for custom extensions)

### Path not found errors?
1. Ensure directory structure exists:
   ```
   Z:\DELED2026\photos\
   Z:\DELED2026\signatures\
   Z:\DELED2026\thumbs\
   ```
2. If using network paths, ensure network share is accessible
3. Check UNC path syntax for network shares: `\\ServerName\Share\DELED2026`

---

## Summary

- ✅ Files use **appsettings.json** FilePath configuration
- ✅ Current location: **Z:\DELED2026**
- ✅ Organized in subfolders by file type
- ✅ Relative paths stored in database
- ✅ Full paths used for disk operations
- ✅ StaticFiles middleware serves files via HTTP
- ✅ Change FilePath in appsettings.json to use different storage location
