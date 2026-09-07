using System.ComponentModel;

namespace DELED.Models.NonDbModels
{
    public class AdminLoginRequest
    {
        public string Username { get; set; } = string.Empty;
        
        [PasswordPropertyText]
        public string Password { get; set; } = string.Empty;
    }
}
