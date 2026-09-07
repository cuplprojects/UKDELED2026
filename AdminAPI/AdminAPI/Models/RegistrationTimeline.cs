using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace DELED.Models
{
    public class RegistrationTimeline
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        [MaxLength(50)]
        public string Key { get; set; } // e.g. "starts", "closes", "fee"

        [Required]
        [MaxLength(100)]
        public string Label { get; set; } // e.g. "REGISTRATION STARTS"

        [Required]
        [MaxLength(100)]
        public string DateValue { get; set; } // e.g. "23 May 2026"

        [Required]
        [MaxLength(100)]
        public string SubLabel { get; set; } // e.g. "11:00 AM onwards"
    }
}
