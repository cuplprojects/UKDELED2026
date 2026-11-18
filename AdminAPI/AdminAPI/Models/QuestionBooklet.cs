using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DELED.Models
{
    [Table("QuestionBooklets")]
    public class QuestionBooklet
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        [MaxLength(150)]
        public string ExamName { get; set; } = "UK D.El.Ed. Entrance Examination 2026";

        [Required]
        [MaxLength(10)]
        public string BookletSeries { get; set; } = string.Empty; // A, B, C, D

        [MaxLength(255)]
        public string? FileName { get; set; }

        [MaxLength(500)]
        public string? FilePath { get; set; }

        public long? FileSize { get; set; }

        public int? TotalPages { get; set; }

        public bool IsActive { get; set; } = true;

        [MaxLength(100)]
        public string? UploadedBy { get; set; }

        public DateTime CreatedOn { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedOn { get; set; }
    }
}
