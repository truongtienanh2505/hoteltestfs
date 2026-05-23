using HotelERP.BE.DTOs.Vouchers;
using HotelERP.BE.Services.Bookings;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using HotelERP.BE.Constants;
using Microsoft.AspNetCore.Authorization;

namespace HotelERP.BE.Controllers
{
    [ApiController]
    [Route("api/bookings")]
    [Authorize(Policy = PermissionKeys.ManageBookings)]
    public class BookingVoucherController : ControllerBase
    {
        private readonly IBookingVoucherService _voucherService;

        public BookingVoucherController(IBookingVoucherService voucherService)
        {
            _voucherService = voucherService;
        }

        [HttpPost("{bookingId}/apply-voucher")]
        public async Task<IActionResult> ApplyVoucher(int bookingId, [FromBody] ApplyVoucherRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.VoucherCode))
            {
                return BadRequest(new { success = false, errorCode = "INVALID_VOUCHER_CODE" });
            }

            var (isSuccess, errorCode, data) = await _voucherService.ApplyVoucherAsync(bookingId, request.VoucherCode);

            if (!isSuccess)
            {
                return BadRequest(new { success = false, errorCode = errorCode });
            }

            return Ok(new { success = true, data = data });
        }

        [HttpPost("{bookingId}/remove-voucher")]
        public async Task<IActionResult> RemoveVoucher(int bookingId)
        {
            var (isSuccess, errorCode, data) = await _voucherService.RemoveVoucherAsync(bookingId);

            if (!isSuccess)
            {
                return BadRequest(new { success = false, errorCode = errorCode });
            }

            return Ok(new { success = true, data = data });
        }
    }
}