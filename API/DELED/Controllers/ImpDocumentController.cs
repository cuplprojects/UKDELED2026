using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DELED.Data;
using DELED.Models;
using DELED.Services;

namespace DELED.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ImpDocumentController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IFileStorageService _fileStorageService;
        private readonly IConfiguration _configuration;

        public ImpDocumentController(
            AppDbContext context,
            IFileStorageService fileStorageService,
            IConfiguration configuration)
        {
            _context = context;
            _fileStorageService = fileStorageService;
            _configuration = configuration;
        }

        // ================================
        // Upload ImpDocument
        // POST api/ImpDocument/upload
        // ================================
        [HttpPost("upload")]
        
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadDocument(
            [FromForm] ImpDocumentUploadRequest request)
        {
            try
            {
                if (request.File == null || request.File.Length == 0)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "File required"
                    });
                }

                if (string.IsNullOrWhiteSpace(request.Name))
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Document name required"
                    });
                }

                var allowed = new[]
                {
                    ".pdf",
                    ".doc",
                    ".docx",
                    ".jpg",
                    ".jpeg",
                    ".png",
                    ".txt"
                };

                var ext = Path.GetExtension(request.File.FileName).ToLower();

                if (!allowed.Contains(ext))
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Invalid file type"
                    });
                }

                // Use FileStorageService to save file
                var subFolder = "ImpDocuments";
                var savedPath = await _fileStorageService.SaveAsync(
                    request.File,
                    subFolder,
                    "IMPDOC"
                );

                // Save to database
                var document = new ImpDocument
                {
                    Name = request.Name,
                    Path = savedPath
                };

                _context.ImpDocuments.Add(document);
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    success = true,
                    message = "Uploaded successfully",
                    data = new
                    {
                        impDocumentId = document.ImpDocumentId,
                        document.Name,
                        document.Path,
                        url = $"{Request.Scheme}://{Request.Host}/{document.Path}"
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }

        // ================================
        // Get All ImpDocuments
        // GET api/ImpDocument/all
        // ================================
        [HttpGet("all")]
        public async Task<IActionResult> GetAll()
        {
            var data = await _context.ImpDocuments
                .OrderByDescending(x => x.ImpDocumentId)
                .Select(x => new
                {
                    x.ImpDocumentId,
                    x.Name,
                    x.Path,
                    url = $"{Request.Scheme}://{Request.Host}/{x.Path}"
                })
                .ToListAsync();

            return Ok(new
            {
                success = true,
                count = data.Count,
                data
            });
        }

        // ================================
        // Get By Id
        // GET api/ImpDocument/{id}
        // ================================
        [HttpGet("{id}")]
        public async Task<IActionResult> Get(int id)
        {
            var document = await _context.ImpDocuments
                .FirstOrDefaultAsync(x => x.ImpDocumentId == id);

            if (document == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Not found"
                });
            }

            return Ok(new
            {
                success = true,
                data = new
                {
                    document.ImpDocumentId,
                    document.Name,
                    document.Path,
                    url = $"{Request.Scheme}://{Request.Host}/{document.Path}"
                }
            });
        }

        // ================================
        // Delete
        // DELETE api/ImpDocument/{id}
        // ================================
        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> Delete(int id)
        {
            var document = await _context.ImpDocuments.FindAsync(id);

            if (document == null)
            {
                return NotFound();
            }

            // Use FileStorageService to delete file
            await _fileStorageService.DeleteAsync(document.Path);

            _context.ImpDocuments.Remove(document);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = "Deleted"
            });
        }

        // ================================
        // Update Name
        // PUT api/ImpDocument/{id}
        // ================================
        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> Update(
            int id,
            [FromBody] UpdateImpDocumentRequest request)
        {
            var document = await _context.ImpDocuments.FindAsync(id);

            if (document == null)
            {
                return NotFound();
            }

            document.Name = request.Name;
            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = "Updated"
            });
        }

        // ================================
        // Patch - Update with file upload
        // PATCH api/ImpDocument/{id}
        // ================================
        [HttpPatch("{id}")]
        [Authorize]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> Patch(
            int id,
            [FromForm] ImpDocumentPatchRequest request)
        {
            var document = await _context.ImpDocuments.FindAsync(id);

            if (document == null)
            {
                return NotFound();
            }

            // Update name if provided
            if (!string.IsNullOrWhiteSpace(request.Name))
            {
                document.Name = request.Name;
            }

            // Handle file upload
            if (request.File != null && request.File.Length > 0)
            {
                // Delete old file
                if (!string.IsNullOrWhiteSpace(document.Path))
                {
                    await _fileStorageService.DeleteAsync(document.Path);
                }

                // Validate file extension
                var allowed = new[]
                {
                    ".pdf",
                    ".doc",
                    ".docx",
                    ".jpg",
                    ".jpeg",
                    ".png",
                    ".txt"
                };

                var ext = Path.GetExtension(request.File.FileName).ToLower();

                if (!allowed.Contains(ext))
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Invalid file type"
                    });
                }

                // Save new file
                var subFolder = "ImpDocuments";
                var savedPath = await _fileStorageService.SaveAsync(
                    request.File,
                    subFolder,
                    "IMPDOC"
                );

                document.Path = savedPath;
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = "Updated",
                data = new
                {
                    document.ImpDocumentId,
                    document.Name,
                    document.Path,
                    url = $"{Request.Scheme}://{Request.Host}/{document.Path}"
                }
            });
        }

        // ================================
        // Get Brochure
        // GET api/ImpDocument/brochure
        // ================================
        [HttpGet("brochure")]
        [AllowAnonymous]
        public IActionResult GetBrochure()
        {
            try
            {
                string configuredPath = _configuration["FilePath"];
                bool pathExists = false;
                try
                {
                    if (!string.IsNullOrEmpty(configuredPath) && System.IO.Directory.Exists(configuredPath))
                    {
                        pathExists = true;
                    }
                }
                catch
                {
                    // Ignore
                }

                var baseStoragePath = pathExists ? configuredPath : System.IO.Path.Combine(System.IO.Directory.GetCurrentDirectory(), "wwwroot");
                
                // Search for the brochure file in the Brochure directory
                var folderPath = System.IO.Path.Combine(baseStoragePath, "Brochure");
                if (!System.IO.Directory.Exists(folderPath))
                {
                    // Fallback to wwwroot if baseStoragePath is custom but Brochure folder is not created there
                    var fallbackPath = System.IO.Path.Combine(System.IO.Directory.GetCurrentDirectory(), "wwwroot", "Brochure");
                    if (System.IO.Directory.Exists(fallbackPath))
                    {
                        folderPath = fallbackPath;
                    }
                }

                if (System.IO.Directory.Exists(folderPath))
                {
                    var files = System.IO.Directory.GetFiles(folderPath, "*.pdf");
                    if (files.Length > 0)
                    {
                        var filePath = files[0]; // Get the first PDF file in Brochure folder
                        var fileBytes = System.IO.File.ReadAllBytes(filePath);
                        return File(fileBytes, "application/pdf");
                    }
                }

                return NotFound(new { success = false, message = "Brochure file not found." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }

    // ================================
    // Request Models
    // ================================
    public class ImpDocumentUploadRequest
    {
        public string Name { get; set; } = "";
        public IFormFile File { get; set; } = null!;
    }

    public class UpdateImpDocumentRequest
    {
        public string Name { get; set; } = "";
    }

    public class ImpDocumentPatchRequest
    {
        public string? Name { get; set; }
        public IFormFile? File { get; set; }
    }
}
