using Microsoft.IdentityModel.Tokens;
using DELED.Data;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using DELED.Models;
using DELED.Models.NonDbModels;
using DELED.Encryptions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DELED.Controllers
{
    [Route("api/[controller]")]
    [Route("[controller]")]
    [ApiController]
    public class AdminController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly AppDbContext _context;

        public AdminController(IConfiguration configuration, AppDbContext context)
        {
            _configuration = configuration;
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetHealth()
        {
            return Ok("Hello");
        }

        [Authorize(Roles = "Admin")]
        [HttpGet("validate")]
        public IActionResult ValidateAdmin()
        {
            return Ok(new { success = true, isAdmin = true, username = User.Identity?.Name });
        }

        private string GenerateToken(Admin admin, string sessionId)
        {
            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.Name, admin.Username),
                new Claim(ClaimTypes.Role, "Admin"),
                new Claim("AdminId", admin.Id.ToString()),
                new Claim("SessionId", sessionId)
            };

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Issuer"],
                claims: claims,
                expires: DateTime.Now.AddMinutes(120),
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        [AllowAnonymous]
        [HttpPost("login")]
        public IActionResult Login([FromBody] AdminLoginRequest model)
        {
            if (model == null || string.IsNullOrWhiteSpace(model.Username) || string.IsNullOrWhiteSpace(model.Password))
            {
                return BadRequest("Username and Password are required.");
            }

            var admin = _context.Admins.FirstOrDefault(a => a.Username == model.Username);

            if (admin == null)
            {
                return NotFound("Admin user not found.");
            }

            string hashedPassword = Sha256Hasher.ComputeSHA256Hash(model.Password);

            if (hashedPassword != admin.Password)
            {
                return Unauthorized("Invalid registration or password.");
            }

            string sessionId = Guid.NewGuid().ToString();
            admin.SessionId = sessionId;
            _context.SaveChanges();

            var token = GenerateToken(admin, sessionId);

            return Ok(new { token = token, username = admin.Username });
        }

        [Authorize]
        [HttpPut("change-password")]
        public IActionResult ChangePassword([FromBody] AdminChangePasswordRequest model)
        {
            if (model == null || string.IsNullOrWhiteSpace(model.OldPassword) || string.IsNullOrWhiteSpace(model.NewPassword))
            {
                return BadRequest("Old Password and New Password are required.");
            }

            string username = User.Identity?.Name;
            if (string.IsNullOrEmpty(username))
            {
                return Unauthorized("Unauthorized.");
            }

            var admin = _context.Admins.FirstOrDefault(a => a.Username == username);
            if (admin == null)
            {
                return NotFound("Admin user not found.");
            }

            string hashedOldPassword = Sha256Hasher.ComputeSHA256Hash(model.OldPassword);
            if (hashedOldPassword != admin.Password)
            {
                return BadRequest("Incorrect old password.");
            }

            admin.Password = Sha256Hasher.ComputeSHA256Hash(model.NewPassword);
            _context.SaveChanges();

            return Ok(new { success = true, message = "Password updated successfully." });
        }
    }
}
