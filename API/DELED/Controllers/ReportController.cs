using Microsoft.AspNetCore.Mvc;
using DELED.Data;
using DELED.Services;
using System.Threading.Tasks;

namespace DELED.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ReportController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ReportController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("download-daily-report")]
        public async Task<IActionResult> DownloadDailyReport()
        {
            var pdfBytes = await EmailSchedulerService.GetDailyReportPdfBytesAsync(_context);
            string fileName = $"DELED_Report_{DELED.Helpers.TimeHelper.GetIST():dd-MM-yyyy}.pdf";
            return File(pdfBytes, "application/pdf", fileName);
        }
    }
}
