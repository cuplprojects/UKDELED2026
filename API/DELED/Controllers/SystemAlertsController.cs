using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DELED.Data;
using DELED.Models;
using System.Threading.Tasks;
using System.Collections.Generic;
using System;

namespace DELED.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SystemAlertsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public SystemAlertsController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/SystemAlerts
        [HttpGet]
        public async Task<ActionResult<IEnumerable<SystemAlert>>> GetAlerts()
        {
            return await _context.SystemAlerts.ToListAsync();
        }

        // GET: api/SystemAlerts/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<SystemAlert>> GetAlert(int id)
        {
            var alert = await _context.SystemAlerts.FindAsync(id);
            if (alert == null)
            {
                return NotFound(new { message = $"Alert with ID {id} not found." });
            }
            return alert;
        }

        // POST: api/SystemAlerts
        [HttpPost]
        [Authorize]
        public async Task<ActionResult<SystemAlert>> CreateAlert([FromBody] SystemAlert alert)
        {
            if (alert == null)
            {
                return BadRequest(new { message = "Invalid alert data." });
            }

            alert.CreatedOn = DELED.Helpers.TimeHelper.GetIST();
            _context.SystemAlerts.Add(alert);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetAlert), new { id = alert.Id }, alert);
        }

        // PUT: api/SystemAlerts/{id}
        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> UpdateAlert(int id, [FromBody] SystemAlert alert)
        {
            if (alert == null || id != alert.Id)
            {
                return BadRequest(new { message = "ID mismatch or invalid data." });
            }

            var existing = await _context.SystemAlerts.FindAsync(id);
            if (existing == null)
            {
                return NotFound(new { message = $"Alert with ID {id} not found." });
            }

            existing.Text = alert.Text;
            existing.IsActive = alert.IsActive;

            _context.Entry(existing).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return StatusCode(500, new { message = "Database concurrency error." });
            }

            return Ok(new { success = true, message = "Alert updated successfully." });
        }

        // DELETE: api/SystemAlerts/{id}
        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> DeleteAlert(int id)
        {
            var alert = await _context.SystemAlerts.FindAsync(id);
            if (alert == null)
            {
                return NotFound(new { message = $"Alert with ID {id} not found." });
            }

            _context.SystemAlerts.Remove(alert);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "Alert deleted successfully." });
        }
    }
}
