using System.ComponentModel.DataAnnotations;

namespace HotelERP.BE.DTOs.Invoices;

public class CreateDraftInvoiceRequestDto
{
    [Range(1, int.MaxValue, ErrorMessage = "bookingId phải lớn hơn 0.")]
    public int BookingId { get; set; }

    [Required(ErrorMessage = "bookingDetailIds là bắt buộc.")]
    [MinLength(1, ErrorMessage = "Phải chọn ít nhất 1 bookingDetail.")]
    public List<int> BookingDetailIds { get; set; } = new();

    [StringLength(1000, ErrorMessage = "note tối đa 1000 ký tự.")]
    public string? Note { get; set; }
}