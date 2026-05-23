namespace HotelERP.BE.Application.DTOs.Auth;

public class TokenResponse
{
    public string AccessToken { get; set; } = null!;
    public string RefreshToken { get; set; } = null!;
    public DateTime ExpiryDate { get; set; }
}