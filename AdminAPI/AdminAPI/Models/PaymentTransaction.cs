using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DELED.Models
{
    [Table("PaymentTransactions")]
    public class PaymentTransaction
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public long Id { get; set; }

        [Required]
        public int UserId { get; set; }

        [StringLength(100)]
        public string MerchantTxnId { get; set; }

        [Column(TypeName = "decimal(18, 2)")]
        public decimal Amount { get; set; }

        [StringLength(100)]
        public string AtomTxnId { get; set; }

        [StringLength(50)]
        public string Status { get; set; }

        [Required]
        public DateTime CreatedOn { get; set; }

        public DateTime? UpdatedOn { get; set; }

        public string ResponseJson { get; set; }

    }
}
