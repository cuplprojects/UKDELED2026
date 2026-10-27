using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DELED.Models
{
    [Table("acdlogger")]
    public class ACDlogger
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int ACDid { get; set; }

        public int UserId { get; set; }

        public string? RegistrationNo { get; set; }

        public DateTime DownloadTime { get; set; } = DateTime.UtcNow.AddHours(5).AddMinutes(30);

        public string? IpAddress { get; set; }

        public int? ExamTypeId { get; set; }

        public int? HomeDistrict { get; set; }

        public int isloggin { get; set; } = 0; // 0 = Public Search, 1 = Authenticated Student
    }
}
