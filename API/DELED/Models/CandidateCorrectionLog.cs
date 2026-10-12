using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DELED.Models
{
    [Table("candidatecorrectionlogs")]
    public class CandidateCorrectionLog
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        public int UserId { get; set; }

        [Required]
        [MaxLength(50)]
        public string RegistrationNo { get; set; } = "";

        [Required]
        [MaxLength(100)]
        public string FieldName { get; set; } = "";

        public string? OldValue { get; set; }

        public string? NewValue { get; set; }

        public DateTime CorrectedAt { get; set; } = DELED.Helpers.TimeHelper.GetIST();

        [MaxLength(50)]
        public string? IpAddress { get; set; }
    }
}
