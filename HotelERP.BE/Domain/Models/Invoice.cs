using System;
using System.Collections.Generic;

namespace HotelERP.BE.Domain.Models;

public partial class Invoice
{
    public int Id { get; set; }

    public int? BookingId { get; set; }

    // Thêm dấu ? để SQL có Null thì App cũng đéo sập
    public string? InvoiceCode { get; set; } 

    public decimal? TotalRoomAmount { get; set; }

    public decimal? TotalServiceAmount { get; set; }

    public decimal? TotalDamageAmount { get; set; }

    public decimal? DiscountAmount { get; set; }

    public decimal? ManualAdjustmentAmount { get; set; }

    public decimal? TaxAmount { get; set; }

    // QUAN TRỌNG: Thêm dấu ? để không bị lỗi SqlNullValueException
    public decimal? FinalTotal { get; set; }

    public decimal? RefundAmount { get; set; }

    public string? Status { get; set; }

    public string? Notes { get; set; }

    public DateTime? IssuedAt { get; set; }

    public DateTime? PaidAt { get; set; }

    // QUAN TRỌNG NHẤT: Thêm dấu ? ở đây vì Trace lỗi báo oẳng chỗ này
    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual Booking? Booking { get; set; }

    public virtual ICollection<InvoiceBookingDetail> InvoiceBookingDetails { get; set; } = new List<InvoiceBookingDetail>();

    public virtual ICollection<Payment> Payments { get; set; } = new List<Payment>();
}