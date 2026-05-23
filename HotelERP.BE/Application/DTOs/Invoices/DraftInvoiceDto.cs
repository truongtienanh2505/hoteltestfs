namespace HotelERP.BE.DTOs.Invoices;

public class DraftInvoiceDto
{
    public int BookingId { get; set; }
    public string BookingCode { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;

    public int TotalStayNights { get; set; }

    public decimal TotalRoomAmount { get; set; }
    public decimal TotalServiceAmount { get; set; }
    public decimal TotalDamageAmount { get; set; }
    public decimal SubTotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal GrossTotal { get; set; }
    public decimal DepositAmount { get; set; }
    public decimal FinalTotal { get; set; }

    public int? VoucherId { get; set; }
    public string? VoucherCode { get; set; }
}
