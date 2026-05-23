namespace HotelERP.BE.DTOs.Invoices;

public class EligibleBookingDetailResponseDto
{
    public int BookingDetailId { get; set; }
    public int BookingId { get; set; }

    public int? RoomId { get; set; }
    public string RoomNumber { get; set; } = string.Empty;

    public int? RoomTypeId { get; set; }
    public string? RoomTypeName { get; set; }

    public DateTime CheckInDate { get; set; }
    public DateTime CheckOutDate { get; set; }

    public int PlannedNights { get; set; }
    public int ActualStayNights { get; set; }

    public decimal RoomCharge { get; set; }
    public decimal ServiceCharge { get; set; }
    public decimal DamageCharge { get; set; }
    public decimal ExtraFeeAmount { get; set; }

    public string CheckoutStatus { get; set; } = string.Empty;
    public string SettlementStatus { get; set; } = string.Empty;

    public bool CanCreateInvoice { get; set; }
    public string? BlockReason { get; set; }

    public int? OpenInvoiceId { get; set; }
    public string? OpenInvoiceCode { get; set; }
}
