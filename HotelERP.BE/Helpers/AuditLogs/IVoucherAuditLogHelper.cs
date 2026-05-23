using HotelERP.BE.Domain.Models;

namespace HotelERP.BE.Helpers.AuditLogs;

public interface IVoucherAuditLogHelper
{
    Task WriteAsync(
        int? userId,
        string roleName,
        string action,
        int recordId,
        object? oldValue,
        object? newValue,
        string reason,
        CancellationToken cancellationToken = default);

    object BuildSnapshot(Voucher voucher);
}