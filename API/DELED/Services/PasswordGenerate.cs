using System.Text;

namespace DELED.Services
{
    public class PasswordGenerate
    {
        public static string GeneratePassword()
        {
            const string validChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";
            const int passwordLength = 6;

            StringBuilder password = new StringBuilder();
            Random random = new Random();

            for (int i = 0; i < passwordLength; i++)
            {
                int index = random.Next(validChars.Length);
                password.Append(validChars[index]);
            }

            return password.ToString();
        }
    }
}
