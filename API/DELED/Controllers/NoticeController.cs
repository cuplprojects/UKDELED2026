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
    public class NoticeController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IFileStorageService _fileStorageService;

        public NoticeController(
            AppDbContext context,
            IFileStorageService fileStorageService)
        {
            _context = context;
            _fileStorageService = fileStorageService;
        }

        // ================================
        // Upload Notice
        // POST api/Notice/upload
        // ================================
        [HttpPost("upload")]
        
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadNotice(
            [FromForm] NoticeUploadRequest request)
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
                        message = "Notice name required"
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
                var subFolder = "Notices";
                var savedPath = await _fileStorageService.SaveAsync(
                    request.File,
                    subFolder,
                    "NOTICE"
                );

                // Save to database
                var notice = new Notice
                {
                    Name = request.Name,
                    Path = savedPath
                };

                _context.Notices.Add(notice);
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    success = true,
                    message = "Uploaded successfully",
                    data = new
                    {
                        noticeId = notice.NoticeId,
                        notice.Name,
                        notice.Path,
                        url = $"{Request.Scheme}://{Request.Host}/{notice.Path}"
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
        // Get All Notices
        // GET api/Notice/all
        // ================================
        [HttpGet("all")]
        public async Task<IActionResult> GetAll()
        {
            var data = await _context.Notices
                .OrderByDescending(x => x.NoticeId)
                .Select(x => new
                {
                    x.NoticeId,
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
        // GET api/Notice/{id}
        // ================================
        [HttpGet("{id}")]
        public async Task<IActionResult> Get(int id)
        {
            var notice = await _context.Notices
                .FirstOrDefaultAsync(x => x.NoticeId == id);

            if (notice == null)
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
                    notice.NoticeId,
                    notice.Name,
                    notice.Path,
                    url = $"{Request.Scheme}://{Request.Host}/{notice.Path}"
                }
            });
        }

        // ================================
        // Delete
        // DELETE api/Notice/{id}
        // ================================
        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> Delete(int id)
        {
            var notice = await _context.Notices.FindAsync(id);

            if (notice == null)
            {
                return NotFound();
            }

            // Use FileStorageService to delete file
            await _fileStorageService.DeleteAsync(notice.Path);

            _context.Notices.Remove(notice);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = "Deleted"
            });
        }

        // ================================
        // Update Name
        // PUT api/Notice/{id}
        // ================================
        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> Update(
            int id,
            [FromBody] UpdateNoticeRequest request)
        {
            var notice = await _context.Notices.FindAsync(id);

            if (notice == null)
            {
                return NotFound();
            }

            notice.Name = request.Name;
            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = "Updated"
            });
        }

        // ================================
        // Patch - Update with file upload
        // PATCH api/Notice/{id}
        // ================================
        [HttpPatch("{id}")]
        [Authorize]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> Patch(
            int id,
            [FromForm] NoticePatchRequest request)
        {
            var notice = await _context.Notices.FindAsync(id);

            if (notice == null)
            {
                return NotFound();
            }

            // Update name if provided
            if (!string.IsNullOrWhiteSpace(request.Name))
            {
                notice.Name = request.Name;
            }

            // Handle file upload
            if (request.File != null && request.File.Length > 0)
            {
                // Delete old file
                if (!string.IsNullOrWhiteSpace(notice.Path))
                {
                    await _fileStorageService.DeleteAsync(notice.Path);
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
                var subFolder = "Notices";
                var savedPath = await _fileStorageService.SaveAsync(
                    request.File,
                    subFolder,
                    "NOTICE"
                );

                notice.Path = savedPath;
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = "Updated",
                data = new
                {
                    notice.NoticeId,
                    notice.Name,
                    notice.Path,
                    url = $"{Request.Scheme}://{Request.Host}/{notice.Path}"
                }
            });
        }
    }

    // ================================
    // Request Models
    // ================================
    public class NoticeUploadRequest
    {
        public string Name { get; set; } = "";
        public IFormFile File { get; set; } = null!;
    }

    public class UpdateNoticeRequest
    {
        public string Name { get; set; } = "";
    }

    public class NoticePatchRequest
    {
        public string? Name { get; set; }
        public IFormFile? File { get; set; }
    }
}
