namespace HotelERP.BE.Application.DTOs.Auth;

public class AdminResetPasswordRequest
{
    public int TargetUserId { get; set; } // ID của nhân viên hoặc user cần đổi
}