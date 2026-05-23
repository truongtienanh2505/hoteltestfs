namespace HotelERP.BE.Application.DTOs.UserManagement;

public class RolePermissionResponse
{
    public int RoleId { get; set; }
    public string RoleName { get; set; } = null!;
    public List<string> Permissions { get; set; } = new();
}