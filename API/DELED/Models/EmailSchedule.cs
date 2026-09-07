using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DELED.Models
{
    public class EmailSchedule
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        [StringLength(200)]
        public string ScheduleName { get; set; }

        [Required]
        [StringLength(500)]
        public string Subject { get; set; }

        [Required]
        public string ToEmails { get; set; }

        public string CcEmails { get; set; } = string.Empty;

        public string BccEmails { get; set; } = string.Empty;

        public TimeSpan ScheduledTime { get; set; }

        public bool IsActive { get; set; }

        public DateOnly? LastSentDate { get; set; }

        public string? MessageBody { get; set; }
    }
}
