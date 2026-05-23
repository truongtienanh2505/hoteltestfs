using HotelERP.BE.DTOs.Common;
using HotelERP.BE.DTOs.Loyalty;

namespace HotelERP.BE.Services.Loyalty;

public interface ILoyaltyPointService
{
    Task<ApiResult<LoyaltyPointAwardResultDto>> AddPointsAfterBookingPaidAsync(
        int bookingId,
        CancellationToken cancellationToken = default);

    Task<ApiResult<object>> RedeemPointsForVoucherAsync(
        int userId,
        int pointsToRedeem,
        CancellationToken cancellationToken = default);

    Task<ApiResult<int>> SyncAllAwardablePointsAsync(CancellationToken cancellationToken = default);
}