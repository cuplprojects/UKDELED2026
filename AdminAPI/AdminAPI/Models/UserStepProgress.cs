using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DELED.Models
{
    public class UserStepProgress
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        public int UserId { get; set; }

        [Required]
        public int StepNumber { get; set; } // 1 = Personal Details, 2 = Photo/Sig Upload, 3 = Confirmed (Locked), 4 = Payment Complete

        public DateTime CompletedOn { get; set; } = DateTime.Now;
    }
}
