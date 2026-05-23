using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;

namespace HotelERP.BE.Domain.Models;

public partial class Booking
{
    public int Id { get; set; }

    [Column("user_id")]
    public int? UserId { get; set; }

    [Column("guest_name")]
    public string? GuestName { get; set; }

    [Column("guest_phone")]
    public string? GuestPhone { get; set; }

    [Column("guest_email")]
    public string? GuestEmail { get; set; }

    [Column("booking_code")]
    public string BookingCode { get; set; } = null!;

    [Column("voucher_id")]
    public int? VoucherId { get; set; }

    [Column("status")]
    public string Status { get; set; } = null!;

    [Column("booked_at")]
    public DateTime BookedAt { get; set; }

    [Column("hold_expires_at")]
    public DateTime? HoldExpiresAt { get; set; }

    [Column("booking_subtotal")]
    public decimal BookingSubtotal { get; set; }

    [Column("discount_amount")]
    public decimal DiscountAmount { get; set; }

    [Column("membership_discount_amount")]
    public decimal MembershipDiscountAmount { get; set; }

    [Column("final_amount")]
    public decimal FinalAmount { get; set; }

    [Column("deposit_amount")]
    public decimal DepositAmount { get; set; }

    [Column("payment_status")]
    public string PaymentStatus { get; set; } = null!;

    [Column("notes")]
    public string? Notes { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime? UpdatedAt { get; set; }

    public virtual ICollection<BookingDetail> BookingDetails { get; set; } = new List<BookingDetail>();

    public virtual ICollection<Invoice> Invoices { get; set; } = new List<Invoice>();

    public virtual User? User { get; set; }

    public virtual Voucher? Voucher { get; set; }

    [Column("is_points_awarded")]
    public bool? IsPointsAwarded { get; set; }
}
