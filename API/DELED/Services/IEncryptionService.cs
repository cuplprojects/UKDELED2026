using System.Text.Json;

namespace DELED.Services
{
    public interface IEncryptionService
    {
        string DecryptString(string cipherText);
        string EncryptData(object data);
    }

    public class EncryptionService : IEncryptionService
    {
        private readonly ISecurityService _securityService;

        public EncryptionService(ISecurityService securityService)
        {
            _securityService = securityService;
        }

        public string DecryptString(string cipherText)
        {
            return _securityService.Decrypt(cipherText);
        }

        public string EncryptData(object data)
        {
            if (data == null) return null;
            if (data is string str) return _securityService.Encrypt(str);
            
            var json = JsonSerializer.Serialize(data, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                WriteIndented = false
            });
            return _securityService.Encrypt(json);
        }
    }
}
