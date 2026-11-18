using System.IO;

namespace DELED.Services
{
    public interface ISuperimposeService
    {
        byte[] SuperimposeDocument(Stream fileStream, string fileName, string rollNumber, string? examName = null, string? subject = null);
    }
}
