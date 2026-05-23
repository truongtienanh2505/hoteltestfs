namespace HotelERP.BE.DTOs.Invoices;

public class InvoiceListDto
{
    public string RowId { get; set; } = string.Empty;

    public int Id { get; set; }
    public int? InvoiceId { get; set; }

    public int BookingId { get; set; }
    public int? BookingDetailId { get; set; }

    public string? InvoiceCode { get; set; }
    public string? CustomerName { get; set; }
    public string? BookingCode { get; set; }
    public string? RoomNumber { get; set; }

    public decimal? FinalTotal { get; set; }
    public string? Status { get; set; }
    public string? BookingStatus { get; set; }
    public string? PaymentStatus { get; set; }
    public DateTime? CreatedAt { get; set; }

    public bool IsDraftPreview { get; set; }
}
