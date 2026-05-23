using HotelERP.BE.Application.DTOs.BookingManagement;
using HotelERP.BE.Application.DTOs.OrderService;
using HotelERP.BE.Application.Interfaces;
using HotelERP.BE.Hubs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace HotelERP.BE.API.Controllers;

[Route("api/booking-management")]
[ApiController]
[Authorize(Roles = "Admin,Manager,Receptionist")]
public class BookingManagementController : ControllerBase
{
    private readonly IBookingManagementService _bookingService;
    private readonly IOrderServiceManagementService _orderService;
    private readonly IHubContext<NotificationHub> _hubContext;

    public BookingManagementController(
        IBookingManagementService bookingService,
        IOrderServiceManagementService orderService,
        IHubContext<NotificationHub> hubContext)
    {
        _bookingService = bookingService;
        _orderService = orderService;
        _hubContext = hubContext;
    }

    // ==============================================================
    // API 1: GET /api/booking-management
    // Search + Filter bookings theo keyword, status, date range
    // ==============================================================
    /// <summary>
    /// Tìm kiếm và lọc danh sách booking.
    /// Hỗ trợ: keyword (tên, SĐT, email, mã booking), trạng thái, khoảng ngày check-in.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> SearchBookings([FromQuery] BookingSearchRequest request)
    {
        var result = await _bookingService.SearchBookingsAsync(request);
        return Ok(new { success = true, data = result });
    }

    // ==============================================================
    // API 2: PUT /api/booking-management/{id}/status
    // Cập nhật trạng thái booking theo quy trình hotel
    // ==============================================================
    /// <summary>
    /// Cập nhật trạng thái booking.
    /// Quy trình: Pending → Confirmed → Checked_in → Completed.
    /// Có thể hủy (Cancelled) từ Pending hoặc Confirmed.
    /// </summary>
    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateBookingStatusRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.NewStatus))
        {
            return BadRequest(new { success = false, message = "Trạng thái mới không được để trống." });
        }

        var (success, message) = await _bookingService.UpdateBookingStatusAsync(id, request.NewStatus);

        if (!success)
        {
            return BadRequest(new { success = false, message });
        }

        return Ok(new { success = true, message });
    }

    // ==============================================================
    // API 3: GET /api/booking-management/today-arrivals
    // Danh sách "Khách đến hôm nay"
    // ==============================================================
    /// <summary>
    /// Lấy danh sách khách đến hôm nay (CheckInDate = Today, Status = Confirmed).
    /// </summary>
    [HttpGet("today-arrivals")]
    public async Task<IActionResult> GetTodayArrivals()
    {
        var result = await _bookingService.GetTodayArrivalsAsync();
        return Ok(new { success = true, count = result.Count, data = result });
    }

    // ==============================================================
    // API 4: GET /api/booking-management/in-house
    // Danh sách "Khách đang lưu trú"
    // ==============================================================
    /// <summary>
    /// Lấy danh sách khách đang lưu trú (Status = Checked_in).
    /// </summary>
    [HttpGet("in-house")]
    public async Task<IActionResult> GetInHouseGuests()
    {
        var result = await _bookingService.GetInHouseGuestsAsync();
        return Ok(new { success = true, count = result.Count, data = result });
    }

    // ==============================================================
    // API 5: PUT /api/booking-management/details/{detailId}/status
    // Cập nhật trạng thái từng phòng lẻ
    // ==============================================================
    /// <summary>
    /// Cập nhật trạng thái cho từng phòng lẻ (BookingDetail).
    /// Hỗ trợ Check-in/Check-out riêng lẻ và tự động đồng bộ trạng thái phòng vật lý.
    /// </summary>
    [HttpPut("details/{detailId}/status")]
    public async Task<IActionResult> UpdateDetailStatus(int detailId, [FromBody] UpdateBookingStatusRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.NewStatus))
        {
            return BadRequest(new { success = false, message = "Trạng thái mới không được để trống." });
        }

        var (success, message) = await _bookingService.UpdateBookingDetailStatusAsync(detailId, request.NewStatus);

        if (!success)
        {
            return BadRequest(new { success = false, message });
        }

        return Ok(new { success = true, message });
    }

    // ==============================================================
    // API 6: GET /api/booking-management/departures
    // Danh sách phòng có thể trả (tất cả đang Checked_in, filter ngày tùy chọn)
    // ==============================================================
    /// <summary>
    /// Lấy danh sách phòng có thể check-out.
    /// Không có date → trả về TẤT CẢ phòng đang Checked_in (hỗ trợ trả phòng sớm).
    /// Có date → lọc theo ngày dự kiến trả phòng.
    /// </summary>
    [HttpGet("departures")]
    public async Task<IActionResult> GetDepartures([FromQuery] DateTime? checkOutDate)
    {
        var result = await _bookingService.GetTodayDeparturesAsync(checkOutDate);
        return Ok(new { success = true, count = result.Count, data = result });
    }

    // ==============================================================
    // API 7: PUT /api/booking-management/details/{detailId}/change-room
    // Đổi phòng cho khách
    // ==============================================================
    /// <summary>
    /// Thay đổi phòng vật lý cho một booking detail.
    /// </summary>
    [HttpPut("details/{detailId}/change-room")]
    public async Task<IActionResult> ChangeRoom(int detailId, [FromBody] ChangeRoomRequest request)
    {
        if (request.NewRoomId <= 0)
            return BadRequest(new { success = false, message = "ID phòng mới không hợp lệ." });

        var (success, message) = await _bookingService.ChangeRoomAsync(detailId, request.NewRoomId);

        if (!success) return BadRequest(new { success = false, message });

        return Ok(new { success = true, message });
    }

    // ==============================================================
    // API 8: PUT /api/booking-management/{id}/deposit
    // Nạp cọc
    // ==============================================================
    /// <summary>
    /// Nạp cọc cho booking
    /// </summary>
    [HttpPut("{id}/deposit")]
    public async Task<IActionResult> AddDeposit(int id, [FromBody] DepositRequest request)
    {
        if (request.Amount <= 0)
            return BadRequest(new { success = false, message = "Số tiền cọc phải lớn hơn 0." });

        var result = await _bookingService.AddDepositAsync(id, request.Amount);

        if (!result.Success) return BadRequest(new { success = false, message = result.Message });

        return Ok(new { success = true, message = result.Message, newDeposit = result.NewDeposit });
    }

    // ==============================================================
    // API 9: GET /api/booking-management/services
    // Lấy danh sách dịch vụ ACTIVE, nhóm theo danh mục (cho modal đặt DV)
    // ==============================================================
    /// <summary>
    /// Lấy danh sách tất cả dịch vụ đang hoạt động, nhóm theo danh mục.
    /// Cho phép tất cả user đăng nhập xem (bao gồm khách).
    /// </summary>
    [HttpGet("services")]
    [Authorize] // Cho phép mọi role đăng nhập (override class-level Receptionist-only)
    public async Task<IActionResult> GetServices()
    {
        var result = await _orderService.GetAllServicesByCategoryAsync();
        return Ok(new { success = true, data = result });
    }

    // ==============================================================
    // API 10: GET /api/booking-management/details/{detailId}/orders
    // Lấy lịch sử đơn dịch vụ của 1 BookingDetail (phòng đang ở)
    // ==============================================================
    /// <summary>
    /// Lấy danh sách đơn dịch vụ đã đặt cho một phòng cụ thể (BookingDetail).
    /// Dùng để hiển thị lịch sử dịch vụ trong tab In-House.
    /// </summary>
    [HttpGet("details/{detailId}/orders")]
    public async Task<IActionResult> GetOrdersByBookingDetail(int detailId)
    {
        var result = await _orderService.GetOrdersByBookingDetailAsync(detailId);
        return Ok(new { success = true, count = result.Count, data = result });
    }

    // ==============================================================
    // API 11: POST /api/booking-management/orders
    // Tạo đơn dịch vụ (khách in-house HOẶC khách vãng lai POS)
    // ==============================================================
    /// <summary>
    /// Tạo đơn dịch vụ mới.
    /// - Khách đang ở phòng: truyền BookingDetailId.
    /// - Khách vãng lai (POS): BookingDetailId = null, GuestName tùy chọn.
    /// Cho phép tất cả user đăng nhập gọi để khách có thể đặt từ site.
    /// </summary>
    [HttpPost("orders")]
    [Authorize] // Cho phép mọi role đăng nhập (override class-level Receptionist-only)
    public async Task<IActionResult> CreateOrder([FromBody] CreateOrderServiceRequest request)
    {
        var (success, message, order) = await _orderService.CreateOrderAsync(request);

        if (!success)
            return BadRequest(new { success = false, message });

        // Ẩy SignalR real-time đến group Receptionist + Admin
        if (order is not null)
        {
            var payload = new
            {
                orderCode     = order.OrderCode,
                guestName     = order.GuestName ?? "Khách",
                totalAmount   = order.TotalAmount,
                isWalkIn      = order.BookingDetailId is null,
                roomInfo      = order.BookingDetailId.HasValue ? $"BookingDetail #{order.BookingDetailId}" : "Vãng lai",
                createdAt     = DateTime.UtcNow,
            };
            await _hubContext.Clients.Group("Receptionist").SendAsync("NewServiceOrder", payload);
            await _hubContext.Clients.Group("Admin").SendAsync("NewServiceOrder", payload);
            await _hubContext.Clients.Group("Manager").SendAsync("NewServiceOrder", payload);
        }

        return Ok(new { success = true, message, data = order });
    }

    // ==============================================================
    // API 12: PUT /api/booking-management/orders/{id}/status
    // Cập nhật trạng thái đơn dịch vụ theo workflow
    // Booked → InProgress → Completed | Cancelled
    // ==============================================================
    /// <summary>
    /// Cập nhật trạng thái đơn dịch vụ.
    /// Luồng hợp lệ: Booked → InProgress → Completed. Có thể Cancelled từ Booked/InProgress.
    /// </summary>
    [HttpPut("orders/{orderId}/status")]
    public async Task<IActionResult> UpdateOrderStatus(int orderId, [FromBody] UpdateOrderStatusRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.NewStatus))
            return BadRequest(new { success = false, message = "Trạng thái mới không được để trống." });

        var (success, message) = await _orderService.UpdateOrderStatusAsync(orderId, request);

        if (!success)
            return BadRequest(new { success = false, message });

        return Ok(new { success = true, message });
    }

    // ==============================================================
    // API 13: GET /api/booking-management/rooms/{roomNumber}/in-house-guest
    // Cross-check khách đang lưu trú theo số phòng
    // ==============================================================
    /// <summary>
    /// Xác minh khách đang ở phòng theo số phòng.
    /// Dùng trước khi tạo đơn dịch vụ cho khách in-house để tránh gian lận.
    /// </summary>
    [HttpGet("rooms/{roomNumber}/in-house-guest")]
    public async Task<IActionResult> CrossCheckGuestByRoom(string roomNumber)
    {
        if (string.IsNullOrWhiteSpace(roomNumber))
            return BadRequest(new { success = false, message = "Số phòng không hợp lệ." });

        var result = await _orderService.CrossCheckGuestByRoomAsync(roomNumber);
        return Ok(new { success = true, data = result });
    }

    // ==============================================================
    // API 14: POST /api/booking-management/orders/{id}/post-to-folio
    // Ghi nợ tiền dịch vụ vào hóa đơn tổng của phòng (Folio)
    // ==============================================================
    /// <summary>
    /// Ghi nợ tổng tiền đơn dịch vụ đã Completed vào Folio (Invoice Draft) của phòng.
    /// Khách sẽ thanh toán cùng tiền phòng khi Check-out.
    /// Có bảo vệ chống ghi nợ 2 lần.
    /// </summary>
    [HttpPost("orders/{orderId}/post-to-folio")]
    public async Task<IActionResult> PostOrderToFolio(int orderId)
    {
        var result = await _orderService.PostChargeToFolioAsync(orderId);

        if (!result.Success)
            return BadRequest(new { success = false, message = result.Message });

        return Ok(new { success = true, message = result.Message, data = result });
    }

    // ==============================================================
    // API 15: DELETE /api/booking-management/order-details/{detailId}
    // Hủy một dòng dịch vụ riêng lẻ trong đơn
    // ==============================================================
    /// <summary>
    /// Hủy một dòng dịch vụ riêng lẻ (item-level cancel).
    /// Tự động tính lại tổng tiền đơn. Nếu toàn bộ item bị hủy thì cả đơn chuyển Cancelled.
    /// </summary>
    [HttpDelete("order-details/{detailId}")]
    public async Task<IActionResult> CancelOrderDetail(int detailId, [FromBody] CancelOrderDetailRequest? request)
    {
        var (success, message) = await _orderService.CancelOrderDetailAsync(detailId, request?.Reason);

        if (!success)
            return BadRequest(new { success = false, message });

        return Ok(new { success = true, message });
    }
}
