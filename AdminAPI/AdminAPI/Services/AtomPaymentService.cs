using System;
using System.IO;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.EntityFrameworkCore;
using DELED.Data;
using DELED.Models;
using Newtonsoft.Json;

namespace DELED.Services
{
    public class AtomPaymentService : IAtomPaymentService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;
        private readonly AppDbContext _context;

        public AtomPaymentService(
            HttpClient httpClient,
            IConfiguration configuration,
            AppDbContext context)
        {
            _httpClient = httpClient;
            _configuration = configuration;
            _context = context;
        }

        private byte[] GetAtomIV()
        {
            return new byte[] { 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15 };
        }

        public string Encrypt(string plainText)
        {
            string passphrase = _configuration["NTTData:Passphrase"] ;
            string salt = _configuration["NTTData:Salt"];
            int.TryParse(_configuration["NTTData:Iterations"], out int iterations);
            byte[] iv = GetAtomIV();
            
            var plainBytes = Encoding.UTF8.GetBytes(plainText);
            byte[] encryptedBytes = Encrypt(plainBytes, GetSymmetricAlgorithm(passphrase, salt, iv, iterations));
            return ByteArrayToHexString(encryptedBytes).ToUpper();
        }

        public string Decrypt(string cipherText)
        {
            string passphrase = _configuration["NTTData:Passphrase1"];
            string salt = _configuration["NTTData:Salt1"];
            int.TryParse(_configuration["NTTData:Iterations"], out int iterations);
            byte[] iv = GetAtomIV();

            byte[] cipherBytes = HexStringToByte(cipherText);
            byte[] decryptedBytes = Decrypt(cipherBytes, GetSymmetricAlgorithm(passphrase, salt, iv, iterations));
            return Encoding.UTF8.GetString(decryptedBytes);
        }

        private byte[] Encrypt(byte[] plainBytes, SymmetricAlgorithm sa)
        {
            using (var encryptor = sa.CreateEncryptor())
            {
                return encryptor.TransformFinalBlock(plainBytes, 0, plainBytes.Length);
            }
        }

        private byte[] Decrypt(byte[] cipherBytes, SymmetricAlgorithm sa)
        {
            using (var decryptor = sa.CreateDecryptor())
            {
                return decryptor.TransformFinalBlock(cipherBytes, 0, cipherBytes.Length);
            }
        }

        private SymmetricAlgorithm GetSymmetricAlgorithm(
     string passphrase,
     string salt,
     byte[] iv,
     int iterations)
        {
            var saltBytes = new byte[16];
            var ivBytes = new byte[16];

            using var rfcdb = new Rfc2898DeriveBytes(
                passphrase,
                Encoding.UTF8.GetBytes(salt),
                iterations,
                HashAlgorithmName.SHA512);

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

        public async Task<string> GenerateToken(
            long registrationId,
            decimal amount,
            string email,
            string mobile)
        {
            // Retrieve candidate details from DB for UDF mapping (as per production kit)
            var userReg = await _context.Users.FindAsync((int)registrationId);
            var personalDetails = await _context.UserPersonalDetails.FirstOrDefaultAsync(p => p.UserId == registrationId);
            string fullName = userReg?.FullName ?? "";
            string examType = personalDetails?.ExamTypeId.ToString() ?? "";

            // Generate unique merchantTxnId: REG{UserId}_{Timestamp}_{Random}
            var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            var randomPart = Guid.NewGuid().ToString("N").Substring(0, 8);
            var merchantTxnId = $"REG{registrationId}_{timestamp}_{randomPart}";
            
            var payload = BuildPayload(merchantTxnId, amount, email, mobile, registrationId, fullName, examType);
            Console.WriteLine("========== PAYLOAD ==========");
            Console.WriteLine(payload);
            var encryptedPayload = Encrypt(payload);
            Console.WriteLine("ENC:");
            Console.WriteLine(encryptedPayload);
            var authUrl = _configuration["NTTData:AuthUrl"];
            var merchId = _configuration["NTTData:MerchantId"];
            var useMockMode = bool.TryParse(_configuration["NTTData:UseMockMode"], out var mock) && mock;
           
            // If mock mode enabled or no real credentials, simulate/return mock token
            if (useMockMode || string.IsNullOrEmpty(_configuration["NTTData:MerchantId"]))
            {
                var mockToken = $"MOCK_TOKEN_{Guid.NewGuid().ToString("N").Substring(0, 10)}";
                
                _context.PaymentTransactions.Add(new PaymentTransaction
                {
                    UserId = (int)registrationId,
                    MerchantTxnId = merchantTxnId,
                    AtomTxnId = "",
                    Status = "PENDING",
                    CreatedOn = DateTime.Now,
                    ResponseJson = "MOCK_INITIATED"
                });
                await _context.SaveChangesAsync();
                return mockToken;
            }

            // Atom AUTH: encData goes in the query string; the raw JSON payload is POSTed as the
            // application/json body. This matches the official Atom sample (Default.aspx.cs).
            var requestUrl = $"{authUrl}?merchId={merchId}&encData={encryptedPayload}";
            _httpClient.DefaultRequestHeaders.ExpectContinue = false;
            var content = new StringContent(payload, Encoding.UTF8);
            content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/json");

            try
            {
                var response = await _httpClient.PostAsync(requestUrl, content);
                var responseString = await response.Content.ReadAsStringAsync();
                Console.WriteLine($"StatusCode={response.StatusCode}");
                Console.WriteLine($"Response={responseString}");
                
                if (!response.IsSuccessStatusCode)
                {
                    throw new Exception($"Atom service returned {response.StatusCode}. Response: {responseString}");
                }
                
                var atomTokenId = ExtractToken(responseString);

                _context.PaymentTransactions.Add(new PaymentTransaction
                {
                    UserId = (int)registrationId,
                    MerchantTxnId = merchantTxnId,
                    AtomTxnId = "",
                    Status = "PENDING",
                    CreatedOn = DateTime.Now,
                    ResponseJson = responseString
                });

                await _context.SaveChangesAsync();
                return atomTokenId;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] GenerateToken failed: {ex.Message}");
                throw;
            }
        }
        public async Task<bool> RequeryPayment(string merchantTxnId, string originalDate)
        {
            try
            {
                Console.WriteLine("====================================");
                Console.WriteLine("REQUERY START");
                Console.WriteLine("====================================");

                var merchId = _configuration["NTTData:MerchantId"] ?? "";
                var userId = _configuration["NTTData:UserId"] ?? "";
                var password = _configuration["NTTData:Password"] ?? "";

                Console.WriteLine($"MerchantTxnId = {merchantTxnId}");
                Console.WriteLine($"OriginalDate  = {originalDate}");

                string cleanDate = originalDate ?? "";
                if (cleanDate.Contains("T"))
                {
                    cleanDate = cleanDate.Replace("T", " ");
                }

                var payloadObj = new
                {
                    payInstrument = new
                    {
                        headDetails = new
                        {
                            version = "OTSv1.1",
                            api = "STATUS",
                        },
                        merchDetails = new
                        {
                            merchId = merchId,
                            userId = userId,
                            password = password,
                            merchTxnId = merchantTxnId,
                            merchTxnDate = cleanDate
                        }
                    }
                };

                string payload = JsonConvert.SerializeObject(payloadObj);

                Console.WriteLine("===== REQUERY PAYLOAD =====");
                Console.WriteLine(payload);

                string encryptedPayload = Encrypt(payload);

                Console.WriteLine("===== REQUERY ENC DATA =====");
                Console.WriteLine(encryptedPayload);

                string queryUrl =
                    _configuration["NTTData:QueryUrl"]
                    ?? "https://paynetzuat.atomtech.in/ots/v2/payment/status";

                Console.WriteLine("===== REQUERY URL =====");
                Console.WriteLine(queryUrl);

                var postData = new List<KeyValuePair<string, string>>
                {
                    new KeyValuePair<string, string>("merchId", merchId.ToString()),
                    new KeyValuePair<string, string>("encData", encryptedPayload)
                };
                var content = new FormUrlEncodedContent(postData);

                var response = await _httpClient.PostAsync(queryUrl, content);

                Console.WriteLine("===== HTTP STATUS =====");
                Console.WriteLine((int)response.StatusCode);
                Console.WriteLine(response.StatusCode);

                string responseString =
                    await response.Content.ReadAsStringAsync();

                Console.WriteLine("===== RAW RESPONSE =====");
                Console.WriteLine(responseString);

                if (!response.IsSuccessStatusCode)
                {
                    Console.WriteLine("REQUERY FAILED - HTTP ERROR");
                    return false;
                }

                string decryptedResponse = responseString;

                try
                {
                    string trimmed = responseString.TrimStart();
                    if (!trimmed.StartsWith("{") && !trimmed.StartsWith("["))
                    {
                        Console.WriteLine("Decrypting Requery Response...");
                        decryptedResponse = Decrypt(responseString);
                        Console.WriteLine("===== DECRYPTED RESPONSE =====");
                        Console.WriteLine(decryptedResponse);
                    }
                }
                catch (Exception decryptEx)
                {
                    Console.WriteLine("===== DECRYPT ERROR =====");
                    Console.WriteLine(decryptEx.ToString());
                    return false;
                }

                dynamic responseObj =
                    JsonConvert.DeserializeObject<dynamic>(decryptedResponse);

                string statusCode = null;
                string message = null;
                string description = null;

                if (responseObj is Newtonsoft.Json.Linq.JArray || (responseObj != null && responseObj.Type == Newtonsoft.Json.Linq.JTokenType.Array))
                {
                    var firstItem = responseObj[0];
                    statusCode = firstItem?.responseDetails?.code?.ToString() ?? firstItem?.responseDetails?.statusCode?.ToString();
                    message = firstItem?.responseDetails?.message?.ToString();
                    description = firstItem?.responseDetails?.description?.ToString() ?? firstItem?.responseDetails?.status?.ToString();
                }
                else
                {
                    statusCode = responseObj?.payInstrument?.responseDetails?.statusCode?.ToString();
                    message = responseObj?.payInstrument?.responseDetails?.message?.ToString();
                    description = responseObj?.payInstrument?.responseDetails?.description?.ToString();
                }

                Console.WriteLine("===== REQUERY RESULT =====");
                Console.WriteLine($"StatusCode  = {statusCode}");
                Console.WriteLine($"Message     = {message}");
                Console.WriteLine($"Description = {description}");

                bool success = statusCode == "OTS0000";

                Console.WriteLine($"FINAL RESULT = {success}");

                Console.WriteLine("====================================");
                Console.WriteLine("REQUERY END");
                Console.WriteLine("====================================");

                return success;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] Requery failed: {ex.Message}");
                return false;
            }
        }
        private string BuildPayload(string merchantTxnId, decimal amount, string email, string mobile, long registrationId, string fullName, string examType)
        {
            var merchId = _configuration["NTTData:MerchantId"] ?? "";
            var userId = _configuration["NTTData:UserId"] ?? "";
            var password = _configuration["NTTData:Password"] ?? "";
            var txnDate = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");

            var payloadObj = new
            {
                payInstrument = new
                {
                    headDetails = new
                    {
                        version = "OTSv1.1",
                        api = "AUTH",
                        platform = "FLASH"
                    },
                    merchDetails = new
                    {
                        merchId = merchId,
                        userId = merchId, // Set to merchant ID as in the ASPX production kit
                        password = password,
                        merchTxnId = merchantTxnId,
                        merchTxnDate = txnDate
                    },
                    payDetails = new
                    {
                        amount = amount.ToString("F2"),
                        product = "SCHOOL", // Set to "SCHOOL" as in the ASPX production kit
                        custAccNo = registrationId.ToString(), // Set to registration ID as in the ASPX production kit
                        txnCurrency = "INR",
                    },
                    custDetails = new
                    {
                        custEmail = email,
                        custMobile = mobile,
                    },
                    extras = new
                    {
                        udf1 = mobile,
                        udf2 = fullName,
                        udf3 = examType,
                        udf4 = registrationId.ToString(),
                        udf5 = ""
                    }
                }
            };
            var json = JsonConvert.SerializeObject(payloadObj);

          
            return json;
        }

        private string ExtractToken(string responseString)
        {
            try
            {
                // 1. Parse query string like old MVC code
                var uri = new Uri("http://atom.in?" + responseString);
                var query = System.Web.HttpUtility.ParseQueryString(uri.Query);

                var encData = query["encData"];

                if (string.IsNullOrEmpty(encData))
                    throw new Exception("encData not found in Atom response");

                // 2. Decrypt (same as old code)
                string passphrase = _configuration["NTTData:Passphrase1"];
                string salt = _configuration["NTTData:Salt1"];
                int iterations = int.Parse(_configuration["NTTData:Iterations"]);

                byte[] iv = GetAtomIV();

                var decryptedJson = Decrypt(encData);

                Console.WriteLine("DECRYPTED RESPONSE:");
                Console.WriteLine(decryptedJson);

                // 3. Deserialize
                var obj = JsonConvert.DeserializeObject<dynamic>(decryptedJson);

                return obj?.atomTokenId;
            }
            catch (Exception ex)
            {
                throw new Exception($"Atom parsing failed: {responseString}", ex);
            }
        }

        private static byte[] HexStringToByte(string hexString)
        {
            int bytesCount = hexString.Length / 2;
            byte[] bytes = new byte[bytesCount];
            for (int x = 0; x < bytesCount; ++x)
            {
                bytes[x] = Convert.ToByte(hexString.Substring(x * 2, 2), 16);
            }
            return bytes;
        }

        private static string ByteArrayToHexString(byte[] ba)
        {
            var hex = new StringBuilder(ba.Length * 2);
            foreach (byte b in ba)
                hex.AppendFormat("{0:x2}", b);
            return hex.ToString();
        }
    }
}
