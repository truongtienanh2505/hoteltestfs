namespace HotelERP.BE.Application.DTOs.UserManagement;

public class RolePermissionsRequest
{
    public string? Description { get; set; }
    public bool Status { get; set; }
    // Mảng chứa danh sách tên các quyền được chọn (VD: ["VIEW_DASHBOARD", "MANAGE_USERS"])
    public List<string> PermissionCodes { get; set; } = new(); 
}