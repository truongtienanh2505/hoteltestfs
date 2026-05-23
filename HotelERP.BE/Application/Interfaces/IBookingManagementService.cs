using HotelERP.BE.Application.DTOs.BookingManagement;

namespace HotelERP.BE.Application.Interfaces;

public interface IBookingManagementService
{
    /// <summary>
    /// API 1: Search + filter bookings có phân trang
    /// </summary>
    Task<PagedResult<BookingListItemDto>> SearchBookingsAsync(BookingSearchRequest request);

    /// <summary>
    /// API 2: Cập nhật trạng thái booking theo quy trình hotel thực tế
    /// </summary>
    Task<(bool Success, string Message)> UpdateBookingStatusAsync(int bookingId, string newStatus);

    /// <summary>
    /// API 3: Lấy danh sách "Khách đến hôm nay" 
    /// (Bookings có BookingDetail.CheckInDate = Today AND Booking.Status = Confirmed)
    /// </summary>
    Task<List<BookingListItemDto>> GetTodayArrivalsAsync();

    /// <summary>
    /// API 4: Lấy danh sách "Khách đang lưu trú" (Booking.Status = Checked_in)
    /// </summary>
    Task<List<BookingListItemDto>> GetInHouseGuestsAsync();

    /// <summary>
    /// API 5: Cập nhật trạng thái từng phòng lẻ trong một Booking
    /// Hỗ trợ Check-in/Check-out riêng lẻ và cập nhật trạng thái phòng thực tế.
    /// </summary>
    Task<(bool Success, string Message)> UpdateBookingDetailStatusAsync(int detailId, string newStatus);

    /// <summary>
    /// API 6: Lấy danh sách phòng có thể trả (tất cả đang Checked_in).
    /// Nếu có checkOutDate, chỉ lọc theo ngày đó.
    /// Cho phép trả phòng sớm (không giới hạn theo ngày hôm nay).
    /// </summary>
    Task<List<BookingListItemDto>> GetTodayDeparturesAsync(DateTime? checkOutDate = null);

    /// <summary>
    /// API 7: Đổi phòng cho khách (Room Change)
    /// </summary>
    Task<(bool Success, string Message)> ChangeRoomAsync(int detailId, int newRoomId);

    /// <summary>
    /// API 8: Nạp cọc cho Booking
    /// </summary>
    Task<(bool Success, string Message, decimal NewDeposit)> AddDepositAsync(int bookingId, decimal amount);
}
