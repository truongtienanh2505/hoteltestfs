using System;
using System.Collections.Generic;

namespace HotelERP.BE.Domain.Models;

public partial class Room
{
    public int Id { get; set; }

    public int? RoomTypeId { get; set; }

    public string RoomNumber { get; set; } = null!;

    public int? Floor { get; set; }

    public string Status { get; set; } = null!;

    public string CleaningStatus { get; set; } = null!;

    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public DateTime? DeletedAt { get; set; }

    public virtual ICollection<BookingDetail> BookingDetails { get; set; } = new List<BookingDetail>();

    public virtual ICollection<RoomInventory> RoomInventories { get; set; } = new List<RoomInventory>();

    public virtual RoomType? RoomType { get; set; }
    
    public virtual ICollection<LossAndDamage> LossAndDamages { get; set; } = new List<LossAndDamage>();
}
