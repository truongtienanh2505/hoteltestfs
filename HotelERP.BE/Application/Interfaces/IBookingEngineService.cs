using HotelERP.BE.Application.DTOs.BookingEngine;

namespace HotelERP.BE.Application.Interfaces;

public interface IBookingEngineService
{
    Task<IEnumerable<AvailableRoomTypeResponse>> SearchAvailableRoomsAsync(SearchRoomRequest request);
    Task<string> HoldRoomAsync(int roomTypeId, int userId, DateTime checkIn, DateTime checkOut);
    Task ReleaseExpiredBookingsAsync(); 
    Task<int> CreateMultiRoomBookingAsync(int userId, MultiRoomBookingRequest request);
    Task<(bool IsSuccess, string ErrorCode, Domain.Models.Voucher? Voucher)> ValidateVoucherAsync(string voucherCode, decimal subtotal);
    Task<bool> AdminForceCancelBookingAsync(int bookingId);
    Task<IEnumerable<object>> GetAssignableRoomsAsync(int roomTypeId);
}