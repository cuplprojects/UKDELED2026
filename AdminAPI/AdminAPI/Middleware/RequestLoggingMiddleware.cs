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
                    Timestamp = DateTime.Now,
                    Method = context.Request.Method,
                    Path = context.Request.Path,
                    QueryString = context.Request.QueryString.ToString(),
                    Headers = FormatHeaders(context.Request.Headers),
                    Body = body,
                    UserId = userId
                };

                dbContext.DbEventLogs.Add(eventLog);
                await dbContext.SaveChangesAsync();
            }
            catch (Exception)
            {
                // Suppress logging errors to avoid failing the main request
            }
        }

        private async Task LogExceptionToDbAsync(HttpContext context, Exception ex)
        {
            try
            {
                var dbContext = context.RequestServices.GetRequiredService<AppDbContext>();
                var errorLog = new DbErrorLog
                {
                    Timestamp = DateTime.Now,
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
                    Timestamp = DateTime.Now,
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
            var userIdClaim = context.User?.FindFirst(ClaimTypes.NameIdentifier);
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
