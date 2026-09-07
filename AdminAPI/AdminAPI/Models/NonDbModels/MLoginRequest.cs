using System.ComponentModel;

namespace DELED.Models.NonDbModels
{
    public class MLoginRequest
    {
        public string RegistrationNo { get; set; } = string.Empty;
        [PasswordPropertyText]
        public string Password { get; set; } = string.Empty;
        public string RecaptchaToken { get; set; } = string.Empty;

    }
}
