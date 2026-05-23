using HotelERP.BE.Infrastructure.Data;
using HotelERP.BE.Domain.Models;
using HotelERP.BE.Hubs;
using HotelERP.BE.Helpers.AuditLogs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using HotelERP.BE.Application.Interfaces;
using HotelERP.BE.Services;
using HotelERP.BE.DTOs.Notifications;
using HotelERP.BE.Models.Enums;
using HotelERP.BE.Models;
using System.Security.Claims;

namespace HotelERP.BE.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Microsoft.AspNetCore.Authorization.Authorize]
public class LossAndDamagesController : ControllerBase
{
    private readonly HotelDbContext _context;
    private readonly IHubContext<DamageHub> _hubContext;
    private readonly INotificationService _notificationService;

    public LossAndDamagesController(
        HotelDbContext context, 
        IHubContext<DamageHub> hubContext,
        INotificationService notificationService)
    {
        _context = context;
        _hubContext = hubContext;
        _notificationService = notificationService;
    }

    [HttpGet]
    public async Task<IActionResult> GetLossAndDamages()
    {
        var damages = await _context.LossAndDamages
            .Include(ld => ld.Room)
            .Include(ld => ld.RoomInventory)
                .ThenInclude(ri => ri!.Equipment)
            .OrderByDescending(ld => ld.CreatedAt)
            .ToListAsync();

        var stats = new
        {
            totalIncidents = damages.Count,
            totalAmount = damages.Sum(ld => ld.PenaltyAmount),
            totalQuantity = damages.Sum(ld => ld.Quantity)
        };

        var data = damages.Select(ld => new
        {
            Id = ld.Id,
            RoomId = ld.RoomId,
            RoomNumber = ld.Room?.RoomNumber ?? "Không xác định",
            RoomInventoryId = ld.RoomInventoryId,
            ItemName = ld.RoomInventory?.Equipment?.Name ?? "Không xác định",
            Quantity = ld.Quantity,
            PenaltyAmount = ld.PenaltyAmount,
            PriceIfLost = ld.RoomInventory != null ? ld.RoomInventory.PriceIfLost : 0,
            Category = ld.RoomInventory != null && ld.RoomInventory.Equipment != null ? ld.RoomInventory.Equipment.Category : "Khác",
            Description = ld.Description,
            CreatedAt = ld.CreatedAt,
            EvidenceImageUrl = ld.EvidenceImageUrl,
            Status = ld.Status
        }).ToList();

        return Ok(new { stats, data });
    }

    // --- LỆNH XÓA MỚI THÊM VÀO ĐÂY ---
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteDamage(int id)
    {
        // 1. Tìm bản ghi dựa trên ID và kèm theo thông tin Tồn kho
        var damage = await _context.LossAndDamages
            .Include(d => d.RoomInventory)
                .ThenInclude(ri => ri!.Equipment)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (damage == null)
        {
            return NotFound(new { message = "Không tìm thấy bản ghi thất thoát này." });
        }

        try
        {
            // Hoàn trả số lượng Tồn kho (Inventory Rollback)
            if (damage.RoomInventory != null)
            {
                damage.RoomInventory.Quantity += damage.Quantity;

                // ==========================================
                // HOÀN TRẢ KHO VẬT TƯ CHUNG
                // ==========================================
                if (damage.RoomInventory.Equipment != null)
                {
                    damage.RoomInventory.Equipment.DamagedQuantity = Math.Max(0, damage.RoomInventory.Equipment.DamagedQuantity - damage.Quantity);
                    damage.RoomInventory.Equipment.InUseQuantity += damage.Quantity;
                }
            }

            var roomNumber = damage.RoomInventory?.Equipment != null
                ? (await _context.Rooms.FindAsync(damage.RoomId))?.RoomNumber ?? "N/A"
                : "N/A";
            var itemName = damage.RoomInventory?.Equipment?.Name ?? "Không xác định";

            // 2. Xóa bản ghi
            _context.LossAndDamages.Remove(damage);
            
            // 3. Lưu thay đổi xuống Database
            await _context.SaveChangesAsync();

            // 4. Ghi Audit Log
            var (userId, roleName) = ResolveUser();
            await _context.AddAuditLogAsync(
                userId: userId,
                roleName: roleName,
                actionType: "DELETE",
                entityType: "LossAndDamage",
                message: $"Hủy báo cáo đền bù {itemName} tại phòng {roomNumber}.",
                contextParams: new { damageId = id, roomNumber, targetItem = itemName },
                changes: new { oldData = new { damage.Quantity, damage.PenaltyAmount, damage.Description }, newData = (object?)null }
            );

            // 5. Gửi tín hiệu SignalR
            await _hubContext.Clients.All.SendAsync("DeletedDamage", id);

            return Ok(new { message = "Xóa thành công!", id });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = "Lỗi khi xóa: " + ex.Message });
        }
    }

    public class CreateDamageRequest
    {
        public int RoomId { get; set; }
        public int EquipmentId { get; set; }
        public int Quantity { get; set; }
        public string? Description { get; set; }
        public decimal? PenaltyAmount { get; set; }
    }

    public class EditDamageRequest
    {
        public int Quantity { get; set; }
        public string? Description { get; set; }
        public decimal? PenaltyAmount { get; set; }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateDamage(int id, [FromBody] EditDamageRequest req)
    {
        var damage = await _context.LossAndDamages
            .Include(d => d.RoomInventory)
                .ThenInclude(ri => ri!.Equipment)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (damage == null) return NotFound(new { message = "Không tìm thấy bản ghi." });

        if (damage.RoomInventory != null)
        {
            // Nếu người dùng thay đổi số lượng hỏng, cập nhật lại Tồn kho
            int quantityDifference = req.Quantity - damage.Quantity;
            damage.RoomInventory.Quantity -= quantityDifference;

            // ==========================================
            // CẬP NHẬT KHO VẬT TƯ CHUNG KHI SỬA SỐ LƯỢNG
            // ==========================================
            if (damage.RoomInventory.Equipment != null)
            {
                damage.RoomInventory.Equipment.DamagedQuantity = Math.Max(0, damage.RoomInventory.Equipment.DamagedQuantity + quantityDifference);
                damage.RoomInventory.Equipment.InUseQuantity = Math.Max(0, damage.RoomInventory.Equipment.InUseQuantity - quantityDifference);
            }
        }

        var oldQuantity = damage.Quantity;
        var oldPenalty = damage.PenaltyAmount;
        var oldDesc = damage.Description;

        damage.Quantity = req.Quantity;
        damage.Description = req.Description;
        damage.UpdatedAt = DateTime.UtcNow;

        if (req.PenaltyAmount.HasValue)
        {
            damage.PenaltyAmount = req.PenaltyAmount.Value;
        }
        else if (damage.RoomInventory != null)
        {
            damage.PenaltyAmount = req.Quantity * damage.RoomInventory.PriceIfLost;
        }

        await _context.SaveChangesAsync();

        // Ghi Audit Log
        var room = await _context.Rooms.FindAsync(damage.RoomId);
        var itemName = damage.RoomInventory?.Equipment?.Name ?? "Không xác định";
        var (userId, roleName) = ResolveUser();
        await _context.AddAuditLogAsync(
            userId: userId,
            roleName: roleName,
            actionType: "UPDATE",
            entityType: "LossAndDamage",
            message: $"Cập nhật báo cáo đền bù {itemName} tại phòng {room?.RoomNumber ?? "N/A"}.",
            contextParams: new { damageId = id, roomNumber = room?.RoomNumber ?? "N/A", targetItem = itemName },
            changes: new { oldData = new { Quantity = oldQuantity, PenaltyAmount = oldPenalty, Description = oldDesc }, newData = new { damage.Quantity, damage.PenaltyAmount, damage.Description } }
        );

        await _hubContext.Clients.All.SendAsync("DamageUpdated", id);

        // ✅ Gửi thông báo hệ thống
        var updateNotif = new Notification
        {
            Title = "Cập nhật đền bù",
            Content = $"Phiếu đền bù phòng {damage.Room?.RoomNumber} đã được cập nhật bởi Admin.",
            Type = "Info",
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };
        _context.Notifications.Add(updateNotif);
        await _context.SaveChangesAsync();

        await _notificationService.SendToRoleAsync("Admin", new NotificationMessage
        {
            Id = updateNotif.Id,
            Title = updateNotif.Title,
            Content = updateNotif.Content,
            Type = "Info",
            Action = NotificationAction.UpdateDamage
        });

        return Ok(new { message = "Cập nhật thành công!" });
    }

    [HttpPost("{id}/image")]
    public async Task<IActionResult> UploadDamageImage(int id, IFormFile file, [FromServices] IPhotoService photoService)
    {
        var damage = await _context.LossAndDamages.FindAsync(id);
        if (damage == null) return NotFound(new { message = "Không tìm thấy bản ghi đền bù." });

        if (file == null || file.Length == 0) return BadRequest(new { message = "File trống." });

        try
        {
            var (url, publicId) = await photoService.UploadPhotoAsync(file);

            // Xóa ảnh cũ nếu có
            if (!string.IsNullOrEmpty(damage.EvidencePublicId))
            {
                await photoService.DeletePhotoAsync(damage.EvidencePublicId);
            }

            damage.EvidenceImageUrl = url;
            damage.EvidencePublicId = publicId;
            damage.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            await _hubContext.Clients.All.SendAsync("DamageUpdated", id);

            return Ok(new { url });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = "Lỗi khi upload ảnh: " + ex.Message });
        }
    }

    [HttpDelete("{id}/image")]
    public async Task<IActionResult> DeleteDamageImage(int id, [FromServices] IPhotoService photoService)
    {
        var damage = await _context.LossAndDamages.FindAsync(id);
        if (damage == null) return NotFound(new { message = "Không tìm thấy bản ghi đền bù." });

        if (string.IsNullOrEmpty(damage.EvidencePublicId))
        {
            return BadRequest(new { message = "Không có ảnh để xóa." });
        }

        try
        {
            await photoService.DeletePhotoAsync(damage.EvidencePublicId);

            damage.EvidenceImageUrl = null;
            damage.EvidencePublicId = null;
            damage.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            await _hubContext.Clients.All.SendAsync("DamageUpdated", id);

            return Ok(new { message = "Xóa ảnh thành công." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = "Lỗi khi xóa ảnh: " + ex.Message });
        }
    }

    [HttpPost]
    public async Task<IActionResult> CreateNewDamage([FromBody] CreateDamageRequest req)
    {
        // 1. Tìm thông tin vật tư trong phòng
        var inventory = await _context.RoomInventories
            .FirstOrDefaultAsync(ri => ri.RoomId == req.RoomId && ri.EquipmentId == req.EquipmentId);

        if (inventory == null)
            return BadRequest("Vật tư không nằm trong danh sách kiểm kê của phòng này.");

        // 2. Tạo phiếu đền bù
        decimal penaltyAmount = req.PenaltyAmount ?? (req.Quantity * inventory.PriceIfLost);
        var damage = new LossAndDamage
        {
            RoomId = req.RoomId,
            RoomInventoryId = inventory.Id,
            Quantity = req.Quantity,
            PenaltyAmount = penaltyAmount,
            Description = req.Description,
            Status = "OPEN",
            CreatedAt = DateTime.UtcNow
        };
        _context.LossAndDamages.Add(damage);

        // ==========================================
        // 🚀 LOGIC MỚI: CẬP NHẬT LẠI KHO VẬT TƯ
        // ==========================================
        var equipment = await _context.Equipments.FindAsync(req.EquipmentId);
        if (equipment != null)
        {
            equipment.DamagedQuantity += req.Quantity;
            equipment.InUseQuantity = Math.Max(0, equipment.InUseQuantity - req.Quantity);
        }// ==========================================

        // 3. Lưu cả Phiếu đền bù và Cập nhật Kho vào Database cùng lúc
        await _context.SaveChangesAsync();
        
        var room = await _context.Rooms.FindAsync(req.RoomId);
        var eqName = equipment?.Name ?? "Không xác định";
        // 4. Ghi Audit Log
        var (userId, roleName) = ResolveUser();
        await _context.AddAuditLogAsync(
            userId: userId,
            roleName: roleName,
            actionType: "CREATE",
            entityType: "LossAndDamage",
            message: $"Tạo báo cáo đền bù {eqName} tại phòng {room?.RoomNumber ?? "N/A"}.",
            contextParams: new { damageId = damage.Id, roomNumber = room?.RoomNumber ?? "N/A", targetItem = eqName },
            changes: new { oldData = (object?)null, newData = new { damage.Quantity, damage.PenaltyAmount, damage.Description } }
        );

        // Trả dữ liệu về cho Frontend và gửi SignalR
        var newRecord = new
        {
            id = damage.Id,
            roomId = damage.RoomId,
            roomNumber = room?.RoomNumber ?? "Không xác định",
            itemName = eqName,
            quantity = damage.Quantity,
            penaltyAmount = damage.PenaltyAmount,
            description = damage.Description,
            createdAt = damage.CreatedAt,
            evidenceImageUrl = damage.EvidenceImageUrl,
            status = damage.Status
        };

        await _hubContext.Clients.All.SendAsync("ReceiveNewDamage", newRecord);

        // ✅ Gửi thông báo hệ thống (Cảnh báo Warning)
        var systemNotif = new Notification
        {
            Title = "Cảnh báo hỏng hóc",
            Content = $"Phòng {newRecord.roomNumber} báo hỏng {newRecord.itemName} x{newRecord.quantity}. Phạt: {newRecord.penaltyAmount:N0}đ",
            Type = "Warning",
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };
        _context.Notifications.Add(systemNotif);
        await _context.SaveChangesAsync();

        await _notificationService.SendToRoleAsync("Admin", new NotificationMessage
        {
            Id = systemNotif.Id,
            Title = systemNotif.Title,
            Content = systemNotif.Content,
            Type = "Warning",
            Action = NotificationAction.CreateDamage
        });

        return Ok(newRecord);
    }
    private (int UserId, string RoleName) ResolveUser()
    {
        var userIdClaim = User.FindFirst("UserId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        int userId = int.TryParse(userIdClaim, out int id) ? id : 0;
        var roleName = User.FindFirst(ClaimTypes.Role)?.Value ?? "User";
        return (userId, roleName);
    }
}