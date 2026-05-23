using System;
using System.Collections.Generic;

namespace HotelERP.BE.Domain.Models;

public partial class OrderServiceDetail
{
    public int Id { get; set; }

    public int? OrderServiceId { get; set; }

    public int? ServiceId { get; set; }

    public int Quantity { get; set; }

    public decimal UnitPrice { get; set; }

    public decimal LineTotal { get; set; }

    public string? Notes { get; set; }

    /// <summary>Active | Cancelled</summary>
    public string Status { get; set; } = "Active";

    public virtual OrderService? OrderService { get; set; }

    public virtual Service? Service { get; set; }
}
