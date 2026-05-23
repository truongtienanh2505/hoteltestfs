using HotelERP.BE.Application.DTOs;
using HotelERP.BE.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HotelERP.BE.API.Controllers;

[ApiController]
[Route("api/room-types/{roomTypeId:int}/amenities")]
public class RoomTypeAmenitiesController(IRoomTypeAmenityService roomTypeAmenityService) : ControllerBase
{
    [HttpPut]
    [Authorize(Roles = "Manager,Admin")]
    public async Task<IActionResult> UpdateAmenities(
        int roomTypeId,
        [FromBody] UpdateRoomTypeAmenitiesRequest request)
    {
        var success = await roomTypeAmenityService.UpdateAmenitiesForRoomTypeAsync(
            roomTypeId,
            request.AmenityIds ?? new List<int>());

        if (!success)
        {
            return NotFound(new
            {
                success = false,
                message = "Không tìm thấy loại phòng để cập nhật tiện ích."
            });
        }

        return Ok(new
        {
            success = true,
            message = "Cập nhật tiện ích cho loại phòng thành công."
        });
    }
}