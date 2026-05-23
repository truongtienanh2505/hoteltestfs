using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using HotelERP.BE.Domain.Models;

namespace HotelERP.BE.Models 
{
    // Tên cột DB thực tế (xác nhận từ INFORMATION_SCHEMA.COLUMNS):
    // id, user_id, title, content, type, reference_link, is_read, created_at
    [Table("Notifications")]
    public class Notification
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("id")]
        public int Id { get; set; }

        [Column("user_id")]
        public int? UserId { get; set; } 
        
        [ForeignKey("UserId")]
        public virtual User? User { get; set; } 

        [Required]
        [MaxLength(255)]
        [Column("title")]
        public string Title { get; set; } = string.Empty;

        [Required]
        [Column("content")]
        public string Content { get; set; } = string.Empty;

        [MaxLength(50)]
        [Column("type")]
        public string? Type { get; set; } 

        [MaxLength(255)]
        [Column("reference_link")]
        public string? ReferenceLink { get; set; }

        [Column("is_read")]
        public bool IsRead { get; set; } = false; 

        [Column("created_at")]
        public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;
    }
}