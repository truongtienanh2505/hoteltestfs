using System.ComponentModel.DataAnnotations;

namespace HotelERP.BE.DTOs.Invoices;

public class UpdateDamageChargeRequestDto
{
    [Range(0, double.MaxValue, ErrorMessage = "amount phải lớn hơn hoặc bằng 0.")]
    public decimal Amount { get; set; }

    [StringLength(500, ErrorMessage = "reason tối đa 500 ký tự.")]
    public string? Reason { get; set; }
}
