using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DELED.Models
{
    public class UserPersonalDetails
    {
        // -------------------------------------------------------------
        // Starting 3 columns (kept as-is)
        // -------------------------------------------------------------
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int PersonalDetailId { get; set; }

        public int UserId { get; set; }

        public int ExamTypeId { get; set; }

        // -------------------------------------------------------------
        // Application form columns in exact UI order
        // -------------------------------------------------------------
        // Row 1: प्रशिक्षण हेतु आवेदित वर्ग
        public string? AppliedCategory { get; set; }

        // Row 2: Graduation Course | Name of University
        public string? GraduationCourse { get; set; }

        public string? GraduationUniversity { get; set; }

        // Row 3: स्नातक योग्यता प्राप्त करने की तिथि
        public string? GraduationDate { get; set; }

        // Row 5: Gender | Date of Birth
        public string Gender { get; set; } = "";

        public DateTime? DOB { get; set; }

        // Row 6: Mother's Name (ApplicantName & FatherName reside in Users table)
        public string MotherName { get; set; } = "";

        // Row 7: Husband Name
        public string? HusbandName { get; set; }

        // Row 8: Category | Sub Category | सेना से सेवा-निवृत्ति की तिथि | खेल का प्रकार
        public string Category { get; set; } = "";

        public string SubCategory { get; set; } = "";

        public DateTime? RetirementDate { get; set; }

        public string? SportsType { get; set; }

        // Row 9: PH YES/No | If YES select PH Type | Multi PH Type | Scribe Required
        public bool IsPhysicallyHandicapped { get; set; }

        public string? DisabilityType { get; set; }

        public string? MultiDisabilityType { get; set; }

        public bool ScribeRequired { get; set; }

        // Row 10: Exam City 1st | Exam City 2nd
        public int ExamCity1 { get; set; } 

        public int ExamCity2 { get; set; } 

        // Row 11: Complete Mailing Address
        public string MailingAddress { get; set; } = "";

        // Row 12: State | District
        public int StateId { get; set; }

        public int District { get; set; }

        // Row 13: PIN Code | Identity Proof
        public string PinCode { get; set; } = "";

        public string IdentityProof { get; set; } = "";

        // Row 14: Identity Proof No.
        public string IdentityProofNo { get; set; } = "";

        // -------------------------------------------------------------
        // Audit Fields
        // -------------------------------------------------------------
        public DateTime CreatedOn { get; set; } = DELED.Helpers.TimeHelper.GetIST();

        public DateTime? UpdatedOn { get; set; }

        public bool IsActive { get; set; } = true;

        // -------------------------------------------------------------
        // Unmapped helper properties for User registration sync
        // -------------------------------------------------------------
        [NotMapped]
        public string? EmailId { get; set; }

        [NotMapped]
        public string? ApplicantName { get; set; }

        [NotMapped]
        public string? FatherName { get; set; }

        [NotMapped]
        public string? MobileNo { get; set; }
    }
}