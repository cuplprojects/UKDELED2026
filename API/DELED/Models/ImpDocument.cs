using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;


namespace DELED.Models
{
    public class ImpDocument
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int ImpDocumentId { get; set; }
        public string Name { get; set; }
        public string Path { get; set; }
    }
}
