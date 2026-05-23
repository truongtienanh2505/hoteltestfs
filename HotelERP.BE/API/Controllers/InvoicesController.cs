using System.Security.Claims;
using HotelERP.BE.DTOs.Invoices;
using HotelERP.BE.Application.Interfaces;
using HotelERP.BE.Infrastructure.Data;
using HotelERP.BE.Domain.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HotelERP.BE.API.Controllers
{
    [ApiController]
    [Route("api/invoices")]
    [Authorize(Roles = "Admin,Manager,Receptionist")]
    public class InvoicesController : ControllerBase
    {
        private readonly IInvoiceService _invoiceService;
        private readonly HotelDbContext _context;

        public InvoicesController(IInvoiceService invoiceService, HotelDbContext context)
        {
            _invoiceService = invoiceService;
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? searchTerm,
            [FromQuery] DateTime? fromDate,
            [FromQuery] DateTime? toDate,
            [FromQuery] string? status,
            [FromQuery] int? bookingId,
            CancellationToken cancellationToken)
        {
            try
            {
                var result = await _invoiceService.GetAllInvoicesAsync(searchTerm, fromDate, toDate, status, bookingId, cancellationToken);
                return Ok(result);
            }
            catch (Exception ex)
            {
                // Log chi tiết lỗi để debug
                Console.Error.WriteLine($"[InvoicesController.GetAll] EXCEPTION: {ex}");
                return StatusCode(500, new
                {
                    message = "Lỗi server khi lấy danh sách hóa đơn.",
                    error = ex.Message,
                    innerError = ex.InnerException?.Message,
                    stackTrace = ex.StackTrace
                });
            }
        }


        [HttpGet("{invoiceId:int}")]
        public async Task<IActionResult> GetInvoice(int invoiceId, CancellationToken cancellationToken)
        {
            var result = await _invoiceService.GetInvoiceAsync(invoiceId, cancellationToken);
            return StatusCode(result.StatusCode, result);
        }

        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary(CancellationToken cancellationToken)
        {
            var result = await _invoiceService.GetInvoiceSummaryAsync(cancellationToken);
            return Ok(result);
        }

        [HttpGet("draft/{bookingId:int}")]
        public async Task<IActionResult> GetDraftInvoice(int bookingId, CancellationToken cancellationToken)
        {
            try
            {
                var result = await _invoiceService.GetDraftInvoiceAsync(bookingId, cancellationToken);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("confirm")]
        public async Task<IActionResult> ConfirmPayment(
            [FromBody] CreateInvoiceDto dto,
            CancellationToken cancellationToken)
        {
            var success = await _invoiceService.ConfirmPaymentAsync(dto, cancellationToken);
            if (success)
            {
                return Ok(new { message = "Thanh toán thành công!" });
            }

            return BadRequest(new { message = "Thanh toán thất bại!" });
        }

        // ──────────────────────────────────────────────────────────────────────
        // Tạo hoá đơn nhanh cho khách vãng lai (walk-in service order)
        // Không cần BookingId → Invoice.BookingId = null (đã nullable trong DB)
        // ──────────────────────────────────────────────────────────────────────
        [HttpPost("walkin-service")]
        public async Task<IActionResult> CreateWalkInServiceInvoice(
            [FromBody] CreateWalkInServiceInvoiceRequest request,
            CancellationToken cancellationToken)
        {
            if (request.OrderId <= 0)
                return BadRequest(new { success = false, message = "OrderId không hợp lệ." });

            // Load order
            var order = await _context.OrderServices
                .Include(o => o.OrderServiceDetails)
                    .ThenInclude(d => d.Service)
                .FirstOrDefaultAsync(o => o.Id == request.OrderId, cancellationToken);

            if (order is null)
                return NotFound(new { success = false, message = "Không tìm thấy đơn dịch vụ." });

            if (order.BookingDetailId.HasValue)
                return BadRequest(new { success = false, message = "Đây không phải đơn vãng lai." });

            var now = DateTime.UtcNow;
            var invoiceCode = $"WLK-{now:yyyyMMddHHmm}-{order.Id}";

            // Tạo Invoice
            var invoice = new Invoice
            {
                BookingId            = null,   // Walk-in: không gắn booking
                InvoiceCode          = invoiceCode,
                TotalRoomAmount      = 0,
                TotalServiceAmount   = order.TotalAmount,
                TotalDamageAmount    = 0,
                DiscountAmount       = 0,
                ManualAdjustmentAmount = 0,
                TaxAmount            = 0,
                FinalTotal           = order.TotalAmount,
                RefundAmount         = 0,
                Status               = "Paid",
                Notes                = $"[WALK-IN] Đơn #{order.OrderCode}" +
                                       (string.IsNullOrWhiteSpace(request.GuestName) ? "" : $" – {request.GuestName}"),
                IssuedAt             = now,
                PaidAt               = now,
                CreatedAt            = now,
                UpdatedAt            = now,
            };
            _context.Invoices.Add(invoice);
            await _context.SaveChangesAsync(cancellationToken); // cần ID trước

            // Tạo Payment record
            var payment = new Payment
            {
                InvoiceId        = invoice.Id,
                PaymentMethod    = request.PaymentMethod ?? "CASH",
                AmountPaid       = order.TotalAmount,
                PaymentDirection = "IN",
                PaymentDate      = now,
                Status           = "Completed",
                TransactionCode  = request.TransactionCode,
                GatewayName      = "COUNTER",
                CreatedAt        = now,
            };
            _context.Payments.Add(payment);

            // Đánh dấu đơn đã thanh toán (tránh tạo invoice lần 2)
            order.Notes = string.IsNullOrWhiteSpace(order.Notes)
                ? $"[INVOICED] {invoiceCode}"
                : $"{order.Notes} | [INVOICED] {invoiceCode}";
            order.UpdatedAt = now;

            await _context.SaveChangesAsync(cancellationToken);

            return Ok(new
            {
                success     = true,
                message     = "Đã tạo hóa đơn thành công.",
                invoiceCode = invoiceCode,
                invoiceId   = invoice.Id,
                total       = order.TotalAmount,
            });
        }

        [HttpGet("bookings/{bookingId:int}/eligible-details")]
        public async Task<IActionResult> GetEligibleBookingDetails(
            int bookingId,
            CancellationToken cancellationToken)
        {
            var result = await _invoiceService.GetEligibleBookingDetailsAsync(bookingId, cancellationToken);
            return StatusCode(result.StatusCode, result);
        }

        [HttpPost("bookings/{bookingId:int}/voucher")]
public async Task<IActionResult> ApplyVoucherToBooking(
    int bookingId,
    [FromBody] ApplyInvoiceVoucherRequestDto request,
    CancellationToken cancellationToken)
{
    var userId = ResolveCurrentUserId();
    var result = await _invoiceService.ApplyVoucherToBookingAsync(bookingId, request, userId, cancellationToken);
    return StatusCode(result.StatusCode, result);
}

[HttpGet("bookings/{bookingId:int}/birthday-vouchers")]
public async Task<IActionResult> GetBirthdayVouchersForBooking(
    int bookingId,
    CancellationToken cancellationToken)
{
    var result = await _invoiceService.GetBirthdayVouchersForBookingAsync(bookingId, cancellationToken);
    return StatusCode(result.StatusCode, result);
}

[HttpPost("draft")]
        public async Task<IActionResult> CreateDraft(
            [FromBody] CreateDraftInvoiceRequestDto request,
            CancellationToken cancellationToken)
        {
            var userId = ResolveCurrentUserId();
            var role = ResolveCurrentUserRole();
            var result = await _invoiceService.CreateDraftAsync(request, userId, role, cancellationToken);
            return StatusCode(result.StatusCode, result);
        }

    [HttpPut("{invoiceId:int}/damage-charge")]
    public async Task<IActionResult> UpdateDamageCharge(
        int invoiceId,
        [FromBody] UpdateDamageChargeRequestDto request,
        CancellationToken cancellationToken)
    {
        var userId = ResolveCurrentUserId();
        var role = ResolveCurrentUserRole();
        var result = await _invoiceService.SetDamageChargeAsync(invoiceId, request, userId, role, cancellationToken);
        return StatusCode(result.StatusCode, result);
    }

        [HttpPost("{invoiceId:int}/finalize")]
        public async Task<IActionResult> FinalizeInvoice(
            int invoiceId,
            [FromBody] FinalizeInvoiceRequestDto request,
            CancellationToken cancellationToken)
        {
            var userId = ResolveCurrentUserId();
        var role = ResolveCurrentUserRole();
            var result = await _invoiceService.FinalizeAsync(invoiceId, request, userId, role, cancellationToken);
            return StatusCode(result.StatusCode, result);
        }

        [HttpPost("{invoiceId:int}/extra-fee")]
        public async Task<IActionResult> AddExtraFee(
            int invoiceId,
            [FromBody] AddExtraFeeRequestDto request,
            CancellationToken cancellationToken)
        {
            var userId = ResolveCurrentUserId();
            var role = ResolveCurrentUserRole();
            var result = await _invoiceService.AddExtraFeeAsync(invoiceId, request, userId, role, cancellationToken);
            return StatusCode(result.StatusCode, result);
        }

        private int? ResolveCurrentUserId()
        {
            var raw = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(raw, out var userId) ? userId : null;
        }

        private string? ResolveCurrentUserRole()
        {
            return User.FindFirstValue(ClaimTypes.Role);
        }
    }
}
