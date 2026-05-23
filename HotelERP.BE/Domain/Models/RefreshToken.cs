using System;

namespace HotelERP.BE.Domain.Models;

public partial class RefreshToken
{
    public int Id { get; set; }
    public int UserId { get; set; }
    
    public string Token { get; set; } = null!;
    
    // Lưu lại ID của Access Token đi kèm để chống tái sử dụng (Bảo mật cao)
    public string JwtId { get; set; } = null!; 
    
    public bool IsUsed { get; set; }
    
    // Tuân thủ nguyên tắc Soft Delete / Thu hồi quyền
    public bool IsRevoked { get; set; } 
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpireAt { get; set; }

    // Navigation property liên kết với bảng Users (Bảng số 21 của bạn)
    public virtual User User { get; set; } = null!;
}