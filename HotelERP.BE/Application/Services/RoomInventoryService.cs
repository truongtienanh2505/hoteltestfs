using Microsoft.EntityFrameworkCore;
using HotelERP.BE.Application.Interfaces;
using HotelERP.BE.Application.DTOs;
using HotelERP.BE.Infrastructure.Data;
using HotelERP.BE.Domain.Models;
using Microsoft.AspNetCore.Http;
using System.Security.Claims;
using HotelERP.BE.Helpers.AuditLogs;
using Microsoft.AspNetCore.SignalR;
using HotelERP.BE.DTOs.Hubs;

namespace HotelERP.BE.Application.Services;

public class RoomInventoryService(HotelDbContext context, IHttpContextAccessor httpContextAccessor) : IRoomInventoryService
{
    private (int UserId, string RoleName) ResolveUser()
    {
        var user = httpContextAccessor.HttpContext?.User;
        var userIdClaim = user?.FindFirst("UserId")?.Value ?? user?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        int uid = int.TryParse(userIdClaim, out int id) ? id : 0;
        var roleName = user?.FindFirst(ClaimTypes.Role)?.Value ?? "User";
        return (uid, roleName);
    }
    public async Task<IEnumerable<RoomInventoryResponseDto>> GetInventoriesByRoomIdAsync(int roomId)
    {
        return await (
            from ri in context.RoomInventories.AsNoTracking()
            join e in context.Equipments.AsNoTracking() on ri.EquipmentId equals e.Id
            where ri.RoomId == roomId && (ri.IsActive == true || ri.IsActive == null)
            orderby ri.Id descending
            select new RoomInventoryResponseDto(
                ri.Id,
                ri.EquipmentId,
                e.Name,
                e.Category,
                ri.Quantity,
                e.Unit,
                string.IsNullOrWhiteSpace(ri.Note) ? "Tốt" : ri.Note!,
                ri.PriceIfLost
            )
        ).ToListAsync();
    }

    public async Task<int> AddInventoryAsync(int roomId, AddInventoryRequest request)
    {
        var roomExists = await context.Rooms.AnyAsync(r => r.Id == roomId);
        if (!roomExists)
            throw new InvalidOperationException("Phòng không tồn tại.");

        if (request.Quantity <= 0)
            throw new InvalidOperationException("Số lượng phải lớn hơn 0.");

        var equipment = await context.Equipments
            .FirstOrDefaultAsync(e => e.Id == request.EquipmentId);

        if (equipment == null)
            throw new InvalidOperationException("Vật tư không tồn tại trong kho.");

        // Kiểm tra tồn kho khả dụng
        int availableStock = equipment.TotalQuantity - equipment.InUseQuantity - equipment.DamagedQuantity - equipment.LiquidatedQuantity;
        if (request.Quantity > availableStock)
            throw new InvalidOperationException($"{equipment.Name} không đủ số lượng (Chỉ còn {availableStock} {equipment.Unit} trong kho).");

        var inventory = new RoomInventory
        {
            RoomId = roomId,
            Quantity = request.Quantity,
            PriceIfLost = request.PriceIfLost > 0 ? request.PriceIfLost : equipment.DefaultPriceIfLost,
            Note = string.IsNullOrWhiteSpace(request.Condition) ? "Tốt" : request.Condition.Trim(),
            IsActive = true,
            ItemType = request.IsMinibar ? "MINIBAR" : "ASSET",
            EquipmentId = equipment.Id
        };

        // Cập nhật số lượng đang sử dụng trong kho
        equipment.InUseQuantity = Math.Max(0, equipment.InUseQuantity + request.Quantity);

        context.RoomInventories.Add(inventory);
        await context.SaveChangesAsync();

        var room = await context.Rooms.FindAsync(roomId);
        var (userId, roleName) = ResolveUser();
        await context.AddAuditLogAsync(
            userId: userId,
            roleName: roleName,
            actionType: "CREATE",
            entityType: "RoomInventory",
            message: $"Thêm mới {request.Quantity} {equipment.Name} vào phòng {room?.RoomNumber ?? "N/A"}.",
            contextParams: new { inventoryId = inventory.Id, roomId, equipmentId = equipment.Id },
            changes: new { oldData = (object?)null, newData = new { request.Quantity, request.PriceIfLost, request.Condition } }
        );

        return inventory.Id;
    }

    public async Task<bool> UpdateInventoryAsync(int roomId, int inventoryId, UpdateInventoryRequest request)
    {
        var inventory = await context.RoomInventories
            .FirstOrDefaultAsync(x => x.Id == inventoryId && x.RoomId == roomId);

        if (inventory == null) return false;

        if (request.Quantity <= 0)
            throw new InvalidOperationException("Số lượng phải lớn hơn 0.");

        var equipment = await context.Equipments
            .FirstOrDefaultAsync(e => e.Id == request.EquipmentId);

        if (equipment == null)
            throw new InvalidOperationException("Vật tư không tồn tại trong kho.");

        // Tính toán chênh lệch số lượng
        int quantityDiff = request.Quantity - inventory.Quantity;

        if (quantityDiff > 0)
        {
            int availableStock = equipment.TotalQuantity - equipment.InUseQuantity - equipment.DamagedQuantity - equipment.LiquidatedQuantity;
            if (quantityDiff > availableStock)
                throw new InvalidOperationException($"{equipment.Name} không đủ số lượng (Chỉ còn {availableStock} {equipment.Unit} trong kho).");
        }

        inventory.Quantity = request.Quantity;
        inventory.PriceIfLost = request.PriceIfLost > 0 ? request.PriceIfLost : equipment.DefaultPriceIfLost;
        inventory.Note = string.IsNullOrWhiteSpace(request.Condition) ? "Tốt" : request.Condition.Trim();
        inventory.ItemType = request.IsMinibar ? "MINIBAR" : "ASSET";
        inventory.EquipmentId = equipment.Id;
        inventory.IsActive = true;

        // Cập nhật số lượng đang sử dụng trong kho
        equipment.InUseQuantity = Math.Max(0, equipment.InUseQuantity + quantityDiff);

        await context.SaveChangesAsync();

        var room = await context.Rooms.FindAsync(roomId);
        var (userId, roleName) = ResolveUser();
        await context.AddAuditLogAsync(
            userId: userId,
            roleName: roleName,
            actionType: "UPDATE",
            entityType: "RoomInventory",
            message: $"Cập nhật số lượng/tình trạng {equipment.Name} tại phòng {room?.RoomNumber ?? "N/A"}.",
            contextParams: new { inventoryId, roomId, equipmentId = equipment.Id },
            changes: new { oldData = new { Quantity = inventory.Quantity, PriceIfLost = inventory.PriceIfLost, Note = inventory.Note }, newData = new { request.Quantity, request.PriceIfLost, request.Condition } }
        );

        return true;
    }

    public async Task<bool> DeleteInventoryAsync(int roomId, int inventoryId)
    {
        var inventory = await context.RoomInventories.Include(ri => ri.Room)
            .FirstOrDefaultAsync(x => x.Id == inventoryId && x.RoomId == roomId);

        if (inventory == null) return false;

        var equipment = await context.Equipments.FirstOrDefaultAsync(e => e.Id == inventory.EquipmentId);
        if (equipment != null)
        {
            equipment.InUseQuantity = Math.Max(0, equipment.InUseQuantity - inventory.Quantity);
        }

        inventory.IsActive = false;
        await context.SaveChangesAsync();

        var room = await context.Rooms.FindAsync(roomId);
        var (userId, roleName) = ResolveUser();
        await context.AddAuditLogAsync(
            userId: userId,
            roleName: roleName,
            actionType: "DELETE",
            entityType: "RoomInventory",
            message: $"Xóa {equipment?.Name ?? "Vật tư"} khỏi phòng {room?.RoomNumber ?? "N/A"}.",
            contextParams: new { inventoryId, roomId },
            changes: new { oldData = new { Quantity = inventory.Quantity }, newData = (object?)null }
        );

        return true;
    }
}