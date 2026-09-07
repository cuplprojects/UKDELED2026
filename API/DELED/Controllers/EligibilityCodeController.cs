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
    public class EligibilityCodeController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IFileStorageService _fileStorageService;

        public EligibilityCodeController(
            AppDbContext context,
            IFileStorageService fileStorageService)
        {
            _context = context;
            _fileStorageService = fileStorageService;
        }

        // ================================
        // Upload Eligibility Code File
        // POST api/EligibilityCode/upload
        // ================================
        [HttpPost("upload")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadEligibilityCode(
            [FromForm] EligibilityCodeUploadRequest request)
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
                        message = "Name required"
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
                var subFolder = "EligibilityCodes";
                var savedPath = await _fileStorageService.SaveAsync(
                    request.File,
                    subFolder,
                    "ELIGIBILITY_CODE"
                );

                // Save to database
                var eligibilityCode = new EligibilityCode
                {
                    Name = request.Name,
                    path = savedPath
                };

                _context.EligibilityCodes.Add(eligibilityCode);
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    success = true,
                    message = "Uploaded successfully",
                    data = new
                    {
                        eligibilityCodeId = eligibilityCode.EligibilityCodeId,
                        eligibilityCode.Name,
                        eligibilityCode.path,
                        url = $"{Request.Scheme}://{Request.Host}/{eligibilityCode.path}"
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
        // Get All Eligibility Codes
        // GET api/EligibilityCode/all
        // ================================
        [HttpGet("all")]
        public async Task<IActionResult> GetAll()
        {
            var data = await _context.EligibilityCodes
                .OrderByDescending(x => x.EligibilityCodeId)
                .Select(x => new
                {
                    x.EligibilityCodeId,
                    x.Name,
                    x.path,
                    url = $"{Request.Scheme}://{Request.Host}/{x.path}"
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
        // GET api/EligibilityCode/{id}
        // ================================
        [HttpGet("{id}")]
        public async Task<IActionResult> Get(int id)
        {
            var eligibilityCode = await _context.EligibilityCodes
                .FirstOrDefaultAsync(x => x.EligibilityCodeId == id);

            if (eligibilityCode == null)
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
                    eligibilityCode.EligibilityCodeId,
                    eligibilityCode.Name,
                    eligibilityCode.path,
                    url = $"{Request.Scheme}://{Request.Host}/{eligibilityCode.path}"
                }
            });
        }

        // ================================
        // Delete
        // DELETE api/EligibilityCode/{id}
        // ================================
        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> Delete(int id)
        {
            var eligibilityCode = await _context.EligibilityCodes.FindAsync(id);

            if (eligibilityCode == null)
            {
                return NotFound();
            }

            // Use FileStorageService to delete file
            await _fileStorageService.DeleteAsync(eligibilityCode.path);

            _context.EligibilityCodes.Remove(eligibilityCode);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = "Deleted"
            });
        }

        // ================================
        // Update Name
        // PUT api/EligibilityCode/{id}
        // ================================
        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> Update(
            int id,
            [FromBody] UpdateEligibilityCodeRequest request)
        {
            var eligibilityCode = await _context.EligibilityCodes.FindAsync(id);

            if (eligibilityCode == null)
            {
                return NotFound();
            }

            eligibilityCode.Name = request.Name;
            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = "Updated"
            });
        }

        // ================================
        // Patch - Update with file upload
        // PATCH api/EligibilityCode/{id}
        // ================================
        [HttpPatch("{id}")]
        [Authorize]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> Patch(
            int id,
            [FromForm] EligibilityCodePatchRequest request)
        {
            var eligibilityCode = await _context.EligibilityCodes.FindAsync(id);

            if (eligibilityCode == null)
            {
                return NotFound();
            }

            // Update name if provided
            if (!string.IsNullOrWhiteSpace(request.Name))
            {
                eligibilityCode.Name = request.Name;
            }

            // Handle file upload
            if (request.File != null && request.File.Length > 0)
            {
                // Delete old file
                if (!string.IsNullOrWhiteSpace(eligibilityCode.path))
                {
                    await _fileStorageService.DeleteAsync(eligibilityCode.path);
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
                var subFolder = "EligibilityCodes";
                var savedPath = await _fileStorageService.SaveAsync(
                    request.File,
                    subFolder,
                    "ELIGIBILITY_CODE"
                );

                eligibilityCode.path = savedPath;
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = "Updated",
                data = new
                {
                    eligibilityCode.EligibilityCodeId,
                    eligibilityCode.Name,
                    eligibilityCode.path,
                    url = $"{Request.Scheme}://{Request.Host}/{eligibilityCode.path}"
                }
            });
        }
    }

    // ================================
    // Request Models
    // ================================
    public class EligibilityCodeUploadRequest
    {
        public string Name { get; set; } = "";
        public IFormFile File { get; set; } = null!;
    }

    public class UpdateEligibilityCodeRequest
    {
        public string Name { get; set; } = "";
    }

    public class EligibilityCodePatchRequest
    {
        public string? Name { get; set; }
        public IFormFile? File { get; set; }
    }
}
