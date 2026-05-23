using System;

namespace HotelERP.BE.Domain.Models;

public partial class LoyaltyPointHistory
{
    public int Id { get; set; }

    public int BookingId { get; set; }

    public int UserId { get; set; }

    public string ActionType { get; set; } = null!;

    public decimal SourceAmount { get; set; }

    public int PointsAdded { get; set; }

    public int BalanceBefore { get; set; }

    public int BalanceAfter { get; set; }

    public string Reason { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public virtual Booking Booking { get; set; } = null!;

    public virtual User User { get; set; } = null!;
}