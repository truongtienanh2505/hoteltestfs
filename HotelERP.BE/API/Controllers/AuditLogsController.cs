using System.Threading.Tasks;
using HotelERP.BE.Application.DTOs.AuditLogs;
using HotelERP.BE.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace HotelERP.BE.API.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class AuditLogsController : ControllerBase
{
    private readonly IAuditLogService _auditLogService;

    public AuditLogsController(IAuditLogService auditLogService)
    {
        _auditLogService = auditLogService;
    }

    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] AuditLogQueryDto query)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(userIdString, out int userId))
            return Unauthorized();

        var role = User.FindFirst(ClaimTypes.Role)?.Value ?? string.Empty;

        var logs = await _auditLogService.GetAuditLogsAsync(query, userId, role);
        return Ok(new { success = true, message = "Success", data = logs });
    }

    [HttpGet("export")]
    public async Task<IActionResult> Export([FromQuery] AuditLogQueryDto query)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(userIdString, out int userId))
            return Unauthorized();

        var role = User.FindFirst(ClaimTypes.Role)?.Value ?? string.Empty;

        // Phân quyền export: Chỉ Admin/Manager mới được export
        if (role != "Admin" && role != "Manager")
        {
            return Forbid("Bạn không có quyền xuất dữ liệu này.");
        }

        var fileBytes = await _auditLogService.ExportToExcelAsync(query, userId, role);
        var fileName = $"AuditLogs_{System.DateTime.Now:yyyyMMdd_HHmmss}.xlsx";
        
        return File(fileBytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
    }
    /// <summary>
    /// [Admin only] Xóa ngay các audit log có LogDate cũ hơn 3 tháng tính theo date lưu trong DB.
    /// Không cần đợi Hangfire job chạy theo lịch.
    /// </summary>
    [HttpDelete("purge")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> PurgeOldLogs()
    {
        var deletedCount = await _auditLogService.PurgeOldLogsAsync();
        return Ok(new
        {
            success = true,
            message = $"Đã xóa {deletedCount} bản ghi audit log cũ hơn 3 tháng.",
            deletedCount
        });
    }
}
