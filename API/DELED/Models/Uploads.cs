using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DELED.Models
{
    public class Uploads
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int UploadId { get; set; }

        public int UserId { get; set; }

        public string PhotoFile { get; set; }

        public string SignatureFile { get; set; }
        public string ThumbImp {  get; set; }
    }
}
