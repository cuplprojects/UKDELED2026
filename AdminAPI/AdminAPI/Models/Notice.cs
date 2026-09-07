using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;


namespace DELED.Models
{
    public class Notice
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int NoticeId {  get; set; }
        public string Name { get; set; }
        public string Path {  get; set; }
    }
}
