using System;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

class Program
{
    static async Task Main(string[] args)
    {
        var httpClient = new HttpClient();
        string merchId = "618408";
        string userId = "618408";
        string password = "66651f50";
        string reqKey = "930C2FD59DFEF38B86650622FB17C839"; 
        string reqSalt = "930C2FD59DFEF38B86650622FB17C839"; 

        string merchantTxnId = "REG85_1782480242_cb811ad5";
        string cleanDate = "2026-06-26 18:51:35";
        
        string queryUrl = "https://payment1.atomtech.in/ots/payment/status";
        
        string[] apiValues = { "QUERY", "query", "STATUS", "status", "StatusCheck", "VERIFY", "verify", "transactionStatus", "TransactionStatus" };

        foreach (var apiVal in apiValues) 
        {
            Console.WriteLine("Testing apiName=" + apiVal);
            var payloadObj = new
            {
                payInstrument = new
                {
                    headDetails = new
                    {
                        version = "OTSv1.1",
                        apiName = apiVal,
                        platform = "FLASH"
                    },
                    merchDetails = new
                    {
                        merchId = merchId,
                        userId = userId, 
                        password = password,
                        merchTxnId = merchantTxnId,
                        merchTxnDate = cleanDate
                    },
                    payDetails = new
                    {
                        amount = "30.00"
                    }
                }
            };

            string payload = JsonSerializer.Serialize(payloadObj);
            string encPayload = Encrypt(payload, reqKey, reqSalt);

            var content = new StringContent(
                $"merchId={merchId}&encData={encPayload}",
                Encoding.UTF8,
                "application/x-www-form-urlencoded"
            );

            var response = await httpClient.PostAsync(queryUrl, content);
            string responseString = await response.Content.ReadAsStringAsync();
            
            if (responseString.Contains("encData="))
            {
                var parts = responseString.Split('&');
                foreach (var part in parts)
                {
                    if (part.StartsWith("encData="))
                    {
                        string dataToDecrypt = part.Substring("encData=".Length);
                        string reqKey2 = "DE7A7EA70744DC4E446C304E26A481A1"; 
                        string reqSalt2 = "DE7A7EA70744DC4E446C304E26A481A1"; 
                        try {
                            string decrypted = Decrypt(dataToDecrypt, reqKey2, reqSalt2);
                            Console.WriteLine("Decrypted for " + apiVal + ": " + decrypted);
                        } catch { }
                    }
                }
            } else {
                Console.WriteLine("Raw for " + apiVal + ": " + responseString);
            }
            await Task.Delay(200);
        }
    }

    static string Encrypt(string plainText, string passphrase, string salt)
    {
        byte[] iv = new byte[] { 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15 };
        var rij = GetSymmetricAlgorithm(passphrase, salt, iv, 65536);
        using (var encryptor = rij.CreateEncryptor(rij.Key, rij.IV))
        {
            var plainBytes = Encoding.UTF8.GetBytes(plainText);
            var cipherBytes = encryptor.TransformFinalBlock(plainBytes, 0, plainBytes.Length);
            return BitConverter.ToString(cipherBytes).Replace("-", "");
        }
    }

    static string Decrypt(string cipherText, string passphrase, string salt)
    {
        byte[] iv = new byte[] { 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15 };
        var rij = GetSymmetricAlgorithm(passphrase, salt, iv, 65536);
        using (var decryptor = rij.CreateDecryptor(rij.Key, rij.IV))
        {
            var cipherBytes = StringToByteArray(cipherText);
            var plainBytes = decryptor.TransformFinalBlock(cipherBytes, 0, cipherBytes.Length);
            return Encoding.UTF8.GetString(plainBytes);
        }
    }

    static SymmetricAlgorithm GetSymmetricAlgorithm(string passphrase, string salt, byte[] iv, int iterations)
    {
        var saltBytes = new byte[16];
        var ivBytes = new byte[16];
        using var rfcdb = new Rfc2898DeriveBytes(passphrase, Encoding.UTF8.GetBytes(salt), iterations, HashAlgorithmName.SHA512);
        saltBytes = rfcdb.GetBytes(32);
        Array.Copy(iv, ivBytes, Math.Min(ivBytes.Length, iv.Length));
        var rij = new RijndaelManaged();
        rij.Mode = CipherMode.CBC;
        rij.Padding = PaddingMode.PKCS7;
        rij.FeedbackSize = 128;
        rij.KeySize = 128;
        rij.BlockSize = 128;
        rij.Key = saltBytes;
        rij.IV = ivBytes;
        return rij;
    }

    static byte[] StringToByteArray(string hex)
    {
        int NumberChars = hex.Length;
        byte[] bytes = new byte[NumberChars / 2];
        for (int i = 0; i < NumberChars; i += 2)
            bytes[i / 2] = Convert.ToByte(hex.Substring(i, 2), 16);
        return bytes;
    }
}
