using System;
using System.Collections.Generic;

namespace HotelERP.BE.Domain.Models;

public partial class ServiceCategory
{
    public int Id { get; set; }

    public string Name { get; set; } = null!;

    public string Status { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public virtual ICollection<Service> Services { get; set; } = new List<Service>();
}
