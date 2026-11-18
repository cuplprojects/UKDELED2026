using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using DELED.Data;
using DELED.DTOs;
using DELED.Models;

namespace DELED.Controllers
{
    [Route("api/[controller]")]
    [Route("[controller]")]
    [ApiController]
    [Authorize]
    public class AdminObjectionController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly string _storagePath;
        private readonly string _bookletPath;
        private readonly string _answerKeyPath;
        private static bool _tableInitialized = false;
        private static readonly object _initLock = new object();

        public AdminObjectionController(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;

            string? configuredPath = _configuration["ObjectionFilePath"] ?? _configuration["FilePath"];
            if (string.IsNullOrWhiteSpace(configuredPath) || !Directory.Exists(configuredPath))
            {
                configuredPath = Path.Combine(Directory.GetCurrentDirectory(), "Uploads", "Objections");
            }
            else
            {
                configuredPath = Path.Combine(configuredPath, "Objections");
            }

            _storagePath = configuredPath;

            string? bPath = _configuration["BookletFilePath"];
            if (string.IsNullOrWhiteSpace(bPath))
            {
                string baseFp = _configuration["FilePath"] ?? Directory.GetCurrentDirectory();
                bPath = Path.Combine(baseFp, "booklet");
            }
            _bookletPath = bPath;

            string? aPath = _configuration["AnswerKeyFilePath"];
            if (string.IsNullOrWhiteSpace(aPath))
            {
                string baseFp = _configuration["FilePath"] ?? Directory.GetCurrentDirectory();
                aPath = Path.Combine(baseFp, "Answer");
            }
            _answerKeyPath = aPath;

            try
            {
                if (!Directory.Exists(_storagePath)) Directory.CreateDirectory(_storagePath);
                if (!Directory.Exists(_bookletPath)) Directory.CreateDirectory(_bookletPath);
                if (!Directory.Exists(_answerKeyPath)) Directory.CreateDirectory(_answerKeyPath);
            }
            catch { }

            EnsureTableCreated();
        }

        private void EnsureTableCreated()
        {
            if (_tableInitialized) return;

            lock (_initLock)
            {
                if (_tableInitialized) return;

                try
                {
                    string createTableSql = @"
                        CREATE TABLE IF NOT EXISTS CandidateObjections (
                            Id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                            UserId INT NOT NULL,
                            RegistrationNo VARCHAR(100) NOT NULL,
                            RollNo VARCHAR(50) NULL,
                            ExamName VARCHAR(150) NOT NULL DEFAULT 'UK D.El.Ed. Entrance Examination 2026',
                            BookletSeries VARCHAR(10) NOT NULL,
                            QuestionNo INT NOT NULL,
                            CandidateAnswer VARCHAR(150) NOT NULL,
                            Description TEXT NULL,
                            DocumentPath VARCHAR(500) NULL,
                            Status VARCHAR(50) NOT NULL DEFAULT 'Submitted',
                            AdminRemarks TEXT NULL,
                            ReviewedOn DATETIME NULL,
                            ReviewedBy VARCHAR(150) NULL,
                            IsFinalSubmitted TINYINT(1) NOT NULL DEFAULT 0,
                            FinalSubmittedOn DATETIME NULL,
                            CreatedOn DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            INDEX idx_cand_obj_user (UserId),
                            INDEX idx_cand_obj_reg (RegistrationNo),
                            INDEX idx_cand_obj_roll (RollNo),
                            INDEX idx_cand_obj_qno (QuestionNo),
                            INDEX idx_cand_obj_status (Status),
                            INDEX idx_cand_obj_series (BookletSeries),
                            INDEX idx_cand_obj_final (IsFinalSubmitted)
                        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

                        CREATE TABLE IF NOT EXISTS ExamBookletsAndKeys (
                            Id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                            ExamName VARCHAR(150) NOT NULL DEFAULT 'UK D.El.Ed. Entrance Examination 2026',
                            BookletSeries VARCHAR(10) NOT NULL,
                            BookletFileName VARCHAR(255) NULL,
                            BookletFilePath VARCHAR(500) NULL,
                            AnswerKeyFileName VARCHAR(255) NULL,
                            AnswerKeyFilePath VARCHAR(500) NULL,
                            IsActive TINYINT(1) NOT NULL DEFAULT 1,
                            CreatedOn DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            UpdatedOn DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
                            UNIQUE KEY uk_exam_series (ExamName, BookletSeries),
                            INDEX idx_ebk_series (BookletSeries),
                            INDEX idx_ebk_active (IsActive)
                        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

                        CREATE TABLE IF NOT EXISTS QuestionBooklets (
                            Id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                            ExamName VARCHAR(150) NOT NULL DEFAULT 'UK D.El.Ed. Entrance Examination 2026',
                            BookletSeries VARCHAR(10) NOT NULL,
                            FileName VARCHAR(255) NULL,
                            FilePath VARCHAR(500) NULL,
                            FileSize BIGINT NULL,
                            TotalPages INT NULL,
                            IsActive TINYINT(1) NOT NULL DEFAULT 1,
                            UploadedBy VARCHAR(100) NULL,
                            CreatedOn DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            UpdatedOn DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
                            UNIQUE KEY uk_qb_exam_series (ExamName, BookletSeries),
                            INDEX idx_qb_series (BookletSeries),
                            INDEX idx_qb_active (IsActive)
                        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

                        CREATE TABLE IF NOT EXISTS AnswerKeys (
                            Id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                            ExamName VARCHAR(150) NOT NULL DEFAULT 'UK D.El.Ed. Entrance Examination 2026',
                            BookletSeries VARCHAR(10) NOT NULL,
                            FileName VARCHAR(255) NULL,
                            FilePath VARCHAR(500) NULL,
                            FileSize BIGINT NULL,
                            TotalPages INT NULL,
                            IsActive TINYINT(1) NOT NULL DEFAULT 1,
                            UploadedBy VARCHAR(100) NULL,
                            CreatedOn DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            UpdatedOn DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
                            UNIQUE KEY uk_ak_exam_series (ExamName, BookletSeries),
                            INDEX idx_ak_series (BookletSeries),
                            INDEX idx_ak_active (IsActive)
                        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

                    _context.Database.ExecuteSqlRaw(createTableSql);

                    string seedSql = @"
                        INSERT IGNORE INTO ExamBookletsAndKeys (ExamName, BookletSeries, BookletFileName, BookletFilePath, AnswerKeyFileName, AnswerKeyFilePath, IsActive)
                        VALUES 
                        ('UK D.El.Ed. Entrance Examination 2026', 'A', 'Series_A.pdf', 'API/booklet/Series_A.pdf', 'AnswerKey_A.pdf', 'API/Answer/AnswerKey_A.pdf', 1),
                        ('UK D.El.Ed. Entrance Examination 2026', 'B', 'Series_B.pdf', 'API/booklet/Series_B.pdf', 'AnswerKey_B.pdf', 'API/Answer/AnswerKey_B.pdf', 1),
                        ('UK D.El.Ed. Entrance Examination 2026', 'C', 'Series_C.pdf', 'API/booklet/Series_C.pdf', 'AnswerKey_C.pdf', 'API/Answer/AnswerKey_C.pdf', 1),
                        ('UK D.El.Ed. Entrance Examination 2026', 'D', 'Series_D.pdf', 'API/booklet/Series_D.pdf', 'AnswerKey_D.pdf', 'API/Answer/AnswerKey_D.pdf', 1);

                        INSERT IGNORE INTO QuestionBooklets (ExamName, BookletSeries, FileName, FilePath, IsActive)
                        VALUES 
                        ('UK D.El.Ed. Entrance Examination 2026', 'A', 'Series_A.pdf', 'API/booklet/Series_A.pdf', 1),
                        ('UK D.El.Ed. Entrance Examination 2026', 'B', 'Series_B.pdf', 'API/booklet/Series_B.pdf', 1),
                        ('UK D.El.Ed. Entrance Examination 2026', 'C', 'Series_C.pdf', 'API/booklet/Series_C.pdf', 1),
                        ('UK D.El.Ed. Entrance Examination 2026', 'D', 'Series_D.pdf', 'API/booklet/Series_D.pdf', 1);

                        INSERT IGNORE INTO AnswerKeys (ExamName, BookletSeries, FileName, FilePath, IsActive)
                        VALUES 
                        ('UK D.El.Ed. Entrance Examination 2026', 'A', 'AnswerKey_A.pdf', 'API/Answer/AnswerKey_A.pdf', 1),
                        ('UK D.El.Ed. Entrance Examination 2026', 'B', 'AnswerKey_B.pdf', 'API/Answer/AnswerKey_B.pdf', 1),
                        ('UK D.El.Ed. Entrance Examination 2026', 'C', 'AnswerKey_C.pdf', 'API/Answer/AnswerKey_C.pdf', 1),
                        ('UK D.El.Ed. Entrance Examination 2026', 'D', 'AnswerKey_D.pdf', 'API/Answer/AnswerKey_D.pdf', 1);";
                    _context.Database.ExecuteSqlRaw(seedSql);
                    _tableInitialized = true;
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[AdminObjectionController] Table verification notice: {ex.Message}");
                    _tableInitialized = true;
                }
            }
        }

        private string GetAdminUsername()
        {
            return User.Identity?.Name ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "Admin";
        }

        // ==========================================
        // 1. GET: api/AdminObjection
        // List, Search, Filter, Pagination & KPIs
        // ==========================================
        [HttpGet]
        public async Task<IActionResult> GetObjections(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] string? search = null,
            [FromQuery] string? examName = null,
            [FromQuery] string? bookletSeries = null,
            [FromQuery] string? section = null,
            [FromQuery] string? status = null,
            [FromQuery] int? questionNo = null,
            [FromQuery] bool? isFinalSubmitted = null)
        {
            try
            {
                if (page < 1) page = 1;
                if (pageSize < 1) pageSize = 20;
                if (pageSize > 100) pageSize = 100;

                var query = _context.CandidateObjections.AsQueryable();

                // Compute Global KPI Summary
                var allObjections = await _context.CandidateObjections.Select(o => new {
                    o.Id,
                    o.UserId,
                    o.QuestionNo,
                    o.Status,
                    o.IsFinalSubmitted
                }).ToListAsync();

                var kpi = new
                {
                    totalObjections = allObjections.Count,
                    uniqueCandidates = allObjections.Select(o => o.UserId).Distinct().Count(),
                    distinctQuestions = allObjections.Select(o => o.QuestionNo).Distinct().Count(),
                    finalSubmittedCount = allObjections.Count(o => o.IsFinalSubmitted),
                    draftCount = allObjections.Count(o => !o.IsFinalSubmitted),
                    underReviewCount = allObjections.Count(o => o.Status == "Under Review"),
                    acceptedCount = allObjections.Count(o => o.Status == "Accepted"),
                    rejectedCount = allObjections.Count(o => o.Status == "Rejected"),
                    submittedCount = allObjections.Count(o => o.Status == "Submitted")
                };

                // Apply Filters
                if (!string.IsNullOrWhiteSpace(examName))
                {
                    query = query.Where(o => o.ExamName == examName);
                }

                if (!string.IsNullOrWhiteSpace(bookletSeries))
                {
                    query = query.Where(o => o.BookletSeries == bookletSeries);
                }

                if (!string.IsNullOrWhiteSpace(status) && status.ToLower() != "all")
                {
                    query = query.Where(o => o.Status == status);
                }

                if (questionNo.HasValue && questionNo.Value > 0)
                {
                    query = query.Where(o => o.QuestionNo == questionNo.Value);
                }

                if (isFinalSubmitted.HasValue)
                {
                    query = query.Where(o => o.IsFinalSubmitted == isFinalSubmitted.Value);
                }

                // Apply Search Filter (Candidate Name, Reg No, Roll No)
                if (!string.IsNullOrWhiteSpace(search))
                {
                    search = search.Trim();

                    // Find matching user IDs
                    var matchedUserIds = await _context.Users
                        .Where(u => u.RegistrationNo.Contains(search) ||
                                    u.FullName.Contains(search) ||
                                    u.PhoneNumber.Contains(search) ||
                                    (u.FatherName != null && u.FatherName.Contains(search)))
                        .Select(u => u.UserId)
                        .ToListAsync();

                    // Find matching roll numbers
                    if (int.TryParse(search, out int rollSearch))
                    {
                        var rollUserIds = await _context.Allotments
                            .Where(a => a.RollNumber == rollSearch)
                            .Select(a => a.UserId)
                            .ToListAsync();
                        matchedUserIds = matchedUserIds.Union(rollUserIds).ToList();
                    }

                    query = query.Where(o => o.RegistrationNo.Contains(search) || matchedUserIds.Contains(o.UserId));
                }

                int totalCount = await query.CountAsync();
                int totalPages = (int)Math.Ceiling((double)totalCount / pageSize);

                var items = await query
                    .OrderByDescending(o => o.CreatedOn)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .ToListAsync();

                // Enrich with candidate profile info
                var userIds = items.Select(i => i.UserId).Distinct().ToList();
                var users = await _context.Users
                    .Where(u => userIds.Contains(u.UserId))
                    .ToDictionaryAsync(u => u.UserId, u => new { u.FullName, u.PhoneNumber, u.Email, u.FatherName });

                var allotments = await _context.Allotments
                    .Where(a => userIds.Contains(a.UserId))
                    .ToDictionaryAsync(a => a.UserId, a => a.RollNumber);

                var personalDetails = await _context.UserPersonalDetails
                    .Where(p => userIds.Contains(p.UserId))
                    .ToDictionaryAsync(p => p.UserId, p => new { p.AppliedCategory, p.Category });

                var enrichedList = items.Select(i =>
                {
                    users.TryGetValue(i.UserId, out var usr);
                    allotments.TryGetValue(i.UserId, out var roll);
                    personalDetails.TryGetValue(i.UserId, out var pers);

                    return new
                    {
                        i.Id,
                        i.UserId,
                        i.RegistrationNo,
                        CandidateName = usr?.FullName ?? "",
                        FatherName = usr?.FatherName ?? "",
                        PhoneNumber = usr?.PhoneNumber ?? "",
                        Email = usr?.Email ?? "",
                        RollNo = !string.IsNullOrEmpty(i.RollNo) ? i.RollNo : (roll != 0 ? roll.ToString() : ""),
                        AppliedCategory = pers?.AppliedCategory ?? "",
                        Category = pers?.Category ?? "",
                        i.ExamName,
                        i.BookletSeries,
                        i.QuestionNo,
                        i.CandidateAnswer,
                        i.Description,
                        i.DocumentPath,
                        i.Status,
                        i.AdminRemarks,
                        i.ReviewedOn,
                        i.ReviewedBy,
                        i.IsFinalSubmitted,
                        i.FinalSubmittedOn,
                        i.CreatedOn
                    };
                }).ToList();

                return Ok(new
                {
                    items = enrichedList,
                    totalCount,
                    page,
                    pageSize,
                    totalPages,
                    kpi
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Error retrieving objections: {ex.Message}" });
            }
        }

        // ==========================================
        // 2. GET: api/AdminObjection/{id}
        // Single Objection Detail
        // ==========================================
        [HttpGet("{id}")]
        public async Task<IActionResult> GetObjectionDetail(int id)
        {
            try
            {
                var objection = await _context.CandidateObjections.FirstOrDefaultAsync(o => o.Id == id);
                if (objection == null)
                {
                    return NotFound(new { message = "Objection not found." });
                }

                var user = await _context.Users.FirstOrDefaultAsync(u => u.UserId == objection.UserId);
                var allotment = await _context.Allotments.FirstOrDefaultAsync(a => a.UserId == objection.UserId);
                var personal = await _context.UserPersonalDetails.FirstOrDefaultAsync(p => p.UserId == objection.UserId);

                var detail = new
                {
                    objection.Id,
                    objection.UserId,
                    objection.RegistrationNo,
                    CandidateName = user?.FullName ?? "",
                    FatherName = user?.FatherName ?? "",
                    PhoneNumber = user?.PhoneNumber ?? "",
                    Email = user?.Email ?? "",
                    RollNo = !string.IsNullOrEmpty(objection.RollNo) ? objection.RollNo : (allotment != null ? allotment.RollNumber.ToString() : ""),
                    AppliedCategory = personal?.AppliedCategory ?? "",
                    Category = personal?.Category ?? "",
                    objection.ExamName,
                    objection.BookletSeries,
                    objection.QuestionNo,
                    objection.CandidateAnswer,
                    objection.Description,
                    objection.DocumentPath,
                    objection.Status,
                    objection.AdminRemarks,
                    objection.ReviewedOn,
                    objection.ReviewedBy,
                    objection.IsFinalSubmitted,
                    objection.FinalSubmittedOn,
                    objection.CreatedOn
                };

                return Ok(detail);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Error retrieving detail: {ex.Message}" });
            }
        }

        // ==========================================
        // 3. POST/PUT: api/AdminObjection/{id}/status
        // Update Status & Remarks for Single Objection
        // ==========================================
        [HttpPost("{id}/status")]
        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateObjectionStatusRequest req)
        {
            try
            {
                var objection = await _context.CandidateObjections.FirstOrDefaultAsync(o => o.Id == id);
                if (objection == null)
                {
                    return NotFound(new { message = "Objection not found." });
                }

                string[] validStatuses = { "Submitted", "Under Review", "Accepted", "Rejected" };
                if (string.IsNullOrWhiteSpace(req.Status) || !validStatuses.Contains(req.Status))
                {
                    return BadRequest(new { message = "Invalid status. Allowed values: Submitted, Under Review, Accepted, Rejected." });
                }

                objection.Status = req.Status;
                objection.AdminRemarks = req.Remarks;
                objection.ReviewedOn = DateTime.UtcNow;
                objection.ReviewedBy = GetAdminUsername();

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    message = $"Status updated to '{objection.Status}' successfully.",
                    objection.Id,
                    objection.Status,
                    objection.AdminRemarks,
                    objection.ReviewedOn,
                    objection.ReviewedBy
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Error updating status: {ex.Message}" });
            }
        }

        // ==========================================
        // 4. POST: api/AdminObjection/bulk-status
        // Bulk Update Status & Remarks
        // ==========================================
        [HttpPost("bulk-status")]
        public async Task<IActionResult> BulkUpdateStatus([FromBody] BulkStatusRequest req)
        {
            try
            {
                if (req.Ids == null || !req.Ids.Any())
                {
                    return BadRequest(new { message = "No objection IDs provided." });
                }

                string[] validStatuses = { "Submitted", "Under Review", "Accepted", "Rejected" };
                if (string.IsNullOrWhiteSpace(req.Status) || !validStatuses.Contains(req.Status))
                {
                    return BadRequest(new { message = "Invalid status. Allowed values: Submitted, Under Review, Accepted, Rejected." });
                }

                var list = await _context.CandidateObjections
                    .Where(o => req.Ids.Contains(o.Id))
                    .ToListAsync();

                if (!list.Any())
                {
                    return NotFound(new { message = "None of the specified objections were found." });
                }

                string adminUser = GetAdminUsername();
                var now = DateTime.UtcNow;

                foreach (var item in list)
                {
                    item.Status = req.Status;
                    if (!string.IsNullOrWhiteSpace(req.Remarks))
                    {
                        item.AdminRemarks = req.Remarks;
                    }
                    item.ReviewedOn = now;
                    item.ReviewedBy = adminUser;
                }

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    message = $"Successfully updated {list.Count} objection(s) to status '{req.Status}'.",
                    updatedCount = list.Count
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Error performing bulk update: {ex.Message}" });
            }
        }

        // ==========================================
        // 5. GET: api/AdminObjection/count-summary
        // Grouped Question-wise Summary for Committees
        // ==========================================
        [HttpGet("count-summary")]
        public async Task<IActionResult> GetCountSummary(
            [FromQuery] string? examName = null,
            [FromQuery] string? bookletSeries = null,
            [FromQuery] string? section = null)
        {
            try
            {
                var query = _context.CandidateObjections.AsQueryable();

                if (!string.IsNullOrWhiteSpace(examName))
                    query = query.Where(o => o.ExamName == examName);
                if (!string.IsNullOrWhiteSpace(bookletSeries))
                    query = query.Where(o => o.BookletSeries == bookletSeries);

                var rawList = await query.Select(o => new {
                    o.ExamName,
                    o.BookletSeries,
                    o.QuestionNo,
                    o.CandidateAnswer,
                    o.Status,
                    o.UserId
                }).ToListAsync();

                var grouped = rawList
                    .GroupBy(o => new { o.ExamName, o.BookletSeries, o.QuestionNo })
                    .Select(g => new
                    {
                        ExamName = g.Key.ExamName,
                        BookletSeries = g.Key.BookletSeries,
                        QuestionNo = g.Key.QuestionNo,
                        TotalChallenges = g.Count(),
                        UniqueCandidates = g.Select(x => x.UserId).Distinct().Count(),
                        AcceptedCount = g.Count(x => x.Status == "Accepted"),
                        RejectedCount = g.Count(x => x.Status == "Rejected"),
                        UnderReviewCount = g.Count(x => x.Status == "Under Review"),
                        SubmittedCount = g.Count(x => x.Status == "Submitted"),
                        ClaimedOptions = g.GroupBy(x => x.CandidateAnswer)
                                          .Select(cg => new { Option = cg.Key, Count = cg.Count() })
                                          .OrderByDescending(cg => cg.Count)
                                          .ToList()
                    })
                    .OrderBy(g => g.BookletSeries)
                    .ThenBy(g => g.QuestionNo)
                    .ToList();

                return Ok(grouped);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Error generating summary: {ex.Message}" });
            }
        }

        // ==========================================
        // 6. GET: api/AdminObjection/export (CSV)
        // ==========================================
        [HttpGet("export")]
        public async Task<IActionResult> ExportCsv(
            [FromQuery] string? search = null,
            [FromQuery] string? examName = null,
            [FromQuery] string? bookletSeries = null,
            [FromQuery] string? section = null,
            [FromQuery] string? status = null,
            [FromQuery] int? questionNo = null)
        {
            try
            {
                var query = _context.CandidateObjections.AsQueryable();

                if (!string.IsNullOrWhiteSpace(examName))
                    query = query.Where(o => o.ExamName == examName);
                if (!string.IsNullOrWhiteSpace(bookletSeries))
                    query = query.Where(o => o.BookletSeries == bookletSeries);
                if (!string.IsNullOrWhiteSpace(status) && status.ToLower() != "all")
                    query = query.Where(o => o.Status == status);
                if (questionNo.HasValue && questionNo.Value > 0)
                    query = query.Where(o => o.QuestionNo == questionNo.Value);

                var items = await query.OrderBy(o => o.BookletSeries).ThenBy(o => o.QuestionNo).ToListAsync();

                var userIds = items.Select(i => i.UserId).Distinct().ToList();
                var users = await _context.Users
                    .Where(u => userIds.Contains(u.UserId))
                    .ToDictionaryAsync(u => u.UserId, u => new { u.FullName, u.PhoneNumber, u.Email, u.FatherName });

                var allotments = await _context.Allotments
                    .Where(a => userIds.Contains(a.UserId))
                    .ToDictionaryAsync(a => a.UserId, a => a.RollNumber);

                var sb = new StringBuilder();
                // Add UTF-8 BOM so Excel opens Hindi characters properly
                sb.Append('\uFEFF');

                sb.AppendLine("ID,Registration No,Roll No,Candidate Name,Father Name,Phone,Email,Exam Name,Booklet Series,Question No,Claimed Answer,Status,Final Submitted,Has Proof,Admin Remarks,Reviewed By,Reviewed On,Created On");

                foreach (var i in items)
                {
                    users.TryGetValue(i.UserId, out var usr);
                    allotments.TryGetValue(i.UserId, out var roll);

                    string name = usr?.FullName?.Replace("\"", "\"\"") ?? "";
                    string father = usr?.FatherName?.Replace("\"", "\"\"") ?? "";
                    string remarks = i.AdminRemarks?.Replace("\"", "\"\"").Replace("\r", " ").Replace("\n", " ") ?? "";
                    string hasProof = !string.IsNullOrWhiteSpace(i.DocumentPath) ? "Yes" : "No";
                    string rollDisplay = !string.IsNullOrEmpty(i.RollNo) ? i.RollNo : (roll != 0 ? roll.ToString() : "");

                    sb.AppendLine($"\"{i.Id}\",\"{i.RegistrationNo}\",\"{rollDisplay}\",\"{name}\",\"{father}\",\"{usr?.PhoneNumber}\",\"{usr?.Email}\",\"{i.ExamName}\",\"{i.BookletSeries}\",\"{i.QuestionNo}\",\"{i.CandidateAnswer}\",\"{i.Status}\",\"{i.IsFinalSubmitted}\",\"{hasProof}\",\"{remarks}\",\"{i.ReviewedBy}\",\"{i.ReviewedOn:yyyy-MM-dd HH:mm}\",\"{i.CreatedOn:yyyy-MM-dd HH:mm}\"");
                }

                byte[] bytes = Encoding.UTF8.GetBytes(sb.ToString());
                string fileName = $"UKDELED_Objections_{DateTime.UtcNow:yyyyMMdd_HHmmss}.csv";

                return File(bytes, "text/csv; charset=utf-8", fileName);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Error exporting CSV: {ex.Message}" });
            }
        }

        // ==========================================
        // 7. GET: api/AdminObjection/document/{id}
        // Stream Proof Document for Admin Modal
        // ==========================================
        [HttpGet("document/{id}")]
        public async Task<IActionResult> GetDocument(int id)
        {
            try
            {
                var objection = await _context.CandidateObjections.FirstOrDefaultAsync(o => o.Id == id);
                if (objection == null || string.IsNullOrWhiteSpace(objection.DocumentPath))
                {
                    return NotFound(new { message = "Evidence document not found." });
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
                return File(fileBytes, contentType, fileName);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Error accessing document: {ex.Message}" });
            }
        }

        // ==========================================
        // 8. GET: api/AdminObjection/booklets
        // Get all series booklets & answer keys
        // ==========================================
        [HttpGet("booklets")]
        public async Task<IActionResult> GetBooklets()
        {
            try
            {
                var seriesList = new[] { "A", "B", "C", "D" };
                var dbRecords = await _context.ExamBookletsAndKeys.ToListAsync();

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
                        bookletFilePath = bookletPath ?? rec?.BookletFilePath,
                        answerKeyAvailable,
                        answerKeyFileName = answerKeyAvailable ? Path.GetFileName(answerKeyPath) : (rec?.AnswerKeyFileName ?? $"AnswerKey_{s}.pdf"),
                        answerKeyFilePath = answerKeyPath ?? rec?.AnswerKeyFilePath,
                        isActive = rec?.IsActive ?? true
                    };
                }).ToList();

                return Ok(new { success = true, booklets = result });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = $"Error loading booklets: {ex.Message}" });
            }
        }

        // ==========================================
        // 9. GET: api/AdminObjection/booklet-file
        // Stream or download booklet/answer key
        // ==========================================
        [HttpGet("booklet-file")]
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
                string label = isKey ? "Answer Key" : "Question Booklet";
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

        private string? ResolveBookletOrKeyPath(string series, string type)
        {
            bool isKey = string.Equals(type, "answerkey", StringComparison.OrdinalIgnoreCase) ||
                         string.Equals(type, "answer", StringComparison.OrdinalIgnoreCase);

            string targetFolder = isKey ? _answerKeyPath : _bookletPath;
            string s = series.Trim().ToUpper();

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

                var record = _context.ExamBookletsAndKeys
                    .FirstOrDefault(b => b.BookletSeries.ToUpper() == s);

                if (record != null)
                {
                    string? dbPath = isKey ? record.AnswerKeyFilePath : record.BookletFilePath;
                    string? dbName = isKey ? record.AnswerKeyFileName : record.BookletFileName;
                    string? resolved = TryResolveDbPath(dbPath, dbName);
                    if (!string.IsNullOrEmpty(resolved)) return resolved;
                }
            }
            catch { }

            if (!Directory.Exists(targetFolder))
            {
                return null;
            }

            string[] candidateNames = new[]
            {
                $"{s}.pdf",
                $"Series_{s}.pdf",
                $"Series {s}.pdf",
                $"Series{s}.pdf",
                $"Booklet_{s}.pdf",
                $"Booklet {s}.pdf",
                $"Booklet{s}.pdf",
                $"AnswerKey_{s}.pdf",
                $"AnswerKey {s}.pdf",
                $"AnswerKey{s}.pdf",
                $"Answer_{s}.pdf",
                $"Answer {s}.pdf",
                $"Answer{s}.pdf",
                $"Key_{s}.pdf",
                $"Key {s}.pdf"
            };

            foreach (var name in candidateNames)
            {
                string p = Path.Combine(targetFolder, name);
                if (System.IO.File.Exists(p)) return p;
            }

            try
            {
                var allFiles = Directory.GetFiles(targetFolder, "*.pdf");
                var match = allFiles.FirstOrDefault(f =>
                {
                    string fn = Path.GetFileNameWithoutExtension(f).ToUpper();
                    return fn == s || fn.EndsWith($"_{s}") || fn.EndsWith($" {s}") || fn.StartsWith($"{s}_") ||
                           fn.Contains($"SERIES_{s}") || fn.Contains($"SERIES {s}") || fn.Contains($"SERIES{s}") ||
                           fn.Contains($"KEY_{s}") || fn.Contains($"KEY {s}");
                });
                if (match != null) return match;
            }
            catch { }

            return null;
        }
    }
}
