namespace HotelERP.BE.DTOs.Vouchers;

public class VoucherResponseDto
{
    public int Id { get; set; }

    public string Code { get; set; } = string.Empty;

    public string DiscountType { get; set; } = string.Empty;

    public decimal DiscountValue { get; set; }

    public decimal MinBookingAmount { get; set; }

    public DateTime? ValidFrom { get; set; }

    public DateTime? ValidTo { get; set; }

    public int? UsageLimit { get; set; }
    
    public string? Reason { get; set; }

    public int UsedCount { get; set; }

    public string Status { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }
}