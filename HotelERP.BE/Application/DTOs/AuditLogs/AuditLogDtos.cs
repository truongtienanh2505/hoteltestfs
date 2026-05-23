using System;
using System.Collections.Generic;

namespace HotelERP.BE.Application.DTOs.AuditLogs;

public class AuditLogQueryDto
{
    public string? RoleName { get; set; }
    public int? UserId { get; set; }
    public int? Day { get; set; }
    public int? Month { get; set; }
    public int? Year { get; set; }
}

public class AuditLogResponseDto
{
    public long Id { get; set; }
    public DateTime Date { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public string RoleName { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;
    public IEnumerable<AuditEventDto> Events { get; set; } = new List<AuditEventDto>();
}

public class AuditEventDto
{
    public string EventId { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public string ActionType { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}

// These match the JSON structure correctly
public class RawLogDataDto 
{
    public int TotalEvents { get; set; }
    public List<RawEventDto> Events { get; set; } = new List<RawEventDto>();
}

public class RawEventDto 
{
    public string eventId { get; set; } = string.Empty;
    public DateTime timestamp { get; set; }
    public string actionType { get; set; } = string.Empty;
    public string entityType { get; set; } = string.Empty;
    public object? context { get; set; }
    public object? changes { get; set; }
    public string message { get; set; } = string.Empty;
}
