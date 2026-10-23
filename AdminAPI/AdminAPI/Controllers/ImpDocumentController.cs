using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DELED.Data;
using DELED.Models;
using DELED.Services;

namespace DELED.Controllers
{
    [Route("api/[controller]")]
    [Route("[controller]")]
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

        private static bool _statusColumnChecked = false;

        private async Task EnsureStatusColumnAsync()
        {
            if (_statusColumnChecked) return;
            try
            {
                var conn = _context.Database.GetDbConnection();
                if (conn.State != System.Data.ConnectionState.Open)
                {
                    await conn.OpenAsync();
                }
                using var cmd = conn.CreateCommand();
                cmd.CommandText = @"
                    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_SCHEMA = DATABASE() 
                      AND TABLE_NAME = 'ImpDocuments' 
                      AND COLUMN_NAME = 'Status';";
                var exists = Convert.ToInt32(await cmd.ExecuteScalarAsync()) > 0;
                if (!exists)
                {
                    cmd.CommandText = "ALTER TABLE `ImpDocuments` ADD COLUMN `Status` INT NOT NULL DEFAULT 0;";
                    await cmd.ExecuteNonQueryAsync();
                }
                _statusColumnChecked = true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[AdminAPI ImpDocumentController] EnsureStatusColumn error: {ex.Message}");
            }
        }

        // ================================
        // Upload ImpDocument
        // POST api/ImpDocument/upload
        // ================================
        [HttpPost("upload")]
        [Authorize]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadDocument(
            [FromForm] ImpDocumentUploadRequest request)
        {
            try
            {
                await EnsureStatusColumnAsync();

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
                    Path = savedPath,
                    Status = request.Status ?? 0
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
                        status = document.Status,
                        isNew = document.Status == 1,
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
            await EnsureStatusColumnAsync();

            var data = await _context.ImpDocuments
                .OrderByDescending(x => x.ImpDocumentId)
                .Select(x => new
                {
                    x.ImpDocumentId,
                    x.Name,
                    x.Path,
                    status = x.Status,
                    isNew = x.Status == 1,
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
            await EnsureStatusColumnAsync();
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
                    status = document.Status,
                    isNew = document.Status == 1,
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
            await EnsureStatusColumnAsync();
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
        // Update Name and Status
        // PUT api/ImpDocument/{id}
        // ================================
        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> Update(
            int id,
            [FromBody] UpdateImpDocumentRequest request)
        {
            await EnsureStatusColumnAsync();
            var document = await _context.ImpDocuments.FindAsync(id);

            if (document == null)
            {
                return NotFound();
            }

            if (!string.IsNullOrWhiteSpace(request.Name))
            {
                document.Name = request.Name;
            }
            if (request.Status.HasValue)
            {
                document.Status = request.Status.Value;
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
                    status = document.Status,
                    isNew = document.Status == 1,
                    url = $"{Request.Scheme}://{Request.Host}/{document.Path}"
                }
            });
        }

        // ================================
        // Update Status only
        // PUT api/ImpDocument/{id}/status
        // ================================
        [HttpPut("{id}/status")]
        [AllowAnonymous]
        public async Task<IActionResult> UpdateStatus(
            int id,
            [FromBody] UpdateImpDocStatusRequest request)
        {
            await EnsureStatusColumnAsync();
            var document = await _context.ImpDocuments.FindAsync(id);

            if (document == null)
            {
                return NotFound(new { success = false, message = "Document not found" });
            }

            document.Status = request.Status;
            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = "Status updated",
                impDocumentId = document.ImpDocumentId,
                status = document.Status,
                isNew = document.Status == 1
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
            await EnsureStatusColumnAsync();
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

            // Update status if provided
            if (request.Status.HasValue)
            {
                document.Status = request.Status.Value;
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
                    status = document.Status,
                    isNew = document.Status == 1,
                    url = $"{Request.Scheme}://{Request.Host}/{document.Path}"
                }
            });
        }
    }

    // ================================
    // Request Models
    // ================================
    public class ImpDocumentUploadRequest
    {
        public string Name { get; set; } = "";
        public int? Status { get; set; }
        public IFormFile File { get; set; } = null!;
    }

    public class UpdateImpDocumentRequest
    {
        public string? Name { get; set; }
        public int? Status { get; set; }
    }

    public class ImpDocumentPatchRequest
    {
        public string? Name { get; set; }
        public int? Status { get; set; }
        public IFormFile? File { get; set; }
    }

    public class UpdateImpDocStatusRequest
    {
        public int Status { get; set; }
    }
}
