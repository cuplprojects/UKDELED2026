using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DELED.Models
{
    [Table("CandidateObjections")]
    public class CandidateObjection
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        public int UserId { get; set; }

        [Required]
        [MaxLength(100)]
        public string RegistrationNo { get; set; } = string.Empty;

        [MaxLength(50)]
        public string? RollNo { get; set; }

        [Required]
        [MaxLength(150)]
        public string ExamName { get; set; } = string.Empty;

        [Required]
        [MaxLength(10)]
        public string BookletSeries { get; set; } = string.Empty;

        [Required]
        public int QuestionNo { get; set; }

        [Required]
        [MaxLength(150)]
        public string CandidateAnswer { get; set; } = string.Empty;

        public string? Description { get; set; }

        [MaxLength(500)]
        public string? DocumentPath { get; set; }

        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = "Submitted"; // Submitted, Under Review, Accepted, Rejected

        public string? AdminRemarks { get; set; }

        public DateTime? ReviewedOn { get; set; }

        [MaxLength(150)]
        public string? ReviewedBy { get; set; }

        public bool IsFinalSubmitted { get; set; } = false;

        public DateTime? FinalSubmittedOn { get; set; }

        public DateTime CreatedOn { get; set; } = DateTime.UtcNow;
    }
}
