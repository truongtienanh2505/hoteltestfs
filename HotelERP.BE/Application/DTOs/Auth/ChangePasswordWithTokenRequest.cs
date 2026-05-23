namespace HotelERP.BE.Application.DTOs.Auth;

public class ChangePasswordWithTokenRequest
{
    public string ResetToken { get; set; } = null!; // Token gửi trong email
    public string NewPassword { get; set; } = null!;
}