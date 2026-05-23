using HotelERP.BE.Application.DTOs.OrderService;
using HotelERP.BE.Application.Interfaces;
using HotelERP.BE.Domain.Models;
using HotelERP.BE.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HotelERP.BE.Application.Services;

public class OrderServiceManagementService : IOrderServiceManagementService
{
    private readonly HotelDbContext _context;

    // Trạng thái hợp lệ và luồng chuyển đổi
    private static readonly Dictionary<string, List<string>> _allowedTransitions = new()
    {
        { "Booked",     new() { "InProgress", "Cancelled" } },
        { "InProgress", new() { "Completed",  "Cancelled" } },
        // Completed và Cancelled là trạng thái cuối
    };

    public OrderServiceManagementService(HotelDbContext context)
    {
        _context = context;
    }

    // ==============================================================
    // 1. Lấy danh sách dịch vụ ACTIVE nhóm theo danh mục
    // ==============================================================
    public async Task<List<ServiceCategoryDto>> GetAllServicesByCategoryAsync()
    {
        // Dùng AsNoTracking để tránh tracking issue, join rõ ràng thay vì Include
        var rawData = await (
            from svc in _context.Services
            join cat in _context.ServiceCategories on svc.CategoryId equals cat.Id
            where svc.Status == "ACTIVE" && cat.Status == "ACTIVE"
            orderby cat.Name, svc.Name
            select new
            {
                ServiceId = svc.Id,
                ServiceName = svc.Name,
                svc.Description,
                svc.Price,
                svc.Unit,
                svc.ImageUrl,
                svc.CategoryId,
                CategoryId2 = cat.Id,
                CategoryName = cat.Name
            }
        ).AsNoTracking().ToListAsync();

        // Nhóm theo danh mục trong bộ nhớ
        return rawData
            .GroupBy(x => new { x.CategoryId2, x.CategoryName })
            .Select(g => new ServiceCategoryDto
            {
                Id = g.Key.CategoryId2,
                Name = g.Key.CategoryName,
                Services = g.Select(s => new ServiceDto
                {
                    Id = s.ServiceId,
                    Name = s.ServiceName,
                    Description = s.Description,
                    Price = s.Price,
                    Unit = s.Unit,
                    ImageUrl = s.ImageUrl,
                    CategoryId = s.CategoryId,
                    CategoryName = g.Key.CategoryName
                }).ToList()
            })
            .OrderBy(c => c.Name)
            .ToList();
    }

    // ==============================================================
    // 2. Lấy đơn dịch vụ theo BookingDetailId
    // ==============================================================
    public async Task<List<OrderServiceDto>> GetOrdersByBookingDetailAsync(int bookingDetailId)
    {
        var orders = await _context.OrderServices
            .Include(os => os.OrderServiceDetails)
                .ThenInclude(osd => osd.Service)
            .Include(os => os.BookingDetail)
                .ThenInclude(bd => bd!.Booking)
            .Include(os => os.BookingDetail)
                .ThenInclude(bd => bd!.Room)
            .Where(os => os.BookingDetailId == bookingDetailId)
            .OrderByDescending(os => os.OrderDate)
            .ToListAsync();

        return orders.Select(os => MapOrderToDto(os)).ToList();
    }

    // ==============================================================
    // 3. Tạo đơn dịch vụ mới (trạng thái ban đầu: Booked)
    // ==============================================================
    public async Task<(bool Success, string Message, OrderServiceDto? Order)> CreateOrderAsync(CreateOrderServiceRequest request)
    {
        if (request.Items == null || request.Items.Count == 0)
            return (false, "Vui lòng chọn ít nhất một dịch vụ.", null);

        if (request.BookingDetailId.HasValue)
        {
            var detailExists = await _context.BookingDetails
                .AnyAsync(bd => bd.Id == request.BookingDetailId.Value);
            if (!detailExists)
                return (false, $"Không tìm thấy BookingDetail #{request.BookingDetailId}.", null);
        }

        var serviceIds = request.Items.Select(i => i.ServiceId).Distinct().ToList();
        var services = await _context.Services
            .Where(s => serviceIds.Contains(s.Id) && s.Status.ToUpper() == "ACTIVE")
            .ToListAsync();

        if (services.Count != serviceIds.Count)
        {
            var foundIds = services.Select(s => s.Id).ToHashSet();
            var missing = serviceIds.Where(id => !foundIds.Contains(id)).ToList();
            return (false, $"Dịch vụ không hợp lệ: ID [{string.Join(", ", missing)}].", null);
        }

        var orderCode = await GenerateUniqueOrderCodeAsync();
        var details = new List<OrderServiceDetail>();
        decimal totalAmount = 0;

        foreach (var item in request.Items)
        {
            var svc = services.First(s => s.Id == item.ServiceId);
            var qty = Math.Max(item.Quantity, 1);
            var lineTotal = svc.Price * qty;
            totalAmount += lineTotal;
            details.Add(new OrderServiceDetail
            {
                ServiceId = svc.Id,
                Quantity = qty,
                UnitPrice = svc.Price,
                LineTotal = lineTotal,
                Notes = item.Notes
            });
        }

        // Gộp tên khách vãng lai vào notes
        string? finalNotes = null;
        if (!string.IsNullOrWhiteSpace(request.GuestName))
            finalNotes = $"Khách: {request.GuestName.Trim()}";
        if (!string.IsNullOrWhiteSpace(request.Notes))
            finalNotes = string.IsNullOrWhiteSpace(finalNotes)
                ? request.Notes.Trim()
                : $"{finalNotes} | {request.Notes.Trim()}";

        var order = new OrderService
        {
            BookingDetailId = request.BookingDetailId,
            OrderCode = orderCode,
            OrderDate = DateTime.UtcNow,
            TotalAmount = totalAmount,
            Status = "Booked",             // Trạng thái ban đầu theo workflow
            Notes = finalNotes,
            CreatedAt = DateTime.UtcNow,
            OrderServiceDetails = details
        };

        _context.OrderServices.Add(order);
        await _context.SaveChangesAsync();

        // Sau khi tạo đơn, tự động cập nhật TotalServiceAmount trên Invoice Draft (nếu có)
        if (request.BookingDetailId.HasValue)
            await RefreshInvoiceServiceAmountAsync(request.BookingDetailId.Value);

        var createdOrder = await _context.OrderServices
            .Include(os => os.OrderServiceDetails).ThenInclude(osd => osd.Service)
            .Include(os => os.BookingDetail).ThenInclude(bd => bd!.Booking)
            .Include(os => os.BookingDetail).ThenInclude(bd => bd!.Room)
            .FirstAsync(os => os.Id == order.Id);

        return (true, $"Tạo đơn {orderCode} thành công.", MapOrderToDto(createdOrder, request.GuestName));
    }

    // ==============================================================
    // 4. Cập nhật trạng thái đơn dịch vụ
    //    Booked → InProgress → Completed
    //    Booked / InProgress → Cancelled
    // ==============================================================
    public async Task<(bool Success, string Message)> UpdateOrderStatusAsync(int orderId, UpdateOrderStatusRequest request)
    {
        var order = await _context.OrderServices
            .FirstOrDefaultAsync(os => os.Id == orderId);

        if (order == null)
            return (false, $"Không tìm thấy đơn dịch vụ #{orderId}.");

        var newStatus = request.NewStatus?.Trim();
        if (string.IsNullOrWhiteSpace(newStatus))
            return (false, "Trạng thái mới không được để trống.");

        // Kiểm tra chuyển trạng thái hợp lệ
        if (!_allowedTransitions.TryGetValue(order.Status, out var allowed) || !allowed.Contains(newStatus))
            return (false, $"Không thể chuyển từ '{order.Status}' sang '{newStatus}'. " +
                           $"Trạng thái hợp lệ: {string.Join(", ", allowed ?? new List<string>())}.");

        var oldStatus = order.Status;
        order.Status = newStatus;
        order.UpdatedAt = DateTime.UtcNow;

        // Ghi chú thêm nếu có
        if (!string.IsNullOrWhiteSpace(request.Notes))
        {
            order.Notes = string.IsNullOrWhiteSpace(order.Notes)
                ? request.Notes.Trim()
                : $"{order.Notes} | [{newStatus}] {request.Notes.Trim()}";
        }

        await _context.SaveChangesAsync();

        // Refresh invoice nếu đơn gắn với phòng (tổng tiền DV trên invoice cần được cập nhật)
        if (order.BookingDetailId.HasValue)
            await RefreshInvoiceServiceAmountAsync(order.BookingDetailId.Value);

        return (true, $"Đơn {order.OrderCode}: {oldStatus} → {newStatus} thành công.");
    }

    // ==============================================================
    // 5. Cross-check khách in-house theo số phòng
    //    Trả về thông tin khách nếu có, IsInHouse=false nếu phòng trống
    // ==============================================================
    public async Task<GuestCrossCheckDto> CrossCheckGuestByRoomAsync(string roomNumber)
    {
        var detail = await _context.BookingDetails
            .Include(bd => bd.Booking)
            .Include(bd => bd.Room)
            .Include(bd => bd.RoomType)
            .Where(bd =>
                bd.Room != null &&
                bd.Room.RoomNumber == roomNumber.Trim() &&
                bd.Status == "Checked_in")
            .OrderByDescending(bd => bd.ActualCheckInAt)
            .FirstOrDefaultAsync();

        if (detail == null)
            return new GuestCrossCheckDto { IsInHouse = false, RoomNumber = roomNumber };

        return new GuestCrossCheckDto
        {
            IsInHouse = true,
            GuestName = detail.Booking?.GuestName,
            GuestPhone = detail.Booking?.GuestPhone,
            RoomNumber = detail.Room?.RoomNumber,
            RoomTypeName = detail.RoomType?.Name,
            BookingDetailId = detail.Id,
            BookingCode = detail.Booking?.BookingCode,
            ActualCheckInAt = detail.ActualCheckInAt,
            ExpectedCheckOut = detail.CheckOutDate
        };
    }

    // ==============================================================
    // 6. Ghi nợ vào Folio phòng (Post Charge to Folio)
    //    - Đơn phải Completed và gắn BookingDetailId
    //    - Cộng TotalAmount vào Invoice.TotalServiceAmount của phòng
    //    - Trạng thái Invoice vẫn Draft/Unpaid → khách trả khi Check-out
    // ==============================================================
    public async Task<PostToFolioResult> PostChargeToFolioAsync(int orderId)
    {
        var order = await _context.OrderServices
            .Include(os => os.BookingDetail)
                .ThenInclude(bd => bd!.Booking)
            .FirstOrDefaultAsync(os => os.Id == orderId);

        if (order == null)
            return new PostToFolioResult { Success = false, Message = $"Không tìm thấy đơn #{orderId}." };

        if (order.Status != "Completed")
            return new PostToFolioResult { Success = false, Message = "Chỉ có thể ghi nợ khi đơn dịch vụ đã Completed." };

        if (!order.BookingDetailId.HasValue || order.BookingDetail?.Booking == null)
            return new PostToFolioResult { Success = false, Message = "Đơn vãng lai không thể ghi nợ vào folio phòng." };

        // Kiểm tra chưa post trước đó (tránh double-charge)
        // Dùng convention: nếu Notes chứa "[POSTED_TO_FOLIO]" thì đã ghi rồi
        if (order.Notes?.Contains("[POSTED_TO_FOLIO]") == true)
            return new PostToFolioResult { Success = false, Message = "Đơn này đã được ghi nợ vào folio trước đó." };

        var bookingId = order.BookingDetail.Booking.Id;

        // Tìm Invoice Draft của Booking (ưu tiên Draft, nếu không có tạo mới)
        var invoice = await _context.Invoices
            .Where(inv => inv.BookingId == bookingId && inv.Status == "Draft")
            .OrderByDescending(inv => inv.CreatedAt)
            .FirstOrDefaultAsync();

        if (invoice == null)
        {
            // Chưa có Draft invoice → tạo mới
            var invoiceCode = $"INV-SVC-{DateTime.UtcNow:yyyyMMdd}-{Random.Shared.Next(1000, 9999)}";
            invoice = new Invoice
            {
                BookingId = bookingId,
                InvoiceCode = invoiceCode,
                TotalRoomAmount = 0,
                TotalServiceAmount = 0,
                TotalDamageAmount = 0,
                DiscountAmount = 0,
                ManualAdjustmentAmount = 0,
                TaxAmount = 0,
                FinalTotal = 0,
                RefundAmount = 0,
                Status = "Draft",
                Notes = $"Phiếu dịch vụ tự động từ đơn {order.OrderCode}",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.Invoices.Add(invoice);
            await _context.SaveChangesAsync(); // cần ID trước
        }

        // Cộng dồn tiền dịch vụ vào Invoice
        invoice.TotalServiceAmount = (invoice.TotalServiceAmount ?? 0) + order.TotalAmount;
        invoice.FinalTotal = (invoice.TotalRoomAmount ?? 0)
                           + (invoice.TotalServiceAmount ?? 0)
                           + (invoice.TotalDamageAmount ?? 0)
                           - (invoice.DiscountAmount ?? 0)
                           + (invoice.ManualAdjustmentAmount ?? 0)
                           + (invoice.TaxAmount ?? 0);
        invoice.UpdatedAt = DateTime.UtcNow;

        // Đánh dấu đơn đã được post (tránh double-charge)
        order.Notes = string.IsNullOrWhiteSpace(order.Notes)
            ? $"[POSTED_TO_FOLIO] Invoice: {invoice.InvoiceCode}"
            : $"{order.Notes} | [POSTED_TO_FOLIO] Invoice: {invoice.InvoiceCode}";
        order.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return new PostToFolioResult
        {
            Success = true,
            Message = $"Đã ghi nợ {order.TotalAmount:N0}đ vào folio phòng (Invoice: {invoice.InvoiceCode}).",
            InvoiceCode = invoice.InvoiceCode,
            NewTotalServiceAmount = invoice.TotalServiceAmount
        };
    }

    // ==============================================================
    // HELPER: Map entity → DTO
    // ==============================================================
    private static OrderServiceDto MapOrderToDto(OrderService os, string? overrideGuestName = null)
    {
        bool isWalkIn = !os.BookingDetailId.HasValue;
        string? guestName = overrideGuestName;
        if (string.IsNullOrWhiteSpace(guestName))
            guestName = isWalkIn ? null : os.BookingDetail?.Booking?.GuestName;

        bool isPosted = os.Notes?.Contains("[POSTED_TO_FOLIO]") == true;

        return new OrderServiceDto
        {
            Id = os.Id,
            OrderCode = os.OrderCode,
            OrderDate = os.OrderDate,
            TotalAmount = os.TotalAmount,
            Status = os.Status,
            Notes = os.Notes,
            IsWalkIn = isWalkIn,
            BookingDetailId = isWalkIn ? null : os.BookingDetailId,
            RoomNumber = isWalkIn ? null : os.BookingDetail?.Room?.RoomNumber,
            GuestName = guestName,
            IsPostedToFolio = isPosted,
            Items = os.OrderServiceDetails.Select(d => new OrderServiceDetailDto
            {
                DetailId = d.Id,
                ServiceId = d.ServiceId ?? 0,
                ServiceName = d.Service?.Name ?? "N/A",
                Quantity = d.Quantity,
                UnitPrice = d.UnitPrice,
                LineTotal = d.LineTotal,
                Notes = d.Notes,
                Status = d.Status
            }).ToList()
        };
    }

    // ==============================================================
    // 7. Hủy một dòng dịch vụ riêng lẻ (Item-level Cancel)
    // ==============================================================
    public async Task<(bool Success, string Message)> CancelOrderDetailAsync(int detailId, string? reason)
    {
        var detail = await _context.OrderServiceDetails
            .Include(d => d.OrderService)
            .FirstOrDefaultAsync(d => d.Id == detailId);

        if (detail == null)
            return (false, $"Không tìm thấy dòng dịch vụ #{detailId}.");

        if (detail.Status == "Cancelled")
            return (false, "Dòng dịch vụ này đã bị hủy trước đó.");

        var order = detail.OrderService!;

        // Kiểm tra đơn có thể chỉnh sửa
        if (order.Status == "Completed" || order.Status == "Cancelled")
            return (false, $"Đơn đã {order.Status}, không thể hủy từng dịch vụ.");

        // Hủy dòng này
        detail.Status = "Cancelled";
        if (!string.IsNullOrWhiteSpace(reason))
            detail.Notes = string.IsNullOrWhiteSpace(detail.Notes)
                ? $"[Hủy] {reason}"
                : $"{detail.Notes} | [Hủy] {reason}";

        // Tính lại TotalAmount của đơn (chỉ tính các item Active)
        var allDetails = await _context.OrderServiceDetails
            .Where(d => d.OrderServiceId == order.Id)
            .ToListAsync();

        // Cập nhật detail.Status trong memory trước khi tính
        var targetDetail = allDetails.First(d => d.Id == detailId);
        targetDetail.Status = "Cancelled";

        var newTotal = allDetails
            .Where(d => d.Status != "Cancelled")
            .Sum(d => d.LineTotal);

        order.TotalAmount = newTotal;
        order.UpdatedAt = DateTime.UtcNow;

        // Nếu tất cả item bị hủy, tự động Cancel cả đơn
        if (newTotal == 0)
        {
            order.Status = "Cancelled";
            order.Notes = string.IsNullOrWhiteSpace(order.Notes)
                ? "[Tự động] Hủy do toàn bộ dịch vụ bị hủy"
                : $"{order.Notes} | [Tự động] Hủy do toàn bộ dịch vụ bị hủy";
        }

        await _context.SaveChangesAsync();

        // Refresh invoice
        if (order.BookingDetailId.HasValue)
            await RefreshInvoiceServiceAmountAsync(order.BookingDetailId.Value);

        return (true, $"Dòng dịch vụ đã được hủy. Tổng tiền mới: {newTotal:N0}đ.");
    }

    // ==============================================================
    // HELPER: Tạo OrderCode unique SVC-YYYYMMDD-XXXX
    // ==============================================================
    private async Task<string> GenerateUniqueOrderCodeAsync()
    {
        var dateStr = DateTime.UtcNow.ToString("yyyyMMdd");
        for (int i = 0; i < 10; i++)
        {
            var code = $"SVC-{dateStr}-{Random.Shared.Next(1000, 9999)}";
            if (!await _context.OrderServices.AnyAsync(os => os.OrderCode == code))
                return code;
        }
        return $"SVC-{dateStr}-{Guid.NewGuid().ToString("N")[..8].ToUpper()}";
    }

    // ==============================================================
    // HELPER: Cập nhật TotalServiceAmount trên Invoice Draft của booking
    // Gọi sau khi tạo đơn hoặc thay đổi status đơn dịch vụ
    // Tránh phải dùng PostToFolio mới thấy số tiền trên hóa đơn
    // ==============================================================
    private async Task RefreshInvoiceServiceAmountAsync(int bookingDetailId)
    {
        // Lấy BookingId từ BookingDetail
        var bookingDetail = await _context.BookingDetails
            .FirstOrDefaultAsync(bd => bd.Id == bookingDetailId);
        if (bookingDetail?.BookingId == null) return;

        var bookingId = bookingDetail.BookingId.Value;

        // Tìm Invoice Draft đang mở của booking này
        var invoice = await _context.Invoices
            .FirstOrDefaultAsync(inv =>
                inv.BookingId == bookingId &&
                inv.Status == "Draft");
        if (invoice == null) return;

        // Tính tổng tiền dịch vụ từ tất cả OrderServices của booking
        // (trừ Cancelled)
        var allDetails = await _context.BookingDetails
            .Where(bd => bd.BookingId == bookingId)
            .Select(bd => bd.Id)
            .ToListAsync();

        var serviceTotal = await _context.OrderServices
            .Where(os =>
                os.BookingDetailId != null &&
                allDetails.Contains(os.BookingDetailId.Value) &&
                os.Status != "Cancelled" &&
                os.Status != "Canceled")
            .SumAsync(os => os.TotalAmount);

        // Cập nhật invoice
        invoice.TotalServiceAmount = serviceTotal;
        invoice.FinalTotal = (invoice.TotalRoomAmount ?? 0)
                           + serviceTotal
                           + (invoice.TotalDamageAmount ?? 0)
                           - (invoice.DiscountAmount ?? 0)
                           + (invoice.ManualAdjustmentAmount ?? 0)
                           + (invoice.TaxAmount ?? 0);
        invoice.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
    }
}
