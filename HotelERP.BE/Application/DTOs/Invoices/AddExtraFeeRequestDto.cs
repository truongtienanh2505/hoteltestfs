using System.ComponentModel.DataAnnotations;

namespace HotelERP.BE.DTOs.Invoices;

public class AddExtraFeeRequestDto
{
    [Range(typeof(decimal), "0.01", "999999999", ErrorMessage = "amount phải lớn hơn 0.")]
    public decimal Amount { get; set; }

    // Null = phụ phí chung cho toàn bộ hóa đơn.
    // Có giá trị = phụ phí riêng cho 1 phòng/BookingDetail trong invoice đó.
    public int? BookingDetailId { get; set; }

    [StringLength(500, ErrorMessage = "reason tối đa 500 ký tự.")]
    public string? Reason { get; set; }
}