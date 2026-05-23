using HotelERP.BE.Application.DTOs;
using HotelERP.BE.Domain.Models;

namespace HotelERP.BE.Application.Interfaces;

public interface IRoomService
{
    Task<IEnumerable<RoomResponseDto>> GetRoomsAsync(RoomFilterRequest filter);
    Task<RoomDetailResponseDto?> GetRoomByIdAsync(int roomId);
    Task<int> CreateRoomAsync(CreateRoomRequest request);
    Task<bool> UpdateRoomAsync(int roomId, UpdateRoomRequest request);
    Task<bool> DeleteRoomAsync(int roomId);
    Task<bool> UpdateCleaningStatusAsync(int roomId, UpdateCleaningStatusRequest request);
    Task<bool> UpdateRoomStatusAsync(int roomId, UpdateRoomStatusRequest request);
    Task<bool> ReportDamageAsync(int userId, string roleName, ReportDamageRequest request);
    Task<IEnumerable<DamageReportResponseDto>> GetRoomDamagesAsync(int roomId);
    // Thuật toán lấy phòng Check-in
    Task<List<Room>> GetAvailableRoomsForCheckInAsync(int roomTypeId);
         
    // Cập nhật trạng thái và bắn SignalR
    Task<bool> UpdateRoomStatusAsync(int roomId, string status, string cleaningStatus);
    
    // Hangfire job: 9h sáng đổi CLEAN -> DIRTY cho phòng đang có khách (OCCUPIED)
    Task MarkOccupiedRoomsDirtyAsync();
}