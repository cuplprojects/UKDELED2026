using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DELED.Models
{
    public class DbErrorLog
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        public DateTime Timestamp { get; set; } = DateTime.Now;

        [Required]
        public string Method { get; set; } = "";

        [Required]
        public string Path { get; set; } = "";

        public string? QueryString { get; set; }

        public int? StatusCode { get; set; }

        [Required]
        public string Message { get; set; } = "";

        public string? StackTrace { get; set; }

        public string? InnerException { get; set; }
    }
}
