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

        private static string SanitizeText(string? input, string fallback = "")
        {
            if (string.IsNullOrWhiteSpace(input)) return fallback;

            // Check if string contains Devanagari or non-ASCII characters that cannot render in standard PDF ANSI fonts
            bool hasNonAscii = input.Any(c => c > 127);
            if (hasNonAscii)
            {
                // If it contains Hindi text for exam name, use clean English equivalent
                if (input.Contains("डी०एल०एड०") || input.Contains("डी.एल.एड") || input.Contains("उत्तराखण्ड") || input.Contains("परीक्षा") || input.Contains("प्रवेश"))
                {
                    return "UK D.El.Ed. Exam 2026";
                }

                // Keep only printable ASCII characters (32 to 126)
                var cleanChars = input.Where(c => c >= 32 && c <= 126).ToArray();
                string cleaned = new string(cleanChars).Trim();
                return string.IsNullOrWhiteSpace(cleaned) ? fallback : cleaned;
            }

            return input.Trim();
        }

        private byte[] SuperimposePdf(Stream pdfStream, string rollNumber, string? examName, string? subject)
        {
            if (pdfStream.CanSeek) pdfStream.Position = 0;

            using var outputMs = new MemoryStream();
            using var document = PdfReader.Open(pdfStream, PdfDocumentOpenMode.Modify);

            int totalPages = document.PageCount;
            if (totalPages == 0) throw new InvalidOperationException("PDF contains no pages.");

            string cleanExamName = SanitizeText(examName, "UK D.El.Ed. Exam 2026");
            string cleanSubject = SanitizeText(subject);
            string cleanRoll = SanitizeText(rollNumber);
            string dateStr = DateTime.Now.ToString("dd-MM-yyyy HH:mm");

            // Compose Banner Text (clean ASCII to prevent missing glyph tofu square brackets in PDF)
            var textParts = new List<string>
            {
                $"Roll No: {cleanRoll}"
            };
            if (!string.IsNullOrWhiteSpace(cleanExamName)) textParts.Add(cleanExamName);
            if (!string.IsNullOrWhiteSpace(cleanSubject)) textParts.Add(cleanSubject);
            textParts.Add(dateStr);

            string bannerText = string.Join(" | ", textParts);

            // Attest EVERY page in the PDF document
            for (int pageIdx = 0; pageIdx < totalPages; pageIdx++)
            {
                var page = document.Pages[pageIdx];
                double pw = page.Width.Point;
                double ph = page.Height.Point;

                using (var gfx = XGraphics.FromPdfPage(page, XGraphicsPdfPageOptions.Append))
                {
                    double bannerHeight = Math.Max(26.0, ph * 0.038);
                    double badgeFontSize = Math.Max(9.0, bannerHeight * 0.42);

                    // 1. Dark Slate Theme (#0F172A) with 94% opacity background banner
                    var bannerBrush = new XSolidBrush(XColor.FromArgb(240, 15, 23, 42));
                    gfx.DrawRectangle(bannerBrush, 0, 0, pw, bannerHeight);

                    // 2. Calculate Page Badge dimensions on Right: $"{pageIdx + 1}/{totalPages}"
                    string pageBadge = $"{pageIdx + 1}/{totalPages}";
                    var badgeFont = new XFont("Arial", badgeFontSize, XFontStyle.Bold);
                    var badgeBrush = new XSolidBrush(XColor.FromArgb(51, 65, 85)); // #334155
                    var textBrush = new XSolidBrush(XColor.FromArgb(255, 255, 255));

                    double badgeWidth = Math.Max(44.0, (pageBadge.Length * badgeFontSize * 0.65) + 16.0);
                    double badgeHeight = bannerHeight - 8.0;
                    double badgeX = pw - badgeWidth - 12.0;
                    double badgeY = 4.0;

                    // 3. Dynamic font scaling for bannerText so it NEVER overlaps with the page badge
                    double maxTextWidth = badgeX - 24.0;
                    double textFontSize = badgeFontSize;
                    var textFont = new XFont("Arial", textFontSize, XFontStyle.Bold);
                    var textMeasure = gfx.MeasureString(bannerText, textFont);

                    while (textMeasure.Width > maxTextWidth && textFontSize > 7.5)
                    {
                        textFontSize -= 0.5;
                        textFont = new XFont("Arial", textFontSize, XFontStyle.Bold);
                        textMeasure = gfx.MeasureString(bannerText, textFont);
                    }

                    // If still wider than available space, safely clip/truncate
                    string displayText = bannerText;
                    if (textMeasure.Width > maxTextWidth)
                    {
                        while (displayText.Length > 10 && gfx.MeasureString(displayText + "...", textFont).Width > maxTextWidth)
                        {
                            displayText = displayText.Substring(0, displayText.Length - 1);
                        }
                        displayText += "...";
                    }

                    // 4. Draw Text on Left
                    gfx.DrawString(displayText, textFont, textBrush, new XPoint(14, (bannerHeight / 2) + (textFontSize * 0.35)));

                    // 5. Draw Page Badge on Right (always clean and non-overlapping)
                    gfx.DrawRoundedRectangle(badgeBrush, badgeX, badgeY, badgeWidth, badgeHeight, 4, 4);
                    gfx.DrawString(pageBadge, badgeFont, textBrush, new XPoint(badgeX + 8, badgeY + (badgeHeight / 2) + (badgeFontSize * 0.35)));
                }
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
                var cleanExamName = SanitizeText(examName, "UK D.El.Ed. Entrance Exam 2026");
                var cleanSubject = SanitizeText(subject);
                var cleanRoll = SanitizeText(rollNumber);

                var textParts = new List<string> { $"Roll No: {cleanRoll}" };
                if (!string.IsNullOrWhiteSpace(cleanExamName)) textParts.Add(cleanExamName);
                if (!string.IsNullOrWhiteSpace(cleanSubject)) textParts.Add(cleanSubject);
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
