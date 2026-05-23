using Microsoft.AspNetCore.Mvc;
using HotelERP.BE.Application.Interfaces;
using HotelERP.BE.Application.DTOs;

namespace HotelERP.BE.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AmenitiesController(IAmenityService amenityService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        try
        {
            return Ok(await amenityService.GetAllAmenitiesAsync());
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        try
        {
            var result = await amenityService.GetAmenityByIdAsync(id);
            return result != null ? Ok(result) : NotFound();
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }

    [HttpPost]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Create([FromForm] CreateAmenityRequest request)
    {
        try
        {
            var id = await amenityService.CreateAmenityAsync(request);
            return CreatedAtAction(nameof(GetById), new { id }, id);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }

    [HttpPut("{id}")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Update(int id, [FromForm] UpdateAmenityRequest request)
    {
        try
        {
            var success = await amenityService.UpdateAmenityAsync(id, request);
            return success ? NoContent() : NotFound();
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            var success = await amenityService.DeleteAmenityAsync(id);
            return success ? NoContent() : NotFound();
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }
}