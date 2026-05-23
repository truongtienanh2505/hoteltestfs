using HotelERP.BE.DTOs.Configurations;
using HotelERP.BE.Domain.Models;
using HotelERP.BE.DTOs.Common;
using HotelERP.BE.DTOs.Loyalty;
using HotelERP.BE.Infrastructure.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace HotelERP.BE.Services.Loyalty;

public class LoyaltyPointService : ILoyaltyPointService
{
    private const string BookingPaidEarnAction = "BOOKING_PAID_EARN";
    private const string BookingPaidReason = "Cộng điểm sau khi booking thanh toán thành công";

    private const string PaidStatus = "PAID";
    private const string InvoicePaidStatus = "PAID";
    private const string MembershipActiveStatus = "ACTIVE";

    private const string AmountSourceFinalAmount = "FINAL_AMOUNT";
    private const string AmountSourceBookingSubtotal = "BOOKING_SUBTOTAL";

    private const string RoundingFloor = "FLOOR";
    private const string RoundingRound = "ROUND";
    private const string RoundingCeiling = "CEILING";

    private readonly HotelDbContext _dbContext;
    private readonly LoyaltyPointsOptions _options;

    public LoyaltyPointService(
        HotelDbContext dbContext,
        IOptions<LoyaltyPointsOptions> options)
    {
        _dbContext = dbContext;
        _options = options.Value ?? new LoyaltyPointsOptions();
    }

    public async Task<ApiResult<LoyaltyPointAwardResultDto>> AddPointsAfterBookingPaidAsync(
        int bookingId,
        CancellationToken cancellationToken = default)
    {
        await using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);

        try
        {
            var booking = await _dbContext.Bookings
                .Include(x => x.User)
                .Include(x => x.Invoices)
                .FirstOrDefaultAsync(x => x.Id == bookingId, cancellationToken);

            if (booking is null)
            {
                return ApiResult<LoyaltyPointAwardResultDto>.Fail(
                    StatusCodes.Status404NotFound,
                    "BOOKING_NOT_FOUND",
                    $"Không tìm thấy booking id = {bookingId}.");
            }

            if (!booking.UserId.HasValue || booking.User is null)
            {
                return ApiResult<LoyaltyPointAwardResultDto>.Fail(
                    StatusCodes.Status400BadRequest,
                    "BOOKING_USER_INVALID",
                    "Booking không có user hợp lệ để cộng điểm.");
            }

            if (!booking.User.Status)
            {
                return ApiResult<LoyaltyPointAwardResultDto>.Fail(
                    StatusCodes.Status400BadRequest,
                    "USER_INACTIVE",
                    "User đang bị khóa hoặc không hợp lệ.");
            }

            if (!IsBookingPaid(booking))
            {
                return ApiResult<LoyaltyPointAwardResultDto>.Fail(
                    StatusCodes.Status400BadRequest,
                    "BOOKING_NOT_PAID",
                    "Booking chưa ở trạng thái PAID nên chưa thể cộng điểm.",
                    new
                    {
                        bookingId = booking.Id,
                        bookingPaymentStatus = booking.PaymentStatus,
                        invoiceStatuses = booking.Invoices.Select(x => x.Status).ToList()
                    });
            }

            var existingHistory = await _dbContext.LoyaltyPointHistories
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    x => x.BookingId == booking.Id && x.ActionType == BookingPaidEarnAction,
                    cancellationToken);

            if (existingHistory is not null)
            {
                return ApiResult<LoyaltyPointAwardResultDto>.Fail(
                    StatusCodes.Status409Conflict,
                    "POINTS_ALREADY_AWARDED",
                    "Booking này đã được cộng điểm trước đó.",
                    new
                    {
                        bookingId = booking.Id,
                        loyaltyHistoryId = existingHistory.Id,
                        pointsAdded = existingHistory.PointsAdded,
                        processedAt = existingHistory.CreatedAt
                    });
            }

            var eligibleAmount = ResolveEligibleAmount(booking);
            var pointsAdded = CalculatePoints(eligibleAmount);

            var user = booking.User;
            var loyaltyPointsBefore = user.LoyaltyPoints;
            var membershipIdBefore = user.MembershipId;

            user.LoyaltyPoints += pointsAdded;
            user.UpdatedAt = DateTime.UtcNow;

            if (_options.AutoUpdateMembership)
            {
                var membershipId = await ResolveMembershipIdAsync(user.LoyaltyPoints, cancellationToken);
                user.MembershipId = membershipId;
            }

            var history = new LoyaltyPointHistory
            {
                BookingId = booking.Id,
                UserId = user.Id,
                ActionType = BookingPaidEarnAction,
                SourceAmount = eligibleAmount,
                PointsAdded = pointsAdded,
                BalanceBefore = loyaltyPointsBefore,
                BalanceAfter = user.LoyaltyPoints,
                Reason = BookingPaidReason,
                CreatedAt = DateTime.UtcNow
            };

            _dbContext.LoyaltyPointHistories.Add(history);

            await _dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            var result = new LoyaltyPointAwardResultDto
            {
                BookingId = booking.Id,
                UserId = user.Id,
                EligibleAmount = eligibleAmount,
                PointsAdded = pointsAdded,
                LoyaltyPointsBefore = loyaltyPointsBefore,
                LoyaltyPointsAfter = user.LoyaltyPoints,
                MembershipIdBefore = membershipIdBefore,
                MembershipIdAfter = user.MembershipId,
                LoyaltyHistoryId = history.Id,
                AppliedRule = BuildAppliedRule(),
                ProcessedAt = history.CreatedAt
            };

            return ApiResult<LoyaltyPointAwardResultDto>.Ok(
                result,
                pointsAdded > 0
                    ? "Cộng điểm sau thanh toán booking thành công."
                    : "Booking đã được ghi nhận thanh toán nhưng số điểm cộng bằng 0 theo rule hiện tại.",
                "ADD_POINTS_AFTER_BOOKING_PAID_SUCCESS");
        }
        catch (DbUpdateException ex) when (IsUniqueHistoryViolation(ex))
        {
            await transaction.RollbackAsync(cancellationToken);

            return ApiResult<LoyaltyPointAwardResultDto>.Fail(
                StatusCodes.Status409Conflict,
                "POINTS_ALREADY_AWARDED",
                "Booking này đã được cộng điểm ở một request khác. Không cộng trùng.");
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
    }

    private bool IsBookingPaid(Booking booking)
    {
        if (Normalize(booking.PaymentStatus) == PaidStatus)
        {
            return true;
        }

        return booking.Invoices.Any(x => Normalize(x.Status) == InvoicePaidStatus);
    }

    private decimal ResolveEligibleAmount(Booking booking)
    {
        var amountSource = Normalize(_options.AmountSource);

        var amount = amountSource switch
        {
            AmountSourceBookingSubtotal => booking.BookingSubtotal,
            _ => booking.FinalAmount
        };

        return Math.Max(0, amount);
    }

    private int CalculatePoints(decimal eligibleAmount)
    {
        if (eligibleAmount < Math.Max(0, _options.MinimumEligibleAmount))
        {
            return 0;
        }

        var moneyPerPoint = _options.MoneyPerPoint <= 0 ? 10000m : _options.MoneyPerPoint;
        var rawPoints = eligibleAmount / moneyPerPoint;

        var points = Normalize(_options.RoundingMode) switch
        {
            RoundingCeiling => (int)Math.Ceiling(rawPoints),
            RoundingRound => (int)Math.Round(rawPoints, MidpointRounding.AwayFromZero),
            _ => (int)Math.Floor(rawPoints)
        };

        return Math.Max(0, points);
    }

    private async Task<int?> ResolveMembershipIdAsync(int loyaltyPoints, CancellationToken cancellationToken)
    {
        var membership = await _dbContext.Memberships
            .AsNoTracking()
            .Where(x => x.Status == MembershipActiveStatus && x.MinPoints <= loyaltyPoints)
            .OrderByDescending(x => x.MinPoints)
            .ThenByDescending(x => x.Id)
            .FirstOrDefaultAsync(cancellationToken);

        return membership?.Id;
    }

    private string BuildAppliedRule()
    {
        return $"amountSource={Normalize(_options.AmountSource)}; moneyPerPoint={_options.MoneyPerPoint}; roundingMode={Normalize(_options.RoundingMode)}; minimumEligibleAmount={_options.MinimumEligibleAmount}";
    }

    public async Task<ApiResult<object>> RedeemPointsForVoucherAsync(
        int userId,
        int pointsToRedeem,
        CancellationToken cancellationToken = default)
    {
        if (pointsToRedeem <= 0)
        {
            return ApiResult<object>.Fail(StatusCodes.Status400BadRequest, "INVALID_POINTS", "Số điểm quy đổi phải lớn hơn 0.");
        }

        await using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);

        try
        {
            var user = await _dbContext.Users.FirstOrDefaultAsync(x => x.Id == userId, cancellationToken);
            if (user is null)
            {
                return ApiResult<object>.Fail(StatusCodes.Status404NotFound, "USER_NOT_FOUND", "Không tìm thấy người dùng.");
            }

            if (user.LoyaltyPoints < pointsToRedeem)
            {
                return ApiResult<object>.Fail(StatusCodes.Status400BadRequest, "INSUFFICIENT_POINTS", "Bạn không có đủ điểm để quy đổi.");
            }

            // Giả sử quy đổi: 1 điểm = 100 VNĐ (Ví dụ: 1000 điểm = 100,000 VNĐ)
            decimal discountValue = pointsToRedeem * 100;
            
            var voucherCode = $"REDEEM-{userId}-{DateTime.UtcNow.Ticks.ToString().Substring(10, 5)}";
            var voucher = new Voucher
            {
                Code = voucherCode,
                UserId = userId,
                DiscountType = "FIXED_AMOUNT",
                DiscountValue = discountValue,
                MinBookingValue = discountValue * 5, // Yêu cầu đơn hàng gấp 5 lần giá trị voucher
                ValidFrom = DateTime.UtcNow,
                ValidTo = DateTime.UtcNow.AddDays(30), // Có hiệu lực 30 ngày
                UsageLimit = 1,
                Reason = $"Quy đổi từ {pointsToRedeem} điểm tích lũy của user {userId}"
            };

            _dbContext.Vouchers.Add(voucher);

            // Cập nhật điểm user
            var balanceBefore = user.LoyaltyPoints;
            user.LoyaltyPoints -= pointsToRedeem;
            user.UpdatedAt = DateTime.UtcNow;

            // Ghi lịch sử điểm
            var history = new LoyaltyPointHistory
            {
                UserId = user.Id,
                ActionType = "REDEEM_VOUCHER",
                PointsAdded = -pointsToRedeem, // Âm vì là trừ điểm
                BalanceBefore = balanceBefore,
                BalanceAfter = user.LoyaltyPoints,
                Reason = $"Quy đổi điểm lấy voucher {voucherCode}",
                CreatedAt = DateTime.UtcNow
            };

            _dbContext.LoyaltyPointHistories.Add(history);

            await _dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            return ApiResult<object>.Ok(new
            {
                voucherCode = voucherCode,
                discountValue = discountValue,
                pointsRedeemed = pointsToRedeem,
                newBalance = user.LoyaltyPoints
            }, "Quy đổi điểm thành công!", "REDEEM_POINTS_SUCCESS");
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync(cancellationToken);
            return ApiResult<object>.Fail(StatusCodes.Status500InternalServerError, "REDEEM_ERROR", $"Lỗi quy đổi: {ex.Message}");
        }
    }

    public async Task<ApiResult<int>> SyncAllAwardablePointsAsync(CancellationToken cancellationToken = default)
    {
        var count = 0;
        try
        {
            // Tìm tất cả booking có ít nhất 1 invoice PAID hoặc trạng thái booking là PAID
            // và chưa có bản ghi cộng điểm nào.
            var awardableBookings = await _dbContext.Bookings
                .Include(x => x.User)
                .Include(x => x.Invoices)
                .Where(b => b.UserId != null && b.User!.Status)
                .ToListAsync(cancellationToken);

            foreach (var booking in awardableBookings)
            {
                if (!IsBookingPaid(booking)) continue;

                var alreadyAwarded = await _dbContext.LoyaltyPointHistories
                    .AnyAsync(h => h.BookingId == booking.Id && h.ActionType == BookingPaidEarnAction, cancellationToken);

                if (alreadyAwarded) continue;

                var result = await AddPointsAfterBookingPaidAsync(booking.Id, cancellationToken);
                if (result.Success) count++;
            }

            return ApiResult<int>.Ok(count, $"Đã đồng bộ và cộng điểm cho {count} đơn đặt phòng.");
        }
        catch (Exception ex)
        {
            return ApiResult<int>.Fail(StatusCodes.Status500InternalServerError, "SYNC_ERROR", $"Lỗi đồng bộ: {ex.Message}");
        }
    }

    private static bool IsUniqueHistoryViolation(DbUpdateException exception)
    {
        return exception.InnerException is SqlException sqlException
               && (sqlException.Number == 2601 || sqlException.Number == 2627);
    }

    private static string Normalize(string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? string.Empty
            : value.Trim().ToUpperInvariant();
    }
}