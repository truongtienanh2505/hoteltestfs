using HotelERP.BE.Application.DTOs;

namespace HotelERP.BE.Application.Interfaces;

public interface IRoomInventoryService
{
    Task<IEnumerable<RoomInventoryResponseDto>> GetInventoriesByRoomIdAsync(int roomId);
    Task<int> AddInventoryAsync(int roomId, AddInventoryRequest request);
    Task<bool> UpdateInventoryAsync(int roomId, int inventoryId, UpdateInventoryRequest request);
    Task<bool> DeleteInventoryAsync(int roomId, int inventoryId);
}