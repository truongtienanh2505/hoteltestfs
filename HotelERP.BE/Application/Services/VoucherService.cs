using HotelERP.BE.Domain.Models;
using HotelERP.BE.DTOs.Common;
using HotelERP.BE.DTOs.Vouchers;
using HotelERP.BE.Helpers.AuditLogs;
using HotelERP.BE.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HotelERP.BE.Services.Vouchers;

public class VoucherService : IVoucherService
{
    private const string StatusActive = "ACTIVE";
    private const string StatusInactive = "INACTIVE";
    private const string DiscountTypePercent = "PERCENT";
    private const string DiscountTypeFixedAmount = "FIXED_AMOUNT";

    private readonly HotelDbContext _dbContext;
    private readonly IVoucherAuditLogHelper _auditLogHelper;

    public VoucherService(HotelDbContext dbContext, IVoucherAuditLogHelper voucherAuditLogHelper)
    {
        _dbContext = dbContext;
        _auditLogHelper = voucherAuditLogHelper; // ← lưu lại để dùng khi ghi audit log
    }

    public async Task<ApiResult<List<VoucherResponseDto>>> GetAllAsync(string? status, string? search, CancellationToken cancellationToken = default)
    {
        var normalizedStatus = Normalize(status);
        if (!string.IsNullOrWhiteSpace(normalizedStatus) && !IsValidStatus(normalizedStatus))
        {
            return ApiResult<List<VoucherResponseDto>>.Fail(
                StatusCodes.Status400BadRequest,
                "INVALID_STATUS",
                "status chỉ nhận ACTIVE hoặc INACTIVE.",
                new { field = "status", acceptedValues = new[] { StatusActive, StatusInactive } });
        }

        IQueryable<Voucher> query = _dbContext.Vouchers.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var keyword = search.Trim();
            query = query.Where(x => x.Code.Contains(keyword));
        }

        var vouchers = await query
            .OrderByDescending(x => x.Id)
            .ToListAsync(cancellationToken);

        var usedCountMap = await GetUsedCountMapAsync(cancellationToken);

        var items = vouchers
            .Select(x => MapToResponse(x, usedCountMap))
            .Where(x => string.IsNullOrWhiteSpace(normalizedStatus) || x.Status == normalizedStatus)
            .ToList();

        return ApiResult<List<VoucherResponseDto>>.Ok(items, "Lấy danh sách voucher thành công.", "VOUCHER_LIST_SUCCESS");
    }

    public async Task<ApiResult<List<VoucherResponseDto>>> GetMyVouchersAsync(int userId, CancellationToken cancellationToken = default)
    {
        IQueryable<Voucher> query = _dbContext.Vouchers
            .AsNoTracking()
            .Where(x => x.UserId == userId || x.UserId == null);

        var vouchers = await query
            .OrderByDescending(x => x.Id)
            .ToListAsync(cancellationToken);

        var usedCountMap = await GetUsedCountMapAsync(cancellationToken);

        var items = vouchers
            .Select(x => MapToResponse(x, usedCountMap))
            .Where(x => x.Status == StatusActive)
            .ToList();

        return ApiResult<List<VoucherResponseDto>>.Ok(items, "Lấy danh sách voucher thành công.", "MY_VOUCHER_SUCCESS");
    }

    public async Task<ApiResult<VoucherResponseDto>> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var voucher = await _dbContext.Vouchers
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (voucher is null)
        {
            return ApiResult<VoucherResponseDto>.Fail(
                StatusCodes.Status404NotFound,
                "VOUCHER_NOT_FOUND",
                $"Không tìm thấy voucher id = {id}.");
        }

        var usedCountMap = await GetUsedCountMapAsync(cancellationToken);
        return ApiResult<VoucherResponseDto>.Ok(MapToResponse(voucher, usedCountMap), "Lấy chi tiết voucher thành công.", "VOUCHER_DETAIL_SUCCESS");
    }

    public async Task<ApiResult<VoucherResponseDto>> CreateAsync(CreateVoucherRequestDto request, int? performedByUserId, CancellationToken cancellationToken = default)
    {
        var validationResult = await ValidateUpsertRequestAsync(
            request.Code,
            request.DiscountType,
            request.DiscountValue,
            request.MinBookingAmount,
            request.Status,
            request.ValidFrom,
            request.ValidTo,
            request.UsageLimit,
            performedByUserId,
            request.Reason,
            excludeVoucherId: null,
            cancellationToken: cancellationToken);

        if (validationResult is not null)
        {
            return validationResult;
        }

        var now = DateTime.UtcNow;
        var normalizedCode = Normalize(request.Code);
        var normalizedDiscountType = Normalize(request.DiscountType);
        var normalizedStatus = Normalize(request.Status);
        var validTo = normalizedStatus == StatusInactive && (!request.ValidTo.HasValue || request.ValidTo.Value > now)
            ? now.AddSeconds(-1)
            : request.ValidTo;

        var voucher = new Voucher
        {
            Code = normalizedCode!,
            DiscountType = normalizedDiscountType!,
            DiscountValue = request.DiscountValue,
            MinBookingValue = request.MinBookingAmount,
            ValidFrom = request.ValidFrom,
            ValidTo = validTo,
            UsageLimit = request.UsageLimit,
            Reason = request.Reason
        };

        using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            _dbContext.Vouchers.Add(voucher);
            await _dbContext.SaveChangesAsync(cancellationToken);

        var usedCountMap = await GetUsedCountMapAsync(cancellationToken);
        var response = MapToResponse(voucher, usedCountMap);

            // Ghi audit log
            await _auditLogHelper.WriteAsync(
                userId: performedByUserId,
                roleName: "System",
                action: "CREATE",
                recordId: voucher.Id,
                oldValue: null,
                newValue: _auditLogHelper.BuildSnapshot(voucher),
                reason: request.Reason ?? "Tạo voucher mới",
                cancellationToken: cancellationToken);

            await transaction.CommitAsync(cancellationToken);
            return ApiResult<VoucherResponseDto>.Created(response, "Tạo voucher thành công.", "CREATE_VOUCHER_SUCCESS");
        }
        catch (Exception)
        {
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
    }

    public async Task<ApiResult<VoucherResponseDto>> UpdateAsync(int id, UpdateVoucherRequestDto request, int? performedByUserId, CancellationToken cancellationToken = default)
    {
        var voucher = await _dbContext.Vouchers.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (voucher is null)
        {
            return ApiResult<VoucherResponseDto>.Fail(
                StatusCodes.Status404NotFound,
                "VOUCHER_NOT_FOUND",
                $"Không tìm thấy voucher id = {id}.");
        }

        var validationResult = await ValidateUpsertRequestAsync(
            request.Code,
            request.DiscountType,
            request.DiscountValue,
            request.MinBookingAmount,
            request.Status,
            request.ValidFrom,
            request.ValidTo,
            request.UsageLimit,
            performedByUserId,
            request.Reason,
            excludeVoucherId: id,
            cancellationToken: cancellationToken);

        if (validationResult is not null)
        {
            return validationResult;
        }

        var now = DateTime.UtcNow;
        var normalizedStatus = Normalize(request.Status);

        voucher.Code = Normalize(request.Code)!;
        voucher.DiscountType = Normalize(request.DiscountType)!;
        voucher.DiscountValue = request.DiscountValue;
        voucher.MinBookingValue = request.MinBookingAmount;
        voucher.ValidFrom = request.ValidFrom;
        voucher.ValidTo = request.ValidTo;
        voucher.UsageLimit = request.UsageLimit;
        voucher.Reason = request.Reason;

        using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            await _dbContext.SaveChangesAsync(cancellationToken);

        var usedCountMap = await GetUsedCountMapAsync(cancellationToken);
        var response = MapToResponse(voucher, usedCountMap);

            // Ghi audit log
            await _auditLogHelper.WriteAsync(
                userId: performedByUserId,
                roleName: "System",
                action: "UPDATE",
                recordId: voucher.Id,
                oldValue: null,
                newValue: _auditLogHelper.BuildSnapshot(voucher),
                reason: request.Reason ?? "Cập nhật voucher",
                cancellationToken: cancellationToken);

            await transaction.CommitAsync(cancellationToken);
            return ApiResult<VoucherResponseDto>.Ok(response, "Cập nhật voucher thành công.", "UPDATE_VOUCHER_SUCCESS");
        }
        catch (Exception)
        {
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
    }

    public async Task<ApiResult<object>> DisableAsync(int id, DisableVoucherRequestDto request, int? performedByUserId, CancellationToken cancellationToken = default)
    {
        var actorValidation = await ValidateActorAndReasonAsync(performedByUserId, request.Reason, cancellationToken);
        if (actorValidation is not null)
        {
            return actorValidation;
        }

        var voucher = await _dbContext.Vouchers.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (voucher is null)
        {
            return ApiResult<object>.Fail(
                StatusCodes.Status404NotFound,
                "VOUCHER_NOT_FOUND",
                $"Không tìm thấy voucher id = {id}.");
        }

        var now = DateTime.UtcNow;
        var usedCount = await _dbContext.Bookings.CountAsync(x => x.VoucherId == voucher.Id, cancellationToken);
        var currentStatus = ResolveVoucherStatus(voucher, usedCount, now);
        if (currentStatus == StatusInactive)
        {
            return ApiResult<object>.Fail(
                StatusCodes.Status400BadRequest,
                "VOUCHER_ALREADY_INACTIVE",
                "Voucher đã ở trạng thái INACTIVE.");
        }

        using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            voucher.ValidTo = now.AddSeconds(-1);
            await _dbContext.SaveChangesAsync(cancellationToken);

            // Ghi audit log
            await _auditLogHelper.WriteAsync(
                userId: performedByUserId,
                roleName: "System",
                action: "DELETE",
                recordId: voucher.Id,
                oldValue: _auditLogHelper.BuildSnapshot(voucher),
                newValue: null,
                reason: request.Reason ?? "Vô hiệu hóa voucher",
                cancellationToken: cancellationToken);

            await transaction.CommitAsync(cancellationToken);

            return ApiResult<object>.Ok(new
            {
                voucherId = voucher.Id,
                status = StatusInactive,
                updatedAt = now
            }, "Vô hiệu hóa voucher thành công.", "DISABLE_VOUCHER_SUCCESS");
        }
        catch (Exception)
        {
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
    }

    private async Task<ApiResult<VoucherResponseDto>?> ValidateUpsertRequestAsync(
        string? code,
        string? discountType,
        decimal discountValue,
        decimal minBookingAmount,
        string? status,
        DateTime? validFrom,
        DateTime? validTo,
        int? usageLimit,
        int? performedByUserId,
        string? reason,
        int? excludeVoucherId,
        CancellationToken cancellationToken)
    {
        var actorValidation = await ValidateActorAndReasonAsync(performedByUserId, reason, cancellationToken);
        if (actorValidation is not null)
        {
            return ApiResult<VoucherResponseDto>.Fail(
                actorValidation.StatusCode,
                actorValidation.Code,
                actorValidation.Message,
                actorValidation.Details);
        }

        var normalizedCode = Normalize(code);
        if (string.IsNullOrWhiteSpace(normalizedCode))
        {
            return ApiResult<VoucherResponseDto>.Fail(
                StatusCodes.Status400BadRequest,
                "CODE_REQUIRED",
                "code là bắt buộc.",
                new { field = "code" });
        }

        var normalizedDiscountType = Normalize(discountType);
        if (!IsValidDiscountType(normalizedDiscountType))
        {
            return ApiResult<VoucherResponseDto>.Fail(
                StatusCodes.Status400BadRequest,
                "INVALID_DISCOUNT_TYPE",
                "discount_type chỉ nhận PERCENT hoặc FIXED_AMOUNT.",
                new { field = "discountType", acceptedValues = new[] { DiscountTypePercent, DiscountTypeFixedAmount } });
        }

        if (discountValue < 0)
        {
            return ApiResult<VoucherResponseDto>.Fail(
                StatusCodes.Status400BadRequest,
                "INVALID_DISCOUNT_VALUE",
                "discount_value phải >= 0.",
                new { field = "discountValue" });
        }

        if (minBookingAmount < 0)
        {
            return ApiResult<VoucherResponseDto>.Fail(
                StatusCodes.Status400BadRequest,
                "INVALID_MIN_BOOKING_AMOUNT",
                "min_booking_amount phải >= 0.",
                new { field = "minBookingAmount" });
        }

        if (usageLimit.HasValue && usageLimit.Value < 0)
        {
            return ApiResult<VoucherResponseDto>.Fail(
                StatusCodes.Status400BadRequest,
                "INVALID_USAGE_LIMIT",
                "usage_limit phải >= 0.",
                new { field = "usageLimit" });
        }

        var normalizedStatus = Normalize(status);
        if (!IsValidStatus(normalizedStatus))
        {
            return ApiResult<VoucherResponseDto>.Fail(
                StatusCodes.Status400BadRequest,
                "INVALID_STATUS",
                "status chỉ nhận ACTIVE hoặc INACTIVE.",
                new { field = "status", acceptedValues = new[] { StatusActive, StatusInactive } });
        }

        if (validFrom.HasValue && validTo.HasValue && validTo.Value < validFrom.Value)
        {
            return ApiResult<VoucherResponseDto>.Fail(
                StatusCodes.Status400BadRequest,
                "INVALID_DATE_RANGE",
                "valid_to không được nhỏ hơn valid_from.",
                new { field = "validTo" });
        }

        var codeExists = await _dbContext.Vouchers.AnyAsync(
            x => x.Code == normalizedCode && (!excludeVoucherId.HasValue || x.Id != excludeVoucherId.Value),
            cancellationToken);

        if (codeExists)
        {
            return ApiResult<VoucherResponseDto>.Fail(
                StatusCodes.Status409Conflict,
                "VOUCHER_CODE_ALREADY_EXISTS",
                $"Voucher code '{normalizedCode}' đã tồn tại.",
                new { field = "code", value = normalizedCode });
        }

        return null;
    }

    private async Task<ApiResult<object>?> ValidateActorAndReasonAsync(int? performedByUserId, string? reason, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(reason))
        {
            return ApiResult<object>.Fail(
                StatusCodes.Status400BadRequest,
                "REASON_REQUIRED",
                "reason là bắt buộc để ghi audit log.",
                new { field = "reason" });
        }

        if (performedByUserId.HasValue)
        {
            var actorExists = await _dbContext.Users.AnyAsync(x => x.Id == performedByUserId.Value, cancellationToken);
            if (!actorExists)
            {
                return ApiResult<object>.Fail(
                    StatusCodes.Status400BadRequest,
                    "INVALID_ACTOR",
                    $"userId = {performedByUserId.Value} không tồn tại.",
                    new { field = "x-user-id", value = performedByUserId.Value });
            }
        }

        return null;
    }

    private async Task<Dictionary<int, int>> GetUsedCountMapAsync(CancellationToken cancellationToken)
    {
        return await _dbContext.Bookings
            .AsNoTracking()
            .Where(x => x.VoucherId.HasValue && x.Status != "Cancelled" && x.Status != "CancelledByAdmin" && x.Status != "Expired")
            .GroupBy(x => x.VoucherId!.Value)
            .Select(g => new { VoucherId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.VoucherId, x => x.Count, cancellationToken);
    }

    private static string ResolveVoucherStatus(Voucher voucher, int usedCount, DateTime now)
    {
        if (voucher.ValidFrom.HasValue && voucher.ValidFrom.Value > now)
        {
            return StatusInactive;
        }

        if (voucher.ValidTo.HasValue && voucher.ValidTo.Value < now)
        {
            return StatusInactive;
        }

        if (voucher.UsageLimit.HasValue && usedCount >= voucher.UsageLimit.Value)
        {
            return StatusInactive;
        }

        return StatusActive;
    }

    private static bool IsValidStatus(string? status)
    {
        return status == StatusActive || status == StatusInactive;
    }

    private static bool IsValidDiscountType(string? discountType)
    {
        return discountType == DiscountTypePercent || discountType == DiscountTypeFixedAmount;
    }

    private static string? Normalize(string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? null
            : value.Trim().ToUpperInvariant();
    }

    private static VoucherResponseDto MapToResponse(Voucher voucher, IReadOnlyDictionary<int, int> usedCountMap)
    {
        usedCountMap.TryGetValue(voucher.Id, out var usedCount);
        var now = DateTime.UtcNow;
        var status = ResolveVoucherStatus(voucher, usedCount, now);

        return new VoucherResponseDto
        {
            Id = voucher.Id,
            Code = voucher.Code,
            DiscountType = voucher.DiscountType,
            DiscountValue = voucher.DiscountValue,
            MinBookingAmount = voucher.MinBookingAmount,
            ValidFrom = voucher.ValidFrom,
            ValidTo = voucher.ValidTo,
            UsageLimit = voucher.UsageLimit,
            UsedCount = usedCount,
            Status = status,
            Reason = voucher.Reason,
            CreatedAt = voucher.ValidFrom ?? now,
            UpdatedAt = null
        };
    }

    public async Task ExpireVouchersJobAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var vouchers = await _dbContext.Vouchers.ToListAsync(cancellationToken);
        var usedCountMap = await GetUsedCountMapAsync(cancellationToken);

        var count = 0;
        foreach (var v in vouchers)
        {
            var usedCount = usedCountMap.GetValueOrDefault(v.Id, 0);
            var status = ResolveVoucherStatus(v, usedCount, now);

            // Nếu status logic là INACTIVE nhưng DB chưa lưu ValidTo quá khứ, ta ép cứng lại
            if (status == StatusInactive && (!v.ValidTo.HasValue || v.ValidTo.Value > now))
            {
                v.ValidTo = now.AddSeconds(-1);
                v.Reason = string.IsNullOrWhiteSpace(v.Reason) 
                    ? "Hệ thống tự động vô hiệu hóa (Hangfire Job)" 
                    : v.Reason + " | Hệ thống tự động vô hiệu hóa";
                count++;
            }
        }

        if (count > 0)
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
    }

    /// <summary>
    /// Kiểm tra xem hôm nay có phải sinh nhật của user không.
    /// Nếu có và chưa cấp voucher sinh nhật trong năm nay → tự tạo mới và trả về.
    /// Nếu đã cấp rồi → trả về voucher hiện có (nếu còn hiệu lực).
    /// Nếu hôm nay không phải sinh nhật → trả về null.
    /// </summary>
    public async Task<VoucherResponseDto?> GetBirthdayVoucherAsync(int userId, CancellationToken cancellationToken = default)
    {
        var user = await _dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

        if (user == null || !user.DateOfBirth.HasValue)
            return null;

        // So sánh ngày & tháng với ngày hôm nay (theo giờ UTC+7 để sát thực tế người dùng VN)
        var todayVN = DateTime.UtcNow.AddHours(7).Date;
        var dob = user.DateOfBirth.Value;

        bool isBirthday = dob.Month == todayVN.Month && dob.Day == todayVN.Day;
        if (!isBirthday)
            return null;

        int currentYear = todayVN.Year;

        // Kiểm tra đã cấp voucher sinh nhật năm nay chưa (qua cờ LastBirthdayCouponYear)
        // Tìm voucher sinh nhật đang gắn với userId này trong năm nay
        var birthdayVoucherCodePrefix = $"BDAY-{userId}-{currentYear}";
        var existingVoucher = await _dbContext.Vouchers
            .AsNoTracking()
            .FirstOrDefaultAsync(v => v.UserId == userId && v.Code.StartsWith(birthdayVoucherCodePrefix), cancellationToken);

        if (existingVoucher != null)
        {
            // Voucher đã tồn tại — trả về nếu còn hiệu lực
            var usedCountMap = await GetUsedCountMapAsync(cancellationToken);
            return MapToResponse(existingVoucher, usedCountMap);
        }

        // Chưa có → Tự động tạo voucher sinh nhật mới
        var birthdayVoucherCode = $"{birthdayVoucherCodePrefix}-{Guid.NewGuid().ToString()[..4].ToUpper()}";
        var validFrom = todayVN.ToUniversalTime();       // Hiệu lực từ đầu ngày sinh nhật
        var validTo   = validFrom.AddDays(7);             // Hết hạn sau 7 ngày

        var newVoucher = new Voucher
        {
            Code          = birthdayVoucherCode,
            UserId        = userId,                       // Voucher riêng của user này
            DiscountType  = DiscountTypePercent,
            DiscountValue = 10m,                          // Giảm 10% cho voucher sinh nhật
            MinBookingValue = 0m,
            ValidFrom     = validFrom,
            ValidTo       = validTo,
            UsageLimit    = 1,                            // Chỉ dùng 1 lần
            Reason        = $"Voucher sinh nhật tự động — chúc mừng sinh nhật {user.FullName}!"
        };

        _dbContext.Vouchers.Add(newVoucher);

        // Cập nhật cờ LastBirthdayCouponYear để tránh tạo trùng nếu gọi lại
        var trackedUser = await _dbContext.Users.FindAsync([userId], cancellationToken);
        if (trackedUser != null)
            trackedUser.LastBirthdayCouponYear = currentYear;

        await _dbContext.SaveChangesAsync(cancellationToken);

        var usedMap = await GetUsedCountMapAsync(cancellationToken);
        return MapToResponse(newVoucher, usedMap);
    }
}