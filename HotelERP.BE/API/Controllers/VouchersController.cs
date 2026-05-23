using HotelERP.BE.DTOs.Vouchers;
using HotelERP.BE.Services.Vouchers;
using Microsoft.AspNetCore.Mvc;

namespace HotelERP.BE.Controllers.Admin;

[ApiController]
[Route("api/admin/vouchers")]
public class VouchersController : ControllerBase
{
    private readonly IVoucherService _voucherService;

    public VouchersController(IVoucherService voucherService)
    {
        _voucherService = voucherService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? status,
        [FromQuery] string? search,
        CancellationToken cancellationToken)
    {
        var result = await _voucherService.GetAllAsync(status, search, cancellationToken);
        return StatusCode(result.StatusCode, result);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id, CancellationToken cancellationToken)
    {
        var result = await _voucherService.GetByIdAsync(id, cancellationToken);
        return StatusCode(result.StatusCode, result);
    }

    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateVoucherRequestDto request,
        [FromHeader(Name = "X-User-Id")] int? userId,
        CancellationToken cancellationToken)
    {
        var result = await _voucherService.CreateAsync(request, userId, cancellationToken);
        return StatusCode(result.StatusCode, result);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(
        int id,
        [FromBody] UpdateVoucherRequestDto request,
        [FromHeader(Name = "X-User-Id")] int? userId,
        CancellationToken cancellationToken)
    {
        var result = await _voucherService.UpdateAsync(id, request, userId, cancellationToken);
        return StatusCode(result.StatusCode, result);
    }

    [HttpPatch("{id:int}/disable")]
    public async Task<IActionResult> Disable(
        int id,
        [FromBody] DisableVoucherRequestDto request,
        [FromHeader(Name = "X-User-Id")] int? userId,
        CancellationToken cancellationToken)
    {
        var result = await _voucherService.DisableAsync(id, request, userId, cancellationToken);
        return StatusCode(result.StatusCode, result);
    }
}