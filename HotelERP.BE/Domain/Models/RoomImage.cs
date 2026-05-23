using System;
using System.Collections.Generic;

namespace HotelERP.BE.Domain.Models;

public partial class RoomImage
{
    public int Id { get; set; }

    public int? RoomTypeId { get; set; }

    public string ImageUrl { get; set; } = null!;

    public string? CloudPublicId { get; set; }

    public bool IsPrimary { get; set; }

    public string Status { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public virtual RoomType? RoomType { get; set; }
}
