using HotelERP.BE.Application.DTOs.BookingManagement;
using HotelERP.BE.Application.Interfaces;
using HotelERP.BE.Domain.Constants;
using HotelERP.BE.Infrastructure.Data;
using HotelERP.BE.Helpers.AuditLogs;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Http;
using System.Security.Claims;
using HotelERP.BE.DTOs.Hubs;
using HotelERP.BE.Services;
using HotelERP.BE.DTOs.Notifications;
using HotelERP.BE.Models.Enums;
using HotelERP.BE.Models;

namespace HotelERP.BE.Application.Services;

public class BookingManagementService : IBookingManagementService
{
    private readonly HotelDbContext _context;
    private readonly IHubContext<RoomHub>? _hubContext;
    private readonly INotificationService _notificationService;
    private readonly IEmailService _emailService;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private static readonly Dictionary<string, List<string>> _allowedTransitions = new()
    {
        { BookingStatus.Pending,    new List<string> { BookingStatus.Confirmed, BookingStatus.Cancelled } },
        { BookingStatus.Confirmed,  new List<string> { BookingStatus.CheckedIn, BookingStatus.Cancelled } },
        { BookingStatus.CheckedIn,  new List<string> { BookingStatus.Completed } },
        { BookingStatus.Holding,    new List<string> { BookingStatus.Confirmed, BookingStatus.Cancelled } },
    };

    public BookingManagementService(
        HotelDbContext context, 
        IHubContext<RoomHub> hubContext,
        INotificationService notificationService, 
        IEmailService emailService,
        IHttpContextAccessor httpContextAccessor)
    {
        _context = context;
        _hubContext = hubContext;
        _notificationService = notificationService;
        _emailService = emailService;
        _httpContextAccessor = httpContextAccessor;
    }

    // ==============================================================
    // API 1: SEARCH + FILTER BOOKINGS (có phân trang)
    // ==============================================================
    public async Task<PagedResult<BookingListItemDto>> SearchBookingsAsync(BookingSearchRequest request)
    {
        var query = _context.Bookings
            .Include(b => b.BookingDetails)
                .ThenInclude(bd => bd.Room)
            .Include(b => b.BookingDetails)
                .ThenInclude(bd => bd.RoomType)
            .Include(b => b.Voucher)
            .AsQueryable();

        // --- Filter theo keyword (GuestName, Phone, Email, BookingCode) ---
        if (!string.IsNullOrWhiteSpace(request.Keyword))
        {
            var keyword = request.Keyword.Trim().ToLower();
            query = query.Where(b =>
                (b.GuestName != null && b.GuestName.ToLower().Contains(keyword)) ||
                (b.GuestPhone != null && b.GuestPhone.ToLower().Contains(keyword)) ||
                (b.GuestEmail != null && b.GuestEmail.ToLower().Contains(keyword)) ||
                b.BookingCode.ToLower().Contains(keyword)
            );
        }

        // --- Filter theo trạng thái ---
        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            query = query.Where(b => b.Status == request.Status);
        }

        // --- Filter theo Date Range (dựa trên DateFilterType) ---
        if (request.FromDate.HasValue || request.ToDate.HasValue)
        {
            var fromDate = request.FromDate?.Date;
            var toDate = request.ToDate?.Date.AddDays(1); // inclusive end

            switch (request.FilterType)
            {
                case DateFilterType.CheckInDate:
                    if (fromDate.HasValue) query = query.Where(b => b.BookingDetails.Any(bd => bd.CheckInDate >= fromDate.Value));
                    if (toDate.HasValue) query = query.Where(b => b.BookingDetails.Any(bd => bd.CheckInDate < toDate.Value));
                    break;
                case DateFilterType.CheckOutDate:
                    if (fromDate.HasValue) query = query.Where(b => b.BookingDetails.Any(bd => bd.CheckOutDate >= fromDate.Value));
                    if (toDate.HasValue) query = query.Where(b => b.BookingDetails.Any(bd => bd.CheckOutDate < toDate.Value));
                    break;
                case DateFilterType.BookedDate:
                    if (fromDate.HasValue) query = query.Where(b => b.CreatedAt >= fromDate.Value);
                    if (toDate.HasValue) query = query.Where(b => b.CreatedAt < toDate.Value);
                    break;
            }
        }

        // --- Đếm tổng ---
        var totalCount = await query.CountAsync();

        // --- Phân trang + sắp xếp (mới nhất trước) ---
        var bookings = await query
            .OrderByDescending(b => b.Id)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync();

        return new PagedResult<BookingListItemDto>
        {
            Items = bookings.Select(MapToDto).ToList(),
            TotalCount = totalCount,
            Page = request.Page,
            PageSize = request.PageSize
        };
    }

    // ==============================================================
    // API 2: CẬP NHẬT TRẠNG THÁI BOOKING (CẢ ĐOÀN)
    // ==============================================================
    public async Task<(bool Success, string Message)> UpdateBookingStatusAsync(int bookingId, string newStatus)
    {
        var booking = await _context.Bookings
            .Include(b => b.BookingDetails)
                .ThenInclude(bd => bd.Room)
            .FirstOrDefaultAsync(b => b.Id == bookingId);

        if (booking == null)
            return (false, "Không tìm thấy booking.");

        // Kiểm tra trạng thái hiện tại có được phép chuyển không (Thêm CheckedOut vào quy trình)
        if (!_allowedTransitions.TryGetValue(booking.Status, out var allowedNextStatuses))
            allowedNextStatuses = new List<string>(); // Dự phòng nếu status lạ

        // Cho phép nhảy trạng thái linh hoạt hơn cho quy trình Checkout
        var oldStatus = booking.Status;
        booking.Status = newStatus;
        booking.UpdatedAt = DateTime.UtcNow;

        // Đồng bộ trạng thái xuống BookingDetails và cập nhật trạng thái phòng thực tế
        if (newStatus == BookingStatus.CheckedIn)
        {
            foreach (var detail in booking.BookingDetails)
            {
                if (detail.Status != BookingStatus.Cancelled && detail.Status != BookingStatus.CheckedIn)
                {
                    detail.Status = BookingStatus.CheckedIn;
                    detail.ActualCheckInAt = DateTime.UtcNow;
                    detail.UpdatedAt = DateTime.UtcNow;

                    if (detail.Room != null)
                    {
                        detail.Room.Status = RoomPhysicalStatus.Occupied;
                        detail.Room.UpdatedAt = DateTime.UtcNow;
                    }
                }
            }
        }
        else if (newStatus == BookingStatus.CheckedOut || newStatus == BookingStatus.Completed)
        {
            foreach (var detail in booking.BookingDetails)
            {
                // Chỉ giải phóng những phòng đang ở hoặc đang đợi thanh toán
                if (detail.Status == BookingStatus.CheckedIn || (newStatus == BookingStatus.Completed && detail.Status == BookingStatus.CheckedOut))
                {
                    detail.Status = newStatus;
                    if (newStatus == BookingStatus.CheckedOut) detail.ActualCheckOutAt = DateTime.UtcNow;
                    detail.UpdatedAt = DateTime.UtcNow;

                    // GIẢI PHÓNG PHÒNG NGAY LẬP TỨC
                    if (detail.Room != null)
                    {
                        detail.Room.Status = RoomPhysicalStatus.Available;
                        detail.Room.CleaningStatus = CleaningStatus.Dirty;
                        detail.Room.UpdatedAt = DateTime.UtcNow;
                    }
                }
            }
        }
        else if (newStatus == BookingStatus.Cancelled)
        {
            foreach (var detail in booking.BookingDetails)
            {
                if (detail.Status == BookingStatus.CheckedIn && detail.Room != null)
                {
                    detail.Room.Status = RoomPhysicalStatus.Available;
                }
                
                detail.Status = BookingStatus.Cancelled;
                detail.UpdatedAt = DateTime.UtcNow;
            }
        }

        await _context.SaveChangesAsync();

        // Ghi Audit Log
        var (userId, roleName) = ResolveUser();
        var roomNumbers = string.Join(", ", booking.BookingDetails
            .Where(d => d.Room != null)
            .Select(d => d.Room!.RoomNumber));
        await _context.AddAuditLogAsync(
            userId: userId,
            roleName: roleName,
            actionType: newStatus == BookingStatus.Cancelled ? "DELETE" : "UPDATE",
            entityType: "Booking",
            message: $"Chuyển trạng thái booking #{booking.BookingCode} từ '{oldStatus}' sang '{newStatus}' (phòng: {roomNumbers}).",
            contextParams: new { bookingId, bookingCode = booking.BookingCode, roomNumbers },
            changes: new { oldData = new { Status = oldStatus }, newData = new { Status = newStatus } }
        );

        // ✅ Gửi thông báo hệ thống (Cả đoàn)
        var msg = new NotificationMessage
        {
            Title = "Cập nhật Booking",
            Content = $"Booking #{bookingId} của {booking.GuestName} vừa chuyển sang '{newStatus}'.",
            Type = "Info",
            Action = newStatus switch
            {
                BookingStatus.CheckedIn => NotificationAction.CheckIn,
                BookingStatus.CheckedOut => NotificationAction.CheckOut,
                BookingStatus.Cancelled => NotificationAction.CancelBooking,
                _ => NotificationAction.SystemUpdate
            }
        };

        var dbNotif = new Notification
        {
            Title = msg.Title,
            Content = msg.Content,
            Type = msg.Type,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };
        _context.Notifications.Add(dbNotif);
        await _context.SaveChangesAsync();
        msg.Id = dbNotif.Id; // ✅ Cập nhật ID sau khi save DB
        await _notificationService.SendToRoleAsync("Admin", msg);
 
        // ✅ Gửi thông báo cho khách hàng để redirect sang trang đánh giá
        if ((newStatus == BookingStatus.CheckedOut || newStatus == BookingStatus.Completed) && booking.UserId.HasValue)
        {
            var guestMsg = new NotificationMessage
            {
                Title = "Cảm ơn quý khách!",
                Content = "Bạn đã hoàn tất thủ tục trả phòng. Vui lòng dành chút thời gian đánh giá dịch vụ của chúng tôi.",
                Type = "Success",
                Action = NotificationAction.RedirectToReview,
                ReferenceId = booking.Id.ToString()
            };
            await _notificationService.SendToUserAsync(booking.UserId.Value.ToString(), guestMsg);
        }

        // ✅ Gửi email "Xác nhận thành công" cho khách hàng
        if (newStatus == BookingStatus.Confirmed && !string.IsNullOrWhiteSpace(booking.GuestEmail))
        {
            var subject = $"[Asteria Resort] Đặt phòng #{booking.BookingCode} đã được xác nhận";
            var body = $@"
                <h3>Kính chào quý khách {booking.GuestName},</h3>
                <p>Tuyệt vời! Yêu cầu đặt phòng của quý khách đã được <strong>Xác Nhận Thành Công</strong>.</p>
                <p><strong>Mã đặt phòng:</strong> <span style='color:#16a34a;font-size:18px;'>{booking.BookingCode}</span></p>
                <p>Quý khách vui lòng mang theo giấy tờ tùy thân và đọc mã đặt phòng này khi đến nhận phòng tại Lễ tân.</p>
                <p>Thời gian nhận phòng (Check-in): Từ 14:00.</p>
                <p>Cảm ơn quý khách đã tin tưởng và lựa chọn Asteria Resort.</p>
                <br/>
                <p>Trân trọng,<br/><strong>Asteria Resort Team</strong></p>
            ";
            _ = Task.Run(() => _emailService.SendEmailAsync(booking.GuestEmail, subject, body));
        }

        // Bắn SignalR realtime → cập nhật cột Kinh doanh trên trang Quản lý Quỹ phòng
        if (_hubContext != null)
        {
            foreach (var detail in booking.BookingDetails)
            {
                if (detail.Room != null)
                    await _hubContext.Clients.All.SendAsync("ReceiveRoomStatusUpdate",
                        detail.Room.Id, detail.Room.Status, detail.Room.CleaningStatus);
            }
        }

        return (true, $"Đã chuyển trạng thái booking #{bookingId} từ '{oldStatus}' sang '{newStatus}' thành công.");
    }

    // ==============================================================
    // API 5: CẬP NHẬT TRẠNG THÁI TỪNG PHÒNG LẺ (INDIVIDUAL ROOM)
    // ==============================================================
    public async Task<(bool Success, string Message)> UpdateBookingDetailStatusAsync(int detailId, string newStatus)
    {
        var detail = await _context.BookingDetails
            .Include(bd => bd.Room)
            .Include(bd => bd.Booking)
                .ThenInclude(b => b!.BookingDetails)
            .FirstOrDefaultAsync(bd => bd.Id == detailId);

        if (detail == null) return (false, "Không tìm thấy chi tiết đặt phòng.");
        if (detail.Booking == null) return (false, "Dữ liệu booking cha bị lỗi.");

        var oldDetailStatus = detail.Status;

        // 1. Cập nhật trạng thái cho Detail và Room
        if (newStatus == BookingStatus.CheckedIn)
        {
            if (oldDetailStatus == BookingStatus.CheckedIn) return (false, "Phòng này đã check-in rồi.");
            
            detail.Status = BookingStatus.CheckedIn;
            detail.ActualCheckInAt = DateTime.UtcNow;
            
            if (detail.Room != null)
            {
                detail.Room.Status = RoomPhysicalStatus.Occupied;
                detail.Room.UpdatedAt = DateTime.UtcNow;
            }
        }
        else if (newStatus == BookingStatus.CheckedOut || newStatus == BookingStatus.Completed)
        {
            // Cho phép chuyển từ CheckedIn -> CheckedOut -> Completed
            if (newStatus == BookingStatus.CheckedOut && oldDetailStatus != BookingStatus.CheckedIn)
                return (false, "Phòng phải ở trạng thái Checked_in mới có thể báo trả phòng (Checkout).");

            detail.Status = newStatus;
            if (newStatus == BookingStatus.CheckedOut) detail.ActualCheckOutAt = DateTime.UtcNow;
            
            // GIẢI PHÓNG PHÒNG NGAY KHI CHECKOUT (Ưu tiên logic bẩn/sẵn sàng cho buồng phòng)
            if (detail.Room != null)
            {
                detail.Room.Status = RoomPhysicalStatus.Available;
                detail.Room.CleaningStatus = CleaningStatus.Dirty;
                detail.Room.UpdatedAt = DateTime.UtcNow;
            }
        }
        else if (newStatus == BookingStatus.Cancelled)
        {
            if (oldDetailStatus == BookingStatus.CheckedIn && detail.Room != null)
            {
                detail.Room.Status = RoomPhysicalStatus.Available;
            }
            detail.Status = BookingStatus.Cancelled;
        }

        detail.UpdatedAt = DateTime.UtcNow;

        // 2. Tự động đồng bộ trạng thái lên Booking cha
        var allDetails = detail.Booking.BookingDetails.Where(d => d.Status != BookingStatus.Cancelled).ToList();
        
        if (newStatus == BookingStatus.CheckedIn || newStatus == BookingStatus.CheckedOut)
        {
            // Nếu có ít nhất 1 phòng đã checkin/checkout, booking tổng phải ở trạng thái tương ứng
            if (detail.Booking.Status != newStatus)
            {
                detail.Booking.Status = newStatus;
                detail.Booking.UpdatedAt = DateTime.UtcNow;
            }
        }
        else if (newStatus == BookingStatus.Completed)
        {
            if (allDetails.All(d => d.Status == BookingStatus.Completed))
            {
                detail.Booking.Status = BookingStatus.Completed;
                detail.Booking.UpdatedAt = DateTime.UtcNow;
            }
        }

        await _context.SaveChangesAsync();

        // Ghi Audit Log
        var (userId, roleName) = ResolveUser();
        var roomNum = detail.Room?.RoomNumber ?? "N/A";
        await _context.AddAuditLogAsync(
            userId: userId,
            roleName: roleName,
            actionType: newStatus == BookingStatus.Cancelled ? "DELETE" : "UPDATE",
            entityType: "Booking",
            message: newStatus == BookingStatus.CheckedIn
                ? $"Check-in phòng {roomNum} (mã: {detail.Booking?.BookingCode ?? "N/A"})."
                : newStatus == BookingStatus.CheckedOut || newStatus == BookingStatus.Completed
                    ? $"Check-out phòng {roomNum} (mã: {detail.Booking?.BookingCode ?? "N/A"})."
                    : $"Cập nhật trạng thái phòng {roomNum} sang '{newStatus}' (mã: {detail.Booking?.BookingCode ?? "N/A"}).",
            contextParams: new { detailId, roomNumber = roomNum, bookingCode = detail.Booking?.BookingCode ?? "N/A" },
            changes: new { oldData = new { Status = oldDetailStatus }, newData = new { Status = newStatus } }
        );

        // Bắn SignalR realtime cho trang Quản lý Quỹ phòng
        if (_hubContext != null && detail.Room != null)
        {
            await _hubContext.Clients.All.SendAsync("ReceiveRoomStatusUpdate",
                detail.Room.Id, detail.Room.Status, detail.Room.CleaningStatus);
        }

        // ✅ Gửi thông báo hệ thống (Phòng lẻ)
        var detailMsg = new NotificationMessage
        {
            Title = "Cập nhật phòng",
            Content = $"Phòng {detail.Room?.RoomNumber} vừa cập nhật trạng thái: {newStatus}.",
            Type = "Info",
            Action = newStatus switch
            {
                BookingStatus.CheckedIn => NotificationAction.CheckIn,
                BookingStatus.CheckedOut => NotificationAction.CheckOut,
                _ => NotificationAction.SystemUpdate
            }
        };
        var dbNotif = new Notification
        {
            Title = detailMsg.Title,
            Content = detailMsg.Content,
            Type = detailMsg.Type,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };
        _context.Notifications.Add(dbNotif);
        await _context.SaveChangesAsync();
        detailMsg.Id = dbNotif.Id; // ✅ Cập nhật ID sau khi save DB
        await _notificationService.SendToRoleAsync("Admin", detailMsg);
 
        // ✅ Gửi thông báo cho khách hàng (Phòng lẻ)
        if ((newStatus == BookingStatus.CheckedOut || newStatus == BookingStatus.Completed) && detail.Booking?.UserId != null)
        {
            var guestMsg = new NotificationMessage
            {
                Title = "Trả phòng thành công!",
                Content = $"Phòng {detail.Room?.RoomNumber} đã được trả. Quý khách vui lòng đánh giá dịch vụ.",
                Type = "Success",
                Action = NotificationAction.RedirectToReview,
                ReferenceId = detail.Booking.Id.ToString()
            };
            await _notificationService.SendToUserAsync(detail.Booking.UserId.Value.ToString(), guestMsg);
        }
 
        return (true, $"Đã cập nhật trạng thái phòng lẻ #{detailId} sang '{newStatus}' thành công.");
    }

    // ==============================================================
    // API 3: KHÁCH ĐẾN HÔM NAY (HIỂN THỊ THEO PHÒNG LẺ CHƯA NHẬN)
    // ==============================================================
    public async Task<List<BookingListItemDto>> GetTodayArrivalsAsync()
    {
        var today = DateTime.Today;
        var tomorrow = today.AddDays(1);

        // Truy vấn trực tiếp vào BookingDetails để lấy danh sách phòng lẻ
        var arrivalDetails = await _context.BookingDetails
            .Include(bd => bd.Booking)
            .Include(bd => bd.Room)
            .Include(bd => bd.RoomType)
            .Where(bd => bd.CheckInDate >= today && bd.CheckInDate < tomorrow &&
                        bd.Status != BookingStatus.CheckedIn && 
                        bd.Status != BookingStatus.CheckedOut &&
                        bd.Status != "Checked_out" &&
                        bd.Status != BookingStatus.Cancelled &&
                        bd.Status != BookingStatus.CancelledByAdmin &&
                        bd.Status != BookingStatus.Completed)
            .OrderBy(bd => bd.CheckInDate)
            .ToListAsync();

        // Map mỗi Detail thành một BookingListItemDto (Flattened)
        return arrivalDetails.Select(bd => new BookingListItemDto
        {
            Id = bd.Booking?.Id ?? 0,
            BookingCode = bd.Booking?.BookingCode ?? "N/A",
            GuestName = bd.Booking?.GuestName,
            GuestPhone = bd.Booking?.GuestPhone,
            GuestEmail = bd.Booking?.GuestEmail,
            Status = bd.Booking?.Status ?? "N/A",
            BookedAt = bd.Booking?.BookedAt ?? DateTime.MinValue,
            FinalAmount = bd.Booking?.FinalAmount ?? 0,
            DepositAmount = bd.Booking?.DepositAmount ?? 0,
            PaymentStatus = bd.Booking?.PaymentStatus ?? "N/A",
            Notes = bd.Booking?.Notes,
            CreatedAt = bd.Booking?.CreatedAt ?? DateTime.MinValue,
            Details = new List<BookingDetailItemDto> { MapDetailToDto(bd) }
        }).ToList();
    }

    // ==============================================================
    // API 4: KHÁCH ĐANG LƯU TRÚ (HIỂN THỊ THEO PHÒNG LẺ ĐANG Ở)
    // ==============================================================
    public async Task<List<BookingListItemDto>> GetInHouseGuestsAsync()
    {
        // Truy vấn trực tiếp vào BookingDetails để lấy danh sách phòng lẻ đang ở
        var inHouseDetails = await _context.BookingDetails
            .Include(bd => bd.Booking)
            .Include(bd => bd.Room)
            .Include(bd => bd.RoomType)
            .Where(bd => bd.Status == BookingStatus.CheckedIn)
            .OrderBy(bd => bd.ActualCheckInAt)
            .ToListAsync();

        // Map mỗi Detail thành một BookingListItemDto (Flattened)
        return inHouseDetails.Select(bd => new BookingListItemDto
        {
            Id = bd.Booking?.Id ?? 0,
            BookingCode = bd.Booking?.BookingCode ?? "N/A",
            GuestName = bd.Booking?.GuestName,
            GuestPhone = bd.Booking?.GuestPhone,
            GuestEmail = bd.Booking?.GuestEmail,
            Status = bd.Booking?.Status ?? "N/A",
            BookedAt = bd.Booking?.BookedAt ?? DateTime.MinValue,
            FinalAmount = bd.Booking?.FinalAmount ?? 0,
            DepositAmount = bd.Booking?.DepositAmount ?? 0,
            PaymentStatus = bd.Booking?.PaymentStatus ?? "N/A",
            Notes = bd.Booking?.Notes,
            CreatedAt = bd.Booking?.CreatedAt ?? DateTime.MinValue,
            Details = new List<BookingDetailItemDto> { MapDetailToDto(bd) }
        }).ToList();
    }

    // ==============================================================
    // API 6: DANH SÁCH PHÒNG CÓ THỂ TRẢ (TẤT CẢ ĐANG Ở, LỌC TÙY CHỌN THEO NGÀY)
    // - Không date: hiển thị toàn bộ phòng Checked_in (cho phép trả sớm)
    // - Có date: chỉ hiện phòng có checkOutDate = ngày đó
    // ==============================================================
    public async Task<List<BookingListItemDto>> GetTodayDeparturesAsync(DateTime? checkOutDate = null)
    {
        // Bước 1: Lấy tất cả phòng đang Checked_in
        var query = _context.BookingDetails
            .Include(bd => bd.Booking)
            .Include(bd => bd.Room)
            .Include(bd => bd.RoomType)
            .Where(bd => bd.Status == BookingStatus.CheckedIn)
            .AsQueryable();

        // Bước 2: Nếu có filter ngày, lọc theo ngày dự kiến trả phòng
        if (checkOutDate.HasValue)
        {
            var filterDate = checkOutDate.Value.Date;
            var filterDateNext = filterDate.AddDays(1);
            query = query.Where(bd => bd.CheckOutDate >= filterDate && bd.CheckOutDate < filterDateNext);
        }

        var departureDetails = await query
            .OrderBy(bd => bd.CheckOutDate)
            .ToListAsync();

        return departureDetails.Select(bd => new BookingListItemDto
        {
            Id = bd.Booking?.Id ?? 0,
            BookingCode = bd.Booking?.BookingCode ?? "N/A",
            GuestName = bd.Booking?.GuestName,
            GuestPhone = bd.Booking?.GuestPhone,
            GuestEmail = bd.Booking?.GuestEmail,
            Status = bd.Booking?.Status ?? "N/A",
            BookedAt = bd.Booking?.BookedAt ?? DateTime.MinValue,
            FinalAmount = bd.Booking?.FinalAmount ?? 0,
            PaymentStatus = bd.Booking?.PaymentStatus ?? "N/A",
            Notes = bd.Booking?.Notes,
            CreatedAt = bd.Booking?.CreatedAt ?? DateTime.MinValue,
            Details = new List<BookingDetailItemDto> { MapDetailToDto(bd) }
        }).ToList();
    }

    // ==============================================================
    // API 7: ĐỔI PHÒNG CHO KHÁCH (ROOM CHANGE)
    // ==============================================================
    public async Task<(bool Success, string Message)> ChangeRoomAsync(int detailId, int newRoomId)
    {
        var detail = await _context.BookingDetails
            .Include(bd => bd.Room)
            .Include(bd => bd.Booking)
            .FirstOrDefaultAsync(bd => bd.Id == detailId);

        if (detail == null) return (false, "Không tìm thấy chi tiết đặt phòng.");
        if (detail.Status == BookingStatus.Completed || detail.Status == BookingStatus.Cancelled) 
            return (false, "Không thể đổi phòng cho đơn đặt đã hoàn thành hoặc bị hủy.");

        // 1. Tìm phòng mới
        var newRoom = await _context.Rooms.FirstOrDefaultAsync(r => r.Id == newRoomId);
        if (newRoom == null) return (false, "Không tìm thấy phòng mới.");
        if (newRoom.Status != RoomPhysicalStatus.Available)
            return (false, $"Phòng {newRoom.RoomNumber} hiện không sẵn sàng (Trạng thái: {newRoom.Status}).");

        var oldRoomNumber = detail.Room?.RoomNumber ?? "N/A";
        var oldRoom = detail.Room;

        // 2. Giải phóng phòng cũ (nếu có)
        if (oldRoom != null)
        {
            oldRoom.Status = RoomPhysicalStatus.Available;
            oldRoom.CleaningStatus = CleaningStatus.Dirty; // Đánh dấu bẩn để buồng phòng kiểm tra
            oldRoom.UpdatedAt = DateTime.UtcNow;
        }

        // 3. Cập nhật phòng mới vào BookingDetail
        detail.RoomId = newRoom.Id;
        detail.RoomTypeId = newRoom.RoomTypeId; // Tự động cập nhật theo loại phòng của phòng thực tế
        detail.UpdatedAt = DateTime.UtcNow;

        // 4. Chiếm phòng mới (nếu khách đã check-in thì đổi sang Occupied)
        if (detail.Status == BookingStatus.CheckedIn)
        {
            newRoom.Status = RoomPhysicalStatus.Occupied;
        }
        else
        {
            newRoom.Status = RoomPhysicalStatus.Occupied; // Thường thì khi đổi trong Arrivals là để gán giữ chỗ ngay
        }
        newRoom.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        // ✅ Thông báo đổi phòng
        var changeRoomMsg = new NotificationMessage
        {
            Title = "Đổi phòng",
            Content = $"Phòng {oldRoomNumber} đã được chuyển sang {newRoom.RoomNumber}.",
            Type = "Info",
            Action = NotificationAction.ChangeRoom
        };
        var dbNotif = new Notification
        {
            Title = changeRoomMsg.Title,
            Content = changeRoomMsg.Content,
            Type = changeRoomMsg.Type,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };
        _context.Notifications.Add(dbNotif);
        await _context.SaveChangesAsync();
        changeRoomMsg.Id = dbNotif.Id; // ✅ Cập nhật ID sau khi save DB
        await _notificationService.SendToRoleAsync("Admin", changeRoomMsg);

        // Ghi Audit Log
        var (userId, roleName) = ResolveUser();
        await _context.AddAuditLogAsync(
            userId: userId,
            roleName: roleName,
            actionType: "UPDATE",
            entityType: "Booking",
            message: $"Đổi phòng từ {oldRoomNumber} sang {newRoom.RoomNumber} (mã: {detail.Booking?.BookingCode ?? "N/A"}).",
            contextParams: new { detailId, oldRoomNumber, newRoomNumber = newRoom.RoomNumber, bookingCode = detail.Booking?.BookingCode ?? "N/A" },
            changes: new { oldData = new { RoomNumber = oldRoomNumber }, newData = new { RoomNumber = newRoom.RoomNumber } }
        );

        return (true, $"Đã đổi từ phòng {oldRoomNumber} sang phòng {newRoom.RoomNumber} thành công.");
    }

    // ==============================================================
    // HELPER: Map BookingDetail entity → BookingDetailItemDto
    // ==============================================================
    private static BookingDetailItemDto MapDetailToDto(Domain.Models.BookingDetail bd)
    {
        return new BookingDetailItemDto
        {
            Id = bd.Id,
            RoomId = bd.RoomId,
            RoomNumber = bd.Room?.RoomNumber,
            RoomTypeName = bd.RoomType?.Name,
            CheckInDate = bd.CheckInDate,
            CheckOutDate = bd.CheckOutDate,
            PricePerNight = bd.PricePerNight,
            Nights = bd.Nights,
            LineTotal = bd.LineTotal,
            Status = bd.Status,
            ActualCheckInAt = bd.ActualCheckInAt,
            ActualCheckOutAt = bd.ActualCheckOutAt
        };
    }

    // ==============================================================
    // HELPER: Map Booking entity → BookingListItemDto
    // ==============================================================
    private static BookingListItemDto MapToDto(Domain.Models.Booking b)
    {
        return new BookingListItemDto
        {
            Id = b.Id,
            BookingCode = b.BookingCode,
            GuestName = b.GuestName,
            GuestPhone = b.GuestPhone,
            GuestEmail = b.GuestEmail,
            Status = b.Status,
            BookedAt = b.BookedAt,
            FinalAmount = b.FinalAmount,
            DiscountAmount = b.DiscountAmount,
            VoucherCode = b.Voucher?.Code,
            DepositAmount = b.DepositAmount,
            PaymentStatus = b.PaymentStatus,
            Notes = b.Notes,
            CreatedAt = b.CreatedAt,
            UpdatedAt = b.UpdatedAt,
            Details = b.BookingDetails.Select(MapDetailToDto).ToList()
        };
    }

    // ==============================================================
    // API 8: NẠP CỌC (DEPOSIT)
    // ==============================================================
    public async Task<(bool Success, string Message, decimal NewDeposit)> AddDepositAsync(int bookingId, decimal amount)
    {
        var booking = await _context.Bookings.FindAsync(bookingId);
        if (booking == null) return (false, "Không tìm thấy booking.", 0);

        if (booking.Status == BookingStatus.Cancelled || booking.Status == BookingStatus.CancelledByAdmin)
            return (false, "Không thể nạp cọc cho booking đã hủy.", 0);

        booking.DepositAmount += amount;
        
        // (Tuỳ chọn) Nếu tổng cọc >= FinalAmount thì chuyển PaymentStatus = Paid
        if (booking.DepositAmount >= booking.FinalAmount && booking.FinalAmount > 0)
        {
            booking.PaymentStatus = "Paid";
        }

        await _context.SaveChangesAsync();

        // ✅ Thông báo nạp cọc
        var depositMsg = new NotificationMessage
        {
            Title = "Nạp cọc",
            Content = $"Booking #{bookingId} vừa nhận cọc: {amount:N0}đ. Tổng cọc: {booking.DepositAmount:N0}đ.",
            Type = "Success",
            Action = NotificationAction.AddDeposit
        };
        var dbNotif = new Notification
        {
            Title = depositMsg.Title,
            Content = depositMsg.Content,
            Type = depositMsg.Type,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };
        _context.Notifications.Add(dbNotif);
        await _context.SaveChangesAsync();
        depositMsg.Id = dbNotif.Id; // ✅ Cập nhật ID sau khi save DB
        await _notificationService.SendToRoleAsync("Admin", depositMsg);

        // Ghi Audit Log
        var (userId, roleName) = ResolveUser();
        await _context.AddAuditLogAsync(
            userId: userId,
            roleName: roleName,
            actionType: "UPDATE",
            entityType: "Booking",
            message: $"Nạp cọc {amount:N0}đ cho booking #{booking.BookingCode}.",
            contextParams: new { bookingId, bookingCode = booking.BookingCode },
            changes: new { oldData = new { DepositAmount = booking.DepositAmount - amount }, newData = new { booking.DepositAmount } }
        );
        
        return (true, "Nạp cọc thành công!", booking.DepositAmount);
    }

    private (int UserId, string RoleName) ResolveUser()
    {
        var user = _httpContextAccessor.HttpContext?.User;
        var userIdClaim = user?.FindFirst("UserId")?.Value ?? user?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        int userId = int.TryParse(userIdClaim, out int id) ? id : 0;
        var roleName = user?.FindFirst(ClaimTypes.Role)?.Value ?? "User";
        return (userId, roleName);
    }
}