using MediatR;
using HotelERP.BE.Events;
using HotelERP.BE.Services;
using HotelERP.BE.DTOs.Notifications;
using HotelERP.BE.Models.Enums;
using HotelERP.BE.Infrastructure.Data; // Nhớ import DB Context của bạn
using HotelERP.BE.Models; // Import thư mục chứa class Notification

namespace HotelERP.BE.Handlers
{
    public class UserActivityEventHandler : INotificationHandler<UserActivityEvent>
    {
        private readonly INotificationService _notificationService;
        private readonly HotelDbContext _context; // THÊM Context DB

        // Tiêm cả 2 thằng vào đây
        public UserActivityEventHandler(INotificationService notificationService, HotelDbContext context)
        {
            _notificationService = notificationService;
            _context = context;
        }

        public async Task Handle(UserActivityEvent notification, CancellationToken cancellationToken)
        {
            var message = new NotificationMessage();

            // 1. Tùy biến thông báo dựa trên ActionType
            switch (notification.ActionType)
            {
                case "Create":
                    message.Title = "Hệ thống nhân sự";
                    message.Content = $"Tài khoản {notification.FullName} vừa được khởi tạo.";
                    message.Type = "Success";
                    message.Action = NotificationAction.CreateAccount;
                    break;
                case "Update":
                    message.Title = "Cập nhật nhân sự";
                    message.Content = $"Tài khoản {notification.FullName} đã được cập nhật.";
                    message.Type = "Info";
                    message.Action = NotificationAction.UpdateAccount;
                    break;
                case "Lock":
                    message.Title = "Cảnh báo tài khoản";
                    message.Content = $"Tài khoản {notification.FullName} đã bị vô hiệu hóa.";
                    message.Type = "Warning";
                    message.Action = NotificationAction.LockAccount;
                    break;
                case "Unlock":
                    message.Title = "Khôi phục tài khoản";
                    message.Content = $"Tài khoản {notification.FullName} đã hoạt động trở lại.";
                    message.Type = "Success";
                    message.Action = NotificationAction.UnlockAccount;
                    break;
                case "ChangeRole":
                    message.Title = "Thay đổi phân quyền";
                    message.Content = $"Vai trò của {notification.FullName} vừa được cập nhật.";
                    message.Type = "Info";
                    message.Action = NotificationAction.ChangeRole;
                    break;
            }

            // 2. LƯU VÀO DATABASE (Lịch sử)
            var dbNotification = new Notification 
            {
                Title = message.Title,
                Content = message.Content,
                Type = message.Type, // Info, Success, Warning...
                IsRead = false,
                CreatedAt = DateTime.UtcNow,
                UserId = null // Cố tình để null vì đây là thông báo chung cho toàn hệ thống (Admin)
            };

            _context.Notifications.Add(dbNotification);
            await _context.SaveChangesAsync(cancellationToken);

            // 3. GỬI SIGNALR (Báo chuông Real-time)
            await _notificationService.SendToRoleAsync("Admin", message);
        }
    }
}