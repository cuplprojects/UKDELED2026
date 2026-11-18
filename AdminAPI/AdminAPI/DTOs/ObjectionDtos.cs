using System;
using System.Collections.Generic;
using Microsoft.AspNetCore.Http;

namespace DELED.DTOs
{
    /// <summary>
    /// Payload sent by candidate when submitting a new objection draft (multipart form-data)
    /// </summary>
    public class SubmitObjectionRequest
    {
        public string ExamName { get; set; } = string.Empty;
        public string BookletSeries { get; set; } = string.Empty;
        public string? Section { get; set; }
        public string? Subject { get; set; }
        public string? FirstLanguage { get; set; }
        public string? SecondLanguage { get; set; }
        public string? Language { get; set; }
        public int QuestionNo { get; set; }
        public string? OfficialAnswer { get; set; }
        public string CandidateAnswer { get; set; } = string.Empty;
        public string? Description { get; set; }
        public IFormFile? DocumentFile { get; set; }
    }

    /// <summary>
    /// Payload sent by candidate when editing an existing draft objection
    /// </summary>
    public class UpdateObjectionRequest
    {
        public string? Section { get; set; }
        public string? Subject { get; set; }
        public string? FirstLanguage { get; set; }
        public string? SecondLanguage { get; set; }
        public string? Language { get; set; }
        public int QuestionNo { get; set; }
        public string? OfficialAnswer { get; set; }
        public string CandidateAnswer { get; set; } = string.Empty;
        public string? Description { get; set; }
        public IFormFile? DocumentFile { get; set; }
    }

    /// <summary>
    /// Payload used to reset all objections for a specific exam
    /// </summary>
    public class ResetExamRequest
    {
        public string ExamName { get; set; } = string.Empty;
    }

    /// <summary>
    /// Payload used by admin to update review status and remarks of an individual objection
    /// </summary>
    public class UpdateObjectionStatusRequest
    {
        public string Status { get; set; } = string.Empty; // "Submitted", "Under Review", "Accepted", "Rejected"
        public string? Remarks { get; set; }
    }

    /// <summary>
    /// Payload used by admin to update multiple objections in bulk
    /// </summary>
    public class BulkStatusRequest
    {
        public List<int> Ids { get; set; } = new List<int>();
        public string Status { get; set; } = string.Empty;
        public string? Remarks { get; set; }
    }

    /// <summary>
    /// Grouped count item for admin analytics and summary report PDF
    /// </summary>
    public class ObjectionLanguageSummaryItem
    {
        public string ExamName { get; set; } = string.Empty;
        public string BookletSeries { get; set; } = string.Empty;
        public string? Section { get; set; }
        public string Language { get; set; } = string.Empty;
        public int QuestionNo { get; set; }
        public string OfficialAnswer { get; set; } = "-";
        public int Count { get; set; }
        public int UniqueCandidates { get; set; }
    }

    /// <summary>
    /// Candidate info response payload returned on page load
    /// </summary>
    public class CandidateInfoResponse
    {
        public int UserId { get; set; }
        public string RegistrationNo { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string FatherName { get; set; } = string.Empty;
        public string MotherName { get; set; } = string.Empty;
        public string RollNo { get; set; } = string.Empty;
        public string ExamName { get; set; } = string.Empty;
        public string? AppliedCategory { get; set; }
        public bool IsFinalSubmitted { get; set; }
        public DateTime? FinalSubmittedOn { get; set; }
        public List<object> Objections { get; set; } = new List<object>();
    }

    /// <summary>
    /// Timeline window status response
    /// </summary>
    public class ObjectionTimelineStatusDto
    {
        public bool Success { get; set; } = true;
        public bool IsOpen { get; set; } = true;
        public string Message { get; set; } = string.Empty;
        public string? StartDate { get; set; }
        public string? EndDate { get; set; }
        public string? StartDateFormatted { get; set; }
        public string? EndDateFormatted { get; set; }
    }

    /// <summary>
    /// Objection detail with candidate metadata for admin view
    /// </summary>
    public class AdminObjectionItemDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string RegistrationNo { get; set; } = string.Empty;
        public string CandidateName { get; set; } = string.Empty;
        public string FatherName { get; set; } = string.Empty;
        public string RollNo { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string ExamName { get; set; } = string.Empty;
        public string BookletSeries { get; set; } = string.Empty;
        public string? Section { get; set; }
        public string? Subject { get; set; }
        public int QuestionNo { get; set; }
        public string? OfficialAnswer { get; set; }
        public string CandidateAnswer { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? DocumentPath { get; set; }
        public bool HasDocument { get; set; }
        public string Status { get; set; } = "Submitted";
        public string? AdminRemarks { get; set; }
        public DateTime? ReviewedOn { get; set; }
        public string? ReviewedBy { get; set; }
        public bool IsFinalSubmitted { get; set; }
        public DateTime? FinalSubmittedOn { get; set; }
        public DateTime CreatedOn { get; set; }
    }

    /// <summary>
    /// Admin Objection KPI counts
    /// </summary>
    public class AdminObjectionKpiDto
    {
        public int TotalObjections { get; set; }
        public int UniqueCandidates { get; set; }
        public int DistinctQuestions { get; set; }
        public int FinalSubmitted { get; set; }
        public int DraftCount { get; set; }
        public int UnderReview { get; set; }
        public int Accepted { get; set; }
        public int Rejected { get; set; }
    }
}
