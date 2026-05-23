using HotelERP.BE.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace HotelERP.BE.Controllers
{
    [ApiController]
    [Route("api/rooms")]
    public class RoomCheckInController : ControllerBase
    {
        private readonly IRoomService _roomService;

        public RoomCheckInController(IRoomService roomService)
        {
            _roomService = roomService;
        }

        [HttpGet("available-for-checkin")]
        public async Task<IActionResult> GetAvailableRooms([FromQuery] int roomTypeId)
        {
            var rooms = await _roomService.GetAvailableRoomsForCheckInAsync(roomTypeId);
            return Ok(new { success = true, data = rooms });
        }

        [HttpPut("{roomId}/status")]
        public async Task<IActionResult> UpdateStatus(int roomId, [FromQuery] string status, [FromQuery] string cleaningStatus)
        {
            var result = await _roomService.UpdateRoomStatusAsync(roomId, status, cleaningStatus);
            if (!result) return NotFound(new { success = false, message = "Không tìm thấy phòng" });

            return Ok(new { success = true, message = "Cập nhật thành công và đã bắn SignalR!" });
        }
    }
}