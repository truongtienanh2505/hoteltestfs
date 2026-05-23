using MediatR;

namespace HotelERP.BE.Events
{
    public class UserActivityEvent : INotification
    {
        public string FullName { get; }
        public string ActionType { get; } // Create, Update, Lock, Unlock, ChangeRole

        public UserActivityEvent(string fullName, string actionType)
        {
            FullName = fullName;
            ActionType = actionType;
        }
    }
}