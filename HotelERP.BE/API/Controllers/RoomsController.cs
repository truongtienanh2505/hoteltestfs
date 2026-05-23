using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HotelERP.BE.Application.Interfaces;
using HotelERP.BE.Application.DTOs;

namespace HotelERP.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RoomsController(IRoomService roomService) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = "Manager,Receptionist,Housekeeping,Admin")]
    public async Task<IActionResult> GetRooms([FromQuery] RoomFilterRequest filter)
    {
        var rooms = await roomService.GetRoomsAsync(filter);
        return Ok(new { success = true, data = rooms });
    }

    [HttpGet("{id}")]
    [Authorize(Roles = "Manager,Receptionist,Housekeeping,Admin")]
    public async Task<IActionResult> GetRoom(int id)
    {
        var room = await roomService.GetRoomByIdAsync(id);
        if (room == null) return NotFound(new { success = false, message = "Không tìm thấy phòng." });
        return Ok(new { success = true, data = room });
    }

    [HttpPost]
    [Authorize(Roles = "Manager,Admin")]
    public async Task<IActionResult> CreateRoom([FromBody] CreateRoomRequest request)
    {
        var roomId = await roomService.CreateRoomAsync(request);
        return CreatedAtAction(nameof(GetRoom), new { id = roomId }, new { success = true, message = "Tạo phòng thành công.", roomId });
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Manager,Admin")]
    public async Task<IActionResult> UpdateRoom(int id, [FromBody] UpdateRoomRequest request)
    {
        var result = await roomService.UpdateRoomAsync(id, request);
        if (!result) return NotFound();
        return Ok(new { success = true, message = "Cập nhật phòng thành công." });
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Manager,Admin")]
    public async Task<IActionResult> DeleteRoom(int id)
    {
        var result = await roomService.DeleteRoomAsync(id);
        if (!result) return NotFound();
        return Ok(new { success = true, message = "Xóa phòng thành công (Soft Delete)." });
    }

    [HttpPatch("{id}/cleaning-status")]
    [Authorize(Roles = "Manager,Housekeeping,Admin")]
    public async Task<IActionResult> UpdateCleaningStatus(int id, [FromBody] UpdateCleaningStatusRequest request)
    {
        var valid = new[] { "CLEAN", "DIRTY", "INSPECTING" };
        if (!valid.Contains(request.NewCleaningStatus.ToUpper())) return BadRequest("Trạng thái dọn dẹp không hợp lệ.");

        var result = await roomService.UpdateCleaningStatusAsync(id, request);
        if (!result) return NotFound();
        return Ok(new { success = true, message = "Đã cập nhật trạng thái buồng phòng." });
    }

    [HttpPatch("{id}/status")]
    [Authorize(Roles = "Manager,Receptionist,Admin")]
    public async Task<IActionResult> UpdateRoomStatus(int id, [FromBody] UpdateRoomStatusRequest request)
    {
        var valid = new[] { "AVAILABLE", "OCCUPIED", "MAINTENANCE", "OUT_OF_ORDER" };
        if (!valid.Contains(request.NewStatus.ToUpper())) return BadRequest(new { success = false, message = "Trạng thái phòng không hợp lệ." });

        try
        {
            var result = await roomService.UpdateRoomStatusAsync(id, request);
            if (!result) return NotFound(new { success = false, message = "Không tìm thấy phòng." });
            return Ok(new { success = true, message = "Đã cập nhật trạng thái kinh doanh của phòng." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPost("loss-damages")]
    [Authorize(Roles = "Manager,Housekeeping,Receptionist,Admin")]
    [Consumes("multipart/form-data")] 
    public async Task<IActionResult> ReportDamage([FromForm] ReportDamageRequest request)
    {
        try 
        {
            var userIdClaim = User.FindFirst("UserId")?.Value ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            int userId = int.TryParse(userIdClaim, out int id) ? id : 0;
            var roleName = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value ?? "User";

            var result = await roomService.ReportDamageAsync(userId, roleName, request);
            if (!result) return BadRequest("Có lỗi xảy ra khi lưu trữ báo cáo.");

            return Ok(new { success = true, message = "Đã ghi nhận báo cáo hư hỏng kèm hình ảnh." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    [HttpGet("{id}/loss-damages")]
    [Authorize(Roles = "Manager")]
    public async Task<IActionResult> GetRoomDamages(int id)
    {
        var damages = await roomService.GetRoomDamagesAsync(id);
        return Ok(new { success = true, data = damages });
    }
}