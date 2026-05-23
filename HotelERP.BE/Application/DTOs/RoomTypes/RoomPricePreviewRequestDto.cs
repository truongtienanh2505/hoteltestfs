using System.ComponentModel.DataAnnotations;

namespace HotelERP.BE.DTOs.RoomTypes;

public class RoomPricePreviewRequestDto
{
    [Range(1, int.MaxValue, ErrorMessage = "roomTypeId phải > 0.")]
    public int RoomTypeId { get; set; }

    [Required(ErrorMessage = "checkInAt là bắt buộc.")]
    public DateTime? CheckInAt { get; set; }

    [Required(ErrorMessage = "checkOutAt là bắt buộc.")]
    public DateTime? CheckOutAt { get; set; }
}