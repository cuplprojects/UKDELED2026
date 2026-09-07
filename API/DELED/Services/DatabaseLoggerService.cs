using System;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;
using DELED.Data;
using DELED.Models;
using Microsoft.AspNetCore.Http;

namespace DELED.Services
{
    /// <summary>
    /// Custom logger service that stores logs in DbEventLog and DbErrorLog tables
    /// </summary>
    public class DatabaseLoggerService
    {
        private readonly IDbContextFactory<AppDbContext> _contextFactory;
        private readonly ILogger<DatabaseLoggerService> _logger;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public DatabaseLoggerService(
            IDbContextFactory<AppDbContext> contextFactory,
            ILogger<DatabaseLoggerService> logger,
            IHttpContextAccessor httpContextAccessor)
        {
            _contextFactory = contextFactory;
            _logger = logger;
            _httpContextAccessor = httpContextAccessor;
        }

        private string? GetClientIpAddress()
        {
            try
            {
                var context = _httpContextAccessor.HttpContext;
                if (context == null) return null;

                string? ip = null;

                // 1. x-public-ip: A custom public IP header
                if (context.Request.Headers.TryGetValue("x-public-ip", out var publicIpHeader))
                {
                    var tempIp = publicIpHeader.ToString().Trim();
                    if (!string.IsNullOrEmpty(tempIp))
                    {
                        ip = tempIp;
                    }
                }

                // 2. x-client-ip: Retain frontend client-side IP header support
                if (string.IsNullOrEmpty(ip) && context.Request.Headers.TryGetValue("x-client-ip", out var clientIpHeader))
                {
                    var tempIp = clientIpHeader.ToString().Trim();
                    if (!string.IsNullOrEmpty(tempIp))
                    {
                        ip = tempIp;
                    }
                }

                // 3. x-forwarded-for: Standard proxy/load-balancer header (extract first IP)
                if (string.IsNullOrEmpty(ip) && context.Request.Headers.TryGetValue("x-forwarded-for", out var forwardedFor))
                {
                    var ipList = forwardedFor.ToString();
                    if (!string.IsNullOrEmpty(ipList))
                    {
                        var clientIp = ipList.Split(',')[0].Trim();
                        if (!string.IsNullOrEmpty(clientIp))
                        {
                            ip = clientIp;
                        }
                    }
                }

                // 4. x-real-ip: Standard proxy header
                if (string.IsNullOrEmpty(ip) && context.Request.Headers.TryGetValue("x-real-ip", out var realIp))
                {
                    var tempIp = realIp.ToString().Trim();
                    if (!string.IsNullOrEmpty(tempIp))
                    {
                        ip = tempIp;
                    }
                }

                // 5. cf-connecting-ip: Cloudflare original IP header
                if (string.IsNullOrEmpty(ip) && context.Request.Headers.TryGetValue("cf-connecting-ip", out var cfConnectingIp))
                {
                    var tempIp = cfConnectingIp.ToString().Trim();
                    if (!string.IsNullOrEmpty(tempIp))
                    {
                        ip = tempIp;
                    }
                }

                // 6. true-client-ip: Enterprise CDN header (Akamai, Cloudflare Enterprise)
                if (string.IsNullOrEmpty(ip) && context.Request.Headers.TryGetValue("true-client-ip", out var trueClientIp))
                {
                    var tempIp = trueClientIp.ToString().Trim();
                    if (!string.IsNullOrEmpty(tempIp))
                    {
                        ip = tempIp;
                    }
                }

                if (string.IsNullOrEmpty(ip))
                {
                    // Fallback to connection remote IP
                    ip = context.Connection.RemoteIpAddress?.ToString();
                }

                // Normalize localhost loopback IPv6 (::1) and IPv4-mapped IPv6 (::ffff:127.0.0.1)
                if (ip == "::1" || ip == "127.0.0.1")
                {
                    ip = GetLocalIpAddress();
                }
                else if (!string.IsNullOrEmpty(ip) && ip.StartsWith("::ffff:"))
                {
                    ip = ip.Substring(7);
                    if (ip == "127.0.0.1")
                    {
                        ip = GetLocalIpAddress();
                    }
                }

                return ip;
            }
            catch
            {
                return null;
            }
        }

        private string GetLocalIpAddress()
        {
            try
            {
                // Query active, operational interfaces to mimic ipconfig behavior
                foreach (var netInterface in System.Net.NetworkInformation.NetworkInterface.GetAllNetworkInterfaces())
                {
                    if (netInterface.OperationalStatus == System.Net.NetworkInformation.OperationalStatus.Up &&
                        netInterface.NetworkInterfaceType != System.Net.NetworkInformation.NetworkInterfaceType.Loopback &&
                        netInterface.NetworkInterfaceType != System.Net.NetworkInformation.NetworkInterfaceType.Tunnel)
                    {
                        var ipProps = netInterface.GetIPProperties();
                        
                        // Gateway configuration usually indicates the active primary network adapter
                        if (ipProps.GatewayAddresses.Count > 0)
                        {
                            foreach (var addrInfo in ipProps.UnicastAddresses)
                            {
                                if (addrInfo.Address.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork)
                                {
                                    return addrInfo.Address.ToString();
                                }
                            }
                        }
                    }
                }

                // Fallback to basic DNS entry if no gateway interface is resolved
                var host = System.Net.Dns.GetHostEntry(System.Net.Dns.GetHostName());
                foreach (var address in host.AddressList)
                {
                    if (address.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork)
                    {
                        return address.ToString();
                    }
                }
            }
            catch
            {
                // Ignore
            }
            return "127.0.0.1";
        }

        /// <summary>
        /// Log an event (Information, Debug, Warning level)
        /// </summary>
        public async Task LogEventAsync(
            string method,
            string path,
            string message,
            string? queryString = null,
            string? headers = null,
            string? body = null,
            string? userId = null,
            string? ipAddress = null)
        {
            try
            {
                using (var context = _contextFactory.CreateDbContext())
                {
                    var eventLog = new DbEventLog
                    {
                        Method = method,
                        Path = path,
                        Message = message,
                        QueryString = queryString,
                        Headers = headers,
                        Body = body,
                        UserId = userId,
                        IpAddress = ipAddress ?? GetClientIpAddress(),
                        Timestamp = DELED.Helpers.TimeHelper.GetIST()
                    };

                    context.DbEventLogs.Add(eventLog);
                    int result = await context.SaveChangesAsync();
                    _logger.LogInformation("DatabaseLoggerService: Event logged successfully. Method: {Method}, Records saved: {RecordCount}", method, result);
                    Console.WriteLine($"[DB_LOG_SUCCESS] LogEvent - Method: {method}, Records: {result}");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "DatabaseLoggerService: Error logging event. Method: {Method}, Exception: {Exception}", method, ex.Message);
                Console.WriteLine($"[DB_LOG_ERROR] LogEvent - Method: {method}, Error: {ex.Message}, Stack: {ex.StackTrace}");
            }
        }

        /// <summary>
        /// Log an error (Error level)
        /// </summary>
        public async Task LogErrorAsync(
            string method,
            string path,
            string message,
            string? stackTrace = null,
            string? innerException = null,
            int? statusCode = null,
            string? queryString = null)
        {
            try
            {
                using (var context = _contextFactory.CreateDbContext())
                {
                    var errorLog = new DbErrorLog
                    {
                        Method = method,
                        Path = path,
                        Message = message,
                        StackTrace = stackTrace,
                        InnerException = innerException,
                        StatusCode = statusCode,
                        QueryString = queryString,
                        Timestamp = DELED.Helpers.TimeHelper.GetIST()
                    };

                    context.DbErrorLogs.Add(errorLog);
                    int result = await context.SaveChangesAsync();
                    _logger.LogInformation("DatabaseLoggerService: Error logged successfully. Method: {Method}, Records saved: {RecordCount}", method, result);
                    Console.WriteLine($"[DB_LOG_SUCCESS] LogError - Method: {method}, Records: {result}");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "DatabaseLoggerService: Error logging error. Method: {Method}, Exception: {Exception}", method, ex.Message);
                Console.WriteLine($"[DB_LOG_ERROR] LogError - Method: {method}, Error: {ex.Message}, Stack: {ex.StackTrace}");
            }
        }

        /// <summary>
        /// Log payment-related event
        /// </summary>
        public async Task LogPaymentEventAsync(
            string method,
            string message,
            string? userId = null,
            string? transactionId = null,
            string? additionalInfo = null,
            string? ipAddress = null)
        {
            try
            {
                Console.WriteLine($"[DB_LOG_START] LogPaymentEventAsync - Method: {method}, UserId: {userId}, TxnId: {transactionId}");
                
                using (var context = _contextFactory.CreateDbContext())
                {
                    var eventLog = new DbEventLog
                    {
                        Method = method,
                        Path = "/api/payment",
                        Message = $"{message} | TxnId: {transactionId} | Info: {additionalInfo}",
                        UserId = userId,
                        IpAddress = ipAddress ?? GetClientIpAddress(),
                        Timestamp = DELED.Helpers.TimeHelper.GetIST()
                    };

                    context.DbEventLogs.Add(eventLog);
                    
                    // Check context state before saving
                    Console.WriteLine($"[DB_CONTEXT_STATE] DbEventLogs - Entries before save: {context.DbEventLogs.Local.Count}");
                    Console.WriteLine($"[DB_CONTEXT_STATE] Tracked entities: {context.ChangeTracker.Entries().Count()}");
                    
                    int result = await context.SaveChangesAsync();
                    
                    _logger.LogInformation("DatabaseLoggerService: Payment event logged successfully. Method: {Method}, UserId: {UserId}, TxnId: {TxnId}, Records saved: {RecordCount}", 
                        method, userId, transactionId, result);
                    Console.WriteLine($"[DB_LOG_SUCCESS] LogPaymentEventAsync - Method: {method}, UserId: {userId}, Records: {result}");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "DatabaseLoggerService: Error logging payment event. Method: {Method}, UserId: {UserId}, TxnId: {TxnId}, Exception: {Exception}", 
                    method, userId, transactionId, ex.Message);
                Console.WriteLine($"[DB_LOG_ERROR] LogPaymentEventAsync - Method: {method}, UserId: {userId}, TxnId: {transactionId}, Error: {ex.Message}, Stack: {ex.StackTrace}");
                
                // Also log inner exceptions
                Exception? inner = ex.InnerException;
                int level = 1;
                while (inner != null)
                {
                    Console.WriteLine($"[DB_LOG_INNER_{level}] {inner.Message}: {inner.StackTrace}");
                    inner = inner.InnerException;
                    level++;
                }
            }
        }

        /// <summary>
        /// Log payment-related error
        /// </summary>
        public async Task LogPaymentErrorAsync(
            string method,
            string message,
            string? userId = null,
            string? transactionId = null,
            string? stackTrace = null,
            int? statusCode = null)
        {
            try
            {
                Console.WriteLine($"[DB_LOG_START] LogPaymentErrorAsync - Method: {method}, UserId: {userId}, TxnId: {transactionId}");
                
                using (var context = _contextFactory.CreateDbContext())
                {
                    var errorLog = new DbErrorLog
                    {
                        Method = method,
                        Path = "/api/payment",
                        Message = $"{message} | TxnId: {transactionId}",
                        StackTrace = stackTrace,
                        StatusCode = statusCode,
                        Timestamp = DELED.Helpers.TimeHelper.GetIST()
                    };

                    context.DbErrorLogs.Add(errorLog);
                    
                    // Check context state before saving
                    Console.WriteLine($"[DB_CONTEXT_STATE] DbErrorLogs - Entries before save: {context.DbErrorLogs.Local.Count}");
                    Console.WriteLine($"[DB_CONTEXT_STATE] Tracked entities: {context.ChangeTracker.Entries().Count()}");
                    
                    int result = await context.SaveChangesAsync();
                    
                    _logger.LogInformation("DatabaseLoggerService: Payment error logged successfully. Method: {Method}, UserId: {UserId}, TxnId: {TxnId}, Records saved: {RecordCount}", 
                        method, userId, transactionId, result);
                    Console.WriteLine($"[DB_LOG_SUCCESS] LogPaymentErrorAsync - Method: {method}, UserId: {userId}, Records: {result}");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "DatabaseLoggerService: Error logging payment error. Method: {Method}, UserId: {UserId}, TxnId: {TxnId}, Exception: {Exception}", 
                    method, userId, transactionId, ex.Message);
                Console.WriteLine($"[DB_LOG_ERROR] LogPaymentErrorAsync - Method: {method}, UserId: {userId}, TxnId: {transactionId}, Error: {ex.Message}, Stack: {ex.StackTrace}");
                
                // Also log inner exceptions
                Exception? inner = ex.InnerException;
                int level = 1;
                while (inner != null)
                {
                    Console.WriteLine($"[DB_LOG_INNER_{level}] {inner.Message}: {inner.StackTrace}");
                    inner = inner.InnerException;
                    level++;
                }
            }
        }
    }
}
