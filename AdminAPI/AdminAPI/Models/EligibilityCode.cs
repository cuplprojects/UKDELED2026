using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace DELED.Models
{
    public class EligibilityCode
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int EligibilityCodeId { get; set; }
        public string Name { get; set; }
        public string path { get; set; }
    }
}
