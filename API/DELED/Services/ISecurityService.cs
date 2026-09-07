namespace DELED.Services
{
    public interface ISecurityService
    {
        string Decrypt(string cipherText);
        string Encrypt(string plainText);
        string EncryptUrlSafe(string plainText);
        string DecryptUrlSafe(string cipherText);
    }
}
