namespace HotelERP.BE.DTOs.Configurations;

public class LoyaltyPointsOptions
{
    public const string SectionName = "LoyaltyPoints";

    public decimal MoneyPerPoint { get; set; } = 10000m;

    public string AmountSource { get; set; } = "FINAL_AMOUNT";
    // FINAL_AMOUNT | BOOKING_SUBTOTAL

    public string RoundingMode { get; set; } = "FLOOR";
    // FLOOR | ROUND | CEILING

    public decimal MinimumEligibleAmount { get; set; } = 0m;

    public bool AutoUpdateMembership { get; set; } = true;
}