namespace HotelERP.BE.DTOs.Invoices;

public class CreateInvoiceDto
{
    public int BookingId { get; set; }
    public string PaymentMethod { get; set; } = "CASH";
    public string? Notes { get; set; }
}
