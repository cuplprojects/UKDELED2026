using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DELED.Models
{
    [Table("centre")]
    public class Centre
    {
        [Key]
        public int Id { get; set; }

        public int CityCode { get; set; }

        public string CityName { get; set; } = string.Empty;

        public int CentreCode { get; set; }

        public string CentreName { get; set; } = string.Empty;

        public int? Capacity { get; set; }

        public string? CentreNameHindi { get; set; }

        public string? CityNameHindi { get; set; }
    }
}
