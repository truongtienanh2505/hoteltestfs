namespace HotelERP.BE.Application.DTOs.BookingEngine;

public class MultiRoomBookingRequest
{
    public List<BookingRoomItem> Items { get; set; } = new();
    public string GuestName { get; set; } = null!;
    public string GuestEmail { get; set; } = null!;
    public string GuestPhone { get; set; } = null!;
    public string? Notes { get; set; }
    public string? VoucherCode { get; set; }
}

public class BookingRoomItem
{
    public int RoomTypeId { get; set; }
    public int Quantity { get; set; }
    public List<int>? RoomIds { get; set; } // Hỗ trợ lưu chính xác số phòng vật lý do Frontend truyền lên
    public DateTime CheckInDate { get; set; }
    public DateTime CheckOutDate { get; set; }
}