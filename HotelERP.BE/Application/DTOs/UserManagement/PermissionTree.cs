namespace HotelERP.BE.Application.DTOs.UserManagement;

public class PermissionTree
{
    public string Title { get; set; } = null!;
    public string Key { get; set; } = null!;
    public List<PermissionNode> Children { get; set; } = new();
}

public class PermissionNode
{
    public string Title { get; set; } = null!;
    public string Key { get; set; } = null!; // Sẽ chứa tên quyền (VD: "MANAGE_USERS")
}