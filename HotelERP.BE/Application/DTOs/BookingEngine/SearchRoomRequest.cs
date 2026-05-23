namespace HotelERP.BE.Application.DTOs.BookingEngine;

public class SearchRoomRequest {
    public DateTime CheckInDate  { get; set; }
    public DateTime CheckOutDate { get; set; }
    public int AdultsCount    { get; set; } = 1;
    public int ChildrenCount  { get; set; } = 0;
    public int RoomsRequested { get; set; } = 1;
}