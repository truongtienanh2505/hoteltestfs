using HotelERP.BE.Application.DTOs.Auth;
using HotelERP.BE.Application.DTOs.UserProfile;
using HotelERP.BE.Application.Interfaces;
using HotelERP.BE.Domain.Models;
using HotelERP.BE.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using HotelERP.BE.Models;

namespace HotelERP.BE.Application.Services;

public class UserProfileService : IUserProfileService
{
    private readonly HotelDbContext _context;

    public UserProfileService(HotelDbContext context)
    {
        _context = context;
    }

    public async Task<UserProfileResponse> GetMyProfileAsync(int userId)
    {
        var user = await _context.Users
            .Include(u => u.Role)
            .Include(u => u.Membership)
            .FirstOrDefaultAsync(u => u.Id == userId && u.Status == true);

        if (user == null) throw new Exception("Không tìm thấy thông tin người dùng.");

        // Kiểm tra và tặng quà sinh nhật nếu đúng ngày
        await CheckAndIssueBirthdayVoucherAsync(user);

        return new UserProfileResponse
        {
            Id = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            Phone = user.Phone,
            AvatarUrl = user.AvatarUrl,
            Address = user.Address,
            DateOfBirth = user.DateOfBirth,
            LoyaltyPoints = user.LoyaltyPoints,
            RoleName = user.Role?.Name,
            MembershipTier = user.Membership?.TierName,
            MembershipDiscount = user.Membership?.DiscountPercent ?? 0
        };
    }

    public async Task<bool> UpdateProfileAsync(int userId, UpdateProfileRequest request)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId && u.Status == true);
        if (user == null) throw new Exception("Không tìm thấy thông tin người dùng.");

        // Quy tắc: Nếu ngày sinh đã có, không cho phép đổi
        if (user.DateOfBirth.HasValue && request.DateOfBirth.HasValue && user.DateOfBirth.Value.Date != request.DateOfBirth.Value.Date)
        {
            throw new Exception("Ngày sinh đã được thiết lập và không thể thay đổi.");
        }

        // Chỉ cho phép cập nhật tên, số điện thoại, địa chỉ và ngày sinh (nếu chưa có)
        user.FullName = request.FullName;
        user.Phone = request.Phone;
        user.Address = request.Address;
        
        if (!user.DateOfBirth.HasValue && request.DateOfBirth.HasValue)
        {
            user.DateOfBirth = request.DateOfBirth;
        }

        user.UpdatedAt = DateTime.UtcNow;

        _context.Users.Update(user);
        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<bool> ChangePasswordAsync(int userId, ChangePasswordRequest request)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId && u.Status == true);
        if (user == null) throw new Exception("Không tìm thấy thông tin người dùng.");

        // Kiểm tra mật khẩu cũ xem có đúng không
        bool isOldPasswordValid = BCrypt.Net.BCrypt.Verify(request.OldPassword, user.PasswordHash);
        if (!isOldPasswordValid)
            throw new Exception("Mật khẩu hiện tại không chính xác.");

        if (request.OldPassword == request.NewPassword)
            throw new Exception("Mật khẩu mới không được trùng với mật khẩu cũ.");

        // Hash mật khẩu mới và lưu lại
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        user.UpdatedAt = DateTime.UtcNow;

        _context.Users.Update(user);
        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<bool> UpdateAvatarAsync(int userId, string avatarUrl, string avatarPublicId)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId && u.Status == true);
        if (user == null) throw new Exception("Không tìm thấy người dùng.");

        user.AvatarUrl = avatarUrl;
        user.AvatarPublicId = avatarPublicId;
        user.UpdatedAt = DateTime.UtcNow;

        _context.Users.Update(user);
        await _context.SaveChangesAsync();
        return true;
    }

    private async Task CheckAndIssueBirthdayVoucherAsync(User user)
    {
        if (!user.DateOfBirth.HasValue) return;

        var today = DateTime.UtcNow.AddHours(7); // Giả định múi giờ VN
        var birthday = user.DateOfBirth.Value;

        // Kiểm tra xem có đúng ngày sinh nhật không
        if (birthday.Month == today.Month && birthday.Day == today.Day)
        {
            // Kiểm tra xem năm nay đã nhận chưa
            if (!user.LastBirthdayCouponYear.HasValue || user.LastBirthdayCouponYear.Value < today.Year)
            {
                // TẠO VOUCHER SINH NHẬT
                string voucherCode = $"BDAY-{user.Id}-{today.Year}";
                
                // Kiểm tra xem mã này đã tồn tại chưa
                var exists = await _context.Vouchers.AnyAsync(v => v.Code == voucherCode);
                if (!exists)
                {
                    var birthdayVoucher = new Voucher
                    {
                        Code = voucherCode,
                        UserId = user.Id,
                        DiscountType = "FIXED_AMOUNT",
                        DiscountValue = 500000, 
                        MinBookingValue = 2000000, 
                        ValidFrom = today,
                        ValidTo = today.AddDays(30), 
                        UsageLimit = 1
                    };

                    await _context.Vouchers.AddAsync(birthdayVoucher);

                    var notification = new Notification
                    {
                        UserId = user.Id,
                        Title = "🎉 Chúc mừng sinh nhật quý khách!",
                        Content = $"Asteria Resort xin gửi tặng bạn món quà đặc biệt: Voucher {voucherCode} giảm giá 500.000đ cho đơn hàng từ 2.000.000đ. Chúc bạn có một ngày sinh nhật thật tuyệt vời!",
                        Type = "PROMOTION",
                        IsRead = false,
                        CreatedAt = today
                    };

                    await _context.Notifications.AddAsync(notification);

                    user.LastBirthdayCouponYear = today.Year;
                    _context.Users.Update(user);

                    await _context.SaveChangesAsync();
                }
            }
        }
    }
}