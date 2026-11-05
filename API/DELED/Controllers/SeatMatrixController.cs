using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DELED.Data;
using DELED.Models;
using DELED.Models.NonDbModels;

namespace DELED.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [AllowAnonymous]
    public class SeatMatrixController : ControllerBase
    {
        private readonly AppDbContext _context;

        public SeatMatrixController(AppDbContext context)
        {
            _context = context;
        }

        // ==========================================
        // GET: api/SeatMatrix/filters
        // Returns all active cities, centres, and rooms with candidate counts
        // ==========================================
        [HttpGet("filters")]
        public async Task<IActionResult> GetFilters()
        {
            try
            {
                // Fetch all exam cities
                var examCities = await _context.ExamCity.AsNoTracking().ToListAsync();
                var centres = await _context.Centres.AsNoTracking().ToListAsync();

                // Aggregate allotments by AssignedCity, AssignedCentre, RoomNumber
                var allotmentStats = await _context.Allotments
                    .AsNoTracking()
                    .GroupBy(a => new { a.AssignedCity, a.AssignedCentre, a.RoomNumber })
                    .Select(g => new
                    {
                        AssignedCity = g.Key.AssignedCity ?? "",
                        AssignedCentre = g.Key.AssignedCentre ?? "",
                        RoomNumber = g.Key.RoomNumber ?? 0,
                        Count = g.Count(),
                        MinRoll = g.Min(x => x.RollNumber),
                        MaxRoll = g.Max(x => x.RollNumber)
                    })
                    .ToListAsync();

                int totalAllotted = allotmentStats.Sum(x => x.Count);

                // Build distinct city list
                var cityStats = allotmentStats
                    .GroupBy(x => x.AssignedCity)
                    .ToDictionary(g => g.Key, g => new
                    {
                        TotalCandidates = g.Sum(x => x.Count),
                        CentreCodes = g.Select(x => x.AssignedCentre).Distinct().ToList()
                    });

                var cityDtos = new List<SeatCityDto>();
                foreach (var ec in examCities)
                {
                    string code = (ec.CityCode ?? "").Trim();
                    int intCode = int.TryParse(code, out int parsed) ? parsed : -1;

                    // Match either by direct string or parsed integer
                    var matchedStat = cityStats.FirstOrDefault(kvp =>
                        kvp.Key.Trim() == code ||
                        (int.TryParse(kvp.Key, out int kInt) && kInt == intCode));

                    int candCount = matchedStat.Value?.TotalCandidates ?? 0;
                    int centreCount = matchedStat.Value?.CentreCodes.Count ?? 0;

                    // Also include centres defined in Centre table for this city
                    if (intCode > 0)
                    {
                        var matchingCentresInDb = centres.Count(c => c.CityCode == intCode);
                        if (matchingCentresInDb > centreCount) centreCount = matchingCentresInDb;
                    }

                    cityDtos.Add(new SeatCityDto
                    {
                        CityCode = code,
                        CityName = (ec.CityName ?? "").Trim(),
                        CentreCount = centreCount,
                        CandidateCount = candCount
                    });
                }

                // Any city codes in allotments not in examCities table
                foreach (var kvp in cityStats)
                {
                    if (!string.IsNullOrWhiteSpace(kvp.Key) &&
                        !cityDtos.Any(c => c.CityCode == kvp.Key ||
                            (int.TryParse(c.CityCode, out int cInt) && int.TryParse(kvp.Key, out int kInt) && cInt == kInt)))
                    {
                        cityDtos.Add(new SeatCityDto
                        {
                            CityCode = kvp.Key,
                            CityName = $"City {kvp.Key}",
                            CentreCount = kvp.Value.CentreCodes.Count,
                            CandidateCount = kvp.Value.TotalCandidates
                        });
                    }
                }

                cityDtos = cityDtos.OrderBy(c => c.CityCode).ToList();

                // Build centre list
                var centreDtos = new List<SeatCentreDto>();
                foreach (var c in centres)
                {
                    string cityCodeStr = c.CityCode.ToString();
                    string centreCodeStr = c.CentreCode.ToString();

                    var stats = allotmentStats.Where(a =>
                        (a.AssignedCity == cityCodeStr || (int.TryParse(a.AssignedCity, out int acInt) && acInt == c.CityCode)) &&
                        (a.AssignedCentre == centreCodeStr || (int.TryParse(a.AssignedCentre, out int acntInt) && acntInt == c.CentreCode))
                    ).ToList();

                    int candCount = stats.Sum(s => s.Count);
                    int roomCount = stats.Select(s => s.RoomNumber).Distinct().Count(r => r > 0);

                    // Look up city name
                    string cityName = c.CityName;
                    if (string.IsNullOrWhiteSpace(cityName))
                    {
                        var ec = examCities.FirstOrDefault(x => x.CityCode == cityCodeStr || (int.TryParse(x.CityCode, out int ecInt) && ecInt == c.CityCode));
                        if (ec != null) cityName = ec.CityName;
                    }

                    centreDtos.Add(new SeatCentreDto
                    {
                        CityCode = cityCodeStr,
                        CityName = cityName ?? "",
                        CentreCode = centreCodeStr,
                        CentreName = c.CentreName ?? "",
                        CentreNameHindi = c.CentreNameHindi,
                        Capacity = c.Capacity,
                        CandidateCount = candCount,
                        RoomCount = roomCount
                    });
                }

                // Add any centres from allotmentStats not in Centre table
                foreach (var stat in allotmentStats.GroupBy(x => new { x.AssignedCity, x.AssignedCentre }))
                {
                    if (string.IsNullOrWhiteSpace(stat.Key.AssignedCentre)) continue;
                    bool exists = centreDtos.Any(cd =>
                        (cd.CityCode == stat.Key.AssignedCity || (int.TryParse(cd.CityCode, out int cdCity) && int.TryParse(stat.Key.AssignedCity, out int sCity) && cdCity == sCity)) &&
                        (cd.CentreCode == stat.Key.AssignedCentre || (int.TryParse(cd.CentreCode, out int cdCent) && int.TryParse(stat.Key.AssignedCentre, out int sCent) && cdCent == sCent)));

                    if (!exists)
                    {
                        var ec = examCities.FirstOrDefault(x => x.CityCode == stat.Key.AssignedCity);
                        centreDtos.Add(new SeatCentreDto
                        {
                            CityCode = stat.Key.AssignedCity,
                            CityName = ec?.CityName ?? $"City {stat.Key.AssignedCity}",
                            CentreCode = stat.Key.AssignedCentre,
                            CentreName = $"Centre {stat.Key.AssignedCentre}",
                            CandidateCount = stat.Sum(s => s.Count),
                            RoomCount = stat.Select(s => s.RoomNumber).Distinct().Count(r => r > 0)
                        });
                    }
                }

                centreDtos = centreDtos.OrderBy(c => c.CityCode).ThenBy(c => c.CentreCode).ToList();

                // Build rooms list
                var roomDtos = allotmentStats
                    .Where(r => r.RoomNumber > 0)
                    .Select(r => new SeatRoomDto
                    {
                        CityCode = r.AssignedCity,
                        CentreCode = r.AssignedCentre,
                        RoomNumber = r.RoomNumber,
                        CandidateCount = r.Count,
                        MinRollNumber = r.MinRoll,
                        MaxRollNumber = r.MaxRoll
                    })
                    .OrderBy(r => r.CityCode)
                    .ThenBy(r => r.CentreCode)
                    .ThenBy(r => r.RoomNumber)
                    .ToList();

                return Ok(new
                {
                    success = true,
                    data = new SeatMatrixFilterResponse
                    {
                        Cities = cityDtos,
                        Centres = centreDtos,
                        Rooms = roomDtos,
                        TotalAllottedCandidates = totalAllotted
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = $"Failed to retrieve filter options: {ex.Message}" });
            }
        }

        // ==========================================
        // GET: api/SeatMatrix/cities
        // ==========================================
        [HttpGet("cities")]
        public async Task<IActionResult> GetCities()
        {
            try
            {
                var examCities = await _context.ExamCity.AsNoTracking().ToListAsync();
                var allotmentCities = await _context.Allotments
                    .AsNoTracking()
                    .GroupBy(a => a.AssignedCity)
                    .Select(g => new { CityCode = g.Key ?? "", Count = g.Count() })
                    .ToListAsync();

                var result = examCities.Select(ec =>
                {
                    string code = (ec.CityCode ?? "").Trim();
                    int intCode = int.TryParse(code, out int parsed) ? parsed : -1;
                    var match = allotmentCities.FirstOrDefault(ac =>
                        ac.CityCode.Trim() == code ||
                        (int.TryParse(ac.CityCode, out int acInt) && acInt == intCode));

                    return new SeatCityDto
                    {
                        CityCode = code,
                        CityName = ec.CityName ?? "",
                        CandidateCount = match?.Count ?? 0
                    };
                }).OrderBy(c => c.CityCode).ToList();

                return Ok(new { success = true, data = result });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // ==========================================
        // GET: api/SeatMatrix/centres
        // ==========================================
        [HttpGet("centres")]
        public async Task<IActionResult> GetCentres([FromQuery] string? cityCode)
        {
            try
            {
                var query = _context.Centres.AsNoTracking().AsQueryable();

                if (!string.IsNullOrWhiteSpace(cityCode))
                {
                    if (int.TryParse(cityCode.Trim(), out int cityInt))
                    {
                        query = query.Where(c => c.CityCode == cityInt);
                    }
                }

                var centres = await query.ToListAsync();
                var result = centres.Select(c => new SeatCentreDto
                {
                    CityCode = c.CityCode.ToString(),
                    CityName = c.CityName,
                    CentreCode = c.CentreCode.ToString(),
                    CentreName = c.CentreName,
                    CentreNameHindi = c.CentreNameHindi,
                    Capacity = c.Capacity
                }).OrderBy(c => c.CentreCode).ToList();

                return Ok(new { success = true, data = result });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // ==========================================
        // GET: api/SeatMatrix/rooms
        // ==========================================
        [HttpGet("rooms")]
        public async Task<IActionResult> GetRooms([FromQuery] string? cityCode, [FromQuery] string? centreCode)
        {
            try
            {
                var query = _context.Allotments.AsNoTracking().AsQueryable();

                if (!string.IsNullOrWhiteSpace(cityCode))
                {
                    string c = cityCode.Trim();
                    int.TryParse(c, out int cityInt);
                    query = query.Where(a => a.AssignedCity == c ||
                        (cityInt > 0 && a.AssignedCity == cityInt.ToString()) ||
                        (cityInt > 0 && a.AssignedCity == cityInt.ToString("D2")));
                }

                if (!string.IsNullOrWhiteSpace(centreCode))
                {
                    string c = centreCode.Trim();
                    int.TryParse(c, out int centreInt);
                    query = query.Where(a => a.AssignedCentre == c ||
                        (centreInt > 0 && a.AssignedCentre == centreInt.ToString()) ||
                        (centreInt > 0 && a.AssignedCentre == centreInt.ToString("D2")));
                }

                query = query.Where(a => a.RoomNumber.HasValue && a.RoomNumber > 0);

                var rooms = await query
                    .GroupBy(a => a.RoomNumber!.Value)
                    .Select(g => new SeatRoomDto
                    {
                        RoomNumber = g.Key,
                        CandidateCount = g.Count(),
                        MinRollNumber = g.Min(x => x.RollNumber),
                        MaxRollNumber = g.Max(x => x.RollNumber)
                    })
                    .OrderBy(r => r.RoomNumber)
                    .ToListAsync();

                return Ok(new { success = true, data = rooms });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // ==========================================
        // GET: api/SeatMatrix/matrix
        // Main endpoint to query candidates and room seat matrix with filters
        // ==========================================
        [HttpGet("matrix")]
        public async Task<IActionResult> GetMatrix(
            [FromQuery] string? cityCode,
            [FromQuery] string? centreCode,
            [FromQuery] int? roomNumber,
            [FromQuery] string? search,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            try
            {
                var query = _context.Allotments.AsNoTracking().AsQueryable();

                // Filter by City
                if (!string.IsNullOrWhiteSpace(cityCode))
                {
                    string c = cityCode.Trim();
                    int.TryParse(c, out int cityInt);
                    query = query.Where(a => a.AssignedCity == c ||
                        (cityInt > 0 && a.AssignedCity == cityInt.ToString()) ||
                        (cityInt > 0 && a.AssignedCity == cityInt.ToString("D2")));
                }

                // Filter by Centre
                if (!string.IsNullOrWhiteSpace(centreCode))
                {
                    string c = centreCode.Trim();
                    int.TryParse(c, out int centreInt);
                    query = query.Where(a => a.AssignedCentre == c ||
                        (centreInt > 0 && a.AssignedCentre == centreInt.ToString()) ||
                        (centreInt > 0 && a.AssignedCentre == centreInt.ToString("D2")));
                }

                // Filter by Room Number
                if (roomNumber.HasValue && roomNumber.Value > 0)
                {
                    query = query.Where(a => a.RoomNumber == roomNumber.Value);
                }

                // Join with Users and UserPersonalDetails
                var joinedQuery = from a in query
                                  join u in _context.Users.AsNoTracking() on a.UserId equals u.UserId
                                  join upd in _context.UserPersonalDetails.AsNoTracking() on a.UserId equals upd.UserId into updGroup
                                  from upd in updGroup.DefaultIfEmpty()
                                  select new
                                  {
                                      Allotment = a,
                                      User = u,
                                      Details = upd
                                  };

                // Search by Candidate Name, Roll Number, or Registration Number
                if (!string.IsNullOrWhiteSpace(search))
                {
                    string s = search.Trim().ToLower();
                    bool isNumeric = int.TryParse(s, out int searchRoll);

                    if (isNumeric)
                    {
                        joinedQuery = joinedQuery.Where(x =>
                            x.Allotment.RollNumber == searchRoll ||
                            (x.User.RegistrationNo != null && x.User.RegistrationNo.ToLower().Contains(s)) ||
                            (x.User.FullName != null && x.User.FullName.ToLower().Contains(s))
                        );
                    }
                    else
                    {
                        var words = s.Split(new[] { ' ', '\t' }, StringSplitOptions.RemoveEmptyEntries);
                        foreach (var word in words)
                        {
                            string w = word;
                            joinedQuery = joinedQuery.Where(x =>
                                (x.User.FullName != null && x.User.FullName.ToLower().Contains(w)) ||
                                (x.User.FatherName != null && x.User.FatherName.ToLower().Contains(w)) ||
                                (x.User.RegistrationNo != null && x.User.RegistrationNo.ToLower().Contains(w))
                            );
                        }
                    }
                }

                int totalCount = await joinedQuery.CountAsync();

                // Compute overall statistics
                var rollStats = await joinedQuery
                    .Select(x => x.Allotment.RollNumber)
                    .ToListAsync();

                int? minRoll = rollStats.Count > 0 ? rollStats.Min() : null;
                int? maxRoll = rollStats.Count > 0 ? rollStats.Max() : null;

                // Room summary breakdown
                var roomSummaryList = await joinedQuery
                    .Where(x => x.Allotment.RoomNumber.HasValue)
                    .GroupBy(x => new
                    {
                        RoomNum = x.Allotment.RoomNumber!.Value,
                        City = x.Allotment.AssignedCity,
                        Centre = x.Allotment.AssignedCentre
                    })
                    .Select(g => new SeatMatrixRoomSummaryDto
                    {
                        RoomNumber = g.Key.RoomNum,
                        CityCode = g.Key.City,
                        CentreCode = g.Key.Centre,
                        TotalCandidates = g.Count(),
                        MinRollNumber = g.Min(x => x.Allotment.RollNumber),
                        MaxRollNumber = g.Max(x => x.Allotment.RollNumber)
                    })
                    .OrderBy(r => r.RoomNumber)
                    .ToListAsync();

                // Load lookup metadata (Centres and ExamCities) to attach readable names
                var allCentres = await _context.Centres.AsNoTracking().ToListAsync();
                var allExamCities = await _context.ExamCity.AsNoTracking().ToListAsync();

                foreach (var rs in roomSummaryList)
                {
                    int.TryParse(rs.CityCode, out int cCodeInt);
                    int.TryParse(rs.CentreCode, out int cntCodeInt);

                    var matchedCentre = allCentres.FirstOrDefault(c =>
                        (c.CityCode == cCodeInt || c.CityCode.ToString() == rs.CityCode) &&
                        (c.CentreCode == cntCodeInt || c.CentreCode.ToString() == rs.CentreCode));

                    var matchedCity = allExamCities.FirstOrDefault(c =>
                        c.CityCode == rs.CityCode || (cCodeInt > 0 && c.CityCode == cCodeInt.ToString()));

                    rs.CentreName = matchedCentre?.CentreName ?? (string.IsNullOrWhiteSpace(rs.CentreCode) ? "" : $"Centre {rs.CentreCode}");
                    rs.CityName = matchedCity?.CityName ?? matchedCentre?.CityName ?? (string.IsNullOrWhiteSpace(rs.CityCode) ? "" : $"City {rs.CityCode}");
                    rs.Capacity = matchedCentre?.Capacity;
                }

                // Sorting
                var orderedQuery = joinedQuery
                    .OrderBy(x => x.Allotment.RoomNumber)
                    .ThenBy(x => x.Allotment.SeatRow)
                    .ThenBy(x => x.Allotment.SeatNumber)
                    .ThenBy(x => x.Allotment.RollNumber);

                // Pagination
                List<SeatCandidateDto> candidateDtos;
                if (pageSize > 0)
                {
                    if (page < 1) page = 1;
                    var pagedData = await orderedQuery
                        .Skip((page - 1) * pageSize)
                        .Take(pageSize)
                        .ToListAsync();

                    candidateDtos = pagedData.Select(x => MapToCandidateDto(x.Allotment, x.User, x.Details, allExamCities, allCentres)).ToList();
                }
                else
                {
                    // pageSize = 0 or negative -> return all (used for room matrix view or printing)
                    var allData = await orderedQuery.ToListAsync();
                    candidateDtos = allData.Select(x => MapToCandidateDto(x.Allotment, x.User, x.Details, allExamCities, allCentres)).ToList();
                    pageSize = totalCount > 0 ? totalCount : 50;
                    page = 1;
                }

                // Selected City & Centre Display Names
                string? selectedCityName = null;
                if (!string.IsNullOrWhiteSpace(cityCode))
                {
                    var matchCity = allExamCities.FirstOrDefault(c => c.CityCode == cityCode.Trim() ||
                        (int.TryParse(cityCode, out int ci) && int.TryParse(c.CityCode, out int ecci) && ci == ecci));
                    selectedCityName = matchCity?.CityName;
                }

                string? selectedCentreName = null;
                if (!string.IsNullOrWhiteSpace(centreCode))
                {
                    int.TryParse(cityCode ?? "", out int ci);
                    int.TryParse(centreCode, out int cni);
                    var matchCentre = allCentres.FirstOrDefault(c =>
                        (ci == 0 || c.CityCode == ci) &&
                        (c.CentreCode == cni || c.CentreCode.ToString() == centreCode.Trim()));
                    selectedCentreName = matchCentre?.CentreName;
                }

                // Visual Matrix Grid generation:
                // If a specific room is selected (or if all candidates belong to a single room),
                // construct the 2D grid matrix layout for that room!
                List<SeatMatrixRowDto>? grid = null;
                if (roomNumber.HasValue || roomSummaryList.Count == 1)
                {
                    int targetRoom = roomNumber ?? roomSummaryList.First().RoomNumber;

                    // If we have candidates from this room
                    var roomCandidates = pageSize > 0 && candidateDtos.Count < totalCount
                        ? (await orderedQuery.Where(x => x.Allotment.RoomNumber == targetRoom).ToListAsync())
                            .Select(x => MapToCandidateDto(x.Allotment, x.User, x.Details, allExamCities, allCentres)).ToList()
                        : candidateDtos.Where(c => c.RoomNumber == targetRoom).ToList();

                    grid = BuildSeatMatrixGrid(roomCandidates);
                }

                int totalPages = pageSize > 0 ? (int)Math.Ceiling((double)totalCount / pageSize) : 1;
                if (totalPages == 0) totalPages = 1;

                var response = new SeatMatrixResponse
                {
                    Success = true,
                    Summary = new SeatMatrixSummaryDto
                    {
                        TotalCandidates = totalCount,
                        TotalRooms = roomSummaryList.Count,
                        MinRollNumber = minRoll,
                        MaxRollNumber = maxRoll,
                        SelectedCityCode = cityCode,
                        SelectedCityName = selectedCityName,
                        SelectedCentreCode = centreCode,
                        SelectedCentreName = selectedCentreName,
                        SelectedRoomNumber = roomNumber
                    },
                    RoomSummaries = roomSummaryList,
                    Candidates = candidateDtos,
                    Grid = grid,
                    Pagination = new SeatPaginationDto
                    {
                        TotalCount = totalCount,
                        Page = page,
                        PageSize = pageSize,
                        TotalPages = totalPages
                    }
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = $"Failed to fetch seat matrix: {ex.Message}" });
            }
        }

        // ==========================================
        // GET: api/SeatMatrix/lookup
        // Rapid lookup by Roll Number, Registration No, or Candidate Name
        // ==========================================
        [HttpGet("lookup")]
        public async Task<IActionResult> LookupCandidate([FromQuery] string? query)
        {
            if (string.IsNullOrWhiteSpace(query) || query.Trim().Length < 2)
            {
                return BadRequest(new { success = false, message = "Please enter at least 2 characters to search (Roll Number, Registration No, or Candidate Name)." });
            }

            try
            {
                string q = query.Trim().ToLower();
                bool isNumeric = int.TryParse(q, out int rollNum);

                var joinedQuery = from a in _context.Allotments.AsNoTracking()
                                  join u in _context.Users.AsNoTracking() on a.UserId equals u.UserId
                                  join upd in _context.UserPersonalDetails.AsNoTracking() on a.UserId equals upd.UserId into updGroup
                                  from upd in updGroup.DefaultIfEmpty()
                                  select new { a, u, upd };

                if (isNumeric)
                {
                    joinedQuery = joinedQuery.Where(x =>
                        x.a.RollNumber == rollNum ||
                        (x.u.RegistrationNo != null && x.u.RegistrationNo.ToLower() == q)
                    );
                }
                else
                {
                    joinedQuery = joinedQuery.Where(x =>
                        (x.u.FullName != null && x.u.FullName.ToLower().Contains(q)) ||
                        (x.u.RegistrationNo != null && x.u.RegistrationNo.ToLower().Contains(q))
                    );
                }

                var matched = await joinedQuery.Take(20).ToListAsync();

                if (!matched.Any())
                {
                    return NotFound(new { success = false, message = "No seat allocation found matching the query." });
                }

                var allCentres = await _context.Centres.AsNoTracking().ToListAsync();
                var allExamCities = await _context.ExamCity.AsNoTracking().ToListAsync();

                var results = matched.Select(x => MapToCandidateDto(x.a, x.u, x.upd, allExamCities, allCentres)).ToList();

                return Ok(new { success = true, data = results });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // ==========================================
        // Helper: Build a visual classroom seat matrix grid
        // ==========================================
        private static List<SeatMatrixRowDto> BuildSeatMatrixGrid(List<SeatCandidateDto> candidates)
        {
            var gridRows = new List<SeatMatrixRowDto>();
            if (candidates == null || candidates.Count == 0) return gridRows;

            // Check if candidates already have explicit SeatRow and SeatNumber assigned
            bool hasExplicitRows = candidates.Any(c => c.SeatRow.HasValue && c.SeatRow.Value > 0);

            if (hasExplicitRows)
            {
                var groupedByRow = candidates
                    .GroupBy(c => c.SeatRow ?? 1)
                    .OrderBy(g => g.Key);

                int globalSeatIndex = 1;
                foreach (var rowGroup in groupedByRow)
                {
                    int rowNum = rowGroup.Key;
                    var rowDto = new SeatMatrixRowDto { RowNumber = rowNum };

                    var sortedInRow = rowGroup.OrderBy(c => c.SeatNumber ?? c.RollNumber);
                    foreach (var c in sortedInRow)
                    {
                        rowDto.Seats.Add(new SeatCellDto
                        {
                            SeatIndex = globalSeatIndex++,
                            SeatRow = rowNum,
                            SeatNumber = c.SeatNumber ?? globalSeatIndex,
                            IsOccupied = true,
                            Candidate = c
                        });
                    }

                    gridRows.Add(rowDto);
                }
            }
            else
            {
                // Dynamic Hall Layout:
                // In standard exam halls, seating is organized in 4 columns per row
                // (e.g. Desk A, B, C, D across each row)
                const int colsPerRow = 6;
                int totalCandidates = candidates.Count;
                int rowCount = (int)Math.Ceiling((double)totalCandidates / colsPerRow);

                var sorted = candidates.OrderBy(c => c.RollNumber).ToList();

                for (int r = 0; r < rowCount; r++)
                {
                    int rowNum = r + 1;
                    var rowDto = new SeatMatrixRowDto { RowNumber = rowNum };

                    for (int col = 0; col < colsPerRow; col++)
                    {
                        int seatIndex = (r * colsPerRow) + col;
                        int seatNum = seatIndex + 1;

                        if (seatIndex < totalCandidates)
                        {
                            var cand = sorted[seatIndex];
                            cand.SeatRow = rowNum;
                            cand.SeatNumber = seatNum;

                            rowDto.Seats.Add(new SeatCellDto
                            {
                                SeatIndex = seatNum,
                                SeatRow = rowNum,
                                SeatNumber = seatNum,
                                IsOccupied = true,
                                Candidate = cand
                            });
                        }
                    }

                    gridRows.Add(rowDto);
                }
            }

            return gridRows;
        }

        // ==========================================
        // Helper: Map DB entities to SeatCandidateDto
        // ==========================================
        private static SeatCandidateDto MapToCandidateDto(
            Allotment a,
            UserRegistration u,
            UserPersonalDetails? upd,
            List<ExamCity> examCities,
            List<Centre> centres)
        {
            string cityCode = (a.AssignedCity ?? "").Trim();
            string centreCode = (a.AssignedCentre ?? "").Trim();

            int.TryParse(cityCode, out int cityInt);
            int.TryParse(centreCode, out int centreInt);

            var matchedCity = examCities.FirstOrDefault(c =>
                c.CityCode == cityCode || (cityInt > 0 && c.CityCode == cityInt.ToString()));

            var matchedCentre = centres.FirstOrDefault(c =>
                (c.CityCode == cityInt || c.CityCode.ToString() == cityCode) &&
                (c.CentreCode == centreInt || c.CentreCode.ToString() == centreCode));

            string cityName = matchedCity?.CityName ?? matchedCentre?.CityName ?? (!string.IsNullOrEmpty(cityCode) ? $"City {cityCode}" : "");
            string centreName = matchedCentre?.CentreName ?? (!string.IsNullOrEmpty(centreCode) ? $"Centre {centreCode}" : "");

            return new SeatCandidateDto
            {
                AllotmentId = a.AllotmentId,
                UserId = a.UserId,
                RollNumber = a.RollNumber,
                RegistrationNo = u.RegistrationNo ?? "",
                FullName = u.FullName ?? "",
                FatherName = u.FatherName ?? "",
                Gender = upd?.Gender,
                Category = upd?.Category,
                SubCategory = upd?.SubCategory,
                AppliedCategory = upd?.AppliedCategory,
                CityCode = cityCode,
                CityName = cityName,
                CentreCode = centreCode,
                CentreName = centreName,
                RoomNumber = a.RoomNumber,
                SeatRow = a.SeatRow,
                SeatNumber = a.SeatNumber,
                AllotmentDate = a.AllotmentDate
            };
        }
    }
}
