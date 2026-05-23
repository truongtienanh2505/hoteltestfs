using System;
using System.Collections.Generic;

namespace HotelERP.BE.Domain.Models;

public partial class BookingDetail
{
    public int Id { get; set; }

    public int? BookingId { get; set; }

    public int? RoomId { get; set; }

    public int? RoomTypeId { get; set; }

    public DateTime CheckInDate { get; set; }

    public DateTime CheckOutDate { get; set; }

    public decimal PricePerNight { get; set; }

    public int AdultsCount { get; set; }

    public int ChildrenCount { get; set; }

    public int Nights { get; set; }

    public decimal EarlyCheckInFee { get; set; }

    public decimal LateCheckOutFee { get; set; }

    public decimal LineTotal { get; set; }

    public string Status { get; set; } = null!;

    public string SettlementStatus { get; set; } = null!;

    public DateTime? SettledAt { get; set; }

    public string? IdentityDocumentUrl { get; set; }

    public string? IdentityDocumentPublicId { get; set; }

    public DateTime? ActualCheckInAt { get; set; }

    public DateTime? ActualCheckOutAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual Booking? Booking { get; set; }

    public virtual ICollection<InvoiceBookingDetail> InvoiceBookingDetails { get; set; } = new List<InvoiceBookingDetail>();

    public virtual ICollection<LossAndDamage> LossAndDamages { get; set; } = new List<LossAndDamage>();

    public virtual ICollection<OrderService> OrderServices { get; set; } = new List<OrderService>();

    public virtual Room? Room { get; set; }

    public virtual RoomType? RoomType { get; set; }
}