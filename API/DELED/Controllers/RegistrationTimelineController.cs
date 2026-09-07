using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DELED.Data;
using DELED.Models;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Linq;

namespace DELED.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RegistrationTimelineController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly Microsoft.Extensions.Configuration.IConfiguration _configuration;

        public RegistrationTimelineController(AppDbContext context, Microsoft.Extensions.Configuration.IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        [HttpGet("status")]
        public IActionResult GetStatus()
        {
            var timeline = _context.RegistrationTimelines.FirstOrDefault(t => t.Key == "closes");
            bool isOpen = true;
            DateTime? closeDate = null;
            if (timeline != null && DateTime.TryParse($"{timeline.DateValue} 23:59:59", out DateTime parsedDate))
            {
                closeDate = parsedDate;
                isOpen = DELED.Helpers.TimeHelper.GetIST() < parsedDate;
            }
            return Ok(new {
                isOpen = isOpen,
                closeDate = closeDate
            });
        }

        // GET: api/RegistrationTimeline
        [HttpGet]
        public async Task<ActionResult<IEnumerable<RegistrationTimeline>>> GetTimelines()
        {
            return await _context.RegistrationTimelines.ToListAsync();
        }

        // GET: api/RegistrationTimeline/{key}
        [HttpGet("{key}")]
        public async Task<ActionResult<RegistrationTimeline>> GetTimeline(string key)
        {
            var timeline = await _context.RegistrationTimelines.FirstOrDefaultAsync(t => t.Key == key);
            if (timeline == null)
            {
                return NotFound(new { message = $"Timeline with key '{key}' not found." });
            }
            return timeline;
        }

        // PUT: api/RegistrationTimeline
        // Bulk sync
        [HttpPut]
        [Authorize]
        public async Task<IActionResult> UpdateTimelines([FromBody] List<RegistrationTimeline> timelines)
        {
            if (timelines == null)
            {
                return BadRequest(new { message = "Invalid timeline data." });
            }

            var existingDbTimelines = await _context.RegistrationTimelines.ToListAsync();

            // 1. Delete removed timelines
            var incomingKeys = new HashSet<string>(timelines.Select(t => t.Key.ToLower()));
            foreach (var dbItem in existingDbTimelines)
            {
                if (!incomingKeys.Contains(dbItem.Key.ToLower()))
                {
                    _context.RegistrationTimelines.Remove(dbItem);
                }
            }

            // 2. Insert or update timelines
            foreach (var item in timelines)
            {
                var existing = existingDbTimelines.FirstOrDefault(t => t.Key.ToLower() == item.Key.ToLower());
                if (existing != null)
                {
                    existing.Label = item.Label;
                    existing.DateValue = item.DateValue;
                    existing.SubLabel = item.SubLabel;
                    _context.Entry(existing).State = EntityState.Modified;
                }
                else
                {
                    _context.RegistrationTimelines.Add(new RegistrationTimeline
                    {
                        Key = item.Key,
                        Label = item.Label,
                        DateValue = item.DateValue,
                        SubLabel = item.SubLabel
                    });
                }
            }

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return StatusCode(500, new { message = "Database concurrency error." });
            }

            return Ok(new { success = true, message = "Timelines updated successfully." });
        }

        // PUT: api/RegistrationTimeline/{key}
        [HttpPut("{key}")]
        [Authorize]
        public async Task<IActionResult> UpdateTimeline(string key, [FromBody] RegistrationTimeline timeline)
        {
            if (timeline == null || key != timeline.Key)
            {
                return BadRequest(new { message = "Key mismatch or invalid data." });
            }

            var existing = await _context.RegistrationTimelines.FirstOrDefaultAsync(t => t.Key == key);
            if (existing == null)
            {
                return NotFound(new { message = $"Timeline with key '{key}' not found." });
            }

            existing.Label = timeline.Label;
            existing.DateValue = timeline.DateValue;
            existing.SubLabel = timeline.SubLabel;

            _context.Entry(existing).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return StatusCode(500, new { message = "Database concurrency error." });
            }

            return Ok(new { success = true, message = "Timeline updated successfully." });
        }
    }
}
