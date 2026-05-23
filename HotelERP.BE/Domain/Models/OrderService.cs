using System;
using System.Collections.Generic;

namespace HotelERP.BE.Domain.Models;

public partial class OrderService
{
    public int Id { get; set; }

    public int? BookingDetailId { get; set; }

    public string OrderCode { get; set; } = null!;

    public DateTime OrderDate { get; set; }

    public decimal TotalAmount { get; set; }

    public string Status { get; set; } = null!;

    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual BookingDetail? BookingDetail { get; set; }

    public virtual ICollection<OrderServiceDetail> OrderServiceDetails { get; set; } = new List<OrderServiceDetail>();
}
