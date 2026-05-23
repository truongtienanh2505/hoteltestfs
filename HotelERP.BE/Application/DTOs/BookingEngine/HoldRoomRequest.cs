using System.ComponentModel.DataAnnotations;

namespace HotelERP.BE.Application.DTOs.BookingEngine;

public class HoldRoomRequest
{
    [Required(ErrorMessage = "Vui lòng chọn loại phòng.")]
    public int RoomTypeId { get; set; }

    [Required(ErrorMessage = "Vui lòng chọn ngày nhận phòng.")]
    public DateTime CheckInDate { get; set; }

    [Required(ErrorMessage = "Vui lòng chọn ngày trả phòng.")]
    public DateTime CheckOutDate { get; set; }
}