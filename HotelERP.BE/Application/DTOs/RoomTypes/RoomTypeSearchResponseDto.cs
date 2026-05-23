namespace HotelERP.BE.DTOs.RoomTypes;

public class RoomTypeSearchResponseDto
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public decimal BasePrice { get; set; }

    public int CapacityAdults { get; set; }

    public int CapacityChildren { get; set; }

    public int MaxOccupancy { get; set; }

    public string? Description { get; set; }

    public string? BedType { get; set; }

    public decimal? SizeSqm { get; set; }

    public decimal EarlyCheckinFeePercent { get; set; }

    public decimal LateCheckoutFeePercent { get; set; }

    public decimal ExtraHourPrice { get; set; }

    public string Status { get; set; } = string.Empty;

    public string? PrimaryImageUrl { get; set; }

    public int PhysicalRoomCount { get; set; }
}