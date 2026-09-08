using System;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using DELED.Data;
using DELED.Models;
using Microsoft.Extensions.Configuration;
namespace DELED.Services
{
    public class PaymentRequerySchedulerService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<PaymentRequerySchedulerService> _logger;
        public PaymentRequerySchedulerService(IServiceProvider serviceProvider, ILogger<PaymentRequerySchedulerService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }
        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Payment Requery Scheduler Service is starting.");
            DateTime lastVerificationTime = DateTime.MinValue;

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                   // await ProcessPendingPaymentsAsync(stoppingToken);

                    // Verify successful payments every 60 minutes
                  /*  if ((DateTime.UtcNow - lastVerificationTime).TotalMinutes >= 60)
                    {
                        await VerifySuccessfulPaymentsAsync(stoppingToken);
                        lastVerificationTime = DateTime.UtcNow;
                    }*/
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred while executing Payment Requery Scheduler Service.");
                }
                // Check every 15 minutes
                await Task.Delay(TimeSpan.FromMinutes(15), stoppingToken);
            }
        }
        private async Task ProcessPendingPaymentsAsync(CancellationToken stoppingToken)
        {
            using (var scope = _serviceProvider.CreateScope())
            {
                var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var paymentService = scope.ServiceProvider.GetRequiredService<IAtomPaymentService>();
                var databaseLogger = scope.ServiceProvider.GetRequiredService<DatabaseLoggerService>();
                // Fetch pending transactions older than 15 minutes
                var timeThreshold = DELED.Helpers.TimeHelper.GetIST().AddMinutes(-15);
                var startDate = new DateTime(2026, 7, 26);

                var pendingTxns = await context.PaymentTransactions
                    .Where(t => t.Status == "PENDING"
                             && t.CreatedOn <= timeThreshold
                             && t.CreatedOn >= startDate)
                    .ToListAsync(stoppingToken);
                if (!pendingTxns.Any())
                {
                    return;
                }
                _logger.LogInformation("PaymentRequeryScheduler: Found {Count} pending transactions to verify.", pendingTxns.Count);
                foreach (var txn in pendingTxns)
                {
                    string dateStr = txn.CreatedOn.ToString("yyyy-MM-dd");
                    _logger.LogInformation("PaymentRequeryScheduler: Requerying TxnId: {MerchantTxnId} for UserId: {UserId}",
                        txn.MerchantTxnId, txn.UserId);
                    try
                    {
                        // If amount is 0 (stored incorrectly), look up actual exam fee
                        decimal amountToQuery = txn.Amount;
                        if (amountToQuery <= 0)
                        {
                            var personal = await context.UserPersonalDetails.FirstOrDefaultAsync(p => p.UserId == txn.UserId, stoppingToken);
                            if (personal != null)
                            {
                                int examTypeId = personal.IsPhysicallyHandicapped ? 3 : (!string.IsNullOrEmpty(personal.Category) && (personal.Category.ToUpper().Contains("SC") || personal.Category.ToUpper().Contains("ST")) ? 2 : 1);
                                var examType = await context.ExamTypes.FindAsync(examTypeId);
                                amountToQuery = examType != null && examType.Payment > 0 ? (decimal)examType.Payment : (examTypeId == 3 ? 150m : (examTypeId == 2 ? 300m : 600m));
                                _logger.LogInformation("PaymentRequeryScheduler: Amount was 0 for TxnId: {MerchantTxnId}, using exam fee: {Amount}", txn.MerchantTxnId, amountToQuery);
                            }
                        }

                        if (amountToQuery <= 0)
                        {
                            _logger.LogWarning("PaymentRequeryScheduler: Cannot determine amount for TxnId: {MerchantTxnId}. Skipping.", txn.MerchantTxnId);
                            continue;
                        }

                        var requeryResult = await paymentService.RequeryPayment(txn.MerchantTxnId, dateStr, amountToQuery);

                        // Only mark SUCCESS if Atom explicitly confirms with OTS0000 or OTS0002
                        bool isConfirmedPaid = requeryResult.isPaid &&
                            (requeryResult.statusCode == "OTS0000" || requeryResult.statusCode == "OTS0002");

                        if (isConfirmedPaid)
                        {
                            _logger.LogInformation("PaymentRequeryScheduler: Payment verified for TxnId: {MerchantTxnId}, StatusCode: {Code}", txn.MerchantTxnId, requeryResult.statusCode);
                            await databaseLogger.LogPaymentEventAsync(
                                "PaymentRequeryScheduler",
                                "Requery successful - payment verified",
                                txn.UserId.ToString(),
                                txn.MerchantTxnId,
                                $"Amount: {amountToQuery}, StatusCode: {requeryResult.statusCode}");

                            // Update amount if it was 0 before
                            if (txn.Amount <= 0) txn.Amount = amountToQuery;

                            if (!string.IsNullOrEmpty(requeryResult.atomTxnId))
                            {
                                txn.AtomTxnId = requeryResult.atomTxnId;
                            }

                            txn.Status = "SUCCESS";
                            txn.UpdatedOn = DELED.Helpers.TimeHelper.GetIST();
                            context.PaymentTransactions.Update(txn);

                            var user = await context.Users.FindAsync(txn.UserId);
                            if (user != null && !user.IsPaymentCompleted)
                            {
                                user.IsPaymentCompleted = true;
                                user.PaymentDate = DELED.Helpers.TimeHelper.GetIST();
                                context.Users.Update(user);
                            }

                            // Only add payment record if one doesn't already exist for this txn
                            bool paymentExists = await context.Payments
                                .AnyAsync(p => p.UserId == txn.UserId && p.TransactionId == (txn.AtomTxnId ?? "REQUERY_AUTO"), stoppingToken);
                            if (!paymentExists)
                            {
                                var payment = new Payment
                                {
                                    UserId = txn.UserId,
                                    Amount = amountToQuery,
                                    PaymentDate = DELED.Helpers.TimeHelper.GetIST(),
                                    Status = "SUCCESS",
                                    TransactionId = txn.AtomTxnId ?? "REQUERY_AUTO"
                                };
                                context.Payments.Add(payment);
                            }

                            bool stepExists = await context.UserStepProgresses
                                .AnyAsync(s => s.UserId == txn.UserId && s.StepNumber == 4, stoppingToken);
                            if (!stepExists)
                            {
                                var progress = new UserStepProgress
                                {
                                    UserId = txn.UserId,
                                    StepNumber = 4,
                                    CompletedOn = DELED.Helpers.TimeHelper.GetIST()
                                };
                                context.UserStepProgresses.Add(progress);
                            }
                            await context.SaveChangesAsync(stoppingToken);
                        }
                        else
                        {
                            _logger.LogInformation("PaymentRequeryScheduler: Payment not yet confirmed for TxnId: {MerchantTxnId}. StatusCode: {Code}, Msg: {Msg}",
                                txn.MerchantTxnId, requeryResult.statusCode, requeryResult.message);
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "PaymentRequeryScheduler: Requery failed for TxnId: {MerchantTxnId}", txn.MerchantTxnId);
                    }
                }
            }
        }
        /* private async Task VerifySuccessfulPaymentsAsync(CancellationToken stoppingToken)
         {
             using (var scope = _serviceProvider.CreateScope())
             {
                 var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                 var paymentService = scope.ServiceProvider.GetRequiredService<IAtomPaymentService>();
                 var databaseLogger = scope.ServiceProvider.GetRequiredService<DatabaseLoggerService>();

                 // Fetch transactions marked as SUCCESS in the last 24 hours
                 var timeThreshold = DELED.Helpers.TimeHelper.GetIST().AddHours(-24);
                 var successTxns = await context.PaymentTransactions
                     .Where(t => t.Status == "SUCCESS" && t.CreatedOn >= timeThreshold)
                     .ToListAsync(stoppingToken);

                 if (!successTxns.Any())
                 {
                     return;
                 }

                 _logger.LogInformation("PaymentRequeryScheduler: Found {Count} SUCCESS transactions to verify.", successTxns.Count);

                 foreach (var txn in successTxns)
                 {
                     string dateStr = txn.CreatedOn.ToString("yyyy-MM-dd");
                     try
                     {
                         decimal amountToQuery = txn.Amount;
                         if (amountToQuery <= 0)
                         {
                             var personal = await context.UserPersonalDetails.FirstOrDefaultAsync(p => p.UserId == txn.UserId, stoppingToken);
                             if (personal != null)
                             {
                                 int examTypeId = personal.IsPhysicallyHandicapped ? 3 : (!string.IsNullOrEmpty(personal.Category) && (personal.Category.ToUpper().Contains("SC") || personal.Category.ToUpper().Contains("ST")) ? 2 : 1);
                                 var examType = await context.ExamTypes.FindAsync(examTypeId);
                                 amountToQuery = examType != null && examType.Payment > 0 ? (decimal)examType.Payment : (examTypeId == 3 ? 150m : (examTypeId == 2 ? 300m : 600m));
                             }
                         }

                         if (amountToQuery <= 0) continue;

                         var requeryResult = await paymentService.RequeryPayment(txn.MerchantTxnId, dateStr, amountToQuery);

                         // If requery failed due to an exception or network error, skip. We only revert on explicit Atom failure.
                         if (requeryResult.statusCode == "EXCEPTION" || requeryResult.statusCode == "HTTP_ERROR" || requeryResult.statusCode == "DECRYPT_ERROR" || requeryResult.statusCode == "UNKNOWN")
                         {
                             continue;
                         }

                         bool isConfirmedPaid = requeryResult.isPaid &&
                             (requeryResult.statusCode == "OTS0000" || requeryResult.statusCode == "OTS0002");

                         if (!isConfirmedPaid)
                         {
                             _logger.LogWarning("PaymentRequeryScheduler: REVERTING SUCCESS! Payment actually failed for TxnId: {MerchantTxnId}. StatusCode: {Code}", txn.MerchantTxnId, requeryResult.statusCode);
                             await databaseLogger.LogPaymentEventAsync(
                                 "PaymentRequeryScheduler",
                                 "Requery failed - Reverting SUCCESS transaction",
                                 txn.UserId.ToString(),
                                 txn.MerchantTxnId,
                                 $"Amount: {amountToQuery}, StatusCode: {requeryResult.statusCode}");

                             txn.Status = "FAILED";
                             txn.UpdatedOn = DELED.Helpers.TimeHelper.GetIST();
                             context.PaymentTransactions.Update(txn);

                             // Check if the user has any other successful transactions before reverting their status
                             bool hasOtherSuccess = await context.PaymentTransactions
                                 .AnyAsync(pt => pt.UserId == txn.UserId && pt.Status == "SUCCESS" && pt.Id != txn.Id, stoppingToken);

                             if (!hasOtherSuccess)
                             {
                                 var user = await context.Users.FindAsync(txn.UserId);
                                 if (user != null)
                                 {
                                     user.IsPaymentCompleted = false;
                                     user.PaymentDate = null;
                                     context.Users.Update(user);
                                 }
                             }

                             // Mark corresponding Payment record as FAILED
                             var payment = await context.Payments
                                 .FirstOrDefaultAsync(p => p.UserId == txn.UserId && p.TransactionId == (txn.AtomTxnId ?? "REQUERY_AUTO"), stoppingToken);

                             if (payment != null)
                             {
                                 payment.Status = "FAILED";
                                 context.Payments.Update(payment);
                             }
                             else
                             {
                                 // If AtomTxnId wasn't set correctly, fall back to matching by UserId and Status
                                 var fallbackPayment = await context.Payments
                                     .FirstOrDefaultAsync(p => p.UserId == txn.UserId && p.Status == "SUCCESS", stoppingToken);
                                 if (fallbackPayment != null)
                                 {
                                     fallbackPayment.Status = "FAILED";
                                     context.Payments.Update(fallbackPayment);
                                 }
                             }

                             await context.SaveChangesAsync(stoppingToken);
                         }
                     }
                     catch (Exception ex)
                     {
                         _logger.LogError(ex, "PaymentRequeryScheduler: Verification failed for TxnId: {MerchantTxnId}", txn.MerchantTxnId);
                     }
                 }
             }
         }*/
    }
}
