using System.ComponentModel.DataAnnotations;

namespace HotelERP.BE.DTOs.Vouchers;

public class DisableVoucherRequestDto
{
    [Required]
    [StringLength(1000)]
    public string Reason { get; set; } = string.Empty;
}