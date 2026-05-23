using System.ComponentModel.DataAnnotations;

namespace HotelERP.BE.DTOs.Vouchers;

public class CreateVoucherRequestDto
{
    [Required]
    [StringLength(50)]
    public string Code { get; set; } = string.Empty;

    [Required]
    [StringLength(50)]
    public string DiscountType { get; set; } = string.Empty;

    [Range(typeof(decimal), "0", "9999999999999999")]
    public decimal DiscountValue { get; set; }

    [Range(typeof(decimal), "0", "9999999999999999")]
    public decimal MinBookingAmount { get; set; }

    public DateTime? ValidFrom { get; set; }

    public DateTime? ValidTo { get; set; }

    [Range(0, int.MaxValue)]
    public int? UsageLimit { get; set; }

    [Required]
    [StringLength(20)]
    public string Status { get; set; } = string.Empty;

    [Required]
    [StringLength(1000)]
    public string Reason { get; set; } = string.Empty;
}