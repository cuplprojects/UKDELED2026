using System;

namespace DELED.Helpers
{
    public static class TimeHelper
    {
        /// <summary>
        /// Gets the current Indian Standard Time (IST) by adding 5 hours and 30 minutes to UTC.
        /// </summary>
        /// <returns>DateTime in IST</returns>
        public static DateTime GetIST()
        {
            // The server's system clock is 5 minutes fast. 
            // We get UTC, convert to IST, and then subtract 5 minutes to get the TRUE time.
            return DateTime.UtcNow.AddHours(5).AddMinutes(30).AddMinutes(-5);
        }
    }
}
