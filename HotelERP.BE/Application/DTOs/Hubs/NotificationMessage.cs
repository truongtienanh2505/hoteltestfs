using HotelERP.BE.Models.Enums;

namespace HotelERP.BE.DTOs.Notifications
{
    public class NotificationMessage
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string Type { get; set; } = "Info"; // Success, Error, Warning, Info
        public NotificationAction Action { get; set; }
        public string? ReferenceId { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}