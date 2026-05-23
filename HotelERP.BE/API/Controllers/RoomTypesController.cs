using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HotelERP.BE.Application.Interfaces;
using HotelERP.BE.Application.DTOs;
using HotelERP.BE.DTOs.RoomTypes;
using HotelERP.BE.Services.RoomTypes;

namespace HotelERP.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RoomTypesController : ControllerBase
{
    private readonly IRoomTypeService _roomTypeService;
    private readonly IRoomTypeQueryService? _roomTypeQueryService;
    public RoomTypesController(IRoomTypeService roomTypeService, IRoomTypeQueryService roomTypeQueryService)
    {
        _roomTypeService = roomTypeService;
        _roomTypeQueryService = roomTypeQueryService;
    }

    [HttpGet]
    
    public async Task<IActionResult> GetRoomTypes()
    {
        var data = await _roomTypeService.GetRoomTypesAsync();
        return Ok(new { success = true, data });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetRoomTypeById(int id)
    {
        var data = await _roomTypeService.GetRoomTypeByIdAsync(id);
        if (data == null) return NotFound("Không tìm thấy hạng phòng");
        return Ok(new { success = true, data });
    }

    [HttpPost]
    [Authorize(Roles = "Manager,Admin")]
    [Consumes("multipart/form-data")] 
    public async Task<IActionResult> CreateRoomType([FromForm] CreateRoomTypeRequest request)
    {
        try
        {
            var id = await _roomTypeService.CreateRoomTypeAsync(request);
            return Ok(new { success = true, message = "Tạo hạng phòng thành công.", roomTypeId = id });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Manager,Admin")]
    [Consumes("multipart/form-data")] 
    public async Task<IActionResult> UpdateRoomType(int id, [FromForm] UpdateRoomTypeRequest request)
    {
        try
        {
            var result = await _roomTypeService.UpdateRoomTypeAsync(id, request);
            if (!result) return NotFound(new { success = false, message = "Không tìm thấy hạng phòng" });
            return Ok(new { success = true, message = "Cập nhật hạng phòng thành công." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Manager,Admin")]
    public async Task<IActionResult> DeleteRoomType(int id)
    {
        var result = await _roomTypeService.DeleteRoomTypeAsync(id);
        if (!result) return NotFound();
        return Ok(new { success = true, message = "Đã xóa hạng phòng." });
    }
    
    [HttpGet("search-by-occupancy")]
    public async Task<IActionResult> SearchByOccupancy(
        [FromQuery] SearchRoomTypesByOccupancyRequestDto request,
        CancellationToken cancellationToken)
    {
        var result = await _roomTypeQueryService!.SearchByOccupancyAsync(request, cancellationToken);
        return StatusCode(result.StatusCode, result);
    }

    [HttpPost("price-preview")]
    public async Task<IActionResult> PreviewPrice(
        [FromBody] RoomPricePreviewRequestDto request,
        CancellationToken cancellationToken)
    {
        var result = await _roomTypeQueryService!.PreviewPriceAsync(request, cancellationToken);
        return StatusCode(result.StatusCode, result);
    }
}