using System;

namespace HotelERP.BE.Domain.Models;

public partial class LossAndDamage
{
    public int Id { get; set; }

    public int? BookingDetailId { get; set; } 

    public int? RoomInventoryId { get; set; } 

    public int Quantity { get; set; }

    public decimal PenaltyAmount { get; set; } 

    public string? Description { get; set; }

    public DateTime? CreatedAt { get; set; }

    public string? EvidenceImageUrl { get; set; }

    public string? EvidencePublicId { get; set; }

    public string? Status { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public int? RoomId { get; set; }

    public int? ReportedByUserId { get; set; }

    public virtual BookingDetail? BookingDetail { get; set; }

    public virtual RoomInventory? RoomInventory { get; set; }

    public virtual Room? Room { get; set; }
}