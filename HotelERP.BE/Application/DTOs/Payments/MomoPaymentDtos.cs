using System.Text.Json.Serialization;

namespace HotelERP.BE.DTOs.Payments;

public class CreateMomoInvoicePaymentRequestDto
{
    public string? Note { get; set; }
}

public class CreateMomoBookingDepositPaymentRequestDto
{
    public decimal Amount { get; set; }
    public string? Note { get; set; }
}

public class MomoPaymentCreateResponseDto
{
    public int PaymentId { get; set; }
    public int? InvoiceId { get; set; }
    public int? BookingId { get; set; }
    public string OrderId { get; set; } = string.Empty;
    public string RequestId { get; set; } = string.Empty;
    public long Amount { get; set; }
    public string? PayUrl { get; set; }
    public string? QrCodeUrl { get; set; }
    public string? Deeplink { get; set; }
    public string Status { get; set; } = string.Empty;
    public string PaymentMethod { get; set; } = "MOMO";
}

public class PaymentStatusResponseDto
{
    public int PaymentId { get; set; }
    public string Status { get; set; } = string.Empty;
    public string PaymentMethod { get; set; } = string.Empty;
    public string GatewayName { get; set; } = string.Empty;
    public decimal AmountPaid { get; set; }
    public string? TransactionCode { get; set; }
    public int? InvoiceId { get; set; }
    public int? BookingId { get; set; }
    public string ReferenceType { get; set; } = string.Empty;
    public string? PayUrl { get; set; }
    public string? QrCodeUrl { get; set; }
    public string? Deeplink { get; set; }
    public DateTime PaymentDate { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class MomoCreateRequest
{
    [JsonPropertyName("partnerCode")]
    public string PartnerCode { get; set; } = string.Empty;

    [JsonPropertyName("partnerName")]
    public string PartnerName { get; set; } = string.Empty;

    [JsonPropertyName("storeId")]
    public string StoreId { get; set; } = string.Empty;

    [JsonPropertyName("requestId")]
    public string RequestId { get; set; } = string.Empty;

    [JsonPropertyName("amount")]
    public long Amount { get; set; }

    [JsonPropertyName("orderId")]
    public string OrderId { get; set; } = string.Empty;

    [JsonPropertyName("orderInfo")]
    public string OrderInfo { get; set; } = string.Empty;

    [JsonPropertyName("redirectUrl")]
    public string RedirectUrl { get; set; } = string.Empty;

    [JsonPropertyName("ipnUrl")]
    public string IpnUrl { get; set; } = string.Empty;

    [JsonPropertyName("requestType")]
    public string RequestType { get; set; } = "captureWallet";

    [JsonPropertyName("extraData")]
    public string ExtraData { get; set; } = string.Empty;

    [JsonPropertyName("lang")]
    public string Lang { get; set; } = "vi";

    [JsonPropertyName("autoCapture")]
    public bool AutoCapture { get; set; } = true;

    [JsonPropertyName("signature")]
    public string Signature { get; set; } = string.Empty;
}

public class MomoCreateResponse
{
    [JsonPropertyName("partnerCode")]
    public string? PartnerCode { get; set; }

    [JsonPropertyName("requestId")]
    public string? RequestId { get; set; }

    [JsonPropertyName("orderId")]
    public string? OrderId { get; set; }

    [JsonPropertyName("amount")]
    public long Amount { get; set; }

    [JsonPropertyName("responseTime")]
    public long ResponseTime { get; set; }

    [JsonPropertyName("message")]
    public string? Message { get; set; }

    [JsonPropertyName("resultCode")]
    public int ResultCode { get; set; }

    [JsonPropertyName("payUrl")]
    public string? PayUrl { get; set; }

    [JsonPropertyName("qrCodeUrl")]
    public string? QrCodeUrl { get; set; }

    [JsonPropertyName("deeplink")]
    public string? Deeplink { get; set; }

    [JsonPropertyName("signature")]
    public string? Signature { get; set; }
}

public class MomoIpnRequestDto
{
    [JsonPropertyName("partnerCode")]
    public string PartnerCode { get; set; } = string.Empty;

    [JsonPropertyName("orderId")]
    public string OrderId { get; set; } = string.Empty;

    [JsonPropertyName("requestId")]
    public string RequestId { get; set; } = string.Empty;

    [JsonPropertyName("amount")]
    public long Amount { get; set; }

    [JsonPropertyName("orderInfo")]
    public string OrderInfo { get; set; } = string.Empty;

    [JsonPropertyName("orderType")]
    public string OrderType { get; set; } = string.Empty;

    [JsonPropertyName("transId")]
    public long TransId { get; set; }

    [JsonPropertyName("resultCode")]
    public int ResultCode { get; set; }

    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;

    [JsonPropertyName("payType")]
    public string PayType { get; set; } = string.Empty;

    [JsonPropertyName("responseTime")]
    public long ResponseTime { get; set; }

    [JsonPropertyName("extraData")]
    public string ExtraData { get; set; } = string.Empty;

    [JsonPropertyName("signature")]
    public string Signature { get; set; } = string.Empty;
}

public class MomoPaymentMetadata
{
    public string Type { get; set; } = string.Empty;
    public int? InvoiceId { get; set; }
    public int? BookingId { get; set; }
    public string OrderId { get; set; } = string.Empty;
    public string RequestId { get; set; } = string.Empty;
    public string? PayUrl { get; set; }
    public string? QrCodeUrl { get; set; }
    public string? Deeplink { get; set; }
    public string? Note { get; set; }
    public long? MomoTransId { get; set; }
    public int? LastResultCode { get; set; }
    public string? LastMessage { get; set; }
    public string? RawResponse { get; set; }
    public string? RawIpn { get; set; }
}
public class MomoQueryRequest
{
    [JsonPropertyName("partnerCode")]
    public string PartnerCode { get; set; } = string.Empty;

    [JsonPropertyName("requestId")]
    public string RequestId { get; set; } = string.Empty;

    [JsonPropertyName("orderId")]
    public string OrderId { get; set; } = string.Empty;

    [JsonPropertyName("lang")]
    public string Lang { get; set; } = "vi";

    [JsonPropertyName("signature")]
    public string Signature { get; set; } = string.Empty;
}

public class MomoQueryResponse
{
    [JsonPropertyName("partnerCode")]
    public string? PartnerCode { get; set; }

    [JsonPropertyName("requestId")]
    public string? RequestId { get; set; }

    [JsonPropertyName("orderId")]
    public string? OrderId { get; set; }

    [JsonPropertyName("amount")]
    public long Amount { get; set; }

    [JsonPropertyName("transId")]
    public long TransId { get; set; }

    [JsonPropertyName("resultCode")]
    public int ResultCode { get; set; }

    [JsonPropertyName("message")]
    public string? Message { get; set; }

    [JsonPropertyName("payType")]
    public string? PayType { get; set; }

    [JsonPropertyName("responseTime")]
    public long ResponseTime { get; set; }

    [JsonPropertyName("extraData")]
    public string? ExtraData { get; set; }

    [JsonPropertyName("orderType")]
    public string? OrderType { get; set; }

    [JsonPropertyName("signature")]
    public string? Signature { get; set; }
}