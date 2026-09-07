using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;

namespace DELED.Services
{
    public class SecurityService : ISecurityService
    {
        private readonly string _encryptionKey;

        public SecurityService(IConfiguration configuration)
        {
            _encryptionKey = configuration["AES_Key"] ?? "DefaultEncryptionKey123456789012"; // 32 chars for AES-256
        }

        public string Encrypt(string plainText)
        {
            if (string.IsNullOrEmpty(plainText))
                return plainText;

            using (var aes = Aes.Create())
            {
                aes.Key = Encoding.UTF8.GetBytes(_encryptionKey.PadRight(32).Substring(0, 32));
                aes.Mode = CipherMode.CBC;
                aes.Padding = PaddingMode.PKCS7;

                using (var encryptor = aes.CreateEncryptor(aes.Key, aes.IV))
                {
                    using (var ms = new MemoryStream())
                    {
                        ms.Write(aes.IV, 0, aes.IV.Length);

                        using (var cs = new CryptoStream(ms, encryptor, CryptoStreamMode.Write))
                        {
                            using (var sw = new StreamWriter(cs))
                            {
                                sw.Write(plainText);
                            }
                        }

                        return Convert.ToBase64String(ms.ToArray());
                    }
                }
            }
        }

        public string Decrypt(string cipherText)
        {
            if (string.IsNullOrEmpty(cipherText))
                return cipherText;

            try
            {
                using (var aes = Aes.Create())
                {
                    aes.Key = Encoding.UTF8.GetBytes(_encryptionKey.PadRight(32).Substring(0, 32));
                    aes.Mode = CipherMode.CBC;
                    aes.Padding = PaddingMode.PKCS7;

                    var buffer = Convert.FromBase64String(cipherText);
                    var iv = new byte[aes.IV.Length];
                    Array.Copy(buffer, 0, iv, 0, iv.Length);

                    using (var decryptor = aes.CreateDecryptor(aes.Key, iv))
                    {
                        using (var ms = new MemoryStream(buffer, iv.Length, buffer.Length - iv.Length))
                        {
                            using (var cs = new CryptoStream(ms, decryptor, CryptoStreamMode.Read))
                            {
                                using (var sr = new StreamReader(cs))
                                {
                                    return sr.ReadToEnd();
                                }
                            }
                        }
                    }
                }
            }
            catch
            {
                return null;
            }
        }

        public string EncryptUrlSafe(string plainText)
        {
            if (string.IsNullOrEmpty(plainText))
                return plainText;

            var base64 = Encrypt(plainText);
            if (string.IsNullOrEmpty(base64))
                return base64;

            // Make URL-safe: replace '+' with '-', '/' with '_', and remove '=' padding
            return base64.Replace("+", "-").Replace("/", "_").TrimEnd('=');
        }

        public string DecryptUrlSafe(string cipherText)
        {
            if (string.IsNullOrEmpty(cipherText))
                return cipherText;

            try
            {
                // Restore standard Base64 from URL-safe characters
                string base64 = cipherText.Replace("-", "+").Replace("_", "/");
                int padding = base64.Length % 4;
                if (padding > 0)
                {
                    base64 += new string('=', 4 - padding);
                }

                return Decrypt(base64);
            }
            catch
            {
                return null;
            }
        }
    }
}
