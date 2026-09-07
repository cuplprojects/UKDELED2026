using DELED.Data;
using System.Net.Mail;
using System.Net;
using System.IO;
using System.Net.Mime;
using System.Text.RegularExpressions;

namespace DELED.Services
{
    public class EmailService
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly string _smtpServer;
        private readonly int _smtpPort;
        private readonly string _senderEmail;
        private readonly string _smtpUsername;
        private readonly string _senderPassword;
        private readonly string _recipientEmail;
        private readonly string _senderDisplayName;

        public EmailService(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;

            _smtpServer = _configuration["EmailSettings:Host"];
            _smtpPort = int.Parse(_configuration["EmailSettings:Port"]);
            _senderEmail = _configuration["EmailSettings:Email"];
            _smtpUsername = _configuration["EmailSettings:Username"] ?? _senderEmail;
            _senderPassword = _configuration["EmailSettings:Password"];
            _senderDisplayName = _configuration["EmailSettings:Displayname"] ?? "UKDELED-2026";
            _recipientEmail = _configuration["ErrorEmailRecipient:RecipientEmail"];
        }

        private static readonly HashSet<string> KnownTypos = new(StringComparer.OrdinalIgnoreCase)
        {
            "gmli.com", "gamil.com", "gmial.com", "gmai.com", "gmal.com", "gmaill.com", "gmail.co", "gmail.cm", "gmail.cmo",
            "yaho.com", "yaho.co.in", "yahoo.cm", "yaho.cm",
            "outlok.com", "hotmal.com", "hotmial.com", "redifmail.com", "rediffmial.com"
        };

        private string? ValidateEmail(string email)
        {
            if (string.IsNullOrWhiteSpace(email))
                return "Email address is empty.";

            Regex regex = new Regex(@"^\w+([-+.']\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$");
            if (!regex.IsMatch(email.Trim()))
                return "Invalid email format.";

            var parts = email.Trim().Split('@');
            if (parts.Length == 2 && KnownTypos.Contains(parts[1]))
            {
                return $"Invalid email domain '{parts[1]}' (typo detected).";
            }

            return null; // Valid
        }

        /// <summary>
        /// Sends a simple email to a single recipient
        /// </summary>
        public string SendEmail(string to, string subject, string body)
        {
            var valError = ValidateEmail(to);
            if (valError != null)
            {
                return valError;
            }

            System.Net.ServicePointManager.SecurityProtocol = System.Net.SecurityProtocolType.Tls12 | System.Net.SecurityProtocolType.Tls13;

            var smtpClient = new SmtpClient(_smtpServer)
            {
                Port = _smtpPort,
                Credentials = new NetworkCredential(_smtpUsername, _senderPassword),
                EnableSsl = true,
            };

            var mailMessage = new MailMessage
            {
                From = new MailAddress(_senderEmail, _senderDisplayName),
                Subject = subject,
            };
            mailMessage.To.Add(to);

            mailMessage.Body = body;
            mailMessage.IsBodyHtml = true;

            try
            {
                smtpClient.Send(mailMessage);
                return "Email sent";
            }
            catch (Exception ex)
            {
                return ex.Message;
            }
        }

        /// <summary>
        /// Sends email with CC and BCC support
        /// </summary>
        public string SendEmailWithCcBcc(string to, string subject, string body, string cc = null, string bcc = null)
        {
            var valError = ValidateEmail(to);
            if (valError != null)
            {
                return valError;
            }

            System.Net.ServicePointManager.SecurityProtocol = System.Net.SecurityProtocolType.Tls12 | System.Net.SecurityProtocolType.Tls13;

            var smtpClient = new SmtpClient(_smtpServer)
            {
                Port = _smtpPort,
                Credentials = new NetworkCredential(_smtpUsername, _senderPassword),
                EnableSsl = true,
            };

            var mailMessage = new MailMessage
            {
                From = new MailAddress(_senderEmail, _senderDisplayName),
                Subject = subject,
                Body = body,
                IsBodyHtml = true,
            };

            mailMessage.To.Add(to);

            // Add CC recipients if provided
            if (!string.IsNullOrEmpty(cc))
            {
                var ccEmails = cc.Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries);
                foreach (var ccEmail in ccEmails)
                {
                    mailMessage.CC.Add(ccEmail.Trim());
                }
            }

            // Add BCC recipients if provided
            if (!string.IsNullOrEmpty(bcc))
            {
                var bccEmails = bcc.Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries);
                foreach (var bccEmail in bccEmails)
                {
                    mailMessage.Bcc.Add(bccEmail.Trim());
                }
            }

            try
            {
                smtpClient.Send(mailMessage);
                return "Email sent with CC/BCC";
            }
            catch (Exception ex)
            {
                return ex.Message;
            }
        }

        /// <summary>
        /// Sends email to multiple recipients with CC and BCC support
        /// </summary>
        public string SendEmailToMultipleWithCcBcc(List<string> toRecipients, string subject, string body, string cc = null, string bcc = null)
        {
            System.Net.ServicePointManager.SecurityProtocol = System.Net.SecurityProtocolType.Tls12 | System.Net.SecurityProtocolType.Tls13;

            var smtpClient = new SmtpClient(_smtpServer)
            {
                Port = _smtpPort,
                Credentials = new NetworkCredential(_smtpUsername, _senderPassword),
                EnableSsl = true,
            };

            var mailMessage = new MailMessage
            {
                From = new MailAddress(_senderEmail, _senderDisplayName),
                Subject = subject,
                Body = body,
                IsBodyHtml = true,
            };

            // Add all To recipients
            foreach (var recipient in toRecipients)
            {
                if (!string.IsNullOrWhiteSpace(recipient) && ValidateEmail(recipient.Trim()) == null)
                {
                    mailMessage.To.Add(recipient.Trim());
                }
            }

            // Add CC recipients if provided
            if (!string.IsNullOrEmpty(cc))
            {
                var ccEmails = cc.Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries);
                foreach (var ccEmail in ccEmails)
                {
                    mailMessage.CC.Add(ccEmail.Trim());
                }
            }

            // Add BCC recipients if provided
            if (!string.IsNullOrEmpty(bcc))
            {
                var bccEmails = bcc.Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries);
                foreach (var bccEmail in bccEmails)
                {
                    mailMessage.Bcc.Add(bccEmail.Trim());
                }
            }

            // Check if we have at least one recipient
            if (mailMessage.To.Count == 0 && mailMessage.CC.Count == 0 && mailMessage.Bcc.Count == 0)
            {
                return "No recipients specified";
            }

            try
            {
                smtpClient.Send(mailMessage);
                return "Email sent to multiple recipients with CC/BCC";
            }
            catch (Exception ex)
            {
                return ex.Message;
            }
        }
    }
}
