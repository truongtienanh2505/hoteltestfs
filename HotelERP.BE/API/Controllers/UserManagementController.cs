using HotelERP.BE.Application.DTOs.UserManagement;
using HotelERP.BE.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using HotelERP.BE.API.Filters;
using Microsoft.AspNetCore.Mvc;
using HotelERP.BE.Constants;


namespace HotelERP.BE.API.Controllers;

[Route("api/[controller]")]
[ApiController]
public class UserManagementController : ControllerBase
{
    private readonly IUserManagementService _userService;

    public UserManagementController(IUserManagementService userService)
    {
        _userService = userService;
    }

    [HttpGet]
    [Authorize(Policy = PermissionKeys.ManageUsers)]
    public async Task<IActionResult> GetAll()
    {
        var users = await _userService.GetAllUsersAsync();
        return Ok(users);
    }

    [HttpGet("roles-with-permissions")]
    [Authorize(Policy = PermissionKeys.ManageRoles)]
    public async Task<IActionResult> GetRolesWithPermissions()
    {
    var roles = await _userService.GetRolesWithPermissionsAsync();
    return Ok(new { success = true, data = roles });
    }

    [HttpPost]
    [Authorize(Policy = PermissionKeys.ManageUsers)]
    public async Task<IActionResult> Create([FromBody] AdminCreateUserRequest request)
    {
        try {
            await _userService.CreateUserAsync(request);
            return Ok(new { message = "Tạo người dùng thành công." });
        } catch (Exception ex) {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id}")]
    [Authorize(Policy = PermissionKeys.ManageUsers)]
    public async Task<IActionResult> Update(int id, [FromBody] AdminUpdateUserRequest request)
    {
        try 
        {
            var result = await _userService.UpdateUserAsync(id, request);
            // Nếu result = false (tức là không tìm thấy user id trong DB), nó sẽ trả về 404
            return result ? Ok(new { message = "Cập nhật thành công." }) : NotFound(new { message = $"Không tìm thấy User với ID: {id}" });
        } 
        catch (Exception ex) 
        {
            return StatusCode(500, new { message = "Lỗi Server: " + ex.Message, inner = ex.InnerException?.Message });
        }
    }

    [HttpDelete("{id}")]
    [Authorize(Policy = PermissionKeys.ManageUsers)]
    [AuditLogInterceptor("Vô hiệu hóa tài khoản", "Users")] // Gắn Attribute để tự động ghi log khi xóa
    public async Task<IActionResult> Delete(int id)
    {
        var result = await _userService.DeleteUserAsync(id);
        return result ? Ok(new { message = "Đã vô hiệu hóa người dùng." }) : NotFound();
    }

    [HttpPut("{id}/change-role")]
    [Authorize(Policy = PermissionKeys.ManageUsers)]
    [AuditLogInterceptor("Thay đổi quyền hạn", "Users")] // Gắn Attribute để tự động ghi log khi thay đổi quyền
    public async Task<IActionResult> ChangeRole(int id, [FromBody] int newRoleId)
    {
        var result = await _userService.ChangeUserRoleAsync(id, newRoleId);
        return result ? Ok(new { message = "Đã thay đổi quyền hạn." }) : NotFound();
    }
    
    [HttpGet("permissions/grouped")]
    [Authorize(Policy = PermissionKeys.ManageRoles)]
    public async Task<IActionResult> GetGroupedPermissions()
    {
    var data = await _userService.GetGroupedPermissionsAsync();
    return Ok(new { success = true, data = data });
    }

    [HttpPut("roles/{roleId}/permissions")]
    [Authorize(Policy = PermissionKeys.ManageRoles)]
    public async Task<IActionResult> UpdateRolePermissions(int roleId, [FromBody] RolePermissionsRequest request)
    {   
    try
    {
        await _userService.UpdateRolePermissionsAsync(roleId, request);
        return Ok(new { success = true, message = "Cập nhật phân quyền thành công!" });
    }
    catch (Exception ex)
    {
        return BadRequest(new { success = false, message = ex.Message });
    }
    }
    [HttpGet("roles")]
    [Authorize(Policy = PermissionKeys.ManageRoles)]
    public async Task<IActionResult> GetAllRoles()
    {
        try
        {
        // Controller chỉ làm nhiệm vụ nhận Request và gọi Service
        var roles = await _userService.GetAllRolesAsync();
        return Ok(new { success = true, data = roles });
        }
        catch (Exception ex)
        {
        return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpGet("{id}/permissions")]
    [Authorize(Policy = PermissionKeys.ManageUsers)]
    public async Task<IActionResult> GetUserPermissions(int id)
    {
    var permissions = await _userService.GetUserEffectivePermissionsAsync(id);
    return Ok(new { success = true, data = permissions });
    }

    [HttpPut("{id}/permissions")]
    [Authorize(Policy = PermissionKeys.ManageUsers)]
    public async Task<IActionResult> UpdateUserPermissions(int id, [FromBody] List<string> permissionCodes)
    {
    var result = await _userService.UpdateUserSpecificPermissionsAsync(id, permissionCodes);
    if (!result) return BadRequest(new { message = "Lỗi khi cập nhật quyền cá nhân." });
    return Ok(new { success = true, message = "Cập nhật quyền ngoại lệ thành công!" });
    }
}