using System.Globalization;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using HotelERP.BE.Application.Interfaces;
using HotelERP.BE.Domain.Models;
using HotelERP.BE.DTOs.Common;
using HotelERP.BE.DTOs.Configurations;
using HotelERP.BE.DTOs.Invoices;
using HotelERP.BE.DTOs.Payments;
using HotelERP.BE.Infrastructure.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace HotelERP.BE.Application.Services;

public class MomoPaymentService : IMomoPaymentService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = false
    };

    private readonly HotelDbContext _dbContext;
    private readonly IInvoiceService _invoiceService;
    private readonly IBookingManagementService _bookingManagementService;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<MomoPaymentService> _logger;
    private readonly MomoOptions _options;

    public MomoPaymentService(
        HotelDbContext dbContext,
        IInvoiceService invoiceService,
        IBookingManagementService bookingManagementService,
        IHttpClientFactory httpClientFactory,
        IOptions<MomoOptions> options,
        ILogger<MomoPaymentService> logger)
    {
        _dbContext = dbContext;
        _invoiceService = invoiceService;
        _bookingManagementService = bookingManagementService;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        _options = options.Value;
    }

    public async Task<ApiResult<MomoPaymentCreateResponseDto>> CreateInvoicePaymentAsync(
        int invoiceId,
        CreateMomoInvoicePaymentRequestDto request,
        CancellationToken cancellationToken = default)
    {
        if (!IsConfigured())
        {
            return ApiResult<MomoPaymentCreateResponseDto>.Fail(
                StatusCodes.Status500InternalServerError,
                "MOMO_NOT_CONFIGURED",
                "MoMo chưa được cấu hình trên backend.");
        }

        var invoice = await _dbContext.Invoices
            .Include(x => x.Booking)
                .ThenInclude(x => x!.BookingDetails)
            .Include(x => x.InvoiceBookingDetails)
            .Include(x => x.Payments)
            .FirstOrDefaultAsync(x => x.Id == invoiceId, cancellationToken);

        if (invoice is null)
        {
            return ApiResult<MomoPaymentCreateResponseDto>.Fail(
                StatusCodes.Status404NotFound,
                "INVOICE_NOT_FOUND",
                $"Không tìm thấy invoice id = {invoiceId}.");
        }

        if (Normalize(invoice.Status) == "PAID")
        {
            return ApiResult<MomoPaymentCreateResponseDto>.Fail(
                StatusCodes.Status409Conflict,
                "INVOICE_ALREADY_PAID",
                "Hóa đơn này đã thanh toán rồi.");
        }

        var amount = CalculateInvoiceAmountDue(invoice);
        if (amount < 1000)
        {
            return ApiResult<MomoPaymentCreateResponseDto>.Fail(
                StatusCodes.Status409Conflict,
                "INVALID_PAYMENT_AMOUNT",
                "Số tiền thanh toán qua MoMo phải từ 1.000 VND.",
                new { amount });
        }


        var oldPendingInvoicePayments = invoice.Payments
            .Where(x => Normalize(x.GatewayName) == "MOMO" && Normalize(x.Status) == "PENDING")
            .ToList();

        foreach (var oldPayment in oldPendingInvoicePayments)
        {
            oldPayment.Status = "REPLACED";
        }

        var orderId = BuildOrderId("INV", invoice.Id);
        var requestId = Guid.NewGuid().ToString("D");
        var extraData = BuildExtraData(new MomoPaymentMetadata
        {
            Type = "INVOICE",
            InvoiceId = invoice.Id,
            OrderId = orderId,
            RequestId = requestId,
            Note = request.Note
        });

        var orderInfo = BuildOrderInfo($"Thanh toan hoa don {invoice.InvoiceCode ?? invoice.Id.ToString()}");
        var momoRequest = BuildCreateRequest(orderId, requestId, amount, orderInfo, extraData);
        var momoResponse = await CallCreatePaymentAsync(momoRequest, cancellationToken);

        if (momoResponse.Data is null)
        {
            return ApiResult<MomoPaymentCreateResponseDto>.Fail(
                momoResponse.StatusCode,
                momoResponse.Code,
                momoResponse.Message,
                momoResponse.Details);
        }

        var payment = new Payment
        {
            InvoiceId = invoice.Id,
            PaymentMethod = "MOMO",
            AmountPaid = amount,
            TransactionCode = orderId,
            PaymentDate = DateTime.UtcNow,
            PaymentDirection = "IN",
            GatewayName = "MOMO",
            Status = "PENDING",
            CreatedAt = DateTime.UtcNow,
            ProviderResponse = SerializeMetadata(new MomoPaymentMetadata
            {
                Type = "INVOICE",
                InvoiceId = invoice.Id,
                OrderId = orderId,
                RequestId = requestId,
                PayUrl = momoResponse.Data.PayUrl,
                QrCodeUrl = momoResponse.Data.QrCodeUrl,
                Deeplink = momoResponse.Data.Deeplink,
                Note = request.Note,
                LastResultCode = momoResponse.Data.ResultCode,
                LastMessage = momoResponse.Data.Message,
                RawResponse = JsonSerializer.Serialize(momoResponse.Data, JsonOptions)
            })
        };

        _dbContext.Payments.Add(payment);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return ApiResult<MomoPaymentCreateResponseDto>.Created(
            MapCreateResponse(payment, ParseMetadata(payment.ProviderResponse), invoice.Id, null),
            "Tạo payment MoMo cho hóa đơn thành công.",
            "MOMO_CREATE_INVOICE_PAYMENT_SUCCESS");
    }

    public async Task<ApiResult<MomoPaymentCreateResponseDto>> CreateBookingDepositPaymentAsync(
        int bookingId,
        CreateMomoBookingDepositPaymentRequestDto request,
        CancellationToken cancellationToken = default)
    {
        if (!IsConfigured())
        {
            return ApiResult<MomoPaymentCreateResponseDto>.Fail(
                StatusCodes.Status500InternalServerError,
                "MOMO_NOT_CONFIGURED",
                "MoMo chưa được cấu hình trên backend.");
        }

        if (request.Amount < 1000)
        {
            return ApiResult<MomoPaymentCreateResponseDto>.Fail(
                StatusCodes.Status400BadRequest,
                "INVALID_DEPOSIT_AMOUNT",
                "Số tiền cọc qua MoMo phải từ 1.000 VND.");
        }

        var booking = await _dbContext.Bookings.FirstOrDefaultAsync(x => x.Id == bookingId, cancellationToken);
        if (booking is null)
        {
            return ApiResult<MomoPaymentCreateResponseDto>.Fail(
                StatusCodes.Status404NotFound,
                "BOOKING_NOT_FOUND",
                $"Không tìm thấy booking id = {bookingId}.");
        }

        if (Normalize(booking.Status) == "CANCELLED" || Normalize(booking.Status) == "CANCELLEDBYADMIN")
        {
            return ApiResult<MomoPaymentCreateResponseDto>.Fail(
                StatusCodes.Status409Conflict,
                "BOOKING_CANCELLED",
                "Không thể tạo payment MoMo cho booking đã hủy.");
        }


        var oldPendingDepositPayments = await _dbContext.Payments
            .Where(x => x.InvoiceId == null && x.GatewayName == "MOMO" && x.Status == "PENDING")
            .ToListAsync(cancellationToken);

        foreach (var oldPayment in oldPendingDepositPayments)
        {
            var metadata = ParseMetadata(oldPayment.ProviderResponse);
            if (metadata?.BookingId == bookingId && metadata.Type == "BOOKING_DEPOSIT")
            {
                oldPayment.Status = "REPLACED";
            }
        }

        var amount = Money(request.Amount);
        var orderId = BuildOrderId("DEP", booking.Id);
        var requestId = Guid.NewGuid().ToString("D");
        var extraData = BuildExtraData(new MomoPaymentMetadata
        {
            Type = "BOOKING_DEPOSIT",
            BookingId = booking.Id,
            OrderId = orderId,
            RequestId = requestId,
            Note = request.Note
        });

        var orderInfo = BuildOrderInfo($"Dat coc booking {booking.BookingCode}");
        var momoRequest = BuildCreateRequest(orderId, requestId, amount, orderInfo, extraData);
        var momoResponse = await CallCreatePaymentAsync(momoRequest, cancellationToken);

        if (momoResponse.Data is null)
        {
            return ApiResult<MomoPaymentCreateResponseDto>.Fail(
                momoResponse.StatusCode,
                momoResponse.Code,
                momoResponse.Message,
                momoResponse.Details);
        }

        var payment = new Payment
        {
            InvoiceId = null,
            PaymentMethod = "MOMO",
            AmountPaid = amount,
            TransactionCode = orderId,
            PaymentDate = DateTime.UtcNow,
            PaymentDirection = "IN",
            GatewayName = "MOMO",
            Status = "PENDING",
            CreatedAt = DateTime.UtcNow,
            ProviderResponse = SerializeMetadata(new MomoPaymentMetadata
            {
                Type = "BOOKING_DEPOSIT",
                BookingId = booking.Id,
                OrderId = orderId,
                RequestId = requestId,
                PayUrl = momoResponse.Data.PayUrl,
                QrCodeUrl = momoResponse.Data.QrCodeUrl,
                Deeplink = momoResponse.Data.Deeplink,
                Note = request.Note,
                LastResultCode = momoResponse.Data.ResultCode,
                LastMessage = momoResponse.Data.Message,
                RawResponse = JsonSerializer.Serialize(momoResponse.Data, JsonOptions)
            })
        };

        _dbContext.Payments.Add(payment);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return ApiResult<MomoPaymentCreateResponseDto>.Created(
            MapCreateResponse(payment, ParseMetadata(payment.ProviderResponse), null, booking.Id),
            "Tạo payment MoMo đặt cọc thành công.",
            "MOMO_CREATE_DEPOSIT_PAYMENT_SUCCESS");
    }

    public async Task<ApiResult<PaymentStatusResponseDto>> GetPaymentStatusAsync(
    int paymentId,
    CancellationToken cancellationToken = default)
{
    var payment = await _dbContext.Payments.FirstOrDefaultAsync(x => x.Id == paymentId, cancellationToken);
    if (payment is null)
    {
        return ApiResult<PaymentStatusResponseDto>.Fail(
            StatusCodes.Status404NotFound,
            "PAYMENT_NOT_FOUND",
            $"Không tìm thấy payment id = {paymentId}.");
    }

    var metadata = ParseMetadata(payment.ProviderResponse);

    // Quan trọng:
    // Nếu payment MoMo còn PENDING/REPLACED thì gọi MoMo query API để lấy trạng thái thật.
    // Như vậy dù IPN/return bị miss do ngrok offline, bấm "Kiểm tra trạng thái" vẫn update được DB.
    if (IsMomoPayment(payment) && ShouldQueryMomoGateway(payment) && IsConfigured())
    {
        var queryResult = await CallQueryPaymentAsync(payment, metadata, cancellationToken);
        if (!queryResult.Success)
        {
            return ApiResult<PaymentStatusResponseDto>.Fail(
                queryResult.StatusCode,
                queryResult.Code,
                queryResult.Message,
                queryResult.Details);
        }

        if (queryResult.Data is not null)
        {
            var fakeIpn = ConvertQueryToIpnLikeResult(queryResult.Data, payment, metadata);
            var rawQuery = JsonSerializer.Serialize(queryResult.Data, JsonOptions);

            var applyResult = await ApplyMomoResultAsync(
                payment,
                metadata,
                fakeIpn,
                "QUERY",
                rawQuery,
                cancellationToken);

            if (!applyResult.Success)
            {
                return ApiResult<PaymentStatusResponseDto>.Fail(
                    applyResult.StatusCode,
                    applyResult.Code,
                    applyResult.Message,
                    applyResult.Details);
            }

            metadata = ParseMetadata(payment.ProviderResponse) ?? metadata;
        }
    }

    var dto = MapStatus(payment, metadata);

    return ApiResult<PaymentStatusResponseDto>.Ok(
        dto,
        "Lấy trạng thái payment thành công.",
        "PAYMENT_STATUS_SUCCESS");
}

    public async Task<ApiResult<object>> HandleIpnAsync(
    MomoIpnRequestDto request,
    CancellationToken cancellationToken = default)
{
    if (!VerifyIpnSignature(request))
    {
        _logger.LogWarning(
            "MoMo callback/IPN signature invalid for orderId={OrderId}, requestId={RequestId}",
            request.OrderId,
            request.RequestId);

        return ApiResult<object>.Fail(
            StatusCodes.Status400BadRequest,
            "MOMO_INVALID_SIGNATURE",
            "Chữ ký callback/IPN của MoMo không hợp lệ.");
    }

    var payment = await _dbContext.Payments
        .FirstOrDefaultAsync(x => x.TransactionCode == request.OrderId && x.GatewayName == "MOMO", cancellationToken);

    if (payment is null)
    {
        _logger.LogWarning("MoMo payment not found for orderId={OrderId}", request.OrderId);

        return ApiResult<object>.Fail(
            StatusCodes.Status404NotFound,
            "PAYMENT_NOT_FOUND",
            $"Không tìm thấy payment cho orderId = {request.OrderId}.");
    }

    var metadata = ParseMetadata(payment.ProviderResponse);
    var rawPayload = JsonSerializer.Serialize(request, JsonOptions);

    return await ApplyMomoResultAsync(
        payment,
        metadata,
        request,
        "IPN_OR_RETURN",
        rawPayload,
        cancellationToken);
}

    public ApiResult<object> ValidateReturn(MomoIpnRequestDto request)
    {
        if (!VerifyIpnSignature(request))
        {
            return ApiResult<object>.Fail(
                StatusCodes.Status400BadRequest,
                "MOMO_INVALID_SIGNATURE",
                "Chữ ký callback của MoMo không hợp lệ.");
        }

        return ApiResult<object>.Ok(
            new
            {
                orderId = request.OrderId,
                requestId = request.RequestId,
                amount = request.Amount,
                resultCode = request.ResultCode,
                message = request.Message,
                transId = request.TransId,
                payType = request.PayType
            },
            "Xác thực callback MoMo thành công.",
            "MOMO_RETURN_VALID");
    }
    private async Task<ApiResult<object>> ApplyMomoResultAsync(
    Payment payment,
    MomoPaymentMetadata? metadata,
    MomoIpnRequestDto request,
    string source,
    string? rawPayload,
    CancellationToken cancellationToken)
{
    metadata ??= ParseMetadata(payment.ProviderResponse) ?? new MomoPaymentMetadata();

    metadata.OrderId = request.OrderId;
    metadata.RequestId = request.RequestId;
    metadata.MomoTransId = request.TransId;
    metadata.LastResultCode = request.ResultCode;
    metadata.LastMessage = request.Message;

    if (string.Equals(source, "QUERY", StringComparison.OrdinalIgnoreCase))
    {
        metadata.RawResponse = rawPayload;
    }
    else
    {
        metadata.RawIpn = rawPayload;
    }

    if (request.Amount > 0 && (long)Money(payment.AmountPaid) != request.Amount)
    {
        _logger.LogWarning(
            "MoMo amount mismatch. paymentId={PaymentId}, dbAmount={DbAmount}, momoAmount={MomoAmount}",
            payment.Id,
            payment.AmountPaid,
            request.Amount);

        return ApiResult<object>.Fail(
            StatusCodes.Status409Conflict,
            "MOMO_AMOUNT_MISMATCH",
            "Số tiền MoMo trả về không khớp với payment trong DB.",
            new
            {
                paymentId = payment.Id,
                dbAmount = payment.AmountPaid,
                momoAmount = request.Amount,
                orderId = request.OrderId
            });
    }

    if (Normalize(payment.Status) == "SUCCESS")
    {
        return ApiResult<object>.Ok(
            new
            {
                paymentId = payment.Id,
                orderId = request.OrderId,
                transId = request.TransId,
                status = payment.Status,
                source
            },
            "Payment đã được xử lý trước đó.",
            "PAYMENT_ALREADY_PROCESSED");
    }

    payment.PaymentDate = DateTime.UtcNow;
    payment.ProviderResponse = SerializeMetadata(metadata);

    if (request.ResultCode == 0)
    {
        payment.Status = "SUCCESS";
        payment.PaymentMethod = "MOMO";
        payment.GatewayName = "MOMO";
        payment.TransactionCode = request.OrderId;

        await _dbContext.SaveChangesAsync(cancellationToken);

        if (payment.InvoiceId.HasValue)
        {
            var finalizeResult = await _invoiceService.FinalizeAsync(
                payment.InvoiceId.Value,
                new FinalizeInvoiceRequestDto
                {
                    PaymentMethod = "MOMO",
                    TransactionCode = request.OrderId,
                    Note = $"MoMo {source} success. transId={request.TransId}; payType={request.PayType}; msg={request.Message}"
                },
                null,

                null,
                cancellationToken);

            if (!finalizeResult.Success && finalizeResult.Code != "INVOICE_ALREADY_PAID")
            {
                payment.Status = "FAILED_FINALIZE";
                payment.ProviderResponse = SerializeMetadata(metadata);
                await _dbContext.SaveChangesAsync(cancellationToken);

                return ApiResult<object>.Fail(
                    StatusCodes.Status409Conflict,
                    "INVOICE_FINALIZE_FAILED",
                    finalizeResult.Message,
                    finalizeResult.Details);
            }

            // InvoiceService có thể ghi đè ProviderResponse thành Note.
            // Ghi lại metadata MoMo để lần sau còn xem được payUrl/orderId/transId.
            await SaveMomoSuccessMetadataAsync(payment.Id, metadata, request, cancellationToken);
        }
        else if (metadata.Type == "BOOKING_DEPOSIT" && metadata.BookingId.HasValue)
        {
            var depositResult = await _bookingManagementService.AddDepositAsync(metadata.BookingId.Value, payment.AmountPaid);
            if (!depositResult.Success)
            {
                payment.Status = "FAILED_DEPOSIT";
                payment.ProviderResponse = SerializeMetadata(metadata);
                await _dbContext.SaveChangesAsync(cancellationToken);

                return ApiResult<object>.Fail(
                    StatusCodes.Status409Conflict,
                    "BOOKING_DEPOSIT_APPLY_FAILED",
                    depositResult.Message);
            }

            await SaveMomoSuccessMetadataAsync(payment.Id, metadata, request, cancellationToken);
        }

        return ApiResult<object>.Ok(
            new
            {
                paymentId = payment.Id,
                orderId = request.OrderId,
                transId = request.TransId,
                resultCode = request.ResultCode,
                status = "SUCCESS",
                source
            },
            "MoMo xác nhận giao dịch thành công. DB đã được cập nhật.",
            "MOMO_PAYMENT_SUCCESS");
    }

    if (IsPendingMomoResultCode(request.ResultCode))
    {
        // Không đổi REPLACED về PENDING nếu đây là link cũ đã bị tạo lại.
        if (Normalize(payment.Status) != "REPLACED")
        {
            payment.Status = "PENDING";
        }

        payment.ProviderResponse = SerializeMetadata(metadata);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return ApiResult<object>.Ok(
            new
            {
                paymentId = payment.Id,
                orderId = request.OrderId,
                resultCode = request.ResultCode,
                message = request.Message,
                status = payment.Status,
                source
            },
            "MoMo báo giao dịch vẫn đang chờ xử lý.",
            "MOMO_PAYMENT_STILL_PENDING");
    }

    payment.Status = "FAILED";
    payment.ProviderResponse = SerializeMetadata(metadata);
    await _dbContext.SaveChangesAsync(cancellationToken);

    return ApiResult<object>.Ok(
        new
        {
            paymentId = payment.Id,
            orderId = request.OrderId,
            resultCode = request.ResultCode,
            message = request.Message,
            status = payment.Status,
            source
        },
        "MoMo báo giao dịch thất bại hoặc bị hủy.",
        "MOMO_PAYMENT_FAILED");
}

private async Task SaveMomoSuccessMetadataAsync(
    int paymentId,
    MomoPaymentMetadata metadata,
    MomoIpnRequestDto request,
    CancellationToken cancellationToken)
{
    var payment = await _dbContext.Payments.FirstOrDefaultAsync(x => x.Id == paymentId, cancellationToken);
    if (payment is null)
    {
        return;
    }

    payment.Status = "SUCCESS";
    payment.PaymentMethod = "MOMO";
    payment.GatewayName = "MOMO";
    payment.TransactionCode = request.OrderId;
    payment.PaymentDate = DateTime.UtcNow;
    payment.ProviderResponse = SerializeMetadata(metadata);

    await _dbContext.SaveChangesAsync(cancellationToken);
}

private async Task<ApiResult<MomoQueryResponse>> CallQueryPaymentAsync(
    Payment payment,
    MomoPaymentMetadata? metadata,
    CancellationToken cancellationToken)
{
    var orderId = metadata?.OrderId;
    if (string.IsNullOrWhiteSpace(orderId))
    {
        orderId = payment.TransactionCode;
    }

    if (string.IsNullOrWhiteSpace(orderId))
    {
        return ApiResult<MomoQueryResponse>.Fail(
            StatusCodes.Status400BadRequest,
            "MOMO_ORDER_ID_MISSING",
            "Payment không có orderId để query MoMo.");
    }

    var requestId = metadata?.RequestId;
    if (string.IsNullOrWhiteSpace(requestId))
    {
        requestId = Guid.NewGuid().ToString("D");
    }

    var rawSignature =
        $"accessKey={_options.AccessKey}&orderId={orderId}&partnerCode={_options.PartnerCode}&requestId={requestId}";

    var queryRequest = new MomoQueryRequest
    {
        PartnerCode = _options.PartnerCode,
        OrderId = orderId,
        RequestId = requestId,
        Lang = _options.Lang,
        Signature = Sign(rawSignature, _options.SecretKey)
    };

    try
    {
        var client = _httpClientFactory.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(30);

        using var httpResponse = await client.PostAsJsonAsync(
            _options.QueryEndpoint,
            queryRequest,
            JsonOptions,
            cancellationToken);

        var body = await httpResponse.Content.ReadAsStringAsync(cancellationToken);
        _logger.LogInformation("MoMo query raw response for orderId={OrderId}: {Body}", orderId, body);

        if (!httpResponse.IsSuccessStatusCode)
        {
            return ApiResult<MomoQueryResponse>.Fail(
                (int)httpResponse.StatusCode,
                "MOMO_QUERY_HTTP_ERROR",
                $"MoMo query trả HTTP {(int)httpResponse.StatusCode}.",
                new { responseBody = body });
        }

        var result = JsonSerializer.Deserialize<MomoQueryResponse>(body, JsonOptions);
        if (result is null)
        {
            return ApiResult<MomoQueryResponse>.Fail(
                StatusCodes.Status502BadGateway,
                "MOMO_QUERY_EMPTY_RESPONSE",
                "MoMo query trả response rỗng hoặc parse thất bại.",
                new { responseBody = body });
        }

        return ApiResult<MomoQueryResponse>.Ok(
            result,
            "Query trạng thái MoMo thành công.",
            "MOMO_QUERY_SUCCESS");
    }
    catch (TaskCanceledException ex) when (!cancellationToken.IsCancellationRequested)
    {
        _logger.LogError(ex, "Timeout when querying MoMo payment status for orderId={OrderId}", orderId);

        return ApiResult<MomoQueryResponse>.Fail(
            StatusCodes.Status504GatewayTimeout,
            "MOMO_QUERY_TIMEOUT",
            "Gọi MoMo query bị timeout.");
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Unexpected error when querying MoMo payment status for orderId={OrderId}", orderId);

        return ApiResult<MomoQueryResponse>.Fail(
            StatusCodes.Status502BadGateway,
            "MOMO_QUERY_FAILED",
            "Không query được trạng thái MoMo.",
            new { error = ex.Message });
    }
}

private MomoIpnRequestDto ConvertQueryToIpnLikeResult(
    MomoQueryResponse query,
    Payment payment,
    MomoPaymentMetadata? metadata)
{
    var orderId = !string.IsNullOrWhiteSpace(query.OrderId)
        ? query.OrderId!
        : metadata?.OrderId ?? payment.TransactionCode ?? string.Empty;

    var requestId = !string.IsNullOrWhiteSpace(query.RequestId)
        ? query.RequestId!
        : metadata?.RequestId ?? Guid.NewGuid().ToString("D");

    var amount = query.Amount > 0
        ? query.Amount
        : (long)payment.AmountPaid;

    return new MomoIpnRequestDto
    {
        PartnerCode = query.PartnerCode ?? _options.PartnerCode,
        OrderId = orderId,
        RequestId = requestId,
        Amount = amount,
        OrderInfo = metadata?.Type ?? string.Empty,
        OrderType = query.OrderType ?? string.Empty,
        TransId = query.TransId,
        ResultCode = query.ResultCode,
        Message = query.Message ?? string.Empty,
        PayType = query.PayType ?? string.Empty,
        ResponseTime = query.ResponseTime,
        ExtraData = query.ExtraData ?? string.Empty,
        Signature = query.Signature ?? string.Empty
    };
}

private static bool IsMomoPayment(Payment payment)
{
    return Normalize(payment.GatewayName) == "MOMO"
        || Normalize(payment.PaymentMethod) == "MOMO";
}

private static bool ShouldQueryMomoGateway(Payment payment)
{
    var status = Normalize(payment.Status);

    return status is "PENDING"
        or "REPLACED"
        or "FAILEDFINALIZE"
        or "FAILEDDEPOSIT";
}

private static bool IsPendingMomoResultCode(int resultCode)
{
    return resultCode is 1000 or 7000 or 7002;
}

    private async Task<ApiResult<MomoCreateResponse>> CallCreatePaymentAsync(
        MomoCreateRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(30);

            using var httpResponse = await client.PostAsJsonAsync(_options.ApiEndpoint, request, JsonOptions, cancellationToken);
            var body = await httpResponse.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogInformation("MoMo create raw response: {Body}", body);
            var result = JsonSerializer.Deserialize<MomoCreateResponse>(body, JsonOptions);

            if (!httpResponse.IsSuccessStatusCode)
            {
                return ApiResult<MomoCreateResponse>.Fail(
                    (int)httpResponse.StatusCode,
                    "MOMO_CREATE_HTTP_ERROR",
                    $"MoMo trả HTTP {(int)httpResponse.StatusCode}.",
                    new { responseBody = body });
            }

            if (result is null)
            {
                return ApiResult<MomoCreateResponse>.Fail(
                    StatusCodes.Status502BadGateway,
                    "MOMO_EMPTY_RESPONSE",
                    "MoMo trả response rỗng hoặc parse thất bại.",
                    new { responseBody = body });
            }

            if (result.ResultCode != 0)
            {
                return ApiResult<MomoCreateResponse>.Fail(
                    StatusCodes.Status502BadGateway,
                    "MOMO_CREATE_FAILED",
                    result.Message ?? "MoMo create payment thất bại.",
                    result);
            }

            return ApiResult<MomoCreateResponse>.Ok(
                result,
                "MoMo create payment thành công.",
                "MOMO_CREATE_SUCCESS");
        }
        catch (TaskCanceledException ex) when (!cancellationToken.IsCancellationRequested)
        {
            _logger.LogError(ex, "Timeout when calling MoMo create payment API");
            return ApiResult<MomoCreateResponse>.Fail(
                StatusCodes.Status504GatewayTimeout,
                "MOMO_TIMEOUT",
                "Gọi MoMo bị timeout.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error when calling MoMo create payment API");
            return ApiResult<MomoCreateResponse>.Fail(
                StatusCodes.Status502BadGateway,
                "MOMO_CALL_FAILED",
                "Không gọi được API MoMo.",
                new { error = ex.Message });
        }
    }

    private MomoCreateRequest BuildCreateRequest(
        string orderId,
        string requestId,
        decimal amount,
        string orderInfo,
        string extraData)
    {
        var redirectUrl = CombineUrl(_options.PublicBaseUrl, _options.ReturnPath);
        var ipnUrl = CombineUrl(_options.PublicBaseUrl, _options.IpnPath);

        var rawSignature =
            $"accessKey={_options.AccessKey}&amount={((long)amount).ToString(CultureInfo.InvariantCulture)}&extraData={extraData}" +
            $"&ipnUrl={ipnUrl}&orderId={orderId}&orderInfo={orderInfo}&partnerCode={_options.PartnerCode}" +
            $"&redirectUrl={redirectUrl}&requestId={requestId}&requestType={_options.RequestType}";

        return new MomoCreateRequest
        {
            PartnerCode = _options.PartnerCode,
            PartnerName = _options.StoreName,
            StoreId = _options.StoreId,
            RequestId = requestId,
            Amount = (long)amount,
            OrderId = orderId,
            OrderInfo = orderInfo,
            RedirectUrl = redirectUrl,
            IpnUrl = ipnUrl,
            RequestType = _options.RequestType,
            ExtraData = extraData,
            Lang = _options.Lang,
            AutoCapture = true,
            Signature = Sign(rawSignature, _options.SecretKey)
        };
    }

    private bool VerifyIpnSignature(MomoIpnRequestDto request)
    {
        var rawSignature =
            $"accessKey={_options.AccessKey}&amount={request.Amount.ToString(CultureInfo.InvariantCulture)}&extraData={request.ExtraData}" +
            $"&message={request.Message}&orderId={request.OrderId}&orderInfo={request.OrderInfo}" +
            $"&orderType={request.OrderType}&partnerCode={request.PartnerCode}&payType={request.PayType}" +
            $"&requestId={request.RequestId}&responseTime={request.ResponseTime.ToString(CultureInfo.InvariantCulture)}" +
            $"&resultCode={request.ResultCode.ToString(CultureInfo.InvariantCulture)}&transId={request.TransId.ToString(CultureInfo.InvariantCulture)}";

        var expected = Sign(rawSignature, _options.SecretKey);
        return string.Equals(expected, request.Signature, StringComparison.OrdinalIgnoreCase);
    }

    private PaymentStatusResponseDto MapStatus(Payment payment, MomoPaymentMetadata? metadata)
    {
        return new PaymentStatusResponseDto
        {
            PaymentId = payment.Id,
            Status = payment.Status,
            PaymentMethod = payment.PaymentMethod ?? string.Empty,
            GatewayName = payment.GatewayName ?? string.Empty,
            AmountPaid = payment.AmountPaid,
            TransactionCode = payment.TransactionCode,
            InvoiceId = payment.InvoiceId,
            BookingId = metadata?.BookingId,
            ReferenceType = metadata?.Type ?? string.Empty,
            PayUrl = metadata?.PayUrl,
            QrCodeUrl = metadata?.QrCodeUrl,
            Deeplink = metadata?.Deeplink,
            PaymentDate = payment.PaymentDate,
            CreatedAt = payment.CreatedAt
        };
    }

    private MomoPaymentCreateResponseDto MapCreateResponse(
        Payment payment,
        MomoPaymentMetadata? metadata,
        int? invoiceId,
        int? bookingId)
    {
        return new MomoPaymentCreateResponseDto
        {
            PaymentId = payment.Id,
            InvoiceId = invoiceId ?? payment.InvoiceId,
            BookingId = bookingId ?? metadata?.BookingId,
            OrderId = metadata?.OrderId ?? payment.TransactionCode ?? string.Empty,
            RequestId = metadata?.RequestId ?? string.Empty,
            Amount = (long)payment.AmountPaid,
            PayUrl = metadata?.PayUrl,
            QrCodeUrl = metadata?.QrCodeUrl,
            Deeplink = metadata?.Deeplink,
            Status = payment.Status,
            PaymentMethod = payment.PaymentMethod ?? "MOMO"
        };
    }

    private decimal CalculateInvoiceAmountDue(Invoice invoice)
    {
        var grossTotal = Money(invoice.FinalTotal ?? 0m);
        var depositApplied = CalculateDepositApplied(invoice.Booking, invoice);
        return Money(Math.Max(0m, grossTotal - depositApplied));
    }

    private decimal CalculateDepositApplied(Booking? booking, Invoice invoice)
    {
        if (booking is null || booking.DepositAmount <= 0)
        {
            return 0m;
        }

        var selectedDetailIds = invoice.InvoiceBookingDetails
            .Select(x => x.BookingDetailId)
            .Distinct()
            .ToList();

        var selectedDetails = booking.BookingDetails
            .Where(x => selectedDetailIds.Contains(x.Id))
            .ToList();

        var selectedRoomTotal = Money(selectedDetails.Sum(CalculateRoomLineAmount));
        var wholeBookingRoomTotal = Money(booking.BookingDetails.Sum(CalculateRoomLineAmount));

        if (wholeBookingRoomTotal <= 0 || selectedRoomTotal <= 0)
        {
            return Money(Math.Max(0, booking.DepositAmount));
        }

        var applied = booking.DepositAmount * (selectedRoomTotal / wholeBookingRoomTotal);
        return Money(Math.Min(Math.Max(0, booking.DepositAmount), applied));
    }

    private static decimal CalculateRoomLineAmount(BookingDetail detail)
    {
        if (detail.LineTotal > 0)
        {
            return Money(detail.LineTotal);
        }

        var nights = detail.Nights > 0
            ? detail.Nights
            : Math.Max(1, (detail.CheckOutDate.Date - detail.CheckInDate.Date).Days);

        return Money((detail.PricePerNight * nights) + detail.EarlyCheckInFee + detail.LateCheckOutFee);
    }

    private static decimal Money(decimal value)
        => Math.Round(value, 2, MidpointRounding.AwayFromZero);

    private static string Normalize(string? value)
        => string.IsNullOrWhiteSpace(value)
            ? string.Empty
            : value.Trim()
                .Replace("-", string.Empty)
                .Replace("_", string.Empty)
                .Replace(" ", string.Empty)
                .ToUpperInvariant();
    private static string BuildOrderId(string prefix, int referenceId)
        => $"{prefix}.{referenceId}.{Guid.NewGuid():N}";

    private static string BuildOrderInfo(string raw)
    {
        raw = raw.Trim();
        return raw.Length <= 255 ? raw : raw[..255];
    }

    private static string BuildExtraData(MomoPaymentMetadata metadata)
    {
        var json = JsonSerializer.Serialize(metadata, JsonOptions);
        return Convert.ToBase64String(Encoding.UTF8.GetBytes(json));
    }

    private static string SerializeMetadata(MomoPaymentMetadata metadata)
        => JsonSerializer.Serialize(metadata, JsonOptions);

    private static MomoPaymentMetadata? ParseMetadata(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return null;
        }

        try
        {
            return JsonSerializer.Deserialize<MomoPaymentMetadata>(raw, JsonOptions);
        }
        catch
        {
            return null;
        }
    }

    private static string Sign(string rawData, string secretKey)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secretKey));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(rawData));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    private static string CombineUrl(string baseUrl, string path)
    {
        baseUrl = (baseUrl ?? string.Empty).TrimEnd('/');
        path = string.IsNullOrWhiteSpace(path) ? string.Empty : "/" + path.Trim('/');
        return baseUrl + path;
    }

    private bool IsConfigured()
    => _options.Enabled
       && !string.IsNullOrWhiteSpace(_options.ApiEndpoint)
       && !string.IsNullOrWhiteSpace(_options.QueryEndpoint)
       && !string.IsNullOrWhiteSpace(_options.PartnerCode)
       && !string.IsNullOrWhiteSpace(_options.AccessKey)
       && !string.IsNullOrWhiteSpace(_options.SecretKey)
       && !string.IsNullOrWhiteSpace(_options.PublicBaseUrl);
}