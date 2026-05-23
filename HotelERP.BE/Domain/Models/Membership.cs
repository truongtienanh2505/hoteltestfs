using System;
using System.Collections.Generic;

namespace HotelERP.BE.Domain.Models;

public partial class Membership
{
    public int Id { get; set; }

    public string TierName { get; set; } = null!;

    public int MinPoints { get; set; }

    public decimal DiscountPercent { get; set; }

    public string? Benefits { get; set; }

    public string Status { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual ICollection<User> Users { get; set; } = new List<User>();
}
