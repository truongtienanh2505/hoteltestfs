using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace HotelERP.BE.Hubs
{
    [Authorize]
    public class NotificationHub : Microsoft.AspNetCore.SignalR.Hub
    {
        public override async Task OnConnectedAsync()
        {
            // Lấy Role từ Claim của User
            var role = Context.User?.FindFirst(ClaimTypes.Role)?.Value;
            if (!string.IsNullOrEmpty(role))
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, role);
            }
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var role = Context.User?.FindFirst(ClaimTypes.Role)?.Value;
            if (!string.IsNullOrEmpty(role))
            {
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, role);
            }
            await base.OnDisconnectedAsync(exception);
        }
    }
}