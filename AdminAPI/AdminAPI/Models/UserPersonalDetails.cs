using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DELED.Models
{
    public class UserPersonalDetails
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int PersonalDetailId { get; set; }

        public int UserId { get; set; }

        // 1. Application
        public int ExamTypeId { get; set; }  // DELED-I, DELED-II, BOTH


     

        // 5. Gender
        public string Gender { get; set; } = "";

        // 6. DOB
        public DateTime? DOB { get; set; }

        // 7. Father's Name
     

        // 8. Mother's Name
        public string MotherName { get; set; } = "";

        // 9. Husband Name
        public string? HusbandName { get; set; }

        // 10. Home District
        public int HomeDistrict { get; set; }

        // 11. Category
        public string Category { get; set; } = "";

        // 12. Sub Category
        public string SubCategory { get; set; } = "";

        // 13. PH Yes/No
        public bool IsPhysicallyHandicapped { get; set; }

        // 14. Disability Type
        public string? DisabilityType { get; set; }

        // 15. Scribe Required
        public bool ScribeRequired { get; set; }

        // 16. First Language
        public string FirstLanguage { get; set; } = "";

        // 17. Second Language
        public string SecondLanguage { get; set; } = "";

        // 18. Subject Code (DELED-II)
        public string? SubjectCode { get; set; }   // Maths/Science, Social Studies

        // ---------------- DELED-I Training ----------------

        // 19.
        public string? DELED1TrainingQualification { get; set; }

        // 20.
        public string? DELED1TrainingStatus { get; set; } // Passed/In Training/Enrolled

        // 21.
        public string? DELED1TrainingYear { get; set; }

        // ---------------- DELED-II Training ----------------

        // 22.
        public string? DELED2TrainingQualification { get; set; }

        // 23.
        public string? DELED2TrainingStatus { get; set; }

        // 24.
        public string? DELED2TrainingYear { get; set; }

        // 25.
        public string? EligibilityCodeDELED1 { get; set; }

        // 26.
        public string? EligibilityCodeDELED2 { get; set; }

        // 27.
        public int ExamCity1 { get; set; } 

        // 28.
        public int ExamCity2 { get; set; } 

        // 29.
        public string MailingAddress { get; set; } = "";

        // 30.
        public int StateId { get; set; }

        // 31.
        public int District { get; set; }

        // 32.
        public string PinCode { get; set; } = "";

        // 33.
        public string IdentityProof { get; set; } = "";   // Aadhaar, PAN, Passport, DL

        // 34.
        public string IdentityProofNo { get; set; } = "";



        // Audit Fields
        public DateTime CreatedOn { get; set; } = DateTime.Now;

        public DateTime? UpdatedOn { get; set; }

        public bool IsActive { get; set; } = true;
        public string? Deled1UdiseCode {  get; set; }
        public string? Deled2UdiseCode { get;set; }
        public string? Deled1InServiceTraining { get; set; }
        public string? Deled1InServiceTrainingOthers { get; set; }
        public string? Deled2InServiceTraining { get; set; }
        public string? Deled2InServiceTrainingOthers { get; set; }
        public string? Deled1SchoolType { get; set; }
        public string? Deled2SchoolType { get; set; }
        public DateTime? RetirementDate { get; set; }
    }
}