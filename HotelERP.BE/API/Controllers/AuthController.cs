using HotelERP.BE.Application.DTOs.Auth;
using HotelERP.BE.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HotelERP.BE.API.Controllers;

[Route("api/auth")]
[ApiController]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        try
        {
            var result = await _authService.LoginAsync(request);
            return Ok(new { success = true, data = result });
        }
        catch (Exception ex)
        {
            // Trả về 401 Unauthorized nếu sai tài khoản/mật khẩu
            return Unauthorized(new { success = false, message = ex.Message });
        }
    }

    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        try
        {
            await _authService.RegisterAsync(request);
            return Ok(new { success = true, message = "Đăng ký tài khoản thành công! Bạn đã có thể đăng nhập." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPost("refresh-token")]
    [AllowAnonymous]
    public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequest request)
    {
        try
        {
            var result = await _authService.RefreshTokenAsync(request);
            return Ok(new { success = true, data = result });
        }
        catch (Exception ex)
        {
            // Trả về 400 BadRequest nếu token sai, hết hạn hoặc bị thu hồi
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPost("admin/generate-reset-link")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AdminGenerateResetLink([FromBody] AdminResetPasswordRequest request)
    {
        try
        {
            var link = await _authService.AdminGenerateResetPasswordLinkAsync(request);
            
            // Trong thực tế, đoạn này sẽ gọi hàm SendEmail(user.Email, link)
            // Ở đây ta trả về luôn link để Frontend test hoặc Admin copy gửi tay
            return Ok(new { success = true, resetLink = link, message = "Đã tạo link khôi phục mật khẩu thành công." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPost("reset-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ResetPassword([FromBody] ChangePasswordWithTokenRequest request)
    {
        try
        {
            await _authService.ResetPasswordWithTokenAsync(request);
            return Ok(new { success = true, message = "Đổi mật khẩu thành công. Toàn bộ phiên đăng nhập cũ đã bị đăng xuất. Vui lòng đăng nhập lại." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPost("forgot-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        try
        {
            await _authService.ForgotPasswordAsync(request);
            return Ok(new { success = true, message = "Mã OTP đã được gửi đến email của bạn." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPost("reset-password-otp")]
    [AllowAnonymous]
    public async Task<IActionResult> ResetPasswordWithOtp([FromBody] ResetPasswordOtpRequest request)
    {
        try
        {
            await _authService.ResetPasswordWithOtpAsync(request);
            return Ok(new { success = true, message = "Đổi mật khẩu thành công. Vui lòng đăng nhập lại." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}