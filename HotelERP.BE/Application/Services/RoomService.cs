using Microsoft.EntityFrameworkCore;
using HotelERP.BE.Application.Interfaces;
using HotelERP.BE.Application.DTOs;
using HotelERP.BE.Infrastructure.Data;
using HotelERP.BE.Domain.Models;
using HotelERP.BE.Utils;
using HotelERP.BE.Helpers.AuditLogs;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Http;
using System.Security.Claims;
using HotelERP.BE.DTOs.Hubs;

namespace HotelERP.BE.Application.Services;

public class RoomService : IRoomService
{
    private readonly HotelDbContext? _context;
    private readonly IHubContext<RoomHub>? _hubContext;
    private readonly ICloudinaryService _cloudinary;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public RoomService(HotelDbContext context, ICloudinaryService cloudinary, IHubContext<RoomHub> hubContext, IHttpContextAccessor httpContextAccessor)
    {
        _context = context;
        _hubContext = hubContext;
        _cloudinary = cloudinary;
        _httpContextAccessor = httpContextAccessor;
    }

    private (int userId, string roleName) ResolveUser()
    {
        var user = _httpContextAccessor.HttpContext?.User;
        if (user == null) return (0, "System");

        var userIdClaim = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var roleClaim = user.FindFirst(ClaimTypes.Role)?.Value ?? "User";

        return (int.TryParse(userIdClaim, out var id) ? id : 0, roleClaim);
    }

    private string TranslateRoomStatus(string status)
    {
        return status.ToUpper() switch
        {
            "AVAILABLE" => "Trống",
            "OCCUPIED" => "Đang có khách",
            "MAINTENANCE" => "Bảo trì",
            "OUT_OF_ORDER" => "Hỏng",
            _ => status
        };
    }

    private string TranslateCleaningStatus(string status)
    {
        return status.ToUpper() switch
        {
            "CLEAN" => "Đã dọn",
            "DIRTY" => "Chưa dọn",
            "INSPECTING" => "Chờ kiểm tra",
            _ => status
        };
    }

    public async Task<IEnumerable<RoomResponseDto>> GetRoomsAsync(RoomFilterRequest filter)
    {
        var query = _context!.Rooms.Include(r => r.RoomType).Where(r => r.DeletedAt == null).AsQueryable();

        if (!string.IsNullOrEmpty(filter.Status)) query = query.Where(r => r.Status == filter.Status);
        if (!string.IsNullOrEmpty(filter.CleaningStatus)) query = query.Where(r => r.CleaningStatus == filter.CleaningStatus);
        if (filter.RoomTypeId.HasValue) query = query.Where(r => r.RoomTypeId == filter.RoomTypeId.Value);

        return await query.Select(r => new RoomResponseDto(
            r.Id, r.RoomNumber, r.Floor, r.Status, r.CleaningStatus, r.RoomType != null ? r.RoomType.Name : "N/A", r.RoomTypeId
        )).ToListAsync();
    }

    public async Task<RoomDetailResponseDto?> GetRoomByIdAsync(int roomId)
    {
        var room = await _context!.Rooms.Include(r => r.RoomType)
            .FirstOrDefaultAsync(r => r.Id == roomId && r.DeletedAt == null);
        if (room == null) return null;
        
        return new RoomDetailResponseDto(
            room.Id, room.RoomNumber, room.Status, room.CleaningStatus, 
            room.RoomTypeId, room.RoomType?.Name ?? "N/A", room.RoomType?.BasePrice ?? 0
        );
    }

    public async Task<int> CreateRoomAsync(CreateRoomRequest request)
    {
        var room = new Room { 
            RoomNumber = request.RoomNumber, 
            Floor = request.Floor,
            RoomTypeId = request.RoomTypeId, 
            Status = request.Status.ToUpper(), 
            CleaningStatus = request.CleaningStatus.ToUpper(),
            CreatedAt = DateTime.UtcNow
        };
        _context!.Rooms.Add(room);
        await _context!.SaveChangesAsync();
        return room.Id;
    }

    public async Task<bool> UpdateRoomAsync(int roomId, UpdateRoomRequest request)
    {
        var room = await _context!.Rooms.FindAsync(roomId);
        if (room == null || room.DeletedAt != null) return false;
        room.RoomNumber = request.RoomNumber;
        room.RoomTypeId = request.RoomTypeId;
        room.UpdatedAt = DateTime.UtcNow;
        await _context!.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteRoomAsync(int roomId)
    {
        var room = await _context!.Rooms.FindAsync(roomId);
        if (room == null) return false;
        room.DeletedAt = DateTime.UtcNow;
        room.Status = "OUT_OF_ORDER";
        await _context!.SaveChangesAsync();
        return true;
    }

    public async Task<bool> UpdateCleaningStatusAsync(int roomId, UpdateCleaningStatusRequest request)
    {
        var room = await _context!.Rooms.FindAsync(roomId);
        if (room == null) return false;
        var oldStatus = room.CleaningStatus;
        room.CleaningStatus = request.NewCleaningStatus.ToUpper();
        await _context!.SaveChangesAsync();

        // Ghi Audit Log
        var (userId, roleName) = ResolveUser();
        var translatedNewStatus = TranslateCleaningStatus(room.CleaningStatus);
        
        await _context.AddAuditLogAsync(
            userId: userId,
            roleName: roleName,
            actionType: "UPDATE",
            entityType: "Room",
            message: $"Cập nhật trạng thái dọn dẹp phòng {room.RoomNumber} thành '{translatedNewStatus}'.",
            contextParams: new { roomId, roomNumber = room.RoomNumber },
            changes: new { oldData = new { CleaningStatus = oldStatus }, newData = new { room.CleaningStatus } }
        );

        if (_hubContext != null) 
        {
            await _hubContext.Clients.All.SendAsync("ReceiveRoomStatusUpdate", roomId, room.Status, room.CleaningStatus);
        }

        return true;
    }

    public async Task<bool> UpdateRoomStatusAsync(int roomId, UpdateRoomStatusRequest request)
    {
        var room = await _context!.Rooms.FindAsync(roomId);
        if (room == null) return false;
        
        var oldStatus = room.Status.ToUpper();
        var newStatus = request.NewStatus.ToUpper();

        if (oldStatus == "OCCUPIED" && newStatus != "OCCUPIED")
        {
            throw new InvalidOperationException("Phòng đang có khách lưu trú (Occupied). Vui lòng thực hiện quy trình Trả phòng (Check-out) thay vì đổi trạng thái thủ công!");
        }

        room.Status = newStatus;
        await _context!.SaveChangesAsync();

        // Ghi Audit Log
        var (userId, roleName) = ResolveUser();
        var translatedNewStatus = TranslateRoomStatus(room.Status);

        await _context.AddAuditLogAsync(
            userId: userId,
            roleName: roleName,
            actionType: "UPDATE",
            entityType: "Room",
            message: $"Cập nhật trạng thái kinh doanh phòng {room.RoomNumber} thành '{translatedNewStatus}'.",
            contextParams: new { roomId, roomNumber = room.RoomNumber },
            changes: new { oldData = new { Status = oldStatus }, newData = new { Status = room.Status } }
        );

        if (_hubContext != null) 
        {
            await _hubContext.Clients.All.SendAsync("ReceiveRoomStatusUpdate", roomId, room.Status, room.CleaningStatus);
        }

        return true;
    }

    public async Task<bool> ReportDamageAsync(int userId, string roleName, ReportDamageRequest request)
    {
        var room = await _context!.Rooms.FindAsync(request.RoomId);
        if (room == null || room.DeletedAt != null)
            throw new InvalidOperationException("Phòng không tồn tại.");

        // NGHIỆP VỤ: Cho phép báo hỏng bất kể trạng thái phòng (để nhân viên dọn phòng báo hỏng sau khi khách checkout)
        // Bỏ check "OCCUPIED" cũ ở đây
        // if (room.Status.ToUpper() != "OCCUPIED")
        //     throw new InvalidOperationException($"Không thể báo hỏng cho phòng đang ở trạng thái '{room.Status}'. Tính năng này chỉ dành cho phòng đang có khách lưu trú.");

        var activeBookingDetailId = request.BookingDetailId;
        if (!activeBookingDetailId.HasValue || activeBookingDetailId.Value <= 0)
        {
            activeBookingDetailId = await _context.BookingDetails
                .Include(bd => bd.Booking)
                .Where(bd => bd.RoomId == request.RoomId
                             && bd.ActualCheckOutAt == null
                             && bd.BookingId != null
                             && bd.Booking != null
                             && bd.Booking.Status != "Cancelled")
                .OrderByDescending(bd => bd.ActualCheckInAt ?? bd.CheckInDate)
                .Select(bd => (int?)bd.Id)
                .FirstOrDefaultAsync();
        }

        var damage = new LossAndDamage
        {
            RoomId = request.RoomId,
            BookingDetailId = activeBookingDetailId,
            RoomInventoryId = request.RoomInventoryId,
            ReportedByUserId = userId,
            Description = request.Description,
            PenaltyAmount = request.PenaltyAmount,
            Quantity = request.Quantity,
            Status = "OPEN",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        if (request.EvidenceImage != null && request.EvidenceImage.Length > 0)
        {
            var res = await _cloudinary.UploadImageAsync(request.EvidenceImage, "damages");
            damage.EvidenceImageUrl = res.Url;
            damage.EvidencePublicId = res.PublicId;
        }

        if (request.RoomInventoryId.HasValue)
        {
            var roomInventory = await _context.RoomInventories
                .Include(ri => ri.Equipment)
                .FirstOrDefaultAsync(ri => ri.Id == request.RoomInventoryId.Value);

            if (roomInventory != null)
            {
                roomInventory.Quantity -= request.Quantity;

                if (roomInventory.Equipment != null)
                {
                    var equipName = roomInventory.Equipment.Name;
                    var activeEquipmentsToSync = await _context.Equipments
                        .Where(e => e.Name == equipName && e.IsActive)
                        .ToListAsync();

                    foreach (var eq in activeEquipmentsToSync)
                    {
                        eq.DamagedQuantity += request.Quantity;
                        eq.InUseQuantity -= request.Quantity;
                    }
                }
            }
        }

        _context.LossAndDamages.Add(damage);
        await _context.SaveChangesAsync();

        // Dùng extension method, bên trong vẫn là _context.AuditLogs.Add(new AuditLog {...})
        await _context.AddAuditLogAsync(
            userId: userId,
            roleName: roleName,
            actionType: "CREATE",
            entityType: "LossAndDamage",
            message: $"Ghi nhận hỏng {request.ItemName ?? "Vật tư"} tại phòng {room.RoomNumber}.",
            contextParams: new { damageId = damage.Id, roomNumber = room.RoomNumber, targetItem = request.ItemName ?? "Vật tư" },
            changes: new { oldData = (object?)null, newData = new { request.Quantity, request.PenaltyAmount, Description = request.Description ?? request.Reason ?? "Không có mô tả" } }
        );
        return true;
    }

public async Task<IEnumerable<DamageReportResponseDto>> GetRoomDamagesAsync(int roomId)
{
    return await _context!.LossAndDamages
        .Where(d => d.RoomId == roomId)
        .Select(d => new DamageReportResponseDto(
            d.Id, d.Description ?? "", d.PenaltyAmount, d.Quantity, d.EvidenceImageUrl, d.CreatedAt))
        .ToListAsync();
}
public async Task<List<Room>> GetAvailableRoomsForCheckInAsync(int roomTypeId)
        {
            // LOGIC LỌC BẮT BUỘC: Trạng thái phải là Available VÀ dọn dẹp phải là Clean
            return await _context!.Rooms
                .Where(r => r.RoomTypeId == roomTypeId 
                         && r.Status == "Available" 
                         && r.CleaningStatus == "Clean")
                .ToListAsync();
        }

        public async Task<bool> UpdateRoomStatusAsync(int roomId, string status, string cleaningStatus)
        {
            var room = await _context!.Rooms.FindAsync(roomId);
            if (room == null) return false;

            room.Status = status;
            room.CleaningStatus = cleaningStatus;
            room.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // QUAN TRỌNG: Bắn tín hiệu SignalR cho tất cả Lễ Tân biết phòng này vừa đổi trạng thái
            await _hubContext!.Clients.All.SendAsync("ReceiveRoomStatusUpdate", roomId, status, cleaningStatus);

            return true;
        }

        // ================================================================
        // HANGFIRE JOB: Chạy lúc 9h sáng giờ Việt Nam (UTC+7 = 02:00 UTC)
        // Tất cả phòng OCCUPIED + CLEAN → chuyển sang DIRTY
        // ================================================================
        public async Task MarkOccupiedRoomsDirtyAsync()
        {
            var occupiedCleanRooms = await _context!.Rooms
                .Where(r => r.Status == "OCCUPIED" && r.CleaningStatus == "CLEAN" && r.DeletedAt == null)
                .ToListAsync();

            if (!occupiedCleanRooms.Any()) return;

            foreach (var room in occupiedCleanRooms)
            {
                room.CleaningStatus = "DIRTY";
                room.UpdatedAt = DateTime.UtcNow;
            }

            await _context!.SaveChangesAsync();

            // Bắn SignalR cho mỗi phòng đã đổi trạng thái
            if (_hubContext != null)
            {
                foreach (var room in occupiedCleanRooms)
                {
                    await _hubContext.Clients.All.SendAsync(
                        "ReceiveRoomStatusUpdate", room.Id, room.Status, "DIRTY");
                }
            }

            Console.WriteLine($"[9AM Job] Đã đổi {occupiedCleanRooms.Count} phòng OCCUPIED+CLEAN → DIRTY lúc {DateTime.UtcNow:HH:mm} UTC");
        }
}
