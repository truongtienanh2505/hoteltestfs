using System;

namespace HotelERP.BE.Domain.Models;

public partial class InvoiceBookingDetail
{
    public int Id { get; set; }

    public int InvoiceId { get; set; }

    public int BookingDetailId { get; set; }

    public decimal RoomCharge { get; set; }

    public decimal ServiceCharge { get; set; }

    public decimal DamageCharge { get; set; }

    public decimal DiscountAmount { get; set; }

    public decimal ExtraFeeAmount { get; set; }

    public decimal TaxAmount { get; set; }

    public decimal LineTotal { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual Invoice Invoice { get; set; } = null!;

    public virtual BookingDetail BookingDetail { get; set; } = null!;
}