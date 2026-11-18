using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using PdfSharpCore.Drawing;
using PdfSharpCore.Pdf;
using PdfSharpCore.Pdf.IO;
using SixLabors.Fonts;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Drawing.Processing;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;

namespace DELED.Services
{
    public class SuperimposeService : ISuperimposeService
    {
        public byte[] SuperimposeDocument(Stream fileStream, string fileName, string rollNumber, string? examName = null, string? subject = null)
        {
            var ext = Path.GetExtension(fileName).ToLowerInvariant();

            try
            {
                if (ext == ".pdf")
                {
                    return SuperimposePdf(fileStream, rollNumber, examName, subject);
                }
                else if (ext is ".jpg" or ".jpeg" or ".png" or ".webp" or ".bmp")
                {
                    return SuperimposeImage(fileStream, rollNumber, examName, subject);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SuperimposeService] Stamping warning ({ext}): {ex.Message}. Falling back to original file bytes.");
            }

            // Fallback: return raw bytes if unsupported or on processing exception
            if (fileStream.CanSeek) fileStream.Position = 0;
            using var ms = new MemoryStream();
            fileStream.CopyTo(ms);
            return ms.ToArray();
        }

        private byte[] SuperimposePdf(Stream pdfStream, string rollNumber, string? examName, string? subject)
        {
            if (pdfStream.CanSeek) pdfStream.Position = 0;

            using var outputMs = new MemoryStream();
            using var document = PdfReader.Open(pdfStream, PdfDocumentOpenMode.Modify);

            int totalPages = document.PageCount;
            if (totalPages == 0) throw new InvalidOperationException("PDF contains no pages.");

            // Target Page 1 only
            var firstPage = document.Pages[0];
            double pw = firstPage.Width.Point;
            double ph = firstPage.Height.Point;

            using (var gfx = XGraphics.FromPdfPage(firstPage, XGraphicsPdfPageOptions.Append))
            {
                double bannerHeight = Math.Max(26.0, ph * 0.038);
                double fontSize = Math.Max(9.0, bannerHeight * 0.45);

                // Dark Slate Theme (#0F172A) with 94% opacity
                var bannerBrush = new XSolidBrush(XColor.FromArgb(240, 15, 23, 42));
                gfx.DrawRectangle(bannerBrush, 0, 0, pw, bannerHeight);

                // Compose Banner Text
                var dateStr = DateTime.Now.ToString("dd-MM-yyyy HH:mm");
                var textParts = new List<string>
                {
                    $"Roll No: {rollNumber}"
                };
                if (!string.IsNullOrWhiteSpace(examName)) textParts.Add(examName);
                if (!string.IsNullOrWhiteSpace(subject)) textParts.Add($"Sub: {subject}");
                textParts.Add(dateStr);

                string bannerText = string.Join(" | ", textParts);

                var textFont = new XFont("Arial", fontSize, XFontStyle.Bold);
                var textBrush = new XSolidBrush(XColor.FromArgb(255, 255, 255));

                // Draw Text on Left
                gfx.DrawString(bannerText, textFont, textBrush, new XPoint(14, (bannerHeight / 2) + (fontSize * 0.35)));

                // Draw Page Badge on Right: "1/{totalPages}"
                string pageBadge = $"1/{totalPages}";
                var badgeFont = new XFont("Arial", fontSize, XFontStyle.Bold);
                var badgeBrush = new XSolidBrush(XColor.FromArgb(51, 65, 85)); // #334155
                double badgeWidth = 46.0;
                double badgeHeight = bannerHeight - 8.0;
                double badgeX = pw - badgeWidth - 12.0;
                double badgeY = 4.0;

                gfx.DrawRoundedRectangle(badgeBrush, badgeX, badgeY, badgeWidth, badgeHeight, 4, 4);
                gfx.DrawString(pageBadge, badgeFont, textBrush, new XPoint(badgeX + 10, badgeY + (badgeHeight / 2) + (fontSize * 0.35)));
            }

            document.Save(outputMs);
            return outputMs.ToArray();
        }

        private byte[] SuperimposeImage(Stream imgStream, string rollNumber, string? examName, string? subject)
        {
            if (imgStream.CanSeek) imgStream.Position = 0;

            using var image = Image.Load(imgStream);
            image.Mutate(x => x.AutoOrient()); // Fix mobile device photo EXIF rotation

            int w = image.Width;
            int h = image.Height;

            int bannerHeight = Math.Max(36, (int)(h * 0.045));
            int fontSize = Math.Max(14, (int)(bannerHeight * 0.5));

            Font font;
            if (SystemFonts.TryGet("Arial", out var fontFamily))
            {
                font = fontFamily.CreateFont(fontSize, SixLabors.Fonts.FontStyle.Bold);
            }
            else if (SystemFonts.Collection.Families.Any())
            {
                font = SystemFonts.Collection.Families.First().CreateFont(fontSize, SixLabors.Fonts.FontStyle.Bold);
            }
            else
            {
                // In unlikely scenario of zero system fonts, return image as-is
                using var fallbackMs = new MemoryStream();
                image.SaveAsJpeg(fallbackMs);
                return fallbackMs.ToArray();
            }

            // Create Canvas with Top Banner expanded (keeps 100% of original document visible)
            using var newImage = new Image<Rgba32>(w, h + bannerHeight);

            newImage.Mutate(ctx =>
            {
                // 1. Draw Slate Banner
                ctx.Fill(SixLabors.ImageSharp.Color.ParseHex("#0f172a"), new RectangleF(0, 0, w, bannerHeight));

                // 2. Draw Original Image below Banner
                ctx.DrawImage(image, new SixLabors.ImageSharp.Point(0, bannerHeight), 1.0f);

                // 3. Compose and Draw Banner Text
                var textParts = new List<string> { $"Roll No: {rollNumber}" };
                if (!string.IsNullOrWhiteSpace(examName)) textParts.Add(examName);
                if (!string.IsNullOrWhiteSpace(subject)) textParts.Add(subject);
                textParts.Add(DateTime.Now.ToString("dd-MM-yyyy HH:mm"));

                string bannerText = string.Join(" | ", textParts);
                ctx.DrawText(bannerText, font, SixLabors.ImageSharp.Color.White, new PointF(16, (bannerHeight - fontSize) / 2));
            });

            using var ms = new MemoryStream();
            newImage.SaveAsJpeg(ms);
            return ms.ToArray();
        }
    }
}
