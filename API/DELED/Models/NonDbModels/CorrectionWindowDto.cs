using System;

namespace DELED.Models.NonDbModels
{
    public class CorrectionWindowDto
    {
        public int UserId { get; set; }

        // Personal & Identity Details (Editable)
        public string FatherName { get; set; } = "";
        public DateTime? DOB { get; set; }
        public string Gender { get; set; } = "";
        public string MotherName { get; set; } = "";
        public string? HusbandName { get; set; }
        public string? AppliedCategory { get; set; }
        public string? GraduationCourse { get; set; }
        public string? GraduationUniversity { get; set; }
        public string? GraduationDate { get; set; }
        public string? SportsType { get; set; }
        public string IdentityProof { get; set; } = "";
        public string IdentityProofNo { get; set; } = "";

        // Exam Preference (Editable)
        public int ExamCity1 { get; set; }
        public int ExamCity2 { get; set; }

        // Contact & Address Details (Editable)
        public string MailingAddress { get; set; } = "";
        public int StateId { get; set; }
        public int District { get; set; }
        public string PinCode { get; set; } = "";

        // Document Uploads (Editable)
        public string? PhotoPath { get; set; }
        public string? SignaturePath { get; set; }
        public string? ThumbPath { get; set; }
    }
}
