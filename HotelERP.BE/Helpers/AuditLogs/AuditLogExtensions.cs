using System;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using HotelERP.BE.Domain.Models;
using HotelERP.BE.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HotelERP.BE.Helpers.AuditLogs;

/// <summary>
/// Extension method giúp ghi Audit Log theo cấu trúc JSON gom nhóm hàng ngày
/// mà vẫn giữ cú pháp quen thuộc: _context.AddAuditLogAsync(...)
/// </summary>
public static class AuditLogExtensions
{
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    /// <summary>
    /// Ghi 1 sự kiện Audit Log vào bảng Audit_Logs theo cấu trúc JSON gom nhóm.
    /// Nếu cùng user + role + ngày → nối thêm event vào JSON hiện có.
    /// Nếu khác ngày hoặc khác role → tạo dòng mới.
    /// </summary>
    public static async Task AddAuditLogAsync(
        this HotelDbContext context,
        int userId,
        string roleName,
        string actionType,
        string entityType,
        string message,
        object? contextParams = null,
        object? changes = null)
    {
        var today = DateTime.UtcNow.Date;

        // Tạo event mới dạng JSON-friendly object
        var newEvent = new
        {
            eventId = Guid.NewGuid().ToString(),
            timestamp = DateTime.UtcNow,
            actionType,
            entityType,
            context = contextParams,
            changes,
            message
        };

        // Tìm dòng log đã tồn tại cho user + role + ngày hôm nay
        var existingLog = await context.AuditLogs
            .FirstOrDefaultAsync(x => x.UserId == userId
                                   && x.RoleName == roleName
                                   && x.LogDate == today);

        if (existingLog == null)
        {
            // CHƯA CÓ → Tạo dòng mới với _context.AuditLogs.Add(...)
            var logData = new
            {
                TotalEvents = 1,
                Events = new[] { newEvent }
            };

            context.AuditLogs.Add(new AuditLog
            {
                UserId = userId,
                RoleName = roleName,
                LogDate = today,
                LogData = JsonSerializer.Serialize(logData, JsonOpts)
            });
        }
        else
        {
            try 
            {
                // ĐÃ CÓ → Parse JSON cũ, nối thêm event, update lại
                var parsed = JsonSerializer.Deserialize<JsonElement>(existingLog.LogData);
                
                // Xử lý đọc key không phân biệt hoa thường (vì SP ghi PascalCase, C# ghi camelCase)
                JsonElement eventsElement;
                if (!parsed.TryGetProperty("events", out eventsElement))
                    parsed.TryGetProperty("Events", out eventsElement);

                JsonElement totalEventsElement;
                if (!parsed.TryGetProperty("totalEvents", out totalEventsElement))
                    parsed.TryGetProperty("TotalEvents", out totalEventsElement);

                var currentEvents = (eventsElement.ValueKind == JsonValueKind.Array) 
                                        ? eventsElement.EnumerateArray().ToList() 
                                        : new System.Collections.Generic.List<JsonElement>();
                var totalEvents   = (totalEventsElement.ValueKind == JsonValueKind.Number) 
                                        ? totalEventsElement.GetInt32() 
                                        : 0;

                // Thêm event mới vào cuối danh sách
                var allEventsJson = new System.Collections.Generic.List<object>();
                foreach (var ev in currentEvents)
                {
                    allEventsJson.Add(ev);
                }
                allEventsJson.Add(newEvent);

                var updatedLogData = new
                {
                    TotalEvents = totalEvents + 1,
                    Events = allEventsJson
                };

                existingLog.LogData = JsonSerializer.Serialize(updatedLogData, JsonOpts);
            }
            catch (Exception)
            {
                // Nếu JSON cũ lỗi, ghi đè lại dòng mới tinh để tránh crash
                var logData = new
                {
                    TotalEvents = 1,
                    Events = new[] { newEvent }
                };
                existingLog.LogData = JsonSerializer.Serialize(logData, JsonOpts);
            }
        }

        await context.SaveChangesAsync();
    }
}
