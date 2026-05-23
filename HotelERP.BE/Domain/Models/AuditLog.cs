using System;
using System.Collections.Generic;

namespace HotelERP.BE.Domain.Models;

public partial class AuditLog
{
    public long Id { get; set; } // Changed to long (bigint)

    public int UserId { get; set; } // It is NOT NULL now

    public string? RoleName { get; set; } // Added RoleName

    public DateTime LogDate { get; set; } // Added LogDate

    public string LogData { get; set; } = null!; // Replaces OldValue, NewValue, Reason, etc.

    public virtual User? User { get; set; }
}
