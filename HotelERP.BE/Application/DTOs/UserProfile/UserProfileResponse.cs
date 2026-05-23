namespace HotelERP.BE.Application.DTOs.Auth;

public class UserProfileResponse
{
    public int Id { get; set; }
    public string FullName { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string? Phone { get; set; }
    public string? AvatarUrl { get; set; }
    public string? Address { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public int LoyaltyPoints { get; set; }
    
    // Chỉ trả về Tên quyền (VD: "Admin", "Customer") thay vì cả bảng Role
    public string? RoleName { get; set; } 

    public string? MembershipTier { get; set; }
    public decimal MembershipDiscount { get; set; }
}