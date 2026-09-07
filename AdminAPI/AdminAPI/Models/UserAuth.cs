using System.ComponentModel;
using System.ComponentModel.DataAnnotations;

namespace DELED.Models
{
    public class UserAuth
    {
        public int UserAuthId { get; set; }

        [Required]
        public int UserId { get; set; }

        [Required]
        [PasswordPropertyText]
        public string Password { get; set; }

        [PasswordPropertyText]
        public string? ClearPass { get; set; }
    }
}
