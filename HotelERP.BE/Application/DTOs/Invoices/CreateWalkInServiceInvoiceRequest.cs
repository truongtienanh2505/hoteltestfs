namespace HotelERP.BE.DTOs.Invoices;

/// <summary>
/// Request body cho endpoint POST /invoices/walkin-service
/// Dùng để tạo hóa đơn thanh toán ngay cho khách vãng lai
/// </summary>
public class CreateWalkInServiceInvoiceRequest
{
    /// <summary>OrderService.Id của đơn vãng lai cần tạo hóa đơn</summary>
    public int OrderId { get; set; }

    /// <summary>Tên khách (tùy chọn, để in lên hóa đơn)</summary>
    public string? GuestName { get; set; }

    /// <summary>Phương thức thanh toán: CASH | TRANSFER | CARD</summary>
    public string? PaymentMethod { get; set; } = "CASH";

    /// <summary>Mã giao dịch chuyển khoản (nếu có)</summary>
    public string? TransactionCode { get; set; }
}
