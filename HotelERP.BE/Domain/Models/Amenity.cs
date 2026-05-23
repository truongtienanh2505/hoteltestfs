using System;
using System.Collections.Generic;

namespace HotelERP.BE.Domain.Models;

public partial class Amenity
{
    public int Id { get; set; }

    public string Name { get; set; } = null!;

    public string? IconUrl { get; set; }

    public string Status { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public DateTime? DeletedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual ICollection<RoomTypeAmenity> RoomTypeAmenities { get; set; } = new List<RoomTypeAmenity>();
}