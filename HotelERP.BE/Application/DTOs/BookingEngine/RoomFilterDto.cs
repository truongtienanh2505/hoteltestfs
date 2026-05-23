namespace HotelERP.BE.Application.DTOs.BookingEngine    
{
    public class RoomFilterDto
    {
        public decimal? MinPrice { get; set; }
        public decimal? MaxPrice { get; set; }
        public int? Capacity { get; set; } // Sức chứa (số người)
        public List<int>? AmenityIds { get; set; } // Danh sách ID các tiện ích muốn lọc (Wifi, Hồ bơi...)
    }
}