using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;
using System;

namespace DELED.Models
{
    [Index(nameof(PhoneNumber), IsUnique = true, Name = "IX_UserRegistration_PhoneNumber_Unique")]
    [Index(nameof(Email), IsUnique = true, Name = "IX_UserRegistration_Email_Unique")]
    public class UserRegistration
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int UserId { get; set; }

        [Required]
        public string RegistrationNo { get; set; }
        [Required]
        public string FullName { get; set; }

        [Required]
        public string FatherName { get; set; }
        
        [Phone]
        [Required]
        public string PhoneNumber { get; set; }

        [EmailAddress]
        [Required]
        public string Email { get; set; }

        public DateTime CreatedOn { get; set; } = DELED.Helpers.TimeHelper.GetIST();

        public string? EmailOTP { get; set; }

        public DateTime? OTPExpiry { get; set; }

        public DateTime Expiry { get; set; }

        public bool IsOTPVerified { get; set; } = false;
        public DateTime CreatedAt {  get; set; } = DELED.Helpers.TimeHelper.GetIST();

        // Payment status fields
        public bool IsPaymentCompleted { get; set; } = false;
        public DateTime? PaymentDate { get; set; }
    }
}
