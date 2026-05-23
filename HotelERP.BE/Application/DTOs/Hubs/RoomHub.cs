using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;

namespace HotelERP.BE.DTOs.Hubs
{
    public class RoomHub : Hub
    {
        // Có thể để trống, vì Server chủ động bắn data xuống Client qua IHubContext
    }
}