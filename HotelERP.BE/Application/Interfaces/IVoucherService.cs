using HotelERP.BE.DTOs.Common;
using HotelERP.BE.DTOs.Vouchers;

namespace HotelERP.BE.Services.Vouchers;

public interface IVoucherService
{
    Task<ApiResult<List<VoucherResponseDto>>> GetAllAsync(string? status, string? search, CancellationToken cancellationToken = default);
    Task<ApiResult<List<VoucherResponseDto>>> GetMyVouchersAsync(int userId, CancellationToken cancellationToken = default);

    Task<ApiResult<VoucherResponseDto>> GetByIdAsync(int id, CancellationToken cancellationToken = default);

    Task<ApiResult<VoucherResponseDto>> CreateAsync(CreateVoucherRequestDto request, int? performedByUserId, CancellationToken cancellationToken = default);

    Task<ApiResult<VoucherResponseDto>> UpdateAsync(int id, UpdateVoucherRequestDto request, int? performedByUserId, CancellationToken cancellationToken = default);

    Task<ApiResult<object>> DisableAsync(int id, DisableVoucherRequestDto request, int? performedByUserId, CancellationToken cancellationToken = default);

    Task ExpireVouchersJobAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Lấy (hoặc tự tạo) voucher sinh nhật cho user trong năm hiện tại.
    /// Chỉ cấp 1 voucher/năm. Trả về null nếu hôm nay không phải sinh nhật.
    /// </summary>
    Task<VoucherResponseDto?> GetBirthdayVoucherAsync(int userId, CancellationToken cancellationToken = default);
}