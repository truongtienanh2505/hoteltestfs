namespace HotelERP.BE.DTOs.RoomTypes;

public class RoomPricePreviewResponseDto
{
    public int RoomTypeId { get; set; }

    public string RoomTypeName { get; set; } = string.Empty;

    public DateTime CheckInAt { get; set; }

    public DateTime CheckOutAt { get; set; }

    public string StandardCheckInTime { get; set; } = string.Empty;

    public string StandardCheckOutTime { get; set; } = string.Empty;

    public bool IsEarlyCheckIn { get; set; }

    public bool IsLateCheckOut { get; set; }

    public int Nights { get; set; }

    public decimal PricePerNight { get; set; }

    public decimal RoomAmount { get; set; }

    public decimal EarlyCheckInFeePercent { get; set; }

    public decimal LateCheckOutFeePercent { get; set; }

    public decimal EarlyCheckInFee { get; set; }

    public decimal LateCheckOutFee { get; set; }

    public decimal TotalAmount { get; set; }
}