using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DELED.Models
{
    public class DbEventLog
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        public DateTime Timestamp { get; set; } = DELED.Helpers.TimeHelper.GetIST();

        [Required]
        public string Method { get; set; } = "";

        [Required]
        public string Path { get; set; } = "";

        public string? QueryString { get; set; }

        public string? Headers { get; set; }

        public string? Body { get; set; }

        public string? UserId { get; set; }

        public string? Message { get; set; }
        
        public string? IpAddress { get; set; }
    }
}
