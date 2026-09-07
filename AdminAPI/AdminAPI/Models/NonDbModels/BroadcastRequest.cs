using System.ComponentModel.DataAnnotations;

namespace DELED.Models.NonDbModels
{
    public class BroadcastRequest
    {
        [Required]
        public string Subject { get; set; } = string.Empty;

        [Required]
        public string ToEmails { get; set; } = string.Empty;

        public string? CcEmails { get; set; }

        public string? BccEmails { get; set; }

        [Required]
        public string MessageBody { get; set; } = string.Empty;
    }
}
