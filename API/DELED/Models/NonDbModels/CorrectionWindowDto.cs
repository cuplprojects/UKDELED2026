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
        public int HomeDistrict { get; set; }
        public string IdentityProof { get; set; } = "";
        public string IdentityProofNo { get; set; } = "";

        // Languages & Academic Details (Editable)
        public string FirstLanguage { get; set; } = "";
        public string SecondLanguage { get; set; } = "";
        public string? SubjectCode { get; set; }

        // Exam Preference (Editable)
        public int ExamCity1 { get; set; }
        public int ExamCity2 { get; set; }

        // DELED-I Training Details (Editable)
        public string? DELED1TrainingQualification { get; set; }
        public string? DELED1TrainingStatus { get; set; }
        public string? DELED1TrainingYear { get; set; }
        public string? EligibilityCodeDELED1 { get; set; }
        public string? Deled1InServiceTraining { get; set; }
        public string? Deled1InServiceTrainingOthers { get; set; }
        public string? Deled1UdiseCode { get; set; }
        public string? Deled1SchoolType { get; set; }

        // DELED-II Training Details (Editable)
        public string? DELED2TrainingQualification { get; set; }
        public string? DELED2TrainingStatus { get; set; }
        public string? DELED2TrainingYear { get; set; }
        public string? EligibilityCodeDELED2 { get; set; }
        public string? Deled2InServiceTraining { get; set; }
        public string? Deled2InServiceTrainingOthers { get; set; }
        public string? Deled2UdiseCode { get; set; }
        public string? Deled2SchoolType { get; set; }

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
