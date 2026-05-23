namespace HotelERP.BE.Application.DTOs.Auth;

public class ForgotPasswordRequest
{
    public string Email { get; set; } = null!;
}

public class ResetPasswordOtpRequest
{
    public string Email { get; set; } = null!;
    public string OtpCode { get; set; } = null!;
    public string NewPassword { get; set; } = null!;
}