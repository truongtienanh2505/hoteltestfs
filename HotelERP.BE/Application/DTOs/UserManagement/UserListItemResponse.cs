namespace HotelERP.BE.Application.DTOs.UserManagement;

public class UserListItemResponse
{
    public int Id { get; set; }
    public string FullName { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string? RoleName { get; set; }
    public string? Phone { get; set; }
    public bool Status { get; set; }
    public DateTime CreatedAt { get; set; }
}