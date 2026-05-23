using Microsoft.AspNetCore.Http;

namespace HotelERP.BE.Application.DTOs;

public record AmenitySimpleDto(
    int Id,
    string Name,
    string? IconUrl
);

public record RoomTypeImageDto(
    int Id,
    string ImageUrl,
    bool IsPrimary
);

public record RoomTypeResponseDto(
    int Id,
    string Name,
    string? Description,
    decimal BasePrice,
    int CapacityAdults,
    int CapacityChildren,
    string? ImageUrl,
    List<RoomTypeImageDto> Images,
    List<AmenitySimpleDto> Amenities
);

public class CreateRoomTypeRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal BasePrice { get; set; }
    public int CapacityAdults { get; set; }
    public int CapacityChildren { get; set; }

    public IFormFile? Image { get; set; }
    public List<IFormFile>? Images { get; set; }

    public int? PrimaryImageIndex { get; set; }
    public List<int>? PrimaryImageIndexes { get; set; }
}

public class UpdateRoomTypeRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal BasePrice { get; set; }
    public int CapacityAdults { get; set; }
    public int CapacityChildren { get; set; }

    public IFormFile? Image { get; set; }
    public List<IFormFile>? Images { get; set; }

    public int? PrimaryImageIndex { get; set; }
    public List<int>? PrimaryImageIndexes { get; set; }

    public int? PrimaryImageId { get; set; }
    public List<int>? PrimaryImageIds { get; set; }

    public List<int>? DeletedImageIds { get; set; }
}

public record UpdateRoomTypeAmenitiesRequest(
    List<int> AmenityIds
);