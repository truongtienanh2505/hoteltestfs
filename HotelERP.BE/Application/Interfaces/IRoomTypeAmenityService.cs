namespace HotelERP.BE.Application.Interfaces;

public interface IRoomTypeAmenityService
{
    Task<bool> UpdateAmenitiesForRoomTypeAsync(int roomTypeId, List<int> amenityIds);
}