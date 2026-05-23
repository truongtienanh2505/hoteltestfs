namespace HotelERP.BE.DTOs.Loyalty;

public class LoyaltyPointAwardResultDto
{
    public int BookingId { get; set; }

    public int UserId { get; set; }

    public decimal EligibleAmount { get; set; }

    public int PointsAdded { get; set; }

    public int LoyaltyPointsBefore { get; set; }

    public int LoyaltyPointsAfter { get; set; }

    public int? MembershipIdBefore { get; set; }

    public int? MembershipIdAfter { get; set; }

    public int LoyaltyHistoryId { get; set; }

    public string AppliedRule { get; set; } = string.Empty;

    public DateTime ProcessedAt { get; set; }
}