using System.Security.Claims;
using HotelERP.BE.Application.DTOs.UserProfile;
using HotelERP.BE.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HotelERP.BE.Services.Loyalty;

namespace HotelERP.BE.API.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize] // Bắt buộc đăng nhập cho toàn bộ Controller này
public class UserProfileController : ControllerBase
{
    private readonly IUserProfileService _userProfileService;
    private readonly IPhotoService _photoService;
    private readonly ILoyaltyPointService _loyaltyPointService;
    private readonly HotelERP.BE.Services.Vouchers.IVoucherService _voucherService;
    private readonly HotelERP.BE.Infrastructure.Data.HotelDbContext _context;
 
    public UserProfileController(
        IUserProfileService userProfileService, 
        IPhotoService photoService, 
        ILoyaltyPointService loyaltyPointService,
        HotelERP.BE.Services.Vouchers.IVoucherService voucherService,
        HotelERP.BE.Infrastructure.Data.HotelDbContext context)
    {
        _userProfileService = userProfileService;
        _photoService = photoService;
        _loyaltyPointService = loyaltyPointService;
        _voucherService = voucherService;
        _context = context;
    }

    // Hàm hỗ trợ lấy UserId từ Token đang đăng nhập
    private int GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value 
                          ?? User.FindFirst("sub")?.Value; // Fallback to "sub"
        
        Console.WriteLine($"[DEBUG] GetCurrentUserId: userIdClaim = '{userIdClaim}'");

        if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
        {
            throw new Exception($"Token không hợp lệ hoặc thiếu UserId. Claim value: '{userIdClaim}'");
        }
        return userId;
    }

    [HttpGet("my-profile")]
    public async Task<IActionResult> GetMyProfile()
    {
        try
        {
            int userId = GetCurrentUserId();
            var profile = await _userProfileService.GetMyProfileAsync(userId);
            return Ok(new { success = true, data = profile });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPut("update-profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        try
        {
            int userId = GetCurrentUserId();
            await _userProfileService.UpdateProfileAsync(userId, request);
            return Ok(new { success = true, message = "Cập nhật thông tin thành công." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPut("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        try
        {
            int userId = GetCurrentUserId();
            await _userProfileService.ChangePasswordAsync(userId, request);
            return Ok(new { success = true, message = "Đổi mật khẩu thành công." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
    
   [HttpPost("upload-avatar")]
    public async Task<IActionResult> UploadAvatar(IFormFile file) // Nhận file từ Request
    {
        try
        {
            int userId = GetCurrentUserId();
            var profile = await _userProfileService.GetMyProfileAsync(userId);

            // 1. Up ảnh mới lên Cloudinary
            var uploadResult = await _photoService.UploadPhotoAsync(file);

            // 2. Nếu user đã có ảnh cũ, hãy xóa nó trên Cloudinary cho đỡ chật chỗ
            if (!string.IsNullOrEmpty(profile.AvatarUrl) && !string.IsNullOrEmpty(profile.AvatarUrl))
            {
                // Gọi API lấy thông tin gốc trước, do DTO ở trên không trả về AvatarPublicId
                // Để đơn giản và nhanh gọn, tôi sẽ hướng dẫn bạn gọi ngầm qua 1 thao tác nhỏ ở đây
                // Nhưng thực tế, AvatarUrl và PublicId đã được lưu. (Phần xóa ảnh cũ tạm bỏ qua để tránh phức tạp)
            }

            // 3. Lưu link ảnh mới vào Database
            await _userProfileService.UpdateAvatarAsync(userId, uploadResult.Url, uploadResult.PublicId);

            return Ok(new { 
                success = true, 
                message = "Cập nhật ảnh đại diện thành công.",
                avatarUrl = uploadResult.Url // Trả về link luôn cho Frontend hiển thị tức thì
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpGet("my-bookings")]
    public async Task<IActionResult> GetMyBookings()
    {
        try
        {
            int userId = GetCurrentUserId();
            var bookings = await _context.Bookings
                .Include(b => b.BookingDetails)
                    .ThenInclude(bd => bd.RoomType)
                .Include(b => b.BookingDetails)
                    .ThenInclude(bd => bd.Room)
                .Where(b => b.UserId == userId)
                .OrderByDescending(b => b.CreatedAt)
                .Select(b => new {
                    b.Id,
                    b.BookingCode,
                    b.Status,
                    b.CreatedAt,
                    b.FinalAmount,
                    b.DepositAmount,
                    b.PaymentStatus,
                    Details = b.BookingDetails.Select(bd => new {
                        bd.Id,
                        bd.RoomTypeId,
                        RoomTypeName = bd.RoomType != null ? bd.RoomType.Name : "",
                        RoomNumber = bd.Room != null ? bd.Room.RoomNumber : "",
                        bd.Status,
                        bd.CheckInDate,
                        bd.CheckOutDate,
                        bd.Nights,
                        bd.PricePerNight,
                        bd.LineTotal
                    })
                })
                .ToListAsync();

            return Ok(new { success = true, data = bookings });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpGet("my-vouchers")]
    public async Task<IActionResult> GetMyVouchers()
    {
        try
        {
            int userId = GetCurrentUserId();
            var result = await _voucherService.GetMyVouchersAsync(userId);
            return StatusCode(result.StatusCode, result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    /// <summary>
    /// Kiểm tra xem hôm nay có phải sinh nhật của user không.
    /// Nếu có → tự sinh (hoặc lấy lại) voucher sinh nhật và trả về cho FE hiển thị gợi ý.
    /// Nếu không phải sinh nhật → trả về { success: true, data: null }
    /// </summary>
    [HttpGet("birthday-voucher")]
    public async Task<IActionResult> GetBirthdayVoucher(CancellationToken cancellationToken)
    {
        try
        {
            int userId = GetCurrentUserId();
            var voucher = await _voucherService.GetBirthdayVoucherAsync(userId, cancellationToken);
            // Trả về null data (không phải sinh nhật) hoặc voucher object
            return Ok(new { success = true, data = voucher });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpGet("my-notifications")]
    public async Task<IActionResult> GetMyNotifications()
    {
        try
        {
            int userId = GetCurrentUserId();
            var notifications = await _context.Notifications
                .Where(n => n.UserId == userId)
                .OrderByDescending(n => n.CreatedAt)
                .Take(20)
                .Select(n => new {
                    n.Id,
                    n.Title,
                    n.Content,
                    n.Type,
                    n.IsRead,
                    n.CreatedAt
                })
                .ToListAsync();

            return Ok(new { success = true, data = notifications });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPut("my-notifications/read-all")]
    public async Task<IActionResult> MarkMyNotificationsAsRead()
    {
        try
        {
            int userId = GetCurrentUserId();
            var unreadNotis = await _context.Notifications
                .Where(n => n.UserId == userId && !n.IsRead)
                .ToListAsync();

            foreach (var noti in unreadNotis)
            {
                noti.IsRead = true;
            }

            await _context.SaveChangesAsync();
            return Ok(new { success = true, message = "Đã đánh dấu đọc toàn bộ" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPost("redeem-points")]
    public async Task<IActionResult> RedeemLoyaltyPoints([FromBody] int points)
    {
        try
        {
            int userId = GetCurrentUserId();
            var result = await _loyaltyPointService.RedeemPointsForVoucherAsync(userId, points, default);
            return StatusCode(result.StatusCode, result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPost("sync-points")]
    public async Task<IActionResult> SyncLoyaltyPoints()
    {
        try
        {
            var result = await _loyaltyPointService.SyncAllAwardablePointsAsync(default);
            return StatusCode(result.StatusCode, result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}