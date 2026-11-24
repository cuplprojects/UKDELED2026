using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using DELED.Data;
using DELED.DTOs;
using DELED.Models;
using DELED.Services;

namespace DELED.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ObjectionController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly ISuperimposeService _superimposeService;
        private readonly string _storagePath;
        private readonly string _bookletPath;
        private readonly string _answerKeyPath;
        private static bool _tableInitialized = false;
        private static readonly object _initLock = new object();

        public ObjectionController(AppDbContext context, IConfiguration configuration, ISuperimposeService superimposeService)
        {
            _context = context;
            _configuration = configuration;
            _superimposeService = superimposeService;

            string baseFp = _configuration["FilePath"] ?? string.Empty;
            _storagePath = Path.Combine(baseFp, "Objections");
            _bookletPath = Path.Combine(baseFp, "booklet");
            _answerKeyPath = Path.Combine(baseFp, "Answer");

            try
            {
                if (!string.IsNullOrWhiteSpace(_storagePath) && !Directory.Exists(_storagePath))
                {
                    Directory.CreateDirectory(_storagePath);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ObjectionController] Storage directory notice: {ex.Message}");
            }

        }

        private static DateTime? ParseTimelineDate(string? dateVal, string? subLabel, bool isEndOfDayDefault)
        {
            if (string.IsNullOrWhiteSpace(dateVal)) return null;

            try
            {
                string defaultTime = isEndOfDayDefault ? "23:59:59" : "00:00:00";
                string timeStr = defaultTime;

                if (!string.IsNullOrWhiteSpace(subLabel))
                {
                    var match = System.Text.RegularExpressions.Regex.Match(subLabel, @"(\d{1,2}:\d{2}\s*(?:AM|PM)?)", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                    if (match.Success)
                    {
                        timeStr = match.Groups[1].Value.Trim();
                    }
                }

                string combined = $"{dateVal.Trim()} {timeStr.Trim()}";
                if (DateTime.TryParse(combined, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var dt))
                {
                    return dt;
                }

                if (DateTime.TryParse(dateVal.Trim(), System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out dt))
                {
                    return isEndOfDayDefault ? dt.Date.AddHours(23).AddMinutes(59).AddSeconds(59) : dt.Date;
                }

                string[] formats = new[]
                {
                    "d MMMM yyyy", "dd MMMM yyyy", "d-MMMM-yyyy", "dd-MMMM-yyyy",
                    "yyyy-MM-dd", "dd-MM-yyyy", "dd/MM/yyyy", "d/M/yyyy",
                    "yyyy/MM/dd", "MM/dd/yyyy", "MMMM dd, yyyy", "dd MMM yyyy", "d MMM yyyy"
                };

                foreach (var fmt in formats)
                {
                    if (DateTime.TryParseExact(dateVal.Trim(), fmt, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var exactDt))
                    {
                        return isEndOfDayDefault ? exactDt.Date.AddHours(23).AddMinutes(59).AddSeconds(59) : exactDt.Date;
                    }
                }
            }
            catch { }

            return null;
        }

        private int GetUserIdFromToken()
        {
            var nameClaim = User.Identity?.Name ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(nameClaim) || !int.TryParse(nameClaim, out int userId))
            {
                throw new UnauthorizedAccessException("Invalid candidate authentication credentials.");
            }
            return userId;
        }

        // ==========================================
        // Helper: Check Objection Window Status
        // ==========================================
        private (bool IsOpen, bool IsBefore, bool IsAfter, string Message, DateTime? StartDate, DateTime? EndDate) GetObjectionWindowStatus()
        {
            try
            {
                var now = DateTime.UtcNow.AddHours(5).AddMinutes(30);

                DateTime? startDate = null;
                DateTime? endDate = null;

                // 1. Check RegistrationTimelines DB table (Key: obj_starts / obj_closes, Id: 10/11)
                try
                {
                    var timelines = _context.RegistrationTimelines.AsNoTracking().ToList();

                    var startTimeline = timelines.FirstOrDefault(t =>
                        string.Equals(t.Key, "obj_starts", StringComparison.OrdinalIgnoreCase) ||
                        string.Equals(t.Key, "objection_starts", StringComparison.OrdinalIgnoreCase) ||
                        string.Equals(t.Key, "objection_start", StringComparison.OrdinalIgnoreCase) ||
                        (t.Label != null && t.Label.ToUpper().Contains("OBJECTION TRACKER STARTS")));

                    var closeTimeline = timelines.FirstOrDefault(t =>
                        string.Equals(t.Key, "obj_closes", StringComparison.OrdinalIgnoreCase) ||
                        string.Equals(t.Key, "objection_closes", StringComparison.OrdinalIgnoreCase) ||
                        string.Equals(t.Key, "objection_close", StringComparison.OrdinalIgnoreCase) ||
                        (t.Label != null && t.Label.ToUpper().Contains("OBJECTION TRACKER CLOSES")));

                    if (startTimeline != null)
                    {
                        startDate = ParseTimelineDate(startTimeline.DateValue, startTimeline.SubLabel, false);
                    }

                    if (closeTimeline != null)
                    {
                        endDate = ParseTimelineDate(closeTimeline.DateValue, closeTimeline.SubLabel, true);
                    }
                }
                catch { }

                // 2. Fallback to appsettings.json
                if (startDate == null)
                {
                    var cfgStart = _configuration["ObjectionStartDate"];
                    if (!string.IsNullOrWhiteSpace(cfgStart) && DateTime.TryParse(cfgStart, out DateTime sVal))
                        startDate = sVal;
                }

                if (endDate == null)
                {
                    var cfgEnd = _configuration["ObjectionCloseDate"];
                    if (!string.IsNullOrWhiteSpace(cfgEnd) && DateTime.TryParse(cfgEnd, out DateTime eVal))
                        endDate = eVal;
                }

                // If not set anywhere, default window is open for current session
                if (startDate == null && endDate == null)
                {
                    return (true, false, false, "Objection window is active.", null, null);
                }

                if (startDate.HasValue && now < startDate.Value)
                {
                    return (false, true, false, $"Answer Key Objection portal opens on {startDate.Value:dd MMMM yyyy, hh:mm tt} IST.", startDate, endDate);
                }

                if (endDate.HasValue && now > endDate.Value)
                {
                    return (false, false, true, $"Answer Key Objection window closed on {endDate.Value:dd MMMM yyyy, hh:mm tt} IST.", startDate, endDate);
                }

                return (true, false, false, "Answer Key Objection window is currently active.", startDate, endDate);
            }
            catch (Exception ex)
            {
                return (true, false, false, $"Notice: {ex.Message}", null, null);
            }
        }

        // ==========================================
        // 1. GET: api/Objection/timeline-status
        // ==========================================
        [HttpGet("timeline-status")]
        [AllowAnonymous]
        public IActionResult GetTimelineStatus()
        {
            var status = GetObjectionWindowStatus();
            var now = DateTime.UtcNow.AddHours(5).AddMinutes(30);

            return Ok(new
            {
                isOpen = status.IsOpen,
                isBefore = status.IsBefore,
                isAfter = status.IsAfter,
                message = status.Message,
                startDate = status.StartDate?.ToString("yyyy-MM-ddTHH:mm:ss"),
                closeDate = status.EndDate?.ToString("yyyy-MM-ddTHH:mm:ss"),
                serverTime = now.ToString("yyyy-MM-ddTHH:mm:ss")
            });
        }

        // ==========================================
        // 2. GET: api/Objection/candidate-info
        // ==========================================
        [HttpGet("candidate-info")]
        public async Task<IActionResult> GetCandidateInfo()
        {
            try
            {
                int userId = GetUserIdFromToken();

                var user = await _context.Users.FirstOrDefaultAsync(u => u.UserId == userId);
                if (user == null)
                {
                    return NotFound(new { message = "Candidate profile not found." });
                }

                var personalDetails = await _context.UserPersonalDetails.FirstOrDefaultAsync(p => p.UserId == userId);
                var allotment = await _context.Allotments.FirstOrDefaultAsync(a => a.UserId == userId);

                var existingObjections = await _context.CandidateObjections
                    .Where(o => o.UserId == userId)
                    .OrderBy(o => o.QuestionNo)
                    .ToListAsync();

                bool isFinalSubmitted = existingObjections.Any(o => o.IsFinalSubmitted);
                DateTime? finalSubmittedOn = existingObjections.FirstOrDefault(o => o.IsFinalSubmitted)?.FinalSubmittedOn;

                var response = new CandidateInfoResponse
                {
                    UserId = user.UserId,
                    RegistrationNo = user.RegistrationNo,
                    FullName = user.FullName,
                    FatherName = user.FatherName ?? "",
                    MotherName = personalDetails?.MotherName ?? "",
                    RollNo = allotment != null ? allotment.RollNumber.ToString() : "",
                    ExamName = "UK D.El.Ed. Entrance Exam 2026",
                    AppliedCategory = personalDetails?.AppliedCategory,
                    IsFinalSubmitted = isFinalSubmitted,
                    FinalSubmittedOn = finalSubmittedOn,
                    Objections = existingObjections.Cast<object>().ToList()
                };

                return Ok(response);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Internal error: {ex.Message}" });
            }
        }

        // ==========================================
        // 3. GET: api/Objection/my-objections
        // ==========================================
        [HttpGet("my-objections")]
        public async Task<IActionResult> GetMyObjections()
        {
            try
            {
                int userId = GetUserIdFromToken();

                var list = await _context.CandidateObjections
                    .Where(o => o.UserId == userId)
                    .OrderBy(o => o.QuestionNo)
                    .ToListAsync();

                return Ok(list);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Internal error: {ex.Message}" });
            }
        }

        // ==========================================
        // 4. POST: api/Objection/submit (Draft)
        // ==========================================
        [HttpPost("submit")]
        public async Task<IActionResult> SubmitDraft([FromForm] SubmitObjectionRequest req)
        {
            try
            {
                int userId = GetUserIdFromToken();

                var timeline = GetObjectionWindowStatus();
                if (!timeline.IsOpen)
                {
                    return BadRequest(new { message = timeline.Message });
                }

                var user = await _context.Users.FirstOrDefaultAsync(u => u.UserId == userId);
                if (user == null)
                {
                    return NotFound(new { message = "Candidate profile not found." });
                }

                // Check if candidate already final submitted
                bool alreadyFinalSubmitted = await _context.CandidateObjections
                    .AnyAsync(o => o.UserId == userId && o.IsFinalSubmitted);
                if (alreadyFinalSubmitted)
                {
                    return BadRequest(new { message = "Your objections have already been Final Submitted and locked. Further additions are not permitted." });
                }

                // Validation for Question Number (1 to 200)
                if (req.QuestionNo < 1 || req.QuestionNo > 200)
                {
                    return BadRequest(new { message = "प्रश्न संख्या 1 से 200 के बीच होनी चाहिए (Question number must be between 1 and 200)." });
                }

                if (string.IsNullOrWhiteSpace(req.BookletSeries))
                {
                    return BadRequest(new { message = "Booklet series (A, B, C, or D) is required." });
                }

                string requestedSeries = req.BookletSeries.Trim().ToUpper();

                // Condition: One candidate can add objections ONLY in one booklet series
                var existingSeries = await _context.CandidateObjections
                    .Where(o => o.UserId == userId && !string.IsNullOrEmpty(o.BookletSeries))
                    .Select(o => o.BookletSeries)
                    .FirstOrDefaultAsync();

                if (!string.IsNullOrEmpty(existingSeries) && !existingSeries.Equals(requestedSeries, StringComparison.OrdinalIgnoreCase))
                {
                    return BadRequest(new { message = $"आप केवल एक ही प्रश्न पुस्तिका सीरीज (Series {existingSeries}) में आपत्ति दर्ज कर सकते हैं। अन्य सीरीज का चयन अनुमन्य नहीं है (A candidate can add objections only in one booklet series: Series {existingSeries})." });
                }

                if (string.IsNullOrWhiteSpace(req.CandidateAnswer))
                {
                    return BadRequest(new { message = "Candidate claimed answer option is required." });
                }

                // Check for duplicate question challenge
                bool questionAlreadyExists = await _context.CandidateObjections
                    .AnyAsync(o => o.UserId == userId && o.QuestionNo == req.QuestionNo);
                if (questionAlreadyExists)
                {
                    return BadRequest(new { message = $"You have already challenged Question #{req.QuestionNo}. You can edit or delete your existing draft challenge from the table below." });
                }

                // Candidate Roll Number from Allotment (fallback to RegistrationNo)
                var allotment = await _context.Allotments.FirstOrDefaultAsync(a => a.UserId == userId);
                string rollNo = (allotment != null && allotment.RollNumber > 0)
                    ? allotment.RollNumber.ToString()
                    : user.RegistrationNo;

                // Handle file upload
                string? relativeDocPath = null;
                if (req.DocumentFile != null && req.DocumentFile.Length > 0)
                {
                    string fileExtension = Path.GetExtension(req.DocumentFile.FileName).ToLower();
                    string[] allowedExtensions = { ".pdf", ".jpg", ".jpeg", ".png" };
                    if (!allowedExtensions.Contains(fileExtension))
                    {
                        return BadRequest(new { message = "Only PDF and JPG/JPEG/PNG image documents are allowed as documentary proof." });
                    }

                    if (req.DocumentFile.Length > 5 * 1024 * 1024)
                    {
                        return BadRequest(new { message = "Document size exceeds the maximum permitted limit of 5 MB." });
                    }

                    if (fileExtension == ".pdf")
                    {
                        using (var checkStream = req.DocumentFile.OpenReadStream())
                        {
                            int pdfPages = GetPdfPageCount(checkStream);
                            if (pdfPages > 5)
                            {
                                return BadRequest(new { message = $"साक्ष्य दस्तावेज में पृष्ठों की संख्या 5 से अधिक नहीं होनी चाहिए। आपके द्वारा अपलोड की गई PDF में {pdfPages} पृष्ठ हैं (Uploaded PDF exceeds 5 pages limit. Found {pdfPages} pages)." });
                            }
                        }
                    }

                    string safeFileName = $"{rollNo}{fileExtension}";

                    // If candidate challenged another question that already uses this exact filename, distinguish with Q{req.QuestionNo}
                    bool alreadyUsedByOther = await _context.CandidateObjections
                        .AnyAsync(o => o.UserId == userId && o.QuestionNo != req.QuestionNo && !string.IsNullOrEmpty(o.DocumentPath) && o.DocumentPath.EndsWith("/" + safeFileName));

                    if (alreadyUsedByOther)
                    {
                        safeFileName = $"{rollNo}_Q{req.QuestionNo}{fileExtension}";
                    }

                    string fullPath = Path.Combine(_storagePath, safeFileName);

                    // Superimpose metadata (Roll Number, Exam Name, Q.No/Series, Date, Page count badge) at save time
                    byte[] stampedBytes;
                    using (var stream = req.DocumentFile.OpenReadStream())
                    {
                        stampedBytes = _superimposeService.SuperimposeDocument(
                            stream,
                            req.DocumentFile.FileName,
                            rollNo,
                            string.IsNullOrWhiteSpace(req.ExamName) ? "UK D.El.Ed. Entrance Exam 2026" : req.ExamName,
                            $"Q.{req.QuestionNo} (Series {req.BookletSeries.Trim().ToUpper()})"
                        );
                    }

                    await System.IO.File.WriteAllBytesAsync(fullPath, stampedBytes);

                    relativeDocPath = $"API/Objections/{safeFileName}";
                }

                var objection = new CandidateObjection
                {
                    UserId = userId,
                    RegistrationNo = user.RegistrationNo,
                    RollNo = rollNo,
                    ExamName = string.IsNullOrWhiteSpace(req.ExamName) ? "UK D.El.Ed. Entrance Examination 2026" : req.ExamName,
                    BookletSeries = requestedSeries,
                    QuestionNo = req.QuestionNo,
                    CandidateAnswer = req.CandidateAnswer.Trim(),
                    Description = req.Description,
                    DocumentPath = relativeDocPath,
                    Status = "Submitted",
                    IsFinalSubmitted = false,
                    CreatedOn = DateTime.UtcNow
                };

                _context.CandidateObjections.Add(objection);
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    message = $"Draft challenge for Question #{req.QuestionNo} saved successfully.",
                    objection
                });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Error saving challenge: {ex.Message}" });
            }
        }

        // ==========================================
        // 5. POST: api/Objection/update/{id} (Edit Draft)
        // ==========================================
        [HttpPost("update/{id}")]
        public async Task<IActionResult> UpdateDraft(int id, [FromForm] UpdateObjectionRequest req)
        {
            try
            {
                int userId = GetUserIdFromToken();

                var timeline = GetObjectionWindowStatus();
                if (!timeline.IsOpen)
                {
                    return BadRequest(new { message = timeline.Message });
                }

                var objection = await _context.CandidateObjections.FirstOrDefaultAsync(o => o.Id == id && o.UserId == userId);
                if (objection == null)
                {
                    return NotFound(new { message = "Objection entry not found." });
                }

                if (objection.IsFinalSubmitted)
                {
                    return BadRequest(new { message = "Objections have already been Final Submitted and locked against edits." });
                }

                if (req.QuestionNo < 1 || req.QuestionNo > 200)
                {
                    return BadRequest(new { message = "प्रश्न संख्या 1 से 200 के बीच होनी चाहिए (Question number must be between 1 and 200)." });
                }

                // Check if changing question number collides with another existing objection
                if (objection.QuestionNo != req.QuestionNo)
                {
                    bool conflict = await _context.CandidateObjections
                        .AnyAsync(o => o.UserId == userId && o.QuestionNo == req.QuestionNo && o.Id != id);
                    if (conflict)
                    {
                        return BadRequest(new { message = $"Question #{req.QuestionNo} has already been challenged in another entry." });
                    }
                }

                // Handle file replacement if a new file is uploaded
                if (req.DocumentFile != null && req.DocumentFile.Length > 0)
                {
                    string fileExtension = Path.GetExtension(req.DocumentFile.FileName).ToLower();
                    string[] allowedExtensions = { ".pdf", ".jpg", ".jpeg", ".png" };
                    if (!allowedExtensions.Contains(fileExtension))
                    {
                        return BadRequest(new { message = "Only PDF and JPG/JPEG/PNG documents are allowed as proof." });
                    }

                    if (req.DocumentFile.Length > 5 * 1024 * 1024)
                    {
                        return BadRequest(new { message = "Proof file exceeds 5 MB limit." });
                    }

                    if (fileExtension == ".pdf")
                    {
                        using (var checkStream = req.DocumentFile.OpenReadStream())
                        {
                            int pdfPages = GetPdfPageCount(checkStream);
                            if (pdfPages > 5)
                            {
                                return BadRequest(new { message = $"साक्ष्य दस्तावेज में पृष्ठों की संख्या 5 से अधिक नहीं होनी चाहिए। आपके द्वारा अपलोड की गई PDF में {pdfPages} पृष्ठ हैं (Uploaded PDF exceeds 5 pages limit. Found {pdfPages} pages)." });
                            }
                        }
                    }

                    var allotment = await _context.Allotments.FirstOrDefaultAsync(a => a.UserId == userId);
                    string rollNo = (allotment != null && allotment.RollNumber > 0)
                        ? allotment.RollNumber.ToString()
                        : objection.RegistrationNo;

                    string safeFileName = $"{rollNo}{fileExtension}";

                    bool alreadyUsedByOther = await _context.CandidateObjections
                        .AnyAsync(o => o.UserId == userId && o.Id != id && !string.IsNullOrEmpty(o.DocumentPath) && o.DocumentPath.EndsWith("/" + safeFileName));

                    if (alreadyUsedByOther)
                    {
                        safeFileName = $"{rollNo}_Q{req.QuestionNo}{fileExtension}";
                    }

                    // Delete old file if present and different from new path
                    if (!string.IsNullOrWhiteSpace(objection.DocumentPath))
                    {
                        try
                        {
                            string oldFileName = Path.GetFileName(objection.DocumentPath);
                            if (!oldFileName.Equals(safeFileName, StringComparison.OrdinalIgnoreCase))
                            {
                                string oldFullPath = Path.Combine(_storagePath, oldFileName);
                                if (System.IO.File.Exists(oldFullPath))
                                {
                                    System.IO.File.Delete(oldFullPath);
                                }
                            }
                        }
                        catch { }
                    }

                    string fullPath = Path.Combine(_storagePath, safeFileName);

                    // Superimpose metadata (Roll Number, Exam Name, Q.No/Series, Date, Page count badge) at save time
                    byte[] stampedBytes;
                    using (var stream = req.DocumentFile.OpenReadStream())
                    {
                        stampedBytes = _superimposeService.SuperimposeDocument(
                            stream,
                            req.DocumentFile.FileName,
                            rollNo,
                            string.IsNullOrWhiteSpace(objection.ExamName) ? "UK D.El.Ed. Entrance Exam 2026" : objection.ExamName,
                            $"Q.{req.QuestionNo} (Series {objection.BookletSeries.Trim().ToUpper()})"
                        );
                    }

                    await System.IO.File.WriteAllBytesAsync(fullPath, stampedBytes);

                    objection.DocumentPath = $"API/Objections/{safeFileName}";
                }

                objection.QuestionNo = req.QuestionNo;
                if (!string.IsNullOrWhiteSpace(req.CandidateAnswer))
                {
                    objection.CandidateAnswer = req.CandidateAnswer.Trim();
                }
                objection.Description = req.Description;

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    message = $"Challenge for Question #{objection.QuestionNo} updated successfully.",
                    objection
                });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Error updating challenge: {ex.Message}" });
            }
        }

        // ==========================================
        // 6. DELETE: api/Objection/delete/{id}
        // ==========================================
        [HttpDelete("delete/{id}")]
        public async Task<IActionResult> DeleteDraft(int id)
        {
            try
            {
                int userId = GetUserIdFromToken();

                var timeline = GetObjectionWindowStatus();
                if (!timeline.IsOpen)
                {
                    return BadRequest(new { message = timeline.Message });
                }

                var objection = await _context.CandidateObjections.FirstOrDefaultAsync(o => o.Id == id && o.UserId == userId);
                if (objection == null)
                {
                    return NotFound(new { message = "Objection entry not found." });
                }

                if (objection.IsFinalSubmitted)
                {
                    return BadRequest(new { message = "Final submitted objections cannot be removed." });
                }

                // Delete associated proof document if exists
                if (!string.IsNullOrWhiteSpace(objection.DocumentPath))
                {
                    try
                    {
                        string fullPath = Path.Combine(_storagePath, Path.GetFileName(objection.DocumentPath));
                        if (System.IO.File.Exists(fullPath))
                        {
                            System.IO.File.Delete(fullPath);
                        }
                    }
                    catch { }
                }

                int questionNo = objection.QuestionNo;
                _context.CandidateObjections.Remove(objection);
                await _context.SaveChangesAsync();

                return Ok(new { message = $"Objection for Question #{questionNo} deleted successfully." });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Error deleting objection: {ex.Message}" });
            }
        }

        // ==========================================
        // 7. POST: api/Objection/final-submit
        // ==========================================
        [HttpPost("final-submit")]
        public async Task<IActionResult> FinalSubmit()
        {
            try
            {
                int userId = GetUserIdFromToken();

                var timeline = GetObjectionWindowStatus();
                if (!timeline.IsOpen)
                {
                    return BadRequest(new { message = timeline.Message });
                }

                var objections = await _context.CandidateObjections
                    .Where(o => o.UserId == userId)
                    .ToListAsync();

                if (!objections.Any())
                {
                    return BadRequest(new { message = "No draft objections found to final submit. Please add at least one question objection before final submission." });
                }

                if (objections.Any(o => o.IsFinalSubmitted))
                {
                    return BadRequest(new { message = "Your objections have already been Final Submitted and locked." });
                }

                var now = DateTime.UtcNow;
                foreach (var item in objections)
                {
                    item.IsFinalSubmitted = true;
                    item.FinalSubmittedOn = now;
                }

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    message = $"Final Submission successful. Total {objections.Count} objection(s) locked permanently.",
                    finalSubmittedOn = now,
                    count = objections.Count
                });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Error finalizing objections: {ex.Message}" });
            }
        }

        // ==========================================
        // 8. DELETE: api/Objection/reset-exam
        // ==========================================
        [HttpDelete("reset-exam")]
        public async Task<IActionResult> ResetExam([FromQuery] string? examName = null)
        {
            try
            {
                int userId = GetUserIdFromToken();

                var objections = await _context.CandidateObjections
                    .Where(o => o.UserId == userId && (string.IsNullOrEmpty(examName) || o.ExamName == examName))
                    .ToListAsync();

                if (!objections.Any())
                {
                    return Ok(new { message = "No draft entries found." });
                }

                if (objections.Any(o => o.IsFinalSubmitted))
                {
                    return BadRequest(new { message = "Final submitted objections cannot be reset." });
                }

                foreach (var item in objections)
                {
                    if (!string.IsNullOrWhiteSpace(item.DocumentPath))
                    {
                        try
                        {
                            string fullPath = Path.Combine(_storagePath, Path.GetFileName(item.DocumentPath));
                            if (System.IO.File.Exists(fullPath)) System.IO.File.Delete(fullPath);
                        }
                        catch { }
                    }
                    _context.CandidateObjections.Remove(item);
                }

                await _context.SaveChangesAsync();

                return Ok(new { message = "Draft objections reset successfully." });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Error resetting: {ex.Message}" });
            }
        }

        // ==========================================
        // 9. GET: api/Objection/document/{id}
        // ==========================================
        [AllowAnonymous]
        [HttpGet("document/{id}")]
        public async Task<IActionResult> GetDocument(int id, [FromQuery] bool download = false)
        {
            try
            {
                int userId = 0;
                var nameClaim = User.Identity?.Name ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!string.IsNullOrEmpty(nameClaim))
                {
                    int.TryParse(nameClaim, out userId);
                }

                var objection = await _context.CandidateObjections.FirstOrDefaultAsync(o => o.Id == id);
                if (objection == null || string.IsNullOrWhiteSpace(objection.DocumentPath))
                {
                    return NotFound(new { message = "Evidence document not found." });
                }

                // If not final submitted and accessed without matching authenticated user
                if (!objection.IsFinalSubmitted && (userId == 0 || objection.UserId != userId))
                {
                    return Unauthorized(new { message = "Invalid candidate authentication credentials." });
                }

                string fileName = Path.GetFileName(objection.DocumentPath);
                string fullPath = Path.Combine(_storagePath, fileName);

                if (!System.IO.File.Exists(fullPath))
                {
                    return NotFound(new { message = "Document file missing on disk." });
                }

                string extension = Path.GetExtension(fileName).ToLower();
                string contentType = extension switch
                {
                    ".pdf" => "application/pdf",
                    ".jpg" or ".jpeg" => "image/jpeg",
                    ".png" => "image/png",
                    _ => "application/octet-stream"
                };

                var fileBytes = await System.IO.File.ReadAllBytesAsync(fullPath);
                if (download)
                {
                    return File(fileBytes, contentType, fileName);
                }
                return File(fileBytes, contentType);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Error accessing document: {ex.Message}" });
            }
        }

        /// <summary>
        /// Reads PDF streams to determine page count for max 5 pages validation
        /// </summary>
        private static int GetPdfPageCount(Stream stream)
        {
            long originalPos = stream.CanSeek ? stream.Position : 0;
            try
            {
                if (stream.CanSeek) stream.Position = 0;
                using var reader = new StreamReader(stream, System.Text.Encoding.Latin1, detectEncodingFromByteOrderMarks: false, bufferSize: 4096, leaveOpen: true);
                string content = reader.ReadToEnd();

                // 1. Check for /Count in /Type /Pages
                var countMatches = System.Text.RegularExpressions.Regex.Matches(
                    content,
                    @"/Type\s*/Pages\b[\s\S]*?/Count\s+(\d+)",
                    System.Text.RegularExpressions.RegexOptions.IgnoreCase
                );

                int maxCount = 0;
                foreach (System.Text.RegularExpressions.Match match in countMatches)
                {
                    if (match.Groups.Count > 1 && int.TryParse(match.Groups[1].Value, out int cnt))
                    {
                        if (cnt > maxCount) maxCount = cnt;
                    }
                }
                if (maxCount > 0) return maxCount;

                // 2. Fallback: match /Type /Page
                var pageMatches = System.Text.RegularExpressions.Regex.Matches(
                    content,
                    @"/Type\s*/Page\b"
                );
                return pageMatches.Count > 0 ? pageMatches.Count : 1;
            }
            catch
            {
                return 1;
            }
            finally
            {
                if (stream.CanSeek) stream.Position = originalPos;
            }
        }

        /// <summary>
        /// Gets Question Booklets & Answer Keys status and links for all series
        /// </summary>
        [HttpGet("booklets")]
        [AllowAnonymous]
        public async Task<IActionResult> GetBooklets([FromQuery] string? examName)
        {
            try
            {
                var seriesList = new[] { "A", "B", "C", "D" };
                var dbRecords = await _context.ExamBookletsAndKeys
                    .Where(b => b.IsActive)
                    .ToListAsync();

                var result = seriesList.Select(s =>
                {
                    var rec = dbRecords.FirstOrDefault(r => string.Equals(r.BookletSeries, s, StringComparison.OrdinalIgnoreCase));
                    string? bookletPath = ResolveBookletOrKeyPath(s, "booklet");
                    string? answerKeyPath = ResolveBookletOrKeyPath(s, "answerkey");

                    bool bookletAvailable = !string.IsNullOrEmpty(bookletPath) && System.IO.File.Exists(bookletPath);
                    bool answerKeyAvailable = !string.IsNullOrEmpty(answerKeyPath) && System.IO.File.Exists(answerKeyPath);

                    return new
                    {
                        series = s,
                        bookletAvailable,
                        bookletFileName = bookletAvailable ? Path.GetFileName(bookletPath) : (rec?.BookletFileName ?? $"Series_{s}.pdf"),
                        answerKeyAvailable,
                        answerKeyFileName = answerKeyAvailable ? Path.GetFileName(answerKeyPath) : (rec?.AnswerKeyFileName ?? $"AnswerKey_{s}.pdf"),
                        bookletViewUrl = $"/api/objection/booklet-file?series={s}&type=booklet&download=false",
                        bookletDownloadUrl = $"/api/objection/booklet-file?series={s}&type=booklet&download=true",
                        answerKeyViewUrl = $"/api/objection/booklet-file?series={s}&type=answerkey&download=false",
                        answerKeyDownloadUrl = $"/api/objection/booklet-file?series={s}&type=answerkey&download=true"
                    };
                }).ToList();

                return Ok(new { success = true, booklets = result });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = $"Error loading booklets: {ex.Message}" });
            }
        }

        /// <summary>
        /// Streams or downloads the Question Booklet or Answer Key for a given series
        /// </summary>
        [HttpGet("booklet-file")]
        [AllowAnonymous]
        public IActionResult GetBookletFile([FromQuery] string series, [FromQuery] string type = "booklet", [FromQuery] bool download = false)
        {
            if (string.IsNullOrWhiteSpace(series))
            {
                return BadRequest(new { message = "Series (A, B, C, D) is required." });
            }

            string cleanSeries = series.Trim().ToUpper();
            bool isKey = string.Equals(type, "answerkey", StringComparison.OrdinalIgnoreCase) ||
                         string.Equals(type, "answer", StringComparison.OrdinalIgnoreCase);

            string? filePath = ResolveBookletOrKeyPath(cleanSeries, isKey ? "answerkey" : "booklet");
            if (string.IsNullOrEmpty(filePath) || !System.IO.File.Exists(filePath))
            {
                string label = isKey ? "उत्तर कुंजी (Answer Key)" : "प्रश्न पुस्तिका (Question Booklet)";
                return NotFound(new { message = $"{label} for Series {cleanSeries} is not available on disk yet." });
            }

            string friendlyName = isKey
                ? $"UKDELED_2026_AnswerKey_Series_{cleanSeries}.pdf"
                : $"UKDELED_2026_QuestionBooklet_Series_{cleanSeries}.pdf";

            var fileBytes = System.IO.File.ReadAllBytes(filePath);

            if (download)
            {
                return File(fileBytes, "application/pdf", friendlyName);
            }
            else
            {
                Response.Headers.Append("Content-Disposition", $"inline; filename=\"{friendlyName}\"");
                return File(fileBytes, "application/pdf");
            }
        }

        /// <summary>
        /// Resolves the physical path of a booklet or answer key PDF from FilePath
        /// </summary>
        private string? ResolveBookletOrKeyPath(string series, string type)
        {
            bool isKey = string.Equals(type, "answerkey", StringComparison.OrdinalIgnoreCase) ||
                         string.Equals(type, "answer", StringComparison.OrdinalIgnoreCase);

            string targetFolder = isKey ? _answerKeyPath : _bookletPath;
            string s = series.Trim().ToUpper();

            if (!Directory.Exists(targetFolder))
            {
                return null;
            }

            string? TryResolveDbPath(string? rawPath, string? rawFileName)
            {
                if (!string.IsNullOrWhiteSpace(rawPath))
                {
                    if (System.IO.File.Exists(rawPath)) return rawPath;

                    string norm = rawPath.Replace('\\', '/');
                    string fileNameFromPath = Path.GetFileName(norm);

                    string p1 = Path.Combine(targetFolder, fileNameFromPath);
                    if (System.IO.File.Exists(p1)) return p1;

                    string? baseFp = _configuration["FilePath"];
                    if (!string.IsNullOrEmpty(baseFp) && norm.StartsWith("API/", StringComparison.OrdinalIgnoreCase))
                    {
                        string rel = norm.Substring(4).TrimStart('/');
                        string p2 = Path.Combine(baseFp, rel.Replace('/', Path.DirectorySeparatorChar));
                        if (System.IO.File.Exists(p2)) return p2;
                    }
                }

                if (!string.IsNullOrWhiteSpace(rawFileName))
                {
                    string p = Path.Combine(targetFolder, rawFileName);
                    if (System.IO.File.Exists(p)) return p;
                }

                return null;
            }

            // 1. Check in dedicated DB tables (QuestionBooklets / AnswerKeys)
            try
            {
                if (isKey)
                {
                    var ak = _context.AnswerKeys.FirstOrDefault(a => a.BookletSeries.ToUpper() == s && a.IsActive);
                    if (ak != null)
                    {
                        string? resolved = TryResolveDbPath(ak.FilePath, ak.FileName);
                        if (!string.IsNullOrEmpty(resolved)) return resolved;
                    }
                }
                else
                {
                    var qb = _context.QuestionBooklets.FirstOrDefault(q => q.BookletSeries.ToUpper() == s && q.IsActive);
                    if (qb != null)
                    {
                        string? resolved = TryResolveDbPath(qb.FilePath, qb.FileName);
                        if (!string.IsNullOrEmpty(resolved)) return resolved;
                    }
                }

                // Check in ExamBookletsAndKeys
                var record = _context.ExamBookletsAndKeys
                    .FirstOrDefault(b => b.BookletSeries.ToUpper() == s && b.IsActive);

                if (record != null)
                {
                    string? dbPath = isKey ? record.AnswerKeyFilePath : record.BookletFilePath;
                    string? dbName = isKey ? record.AnswerKeyFileName : record.BookletFileName;
                    string? resolved = TryResolveDbPath(dbPath, dbName);
                    if (!string.IsNullOrEmpty(resolved)) return resolved;
                }
            }
            catch { }

            // 2. Candidate filenames in targetFolder
            string[] candidateNames = isKey
                ? new[]
                {
                    $"AnswerKey_{s}.pdf",
                    $"AnswerKey {s}.pdf",
                    $"AnswerKey{s}.pdf",
                    $"Answer_{s}.pdf",
                    $"Answer {s}.pdf",
                    $"Key_{s}.pdf",
                    $"UTET_I_Series_{s}.pdf",
                    $"Series_{s}.pdf",
                    $"{s}.pdf"
                }
                : new[]
                {
                    $"Series_{s}.pdf",
                    $"Series {s}.pdf",
                    $"Series{s}.pdf",
                    $"Booklet_{s}.pdf",
                    $"Booklet {s}.pdf",
                    $"{s}.pdf"
                };

            foreach (var name in candidateNames)
            {
                string p = Path.Combine(targetFolder, name);
                if (System.IO.File.Exists(p)) return p;
            }

            // 3. Fallback: match any .pdf file in targetFolder containing series letter
            try
            {
                var allFiles = Directory.GetFiles(targetFolder, "*.pdf");
                var match = allFiles.FirstOrDefault(f =>
                {
                    string fn = Path.GetFileNameWithoutExtension(f).ToUpper();
                    return fn == s || fn.EndsWith($"_{s}") || fn.EndsWith($" {s}") || fn.StartsWith($"{s}_") ||
                           fn.Contains($"SERIES_{s}") || fn.Contains($"SERIES {s}") || fn.Contains($"SERIES{s}") ||
                           fn.Contains($"KEY_{s}") || fn.Contains($"BOOKLET_{s}");
                });
                if (match != null) return match;
            }
            catch { }

            return null;
        }
    }
}
