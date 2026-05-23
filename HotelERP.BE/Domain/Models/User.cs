using System;
using System.Collections.Generic;
using HotelERP.BE.Models;

namespace HotelERP.BE.Domain.Models;

public partial class User
{
    public int Id { get; set; }

    public int? RoleId { get; set; }

    public int? MembershipId { get; set; }

    public string FullName { get; set; } = null!;

    public string Email { get; set; } = null!;

    public string? Phone { get; set; }

    public string PasswordHash { get; set; } = null!;

    public string? AvatarUrl { get; set; }

    public string? AvatarPublicId { get; set; }

    public int LoyaltyPoints { get; set; }
    public string? Address { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public int? LastBirthdayCouponYear { get; set; }

    public bool Status { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public DateTime? LastLoginAt { get; set; }

    public virtual ICollection<Article> Articles { get; set; } = new List<Article>();

    public virtual ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();

    public virtual ICollection<Booking> Bookings { get; set; } = new List<Booking>();

    public virtual Membership? Membership { get; set; }

    public virtual ICollection<Review> Reviews { get; set; } = new List<Review>();
    public virtual ICollection<UserPermission> UserPermissions { get; set; } = new List<UserPermission>();

    public virtual Role? Role { get; set; }
}
