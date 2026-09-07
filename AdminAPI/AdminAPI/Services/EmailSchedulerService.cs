//using System;
//using Microsoft.EntityFrameworkCore;
//using Microsoft.Extensions.DependencyInjection;
//using Microsoft.Extensions.Hosting;
//using Microsoft.Extensions.Logging;
//using System.Linq;
//using System.Net;
//using System.Net.Mail;
//using System.Threading;
//using System.Threading.Tasks;
//using DELED.Data;
//using DELED.Models;

//namespace DELED.Services
//{
//    public class EmailSchedulerService : BackgroundService
//    {
//        private readonly IServiceProvider _serviceProvider;
//        private readonly ILogger<EmailSchedulerService> _logger;

//        public EmailSchedulerService(IServiceProvider serviceProvider, ILogger<EmailSchedulerService> logger)
//        {
//            _serviceProvider = serviceProvider;
//            _logger = logger;
//        }

//        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
//        {
//            _logger.LogInformation("Email Scheduler Service is starting.");

//            while (!stoppingToken.IsCancellationRequested)
//            {
//                try
//                {
//                    await ProcessSchedulesAsync(stoppingToken);
//                }
//                catch (Exception ex)
//                {
//                    _logger.LogError(ex, "Error occurred while executing Email Scheduler Service.");
//                }

//                // Check every 1 minute
//                await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
//            }
//        }

//        private async Task ProcessSchedulesAsync(CancellationToken stoppingToken)
//        {
//            using (var scope = _serviceProvider.CreateScope())
//            {
//                var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
//                var configuration = scope.ServiceProvider.GetRequiredService<IConfiguration>();

//                var today = DateOnly.FromDateTime(DateTime.Today);
//                var nowTime = DateTime.Now.TimeOfDay;

//                // Ensure default Daily Report schedule exists in database automatically
//                var hasDailyReport = await context.EmailSchedules
//                    .AnyAsync(s => s.ScheduleName == "Daily Report", stoppingToken);

//                if (!hasDailyReport)
//                {
//                    var adminEmail = configuration["EmailSettings:AdminEmail"];
//                    var ccEmail = configuration["EmailSettings:AdminCcEmails"];
//                    var bccEmail = configuration["EmailSettings:AdminBccEmails"];

//                    var defaultSchedule = new EmailSchedule
//                    {
//                        ScheduleName = "Daily Report",
//                        Subject = "DELED 2026 Daily Report",
//                        ToEmails = adminEmail,
//                        CcEmails = ccEmail,
//                        BccEmails = bccEmail,
//                        ScheduledTime = DateTime.Now.TimeOfDay, // Temporarily send immediately on startup
//                        IsActive = true,
//                        MessageBody = "Daily registration and payment report",
//                        LastSentDate = null
//                    };
//                    context.EmailSchedules.Add(defaultSchedule);
//                    await context.SaveChangesAsync(stoppingToken);
//                }

//                // Fetch active schedules that haven't been sent today, and whose ScheduledTime has passed
//                var schedules = await context.EmailSchedules
//                    .Where(s => s.IsActive &&
//                                (s.LastSentDate == null || s.LastSentDate < today) &&
//                                s.ScheduledTime <= nowTime)
//                    .ToListAsync(stoppingToken);

//                foreach (var schedule in schedules)
//                {
//                    await SendDailyReportEmailAsync(context, configuration, schedule, today);
//                }
//            }
//        }

//        public static async Task SendDailyReportEmailAsync(AppDbContext context, IConfiguration configuration, EmailSchedule schedule, DateOnly today, ILogger logger = null)
//        {
//            var log = new EmailLog
//            {
//                ScheduleId = schedule.Id,
//                SentOn = DateTime.Now
//            };

//            try
//            {
//                // Calculate counts for the last 24 hours (from execution time back to 24 hours ago)
//                var startOfPeriod = DateTime.Now.AddDays(-1);
//                var endOfPeriod = DateTime.Now;

//                // Total Registrations in last 24h
//                var regCountToday = await context.Users
//                    .CountAsync(u => u.CreatedOn >= startOfPeriod && u.CreatedOn <= endOfPeriod);

//                // Total Registrations Overall
//                var regCountOverall = await context.Users.CountAsync();

//                // Total Payments Received in last 24h (Success payments only)
//                var paymentCountToday = await context.Payments
//                    .CountAsync(p => p.PaymentDate >= startOfPeriod && p.PaymentDate <= endOfPeriod && p.Status == "SUCCESS");

//                // Total Payments Received Overall
//                var paymentCountOverall = await context.Payments
//                    .CountAsync(p => p.Status == "SUCCESS");

//                // Applied for DELED 1 in last 24h (DELEDI or BOTH)
//                var deled1CountToday = await (from pd in context.UserPersonalDetails
//                                             join et in context.ExamTypes on pd.ExamTypeId equals et.Id
//                                             where pd.CreatedOn >= startOfPeriod && pd.CreatedOn <= endOfPeriod &&
//                                                   (et.Name == "DELEDI" || et.Name == "Both" || et.Name == "BOTH" || et.Name == "DELED-I" || et.Name == "DELED-I & DELED-II")
//                                             select pd).CountAsync();

//                // Applied for DELED 2 in last 24h (DELEDII or BOTH)
//                var deled2CountToday = await (from pd in context.UserPersonalDetails
//                                             join et in context.ExamTypes on pd.ExamTypeId equals et.Id
//                                             where pd.CreatedOn >= startOfPeriod && pd.CreatedOn <= endOfPeriod &&
//                                                   (et.Name == "DELEDII" || et.Name == "Both" || et.Name == "BOTH" || et.Name == "DELED-II" || et.Name == "DELED-I & DELED-II")
//                                             select pd).CountAsync();

//                // Applied for DELED 1 Overall
//                var deled1CountOverall = await (from pd in context.UserPersonalDetails
//                                               join et in context.ExamTypes on pd.ExamTypeId equals et.Id
//                                               where et.Name == "DELEDI" || et.Name == "Both" || et.Name == "BOTH" || et.Name == "DELED-I" || et.Name == "DELED-I & DELED-II"
//                                               select pd).CountAsync();

//                // Applied for DELED 2 Overall
//                var deled2CountOverall = await (from pd in context.UserPersonalDetails
//                                               join et in context.ExamTypes on pd.ExamTypeId equals et.Id
//                                               where et.Name == "DELEDII" || et.Name == "Both" || et.Name == "BOTH" || et.Name == "DELED-II" || et.Name == "DELED-I & DELED-II"
//                                               select pd).CountAsync();

//                // Exam City wise candidates with completed payments (Last 24h)
//                var examCityWisePaymentToday = await (from u in context.Users
//                                                      join pd in context.UserPersonalDetails on u.UserId equals pd.UserId
//                                                      join ec1 in context.ExamCity on pd.ExamCity1 equals ec1.CityId into ec1Join
//                                                      from ec1 in ec1Join.DefaultIfEmpty()
//                                                      join p in context.Payments on u.UserId equals p.UserId into pJoin
//                                                      from p in pJoin.DefaultIfEmpty()
//                                                      where u.CreatedOn >= startOfPeriod && u.CreatedOn <= endOfPeriod && p.Status == "SUCCESS"
//                                                      group ec1.CityName by ec1.CityName into g
//                                                      select new { CityName = g.Key, Count = g.Count() })
//                                                       .OrderByDescending(x => x.Count)
//                                                       .ToListAsync();

//                // Exam City wise candidates with completed payments Overall
//                var examCityWisePaymentOverall = await (from u in context.Users
//                                                        join pd in context.UserPersonalDetails on u.UserId equals pd.UserId
//                                                        join ec1 in context.ExamCity on pd.ExamCity1 equals ec1.CityId into ec1Join
//                                                        from ec1 in ec1Join.DefaultIfEmpty()
//                                                        join p in context.Payments on u.UserId equals p.UserId into pJoin
//                                                        from p in pJoin.DefaultIfEmpty()
//                                                        where p.Status == "SUCCESS"
//                                                        group ec1.CityName by ec1.CityName into g
//                                                        select new { CityName = g.Key, Count = g.Count() })
//                                                         .OrderByDescending(x => x.Count)
//                                                         .ToListAsync();

//                // Build Exam City wise table HTML (Last 24h)
//                var examCityTableToday = "<h3 style='color: #0c5a30; margin-top: 20px;'>Exam City Wise Candidates (Payments Done) - Last 24 Hours</h3>";
//                if (examCityWisePaymentToday.Any())
//                {
//                    examCityTableToday += @"
//                    <table style='border-collapse: collapse; width: 100%; max-width: 500px; margin-top: 10px;'>
//                        <thead>
//                            <tr style='background-color: #e8f5e9;'>
//                                <th style='border: 1px solid #ddd; padding: 10px; text-align: left;'>Exam City</th>
//                                <th style='border: 1px solid #ddd; padding: 10px; text-align: center; width: 100px;'>Candidates</th>
//                            </tr>
//                        </thead>
//                        <tbody>";

//                    foreach (var city in examCityWisePaymentToday)
//                    {
//                        examCityTableToday += $@"
//                            <tr>
//                                <td style='border: 1px solid #ddd; padding: 10px;'>{city.CityName ?? "Not Specified"}</td>
//                                <td style='border: 1px solid #ddd; padding: 10px; text-align: center; font-weight: bold;'>{city.Count}</td>
//                            </tr>";
//                    }

//                    examCityTableToday += @"
//                        </tbody>
//                    </table>";
//                }
//                else
//                {
//                    examCityTableToday += "<p style='color: #666; font-style: italic;'>No payment data available for this period.</p>";
//                }

//                // Build Exam City wise table HTML Overall
//                var examCityTableOverall = "<h3 style='color: #0c5a30; margin-top: 20px;'>Exam City Wise Candidates (Payments Done) - Overall</h3>";
//                if (examCityWisePaymentOverall.Any())
//                {
//                    examCityTableOverall += @"
//                    <table style='border-collapse: collapse; width: 100%; max-width: 500px; margin-top: 10px;'>
//                        <thead>
//                            <tr style='background-color: #e8f5e9;'>
//                                <th style='border: 1px solid #ddd; padding: 10px; text-align: left;'>Exam City</th>
//                                <th style='border: 1px solid #ddd; padding: 10px; text-align: center; width: 100px;'>Candidates</th>
//                            </tr>
//                        </thead>
//                        <tbody>";

//                    foreach (var city in examCityWisePaymentOverall)
//                    {
//                        examCityTableOverall += $@"
//                            <tr>
//                                <td style='border: 1px solid #ddd; padding: 10px;'>{city.CityName ?? "Not Specified"}</td>
//                                <td style='border: 1px solid #ddd; padding: 10px; text-align: center; font-weight: bold;'>{city.Count}</td>
//                            </tr>";
//                    }

//                    examCityTableOverall += @"
//                        </tbody>
//                    </table>";
//                }
//                else
//                {
//                    examCityTableOverall += "<p style='color: #666; font-style: italic;'>No payment data available.</p>";
//                }

//                // Compile Email Body
//                var statsTableHtml = $@"
//                    <h2 style='color: #0c5a30; border-bottom: 2px solid #0c5a30; padding-bottom: 8px;'>DELED 2026 Daily Application & Payment Report</h2>
//                    <p>Dear Administrator,</p>
//                    <p>Please find below the application and registration statistics collected for the last 24 hours and overall (from <strong>{startOfPeriod:dd MMMM yyyy, hh:mm tt}</strong> to <strong>{endOfPeriod:dd MMMM yyyy, hh:mm tt}</strong>):</p>
                    
//                    <h3 style='color: #0c5a30; margin-top: 20px;'>Last 24 Hours Statistics</h3>
//                    <table style='border-collapse: collapse; width: 100%; max-width: 500px; margin-top: 10px;'>
//                        <thead>
//                            <tr style='background-color: #f2f2f2;'>
//                                <th style='border: 1px solid #ddd; padding: 10px; text-align: left;'>Metric Description</th>
//                                <th style='border: 1px solid #ddd; padding: 10px; text-align: center; width: 100px;'>Count</th>
//                            </tr>
//                        </thead>
//                        <tbody>
//                            <tr>
//                                <td style='border: 1px solid #ddd; padding: 10px;'>New Registrations</td>
//                                <td style='border: 1px solid #ddd; padding: 10px; text-align: center; font-weight: bold; color: #1e3a8a;'>{regCountToday}</td>
//                            </tr>
//                            <tr>
//                                <td style='border: 1px solid #ddd; padding: 10px;'>Successful Payments Received</td>
//                                <td style='border: 1px solid #ddd; padding: 10px; text-align: center; font-weight: bold; color: #0f766e;'>{paymentCountToday}</td>
//                            </tr>
//                            <tr>
//                                <td style='border: 1px solid #ddd; padding: 10px;'>Applied for DELED I (Primary)</td>
//                                <td style='border: 1px solid #ddd; padding: 10px; text-align: center; font-weight: bold;'>{deled1CountToday}</td>
//                            </tr>
//                            <tr>
//                                <td style='border: 1px solid #ddd; padding: 10px;'>Applied for DELED II (Upper Primary)</td>
//                                <td style='border: 1px solid #ddd; padding: 10px; text-align: center; font-weight: bold;'>{deled2CountToday}</td>
//                            </tr>
//                        </tbody>
//                    </table>

//                    <h3 style='color: #0c5a30; margin-top: 20px;'>Overall Statistics</h3>
//                    <table style='border-collapse: collapse; width: 100%; max-width: 500px; margin-top: 10px;'>
//                        <thead>
//                            <tr style='background-color: #f2f2f2;'>
//                                <th style='border: 1px solid #ddd; padding: 10px; text-align: left;'>Metric Description</th>
//                                <th style='border: 1px solid #ddd; padding: 10px; text-align: center; width: 100px;'>Count</th>
//                            </tr>
//                        </thead>
//                        <tbody>
//                            <tr>
//                                <td style='border: 1px solid #ddd; padding: 10px;'>Total Registrations</td>
//                                <td style='border: 1px solid #ddd; padding: 10px; text-align: center; font-weight: bold; color: #1e3a8a;'>{regCountOverall}</td>
//                            </tr>
//                            <tr>
//                                <td style='border: 1px solid #ddd; padding: 10px;'>Total Successful Payments</td>
//                                <td style='border: 1px solid #ddd; padding: 10px; text-align: center; font-weight: bold; color: #0f766e;'>{paymentCountOverall}</td>
//                            </tr>
//                            <tr>
//                                <td style='border: 1px solid #ddd; padding: 10px;'>Total Applied for DELED I (Primary)</td>
//                                <td style='border: 1px solid #ddd; padding: 10px; text-align: center; font-weight: bold;'>{deled1CountOverall}</td>
//                            </tr>
//                            <tr>
//                                <td style='border: 1px solid #ddd; padding: 10px;'>Total Applied for DELED II (Upper Primary)</td>
//                                <td style='border: 1px solid #ddd; padding: 10px; text-align: center; font-weight: bold;'>{deled2CountOverall}</td>
//                            </tr>
//                        </tbody>
//                    </table>

//                    {examCityTableToday}

//                    {examCityTableOverall}
//                    <br/>
//                    <p>Best regards,<br/>DELED Online Administration Portal</p>";

//                string emailBody;
//                if (!string.IsNullOrWhiteSpace(schedule.MessageBody))
//                {
//                    emailBody = $@"
//                        <html>
//                        <body style='font-family: Arial, sans-serif; color: #333; line-height: 1.6;'>
//                            <div style='margin-bottom: 20px; font-weight: bold;'>
//                                {schedule.MessageBody.Replace("\r\n", "<br/>").Replace("\n", "<br/>")}
//                            </div>
//                            {statsTableHtml}
//                        </body>
//                        </html>";
//                }
//                else
//                {
//                    emailBody = $@"
//                        <html>
//                        <body style='font-family: Arial, sans-serif; color: #333; line-height: 1.6;'>
//                            {statsTableHtml}
//                        </body>
//                        </html>";
//                }

//                // Setup SMTP Client
//                var host = configuration["EmailSettings:Host"];
//                var port = int.Parse(configuration["EmailSettings:Port"]);
//                var email = configuration["EmailSettings:Email"];
//                var username = configuration["EmailSettings:Username"] ?? email;
//                var password = configuration["EmailSettings:Password"];
//                var displayName = configuration["EmailSettings:Displayname"] ?? "UKDELED-2026";

//                System.Net.ServicePointManager.SecurityProtocol = System.Net.SecurityProtocolType.Tls12 | System.Net.SecurityProtocolType.Tls13;

//                using (var smtpClient = new SmtpClient(host))
//                {
//                    smtpClient.Port = port;
//                    smtpClient.Credentials = new NetworkCredential(username, password);
//                    smtpClient.EnableSsl = true;

//                    using (var mailMessage = new MailMessage())
//                    {
//                        mailMessage.From = new MailAddress(email, displayName);
//                        mailMessage.Subject = schedule.Subject;
//                        mailMessage.Body = emailBody;
//                        mailMessage.IsBodyHtml = true;

//                        // Add To Emails
//                        if (!string.IsNullOrWhiteSpace(schedule.ToEmails))
//                        {
//                            foreach (var to in schedule.ToEmails.Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries))
//                            {
//                                mailMessage.To.Add(to.Trim());
//                            }
//                        }

//                        // Add CC Emails (Read directly from config first, fallback to DB schedule field)
//                        var configCc = configuration["EmailSettings:AdminCcEmails"];
//                        var ccSource = !string.IsNullOrWhiteSpace(configCc) ? configCc : schedule.CcEmails;
//                        if (!string.IsNullOrWhiteSpace(ccSource))
//                        {
//                            foreach (var cc in ccSource.Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries))
//                            {
//                                mailMessage.CC.Add(cc.Trim());
//                            }
//                        }

//                        // Add BCC Emails (Read directly from config first, fallback to DB schedule field)
//                        var configBcc = configuration["EmailSettings:AdminBccEmails"];
//                        var bccSource = !string.IsNullOrWhiteSpace(configBcc) ? configBcc : schedule.BccEmails;
//                        if (!string.IsNullOrWhiteSpace(bccSource))
//                        {
//                            foreach (var bcc in bccSource.Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries))
//                            {
//                                mailMessage.Bcc.Add(bcc.Trim());
//                            }
//                        }

//                        // Check if we have at least one recipient
//                        if (mailMessage.To.Count > 0 || mailMessage.CC.Count > 0 || mailMessage.Bcc.Count > 0)
//                        {
//                            smtpClient.Send(mailMessage);
//                        }
//                    }
//                }

//                // Update schedule sent status
//                schedule.LastSentDate = today;
//                context.EmailSchedules.Update(schedule);

//                log.IsSuccess = true;
//                log.ErrorMessage = "";
//                if (logger != null)
//                {
//                    logger.LogInformation($"Successfully sent daily email report for schedule: {schedule.ScheduleName}");
//                }
//                else
//                {
//                    Console.WriteLine($"Successfully sent daily email report for schedule: {schedule.ScheduleName}");
//                }
//            }
//            catch (Exception ex)
//            {
//                log.IsSuccess = false;
//                log.ErrorMessage = ex.ToString();
//                if (logger != null)
//                {
//                    logger.LogError(ex, $"Failed to send daily email report for schedule: {schedule.ScheduleName}");
//                }
//                else
//                {
//                    Console.WriteLine($"Failed to send daily email report for schedule: {schedule.ScheduleName}. Error: {ex}");
//                }
//            }

//            // Write logs and save DB changes
//            context.EmailLogs.Add(log);
//            await context.SaveChangesAsync();
//        }
//    }
//}
