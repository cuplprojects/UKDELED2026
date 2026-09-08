using System.ComponentModel;
using System.ComponentModel.DataAnnotations;

namespace DELED.Models
{
    public class Admin
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Username { get; set; }

        [Required]
        [PasswordPropertyText]
        public string Password { get; set; }

        [MaxLength(100)]
        public string? SessionId { get; set; }
    }
}
