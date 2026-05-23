using HotelERP.BE.Services.Loyalty;
using Microsoft.AspNetCore.Mvc;

namespace HotelERP.BE.Controllers.Internal;

[ApiController]
[Route("api/internal/loyalty")]
public class LoyaltyController : ControllerBase
{
    private readonly ILoyaltyPointService _loyaltyPointService;

    public LoyaltyController(ILoyaltyPointService loyaltyPointService)
    {
        _loyaltyPointService = loyaltyPointService;
    }

    [HttpPost("bookings/{bookingId:int}/paid")]
    public async Task<IActionResult> AddPointsAfterBookingPaid(
        int bookingId,
        CancellationToken cancellationToken)
    {
        var result = await _loyaltyPointService.AddPointsAfterBookingPaidAsync(bookingId, cancellationToken);
        return StatusCode(result.StatusCode, result);
    }
}