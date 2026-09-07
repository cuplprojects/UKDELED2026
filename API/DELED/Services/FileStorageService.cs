using System;
using System.IO;
using System.Threading.Tasks;

namespace DELED.Services
{
    public interface IFileStorageService
    {
        Task<string> SaveAsync(IFormFile file, string subFolder, string prefix);
        Task<bool> DeleteAsync(string filePath);
        Task<bool> FileExistsAsync(string filePath);
    }

    public class FileStorageService : IFileStorageService
    {
        private readonly IConfiguration _configuration;
        private readonly string _baseStoragePath;

        public FileStorageService(IConfiguration configuration)
        {
            _configuration = configuration;
            string configuredPath = _configuration["FilePath"];
            bool pathExists = false;

            try
            {
                if (!string.IsNullOrEmpty(configuredPath) && Directory.Exists(configuredPath))
                {
                    pathExists = true;
                }
            }
            catch
            {
                // Fallback to wwwroot if path is inaccessible
            }

            _baseStoragePath = pathExists ? configuredPath : Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");

            try
            {
                if (!Directory.Exists(_baseStoragePath))
                {
                    Directory.CreateDirectory(_baseStoragePath);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[FileStorageService] Failed to create base storage directory, falling back to wwwroot: {ex.Message}");
                _baseStoragePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
                try
                {
                    if (!Directory.Exists(_baseStoragePath))
                    {
                        Directory.CreateDirectory(_baseStoragePath);
                    }
                }
                catch
                {
                    // Ignore fallback creation failure
                }
            }
        }

        /// <summary>
        /// Saves a file to the configured storage path
        /// </summary>
        /// <param name="file">The file to save</param>
        /// <param name="subFolder">Sub-folder under base path (e.g., "Notices")</param>
        /// <param name="prefix">Not used - file saved with original name</param>
        /// <returns>Relative path to the saved file</returns>
        public async Task<string> SaveAsync(IFormFile file, string subFolder, string prefix)
        {
            try
            {
                if (file == null || file.Length == 0)
                {
                    throw new ArgumentException("File is empty or null");
                }

                // Create full folder path
                var folderPath = Path.Combine(_baseStoragePath, subFolder);

                // Ensure folder exists
                if (!Directory.Exists(folderPath))
                {
                    Directory.CreateDirectory(folderPath);
                }

                // Use original filename (sanitized)
                var fileName = Path.GetFileName(file.FileName);
                var fullFilePath = Path.Combine(folderPath, fileName);

                // Save file to disk
                using (var stream = new FileStream(fullFilePath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }

                // Return relative path for database storage
                var relativePath = Path.Combine(subFolder, fileName).Replace("\\", "/");
                return relativePath;
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException($"Error saving file: {ex.Message}", ex);
            }
        }

        /// <summary>
        /// Deletes a file from storage
        /// </summary>
        /// <param name="filePath">Relative path to the file (as stored in database)</param>
        /// <returns>True if deleted, false if file not found</returns>
        public async Task<bool> DeleteAsync(string filePath)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(filePath))
                {
                    return false;
                }

                // Convert relative path to full path
                var fullPath = Path.Combine(_baseStoragePath, filePath.Replace("/", "\\"));

                if (File.Exists(fullPath))
                {
                    File.Delete(fullPath);
                    return true;
                }

                return false;
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException($"Error deleting file: {ex.Message}", ex);
            }
        }

        /// <summary>
        /// Checks if a file exists in storage
        /// </summary>
        /// <param name="filePath">Relative path to the file (as stored in database)</param>
        /// <returns>True if file exists, false otherwise</returns>
        public async Task<bool> FileExistsAsync(string filePath)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(filePath))
                {
                    return false;
                }

                var fullPath = Path.Combine(_baseStoragePath, filePath.Replace("/", "\\"));
                return File.Exists(fullPath);
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException($"Error checking file existence: {ex.Message}", ex);
            }
        }

        /// <summary>
        /// Gets the full physical path for a relative file path
        /// </summary>
        public string GetFullPath(string relativePath)
        {
            return Path.Combine(_baseStoragePath, relativePath.Replace("/", "\\"));
        }
    }
}
