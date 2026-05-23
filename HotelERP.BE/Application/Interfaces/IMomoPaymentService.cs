using HotelERP.BE.DTOs.Common;
using HotelERP.BE.DTOs.Payments;

namespace HotelERP.BE.Application.Interfaces;

public interface IMomoPaymentService
{
    Task<ApiResult<MomoPaymentCreateResponseDto>> CreateInvoicePaymentAsync(
        int invoiceId,
        CreateMomoInvoicePaymentRequestDto request,
        CancellationToken cancellationToken = default);

    Task<ApiResult<MomoPaymentCreateResponseDto>> CreateBookingDepositPaymentAsync(
        int bookingId,
        CreateMomoBookingDepositPaymentRequestDto request,
        CancellationToken cancellationToken = default);

    Task<ApiResult<PaymentStatusResponseDto>> GetPaymentStatusAsync(
        int paymentId,
        CancellationToken cancellationToken = default);

    Task<ApiResult<object>> HandleIpnAsync(
        MomoIpnRequestDto request,
        CancellationToken cancellationToken = default);

    ApiResult<object> ValidateReturn(MomoIpnRequestDto request);
}
