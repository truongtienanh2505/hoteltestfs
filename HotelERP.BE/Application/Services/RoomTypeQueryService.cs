using HotelERP.BE.DTOs.Common;
using HotelERP.BE.DTOs.RoomTypes;
using HotelERP.BE.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HotelERP.BE.Services.RoomTypes;

public class RoomTypeQueryService : IRoomTypeQueryService
{
    private const string ActiveStatus = "ACTIVE";
    private static readonly TimeSpan StandardCheckInTime = new(14, 0, 0);
    private static readonly TimeSpan StandardCheckOutTime = new(12, 0, 0);

    private readonly HotelDbContext _dbContext;

    public RoomTypeQueryService(HotelDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<ApiResult<List<RoomTypeSearchResponseDto>>> SearchByOccupancyAsync(
        SearchRoomTypesByOccupancyRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var roomTypes = await _dbContext.RoomTypes
            .AsNoTracking()
            .Where(x =>
                x.Status == ActiveStatus &&
                x.CapacityAdults >= request.Adults &&
                x.CapacityChildren >= request.Children)
            .OrderBy(x => x.BasePrice)
            .ThenBy(x => x.Id)
            .Select(x => new RoomTypeSearchResponseDto
            {
                Id = x.Id,
                Name = x.Name,
                BasePrice = x.BasePrice,
                CapacityAdults = x.CapacityAdults,
                CapacityChildren = x.CapacityChildren,
                MaxOccupancy = x.CapacityAdults + x.CapacityChildren,
                Description = x.Description,
                BedType = x.BedType,
                SizeSqm = x.SizeSqm,
                EarlyCheckinFeePercent = x.EarlyCheckinFeePercent,
                LateCheckoutFeePercent = x.LateCheckoutFeePercent,
                ExtraHourPrice = x.ExtraHourPrice,
                Status = x.Status,
                PrimaryImageUrl = x.RoomImages
                    .Where(img => img.Status == ActiveStatus)
                    .OrderByDescending(img => img.IsPrimary)
                    .ThenBy(img => img.Id)
                    .Select(img => img.ImageUrl)
                    .FirstOrDefault(),
                PhysicalRoomCount = x.Rooms.Count()
            })
            .ToListAsync(cancellationToken);

        var message = roomTypes.Count == 0
            ? "Không có loại phòng nào phù hợp với sức chứa yêu cầu."
            : "Lọc loại phòng theo sức chứa thành công.";

        return ApiResult<List<RoomTypeSearchResponseDto>>.Ok(
            roomTypes,
            message,
            "ROOM_TYPE_SEARCH_SUCCESS");
    }

    public async Task<ApiResult<RoomPricePreviewResponseDto>> PreviewPriceAsync(
        RoomPricePreviewRequestDto request,
        CancellationToken cancellationToken = default)
    {
        if (!request.CheckInAt.HasValue || !request.CheckOutAt.HasValue)
        {
            return ApiResult<RoomPricePreviewResponseDto>.Fail(
                StatusCodes.Status400BadRequest,
                "INVALID_DATETIME",
                "checkInAt và checkOutAt là bắt buộc.");
        }

        var checkInAt = request.CheckInAt.Value;
        var checkOutAt = request.CheckOutAt.Value;

        if (checkOutAt <= checkInAt)
        {
            return ApiResult<RoomPricePreviewResponseDto>.Fail(
                StatusCodes.Status400BadRequest,
                "INVALID_DATE_RANGE",
                "checkOutAt phải lớn hơn checkInAt.",
                new
                {
                    checkInAt,
                    checkOutAt
                });
        }

        var nights = (checkOutAt.Date - checkInAt.Date).Days;
        if (nights <= 0)
        {
            return ApiResult<RoomPricePreviewResponseDto>.Fail(
                StatusCodes.Status400BadRequest,
                "INVALID_NIGHTS",
                "Booking phải có ít nhất 1 đêm. checkOutAt phải sang ngày sau checkInAt.",
                new
                {
                    checkInAt,
                    checkOutAt
                });
        }

        var roomType = await _dbContext.RoomTypes
            .AsNoTracking()
            .FirstOrDefaultAsync(
                x => x.Id == request.RoomTypeId && x.Status == ActiveStatus,
                cancellationToken);

        if (roomType is null)
        {
            return ApiResult<RoomPricePreviewResponseDto>.Fail(
                StatusCodes.Status404NotFound,
                "ROOM_TYPE_NOT_FOUND",
                $"Không tìm thấy room type ACTIVE với id = {request.RoomTypeId}.");
        }

        var pricePerNight = roomType.BasePrice;
        var roomAmount = DecimalRound(pricePerNight * nights);

        var isEarlyCheckIn = checkInAt.TimeOfDay < StandardCheckInTime;
        var isLateCheckOut = checkOutAt.TimeOfDay > StandardCheckOutTime;

        var earlyCheckInFee = isEarlyCheckIn
            ? CalculatePercentFee(pricePerNight, roomType.EarlyCheckinFeePercent)
            : 0m;

        var lateCheckOutFee = isLateCheckOut
            ? CalculatePercentFee(pricePerNight, roomType.LateCheckoutFeePercent)
            : 0m;

        var totalAmount = DecimalRound(roomAmount + earlyCheckInFee + lateCheckOutFee);

        var response = new RoomPricePreviewResponseDto
        {
            RoomTypeId = roomType.Id,
            RoomTypeName = roomType.Name,
            CheckInAt = checkInAt,
            CheckOutAt = checkOutAt,
            StandardCheckInTime = "14:00",
            StandardCheckOutTime = "12:00",
            IsEarlyCheckIn = isEarlyCheckIn,
            IsLateCheckOut = isLateCheckOut,
            Nights = nights,
            PricePerNight = pricePerNight,
            RoomAmount = roomAmount,
            EarlyCheckInFeePercent = roomType.EarlyCheckinFeePercent,
            LateCheckOutFeePercent = roomType.LateCheckoutFeePercent,
            EarlyCheckInFee = earlyCheckInFee,
            LateCheckOutFee = lateCheckOutFee,
            TotalAmount = totalAmount
        };

        return ApiResult<RoomPricePreviewResponseDto>.Ok(
            response,
            "Tính giá tạm tính phòng thành công.",
            "ROOM_PRICE_PREVIEW_SUCCESS");
    }

    private static decimal CalculatePercentFee(decimal baseAmount, decimal percent)
    {
        return DecimalRound(baseAmount * percent / 100m);
    }

    private static decimal DecimalRound(decimal value)
    {
        return Math.Round(value, 2, MidpointRounding.AwayFromZero);
    }
}