using MediatR;
using HotelERP.BE.Models; 
namespace HotelERP.BE.Events
{
    // Kế thừa INotification của MediatR (Lưu ý: Không phải cái INotificationService của mình nhé)
    public class UserCreatedEvent : INotification
    {
        public string FullName { get; }
        public string Email { get; }
        
        public UserCreatedEvent(string fullName, string email)
        {
            FullName = fullName;
            Email = email;
        }
    }
}