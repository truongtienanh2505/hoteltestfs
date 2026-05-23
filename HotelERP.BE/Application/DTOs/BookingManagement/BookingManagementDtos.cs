namespace HotelERP.BE.Application.DTOs.BookingManagement;

public enum DateFilterType
{
    CheckInDate,
    CheckOutDate,
    BookedDate
}

// ===================================================
// REQUEST DTOs
// ===================================================

/// <summary>
/// Query params cho API Search/Filter bookings
/// GET /api/booking-management
/// </summary>
public class BookingSearchRequest
{
    /// <summary>Tìm theo GuestName, GuestPhone, GuestEmail, BookingCode</summary>
    public string? Keyword { get; set; }

    /// <summary>Filter theo Booking.Status (Pending, Confirmed, Checked_in, ...)</summary>
    public string? Status { get; set; }

    /// <summary>Filter: CheckInDate >= FromDate</summary>
    public DateTime? FromDate { get; set; }

    /// <summary>Filter: CheckInDate <= ToDate</summary>
    public DateTime? ToDate { get; set; }

    /// <summary>Loại ngày muốn query (CheckInDate, CheckOutDate, BookedDate). Mặc định: CheckInDate</summary>
    public DateFilterType FilterType { get; set; } = DateFilterType.CheckInDate;

    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
}

/// <summary>
/// Body cho API cập nhật trạng thái booking
/// PUT /api/booking-management/{id}/status
/// </summary>
public class UpdateBookingStatusRequest
{
    public string NewStatus { get; set; } = null!;
}

/// <summary>
/// Body cho API nạp cọc
/// </summary>
public class DepositRequest
{
    public decimal Amount { get; set; }
}

/// <summary>
/// Body cho API đổi phòng
/// PUT /api/booking-management/details/{id}/change-room
/// </summary>
public class ChangeRoomRequest
{
    public int NewRoomId { get; set; }
}

// ===================================================
// RESPONSE DTOs
// ===================================================

/// <summary>
/// Thông tin tổng quan 1 booking trong danh sách
/// </summary>
public class BookingListItemDto
{
    public int Id { get; set; }
    public string BookingCode { get; set; } = null!;
    public string? GuestName { get; set; }
    public string? GuestPhone { get; set; }
    public string? GuestEmail { get; set; }
    public string Status { get; set; } = null!;
    public DateTime BookedAt { get; set; }
    public decimal FinalAmount { get; set; }
    public decimal DiscountAmount { get; set; }
    public string? VoucherCode { get; set; }
    public decimal DepositAmount { get; set; }
    public string PaymentStatus { get; set; } = null!;
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public List<BookingDetailItemDto> Details { get; set; } = new();
}

/// <summary>
/// Chi tiết từng phòng trong booking
/// </summary>
public class BookingDetailItemDto
{
    public int Id { get; set; }
    public int? RoomId { get; set; }
    public string? RoomNumber { get; set; }
    public string? RoomTypeName { get; set; }
    public DateTime CheckInDate { get; set; }
    public DateTime CheckOutDate { get; set; }
    public decimal PricePerNight { get; set; }
    public int Nights { get; set; }
    public decimal LineTotal { get; set; }
    public string Status { get; set; } = null!;
    public DateTime? ActualCheckInAt { get; set; }
    public DateTime? ActualCheckOutAt { get; set; }
}

/// <summary>
/// Kết quả phân trang generic
/// </summary>
public class PagedResult<T>
{
    public List<T> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
}
