namespace DELED.Services
{
    public interface ISecurityService
    {
        string Decrypt(string cipherText);
        string Encrypt(string plainText);
    }
}
