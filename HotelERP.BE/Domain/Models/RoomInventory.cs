using System;
using System.Collections.Generic;

namespace HotelERP.BE.Domain.Models;

public partial class RoomInventory
{
    public int Id { get; set; }

    public int? RoomId { get; set; }

    public string ItemType { get; set; } = null!;

    public int Quantity { get; set; }

    public decimal PriceIfLost { get; set; }

    public string? Note { get; set; }

    public bool? IsActive { get; set; }

    public int EquipmentId { get; set; }

    public virtual Equipment? Equipment { get; set; }

    public virtual ICollection<LossAndDamage> LossAndDamages { get; set; } = new List<LossAndDamage>();

    public virtual Room? Room { get; set; }
}