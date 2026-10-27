namespace DELED.Models
{
    public class AdmitCardDownloadRequest
    {
        public string? FullName { get; set; }
        public string? RegistrationNo { get; set; }
        public string? Dob { get; set; }
        public bool? IsLogin { get; set; }
    }

    public class LogAdmitCardDownloadRequest
    {
        public string? RegistrationNo { get; set; }
        public bool? IsLogin { get; set; }
    }

    public class CandidateSearchResultDto
    {
        public string FullName { get; set; } = string.Empty;
        public string FatherName { get; set; } = string.Empty;
        public string RegistrationNo { get; set; } = string.Empty;
        public string? Dob { get; set; }
        public string HomeDistrict { get; set; } = string.Empty;
        public string District { get; set; } = string.Empty;
    }
}
