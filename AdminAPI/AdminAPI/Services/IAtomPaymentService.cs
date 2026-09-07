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

        Task<bool> RequeryPayment(
            string merchantTxnId,
            string originalDate);

        string Encrypt(string plainText);
        string Decrypt(string cipherText);
    }
}
