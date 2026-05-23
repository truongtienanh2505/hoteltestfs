namespace HotelERP.BE.Application.DTOs.BookingEngine;

public class AvailableRoomTypeResponse {
    public int     RoomTypeId       { get; set; }
    public string  Name             { get; set; } = null!;
    public string? Description      { get; set; }
    public string? BedType          { get; set; }
    public decimal? SizeSqm         { get; set; }
    public decimal BasePrice        { get; set; }
    public int     CapacityAdults   { get; set; }
    public int     CapacityChildren { get; set; }
    public int     AvailableCount   { get; set; }
    public string? ImageUrl         { get; set; }
    public List<string> SampleRoomNumbers { get; set; } = new();
    public List<string> Amenities   { get; set; } = new();
}