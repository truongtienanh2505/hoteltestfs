namespace HotelERP.BE.DTOs.Configurations;

public class MomoOptions
{
    public const string SectionName = "Momo";

    public bool Enabled { get; set; }
    public string ApiEndpoint { get; set; } = "https://test-payment.momo.vn/v2/gateway/api/create";
    public string QueryEndpoint { get; set; } = "https://test-payment.momo.vn/v2/gateway/api/query";

    public string PartnerCode { get; set; } = string.Empty;
    public string AccessKey { get; set; } = string.Empty;
    public string SecretKey { get; set; } = string.Empty;

    public string StoreName { get; set; } = "Hotel ERP";
    public string StoreId { get; set; } = "HotelERP";
    public string RequestType { get; set; } = "captureWallet";
    public string Lang { get; set; } = "vi";

    public string PublicBaseUrl { get; set; } = "https://localhost:7100";
    public string IpnPath { get; set; } = "/api/payments/momo/ipn";
    public string ReturnPath { get; set; } = "/api/payments/momo/return";

    public string ClientInvoiceResultUrl { get; set; } = string.Empty;
    public string ClientDepositResultUrl { get; set; } = string.Empty;
}