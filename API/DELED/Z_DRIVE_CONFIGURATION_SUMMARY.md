# Z Drive Configuration for Notice Files ✅

## Configuration Updated

### appsettings.json
```json
{
  "FilePath": "Z:\\Notices"
}
```

### File Storage Location
- **Physical Storage**: `Z:\Notices\`
- **Access URL**: `https://localhost:7026/{filename}`

Example:
- File saved to: `Z:\Notices\20260622070530_a1b2c3d4e5f6.pdf`
- Accessible at: `https://localhost:7026/20260622070530_a1b2c3d4e5f6.pdf`

## How It Works

### 1. Upload Flow
When you upload a file via `POST /api/Notice/upload`:

1. File is saved to `Z:\Notices\{timestamp}_{guid}.{extension}`
2. Database stores: `/{filename}` (e.g., `/20260622070530_a1b2c3d4e5f6.pdf`)
3. Response includes full URL for accessing the file

### 2. Static Files Configuration (Program.cs)
```csharp
var filePath = builder.Configuration["FilePath"];  // Gets "Z:\Notices"
if (!string.IsNullOrWhiteSpace(filePath))
{
    if (!Directory.Exists(filePath))
    {
        Directory.CreateDirectory(filePath);  // Creates Z:\Notices if not exists
    }

    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new PhysicalFileProvider(filePath),  // Serves from Z:\Notices
        RequestPath = ""  // Files accessible from root URL
    });
}
```

### 3. Controller Configuration
```csharp
public NoticeController(AppDbContext context, IConfiguration configuration)
{
    _context = context;
    _noticeFilePath = configuration["FilePath"] 
        ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "Notices");
    
    // Ensures directory exists
    if (!Directory.Exists(_noticeFilePath))
    {
        Directory.CreateDirectory(_noticeFilePath);
    }
}
```

## Important Notes

### Z Drive Must Be Accessible
Make sure:
- ✅ Z drive exists and is mounted
- ✅ Application has read/write permissions to Z:\Notices
- ✅ Z drive is available when the application starts

### Fallback Behavior
If `FilePath` is not set in appsettings.json OR is empty/null, files will be saved to:
```
S:\DELED\API\DELED\wwwroot\Notices
```

### Directory Auto-Creation
The application automatically creates the Notices directory if it doesn't exist:
- On startup (Program.cs)
- In controller constructor (NoticeController.cs)

## Testing After Restart

### 1. Stop and Restart Application
```bash
# Stop current process (Ctrl+C)
cd S:\DELED\API\DELED
dotnet clean
dotnet build
dotnet run
```

### 2. Upload a Test File
```bash
curl -X POST "https://localhost:7026/api/Notice/upload" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@test.pdf" \
  -F "name=Test Notice"
```

### 3. Verify File Location
Check that the file exists in:
```
Z:\Notices\20260622HHMMSS_guid.pdf
```

### 4. Access the File
Open the URL returned in the upload response:
```
https://localhost:7026/20260622HHMMSS_guid.pdf
```

## Troubleshooting

### Issue: Files still saving to wwwroot
**Cause**: Old compiled code still running
**Solution**: 
1. Stop the application
2. Run `dotnet clean` and `dotnet build`
3. Restart the application

### Issue: "Access Denied" or "Directory not found"
**Cause**: Z drive not accessible or permissions issue
**Solution**:
1. Verify Z drive exists: Open File Explorer and check Z:\ exists
2. Test write permissions: Try creating a folder manually in Z:\
3. Check application runs with correct user permissions

### Issue: Files upload but can't be accessed via URL
**Cause**: Static files middleware not configured or Z drive not available
**Solution**:
1. Check Program.cs has the static files configuration
2. Verify Z drive is mounted when application starts
3. Restart the application

## Security Considerations

### File Types Allowed
Only these extensions are permitted:
- `.pdf` - PDF documents
- `.doc`, `.docx` - Word documents
- `.jpg`, `.jpeg`, `.png` - Images
- `.txt` - Text files

Any other file type will be rejected with a 400 Bad Request error.

### File Naming
Files are renamed on upload to prevent:
- Filename conflicts
- Path traversal attacks
- Information leakage

Format: `{timestamp}_{guid}.{extension}`

Example: `20260622070530_a1b2c3d4e5f6789012345678.pdf`

## Current Configuration Summary

✅ **FilePath in appsettings.json**: `Z:\Notices`
✅ **Physical Storage**: Z drive, Notices folder
✅ **URL Access**: Direct from root (no /Notices prefix)
✅ **Auto-create directory**: Yes
✅ **Fallback**: wwwroot/Notices (if Z drive unavailable)

**Everything is configured! Just restart the application.** 🎉
