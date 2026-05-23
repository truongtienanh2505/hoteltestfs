namespace HotelERP.BE.DTOs.Invoices;

public class InvoiceActionResponseDto
{
    public int BookingId { get; set; }
    public string BookingCode { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;

    public int InvoiceId { get; set; }
    public string InvoiceCode { get; set; } = string.Empty;

    public string InvoiceStatus { get; set; } = string.Empty;
    public string BookingStatus { get; set; } = string.Empty;
    public string PaymentStatus { get; set; } = string.Empty;

    public List<int> BookingDetailIds { get; set; } = new();
    public List<string> RoomNumbers { get; set; } = new();

    // Tổng số ngày/đêm thực tế đã ở
    public int TotalStayNights { get; set; }

    // Chi tiết từng dòng phòng trong invoice
    public List<InvoiceLineResponseDto> Lines { get; set; } = new();

    public decimal TotalRoomAmount { get; set; }
    public decimal TotalServiceAmount { get; set; }
    public decimal TotalDamageAmount { get; set; }
    public decimal ManualAdjustmentAmount { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal GrossTotal { get; set; }
    public decimal DepositAmount { get; set; }
    public decimal FinalTotal { get; set; }

    public string? Notes { get; set; }
    public DateTime? IssuedAt { get; set; }
    public DateTime? PaidAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public int? PaymentId { get; set; }
    public string? PaymentMethod { get; set; }
    public string? TransactionCode { get; set; }

    public int? VoucherId { get; set; }
    public string? VoucherCode { get; set; }
}

public class InvoiceLineResponseDto
{
    public int BookingDetailId { get; set; }
    public string RoomNumber { get; set; } = string.Empty;

    public int ActualStayNights { get; set; }
    public int StayNights { get; set; }

    public decimal RoomCharge { get; set; }
    public decimal ServiceCharge { get; set; }
    public decimal DamageCharge { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal ExtraFeeAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal LineTotal { get; set; }
}