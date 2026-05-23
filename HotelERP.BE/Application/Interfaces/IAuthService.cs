using HotelERP.BE.Application.DTOs.Auth;

namespace HotelERP.BE.Application.Interfaces;

public interface IAuthService
{
    Task<TokenResponse> LoginAsync(LoginRequest request);
    Task<TokenResponse> RefreshTokenAsync(RefreshTokenRequest request);
    
    // Dành cho Admin: Tạo token/link đổi mật khẩu gửi qua email
    Task<string> AdminGenerateResetPasswordLinkAsync(AdminResetPasswordRequest request);
    
    // Dành cho User/Nhân viên: Đặt lại mật khẩu từ link email
    Task<bool> ResetPasswordWithTokenAsync(ChangePasswordWithTokenRequest request);
    Task<bool> RegisterAsync(RegisterRequest request);
    Task<UserProfileResponse> GetCurrentUserProfileAsync(int userId);

    Task<bool> ForgotPasswordAsync(ForgotPasswordRequest request);
    Task<bool> ResetPasswordWithOtpAsync(ResetPasswordOtpRequest request);
}

