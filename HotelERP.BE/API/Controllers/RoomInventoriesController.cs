using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HotelERP.BE.Application.Interfaces;
using HotelERP.BE.Application.DTOs;
using HotelERP.BE.Constants;

namespace HotelERP.API.Controllers;

[ApiController]
[Route("api/rooms/{roomId:int}/inventories")]
[Authorize(Policy = PermissionKeys.ManageInventory)]
public class RoomInventoriesController(IRoomInventoryService inventoryService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetInventories(int roomId)
    {
        var items = await inventoryService.GetInventoriesByRoomIdAsync(roomId);
        return Ok(new { success = true, data = items });
    }

    [HttpPost]
    public async Task<IActionResult> AddInventory(int roomId, [FromBody] AddInventoryRequest request)
    {
        try
        {
            var id = await inventoryService.AddInventoryAsync(roomId, request);
            return Ok(new { success = true, message = "Thêm vật tư thành công.", inventoryId = id });
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

    [HttpPut("{inventoryId:int}")]
    public async Task<IActionResult> UpdateInventory(int roomId, int inventoryId, [FromBody] UpdateInventoryRequest request)
    {
        try
        {
            var updated = await inventoryService.UpdateInventoryAsync(roomId, inventoryId, request);
            if (!updated)
                return NotFound(new { success = false, message = "Không tìm thấy vật tư." });

            return Ok(new { success = true, message = "Cập nhật vật tư thành công." });
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

    [HttpDelete("{inventoryId:int}")]
    public async Task<IActionResult> DeleteInventory(int roomId, int inventoryId)
    {
        try
        {
            var result = await inventoryService.DeleteInventoryAsync(roomId, inventoryId);
            if (!result)
                return NotFound(new { success = false, message = "Không tìm thấy vật tư." });

            return Ok(new { success = true, message = "Đã xóa vật tư khỏi phòng." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }
}