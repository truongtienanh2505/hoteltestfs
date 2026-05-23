using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;

namespace HotelERP.BE.Domain.Models;

public partial class Voucher
{
    public int Id { get; set; }

    public string Code { get; set; } = null!;
    public int? UserId { get; set; }

    public string DiscountType { get; set; } = null!;

    public decimal DiscountValue { get; set; }

    // Giữ nguyên có dấu ? để map với DB cho an toàn
    public decimal? MinBookingValue { get; set; }

    [NotMapped]
    public decimal MinBookingAmount 
    { 
        get => MinBookingValue ?? 0; 
        set => MinBookingValue = value; 
    }

    public DateTime? ValidFrom { get; set; }

    public DateTime? ValidTo { get; set; }

    public int? UsageLimit { get; set; }
    
    [NotMapped]
    public string? Reason { get; set; }

    [NotMapped]
    public int UsedCount { get; set; }

    [NotMapped]
    public string Status { get; set; } = "ACTIVE";

    [NotMapped]
    public DateTime CreatedAt { get; set; }

    [NotMapped]
    public DateTime? UpdatedAt { get; set; }

    public virtual ICollection<Booking> Bookings { get; set; } = new List<Booking>();
}