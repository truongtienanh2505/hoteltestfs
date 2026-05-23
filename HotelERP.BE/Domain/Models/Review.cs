using System;
using System.Collections.Generic;

namespace HotelERP.BE.Domain.Models;

public partial class Review
{
    public int Id { get; set; }

    public int? UserId { get; set; }

    public int? RoomTypeId { get; set; }

    public int Rating { get; set; }

    public string? Comment { get; set; }

    public string? ImageUrl { get; set; }

    public string? ImagePublicId { get; set; }

    public int LikeCount { get; set; }

    public string? Highlight { get; set; }

    public string? ServiceQuality { get; set; }

    public bool IsApproved { get; set; }

    public string Status { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual RoomType? RoomType { get; set; }

    public virtual User? User { get; set; }
}
