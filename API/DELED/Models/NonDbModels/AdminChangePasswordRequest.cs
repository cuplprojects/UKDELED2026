using System.ComponentModel.DataAnnotations;

namespace DELED.Models.NonDbModels
{
    public class AdminChangePasswordRequest
    {
        [Required]
        public string OldPassword { get; set; } = string.Empty;

        [Required]
        public string NewPassword { get; set; } = string.Empty;
    }
}
