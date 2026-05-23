using System;
using System.Collections.Generic;

namespace HotelERP.BE.Domain.Models;

public partial class Service
{
    public int Id { get; set; }

    public int? CategoryId { get; set; }

    public string Name { get; set; } = null!;

    public string? Description { get; set; }

    public decimal Price { get; set; }

    public string? Unit { get; set; }

    public string? ImageUrl { get; set; }

    public string Status { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual ServiceCategory? Category { get; set; }

    public virtual ICollection<OrderServiceDetail> OrderServiceDetails { get; set; } = new List<OrderServiceDetail>();
}
