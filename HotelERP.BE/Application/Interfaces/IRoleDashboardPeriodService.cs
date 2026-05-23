using HotelERP.BE.Domain.DTOs.Dashboard;

namespace HotelERP.BE.Application.Interfaces;

public interface IRoleDashboardPeriodService
{
    Task<DashboardPeriodResponseDto?> GetDashboardAsync(
        string roleName,
        string periodType,
        string? periodKey,
        bool currentOnly,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<DashboardHistoryItemDto>> GetHistoryAsync(
        string roleName,
        string periodType,
        int take,
        CancellationToken cancellationToken = default);

    Task RebuildDashboardAsync(
        string roleName,
        string periodType,
        DateTime occurredAtUtc,
        int? updatedByUserId,
        string eventType,
        int? eventRefId,
        CancellationToken cancellationToken = default);

    Task RebuildAffectedDashboardsAsync(
        string eventType,
        DateTime occurredAtUtc,
        int? updatedByUserId,
        int? eventRefId,
        CancellationToken cancellationToken = default);

    Task RebuildAllCurrentDashboardsAsync(
        int? updatedByUserId,
        CancellationToken cancellationToken = default);
}

