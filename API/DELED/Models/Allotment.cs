using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DELED.Models
{
    [Table("allotment")]
    public class Allotment
    {
        [Key]
        public int AllotmentId { get; set; }

        public int UserId { get; set; }

        public string AssignedCity { get; set; } = string.Empty;

        public string AssignedCentre { get; set; } = string.Empty;

        public string AssignedCityCentre { get; set; } = string.Empty;

        public int RollNumber { get; set; }

        public int? RoomNumber { get; set; }

        public int? SeatRow { get; set; }

        public int? SeatNumber { get; set; }

        public DateTime? AllotmentDate { get; set; }
    }
}
