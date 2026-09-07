using System.Threading.Tasks;

namespace DELED.Services
{
    public interface IAtomPaymentService
    {
        Task<string> GenerateToken(
            long registrationId,
            decimal amount,
            string email,
            string mobile);

        Task<(bool isPaid, string statusCode, string message, string atomTxnId)> RequeryPayment(
            string merchantTxnId,
            string originalDate,
            decimal amount);

        string Encrypt(string plainText);
        string Decrypt(string cipherText);
    }
}
