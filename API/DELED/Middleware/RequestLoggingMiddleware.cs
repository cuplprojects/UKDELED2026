using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using System;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using System.Security.Claims;
using DELED.Data;
using DELED.Models;

namespace DELED.Middleware
{
    public class RequestLoggingMiddleware
    {
        private readonly RequestDelegate _next;
        private static readonly string[] SensitiveHeaders = { "Authorization", "Cookie", "X-Auth-Token", "Token" };

        public RequestLoggingMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            var method = context.Request.Method;

            // Buffer request so body can be read and still processed by downstream controllers
            if (string.Equals(method, "POST", StringComparison.OrdinalIgnoreCase) || 
                string.Equals(method, "PUT", StringComparison.OrdinalIgnoreCase) || 
                string.Equals(method, "PATCH", StringComparison.OrdinalIgnoreCase))
            {
                context.Request.EnableBuffering();
                
                string requestBody = string.Empty;
                using (var reader = new StreamReader(context.Request.Body, Encoding.UTF8, detectEncodingFromByteOrderMarks: false, leaveOpen: true))
                {
                    requestBody = await reader.ReadToEndAsync();
                    context.Request.Body.Position = 0; // Reset stream position
                }

                await LogEventToDbAsync(context, requestBody);
            }

            try
            {
                await _next(context);

                if (context.Response.StatusCode >= 400)
                {
                    await LogResponseErrorToDbAsync(context);
                }
            }
            catch (Exception ex)
            {
                await LogExceptionToDbAsync(context, ex);
                throw;
            }
        }

        private async Task LogEventToDbAsync(HttpContext context, string body)
        {
            try
            {
                var dbContext = context.RequestServices.GetRequiredService<AppDbContext>();
                var userId = ExtractUserIdFromContext(context);

                var eventLog = new DbEventLog
                {
                    Timestamp = DELED.Helpers.TimeHelper.GetIST(),
                    Method = context.Request.Method,
                    Path = context.Request.Path,
                    QueryString = context.Request.QueryString.ToString(),
                    Headers = FormatHeaders(context.Request.Headers),
                    Body = body,
                    UserId = userId,
                    IpAddress = GetClientIpAddress(context)
                };

                dbContext.DbEventLogs.Add(eventLog);
                await dbContext.SaveChangesAsync();
            }
            catch (Exception)
            {
                // Suppress logging errors to avoid failing the main request
            }
        }

        private string GetClientIpAddress(HttpContext context)
        {
            string ip = "";
            try
            {
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
            }
            catch
            {
                // Ignore headers extraction issues
            }

            if (string.IsNullOrEmpty(ip))
            {
                // Fallback to connection remote IP
                ip = context.Connection.RemoteIpAddress?.ToString() ?? "";
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

        private async Task LogExceptionToDbAsync(HttpContext context, Exception ex)
        {
            try
            {
                var dbContext = context.RequestServices.GetRequiredService<AppDbContext>();
                var errorLog = new DbErrorLog
                {
                    Timestamp = DELED.Helpers.TimeHelper.GetIST(),
                    Method = context.Request.Method,
                    Path = context.Request.Path,
                    QueryString = context.Request.QueryString.ToString(),
                    StatusCode = 500,
                    Message = ex.Message,
                    StackTrace = ex.StackTrace,
                    InnerException = ex.InnerException?.Message
                };

                dbContext.DbErrorLogs.Add(errorLog);
                await dbContext.SaveChangesAsync();
            }
            catch (Exception)
            {
                // Suppress logging errors
            }
        }

        private async Task LogResponseErrorToDbAsync(HttpContext context)
        {
            try
            {
                var dbContext = context.RequestServices.GetRequiredService<AppDbContext>();
                var errorLog = new DbErrorLog
                {
                    Timestamp = DELED.Helpers.TimeHelper.GetIST(),
                    Method = context.Request.Method,
                    Path = context.Request.Path,
                    QueryString = context.Request.QueryString.ToString(),
                    StatusCode = context.Response.StatusCode,
                    Message = $"HTTP Request failed with status code {context.Response.StatusCode}",
                    StackTrace = null,
                    InnerException = null
                };

                dbContext.DbErrorLogs.Add(errorLog);
                await dbContext.SaveChangesAsync();
            }
            catch (Exception)
            {
                // Suppress logging errors
            }
        }

        private string FormatHeaders(IHeaderDictionary headers)
        {
            var sb = new StringBuilder();
            foreach (var header in headers)
            {
                // Skip sensitive headers to avoid storing tokens/credentials
                if (IsHeaderSensitive(header.Key))
                {
                    continue;
                }
                sb.Append($"{header.Key}: {header.Value}; ");
            }
            return sb.ToString();
        }

        private bool IsHeaderSensitive(string headerName)
        {
            foreach (var sensitiveHeader in SensitiveHeaders)
            {
                if (string.Equals(headerName, sensitiveHeader, StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }
            }
            return false;
        }

        private string? ExtractUserIdFromContext(HttpContext context)
        {
            // Try to get UserId from User.Claims (set after JWT authentication)
            var userIdClaim = context.User?.FindFirst(ClaimTypes.NameIdentifier) ?? 
                              context.User?.FindFirst(ClaimTypes.Name);
            if (userIdClaim != null && !string.IsNullOrEmpty(userIdClaim.Value))
            {
                return userIdClaim.Value;
            }

            // Try alternative claim names
            var altUserIdClaim = context.User?.FindFirst("sub") ?? 
                                 context.User?.FindFirst("userId") ?? 
                                 context.User?.FindFirst("id");
            
            if (altUserIdClaim != null && !string.IsNullOrEmpty(altUserIdClaim.Value))
            {
                return altUserIdClaim.Value;
            }

            return null;
        }
    }
}
