using System.ComponentModel.DataAnnotations;

namespace HotelERP.BE.DTOs.RoomTypes;

public class SearchRoomTypesByOccupancyRequestDto
{
    [Range(1, 20, ErrorMessage = "adults phải >= 1.")]
    public int Adults { get; set; }

    [Range(0, 20, ErrorMessage = "children phải >= 0.")]
    public int Children { get; set; }
}