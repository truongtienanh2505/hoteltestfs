using HotelERP.BE.Application.DTOs.OrderService;

namespace HotelERP.BE.Application.Interfaces;

public interface IOrderServiceManagementService
{
    /// <summary>Lấy toàn bộ dịch vụ đang ACTIVE, nhóm theo danh mục.</summary>
    Task<List<ServiceCategoryDto>> GetAllServicesByCategoryAsync();

    /// <summary>Lấy danh sách đơn dịch vụ theo BookingDetailId.</summary>
    Task<List<OrderServiceDto>> GetOrdersByBookingDetailAsync(int bookingDetailId);

    /// <summary>
    /// Tạo đơn dịch vụ mới (Trạng thái ban đầu: Booked).
    /// - BookingDetailId != null → khách đang ở phòng.
    /// - BookingDetailId == null → khách vãng lai POS.
    /// </summary>
    Task<(bool Success, string Message, OrderServiceDto? Order)> CreateOrderAsync(CreateOrderServiceRequest request);

    /// <summary>
    /// Cập nhật trạng thái đơn dịch vụ.
    /// Luồng hợp lệ: Booked → InProgress → Completed; Booked/InProgress → Cancelled.
    /// </summary>
    Task<(bool Success, string Message)> UpdateOrderStatusAsync(int orderId, UpdateOrderStatusRequest request);

    /// <summary>
    /// Cross-check khách đang lưu trú theo số phòng.
    /// Dùng để xác minh khách ngoài không "đọc lụi" số phòng của người khác.
    /// </summary>
    Task<GuestCrossCheckDto> CrossCheckGuestByRoomAsync(string roomNumber);

    /// <summary>
    /// Ghi nợ tổng tiền đơn dịch vụ vào Folio (hóa đơn tổng) của phòng.
    /// Đơn phải là Completed và gắn với BookingDetail.
    /// Khách thanh toán khi Check-out.
    /// </summary>
    Task<PostToFolioResult> PostChargeToFolioAsync(int orderId);

    /// <summary>
    /// Hủy một dòng dịch vụ riêng lẻ trong đơn.
    /// Tự động tính lại TotalAmount và Cancel cả đơn nếu tất cả item đều bị hủy.
    /// </summary>
    Task<(bool Success, string Message)> CancelOrderDetailAsync(int detailId, string? reason);
}
