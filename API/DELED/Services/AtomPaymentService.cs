using System;
using System.IO;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;
using DELED.Data;
using DELED.Models;
using Azure;
using Newtonsoft.Json;

namespace DELED.Services
{
    public class AtomPaymentService : IAtomPaymentService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;
        private readonly AppDbContext _context;
        private readonly ILogger<AtomPaymentService> _logger;
        private readonly DatabaseLoggerService _databaseLogger;

        public AtomPaymentService(
            HttpClient httpClient,
            IConfiguration configuration,
            AppDbContext context,
            ILogger<AtomPaymentService> logger,
            DatabaseLoggerService databaseLogger)
        {
            _httpClient = httpClient;
            _configuration = configuration;
            _context = context;
            _logger = logger;
            _databaseLogger = databaseLogger;
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
            try
            {
                _logger.LogInformation("GenerateToken: Starting token generation for UserId: {UserId}, Amount: {Amount}", registrationId, amount);

                // Retrieve candidate details from DB for UDF mapping (as per production kit)
                var userReg = await _context.Users.FindAsync((int)registrationId);
                var personalDetails = await _context.UserPersonalDetails.FirstOrDefaultAsync(p => p.UserId == registrationId);
                string fullName = userReg?.FullName ?? "";
                string examType = personalDetails?.ExamTypeId.ToString() ?? "";

                // Generate unique merchantTxnId: REG{UserId}_{Timestamp}_{Random}
                var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
                var randomPart = Guid.NewGuid().ToString("N").Substring(0, 8);
                var merchantTxnId = $"REG{registrationId}_{timestamp}_{randomPart}";
                
                _logger.LogDebug("GenerateToken: Generated MerchantTxnId: {MerchantTxnId} for UserId: {UserId}", merchantTxnId, registrationId);

                var exactTimestamp = DELED.Helpers.TimeHelper.GetIST();
                var txnDateStr = exactTimestamp.ToString("yyyy-MM-dd HH:mm:ss");
                
                string payload = BuildPayload(merchantTxnId, amount, email, mobile, registrationId, fullName, examType, txnDateStr);
                _logger.LogDebug("GenerateToken: Payload created for MerchantTxnId: {MerchantTxnId}", merchantTxnId);

                var encryptedPayload = Encrypt(payload);
                _logger.LogDebug("GenerateToken: Payload encrypted successfully for MerchantTxnId: {MerchantTxnId}", merchantTxnId);

                var authUrl = _configuration["NTTData:AuthUrl"];
                var merchId = _configuration["NTTData:MerchantId"];
                var useMockMode = bool.TryParse(_configuration["NTTData:UseMockMode"], out var mock) && mock;
               
                // If mock mode enabled or no real credentials, simulate/return mock token
                if (useMockMode || string.IsNullOrEmpty(_configuration["NTTData:MerchantId"]))
                {
                    var mockToken = $"MOCK_TOKEN_{Guid.NewGuid().ToString("N").Substring(0, 10)}";
                    _logger.LogWarning("GenerateToken: Mock mode enabled - returning mock token for UserId: {UserId}, MerchantTxnId: {MerchantTxnId}", 
                        registrationId, merchantTxnId);
                    
                    _context.PaymentTransactions.Add(new PaymentTransaction
                    {
                        UserId = (int)registrationId,
                        MerchantTxnId = merchantTxnId,
                        AtomTxnId = "",
                        Status = "PENDING",
                        CreatedOn = exactTimestamp,
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

                _logger.LogInformation("GenerateToken: Sending auth request to Atom API for MerchantTxnId: {MerchantTxnId}", merchantTxnId);

                var response = await _httpClient.PostAsync(requestUrl, content);
                var responseString = await response.Content.ReadAsStringAsync();
                
                _logger.LogInformation("GenerateToken: Atom API response - StatusCode: {StatusCode}, MerchantTxnId: {MerchantTxnId}", 
                    (int)response.StatusCode, merchantTxnId);
                
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError("GenerateToken: Atom API error - StatusCode: {StatusCode}, Response: {Response}, MerchantTxnId: {MerchantTxnId}", 
                        (int)response.StatusCode, responseString, merchantTxnId);
                    throw new Exception($"Atom service returned {response.StatusCode}. Response: {responseString}");
                }
                
                var atomTokenId = ExtractToken(responseString);
                _logger.LogInformation("GenerateToken: Token generated successfully - AtomTokenId: {AtomTokenId}, MerchantTxnId: {MerchantTxnId}", 
                    atomTokenId, merchantTxnId);

                _context.PaymentTransactions.Add(new PaymentTransaction
                {
                    UserId = (int)registrationId,
                    MerchantTxnId = merchantTxnId,
                    AtomTxnId = "",
                    Status = "PENDING",
                    CreatedOn = exactTimestamp,
                    Amount = amount,
                    ResponseJson = responseString
                });

                await _context.SaveChangesAsync();
                return atomTokenId;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GenerateToken: Failed to generate token for UserId: {UserId}, Error: {Message}", registrationId, ex.Message);
                throw;
            }
        }
        public async Task<(bool isPaid, string statusCode, string message, string atomTxnId)> RequeryPayment(string merchantTxnId, string originalDate, decimal amount)
        {
            try
            {
                _logger.LogInformation("RequeryPayment: Starting requery for TxnId: {MerchantTxnId}, Date: {OriginalDate}", 
                    merchantTxnId, originalDate);

                var merchId = _configuration["NTTData:MerchantId"] ?? "";
                var userId = _configuration["NTTData:UserId"] ?? "";
                var password = _configuration["NTTData:Password"] ?? "";

                _logger.LogDebug("RequeryPayment: Config loaded - MerchantId: {MerchantId}", merchId);

                string extractedUserId = null;
                if (merchantTxnId != null && merchantTxnId.StartsWith("REG"))
                {
                    int underscoreIndex = merchantTxnId.IndexOf('_');
                    if (underscoreIndex > 3)
                    {
                        extractedUserId = merchantTxnId.Substring(3, underscoreIndex - 3);
                    }
                }

                string cleanDate = originalDate ?? "";

                // For exact integer amounts, JavaScriptSerializer serialized without decimals
                // and C# string concatenation used the number without decimals.
                long integerAmount = (long)amount;
                string amountStr = integerAmount.ToString();
                
                string reqHashKey = _configuration["NTTData:HashKey"] ?? "a87064e58d7287771a";
                string strsignature = merchId + password + merchantTxnId + amountStr + "INR" + "TXNVERIFICATION";
                byte[] keyBytes = Encoding.UTF8.GetBytes(reqHashKey);
                byte[] hashBytes = new System.Security.Cryptography.HMACSHA512(keyBytes).ComputeHash(Encoding.UTF8.GetBytes(strsignature));
                string signature = ByteArrayToHexString(hashBytes).ToLower();

                var payloadObj = new
                {
                    payInstrument = new
                    {
                        headDetails = new
                        {
                            api = "TXNVERIFICATION",
                            source = "OTS"
                        },
                        merchDetails = new
                        {
                            merchId = merchId,
                            password = password,
                            merchTxnId = merchantTxnId,
                            merchTxnDate = cleanDate
                        },
                        payDetails = new
                        {
                            amount = integerAmount,
                            txnCurrency = "INR",
                            signature = signature
                        }
                    }
                };

                string payload = JsonConvert.SerializeObject(payloadObj);
                
                // Read from config, if not present fallback to the one from requery.txt
                string queryUrl = _configuration["NTTData:QueryUrl"] ?? "https://paynetzuat.atomtech.in/ots/payment/status";
                if (queryUrl.Contains("/ots/v2/payment/status"))
                {
                    queryUrl = queryUrl.Replace("/ots/v2/payment/status", "/ots/payment/status");
                }

                string encryptedPayload;
                try
                {
                    encryptedPayload = Encrypt(payload);
                    _logger.LogDebug("RequeryPayment: Payload encrypted successfully");
                }
                catch (Exception encEx)
                {
                    await _databaseLogger.LogPaymentErrorAsync(
                        "RequeryPayment",
                        "0",
                        merchantTxnId,
                        $"Encryption failed: {encEx.Message}");
                    throw new Exception("Failed to encrypt requery payload", encEx);
                }

                _logger.LogInformation("RequeryPayment: Sending request to Atom API - TxnId: {MerchantTxnId}, URL: {QueryUrl}", merchantTxnId, queryUrl);

                var requestContent = new StringContent($"encData={encryptedPayload}&merchId={merchId}", Encoding.UTF8, "application/x-www-form-urlencoded");
                var response = await _httpClient.PostAsync(queryUrl, requestContent);

                _logger.LogInformation("RequeryPayment: Atom API response - Status: {StatusCode}, TxnId: {MerchantTxnId}", 
                    response.StatusCode, merchantTxnId);

                if (!response.IsSuccessStatusCode)
                {
                    string errorContent = await response.Content.ReadAsStringAsync();
                    
                    await _databaseLogger.LogPaymentErrorAsync(
                        "RequeryPayment",
                        "0",
                        merchantTxnId,
                        $"HTTP Error {response.StatusCode}: {errorContent}");
                        
                    _logger.LogWarning("RequeryPayment: HTTP error from Atom API - Status: {StatusCode}, TxnId: {MerchantTxnId}, Response: {Response}", 
                        response.StatusCode, merchantTxnId, errorContent);

                    if (response.StatusCode == System.Net.HttpStatusCode.Forbidden)
                    {
                        _logger.LogError("RequeryPayment: CRITICAL - HTTP 403 Forbidden from Atom API. This indicates a merchant credential issue. MerchantId: 618408, TxnId: {MerchantTxnId}", 
                            merchantTxnId);
                    }

                    _logger.LogWarning("RequeryPayment: Requery failed due to HTTP error for TxnId: {MerchantTxnId}", merchantTxnId);
                    
                    await _databaseLogger.LogPaymentErrorAsync(
                        "RequeryPayment",
                        "0",
                        merchantTxnId,
                        $"HTTP error {(int)response.StatusCode}");
                        
                    return (false, "HTTP_ERROR", $"HTTP error {(int)response.StatusCode}", null);
                }

                var content = await response.Content.ReadAsStringAsync();
                
                // Atom returns an HTML form in some cases, parse out encData
                string encData = "";
                var match = System.Text.RegularExpressions.Regex.Match(content, @"name=""encData""\s+value=""([^""]+)""");
                if (match.Success)
                {
                    encData = match.Groups[1].Value;
                }
                else if (content.Contains("encData="))
                {
                    var parts = content.Split('&');
                    foreach (var part in parts)
                    {
                        if (part.StartsWith("encData="))
                        {
                            encData = part.Substring("encData=".Length);
                            break;
                        }
                    }
                }
                else
                {
                    encData = content;
                }

                string decryptedResponse = encData;
                if (!string.IsNullOrEmpty(encData) && !encData.Trim().StartsWith("{"))
                {
                    try
                    {
                        _logger.LogDebug("RequeryPayment: Decrypting response for TxnId: {MerchantTxnId}", merchantTxnId);
                        
                        await _databaseLogger.LogPaymentEventAsync(
                            "RequeryPayment",
                            "Decrypting response",
                            "0",
                            merchantTxnId,
                            $"Encrypted length: {encData.Length}");
                            
                        decryptedResponse = Decrypt(encData);
                        _logger.LogDebug("RequeryPayment: Response decrypted successfully");
                    }
                    catch (Exception decryptEx)
                    {
                        _logger.LogError(decryptEx, "RequeryPayment: Decryption error for TxnId: {MerchantTxnId}", merchantTxnId);
                        
                        await _databaseLogger.LogPaymentErrorAsync(
                            "RequeryPayment",
                            "0",
                            merchantTxnId,
                            $"Decryption failed: {decryptEx.Message}");
                            
                        return (false, "DECRYPT_ERROR", "Failed to decrypt response", null);
                    }
                }

                string statusCode = null;
                string message = null;
                string description = null;
                string parsedAtomTxnId = null;

                try
                {
                    var jObj = Newtonsoft.Json.Linq.JObject.Parse(decryptedResponse);
                    
                    // Navigate to payInstrument structure
                    var payInstrumentToken = jObj["payInstrument"];
                    Newtonsoft.Json.Linq.JObject firstInstrument = null;

                    if (payInstrumentToken is Newtonsoft.Json.Linq.JArray instrArray && instrArray.Count > 0)
                    {
                        // Check all instruments for a success status
                        foreach (Newtonsoft.Json.Linq.JObject instr in instrArray)
                        {
                            string tempStatusCode = null;
                            var rd = instr["responseDetails"] as Newtonsoft.Json.Linq.JObject;
                            if (rd != null)
                            {
                                tempStatusCode = rd["statusCode"]?.ToString() ?? rd["code"]?.ToString();
                            }
                            else
                            {
                                tempStatusCode = instr["statusCode"]?.ToString() ?? instr["code"]?.ToString();
                            }

                            if (tempStatusCode == "OTS0000" || tempStatusCode == "OTS0002")
                            {
                                firstInstrument = instr;
                                break; // Found a success, stop looking
                            }
                        }
                    }
                    else if (payInstrumentToken is Newtonsoft.Json.Linq.JObject instrObj)
                    {
                        firstInstrument = instrObj;
                    }

                    if (firstInstrument != null)
                    {
                        var rd = firstInstrument["responseDetails"] as Newtonsoft.Json.Linq.JObject;
                        if (rd != null)
                        {
                            statusCode = rd["statusCode"]?.ToString() ?? rd["code"]?.ToString();
                            message = rd["message"]?.ToString();
                            description = rd["description"]?.ToString() ?? rd["status"]?.ToString();
                        }
                        else
                        {
                            // responseDetails not nested - try direct fields
                            statusCode = firstInstrument["statusCode"]?.ToString() ?? firstInstrument["code"]?.ToString();
                            message = firstInstrument["message"]?.ToString();
                            description = firstInstrument["description"]?.ToString() ?? firstInstrument["status"]?.ToString();
                        }
                        
                        var pd = firstInstrument["payDetails"] as Newtonsoft.Json.Linq.JObject;
                        if (pd != null)
                        {
                            parsedAtomTxnId = pd["atomTxnId"]?.ToString();
                        }
                        else
                        {
                            parsedAtomTxnId = firstInstrument["atomTxnId"]?.ToString();
                        }
                    }

                    // Fallback: check top-level status fields if still null
                    if (statusCode == null)
                    {
                        statusCode = jObj["statusCode"]?.ToString() ?? jObj["code"]?.ToString();
                        message = jObj["message"]?.ToString();
                        description = jObj["description"]?.ToString() ?? jObj["status"]?.ToString();
                        parsedAtomTxnId = jObj["atomTxnId"]?.ToString() ?? parsedAtomTxnId;
                    }
                }
                catch (Exception parseEx)
                {
                    _logger.LogWarning(parseEx, "RequeryPayment: Warning parsing response for TxnId: {MerchantTxnId}, Raw: {Raw}", merchantTxnId, decryptedResponse);
                }

                _logger.LogInformation("RequeryPayment: Requery result - StatusCode: {StatusCode}, Message: {Message}, TxnId: {MerchantTxnId}", 
                    statusCode, message, merchantTxnId);

                // OTS0000 is regular success, OTS0002 is force success (e.g. from reconciliation)
                bool success = statusCode == "OTS0000" || statusCode == "OTS0002";

                if (success)
                {
                    _logger.LogInformation("RequeryPayment: Payment verified successfully - TxnId: {MerchantTxnId}", merchantTxnId);
                }
                else
                {
                    _logger.LogWarning("RequeryPayment: Payment not verified - StatusCode: {StatusCode}, TxnId: {MerchantTxnId}", 
                        statusCode, merchantTxnId);
                }

                await _databaseLogger.LogPaymentEventAsync(
                    "RequeryPayment",
                    success ? "Payment verified successfully" : "Payment not verified",
                    "0",
                    merchantTxnId,
                    $"StatusCode: {statusCode}, Message: {message}");

                return (success, statusCode ?? "UNKNOWN", description ?? message ?? "Unknown status", parsedAtomTxnId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "RequeryPayment: Unexpected error - MerchantTxnId: {MerchantTxnId}, Error: {Message}", 
                    merchantTxnId, ex.Message);
                    
                await _databaseLogger.LogPaymentErrorAsync(
                    "RequeryPayment",
                    "0",
                    merchantTxnId,
                    ex.Message);
                    
                return (false, "EXCEPTION", ex.Message, null);
            }
        }
        private string BuildPayload(string merchantTxnId, decimal amount, string email, string mobile, long registrationId, string fullName, string examType, string txnDate)
        {
            var merchId = _configuration["NTTData:MerchantId"] ?? "";
            var userId = _configuration["NTTData:UserId"] ?? "";
            var password = _configuration["NTTData:Password"] ?? "";

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
