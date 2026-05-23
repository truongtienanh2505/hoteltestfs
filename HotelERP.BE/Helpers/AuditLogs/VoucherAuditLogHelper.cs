using System.Text.Json;
using System.Security.Claims;
using HotelERP.BE.Domain.Models;
using HotelERP.BE.Infrastructure.Data;
using Microsoft.AspNetCore.Http;

namespace HotelERP.BE.Helpers.AuditLogs;

public class VoucherAuditLogHelper : IVoucherAuditLogHelper
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    private readonly HotelDbContext _dbContext;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public VoucherAuditLogHelper(HotelDbContext dbContext, IHttpContextAccessor httpContextAccessor)
    {
        _dbContext = dbContext;
        _httpContextAccessor = httpContextAccessor;
    }

    public object BuildSnapshot(Voucher voucher)
    {
        return new
        {
            voucher.Id,
            voucher.Code,
            voucher.DiscountType,
            voucher.DiscountValue,
            voucher.MinBookingAmount,
            voucher.ValidFrom,
            voucher.ValidTo,
            voucher.UsageLimit,
            voucher.UsedCount,
            voucher.Status,
            voucher.CreatedAt,
            voucher.UpdatedAt
        };
    }

    public async Task WriteAsync(
        int? userId,
        string roleName,
        string action,
        int recordId,
        object? oldValue,
        object? newValue,
        string reason,
        CancellationToken cancellationToken = default)
    {
        // Dùng extension method, bên trong vẫn là _dbContext.AuditLogs.Add(new AuditLog {...})
        var (resolvedUserId, resolvedRole) = ResolveUser();
        await _dbContext.AddAuditLogAsync(
            userId: userId ?? resolvedUserId,
            roleName: resolvedRole,
            actionType: action,
            entityType: "Voucher",
            message: reason?.Trim() ?? "No reason provided",
            contextParams: new { recordId },
            changes: new { oldData = oldValue, newData = newValue }
        );
    }

    private (int UserId, string RoleName) ResolveUser()
    {
        var user = _httpContextAccessor.HttpContext?.User;
        var userIdClaim = user?.FindFirst("UserId")?.Value ?? user?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        int uid = int.TryParse(userIdClaim, out int id) ? id : 0;
        var roleName = user?.FindFirst(ClaimTypes.Role)?.Value ?? "User";
        return (uid, roleName);
    }

    private static string? Serialize(object? value)
    {
        if (value is null)
        {
            return null;
        }

        return JsonSerializer.Serialize(value, JsonOptions);
    }
}