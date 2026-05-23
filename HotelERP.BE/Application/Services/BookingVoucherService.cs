using HotelERP.BE.DTOs.Vouchers;
using HotelERP.BE.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HotelERP.BE.Services.Bookings
{
    public class BookingVoucherService : IBookingVoucherService
    {
        private readonly HotelDbContext _context;
        private readonly RedLockNet.IDistributedLockFactory _lockFactory;

        public BookingVoucherService(HotelDbContext context, RedLockNet.IDistributedLockFactory lockFactory)
        {
            _context = context;
            _lockFactory = lockFactory;
        }

        public async Task<(bool IsSuccess, string ErrorCode, VoucherResponse? Data)> ApplyVoucherAsync(int bookingId, string voucherCode)
        {
            var booking = await _context.Bookings.FirstOrDefaultAsync(x => x.Id == bookingId);
            if (booking == null) return (false, "BOOKING_NOT_FOUND", null);

            var normalizedCode = voucherCode?.Trim().ToUpperInvariant();
            if (string.IsNullOrWhiteSpace(normalizedCode)) return (false, "VOUCHER_NOT_FOUND", null);

            var voucher = await _context.Vouchers.FirstOrDefaultAsync(v => v.Code == normalizedCode);
            if (voucher == null) return (false, "VOUCHER_NOT_FOUND", null);

            var now = DateTime.UtcNow;

            // Xử lý đồng thời: Áp dụng RedLock để lock Voucher này
            using var redLock = await _lockFactory.CreateLockAsync($"VoucherLock:{voucher.Id}", TimeSpan.FromSeconds(10));
            if (!redLock.IsAcquired)
            {
                return (false, "SYSTEM_BUSY", null);
            }

            var usedCount = await GetUsedCountAsync(voucher.Id);
            var status = ResolveVoucherStatus(voucher, usedCount, now);

            if (status != "ACTIVE")
                return (false, "VOUCHER_INACTIVE", null);

            if (voucher.UsageLimit.HasValue && usedCount >= voucher.UsageLimit.Value)
                return (false, "USAGE_LIMIT_EXCEEDED", null);

            var subtotal = booking.BookingSubtotal;
            if (subtotal < voucher.MinBookingValue)
                return (false, "MIN_BOOKING_NOT_MET", null);

            decimal discount = 0m;
            if (voucher.DiscountType == "PERCENT")
            {
                discount = subtotal * (voucher.DiscountValue / 100m);
            }
            else if (voucher.DiscountType == "FIXED_AMOUNT")
            {
                discount = voucher.DiscountValue;
            }

            if (discount > subtotal) discount = subtotal;

            var finalAmount = subtotal - discount;
            if (finalAmount < 0m) finalAmount = 0m;

            booking.VoucherId = voucher.Id;
            booking.DiscountAmount = discount;
            booking.FinalAmount = finalAmount;
            booking.UpdatedAt = now;

            await _context.SaveChangesAsync();

            return (true, string.Empty, new VoucherResponse
            {
                Subtotal = subtotal,
                DiscountAmount = discount,
                FinalAmount = finalAmount
            });
        }

        public async Task<(bool IsSuccess, string ErrorCode, VoucherResponse? Data)> RemoveVoucherAsync(int bookingId)
        {
            var booking = await _context.Bookings
                .Include(b => b.Voucher)
                .FirstOrDefaultAsync(b => b.Id == bookingId);

            if (booking == null) return (false, "BOOKING_NOT_FOUND", null);
            if (booking.VoucherId == null) return (false, "NO_VOUCHER_APPLIED", null);

            var subtotal = booking.BookingSubtotal;
            booking.DiscountAmount = 0m;
            booking.FinalAmount = subtotal;
            booking.UpdatedAt = DateTime.UtcNow;
            booking.VoucherId = null;

            await _context.SaveChangesAsync();

            return (true, string.Empty, new VoucherResponse
            {
                Subtotal = subtotal,
                DiscountAmount = 0m,
                FinalAmount = subtotal
            });
        }

        public async Task<(bool IsSuccess, string ErrorCode, Domain.Models.Voucher? Voucher)> ValidateVoucherAsync(string voucherCode, decimal subtotal)
        {
            var normalizedCode = voucherCode?.Trim().ToUpperInvariant();
            if (string.IsNullOrWhiteSpace(normalizedCode)) return (false, "VOUCHER_NOT_FOUND", null);

            var voucher = await _context.Vouchers.FirstOrDefaultAsync(v => v.Code == normalizedCode);
            if (voucher == null) return (false, "VOUCHER_NOT_FOUND", null);

            var now = DateTime.UtcNow;
            var usedCount = await GetUsedCountAsync(voucher.Id);
            var status = ResolveVoucherStatus(voucher, usedCount, now);

            if (status != "ACTIVE")
                return (false, status, null); // Return the specific error code (NOT_STARTED, EXPIRED, etc.)

            if (subtotal < voucher.MinBookingValue)
                return (false, "MIN_BOOKING_NOT_MET", null);

            return (true, string.Empty, voucher);
        }

        private async Task<int> GetUsedCountAsync(int voucherId)
        {
            return await _context.Bookings.CountAsync(x => x.VoucherId == voucherId && x.Status != "Cancelled" && x.Status != "CancelledByAdmin" && x.Status != "Expired");
        }

        private static string ResolveVoucherStatus(Domain.Models.Voucher voucher, int usedCount, DateTime now)
        {
            // Thêm "grace period" 12 giờ để tránh lệch múi giờ
            var effectiveNow = now.AddHours(12); 

            if (voucher.ValidFrom.HasValue && voucher.ValidFrom.Value > effectiveNow)
            {
                return "VOUCHER_NOT_STARTED";
            }

            if (voucher.ValidTo.HasValue && voucher.ValidTo.Value < now)
            {
                return "VOUCHER_EXPIRED";
            }

            if (voucher.UsageLimit.HasValue && usedCount >= voucher.UsageLimit.Value)
            {
                return "VOUCHER_USAGE_LIMIT_EXCEEDED";
            }

            return "ACTIVE";
        }
    }
}