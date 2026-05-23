using HotelERP.BE.Application.DTOs;

namespace HotelERP.BE.Application.Interfaces;

public interface IAmenityService
{
    Task<IEnumerable<AmenityResponseDto>> GetAllAmenitiesAsync();
    Task<AmenityResponseDto?> GetAmenityByIdAsync(int id);
    Task<int> CreateAmenityAsync(CreateAmenityRequest request);
    Task<bool> UpdateAmenityAsync(int id, UpdateAmenityRequest request);
    Task<bool> DeleteAmenityAsync(int id);
}