namespace HotelERP.BE.Application.DTOs.OrderService;

// ===================================================
// REQUEST DTOs
// ===================================================

/// <summary>Một mục dịch vụ trong đơn hàng</summary>
public class OrderServiceItemRequest
{
    public int ServiceId { get; set; }
    public int Quantity { get; set; } = 1;
    public string? Notes { get; set; }
}

/// <summary>
/// Body tạo đơn dịch vụ mới.
/// - Khách đang lưu trú: truyền BookingDetailId.
/// - Khách vãng lai (POS): BookingDetailId = null, GuestName tùy chọn.
/// </summary>
public class CreateOrderServiceRequest
{
    public int? BookingDetailId { get; set; }
    public string? GuestName { get; set; }
    public List<OrderServiceItemRequest> Items { get; set; } = new();
    public string? Notes { get; set; }
}

/// <summary>
/// Body cập nhật trạng thái đơn dịch vụ.
/// Luồng hợp lệ: Booked → InProgress → Completed; Booked/InProgress → Cancelled
/// </summary>
public class UpdateOrderStatusRequest
{
    /// <summary>Trạng thái mới: Booked | InProgress | Completed | Cancelled</summary>
    public string NewStatus { get; set; } = null!;
    public string? Notes { get; set; }
}

/// <summary>Body hủy một dòng dịch vụ riêng lẻ trong đơn</summary>
public class CancelOrderDetailRequest
{
    public string? Reason { get; set; }
}

// ===================================================
// RESPONSE DTOs
// ===================================================

/// <summary>Thông tin một dịch vụ</summary>
public class ServiceDto
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public decimal Price { get; set; }
    public string? Unit { get; set; }
    public string? ImageUrl { get; set; }
    public int? CategoryId { get; set; }
    public string? CategoryName { get; set; }
}

/// <summary>Danh mục dịch vụ kèm danh sách services</summary>
public class ServiceCategoryDto
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public List<ServiceDto> Services { get; set; } = new();
}

/// <summary>Một dòng trong đơn dịch vụ</summary>
public class OrderServiceDetailDto
{
    public int DetailId { get; set; }
    public int ServiceId { get; set; }
    public string ServiceName { get; set; } = null!;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal LineTotal { get; set; }
    public string? Notes { get; set; }
    /// <summary>Active | Cancelled</summary>
    public string Status { get; set; } = "Active";
}

/// <summary>Thông tin một đơn dịch vụ trả về client</summary>
public class OrderServiceDto
{
    public int Id { get; set; }
    public string OrderCode { get; set; } = null!;
    public DateTime OrderDate { get; set; }
    public decimal TotalAmount { get; set; }
    public string Status { get; set; } = null!;
    public string? Notes { get; set; }
    /// <summary>true = khách vãng lai (không có phòng); false = khách đang lưu trú</summary>
    public bool IsWalkIn { get; set; }
    public int? BookingDetailId { get; set; }
    /// <summary>Số phòng – chỉ có giá trị khi IsWalkIn = false</summary>
    public string? RoomNumber { get; set; }
    public string? GuestName { get; set; }
    /// <summary>Đã ghi nợ vào folio phòng hay chưa</summary>
    public bool IsPostedToFolio { get; set; }
    public List<OrderServiceDetailDto> Items { get; set; } = new();
}

/// <summary>
/// Kết quả cross-check khách in-house theo số phòng.
/// Dùng để xác minh khách có đang ở phòng đó không trước khi tạo đơn.
/// </summary>
public class GuestCrossCheckDto
{
    public bool IsInHouse { get; set; }
    public string? GuestName { get; set; }
    public string? GuestPhone { get; set; }
    public string? RoomNumber { get; set; }
    public string? RoomTypeName { get; set; }
    public int? BookingDetailId { get; set; }
    public string? BookingCode { get; set; }
    public DateTime? ActualCheckInAt { get; set; }
    public DateTime? ExpectedCheckOut { get; set; }
}

/// <summary>Kết quả ghi nợ vào folio phòng</summary>
public class PostToFolioResult
{
    public bool Success { get; set; }
    public string Message { get; set; } = null!;
    public string? InvoiceCode { get; set; }
    public decimal? NewTotalServiceAmount { get; set; }
}
