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

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await ProcessPendingPaymentsAsync(stoppingToken);
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

                // Fetch payment transactions created in the last 24 hours that are not marked SUCCESS.
                // We leave a 5-minute buffer so that users currently typing their OTP on the payment gateway are not queried prematurely.
                // NOTE: We check all payment transactions in the last 24 hours regardless of whether user.IsPaymentCompleted is true or false.
                var nowIST = DELED.Helpers.TimeHelper.GetIST();
                var timeThreshold24Hours = nowIST.AddHours(-24);
                var timeThresholdBuffer = nowIST.AddMinutes(-5);

                var pendingTxns = await context.PaymentTransactions
                    .Where(t => t.Status != "SUCCESS"
                             && t.CreatedOn >= timeThreshold24Hours
                             && t.CreatedOn <= timeThresholdBuffer)
                    .OrderByDescending(t => t.CreatedOn)
                    .ToListAsync(stoppingToken);

                if (!pendingTxns.Any())
                {
                    _logger.LogInformation("PaymentRequeryScheduler: No unverified transactions found in the last 24 hours.");
                    return;
                }

                _logger.LogInformation("PaymentRequeryScheduler: Found {Count} transaction(s) in the last 24 hours to verify.", pendingTxns.Count);

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

                            // Update user status if not already completed
                            var user = await context.Users.FindAsync(txn.UserId);
                            if (user != null && !user.IsPaymentCompleted)
                            {
                                user.IsPaymentCompleted = true;
                                user.PaymentDate = DELED.Helpers.TimeHelper.GetIST();
                                context.Users.Update(user);
                            }

                            // Mark step progress
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
                            _logger.LogInformation("PaymentRequeryScheduler: Payment not confirmed for TxnId: {MerchantTxnId}. StatusCode: {Code}, Msg: {Msg}",
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
    }
}
