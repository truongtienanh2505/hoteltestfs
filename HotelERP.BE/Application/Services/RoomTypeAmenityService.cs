using Microsoft.EntityFrameworkCore;
using HotelERP.BE.Application.Interfaces;
using HotelERP.BE.Infrastructure.Data;
using HotelERP.BE.Domain.Models;

namespace HotelERP.BE.Application.Services;

public class RoomTypeAmenityService(HotelDbContext context) : IRoomTypeAmenityService
{
    public async Task<bool> UpdateAmenitiesForRoomTypeAsync(int roomTypeId, List<int> amenityIds)
    {
        var roomType = await context.RoomTypes.FindAsync(roomTypeId);
        if (roomType == null || roomType.DeletedAt != null) return false;

        var existingLinks = context.RoomTypeAmenities.Where(ra => ra.RoomTypeId == roomTypeId);
        context.RoomTypeAmenities.RemoveRange(existingLinks);

        var newLinks = amenityIds.Select(id => new RoomTypeAmenity
        {
            RoomTypeId = roomTypeId,
            AmenityId = id
        });

        await context.RoomTypeAmenities.AddRangeAsync(newLinks);
        await context.SaveChangesAsync();
        return true;
    }
}