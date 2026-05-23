using HotelERP.BE.DTOs.Notifications;

namespace HotelERP.BE.Services
{
    public interface INotificationService
    {
        Task SendToUserAsync(string userId, NotificationMessage message);
        Task SendToRoleAsync(string role, NotificationMessage message);
    }
}