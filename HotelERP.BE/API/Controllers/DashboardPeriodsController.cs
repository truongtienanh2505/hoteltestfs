using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HotelERP.BE.Domain.DTOs.Dashboard;
using HotelERP.BE.Application.Interfaces;

namespace HotelERP.BE.API.Controllers;

[Route("api/dashboard-periods")]
[ApiController]
[Authorize]
public class DashboardPeriodsController : ControllerBase
{
    private readonly IRoleDashboardPeriodService _dashboardService;

    public DashboardPeriodsController(IRoleDashboardPeriodService dashboardService)
    {
        _dashboardService = dashboardService;
    }

    [HttpGet("current")]
    public async Task<IActionResult> GetCurrentDashboard(
        [FromQuery] string? roleName,
        [FromQuery] string periodType = "MONTHLY",
        CancellationToken cancellationToken = default)
    {
        var resolvedRoleName = ResolveRoleName(roleName);
        var dashboard = await _dashboardService.GetDashboardAsync(
            resolvedRoleName,
            periodType,
            periodKey: null,
            currentOnly: true,
            cancellationToken);

        return dashboard == null
            ? NotFound(new { message = "Không tìm thấy dashboard hiện tại." })
            : Ok(dashboard);
    }

    [HttpGet("{roleName}/{periodType}/{periodKey}")]
    public async Task<IActionResult> GetDashboardByPeriod(
        string roleName,
        string periodType,
        string periodKey,
        CancellationToken cancellationToken = default)
    {
        var dashboard = await _dashboardService.GetDashboardAsync(
            roleName,
            periodType,
            periodKey,
            currentOnly: false,
            cancellationToken);

        return dashboard == null
            ? NotFound(new { message = "Không tìm thấy dashboard theo kỳ." })
            : Ok(dashboard);
    }

    [HttpGet("{roleName}/{periodType}/history")]
    public async Task<IActionResult> GetHistory(
        string roleName,
        string periodType,
        [FromQuery] int take = 12,
        CancellationToken cancellationToken = default)
    {
        var items = await _dashboardService.GetHistoryAsync(roleName, periodType, take, cancellationToken);
        return Ok(items);
    }

    [HttpPost("rebuild")]
    public async Task<IActionResult> RebuildDashboard(
        [FromBody] DashboardRebuildRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var userId = ResolveUserId();
        var occurredAt = request.OccurredAtUtc ?? DateTime.UtcNow;

        await _dashboardService.RebuildDashboardAsync(
            request.RoleName,
            request.PeriodType,
            occurredAt,
            userId,
            "MANUAL_REBUILD",
            null,
            cancellationToken);

        return Ok(new { message = "Đã rebuild dashboard theo kỳ." });
    }

    [HttpPost("rebuild-current")]
    public async Task<IActionResult> RebuildAllCurrent(CancellationToken cancellationToken = default)
    {
        await _dashboardService.RebuildAllCurrentDashboardsAsync(ResolveUserId(), cancellationToken);
        return Ok(new { message = "Đã rebuild toàn bộ dashboard hiện tại." });
    }

    [HttpPost("events/rebuild-affected")]
    public async Task<IActionResult> RebuildAffectedByEvent(
        [FromBody] DashboardEventRequestDto request,
        CancellationToken cancellationToken = default)
    {
        await _dashboardService.RebuildAffectedDashboardsAsync(
            request.EventType,
            request.OccurredAtUtc ?? DateTime.UtcNow,
            ResolveUserId(),
            request.RefId,
            cancellationToken);

        return Ok(new { message = "Đã cập nhật các dashboard bị ảnh hưởng bởi sự kiện." });
    }

    private string ResolveRoleName(string? requestedRoleName)
    {
        if (!string.IsNullOrWhiteSpace(requestedRoleName))
        {
            return requestedRoleName.Trim();
        }

        return User.FindFirst(ClaimTypes.Role)?.Value ?? "Guest";
    }

    private int? ResolveUserId()
    {
        var raw = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(raw, out var userId) ? userId : null;
    }
}
