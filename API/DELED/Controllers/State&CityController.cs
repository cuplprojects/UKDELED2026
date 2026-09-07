using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DELED.Data;

namespace DELED.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class State_CityController : ControllerBase
    {
        private readonly AppDbContext _context;

        public State_CityController (AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]

        public async Task<IActionResult> GetState()
        {
            var states = await _context.State.ToListAsync();
            return Ok(states);
        }

        [HttpGet("stateId")]
        public async Task<IActionResult> GetUTCity(int stateId)
        {
            var city = await _context.City.Where(s=>s.StateId==stateId).ToListAsync();
            return Ok(city);
        }

        [HttpGet("examTypes")]
        public async Task<IActionResult> GetExamTypes()
        {
            var examTypes = await _context.ExamTypes.ToListAsync();
            return Ok(examTypes);
        }

        [HttpGet("examCities")]
        public async Task<IActionResult> GetExamCities()
        {
            var examCities = await _context.ExamCity.ToListAsync();
            return Ok(examCities);
        }
    }
}
