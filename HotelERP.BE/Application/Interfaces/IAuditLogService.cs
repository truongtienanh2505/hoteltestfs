using System.Collections.Generic;
using System.Threading.Tasks;
using HotelERP.BE.Application.DTOs.AuditLogs;

namespace HotelERP.BE.Application.Interfaces;

public interface IAuditLogService
{
    Task<IEnumerable<AuditLogResponseDto>> GetAuditLogsAsync(AuditLogQueryDto query, int currentUserId, string currentUserRole);
    Task<byte[]> ExportToExcelAsync(AuditLogQueryDto query, int currentUserId, string currentUserRole);
    
    /// <summary>
    /// Xóa tất cả audit log có LogDate cũ hơn 3 tháng so với ngày hiện tại.
    /// Được gọi bởi Hangfire job chạy định kỳ.
    /// </summary>
    Task<int> PurgeOldLogsAsync();
}
