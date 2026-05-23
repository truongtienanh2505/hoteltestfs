using HotelERP.BE.Application.DTOs.Auth;
using HotelERP.BE.Application.DTOs.UserProfile;

namespace HotelERP.BE.Application.Interfaces;

public interface IUserProfileService
{
    Task<UserProfileResponse> GetMyProfileAsync(int userId);
    Task<bool> UpdateProfileAsync(int userId, UpdateProfileRequest request);
    Task<bool> ChangePasswordAsync(int userId, ChangePasswordRequest request);
    Task<bool> UpdateAvatarAsync(int userId, string avatarUrl, string avatarPublicId);
}