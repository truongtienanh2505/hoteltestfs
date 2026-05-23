using HotelERP.BE.DTOs.Common;
using HotelERP.BE.DTOs.RoomTypes;

namespace HotelERP.BE.Services.RoomTypes;

public interface IRoomTypeQueryService
{
    Task<ApiResult<List<RoomTypeSearchResponseDto>>> SearchByOccupancyAsync(
        SearchRoomTypesByOccupancyRequestDto request,
        CancellationToken cancellationToken = default);

    Task<ApiResult<RoomPricePreviewResponseDto>> PreviewPriceAsync(
        RoomPricePreviewRequestDto request,
        CancellationToken cancellationToken = default);
}