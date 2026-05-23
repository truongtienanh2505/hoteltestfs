using System.Security.Claims;
using HotelERP.BE.Application.Interfaces;
using HotelERP.BE.DTOs.Payments;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using HotelERP.BE.DTOs.Configurations;

namespace HotelERP.BE.API.Controllers;

[ApiController]
[Route("api/payments/momo")]
public class MomoPaymentsController : ControllerBase
{
    private readonly IMomoPaymentService _momoPaymentService;
    private readonly MomoOptions _momoOptions;

    public MomoPaymentsController(
        IMomoPaymentService momoPaymentService,
        IOptions<MomoOptions> momoOptions)
    {
        _momoPaymentService = momoPaymentService;
        _momoOptions = momoOptions.Value;
    }

    [HttpPost("invoices/{invoiceId:int}")]
    [Authorize(Roles = "Admin,Manager,Receptionist")]
    public async Task<IActionResult> CreateInvoicePayment(
        int invoiceId,
        [FromBody] CreateMomoInvoicePaymentRequestDto request,
        CancellationToken cancellationToken)
    {
        var result = await _momoPaymentService.CreateInvoicePaymentAsync(invoiceId, request, cancellationToken);
        return StatusCode(result.StatusCode, result);
    }

    [HttpPost("bookings/{bookingId:int}/deposit")]
    [Authorize(Roles = "Admin,Manager,Receptionist")]
    public async Task<IActionResult> CreateDepositPayment(
        int bookingId,
        [FromBody] CreateMomoBookingDepositPaymentRequestDto request,
        CancellationToken cancellationToken)
    {
        var result = await _momoPaymentService.CreateBookingDepositPaymentAsync(bookingId, request, cancellationToken);
        return StatusCode(result.StatusCode, result);
    }

    [HttpGet("payments/{paymentId:int}")]
    [Authorize(Roles = "Admin,Manager,Receptionist")]
    public async Task<IActionResult> GetPaymentStatus(int paymentId, CancellationToken cancellationToken)
    {
        var result = await _momoPaymentService.GetPaymentStatusAsync(paymentId, cancellationToken);
        return StatusCode(result.StatusCode, result);
    }

    [HttpPost("ipn")]
    [AllowAnonymous]
    public async Task<IActionResult> Ipn([FromBody] MomoIpnRequestDto request, CancellationToken cancellationToken)
    {
        var result = await _momoPaymentService.HandleIpnAsync(request, cancellationToken);
        if (result.Success)
        {
            return NoContent();
        }

        return StatusCode(result.StatusCode, result);
    }

    [HttpGet("return")]
    [AllowAnonymous]
    public async Task<IActionResult> Return([FromQuery] MomoIpnRequestDto request, CancellationToken cancellationToken)
    {
        // MoMo redirect về đây sau khi app báo thành công.
        // Trước đây code chỉ validate rồi redirect, không update DB.
        // Bây giờ xử lý giống IPN để nếu IPN bị miss thì return vẫn update được invoice/payment.
        var result = await _momoPaymentService.HandleIpnAsync(request, cancellationToken);

        if (!result.Success)
        {
            return StatusCode(result.StatusCode, result);
        }

        var targetUrl = ResolveClientReturnUrl(request.OrderId, request.ResultCode, request.Message, request.TransId);
        if (!string.IsNullOrWhiteSpace(targetUrl))
        {
            return Redirect(targetUrl);
        }

        return Ok(result);
    }

    private string? ResolveClientReturnUrl(string orderId, int resultCode, string message, long transId)
    {
        var baseUrl = orderId.StartsWith("DEP.", StringComparison.OrdinalIgnoreCase)
            ? _momoOptions.ClientDepositResultUrl
            : _momoOptions.ClientInvoiceResultUrl;

        if (string.IsNullOrWhiteSpace(baseUrl))
        {
            return null;
        }

        var separator = baseUrl.Contains('?') ? '&' : '?';
        return $"{baseUrl}{separator}orderId={Uri.EscapeDataString(orderId)}&resultCode={resultCode}&message={Uri.EscapeDataString(message ?? string.Empty)}&transId={transId}";
    }
}
