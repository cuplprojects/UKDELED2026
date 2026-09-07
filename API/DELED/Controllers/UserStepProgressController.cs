using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DELED.Data;

namespace DELED.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class UserStepProgressesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public UserStepProgressesController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/UserStepProgresses
        [HttpGet]
        public async Task<ActionResult> GetUserStepProgress()
        {
            int userId = GetUserIdFromToken();

            try
            {
                var progress = await _context.UserStepProgresses
                    .Where(u => u.UserId == userId)
                    .OrderBy(u => u.StepNumber)
                    .ToListAsync();

                if (progress == null || progress.Count == 0)
                {
                    return Ok(new[] { new { stepNumber = 0, userId = userId, completedOn = (System.DateTime?)null } });
                }

                return Ok(progress);
            }
            catch (System.Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // POST: api/UserStepProgresses/{stepNumber}
        [HttpPost("{stepNumber}")]
        public async Task<ActionResult> CompleteStep(int stepNumber)
        {
            int userId = GetUserIdFromToken();

            try
            {
                bool stepExists = await _context.UserStepProgresses
                    .AnyAsync(s => s.UserId == userId && s.StepNumber == stepNumber);

                if (!stepExists)
                {
                    var progress = new Models.UserStepProgress
                    {
                        UserId = userId,
                        StepNumber = stepNumber,
                        CompletedOn = DELED.Helpers.TimeHelper.GetIST()
                    };
                    _context.UserStepProgresses.Add(progress);
                    await _context.SaveChangesAsync();
                }

                return Ok(new { success = true });
            }
            catch (System.Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        private int GetUserIdFromToken()
        {
            var nameClaim = User.Identity?.Name;
            if (string.IsNullOrEmpty(nameClaim) || !int.TryParse(nameClaim, out int userId))
            {
                throw new System.UnauthorizedAccessException("Invalid user identity in token.");
            }
            return userId;
        }
    }
}
