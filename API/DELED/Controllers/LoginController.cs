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
    [ApiController]
    public class LoginController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly AppDbContext _context;

        public LoginController(IConfiguration configuration, AppDbContext context)
        {
            _configuration = configuration;
            _context = context;
        }

        private string GenerateToken(UserAuth user)
        {
            var securitykey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]));
            var credentials = new SigningCredentials(securitykey, SecurityAlgorithms.HmacSha256);

            var claims = new List<Claim>
        {
            new Claim(ClaimTypes.Name, user.UserId.ToString()), // Assuming UserID is the unique identifier
        };

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Issuer"],
                claims: claims,
                expires: DELED.Helpers.TimeHelper.GetIST().AddMinutes(30),
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        [AllowAnonymous]
        [HttpPost]
        public async Task<IActionResult> Login([FromBody] MLoginRequest model)
        {

            if (string.IsNullOrWhiteSpace(model.RegistrationNo))
            {
                return BadRequest("Registration Number is required.");
            }

            // Query user by RegistrationNo directly
            var user = _context.Users.FirstOrDefault(u => u.RegistrationNo == model.RegistrationNo);

            if (user == null)
            {
                return NotFound("User not found");
            }

            var ua = _context.UserAuths.FirstOrDefault(u => u.UserId == user.UserId);

            if (ua == null)
            {
                return NotFound("User credentials not found");
            }

            string hashedPassword = Sha256Hasher.ComputeSHA256Hash(model.Password);
            Console.WriteLine(hashedPassword);

            if (hashedPassword != ua.Password)
            {
                return Unauthorized("Invalid registration or password");
            }

            var token = GenerateToken(ua);

            return Ok(new { token = token, userId = ua.UserId });
        }
    }

}
