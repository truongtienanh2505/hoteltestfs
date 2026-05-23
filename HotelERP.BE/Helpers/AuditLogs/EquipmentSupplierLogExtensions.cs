using System;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using HotelERP.BE.Domain.Models;
using HotelERP.BE.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HotelERP.BE.Helpers.AuditLogs;

public static class EquipmentSupplierLogExtensions
{
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public static async Task AddEquipmentSupplierLogAsync(
        this HotelDbContext context,
        int equipmentId,
        int? userId,
        string supplierName,
        int quantity,
        decimal unitPrice,
        string? notes = null,
        string source = "Excel")
    {
        var today = DateTime.UtcNow.Date;

        var newEvent = new
        {
            eventId = Guid.NewGuid().ToString(),
            timestamp = DateTime.UtcNow,
            supplierName,
            quantity,
            unitPrice,
            notes,
            source
        };

        // FIX: Kiểm tra Local cache trước để tìm các log vừa Add nhưng chưa SaveChanges()
        var existingLog = context.EquipmentSupplierLogs.Local
            .FirstOrDefault(x => x.EquipmentId == equipmentId && x.LogDate.Date == today.Date);

        if (existingLog == null)
        {
            existingLog = await context.EquipmentSupplierLogs
                .FirstOrDefaultAsync(x => x.EquipmentId == equipmentId && x.LogDate == today);
        }

        if (existingLog == null)
        {
            var logData = new
            {
                TotalEvents = 1,
                Events = new[] { newEvent }
            };

            context.EquipmentSupplierLogs.Add(new EquipmentSupplierLog
            {
                EquipmentId = equipmentId,
                UserId = userId,
                LogDate = today,
                LogData = JsonSerializer.Serialize(logData, JsonOpts)
            });
        }
        else
        {
            var parsed = JsonSerializer.Deserialize<JsonElement>(existingLog.LogData);
            var currentEvents = parsed.GetProperty("events").EnumerateArray().ToList();
            var totalEvents = parsed.GetProperty("totalEvents").GetInt32();

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
        
        await context.SaveChangesAsync();
    }
}
