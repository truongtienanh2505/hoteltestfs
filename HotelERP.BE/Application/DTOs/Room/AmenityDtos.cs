using Microsoft.AspNetCore.Http;

namespace HotelERP.BE.Application.DTOs;

public record AmenityResponseDto(
    int Id,
    string Name,
    string? IconUrl
);

public class CreateAmenityRequest
{
    public string Name { get; set; } = string.Empty;
    public IFormFile? IconFile { get; set; }
}

public class UpdateAmenityRequest
{
    public string Name { get; set; } = string.Empty;
    public IFormFile? IconFile { get; set; }
}