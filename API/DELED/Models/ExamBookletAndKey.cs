using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DELED.Models
{
    [Table("ExamBookletsAndKeys")]
    public class ExamBookletAndKey
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
        public string? BookletFileName { get; set; }

        [MaxLength(500)]
        public string? BookletFilePath { get; set; }

        [MaxLength(255)]
        public string? AnswerKeyFileName { get; set; }

        [MaxLength(500)]
        public string? AnswerKeyFilePath { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTime CreatedOn { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedOn { get; set; }
    }
}
