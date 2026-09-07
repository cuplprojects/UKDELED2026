using System;
using System.Net;
using System.Text; // for class Encoding
using System.IO; // for StreamReader
using System.Text.Json;

namespace DELED.Services
{
    public class SmsGatewayResult
    {
        public bool IsAccepted { get; set; }
        public string Status { get; set; } = string.Empty;
        public string StatusCode { get; set; } = string.Empty;
        public string Reason { get; set; } = string.Empty;
        public string Mobile { get; set; } = string.Empty;
        public string TransactionId { get; set; } = string.Empty;
        public string RawResponse { get; set; } = string.Empty;

        public static SmsGatewayResult NotSent(string reason)
        {
            return new SmsGatewayResult
            {
                IsAccepted = false,
                Status = "not_sent",
                Reason = reason
            };
        }
    }

    public class SmsService
    {
        private readonly string _apiUrl;
        private readonly string _apiKey;
        private readonly string _userId;
        private readonly string _senderId;
        private readonly string _password;

        public SmsService(string apiUrl, string apiKey, string userId, string senderId, string password)
        {
            _apiUrl = apiUrl;
            _apiKey = apiKey;
            _userId = userId;
            _senderId = senderId;
            _password = password;
        }

        public SmsGatewayResult SendSms(string mobileNumber, string message, string templateId, string? entityId = null)
        {
            var request = (HttpWebRequest)WebRequest.Create(_apiUrl);

            var postData = BuildPostData(mobileNumber, message, templateId, entityId);

            var data = Encoding.UTF8.GetBytes(postData);

            request.Method = "POST";
            request.ContentType = "application/x-www-form-urlencoded";
            request.ContentLength = data.Length;
            request.Timeout = 30000;

            using (var stream = request.GetRequestStream())
            {
                stream.Write(data, 0, data.Length);
            }

            using (var response = (HttpWebResponse)request.GetResponse())
            using (var reader = new StreamReader(response.GetResponseStream()))
            {
                var rawResponse = reader.ReadToEnd();
                return ParseGatewayResponse(rawResponse);
            }
        }

        private string BuildPostData(string mobileNumber, string message, string templateId, string? entityId)
        {
            var fields = new Dictionary<string, string>
            {
                ["apiKey"] = _apiKey,
                ["userId"] = _userId,
                ["password"] = _password,
                ["senderId"] = _senderId,
                ["mobile"] = mobileNumber,
                ["sendMethod"] = "simplemsg",
                ["msgType"] = "TEXT",
                ["msg"] = message,
                ["format"] = "json",
                ["templateId"] = templateId
            };

            if (!string.IsNullOrWhiteSpace(entityId))
            {
                fields["entityId"] = entityId;
            }

            return string.Join("&", fields.Select(field =>
                $"{WebUtility.UrlEncode(field.Key)}={WebUtility.UrlEncode(field.Value)}"));
        }

        private SmsGatewayResult ParseGatewayResponse(string rawResponse)
        {
            var result = new SmsGatewayResult
            {
                RawResponse = rawResponse
            };

            try
            {
                using var document = JsonDocument.Parse(rawResponse);
                var root = document.RootElement;

                result.Status = GetString(root, "status");
                result.StatusCode = GetString(root, "statusCode");
                result.Reason = GetString(root, "reason");
                result.Mobile = GetString(root, "mobile");
                result.TransactionId = GetString(root, "transactionId");
                result.IsAccepted = string.Equals(result.Status, "success", StringComparison.OrdinalIgnoreCase)
                    && result.StatusCode == "900";
            }
            catch (JsonException)
            {
                result.Status = "parse_error";
                result.Reason = "SMS gateway returned a non-JSON response.";
                result.IsAccepted = false;
            }

            return result;
        }

        private static string GetString(JsonElement element, string propertyName)
        {
            return element.TryGetProperty(propertyName, out var property) ? property.GetString() ?? string.Empty : string.Empty;
        }
    }
}

