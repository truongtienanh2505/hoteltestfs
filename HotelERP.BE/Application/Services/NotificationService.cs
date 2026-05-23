using Microsoft.AspNetCore.SignalR;
using HotelERP.BE.Hubs;
using HotelERP.BE.DTOs.Notifications;

namespace HotelERP.BE.Services
{
    public class NotificationService : INotificationService
    {
        private readonly IHubContext<NotificationHub> _hubContext;

        public NotificationService(IHubContext<NotificationHub> hubContext)
        {
            _hubContext = hubContext;
        }

        public async Task SendToRoleAsync(string role, NotificationMessage message)
        {
            // Gửi đến tất cả người dùng trong nhóm Role (VD: Admin)
            await _hubContext.Clients.Group(role).SendAsync("ReceiveNotification", message);
        }

        public async Task SendToUserAsync(string userId, NotificationMessage message)
        {
            // Gửi đích danh cho 1 User ID
            await _hubContext.Clients.User(userId).SendAsync("ReceiveNotification", message);
        }
    }
}