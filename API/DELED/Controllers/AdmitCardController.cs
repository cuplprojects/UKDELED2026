using System;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using DELED.Data;
using DELED.Models;
using DELED.Services;

namespace DELED.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [AllowAnonymous]
    public class AdmitCardController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly ISecurityService _securityService;
        private readonly string _baseStoragePath;

        public AdmitCardController(AppDbContext context, IConfiguration configuration, ISecurityService securityService)
        {
            _context = context;
            _configuration = configuration;
            _securityService = securityService;

            string? configuredPath = _configuration["AdmitCardFilePath"] ?? _configuration["FilePath"];
            if (string.IsNullOrWhiteSpace(configuredPath))
            {
                configuredPath = @"Z:\UKDELED2026\Admit Card";
            }
            _baseStoragePath = configuredPath;
        }

        // ==========================================
        // Helper: Check Admit Card Window Status
        // ==========================================
        private (bool IsOpen, string Message, DateTime? StartDate, DateTime? EndDate) GetAdmitCardWindowStatus()
        {
            try
            {
                var now = DateTime.UtcNow.AddHours(5).AddMinutes(30);

                // 1. Check RegistrationTimelines DB table
                var timelines = _context.RegistrationTimelines
                    .Where(t => t.Key.ToLower().StartsWith("admit") || (t.Label != null && t.Label.ToUpper().Contains("ADMIT")))
                    .ToList();

                var startTimeline = timelines.FirstOrDefault(t =>
                    t.Key.ToLower() == "admit_starts" ||
                    t.Key.ToLower() == "admit_start" ||
                    t.Key.ToLower() == "admit_card_starts" ||
                    (t.Key.ToLower() == "starts" && t.Label != null && t.Label.ToUpper().Contains("ADMIT")) ||
                    (t.Label != null && (t.Label.ToUpper().Contains("START") || t.Label.ToUpper().Contains("OPEN") || t.Label.ToUpper().Contains("प्रारंभ"))));

                var closeTimeline = timelines.FirstOrDefault(t =>
                    t.Key.ToLower() == "admit_closes" ||
                    t.Key.ToLower() == "admit_close" ||
                    t.Key.ToLower() == "admit_card_closes" ||
                    (t.Key.ToLower() == "closes" && t.Label != null && t.Label.ToUpper().Contains("ADMIT")) ||
                    (t.Label != null && (t.Label.ToUpper().Contains("CLOSE") || t.Label.ToUpper().Contains("END") || t.Label.ToUpper().Contains("LAST") || t.Label.ToUpper().Contains("समाप्त"))));

                // Fallback if 2 entries exist without clear start/close flags
                if (startTimeline == null && closeTimeline == null && timelines.Count >= 2)
                {
                    startTimeline = timelines[0];
                    closeTimeline = timelines[1];
                }

                DateTime? ParseTimelineDate(string? dateVal, string? subLabel, bool isEndOfDayDefault)
                {
                    if (string.IsNullOrWhiteSpace(dateVal)) return null;

                    string defaultTime = isEndOfDayDefault ? "23:59:59" : "00:00:00";
                    string timeStr = defaultTime;

                    if (!string.IsNullOrWhiteSpace(subLabel))
                    {
                        var match = Regex.Match(subLabel, @"(\d{1,2}:\d{2}\s*(?:AM|PM)?)", RegexOptions.IgnoreCase);
                        if (match.Success) timeStr = match.Groups[1].Value;
                    }

                    string combined = $"{dateVal.Trim()} {timeStr.Trim()}";
                    if (DateTime.TryParse(combined, CultureInfo.InvariantCulture, DateTimeStyles.None, out var dt)) return dt;
                    if (DateTime.TryParse(dateVal.Trim(), CultureInfo.InvariantCulture, DateTimeStyles.None, out dt))
                    {
                        return isEndOfDayDefault ? dt.Date.AddHours(23).AddMinutes(59).AddSeconds(59) : dt.Date;
                    }

                    string[] formats = new[]
                    {
                        "yyyy-MM-dd", "dd MMMM yyyy", "d MMMM yyyy", "dd-MM-yyyy", "dd/MM/yyyy",
                        "yyyy/MM/dd", "MM/dd/yyyy", "MMMM dd, yyyy", "dd MMM yyyy", "d MMM yyyy"
                    };

                    foreach (var fmt in formats)
                    {
                        if (DateTime.TryParseExact(dateVal.Trim(), fmt, CultureInfo.InvariantCulture, DateTimeStyles.None, out var exactDt))
                        {
                            return isEndOfDayDefault ? exactDt.Date.AddHours(23).AddMinutes(59).AddSeconds(59) : exactDt.Date;
                        }
                    }

                    return null;
                }

                DateTime? parsedStart = startTimeline != null ? ParseTimelineDate(startTimeline.DateValue, startTimeline.SubLabel, false) : null;
                DateTime? parsedEnd = closeTimeline != null ? ParseTimelineDate(closeTimeline.DateValue, closeTimeline.SubLabel, true) : null;

                // 2. Configuration Fallback
                if (!parsedStart.HasValue)
                {
                    string? cfgStart = _configuration["AdmitCardStartDate"] ?? _configuration["AdmitCard:StartDate"];
                    if (!string.IsNullOrWhiteSpace(cfgStart) && DateTime.TryParse(cfgStart, CultureInfo.InvariantCulture, DateTimeStyles.None, out var cs))
                    {
                        parsedStart = cs;
                    }
                }

                if (!parsedEnd.HasValue)
                {
                    string? cfgEnd = _configuration["AdmitCardCloseDate"] ?? _configuration["AdmitCard:CloseDate"] ?? _configuration["AdmitCard:EndDate"];
                    if (!string.IsNullOrWhiteSpace(cfgEnd) && DateTime.TryParse(cfgEnd, CultureInfo.InvariantCulture, DateTimeStyles.None, out var ce))
                    {
                        parsedEnd = ce;
                    }
                }

                if (!parsedStart.HasValue && !parsedEnd.HasValue)
                {
                    return (true, "Admit Card downloading is active.", null, null);
                }

                if (parsedStart.HasValue && now < parsedStart.Value)
                {
                    string startFormatted = parsedStart.Value.ToString("dd MMMM yyyy, hh:mm tt");
                    return (false, $"Admit Card download is scheduled to start on {startFormatted}.", parsedStart, parsedEnd);
                }

                if (parsedEnd.HasValue && now > parsedEnd.Value)
                {
                    string endFormatted = parsedEnd.Value.ToString("dd MMMM yyyy, hh:mm tt");
                    return (false, $"Admit Card download window closed on {endFormatted}.", parsedStart, parsedEnd);
                }

                return (true, "Admit Card download is currently open.", parsedStart, parsedEnd);
            }
            catch (Exception)
            {
                return (true, "Admit Card download is active.", null, null);
            }
        }

        // ==========================================
        // GET: api/AdmitCard/timeline-status
        // ==========================================
        [HttpGet("timeline-status")]
        [HttpGet("status")]
        public IActionResult GetTimelineStatus()
        {
            var status = GetAdmitCardWindowStatus();
            return Ok(new
            {
                success = true,
                isOpen = status.IsOpen,
                message = status.Message,
                startDate = status.StartDate?.ToString("yyyy-MM-ddTHH:mm:ss"),
                endDate = status.EndDate?.ToString("yyyy-MM-ddTHH:mm:ss"),
                startDateFormatted = status.StartDate?.ToString("dd MMMM yyyy, hh:mm tt"),
                endDateFormatted = status.EndDate?.ToString("dd MMMM yyyy, hh:mm tt")
            });
        }

        // ==========================================
        // GET: api/AdmitCard/search-candidates
        // ==========================================
        [HttpGet("search-candidates")]
        [HttpGet("search")]
        public async Task<IActionResult> SearchCandidates([FromQuery] string? query, [FromQuery] string? dob)
        {
            try
            {
                var windowStatus = GetAdmitCardWindowStatus();
                if (!windowStatus.IsOpen)
                {
                    return BadRequest(new { success = false, message = windowStatus.Message });
                }

                if (string.IsNullOrWhiteSpace(query) || query.Trim().Length < 2)
                {
                    return BadRequest(new { success = false, message = "Candidate Full Name is required (at least 2 characters)." });
                }

                if (string.IsNullOrWhiteSpace(dob))
                {
                    return BadRequest(new { success = false, message = "Date of Birth is required." });
                }

                string trimmedQuery = query.Trim();
                var queryWords = trimmedQuery
                    .Split(new[] { ' ', '\t' }, StringSplitOptions.RemoveEmptyEntries)
                    .Select(w => w.Trim().ToLower())
                    .Where(w => w.Length > 0)
                    .ToList();

                if (queryWords.Count == 0)
                {
                    return BadRequest(new { success = false, message = "Candidate Full Name is required." });
                }

                DateTime filterDob;
                string[] dateFormats = new[]
                {
                    "yyyy-MM-dd", "dd-MM-yyyy", "dd/MM/yyyy", "MM/dd/yyyy", "yyyy/MM/dd",
                    "yyyy-MM-ddTHH:mm:ss", "yyyy-MM-ddTHH:mm:ss.fffZ", "yyyy-MM-ddTHH:mm:ssZ"
                };

                if (!DateTime.TryParseExact(dob.Trim(), dateFormats, CultureInfo.InvariantCulture, DateTimeStyles.None, out filterDob) &&
                    !DateTime.TryParse(dob.Trim(), CultureInfo.InvariantCulture, DateTimeStyles.None, out filterDob))
                {
                    return BadRequest(new { success = false, message = "Valid Date of Birth is required." });
                }

                filterDob = filterDob.Date;
                DateTime nextDay = filterDob.AddDays(1);

                var baseQuery = from u in _context.Users
                                join upd in _context.UserPersonalDetails on u.UserId equals upd.UserId
                                join mailDist in _context.City on (int?)upd.District equals (int?)mailDist.Id into mailDistGroup
                                from mailDist in mailDistGroup.DefaultIfEmpty()
                                join examC in _context.ExamCity on (int?)upd.ExamCity1 equals (int?)examC.CityId into examCGroup
                                from examC in examCGroup.DefaultIfEmpty()
                                where upd.DOB.HasValue && upd.DOB.Value >= filterDob && upd.DOB.Value < nextDay
                                select new
                                {
                                    rawFullName = u.FullName,
                                    rawFatherName = u.FatherName,
                                    rawRegNo = u.RegistrationNo,
                                    updDob = upd.DOB,
                                    homeDistrict = examC != null ? examC.CityName : null,
                                    district = mailDist != null ? mailDist.Name : null
                                };

                string regTerm = trimmedQuery.ToLower();
                if (queryWords.Count == 1)
                {
                    string singleWord = queryWords[0];
                    baseQuery = baseQuery.Where(x =>
                        (x.rawFullName != null && x.rawFullName.ToLower().Contains(singleWord)) ||
                        (x.rawRegNo != null && x.rawRegNo.ToLower().Trim() == regTerm)
                    );
                }
                else
                {
                    foreach (var word in queryWords)
                    {
                        string w = word;
                        baseQuery = baseQuery.Where(x => x.rawFullName != null && x.rawFullName.ToLower().Contains(w));
                    }
                }

                var rawResults = await baseQuery.Take(50).ToListAsync();

                string CleanSpaces(string? s) => string.IsNullOrWhiteSpace(s) ? "" : Regex.Replace(s.Trim(), @"\s+", " ");
                string normalizedQuery = CleanSpaces(trimmedQuery).ToLower();

                var results = rawResults
                    .Select(r => new
                    {
                        fullName = CleanSpaces(r.rawFullName),
                        fatherName = CleanSpaces(r.rawFatherName),
                        registrationNo = (r.rawRegNo ?? "").Trim(),
                        dob = r.updDob.HasValue ? r.updDob.Value.ToString("yyyy-MM-dd") : null,
                        homeDistrict = (r.homeDistrict ?? "").Trim(),
                        district = (r.district ?? "").Trim()
                    })
                    .Where(r => !string.IsNullOrEmpty(r.fullName))
                    .OrderBy(r => r.fullName.ToLower() == normalizedQuery ? 0 : 1)
                    .ThenBy(r => r.fullName)
                    .Take(15)
                    .ToList();

                if (results.Count == 0)
                {
                    return NotFound(new { success = false, message = "Candidate record not found with the provided Name and Date of Birth.", data = Array.Empty<object>() });
                }

                return Ok(new { success = true, data = results });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = $"Error searching candidates: {ex.Message}" });
            }
        }

        // ==========================================
        // POST: api/AdmitCard/download
        // ==========================================
        [HttpPost("download")]
        public async Task<IActionResult> DownloadAdmitCard([FromBody] AdmitCardDownloadRequest request)
        {
            if (request == null)
            {
                return BadRequest(new { success = false, message = "Candidate details are required." });
            }

            var windowStatus = GetAdmitCardWindowStatus();
            if (!windowStatus.IsOpen)
            {
                return BadRequest(new { success = false, message = windowStatus.Message });
            }

            string identifier = !string.IsNullOrWhiteSpace(request.FullName)
                ? request.FullName.Trim()
                : (!string.IsNullOrWhiteSpace(request.RegistrationNo) ? request.RegistrationNo.Trim() : "");

            int isLogin = CheckIfLoggedIn(request.IsLogin);

            if (string.IsNullOrWhiteSpace(identifier))
            {
                return BadRequest(new { success = false, message = "Candidate Name or Registration Number is required." });
            }

            // If user is logged in and registration number is provided, allow download directly even if DOB is omitted
            if (isLogin == 1 && !string.IsNullOrWhiteSpace(request.RegistrationNo) && string.IsNullOrWhiteSpace(request.Dob))
            {
                return await RenderAdmitCardByRegNo(request.RegistrationNo.Trim(), isLogin);
            }

            if (string.IsNullOrWhiteSpace(request.Dob))
            {
                return BadRequest(new { success = false, message = "Candidate Name (or Registration Number) and Date of Birth are required." });
            }

            return await ProcessAdmitCardDownload(request.FullName?.Trim(), request.RegistrationNo?.Trim(), request.Dob.Trim(), isLogin);
        }

        // ==========================================
        // GET: api/AdmitCard/render/{registrationNo}
        // ==========================================
        [HttpGet("render/{registrationNo}")]
        public async Task<IActionResult> RenderAdmitCardByRegNoEndpoint(string registrationNo, [FromQuery] bool? isLogin)
        {
            if (string.IsNullOrWhiteSpace(registrationNo))
            {
                return BadRequest(new { success = false, message = "Registration number is required." });
            }

            int isLoginVal = CheckIfLoggedIn(isLogin);
            return await RenderAdmitCardByRegNo(registrationNo.Trim(), isLoginVal);
        }

        // ==========================================
        // GET: api/AdmitCard/render-by-token/{token}
        // ==========================================
        [HttpGet("render-by-token/{token}")]
        public async Task<IActionResult> RenderAdmitCardByToken(string token)
        {
            if (string.IsNullOrWhiteSpace(token))
            {
                return BadRequest(new { success = false, message = "Token is required." });
            }

            string regNo = _securityService.DecryptUrlSafe(token.Trim());
            if (string.IsNullOrEmpty(regNo))
            {
                regNo = _securityService.Decrypt(token.Trim());
            }
            if (string.IsNullOrEmpty(regNo))
            {
                regNo = token.Trim();
            }

            int isLogin = CheckIfLoggedIn();
            return await RenderAdmitCardByRegNo(regNo, isLogin);
        }

        private async Task<IActionResult> ProcessAdmitCardDownload(string? fullName, string? registrationNo, string dobStr, int isLogin = 0)
        {
            try
            {
                var windowStatus = GetAdmitCardWindowStatus();
                if (!windowStatus.IsOpen)
                {
                    return BadRequest(new { success = false, message = windowStatus.Message });
                }

                string[] dateFormats = new[]
                {
                    "yyyy-MM-dd", "dd-MM-yyyy", "dd/MM/yyyy", "MM/dd/yyyy", "yyyy/MM/dd",
                    "yyyy-MM-ddTHH:mm:ss", "yyyy-MM-ddTHH:mm:ss.fffZ", "yyyy-MM-ddTHH:mm:ssZ"
                };

                if (!DateTime.TryParseExact(dobStr, dateFormats, CultureInfo.InvariantCulture, DateTimeStyles.None, out DateTime parsedDob) &&
                    !DateTime.TryParse(dobStr, CultureInfo.InvariantCulture, DateTimeStyles.None, out parsedDob))
                {
                    return BadRequest(new { success = false, message = "Invalid Date of Birth format." });
                }

                var query = from u in _context.Users
                            join upd in _context.UserPersonalDetails on u.UserId equals upd.UserId
                            select new
                            {
                                u.UserId,
                                u.RegistrationNo,
                                u.FullName,
                                upd.DOB,
                                u.IsPaymentCompleted
                            };

                var normalizedReg = registrationNo?.ToLower().Trim();
                var normalizedName = fullName?.ToLower().Trim();

                if (!string.IsNullOrWhiteSpace(normalizedReg))
                {
                    query = query.Where(c => c.RegistrationNo != null && c.RegistrationNo.ToLower().Trim() == normalizedReg);
                }
                else if (!string.IsNullOrWhiteSpace(normalizedName))
                {
                    var words = normalizedName.Split(new[] { ' ', '\t' }, StringSplitOptions.RemoveEmptyEntries);
                    foreach (var w in words)
                    {
                        string word = w;
                        query = query.Where(c => c.FullName != null && c.FullName.ToLower().Contains(word));
                    }
                }

                var candidates = await query.ToListAsync();
                if (!candidates.Any())
                {
                    return NotFound(new { success = false, message = "No candidate record found for provided credentials." });
                }

                var matchedByDob = candidates.Where(c => c.DOB.HasValue && c.DOB.Value.Date == parsedDob.Date).ToList();
                string cleanTargetName = Regex.Replace(fullName?.Trim() ?? "", @"\s+", " ").ToLower();
                var matched = matchedByDob.FirstOrDefault(c => Regex.Replace(c.FullName ?? "", @"\s+", " ").ToLower() == cleanTargetName)
                              ?? matchedByDob.FirstOrDefault();

                if (matched == null && isLogin == 1)
                {
                    matched = candidates.FirstOrDefault();
                }

                if (matched == null)
                {
                    return BadRequest(new { success = false, message = "Date of Birth does not match candidate records." });
                }

                string resolvedRegNo = matched.RegistrationNo.Trim();
                string encryptedToken = _securityService.EncryptUrlSafe(resolvedRegNo);

                Response.Headers.Append("X-Registration-No", resolvedRegNo);
                Response.Headers.Append("X-Candidate-Name", matched.FullName);
                Response.Headers.Append("X-Encrypted-Token", encryptedToken);
                Response.Headers.Append("Access-Control-Expose-Headers", "X-Registration-No, X-Candidate-Name, X-Encrypted-Token, Content-Disposition");

                return await RenderAdmitCardByRegNo(resolvedRegNo, isLogin);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = $"Internal error retrieving admit card: {ex.Message}" });
            }
        }

        private async Task<IActionResult> RenderAdmitCardByRegNo(string regNo, int isLogin = 0)
        {
            string cleanRegNo = regNo.Trim();

            var windowStatus = GetAdmitCardWindowStatus();
            if (!windowStatus.IsOpen)
            {
                return StatusCode(403, new
                {
                    success = false,
                    registrationNo = cleanRegNo,
                    message = windowStatus.Message
                });
            }

            string targetFileName = $"{cleanRegNo}.pdf";
            string configuredPath = _configuration["AdmitCardFilePath"] ?? _configuration["FilePath"] ?? @"Z:\UKDELED2026\Admit Card";

            string[] candidateFileNames = new[]
            {
                targetFileName,
                cleanRegNo,
                $"{cleanRegNo.ToUpper()}.pdf",
                $"{cleanRegNo.ToLower()}.pdf"
            };

            string[] baseDirectories = new[]
            {
                @"Z:\UKDELED2026\Admit Card",
                @"\\192.168.1.25\e\UKDELED2026\Admit Card",
                @"\\192.168.1.25\e\UKDELED2026",
                configuredPath,
                @"Z:\UKDELED2026",
                @"\\192.168.1.16\dev\UKDELED2026\Admit Card",
                @"\\192.168.1.16\dev\UKDELED2026",
                @"Z:\UKDELED2026\AdmitCard",
                @"\\192.168.1.25\e\UKDELED2026\AdmitCard",
                @"\\192.168.1.16\dev\UKDELED2026\AdmitCard"
            };

            var searchLocations = new System.Collections.Generic.List<string>();
            foreach (var dir in baseDirectories.Distinct())
            {
                if (string.IsNullOrWhiteSpace(dir)) continue;
                foreach (var fn in candidateFileNames)
                {
                    searchLocations.Add(Path.Combine(dir, fn));
                    searchLocations.Add(Path.Combine(dir, "Admit Card", fn));
                    searchLocations.Add(Path.Combine(dir, "AdmitCard", fn));
                }
            }

            string? matchedFilePath = searchLocations.FirstOrDefault(p =>
            {
                try { return System.IO.File.Exists(p); } catch { return false; }
            });

            if (string.IsNullOrEmpty(matchedFilePath))
            {
                return NotFound(new
                {
                    success = false,
                    registrationNo = cleanRegNo,
                    message = "Admit Card is not yet available. Please check back later or contact the examination authority."
                });
            }

            var fileBytes = await System.IO.File.ReadAllBytesAsync(matchedFilePath);
            var downloadName = $"AdmitCard_{cleanRegNo}.pdf";
            return File(fileBytes, "application/pdf", downloadName);
        }

        // ==========================================
        // POST: api/AdmitCard/log-download
        // ==========================================
        [HttpPost("log-download")]
        public async Task<IActionResult> LogDownload([FromBody] LogAdmitCardDownloadRequest? request)
        {
            string? regNo = request?.RegistrationNo?.Trim();
            if (string.IsNullOrWhiteSpace(regNo))
            {
                return BadRequest(new { success = false, message = "Registration number is required." });
            }

            int isLogin = CheckIfLoggedIn(request?.IsLogin);
            await LogAdmitCardDownloadAsync(regNo, isLogin);
            return Ok(new { success = true, message = "Admit card download logged successfully." });
        }

        private async Task LogAdmitCardDownloadAsync(string regNo, int isLogin)
        {
            try
            {
                string cleanRegNo = regNo.Trim();
                bool isNumeric = int.TryParse(cleanRegNo, out int parsedUserId);

                var candidateInfo = await (from u in _context.Users
                                           where u.RegistrationNo.ToLower() == cleanRegNo.ToLower() || (isNumeric && u.UserId == parsedUserId)
                                           join upd in _context.UserPersonalDetails on u.UserId equals upd.UserId into updGroup
                                           from upd in updGroup.DefaultIfEmpty()
                                           select new
                                           {
                                               UserId = u.UserId,
                                               RegistrationNo = u.RegistrationNo,
                                               ExamTypeId = upd != null ? (int?)upd.ExamTypeId : null,
                                               HomeDistrict = upd != null ? (int?)upd.District : null
                                           }).FirstOrDefaultAsync();

                if (candidateInfo != null)
                {
                    var log = new ACDlogger
                    {
                        UserId = candidateInfo.UserId,
                        RegistrationNo = candidateInfo.RegistrationNo ?? cleanRegNo,
                        DownloadTime = DateTime.UtcNow.AddHours(5).AddMinutes(30),
                        IpAddress = GetClientIpAddress(),
                        ExamTypeId = candidateInfo.ExamTypeId,
                        HomeDistrict = candidateInfo.HomeDistrict,
                        isloggin = isLogin
                    };

                    _context.ACDloggers.Add(log);
                    await _context.SaveChangesAsync();
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ACDlogger] Failed to log download: {ex.Message}");
            }
        }

        private int CheckIfLoggedIn(bool? explicitlyProvidedIsLogin = null)
        {
            if (explicitlyProvidedIsLogin.HasValue) return explicitlyProvidedIsLogin.Value ? 1 : 0;
            if (User?.Identity?.IsAuthenticated == true) return 1;

            if (Request.Headers.TryGetValue("Authorization", out var authHeader))
            {
                var headerStr = authHeader.ToString().Trim();
                if (headerStr.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase) && headerStr.Length > 15)
                {
                    return 1;
                }
            }
            return 0;
        }

        private string GetClientIpAddress()
        {
            string[] headerKeys = new[] { "CF-Connecting-IP", "X-Forwarded-For", "X-Real-IP", "HTTP_X_FORWARDED_FOR", "X-Client-IP" };
            foreach (var header in headerKeys)
            {
                if (Request.Headers.TryGetValue(header, out var val))
                {
                    var raw = val.ToString().Trim();
                    if (!string.IsNullOrEmpty(raw))
                    {
                        var first = raw.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).FirstOrDefault();
                        if (!string.IsNullOrEmpty(first)) return first;
                    }
                }
            }
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
            if (ip != null && ip.StartsWith("::ffff:")) ip = ip.Substring(7);
            return !string.IsNullOrWhiteSpace(ip) ? ip : "127.0.0.1";
        }
    }
}
