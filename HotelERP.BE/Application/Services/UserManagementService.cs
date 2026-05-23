using HotelERP.BE.Application.DTOs.UserManagement;
using HotelERP.BE.Application.Interfaces;
using HotelERP.BE.Domain.Models;
using HotelERP.BE.Infrastructure.Data;
using MediatR;
using Microsoft.EntityFrameworkCore;
using HotelERP.BE.Events;
using HotelERP.BE.Models; 
using HotelERP.BE.Helpers.AuditLogs;
using Microsoft.AspNetCore.Http;
using System.Security.Claims;
using Microsoft.AspNetCore.SignalR;
using HotelERP.BE.Hubs;

namespace HotelERP.BE.Application.Services;

public class UserManagementService : IUserManagementService
{
    private readonly HotelDbContext _context;
    private readonly IMediator _mediator;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IHubContext<NotificationHub> _hubContext;

    public UserManagementService(HotelDbContext context, IMediator mediator, IHttpContextAccessor httpContextAccessor, IHubContext<NotificationHub> hubContext) 
    {
        _context = context;
        _mediator = mediator;
        _httpContextAccessor = httpContextAccessor;
        _hubContext = hubContext;
    }

    private (int UserId, string RoleName) ResolveUser()
    {
        var user = _httpContextAccessor.HttpContext?.User;
        var userIdClaim = user?.FindFirst("UserId")?.Value ?? user?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        int userId = int.TryParse(userIdClaim, out int id) ? id : 0;
        var roleName = user?.FindFirst(ClaimTypes.Role)?.Value ?? "User";
        return (userId, roleName);
    }

    public async Task<IEnumerable<UserListItemResponse>> GetAllUsersAsync()
    {
        return await _context.Users
            .Include(u => u.Role)
            .OrderByDescending(u => u.CreatedAt)
            .Select(u => new UserListItemResponse {
                Id = u.Id,
                FullName = u.FullName,
                Email = u.Email,
                Phone = u.Phone,
                RoleName = u.Role != null ? u.Role.Name : "N/A",
                Status = u.Status,
                CreatedAt = u.CreatedAt
            }).ToListAsync();
    }

    public async Task<bool> CreateUserAsync(AdminCreateUserRequest request)
    {
        if (await _context.Users.AnyAsync(u => u.Email == request.Email))
            throw new Exception("Email đã tồn tại.");

        var user = new User {
            FullName = request.FullName,
            Email = request.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            RoleId = request.RoleId,
            Phone = request.Phone,
            Status = true,
            CreatedAt = DateTime.UtcNow
        };

        await _context.Users.AddAsync(user);
        var result = await _context.SaveChangesAsync() > 0;

        if (result)
        {
            var (resolvedUserId, resolvedRole) = ResolveUser();
            await _context.AddAuditLogAsync(
                userId: resolvedUserId,
                roleName: resolvedRole,
                actionType: "CREATE",
                entityType: "Users",
                message: $"Tạo mới tài khoản nhân viên '{user.FullName}'.",
                contextParams: new { newUserId = user.Id },
                changes: new { newData = new { user.FullName, user.Email, user.RoleId, user.Status } }
            );

            // PHÁT SỰ KIỆN: Báo cho hệ thống biết có User mới
            await _mediator.Publish(new UserActivityEvent(user.FullName, "Create"));
        }

        return result;
    }

    public async Task<bool> DeleteUserAsync(int id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) return false;

        user.Status = false; 
        var isSuccess = await _context.SaveChangesAsync() > 0;

        if (isSuccess)
        {
            var (resolvedUserId, resolvedRole) = ResolveUser();
            await _context.AddAuditLogAsync(
                userId: resolvedUserId,
                roleName: resolvedRole,
                actionType: "DELETE",
                entityType: "Users",
                message: $"Vô hiệu hóa tài khoản '{user.FullName}'.",
                contextParams: new { disabledUserId = user.Id },
                changes: new { oldData = new { Status = true }, newData = new { Status = false } }
            );

            // PHÁT SỰ KIỆN: Khóa tài khoản
            await _mediator.Publish(new UserActivityEvent(user.FullName, "Lock"));
        }

        return isSuccess;
    }

    public async Task<bool> ChangeUserRoleAsync(int id, int newRoleId)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) return false;

        user.RoleId = newRoleId;
        var isSuccess = await _context.SaveChangesAsync() > 0;

        if (isSuccess)
        {
            var (resolvedUserId, resolvedRole) = ResolveUser();
            await _context.AddAuditLogAsync(
                userId: resolvedUserId,
                roleName: resolvedRole,
                actionType: "UPDATE",
                entityType: "Users",
                message: $"Thay đổi chức vụ của '{user.FullName}' thành Role ID: {newRoleId}.",
                contextParams: new { targetUserId = user.Id, newRoleId },
                changes: new { newData = new { RoleId = newRoleId } }
            );

            // PHÁT SỰ KIỆN: Đổi quyền
            await _mediator.Publish(new UserActivityEvent(user.FullName, "ChangeRole"));
        }

        return isSuccess;
    }

    public async Task<bool> UpdateUserAsync(int id, AdminUpdateUserRequest request)
    {
    var user = await _context.Users.FindAsync(id);
    if (user == null) return false;

    // 1. Lưu lại trạng thái cũ để biết là đang Khóa hay Mở khóa
    bool oldStatus = user.Status;

    // 2. FIX 500: Chỉ cập nhật nếu FE có gửi dữ liệu
    if (!string.IsNullOrEmpty(request.FullName)) user.FullName = request.FullName;
    if (!string.IsNullOrEmpty(request.Phone)) user.Phone = request.Phone;
    if (request.RoleId.HasValue) user.RoleId = request.RoleId.Value;
    
    user.Status = request.Status;

    // 3. Lưu vào DB
    var isSuccess = await _context.SaveChangesAsync() > 0;

    // 4. PHÁT SỰ KIỆN MEDIATR (Chỉ phát chuông khi trạng thái bị gạt đổi)
    if (oldStatus != request.Status)
    {
        var actionType = request.Status ? "Unlock" : "Lock"; 
        
        var (resolvedUserId, resolvedRole) = ResolveUser();
        var statusKeyword = request.Status ? "Khôi phục hoạt động" : "Vô hiệu hóa";
        await _context.AddAuditLogAsync(
            userId: resolvedUserId,
            roleName: resolvedRole,
            actionType: "UPDATE",
            entityType: "Users",
            message: $"{statusKeyword} tài khoản '{user.FullName}'.",
            contextParams: new { targetUserId = user.Id },
            changes: new { oldData = new { Status = oldStatus }, newData = new { Status = request.Status } }
        );

        await _mediator.Publish(new UserActivityEvent(user.FullName, actionType));
    }
    else
    {
        var (resolvedUserId, resolvedRole) = ResolveUser();
        await _context.AddAuditLogAsync(
            userId: resolvedUserId,
            roleName: resolvedRole,
            actionType: "UPDATE",
            entityType: "Users",
            message: $"Cập nhật thông tin tài khoản '{user.FullName}'.",
            contextParams: new { targetUserId = user.Id },
            changes: new { newData = new { request.FullName, request.Phone, request.RoleId } }
        );
    }

    return true;
    }

    public async Task<IEnumerable<RolePermissionResponse>> GetRolesWithPermissionsAsync()
    {
    return await _context.Roles
        .Include(r => r.RolePermissions)
        .ThenInclude(rp => rp.Permission)
        .Select(r => new RolePermissionResponse {
            RoleId = r.Id,
            RoleName = r.Name,
            // Rút trích mảng tên quyền (VD: ["VIEW_DASHBOARD", "MANAGE_ROOMS"])
            Permissions = r.RolePermissions.Select(rp => rp.Permission.Name).ToList()
        })
        .ToListAsync();
    }
    // 1. Hàm lấy danh sách Quyền và gom nhóm
public async Task<List<PermissionTree>> GetGroupedPermissionsAsync()
{
    // Lấy tất cả quyền từ DB (Bảng Permissions [id, name])
    var allPermissions = await _context.Permissions.ToListAsync();

    // Do bảng gốc của bạn chỉ có id và name, ta sẽ tự gom nhóm bằng code để UI đẹp hơn
    var tree = new List<PermissionTree>
    {
        new PermissionTree 
        { 
            Title = "1. Hệ thống & Báo cáo", Key = "g1",
            Children = allPermissions.Where(p => new[] { 
                "VIEW_DASHBOARD", "VIEW_REPORTS", "VIEW_SYSTEM_LOGS", "VIEW_NOTIFICATIONS" 
            }.Contains(p.Name))
            .Select(p => new PermissionNode { Title = p.Name, Key = p.Name }).ToList()
        },
        new PermissionTree 
        { 
            Title = "2. Quản lý Nhân sự & Phân quyền", Key = "g2",
            Children = allPermissions.Where(p => new[] { 
                "MANAGE_USERS", "MANAGE_ROLES" 
            }.Contains(p.Name))
            .Select(p => new PermissionNode { Title = p.Name, Key = p.Name }).ToList()
        },
        new PermissionTree 
        { 
            Title = "3. Quản lý Phòng & Tiện nghi", Key = "g3",
            Children = allPermissions.Where(p => new[] { 
                "VIEW_ROOMS", "MANAGE_ROOMS", "UPDATE_ROOM_STATUS", "MANAGE_AMENITIES", "MANAGE_MAINTENANCE" 
            }.Contains(p.Name))
            .Select(p => new PermissionNode { Title = p.Name, Key = p.Name }).ToList()
        },
        new PermissionTree 
        { 
            Title = "4. Quản lý Đặt phòng & Tài chính", Key = "g4",
            Children = allPermissions.Where(p => new[] { 
                "MANAGE_BOOKINGS", "MANAGE_INVOICES", "CHECK_IN_OUT" 
            }.Contains(p.Name))
            .Select(p => new PermissionNode { Title = p.Name, Key = p.Name }).ToList()
        },
        new PermissionTree 
        { 
            Title = "5. Dịch vụ, Nội dung & Kho", Key = "g5",
            Children = allPermissions.Where(p => new[] { 
                "MANAGE_SERVICES", "MANAGE_CONTENT", "MANAGE_INVENTORY" 
            }.Contains(p.Name))
            .Select(p => new PermissionNode { Title = p.Name, Key = p.Name }).ToList()
        }
    };

    return tree;
}

// 2. Hàm Cập nhật Quyền cho Role
public async Task<bool> UpdateRolePermissionsAsync(int roleId, RolePermissionsRequest request)
{
    if (request.PermissionCodes == null) request.PermissionCodes = new List<string>();

    // Tìm Role trong DB
    var role = await _context.Roles
        .Include(r => r.RolePermissions)
        .FirstOrDefaultAsync(r => r.Id == roleId);

    if (role == null) throw new Exception("Không tìm thấy chức vụ này!");

    // Không cho phép sửa quyền của Admin (An toàn hệ thống)
    if (role.Name == "Admin") throw new Exception("Không thể thay đổi quyền của Admin tối cao!");

    // Cập nhật thông tin cơ bản
    role.Description = request.Description ?? role.Description;
    // role.Status = request.Status; // (Mở comment nếu bảng Roles của bạn có cột Status)

    var currentPermissionIds = role.RolePermissions.Select(rp => rp.PermissionId).ToList();

    // Lấy ID của các quyền mới dựa trên PermissionCodes (Name) gửi lên
    var newPermissions = await _context.Permissions
        .Where(p => request.PermissionCodes.Contains(p.Name))
        .ToListAsync();
    var newPermissionIds = newPermissions.Select(p => p.Id).ToList();

    // XÓA các quyền cũ không còn được chọn
    var permissionsToRemove = role.RolePermissions
        .Where(rp => !newPermissionIds.Contains(rp.PermissionId))
        .ToList();
    _context.RolePermissions.RemoveRange(permissionsToRemove);

    // THÊM CÁC quyền mới vào (bỏ qua những quyền đã có sẵn)
    var permissionIdsToAdd = newPermissionIds
        .Where(id => !currentPermissionIds.Contains(id))
        .ToList();

    foreach (var permissionId in permissionIdsToAdd)
    {
        _context.RolePermissions.Add(new RolePermission 
        { 
            RoleId = roleId, 
            PermissionId = permissionId 
        });
    }

    await _context.SaveChangesAsync();

    var (resolvedUserId, resolvedRole) = ResolveUser();
    await _context.AddAuditLogAsync(
        userId: resolvedUserId,
        roleName: resolvedRole,
        actionType: "UPDATE",
        entityType: "Roles",
        message: $"Cập nhật phân quyền cho chức vụ '{role.Name}'.",
        contextParams: new { targetRoleId = role.Id },
        changes: new { newData = new { role.Description, GrantedPermissions = request.PermissionCodes } }
    );

    // Kích hoạt SignalR yêu cầu tất cả client cập nhật quyền ngầm
    await _hubContext.Clients.All.SendAsync("PermissionsUpdated");

    return true;
    }
    // Hàm lấy tất cả Role để hiển thị trong dropdown 
    public async Task<List<RoleListItemResponse>> GetAllRolesAsync()
    {
    var roles = await _context.Roles
        .Select(r => new RoleListItemResponse
        {
            Id = r.Id,
            Name = r.Name,
            Description = r.Description,
            // Lấy mảng tên các quyền của Role này để Frontend check cây phân quyền
            PermissionCodes = r.RolePermissions.Select(rp => rp.Permission.Name).ToList(),
            Status = true // Tạm hardcode true nếu bảng Roles của bạn không có cột trạng thái
        })
        .ToListAsync();

    return roles;
    }
    // HÀM 1: Lấy danh sách quyền thực tế của cá nhân (Gộp Role + Ngoại lệ)
public async Task<List<string>> GetUserEffectivePermissionsAsync(int userId)
{
    var user = await _context.Users
        .Include(u => u.Role).ThenInclude(r => r!.RolePermissions).ThenInclude(rp => rp.Permission)
        .Include(u => u.UserPermissions).ThenInclude(up => up.Permission)
        .FirstOrDefaultAsync(u => u.Id == userId);

    if (user == null) return new List<string>();

    var finalPermissions = new HashSet<string>();
    
    // A. Lấy quyền gốc từ chức vụ (Role)
    if (user.Role?.RolePermissions != null)
        foreach (var rp in user.Role.RolePermissions) finalPermissions.Add(rp.Permission!.Name);

    // B. Ghi đè bằng Ngoại lệ cá nhân (UserPermissions)
    if (user.UserPermissions != null)
    {
        foreach (var up in user.UserPermissions)
        {
            if (up.IsGranted) finalPermissions.Add(up.Permission!.Name); // Cấp thêm
            else finalPermissions.Remove(up.Permission!.Name); // Tước đi
        }
    }
    return finalPermissions.ToList();
}

// HÀM 2: Thuật toán so sánh và lưu ngoại lệ
public async Task<bool> UpdateUserSpecificPermissionsAsync(int userId, List<string> selectedPermissionCodes)
{
    if (selectedPermissionCodes == null) selectedPermissionCodes = new List<string>();

    var user = await _context.Users
        .Include(u => u.Role).ThenInclude(r => r!.RolePermissions)
        .FirstOrDefaultAsync(u => u.Id == userId);
    
    if (user == null) return false;

    // Lấy ID các quyền mà Chức vụ (Role) đang có
    var rolePermissionIds = user.Role?.RolePermissions.Select(rp => rp.PermissionId).ToList() ?? new List<int>();

    // Lấy ID các quyền mà Frontend gửi lên (Quyền mong muốn)
    var selectedPermissionIds = await _context.Permissions
        .Where(p => selectedPermissionCodes.Contains(p.Name))
        .Select(p => p.Id).ToListAsync();

    // Xóa toàn bộ ngoại lệ cũ của user này để tính toán lại từ đầu
    var existingOverrides = await _context.UserPermissions.Where(up => up.UserId == userId).ToListAsync();

    // THUẬT TOÁN LỌC NGOẠI LỆ: So sánh [Quyền mong muốn] với [Quyền gốc của Role]
    var allPermissionIds = await _context.Permissions.Select(p => p.Id).ToListAsync();
    
    var newOverrides = new List<UserPermission>();
    foreach (var pId in allPermissionIds)
    {
        bool shouldHave = selectedPermissionIds.Contains(pId);
        bool roleHas = rolePermissionIds.Contains(pId);

        if (shouldHave && !roleHas) // Role không có, nhưng User cần có -> CẤP THÊM
            newOverrides.Add(new UserPermission { UserId = userId, PermissionId = pId, IsGranted = true });
        
        else if (!shouldHave && roleHas) // Role có, nhưng User không được phép có -> TƯỚC ĐI
            newOverrides.Add(new UserPermission { UserId = userId, PermissionId = pId, IsGranted = false });
    }

    // Cập nhật lại list ngoại lệ: Xóa những cái không còn, thêm những cái mới, cập nhật cái cũ
    foreach (var existing in existingOverrides.ToList())
    {
        var match = newOverrides.FirstOrDefault(n => n.PermissionId == existing.PermissionId);
        if (match == null)
        {
            _context.UserPermissions.Remove(existing); // Không còn là ngoại lệ nữa
        }
        else
        {
            if (existing.IsGranted != match.IsGranted)
            {
                existing.IsGranted = match.IsGranted; // Cập nhật lại trạng thái
            }
            newOverrides.Remove(match); // Đã xử lý, loại ra khỏi list cần thêm
        }
    }

    // Các phần tử còn lại trong newOverrides là những ngoại lệ mới chưa từng có
    _context.UserPermissions.AddRange(newOverrides);

    await _context.SaveChangesAsync();

    var (resolvedUserId, resolvedRole) = ResolveUser();
    await _context.AddAuditLogAsync(
        userId: resolvedUserId,
        roleName: resolvedRole,
        actionType: "UPDATE",
        entityType: "UserPermissions",
        message: $"Cập nhật quyền ngoại lệ cá nhân cho tài khoản '{user.FullName}'.",
        contextParams: new { targetUserId = user.Id },
        changes: new { newData = new { GrantedOverridePermissions = selectedPermissionCodes } }
    );

    // Kích hoạt SignalR yêu cầu tất cả client cập nhật quyền ngầm
    await _hubContext.Clients.All.SendAsync("PermissionsUpdated");

    return true;
}
}