using HotelERP.BE.Application.DTOs.BookingEngine;
using HotelERP.BE.Application.Interfaces;
using HotelERP.BE.Domain.Constants;
using HotelERP.BE.Domain.Models;
using HotelERP.BE.Infrastructure.Data;
using RedLockNet;
using StackExchange.Redis;
using Microsoft.EntityFrameworkCore;
using System.CodeDom.Compiler;
using HotelERP.BE.Services;
using HotelERP.BE.DTOs.Notifications;
using HotelERP.BE.Models.Enums;
using HotelERP.BE.Models;
using HotelERP.BE.Services.Bookings;

namespace HotelERP.BE.Application.Services;

public class BookingEngineService : IBookingEngineService
{
    private readonly HotelDbContext _context;
    private readonly IDistributedLockFactory _lockFactory;
    private readonly IConnectionMultiplexer _redis;
    private readonly IBookingVoucherService _voucherService;
    private readonly INotificationService _notificationService;
    private readonly IEmailService _emailService;

    public BookingEngineService(
        HotelDbContext context, 
        IDistributedLockFactory lockFactory, 
        IConnectionMultiplexer redis,
        INotificationService notificationService,
        IBookingVoucherService voucherService,
        IEmailService emailService)
    {
        _context = context;
        _lockFactory = lockFactory;
        _redis = redis;
        _notificationService = notificationService;
        _voucherService = voucherService;
        _emailService = emailService;
    }

    // ====================================================================
    // SEARCH, HOLD VÀ RELEASE (REDLOCK)
    // ====================================================================

    public async Task<string> HoldRoomAsync(int roomTypeId, int userId, DateTime checkIn, DateTime checkOut)
    {
        if (checkIn.Date < DateTime.UtcNow.Date)
            throw new Exception("Ngày nhận phòng không được nằm trong quá khứ.");
        if (checkOut.Date <= checkIn.Date)
            throw new Exception("Ngày trả phòng phải sau ngày nhận phòng.");

        string resourceLockKey = $"lock:roomtype:{roomTypeId}";
        var expiry = TimeSpan.FromSeconds(10); 
        var wait = TimeSpan.FromSeconds(3);    
        var retry = TimeSpan.FromMilliseconds(500); 

        using (var redLock = await _lockFactory.CreateLockAsync(resourceLockKey, expiry, wait, retry))
        {
            if (!redLock.IsAcquired)
                throw new Exception("Hệ thống đang bận xử lý lượt đặt phòng khác. Vui lòng thử lại sau giây lát!");

            int totalPhysicalRooms = await _context.Rooms
                .CountAsync(r => r.RoomTypeId == roomTypeId && r.Status == "Available");

            int occupiedRooms = await _context.BookingDetails
                .CountAsync(bd => 
                    bd.RoomTypeId == roomTypeId &&
                    (bd.Status == BookingStatus.Confirmed || 
                     bd.Status == BookingStatus.CheckedIn || 
                     bd.Status == BookingStatus.Holding ||
                     bd.Status == BookingStatus.Pending) && 
                    bd.CheckInDate < checkOut && 
                    bd.CheckOutDate > checkIn);

            if (totalPhysicalRooms - occupiedRooms <= 0)
                throw new Exception("Rất tiếc, loại phòng này vừa hết chỗ trong khoảng thời gian bạn chọn.");

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                string generatedCode = "BK" + DateTime.UtcNow.ToString("yyyyMMddHHmmss");
                var newBooking = new Booking
                {
                    UserId = userId,
                    BookingCode = generatedCode,
                    Status = BookingStatus.Holding,
                    CreatedAt = DateTime.UtcNow,
                    HoldExpiresAt = DateTime.UtcNow.AddMinutes(15), 
                    PaymentStatus = "UNPAID",
                    BookingSubtotal = 0, 
                    DiscountAmount = 0,
                    FinalAmount = 0
                };
                _context.Bookings.Add(newBooking);
                await _context.SaveChangesAsync(); 

                var detail = new BookingDetail
                {
                    BookingId = newBooking.Id,
                    RoomTypeId = roomTypeId,
                    CheckInDate = checkIn,
                    CheckOutDate = checkOut,
                    Status = "Booked", 
                    AdultsCount = 1, 
                    CreatedAt = DateTime.UtcNow
                };
                _context.BookingDetails.Add(detail);
                await _context.SaveChangesAsync();

                var db = _redis.GetDatabase();
                await db.StringSetAsync($"booking:hold:{newBooking.Id}", "pending", TimeSpan.FromMinutes(15));

                await transaction.CommitAsync();
                return $"Giữ phòng thành công! Mã Booking: {newBooking.Id}. Bạn có 15 phút để hoàn tất thanh toán.";
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                throw new Exception("Có lỗi xảy ra khi khởi tạo đơn đặt phòng.");
            }
        }
    }

    public async Task ReleaseExpiredBookingsAsync()
    {
        var expiredBookings = await _context.Bookings
            .Where(b => b.Status == BookingStatus.Holding && b.HoldExpiresAt < DateTime.UtcNow)
            .ToListAsync();

        foreach (var booking in expiredBookings)
        {

            booking.Status = BookingStatus.Expired; 
            var db = _redis.GetDatabase();
            await db.KeyDeleteAsync($"booking:hold:{booking.Id}");
        }

        if (expiredBookings.Any())
        {
            await _context.SaveChangesAsync();
        }
    }

    public async Task<IEnumerable<AvailableRoomTypeResponse>> SearchAvailableRoomsAsync(SearchRoomRequest request)
    {
        if (request.CheckInDate.Date < DateTime.UtcNow.Date)
            throw new Exception("Ngày nhận phòng không được nhỏ hơn ngày hôm nay.");
        
        if (request.CheckOutDate <= request.CheckInDate)
            throw new Exception("Ngày trả phòng phải lớn hơn ngày nhận phòng.");

        var roomTypesQuery = await _context.RoomTypes
            .Where(rt => rt.Status == "ACTIVE" 
                      && rt.CapacityAdults >= request.AdultsCount 
                      && rt.CapacityChildren >= request.ChildrenCount)
            .Select(rt => new 
            {
                RoomType = rt,
                TotalPhysicalRooms = _context.Rooms.Count(r => r.RoomTypeId == rt.Id && r.Status == RoomPhysicalStatus.Available),
                OccupiedRooms = _context.BookingDetails.Count(bd => 
                        bd.RoomTypeId == rt.Id &&
                        (bd.Status == BookingStatus.Confirmed || 
                         bd.Status == BookingStatus.CheckedIn || 
                         bd.Status == BookingStatus.Holding ||
                         bd.Status == BookingStatus.Pending) && 
                        bd.CheckInDate < request.CheckOutDate && 
                        bd.CheckOutDate > request.CheckInDate)
            })
            .ToListAsync();

        var availableRooms = roomTypesQuery
            .Where(x => (x.TotalPhysicalRooms - x.OccupiedRooms) > 0)
            .Select(x => new AvailableRoomTypeResponse
            {
                RoomTypeId = x.RoomType.Id,
                Name = x.RoomType.Name,
                BasePrice = x.RoomType.BasePrice,
                CapacityAdults = x.RoomType.CapacityAdults,
                CapacityChildren = x.RoomType.CapacityChildren,
                AvailableCount = x.TotalPhysicalRooms - x.OccupiedRooms
            });

        return availableRooms;
    }

    // ====================================================================
    //  MULTI-ROOM, ADMIN CANCEL, CHECK-IN
    // ====================================================================

    public async Task<int> CreateMultiRoomBookingAsync(int userId, MultiRoomBookingRequest request)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();
        try {
            var booking = new Booking {
                UserId = userId,
                GuestName = request.GuestName,
                GuestEmail = request.GuestEmail,
                GuestPhone = request.GuestPhone,
                Status = BookingStatus.Holding,
                CreatedAt = DateTime.UtcNow,
                Notes = request.Notes,
                BookingCode = "BK-" + Guid.NewGuid().ToString().Substring(0, 8).ToUpper()
            };
            _context.Bookings.Add(booking);
            await _context.SaveChangesAsync();

            var db = _redis.GetDatabase(); // Fix Redis Call
            decimal finalTotalAmount = 0; // NEW: Biến cộng dồn tổng tiền

            foreach (var item in request.Items) {
                if (item.CheckInDate.Date < DateTime.UtcNow.Date)
                    throw new Exception($"Ngày nhận phòng ({item.CheckInDate:dd/MM/yyyy}) không được nằm trong quá khứ.");
                if (item.CheckOutDate.Date <= item.CheckInDate.Date)
                    throw new Exception("Ngày trả phòng phải sau ngày nhận phòng.");

                // NEW: Lấy giá BasePrice từ CSDL cho hạng phòng này
                var roomTypeInfo = await _context.RoomTypes.FindAsync(item.RoomTypeId);
                var basePrice = roomTypeInfo?.BasePrice ?? 0;
                var nightsCount = (int)(item.CheckOutDate.Date - item.CheckInDate.Date).TotalDays;
                if (nightsCount <= 0) nightsCount = 1;

                for (int i = 0; i < item.Quantity; i++) {
                    var lineTotal = basePrice * nightsCount;
                    finalTotalAmount += lineTotal;

                    // ══════════════════════════════════════════════════════════════
                    // CHỐNG OVERBOOKING: Tự động tìm & khóa phòng vật lý còn trống
                    // Ưu tiên: Nếu FE truyền lên RoomId cụ thể → kiểm tra còn trống không
                    //          Nếu không → Backend tự động tìm phòng trống và gán
                    // ══════════════════════════════════════════════════════════════
                    int? assignedRoomId = null;

                    if (item.RoomIds != null && item.RoomIds.Count > i && item.RoomIds[i] > 0)
                    {
                        // FE đã chọn phòng cụ thể → kiểm tra xem còn trống không
                        int requested = item.RoomIds[i];
                        bool taken = await _context.BookingDetails.AnyAsync(bd =>
                            bd.RoomId == requested &&
                            (bd.Status == BookingStatus.Confirmed || 
                             bd.Status == BookingStatus.CheckedIn || 
                             bd.Status == BookingStatus.Holding ||
                             bd.Status == BookingStatus.Pending) &&
                            bd.CheckInDate < item.CheckOutDate &&
                            bd.CheckOutDate > item.CheckInDate);

                        if (taken)
                            throw new Exception($"Phòng bạn chọn đã bị đặt mất! Vui lòng quay lại và chọn phòng khác.");

                        assignedRoomId = requested;
                    }
                    else
                    {
                        // Backend tự tìm phòng trống: lấy ID phòng đã bị đặt trùng ngày
                        var bookedRoomIds = await _context.BookingDetails
                            .Where(bd =>
                                (bd.Status == BookingStatus.Confirmed || 
                                 bd.Status == BookingStatus.CheckedIn || 
                                 bd.Status == BookingStatus.Holding ||
                                 bd.Status == BookingStatus.Pending) &&
                                bd.RoomId.HasValue &&
                                bd.CheckInDate < item.CheckOutDate &&
                                bd.CheckOutDate > item.CheckInDate)
                            .Select(bd => bd.RoomId!.Value)
                            .Distinct()
                            .ToListAsync();

                        // Tìm phòng vật lý đầu tiên còn trống của hạng phòng này
                        var freeRoom = await _context.Rooms
                            .Where(r =>
                                r.RoomTypeId == item.RoomTypeId &&
                                r.DeletedAt == null &&
                                r.Status == "Available" &&
                                !bookedRoomIds.Contains(r.Id))
                            .OrderBy(r => r.Floor).ThenBy(r => r.RoomNumber)
                            .FirstOrDefaultAsync();

                        if (freeRoom == null)
                            throw new Exception($"Rất tiếc! Hạng phòng \"{roomTypeInfo?.Name}\" đã hết phòng trống trong khoảng thời gian {item.CheckInDate:dd/MM/yyyy} – {item.CheckOutDate:dd/MM/yyyy}. Vui lòng chọn ngày khác hoặc hạng phòng khác.");

                        assignedRoomId = freeRoom.Id;
                    }

                    var detail = new BookingDetail {
                        BookingId    = booking.Id,
                        RoomTypeId   = item.RoomTypeId,
                        RoomId       = assignedRoomId, // ← Luôn có phòng vật lý cụ thể
                        CheckInDate  = item.CheckInDate,
                        CheckOutDate = item.CheckOutDate,
                        Status       = BookingStatus.Holding,
                        PricePerNight = basePrice,
                        Nights       = nightsCount,
                        LineTotal    = lineTotal
                    };
                    _context.BookingDetails.Add(detail);
                }
                
                try {
                    await db.StringSetAsync($"hold:{booking.Id}:{item.RoomTypeId}", "HOLDING", TimeSpan.FromMinutes(15));
                } catch {
                    // Redis không bắt buộc — Booking vẫn thành công nếu Redis không khả dụng
                }
            }

            // Gán lại tổng tiền cuối cho mảng Booking cha
            booking.BookingSubtotal = finalTotalAmount;
            
            // NEW: Membership Discount Logic
            if (userId > 0)
            {
                var user = await _context.Users
                    .Include(u => u.Membership)
                    .FirstOrDefaultAsync(u => u.Id == userId);
                
                if (user?.Membership != null && user.Membership.DiscountPercent > 0)
                {
                    booking.MembershipDiscountAmount = Math.Round(finalTotalAmount * (user.Membership.DiscountPercent / 100m), 2);
                    booking.Notes += $" (Membership Discount {user.Membership.DiscountPercent}%: -{booking.MembershipDiscountAmount:N0}đ)";
                }
            }

            booking.FinalAmount = finalTotalAmount - booking.MembershipDiscountAmount;
            
            await _context.SaveChangesAsync();

            // NEW: Áp dụng Voucher nếu có
            if (!string.IsNullOrWhiteSpace(request.VoucherCode))
            {
                var (isApplied, error, _) = await _voucherService.ApplyVoucherAsync(booking.Id, request.VoucherCode);
                // Bạn có thể chọn quăng lỗi hoặc chỉ log nếu voucher không hợp lệ
                // Ở đây tôi chọn không quăng lỗi để đơn đặt phòng vẫn thành công, chỉ là không được giảm giá
            }

            await transaction.CommitAsync();

            // ✅ Thông báo Booking mới
            var newBookingMsg = new NotificationMessage
            {
                Title = "Booking mới",
                Content = $"Đơn đặt phòng mới #{booking.BookingCode} cho {request.GuestName}. Tổng: {finalTotalAmount:N0}đ.",
                Type = "Success",
                Action = NotificationAction.CreateBooking
            };
            var dbNotif = new Notification
            {
                Title = newBookingMsg.Title,
                Content = newBookingMsg.Content,
                Type = newBookingMsg.Type,
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };
            _context.Notifications.Add(dbNotif);
            await _context.SaveChangesAsync();
            newBookingMsg.Id = dbNotif.Id; // ✅ Cập nhật ID sau khi save DB
            // Gửi thông báo tới Admin, Manager VÀ Lễ tân (Receptionist)
            await _notificationService.SendToRoleAsync("Admin", newBookingMsg);
            await _notificationService.SendToRoleAsync("Manager", newBookingMsg);
            await _notificationService.SendToRoleAsync("Receptionist", newBookingMsg);

            // Gửi thông báo cho User (Guest) đã đặt phòng
            if (userId > 0)
            {
                var userMsg = new NotificationMessage
                {
                    Title = "Đặt phòng thành công",
                    Content = $"Yêu cầu đặt phòng #{booking.BookingCode} của bạn đã được ghi nhận. Tổng: {finalTotalAmount:N0}đ.",
                    Type = "Success",
                    Action = NotificationAction.CreateBooking
                };
                var userDbNotif = new Notification
                {
                    UserId = userId,
                    Title = userMsg.Title,
                    Content = userMsg.Content,
                    Type = userMsg.Type,
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                };
                _context.Notifications.Add(userDbNotif);
                await _context.SaveChangesAsync();
                userMsg.Id = userDbNotif.Id;
                await _notificationService.SendToUserAsync(userId.ToString(), userMsg);
            }

            // ✅ Gửi email "Ghi nhận yêu cầu" cho khách hàng
            if (!string.IsNullOrWhiteSpace(booking.GuestEmail))
            {
                var subject = $"[Asteria Resort] Đã ghi nhận yêu cầu đặt phòng #{booking.BookingCode}";
                var body = $@"
                    <h3>Kính chào quý khách {booking.GuestName},</h3>
                    <p>Asteria Resort đã nhận được yêu cầu đặt phòng của quý khách.</p>
                    <p><strong>Mã đặt phòng:</strong> <span style='color:#b8956a;font-size:18px;'>{booking.BookingCode}</span></p>
                    <p>Yêu cầu của quý khách đang được bộ phận Lễ tân xử lý. Chúng tôi sẽ liên hệ lại hoặc gửi email xác nhận chính thức trong thời gian sớm nhất.</p>
                    <p>Nếu có thắc mắc, vui lòng liên hệ hotline của resort.</p>
                    <br/>
                    <p>Trân trọng,<br/><strong>Asteria Resort Team</strong></p>
                ";
                // Chạy ngầm tránh block response
                _ = Task.Run(() => _emailService.SendEmailAsync(booking.GuestEmail, subject, body));
            }

            return booking.Id;
        }
        catch {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<bool> AdminForceCancelBookingAsync(int bookingId)
    {
        var booking = await _context.Bookings.Include(b => b.BookingDetails).FirstOrDefaultAsync(b => b.Id == bookingId);
        if (booking == null) return false;

        booking.Status = BookingStatus.CancelledByAdmin;
        var db = _redis.GetDatabase(); // Fix Redis Call

        foreach (var detail in booking.BookingDetails) {
            detail.Status = BookingStatus.CancelledByAdmin;
            if (detail.RoomId.HasValue) 
            {
                var room = await _context.Rooms.FindAsync(detail.RoomId.Value);
                if (room != null && room.Status != RoomPhysicalStatus.Available)
                {
                    room.Status = RoomPhysicalStatus.Available;
                }
            }
            await db.KeyDeleteAsync($"hold:{bookingId}:{detail.RoomTypeId}");
        }

        await _context.SaveChangesAsync();

        // ✅ Thông báo Force Cancel
        var forceCancelMsg = new NotificationMessage
        {
            Title = "Hủy Booking (Admin)",
            Content = $"Booking #{booking.BookingCode} đã bị Admin ép hủy.",
            Type = "Warning",
            Action = NotificationAction.CancelBooking
        };
        var dbNotif = new Notification
        {
            Title = forceCancelMsg.Title,
            Content = forceCancelMsg.Content,
            Type = forceCancelMsg.Type,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };
        _context.Notifications.Add(dbNotif);
        await _context.SaveChangesAsync();
        forceCancelMsg.Id = dbNotif.Id; // ✅ Cập nhật ID sau khi save DB
        await _notificationService.SendToRoleAsync("Admin", forceCancelMsg);

        return true;
    }

    public async Task<(bool IsSuccess, string ErrorCode, Domain.Models.Voucher? Voucher)> ValidateVoucherAsync(string voucherCode, decimal subtotal)
    {
        return await _voucherService.ValidateVoucherAsync(voucherCode, subtotal);
    }

    public async Task<IEnumerable<object>> GetAssignableRoomsAsync(int roomTypeId)
    {
        return await _context.Rooms
            .Where(r => r.RoomTypeId == roomTypeId && 
                        r.Status == RoomPhysicalStatus.Available && 
                        r.CleaningStatus == CleaningStatus.Clean)
            .Select(r => new { r.Id, r.RoomNumber, r.Floor, r.CleaningStatus })
            .ToListAsync();
    }
}