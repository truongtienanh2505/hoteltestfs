using System;
using System.Collections.Generic;

namespace HotelERP.BE.Domain.Models;

public partial class RoomType
{
    public int Id { get; set; }

    public string Name { get; set; } = null!;

    public decimal BasePrice { get; set; }

    public int CapacityAdults { get; set; }

    public int CapacityChildren { get; set; }

    public string? Description { get; set; }

    public string? BedType { get; set; }

    public decimal? SizeSqm { get; set; }

    public decimal EarlyCheckinFeePercent { get; set; }

    public decimal LateCheckoutFeePercent { get; set; }

    public decimal ExtraHourPrice { get; set; }

    public string Status { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public DateTime? DeletedAt { get; set; }

    public string? ImageUrl { get; set; }

    public string? CloudinaryPublicId { get; set; }

    public virtual ICollection<BookingDetail> BookingDetails { get; set; } = new List<BookingDetail>();

    public virtual ICollection<Review> Reviews { get; set; } = new List<Review>();

    public virtual ICollection<RoomImage> RoomImages { get; set; } = new List<RoomImage>();

    public virtual ICollection<RoomTypeAmenity> RoomTypeAmenities { get; set; } = new List<RoomTypeAmenity>();

    public virtual ICollection<Room> Rooms { get; set; } = new List<Room>();
}