using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using ClosedXML.Excel;
using HotelERP.BE.Application.DTOs.AuditLogs;
using HotelERP.BE.Application.Interfaces;
using HotelERP.BE.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HotelERP.BE.Application.Services;

public class AuditLogService : IAuditLogService
{
    private readonly HotelDbContext _context;

    public AuditLogService(HotelDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<AuditLogResponseDto>> GetAuditLogsAsync(AuditLogQueryDto query, int currentUserId, string currentUserRole)
    {
        var rawLogs = await FetchLogsAsync(query, currentUserId, currentUserRole);
        var result = new List<AuditLogResponseDto>();

        foreach (var log in rawLogs)
        {
            if (!string.IsNullOrEmpty(log.LogData))
            {
                try
                {
                    var jsonOptions = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                    var parsedData = JsonSerializer.Deserialize<RawLogDataDto>(log.LogData, jsonOptions);
                    if (parsedData != null && parsedData.Events != null && parsedData.Events.Any())
                    {
                        var dto = new AuditLogResponseDto
                        {
                            Id = log.Id,
                            Date = log.LogDate,
                            EmployeeName = log.User?.FullName ?? $"User {log.UserId}",
                            RoleName = log.RoleName ?? string.Empty,
                        };

                        var events = parsedData.Events.Select(e => new AuditEventDto
                        {
                            EventId = e.eventId,
                            Timestamp = e.timestamp,
                            ActionType = e.actionType,
                            EntityType = e.entityType,
                            Message = e.message
                        })
                        .OrderByDescending(x => x.Timestamp) // Mới nhất lên đầu
                        .ToList();

                        dto.Events = events;

                        var firstEvent = events.FirstOrDefault(e => !string.IsNullOrWhiteSpace(e.Message)) ?? events.First();
                        var otherCount = events.Count - 1;
                        dto.Summary = otherCount > 0 
                            ? $"{firstEvent.Message} (và {otherCount} sự kiện khác)" 
                            : firstEvent.Message;

                        result.Add(dto);
                    }
                }
                catch
                {
                    var dto = new AuditLogResponseDto
                    {
                        Id = log.Id,
                        Date = log.LogDate,
                        EmployeeName = log.User?.FullName ?? $"User {log.UserId}",
                        RoleName = log.RoleName ?? string.Empty,
                        Summary = "Không có hoạt động nổi bật"
                    };
                    result.Add(dto);
                }
            }
            else
            {
                var dto = new AuditLogResponseDto
                {
                    Id = log.Id,
                    Date = log.LogDate,
                    EmployeeName = log.User?.FullName ?? $"User {log.UserId}",
                    RoleName = log.RoleName ?? string.Empty,
                    Summary = "Không có hoạt động nổi bật"
                };
                result.Add(dto);
            }
        }

        return result.OrderByDescending(x => x.Date).ToList();
    }

    public async Task<byte[]> ExportToExcelAsync(AuditLogQueryDto query, int currentUserId, string currentUserRole)
    {
        var logs = await GetAuditLogsAsync(query, currentUserId, currentUserRole);

        using var workbook = new XLWorkbook();
        var worksheet = workbook.Worksheets.Add("Audit Logs");

        // Headers based on user image requirement
        worksheet.Cell(1, 1).Value = "ID Nhóm";
        worksheet.Cell(1, 2).Value = "Ngày lưu log";
        worksheet.Cell(1, 3).Value = "Tên nhân viên";
        worksheet.Cell(1, 4).Value = "Chức vụ";
        worksheet.Cell(1, 5).Value = "Thời gian sự kiện";
        worksheet.Cell(1, 6).Value = "Loại hành động";
        worksheet.Cell(1, 7).Value = "Loại đối tượng";
        worksheet.Cell(1, 8).Value = "Nội dung chi tiết";

        var headerRange = worksheet.Range(1, 1, 1, 8);
        headerRange.Style.Font.Bold = true;
        headerRange.Style.Fill.BackgroundColor = XLColor.LightGray;

        int row = 2;
        foreach (var dailyLog in logs)
        {
            if (dailyLog.Events == null || !dailyLog.Events.Any())
                continue;

            foreach (var ev in dailyLog.Events)
            {
                worksheet.Cell(row, 1).Value = dailyLog.Id;
                worksheet.Cell(row, 2).Value = dailyLog.Date.ToString("yyyy-MM-dd");
                worksheet.Cell(row, 3).Value = dailyLog.EmployeeName;
                worksheet.Cell(row, 4).Value = dailyLog.RoleName;
                worksheet.Cell(row, 5).Value = ev.Timestamp.ToString("yyyy-MM-dd HH:mm:ss");
                worksheet.Cell(row, 6).Value = ev.ActionType;
                worksheet.Cell(row, 7).Value = ev.EntityType;
                worksheet.Cell(row, 8).Value = ev.Message;
                row++;
            }
        }

        worksheet.Columns().AdjustToContents();

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }

    private async Task<List<Domain.Models.AuditLog>> FetchLogsAsync(AuditLogQueryDto query, int currentUserId, string currentUserRole)
    {
        var q = _context.AuditLogs.Include(a => a.User).AsQueryable();

        // 1. Enforce permissions
        if (currentUserRole != "Admin" && currentUserRole != "Manager")
        {
            q = q.Where(x => x.UserId == currentUserId);
        }

        // 2. Apply explicit filters
        if (!string.IsNullOrEmpty(query.RoleName))
        {
            q = q.Where(x => x.RoleName == query.RoleName);
        }

        if (query.Year.HasValue)
        {
            q = q.Where(x => x.LogDate.Year == query.Year.Value);
        }

        if (query.Month.HasValue)
        {
            q = q.Where(x => x.LogDate.Month == query.Month.Value);
        }

        if (query.Day.HasValue)
        {
            q = q.Where(x => x.LogDate.Day == query.Day.Value);
        }

        // 3. Filter theo UserId cụ thể (dùng cho dropdown "Lọc theo nhân viên")
        if (query.UserId.HasValue)
        {
            q = q.Where(x => x.UserId == query.UserId.Value);
        }

        return await q.ToListAsync();
    }

    /// <summary>
    /// Xóa tất cả audit log có LogDate cũ hơn 3 tháng.
    /// Return số bản ghi đã xóa.
    /// </summary>
    public async Task<int> PurgeOldLogsAsync()
    {
        var cutoff = DateTime.UtcNow.Date.AddMonths(-3);

        // Xóa trực tiếp trên DB, không cần load dữ liệu vào RAM
        // Tương đương: DELETE FROM AuditLogs WHERE LogDate < @cutoff
        var deletedCount = await _context.AuditLogs
            .Where(x => x.LogDate < cutoff)
            .ExecuteDeleteAsync();

        return deletedCount;
    }
}
