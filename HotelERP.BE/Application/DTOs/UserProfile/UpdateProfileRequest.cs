namespace HotelERP.BE.Application.DTOs.UserProfile;

public class UpdateProfileRequest
{
    public string FullName { get; set; } = null!;
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public DateTime? DateOfBirth { get; set; }
}