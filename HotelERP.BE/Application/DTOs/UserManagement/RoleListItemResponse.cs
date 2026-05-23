namespace HotelERP.BE.Application.DTOs.UserManagement;

public class RoleListItemResponse
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public bool Status { get; set; }
    public List<string> PermissionCodes { get; set; } = new();
}