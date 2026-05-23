using MediatR;
using HotelERP.BE.Events;
using HotelERP.BE.Services;
using HotelERP.BE.DTOs.Notifications;
using HotelERP.BE.Models.Enums;

namespace HotelERP.BE.Handlers
{
    // Lắng nghe sự kiện UserCreatedEvent
    public class UserCreatedEventHandler : INotificationHandler<UserCreatedEvent>
    {
        private readonly INotificationService _notificationService;

        // Tiêm SignalR Service vào đây, thay vì tiêm vào UserManagementService
        public UserCreatedEventHandler(INotificationService notificationService)
        {
            _notificationService = notificationService;
        }

        public async Task Handle(UserCreatedEvent notification, CancellationToken cancellationToken)
        {
            // Tự động gửi thông báo khi nghe thấy sự kiện
            await _notificationService.SendToRoleAsync("Admin", new NotificationMessage 
            {
                Title = "Hệ thống nhân sự",
                Content = $"Tài khoản {notification.FullName} ({notification.Email}) vừa được khởi tạo.",
                Type = "Success",
                Action = NotificationAction.CreateAccount
            });
        }
    }
}