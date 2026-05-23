using HotelERP.BE.DTOs.Vouchers;
using System.Threading.Tasks;

namespace HotelERP.BE.Services.Bookings
{
    public interface IBookingVoucherService
    {
        Task<(bool IsSuccess, string ErrorCode, VoucherResponse? Data)> ApplyVoucherAsync(int bookingId, string voucherCode);
        Task<(bool IsSuccess, string ErrorCode, VoucherResponse? Data)> RemoveVoucherAsync(int bookingId);
        Task<(bool IsSuccess, string ErrorCode, Domain.Models.Voucher? Voucher)> ValidateVoucherAsync(string voucherCode, decimal subtotal);
    }
}