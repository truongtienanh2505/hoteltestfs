using System;
using System.Collections.Generic;
using HotelERP.BE.Domain.Models;
using HotelERP.BE.Models;
using Microsoft.EntityFrameworkCore;

namespace HotelERP.BE.Infrastructure.Data;

public partial class HotelDbContext : DbContext
{
    // 1. KHAI BÁO BIẾN ĐỂ LẤY THÔNG TIN TỪ HTTP REQUEST (Header, Token...)
    private readonly Microsoft.AspNetCore.Http.IHttpContextAccessor? _httpContextAccessor;
    public HotelDbContext()
    {
    }

    // 2. NHÚNG BỘ ĐỌC HTTP REQUEST VÀO CONSTRUCTOR CỦA DBCONTEXT
    public HotelDbContext(DbContextOptions<HotelDbContext> options, Microsoft.AspNetCore.Http.IHttpContextAccessor? httpContextAccessor = null)
        : base(options)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public virtual DbSet<RefreshToken> RefreshTokens { get; set; }

    public virtual DbSet<LoyaltyPointHistory> LoyaltyPointHistories { get; set; }

    public virtual DbSet<Amenity> Amenities { get; set; }

    public virtual DbSet<Article> Articles { get; set; }

    public virtual DbSet<ArticleCategory> ArticleCategories { get; set; }

    public virtual DbSet<ArticleCategoryMapping> ArticleCategoryMappings { get; set; }

    public virtual DbSet<Attraction> Attractions { get; set; }

    public virtual DbSet<AuditLog> AuditLogs { get; set; }

    public virtual DbSet<Booking> Bookings { get; set; }

    public virtual DbSet<BookingDetail> BookingDetails { get; set; }

    public virtual DbSet<Invoice> Invoices { get; set; }

    public virtual DbSet<InvoiceBookingDetail> InvoiceBookingDetails { get; set; }

    public virtual DbSet<LossAndDamage> LossAndDamages { get; set; }

    public virtual DbSet<Membership> Memberships { get; set; }

    public virtual DbSet<OrderService> OrderServices { get; set; }

    public virtual DbSet<OrderServiceDetail> OrderServiceDetails { get; set; }

    public virtual DbSet<Payment> Payments { get; set; }

    public virtual DbSet<Permission> Permissions { get; set; }

    public virtual DbSet<Review> Reviews { get; set; }

    public virtual DbSet<Role> Roles { get; set; }

    public virtual DbSet<RolePermission> RolePermissions { get; set; }

    public virtual DbSet<Room> Rooms { get; set; }

    public virtual DbSet<RoomImage> RoomImages { get; set; }

    public virtual DbSet<RoomInventory> RoomInventories { get; set; }

    public virtual DbSet<Equipment> Equipments { get; set; }

    public virtual DbSet<EquipmentSupplierLog> EquipmentSupplierLogs { get; set; }

    public virtual DbSet<RoomType> RoomTypes { get; set; }

    public virtual DbSet<RoomTypeAmenity> RoomTypeAmenities { get; set; }

    public virtual DbSet<Service> Services { get; set; }

    public virtual DbSet<ServiceCategory> ServiceCategories { get; set; }

    public virtual DbSet<User> Users { get; set; }

    public virtual DbSet<Voucher> Vouchers { get; set; }
    public virtual DbSet<Notification> Notifications { get; set; }
    public virtual DbSet<UserPermission> UserPermissions { get; set; }
    
    public virtual DbSet<RoleDashboardPeriodState> RoleDashboardPeriodStates { get; set; }

    // 3. (BỎ) ĐÃ BỎ GHI ĐÈ SAVECHANGES VÌ SỬ DỤNG STORED PROCEDURE CHO LOG GOM NHÓM JSON.
    // public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default) ...

    //protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    //#warning To protect potentially sensitive information in your connection string, you should move it out of source code. You can avoid scaffolding the connection string by using the Name= syntax to read it from configuration - see https://go.microsoft.com/fwlink/?linkid=2131148. For more guidance on storing connection strings, see https://go.microsoft.com/fwlink/?LinkId=723263.
    // => optionsBuilder.UseSqlServer("Server=localhost,1433;Database=HotelManagementDB;User Id=sa;Password=HotelERP@2026!;TrustServerCertificate=True;");

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<UserPermission>().HasKey(up => new { up.UserId, up.PermissionId });

        // EquipmentSupplierLog — theo pattern AuditLog: lưu JSON vào LogData
        modelBuilder.Entity<EquipmentSupplierLog>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.LogData).IsRequired();
            entity.Property(e => e.LogDate).HasColumnType("datetime");

            entity.HasOne(e => e.Equipment)
                .WithMany(eq => eq.SupplierLogs)
                .HasForeignKey(e => e.EquipmentId)
                .HasConstraintName("FK_EquipmentSupplierLogs_Equipments");

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .IsRequired(false)
                .HasConstraintName("FK_EquipmentSupplierLogs_Users");
        });

        modelBuilder.Entity<ArticleCategoryMapping>().HasKey(am => new { am.ArticleId, am.CategoryId });

        modelBuilder.Entity<ArticleCategory>().HasQueryFilter(c => c.Status == "ACTIVE");

        modelBuilder.Entity<Article>().HasQueryFilter(a =>
            a.Status != "INACTIVE" &&
            (a.Category == null || a.Category.Status == "ACTIVE")
        );

        // ✅ Map đúng tên cột DB thực tế (xác nhận từ INFORMATION_SCHEMA.COLUMNS)
        modelBuilder.Entity<HotelERP.BE.Models.Notification>(entity =>
        {
            entity.ToTable("Notifications");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.Title).HasColumnName("title");
            entity.Property(e => e.Content).HasColumnName("content");
            entity.Property(e => e.Type).HasColumnName("type");
            entity.Property(e => e.ReferenceLink).HasColumnName("reference_link");
            entity.Property(e => e.IsRead).HasColumnName("is_read");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
        });
      modelBuilder.Entity<Amenity>(entity =>
{
    entity.HasKey(e => e.Id).HasName("PK__Amenitie__3213E83FF99261C0");

    entity.ToTable("Amenities");

    entity.HasIndex(e => e.Name, "UQ_Amenities_Name").IsUnique();

    entity.Property(e => e.Id).HasColumnName("id");

    entity.Property(e => e.Name)
        .HasMaxLength(255)
        .HasColumnName("name");

    entity.Property(e => e.IconUrl)
        .HasColumnName("icon_url");

    entity.Property(e => e.Status)
        .HasMaxLength(20)
        .HasDefaultValue("ACTIVE", "DF_Amenities_Status")
        .HasColumnName("status");

    entity.Property(e => e.CreatedAt)
        .HasDefaultValueSql("(getdate())", "DF_Amenities_CreatedAt")
        .HasColumnType("datetime")
        .HasColumnName("created_at");

    entity.Property(e => e.DeletedAt)
        .HasColumnType("datetime")
        .HasColumnName("DeletedAt");

    entity.Property(e => e.UpdatedAt)
        .HasColumnType("datetime")
        .HasColumnName("UpdatedAt");
});

        modelBuilder.Entity<Article>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Articles__3213E83FD5347E3B");

            entity.HasIndex(e => e.Slug, "UQ_Articles_Slug").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.AuthorId).HasColumnName("author_id");
            entity.Property(e => e.CategoryId).HasColumnName("category_id");
            entity.Property(e => e.Content).HasColumnName("content");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())", "DF_Articles_CreatedAt")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.PublishedAt)
                .HasDefaultValueSql("(getdate())", "DF_Articles_PublishedAt")
                .HasColumnType("datetime")
                .HasColumnName("published_at");
            entity.Property(e => e.Slug)
                .HasMaxLength(255)
                .HasColumnName("slug");
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .HasDefaultValue("ACTIVE", "DF_Articles_Status")
                .HasColumnName("status");
            entity.Property(e => e.Summary)
                .HasMaxLength(1000)
                .HasColumnName("summary");
            entity.Property(e => e.ThumbnailPublicId)
                .HasMaxLength(255)
                .HasColumnName("thumbnail_public_id");
            entity.Property(e => e.ThumbnailUrl).HasColumnName("thumbnail_url");
            entity.Property(e => e.Title)
                .HasMaxLength(500)
                .HasColumnName("title");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("datetime")
                .HasColumnName("updated_at");
            // Các cột bổ sung - thêm vào DB bằng ALTER TABLE nếu chưa có
            entity.Property(e => e.Tags)
                .HasColumnName("tags");
            entity.Property(e => e.MetaTitle)
                .HasMaxLength(500)
                .HasColumnName("meta_title");
            entity.Property(e => e.MetaDescription)
                .HasMaxLength(1000)
                .HasColumnName("meta_description");

            entity.HasOne(d => d.Author).WithMany(p => p.Articles)
                .HasForeignKey(d => d.AuthorId)
                .HasConstraintName("FK_Articles_Users");

            entity.HasOne(d => d.Category).WithMany(p => p.Articles)
                .HasForeignKey(d => d.CategoryId)
                .HasConstraintName("FK_Articles_ArticleCategories");
        });


        modelBuilder.Entity<ArticleCategory>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Article___3213E83FB8B8DB71");

            entity.ToTable("Article_Categories");

            entity.HasIndex(e => e.Name, "UQ_ArticleCategories_Name").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())", "DF_ArticleCategories_CreatedAt")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.Name)
                .HasMaxLength(255)
                .HasColumnName("name");
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .HasDefaultValue("ACTIVE", "DF_ArticleCategories_Status")
                .HasColumnName("status");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("datetime")
                .HasColumnName("updated_at");
        });

        modelBuilder.Entity<Attraction>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Attracti__3213E83F6D39421C");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())", "DF_Attractions_CreatedAt")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.DistanceKm)
                .HasColumnType("decimal(5, 2)")
                .HasColumnName("distance_km");
            entity.Property(e => e.ImagePublicId)
                .HasMaxLength(255)
                .HasColumnName("image_public_id");
            entity.Property(e => e.ImageUrl).HasColumnName("image_url");
            entity.Property(e => e.Latitude)
                .HasColumnType("decimal(10, 7)")
                .HasColumnName("latitude");
            entity.Property(e => e.Longitude)
                .HasColumnType("decimal(10, 7)")
                .HasColumnName("longitude");
            entity.Property(e => e.MapEmbedLink).HasColumnName("map_embed_link");
            entity.Property(e => e.Name)
                .HasMaxLength(255)
                .HasColumnName("name");
            entity.Property(e => e.Type)
                .HasMaxLength(100)
                .HasColumnName("type");
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .HasDefaultValue("ACTIVE", "DF_Attractions_Status")
                .HasColumnName("status");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("datetime")
                .HasColumnName("updated_at");
        });

        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK_Audit_Logs");
            entity.ToTable("Audit_Logs", tb => tb.HasTrigger("TR_AuditLogs_AutoPurgeOnUpdate"));
            entity.HasIndex(e => new { e.UserId, e.RoleName, e.LogDate }, "UIX_Audit_Daily").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.RoleName).HasMaxLength(50).HasColumnName("role_name");
            entity.Property(e => e.LogDate).HasColumnType("date").HasColumnName("log_date");
            entity.Property(e => e.LogData).HasColumnName("log_data");

            entity.HasOne(d => d.User).WithMany(p => p.AuditLogs)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK_AuditLogs_Users");
        });

        modelBuilder.Entity<Booking>(entity =>
        {
            entity.Property(e => e.IsPointsAwarded)
            .HasDefaultValue(false)
            .HasColumnName("is_points_awarded");
            entity.HasKey(e => e.Id).HasName("PK__Bookings__3213E83FD44E63A2");

            entity.HasIndex(e => new { e.UserId, e.Status, e.PaymentStatus }, "IX_Bookings_UserStatus");

            entity.HasIndex(e => e.BookingCode, "UQ_Bookings_Code").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.BookedAt)
                .HasDefaultValueSql("(getdate())", "DF_Bookings_BookedAt")
                .HasColumnType("datetime")
                .HasColumnName("booked_at");
            entity.Property(e => e.BookingCode)
                .HasMaxLength(50)
                .HasColumnName("booking_code");
            entity.Property(e => e.BookingSubtotal)
                .HasColumnType("decimal(18, 2)")
                .HasColumnName("booking_subtotal");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())", "DF_Bookings_CreatedAt")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.DiscountAmount)
                .HasColumnType("decimal(18, 2)")
                .HasColumnName("discount_amount");
            entity.Property(e => e.MembershipDiscountAmount)
                .HasColumnType("decimal(18, 2)")
                .HasColumnName("membership_discount_amount")
                .HasDefaultValue(0m);
            entity.Property(e => e.FinalAmount)
                .HasColumnType("decimal(18, 2)")
                .HasColumnName("final_amount");
            entity.Property(e => e.GuestEmail)
                .HasMaxLength(255)
                .HasColumnName("guest_email");
            entity.Property(e => e.GuestName)
                .HasMaxLength(255)
                .HasColumnName("guest_name");
            entity.Property(e => e.GuestPhone)
                .HasMaxLength(50)
                .HasColumnName("guest_phone");
            entity.Property(e => e.HoldExpiresAt)
                .HasColumnType("datetime")
                .HasColumnName("hold_expires_at");
            entity.Property(e => e.Notes)
                .HasMaxLength(1000)
                .HasColumnName("notes");
            entity.Property(e => e.PaymentStatus)
                .HasMaxLength(50)
                .HasDefaultValue("UNPAID", "DF_Bookings_PaymentStatus")
                .HasColumnName("payment_status");
            entity.Property(e => e.Status)
                .HasMaxLength(50)
                .HasDefaultValue("Pending", "DF_Bookings_Status")
                .HasColumnName("status");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("datetime")
                .HasColumnName("updated_at");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.DepositAmount)
                .HasColumnType("decimal(18, 2)")
                .HasColumnName("deposit_amount")
                .HasDefaultValue(0m);

            entity.Property(e => e.VoucherId).HasColumnName("voucher_id");


            entity.HasOne(d => d.User).WithMany(p => p.Bookings)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK_Bookings_Users");

            entity.HasOne(d => d.Voucher).WithMany(p => p.Bookings)
                .HasForeignKey(d => d.VoucherId)
                .HasConstraintName("FK_Bookings_Vouchers");
        });

        modelBuilder.Entity<BookingDetail>(entity =>
    {
        entity.HasKey(e => e.Id).HasName("PK__Booking___3213E83FCD1B6048");

        entity.ToTable("Booking_Details");

        entity.Property(e => e.SettlementStatus)
       .HasMaxLength(50)
       .HasDefaultValue("UNPAID", "DF_BookingDetails_SettlementStatus")
       .HasColumnName("settlement_status");

        entity.Property(e => e.SettledAt)
            .HasColumnType("datetime")
            .HasColumnName("settled_at");

        entity.HasIndex(e => new { e.RoomId, e.CheckInDate, e.CheckOutDate }, "IX_BookingDetails_RoomDateRange");

        entity.HasIndex(e => new { e.RoomTypeId, e.CheckInDate, e.CheckOutDate }, "IX_BookingDetails_RoomTypeDateRange");

        entity.Property(e => e.Id).HasColumnName("id");
        entity.Property(e => e.ActualCheckInAt)
            .HasColumnType("datetime")
            .HasColumnName("actual_check_in_at");
        entity.Property(e => e.ActualCheckOutAt)
            .HasColumnType("datetime")
            .HasColumnName("actual_check_out_at");
        entity.Property(e => e.AdultsCount)
            .HasDefaultValue(1, "DF_BookingDetails_AdultsCount")
            .HasColumnName("adults_count");
        entity.Property(e => e.BookingId).HasColumnName("booking_id");
        entity.Property(e => e.CheckInDate)
            .HasColumnType("datetime")
            .HasColumnName("check_in_date");
        entity.Property(e => e.CheckOutDate)
            .HasColumnType("datetime")
            .HasColumnName("check_out_date");
        entity.Property(e => e.ChildrenCount).HasColumnName("children_count");
        entity.Property(e => e.CreatedAt)
            .HasDefaultValueSql("(getdate())", "DF_BookingDetails_CreatedAt")
            .HasColumnType("datetime")
            .HasColumnName("created_at");
        entity.Property(e => e.EarlyCheckInFee)
            .HasColumnType("decimal(18, 2)")
            .HasColumnName("early_check_in_fee");
        entity.Property(e => e.IdentityDocumentPublicId)
            .HasMaxLength(255)
            .HasColumnName("identity_document_public_id");
        entity.Property(e => e.IdentityDocumentUrl).HasColumnName("identity_document_url");
        entity.Property(e => e.LateCheckOutFee)
            .HasColumnType("decimal(18, 2)")
            .HasColumnName("late_check_out_fee");
        entity.Property(e => e.LineTotal)
            .HasColumnType("decimal(18, 2)")
            .HasColumnName("line_total");
        entity.Property(e => e.Nights)
            .HasDefaultValue(1, "DF_BookingDetails_Nights")
            .HasColumnName("nights");
        entity.Property(e => e.PricePerNight)
            .HasColumnType("decimal(18, 2)")
            .HasColumnName("price_per_night");
        entity.Property(e => e.RoomId).HasColumnName("room_id");
        entity.Property(e => e.RoomTypeId).HasColumnName("room_type_id");
        entity.Property(e => e.Status)
            .HasMaxLength(50)
            .HasDefaultValue("Booked", "DF_BookingDetails_Status")
            .HasColumnName("status");
        entity.Property(e => e.UpdatedAt)
            .HasColumnType("datetime")
            .HasColumnName("updated_at");

        entity.HasOne(d => d.Booking).WithMany(p => p.BookingDetails)
            .HasForeignKey(d => d.BookingId)
            .HasConstraintName("FK_BookingDetails_Bookings");

        entity.HasOne(d => d.Room).WithMany(p => p.BookingDetails)
            .HasForeignKey(d => d.RoomId)
            .HasConstraintName("FK_BookingDetails_Rooms");

        entity.HasOne(d => d.RoomType).WithMany(p => p.BookingDetails)
   .HasForeignKey(d => d.RoomTypeId)
   .HasConstraintName("FK_BookingDetails_RoomTypes");
    });

        modelBuilder.Entity<Invoice>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Invoices__3213E83F4CEB2555");

            entity.HasIndex(e => e.InvoiceCode, "UQ_Invoices_Code").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.BookingId).HasColumnName("booking_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())", "DF_Invoices_CreatedAt")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.DiscountAmount)
                .HasColumnType("decimal(18, 2)")
                .HasColumnName("discount_amount");
            entity.Property(e => e.FinalTotal)
                .HasColumnType("decimal(18, 2)")
                .HasColumnName("final_total");
            entity.Property(e => e.InvoiceCode)
                .HasMaxLength(50)
                .HasColumnName("invoice_code");
            entity.Property(e => e.IssuedAt)
                .HasColumnType("datetime")
                .HasColumnName("issued_at");
            entity.Property(e => e.ManualAdjustmentAmount)
                .HasColumnType("decimal(18, 2)")
                .HasColumnName("manual_adjustment_amount");
            entity.Property(e => e.Notes)
                // NVARCHAR(MAX) - không giới hạn để tránh lỗi khi Notes tích lũy nhiều audit text
                .HasColumnName("notes");
            entity.Property(e => e.PaidAt)
                .HasColumnType("datetime")
                .HasColumnName("paid_at");
            entity.Property(e => e.RefundAmount)
                .HasColumnType("decimal(18, 2)")
                .HasColumnName("refund_amount");
            entity.Property(e => e.Status)
                .HasMaxLength(50)
                .HasDefaultValue("Draft", "DF_Invoices_Status")
                .HasColumnName("status");
            entity.Property(e => e.TaxAmount)
                .HasColumnType("decimal(18, 2)")
                .HasColumnName("tax_amount");
            entity.Property(e => e.TotalDamageAmount)
                .HasColumnType("decimal(18, 2)")
                .HasColumnName("total_damage_amount");
            entity.Property(e => e.TotalRoomAmount)
                .HasColumnType("decimal(18, 2)")
                .HasColumnName("total_room_amount");
            entity.Property(e => e.TotalServiceAmount)
                .HasColumnType("decimal(18, 2)")
                .HasColumnName("total_service_amount");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("datetime")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.Booking).WithMany(p => p.Invoices)
                .HasForeignKey(d => d.BookingId)
                .HasConstraintName("FK_Invoices_Bookings");
        });

        modelBuilder.Entity<InvoiceBookingDetail>(entity =>
{
    entity.HasKey(e => e.Id).HasName("PK__InvoiceBookingDetails__3213E83F");

    entity.ToTable("Invoice_Booking_Details");

    entity.HasIndex(e => new { e.InvoiceId, e.BookingDetailId }, "UQ_InvoiceBookingDetails_InvoiceDetail")
        .IsUnique();

    entity.HasIndex(e => e.BookingDetailId, "IX_InvoiceBookingDetails_BookingDetail");

    entity.Property(e => e.Id).HasColumnName("id");
    entity.Property(e => e.InvoiceId).HasColumnName("invoice_id");
    entity.Property(e => e.BookingDetailId).HasColumnName("booking_detail_id");
    entity.Property(e => e.RoomCharge)
        .HasColumnType("decimal(18, 2)")
        .HasColumnName("room_charge");
    entity.Property(e => e.ServiceCharge)
        .HasColumnType("decimal(18, 2)")
        .HasColumnName("service_charge");
    entity.Property(e => e.DamageCharge)
        .HasColumnType("decimal(18, 2)")
        .HasColumnName("damage_charge");
    entity.Property(e => e.DiscountAmount)
        .HasColumnType("decimal(18, 2)")
        .HasColumnName("discount_amount");
    entity.Property(e => e.ExtraFeeAmount)
        .HasColumnType("decimal(18, 2)")
        .HasColumnName("extra_fee_amount");
    entity.Property(e => e.TaxAmount)
        .HasColumnType("decimal(18, 2)")
        .HasColumnName("tax_amount");
    entity.Property(e => e.LineTotal)
        .HasColumnType("decimal(18, 2)")
        .HasColumnName("line_total");
    entity.Property(e => e.CreatedAt)
        .HasDefaultValueSql("(getdate())", "DF_InvoiceBookingDetails_CreatedAt")
        .HasColumnType("datetime")
        .HasColumnName("created_at");

    entity.HasOne(d => d.Invoice).WithMany(p => p.InvoiceBookingDetails)
        .HasForeignKey(d => d.InvoiceId)
        .HasConstraintName("FK_InvoiceBookingDetails_Invoices");

    entity.HasOne(d => d.BookingDetail).WithMany(p => p.InvoiceBookingDetails)
        .HasForeignKey(d => d.BookingDetailId)
        .HasConstraintName("FK_InvoiceBookingDetails_BookingDetails");
});

        modelBuilder.Entity<LossAndDamage>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PKLoss_And3213E83FCAB03BE1");
            entity.ToTable("Loss_And_Damages");

            entity.Property(e => e.Id).HasColumnName("id");

            // GIỮ NGUYÊN BẢN GỐC SQL
            entity.Property(e => e.BookingDetailId).HasColumnName("booking_detail_id");
            entity.Property(e => e.RoomInventoryId).HasColumnName("room_inventory_id");
            entity.Property(e => e.Quantity).HasColumnName("quantity");
            entity.Property(e => e.PenaltyAmount).HasColumnType("decimal(18, 2)").HasColumnName("penalty_amount");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(getdate())").HasColumnType("datetime").HasColumnName("created_at");

            // PHẦN THÊM VÀO (Không ảnh hưởng SQL gốc)
            entity.Property(e => e.EvidenceImageUrl).HasColumnName("evidence_image_url");
            entity.Property(e => e.EvidencePublicId).HasMaxLength(255).HasColumnName("evidence_public_id");
            entity.Property(e => e.Status).HasMaxLength(20).HasDefaultValue("OPEN").HasColumnName("status");
            entity.Property(e => e.UpdatedAt).HasColumnType("datetime").HasColumnName("updated_at");
            entity.Property(e => e.RoomId).HasColumnName("room_id");
            entity.Property(e => e.ReportedByUserId).HasColumnName("reported_by_user_id");

            entity.HasOne(d => d.BookingDetail).WithMany(p => p.LossAndDamages)
            .HasForeignKey(d => d.BookingDetailId)
            .HasConstraintName("FK_LossAndDamages_BookingDetails");

            entity.HasOne(d => d.RoomInventory).WithMany(p => p.LossAndDamages)
            .HasForeignKey(d => d.RoomInventoryId)
            .HasConstraintName("FK_LossAndDamages_RoomInventory");

            entity.HasOne(d => d.Room).WithMany(p => p.LossAndDamages)
            .HasForeignKey(d => d.RoomId)
            .HasConstraintName("FK_LossAndDamages_Rooms");
        });


        modelBuilder.Entity<LoyaltyPointHistory>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__LoyaltyPointHistories__3213E83F");

            entity.ToTable("Loyalty_Point_Histories");

            entity.HasIndex(e => new { e.BookingId, e.ActionType }, "UQ_LoyaltyPointHistories_BookingAction").IsUnique();

            entity.HasIndex(e => e.UserId, "IX_LoyaltyPointHistories_UserId");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ActionType)
                  .HasMaxLength(50)
                  .HasColumnName("action_type");
            entity.Property(e => e.BalanceAfter).HasColumnName("balance_after");
            entity.Property(e => e.BalanceBefore).HasColumnName("balance_before");
            entity.Property(e => e.BookingId).HasColumnName("booking_id");
            entity.Property(e => e.CreatedAt)
                  .HasDefaultValueSql("(getdate())", "DF_LoyaltyPointHistories_CreatedAt")
                  .HasColumnType("datetime")
                  .HasColumnName("created_at");
            entity.Property(e => e.PointsAdded).HasColumnName("points_added");
            entity.Property(e => e.Reason)
                  .HasMaxLength(500)
                  .HasColumnName("reason");
            entity.Property(e => e.SourceAmount)
                  .HasColumnType("decimal(18, 2)")
                  .HasColumnName("source_amount");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.Booking).WithMany()
                  .HasForeignKey(d => d.BookingId)
                  .OnDelete(DeleteBehavior.Restrict)
                  .HasConstraintName("FK_LoyaltyPointHistories_Bookings");

            entity.HasOne(d => d.User).WithMany()
                  .HasForeignKey(d => d.UserId)
                  .OnDelete(DeleteBehavior.Restrict)
                  .HasConstraintName("FK_LoyaltyPointHistories_Users");
        });

        modelBuilder.Entity<Membership>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Membersh__3213E83F4203903C");

            entity.HasIndex(e => e.TierName, "UQ_Memberships_TierName").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Benefits)
                .HasMaxLength(1000)
                .HasColumnName("benefits");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())", "DF_Memberships_CreatedAt")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.DiscountPercent)
                .HasColumnType("decimal(5, 2)")
                .HasColumnName("discount_percent");
            entity.Property(e => e.MinPoints).HasColumnName("min_points");
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .HasDefaultValue("ACTIVE", "DF_Memberships_Status")
                .HasColumnName("status");
            entity.Property(e => e.TierName)
                .HasMaxLength(100)
                .HasColumnName("tier_name");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("datetime")
                .HasColumnName("updated_at");
        });

        modelBuilder.Entity<OrderService>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Order_Se__3213E83F90202CA2");

            entity.ToTable("Order_Services");

            entity.HasIndex(e => e.OrderCode, "UQ_OrderServices_OrderCode").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.BookingDetailId).HasColumnName("booking_detail_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())", "DF_OrderServices_CreatedAt")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.Notes)
                .HasMaxLength(1000)
                .HasColumnName("notes");
            entity.Property(e => e.OrderCode)
                .HasMaxLength(50)
                .HasColumnName("order_code");
            entity.Property(e => e.OrderDate)
                .HasDefaultValueSql("(getdate())", "DF_OrderServices_OrderDate")
                .HasColumnType("datetime")
                .HasColumnName("order_date");
            entity.Property(e => e.Status)
                .HasMaxLength(50)
                .HasDefaultValue("Pending", "DF_OrderServices_Status")
                .HasColumnName("status");
            entity.Property(e => e.TotalAmount)
                .HasColumnType("decimal(18, 2)")
                .HasColumnName("total_amount");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("datetime")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.BookingDetail).WithMany(p => p.OrderServices)
                .HasForeignKey(d => d.BookingDetailId)
                .HasConstraintName("FK_OrderServices_BookingDetails");
        });

        modelBuilder.Entity<OrderServiceDetail>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Order_Se__3213E83F7E2A779A");

            entity.ToTable("Order_Service_Details");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.LineTotal)
                .HasColumnType("decimal(18, 2)")
                .HasColumnName("line_total");
            entity.Property(e => e.Notes)
                .HasMaxLength(500)
                .HasColumnName("notes");
            entity.Property(e => e.OrderServiceId).HasColumnName("order_service_id");
            entity.Property(e => e.Quantity).HasColumnName("quantity");
            entity.Property(e => e.ServiceId).HasColumnName("service_id");
            entity.Property(e => e.UnitPrice)
                .HasColumnType("decimal(18, 2)")
                .HasColumnName("unit_price");
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .HasDefaultValue("Active")
                .HasColumnName("status");

            entity.HasOne(d => d.OrderService).WithMany(p => p.OrderServiceDetails)
                .HasForeignKey(d => d.OrderServiceId)
                .HasConstraintName("FK_OrderServiceDetails_OrderServices");

            entity.HasOne(d => d.Service).WithMany(p => p.OrderServiceDetails)
                .HasForeignKey(d => d.ServiceId)
                .HasConstraintName("FK_OrderServiceDetails_Services");
        });

        modelBuilder.Entity<Payment>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Payments__3213E83FC756B6FE");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.AmountPaid)
                .HasColumnType("decimal(18, 2)")
                .HasColumnName("amount_paid");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())", "DF_Payments_CreatedAt")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.GatewayName)
                .HasMaxLength(100)
                .HasColumnName("gateway_name");
            entity.Property(e => e.InvoiceId).HasColumnName("invoice_id");
            entity.Property(e => e.PaymentDate)
                .HasDefaultValueSql("(getdate())", "DF_Payments_PaymentDate")
                .HasColumnType("datetime")
                .HasColumnName("payment_date");
            entity.Property(e => e.PaymentDirection)
                .HasMaxLength(10)
                .HasDefaultValue("IN", "DF_Payments_PaymentDirection")
                .HasColumnName("payment_direction");
            entity.Property(e => e.PaymentMethod)
                .HasMaxLength(50)
                .HasColumnName("payment_method");
            entity.Property(e => e.ProviderResponse).HasColumnName("provider_response");
            entity.Property(e => e.Status)
                .HasMaxLength(50)
                .HasDefaultValue("SUCCESS", "DF_Payments_Status")
                .HasColumnName("status");
            entity.Property(e => e.TransactionCode)
                .HasMaxLength(100)
                .HasColumnName("transaction_code");

            entity.HasOne(d => d.Invoice).WithMany(p => p.Payments)
                .HasForeignKey(d => d.InvoiceId)
                .HasConstraintName("FK_Payments_Invoices");
        });

        modelBuilder.Entity<Permission>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Permissi__3213E83F61370857");

            entity.HasIndex(e => e.Name, "UQ_Permissions_Name").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())", "DF_Permissions_CreatedAt")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.Description)
                .HasMaxLength(500)
                .HasColumnName("description");
            entity.Property(e => e.GroupName)
                .HasMaxLength(100)
                .HasColumnName("group_name");
            entity.Property(e => e.Name)
                .HasMaxLength(150)
                .HasColumnName("name");
        });

        modelBuilder.Entity<Review>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Reviews__3213E83F49842445");

            entity.HasIndex(e => new { e.RoomTypeId, e.IsApproved, e.Status }, "IX_Reviews_Moderation");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Comment).HasColumnName("comment");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())", "DF_Reviews_CreatedAt")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.ImagePublicId)
                .HasMaxLength(255)
                .HasColumnName("image_public_id");
            entity.Property(e => e.ImageUrl).HasColumnName("image_url");
            entity.Property(e => e.LikeCount)
                .HasDefaultValue(0)
                .HasColumnName("like_count");
            entity.Property(e => e.Highlight)
                .HasMaxLength(255)
                .HasColumnName("highlight");
            entity.Property(e => e.ServiceQuality)
                .HasMaxLength(255)
                .HasColumnName("service_quality");
            entity.Property(e => e.IsApproved)
                .HasDefaultValue(true, "DF_Reviews_IsApproved")
                .HasColumnName("is_approved");
            entity.Property(e => e.Rating).HasColumnName("rating");
            entity.Property(e => e.RoomTypeId).HasColumnName("room_type_id");
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .HasDefaultValue("VISIBLE", "DF_Reviews_Status")
                .HasColumnName("status");
            // ⚠️ FIX: Cột updated_at không tồn tại trong bảng Reviews thực tế.
            // Bỏ qua property này để tránh "Invalid column name 'updated_at'" khi INSERT.
            entity.Ignore(e => e.UpdatedAt);
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.RoomType).WithMany(p => p.Reviews)
                .HasForeignKey(d => d.RoomTypeId)
                .HasConstraintName("FK_Reviews_RoomTypes");

            entity.HasOne(d => d.User).WithMany(p => p.Reviews)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK_Reviews_Users");

            // ==========================================
            // THÊM MỚI: GLOBAL QUERY FILTER CHO SOFT DELETE
            // Tự động lọc các review bị ẩn khỏi mọi truy vấn GET
            // ==========================================
            entity.HasQueryFilter(e => e.IsApproved);
        });

        modelBuilder.Entity<Role>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Roles__3213E83F9F5496FA");

            entity.HasIndex(e => e.Name, "UQ_Roles_Name").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())", "DF_Roles_CreatedAt")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.Description)
                .HasMaxLength(500)
                .HasColumnName("description");
            entity.Property(e => e.Name)
                .HasMaxLength(100)
                .HasColumnName("name");
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .HasDefaultValue("ACTIVE", "DF_Roles_Status")
                .HasColumnName("status");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("datetime")
                .HasColumnName("updated_at");
        });

        modelBuilder.Entity<RolePermission>(entity =>
        {
            entity.HasKey(e => new { e.RoleId, e.PermissionId });

            entity.ToTable("Role_Permissions");

            entity.Property(e => e.RoleId).HasColumnName("role_id");
            entity.Property(e => e.PermissionId).HasColumnName("permission_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())", "DF_RolePermissions_CreatedAt")
                .HasColumnType("datetime")
                .HasColumnName("created_at");

            entity.HasOne(d => d.Permission).WithMany(p => p.RolePermissions)
                .HasForeignKey(d => d.PermissionId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_RolePermissions_Permissions");

            entity.HasOne(d => d.Role).WithMany(p => p.RolePermissions)
                .HasForeignKey(d => d.RoleId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_RolePermissions_Roles");
        });

        modelBuilder.Entity<Room>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Rooms__3213E83FF5591627");

            entity.HasIndex(e => new { e.RoomTypeId, e.Status, e.CleaningStatus }, "IX_Rooms_SearchStatus");

            entity.HasIndex(e => e.RoomNumber, "UQ_Rooms_Number").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CleaningStatus)
                .HasMaxLength(50)
                .HasDefaultValue("Clean", "DF_Rooms_CleaningStatus")
                .HasColumnName("cleaning_status");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())", "DF_Rooms_CreatedAt")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.Floor).HasColumnName("floor");
            entity.Property(e => e.Notes)
                .HasMaxLength(500)
                .HasColumnName("notes");
            entity.Property(e => e.RoomNumber)
                .HasMaxLength(50)
                .HasColumnName("room_number");
            entity.Property(e => e.RoomTypeId).HasColumnName("room_type_id");
            entity.Property(e => e.Status)
                .HasMaxLength(50)
                .HasDefaultValue("Available", "DF_Rooms_Status")
                .HasColumnName("status");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("datetime")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.RoomType).WithMany(p => p.Rooms)
                .HasForeignKey(d => d.RoomTypeId)
                .HasConstraintName("FK_Rooms_RoomTypes");
        });

        modelBuilder.Entity<RoomImage>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Room_Ima__3213E83F32B8D80B");

            entity.ToTable("Room_Images");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CloudPublicId)
                .HasMaxLength(255)
                .HasColumnName("cloud_public_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())", "DF_RoomImages_CreatedAt")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.ImageUrl).HasColumnName("image_url");
            entity.Property(e => e.IsPrimary).HasColumnName("is_primary");
            entity.Property(e => e.RoomTypeId).HasColumnName("room_type_id");
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .HasDefaultValue("ACTIVE", "DF_RoomImages_Status")
                .HasColumnName("status");

            entity.HasOne(d => d.RoomType).WithMany(p => p.RoomImages)
                .HasForeignKey(d => d.RoomTypeId)
                .HasConstraintName("FK_RoomImages_RoomTypes");
        });

        modelBuilder.Entity<Equipment>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.ToTable("Equipments");

            entity.Property(e => e.Id).HasColumnName("Id");
            entity.Property(e => e.ItemCode).HasMaxLength(50);
            entity.Property(e => e.Name).HasMaxLength(255);
            entity.Property(e => e.Category).HasMaxLength(100);
            entity.Property(e => e.Unit).HasMaxLength(50);
            entity.Property(e => e.TotalQuantity).HasColumnName("TotalQuantity");
            entity.Property(e => e.InUseQuantity).HasColumnName("InUseQuantity");
            entity.Property(e => e.DamagedQuantity).HasColumnName("DamagedQuantity");
            entity.Property(e => e.LiquidatedQuantity).HasColumnName("LiquidatedQuantity");
            entity.Property(e => e.BasePrice).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.DefaultPriceIfLost).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.Supplier).HasMaxLength(255);
            entity.Property(e => e.IsActive).HasColumnName("IsActive");
            entity.Property(e => e.CreatedAt).HasColumnType("datetime");
            entity.Property(e => e.UpdatedAt).HasColumnType("datetime");
            entity.Property(e => e.ImageUrl).HasColumnName("ImageUrl");
        });

        modelBuilder.Entity<RoomInventory>(entity =>
    {
        entity.HasKey(e => e.Id).HasName("PKRoom_Inv3213E83F11FADD17");

        entity.ToTable("Room_Inventory");

        entity.Property(e => e.Id).HasColumnName("id");
        entity.Property(e => e.RoomId).HasColumnName("room_id");

        entity.Property(e => e.Quantity)
            .HasDefaultValue(1)
            .HasColumnName("quantity");

        entity.Property(e => e.PriceIfLost)
            .HasColumnType("decimal(18, 2)")
            .HasColumnName("price_if_lost");

        entity.Property(e => e.Note)
            .HasMaxLength(255)
            .HasColumnName("note");

        entity.Property(e => e.IsActive)
            .HasDefaultValue(true)
            .HasColumnName("is_active");

        entity.Property(e => e.ItemType)
            .HasMaxLength(50)
            .HasDefaultValue("Asset")
            .HasColumnName("item_type");

        entity.Property(e => e.EquipmentId)
            .HasColumnName("EquipmentId");

        entity.HasOne(d => d.Room).WithMany(p => p.RoomInventories)
            .HasForeignKey(d => d.RoomId)
            .HasConstraintName("FK_RoomInventory_Rooms");
    });

        modelBuilder.Entity<RoomType>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Room_Typ__3213E83F2475B660");

            entity.ToTable("Room_Types");

            entity.HasIndex(e => e.Name, "UQ_RoomTypes_Name").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.BasePrice)
                .HasColumnType("decimal(18, 2)")
                .HasColumnName("base_price");
            entity.Property(e => e.BedType)
                .HasMaxLength(100)
                .HasColumnName("bed_type");
            entity.Property(e => e.CapacityAdults).HasColumnName("capacity_adults");
            entity.Property(e => e.CapacityChildren).HasColumnName("capacity_children");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())", "DF_RoomTypes_CreatedAt")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.EarlyCheckinFeePercent)
                .HasColumnType("decimal(5, 2)")
                .HasColumnName("early_checkin_fee_percent");
            entity.Property(e => e.ExtraHourPrice)
                .HasColumnType("decimal(18, 2)")
                .HasColumnName("extra_hour_price");
            entity.Property(e => e.LateCheckoutFeePercent)
                .HasColumnType("decimal(5, 2)")
                .HasColumnName("late_checkout_fee_percent");
            entity.Property(e => e.Name)
                .HasMaxLength(255)
                .HasColumnName("name");
            entity.Property(e => e.SizeSqm)
                .HasColumnType("decimal(10, 2)")
                .HasColumnName("size_sqm");
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .HasDefaultValue("ACTIVE", "DF_RoomTypes_Status")
                .HasColumnName("status");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("datetime")
                .HasColumnName("updated_at");
        });

        modelBuilder.Entity<RoomInventory>(entity =>
{
    entity.HasKey(e => e.Id).HasName("PKRoom_Inv3213E83F11FADD17");

    entity.ToTable("Room_Inventory");

    entity.Property(e => e.Id).HasColumnName("id");
    entity.Property(e => e.RoomId).HasColumnName("room_id");

    entity.Property(e => e.Quantity)
        .HasDefaultValue(1)
        .HasColumnName("quantity");

    entity.Property(e => e.PriceIfLost)
        .HasColumnType("decimal(18, 2)")
        .HasColumnName("price_if_lost");

    entity.Property(e => e.Note)
        .HasMaxLength(255)
        .HasColumnName("note");

    entity.Property(e => e.IsActive)
        .HasDefaultValue(true)
        .HasColumnName("is_active");

    entity.Property(e => e.ItemType)
        .HasMaxLength(50)
        .HasDefaultValue("Asset")
        .HasColumnName("item_type");

    entity.Property(e => e.EquipmentId).HasColumnName("EquipmentId");

    entity.HasOne(d => d.Room).WithMany(p => p.RoomInventories)
        .HasForeignKey(d => d.RoomId)
        .HasConstraintName("FK_RoomInventory_Rooms");
});
        modelBuilder.Entity<Service>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Services__3213E83F37D05537");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CategoryId).HasColumnName("category_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())", "DF_Services_CreatedAt")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.Description)
                .HasMaxLength(500)
                .HasColumnName("description");
            entity.Property(e => e.ImageUrl).HasColumnName("image_url");
            entity.Property(e => e.Name)
                .HasMaxLength(255)
                .HasColumnName("name");
            entity.Property(e => e.Price)
                .HasColumnType("decimal(18, 2)")
                .HasColumnName("price");
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .HasDefaultValue("ACTIVE", "DF_Services_Status")
                .HasColumnName("status");
            entity.Property(e => e.Unit)
                .HasMaxLength(50)
                .HasColumnName("unit");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("datetime")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.Category).WithMany(p => p.Services)
                .HasForeignKey(d => d.CategoryId)
                .HasConstraintName("FK_Services_ServiceCategories");
        });

        modelBuilder.Entity<ServiceCategory>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Service___3213E83F13335840");

            entity.ToTable("Service_Categories");

            entity.HasIndex(e => e.Name, "UQ_ServiceCategories_Name").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())", "DF_ServiceCategories_CreatedAt")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.Name)
                .HasMaxLength(255)
                .HasColumnName("name");
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .HasDefaultValue("ACTIVE", "DF_ServiceCategories_Status")
                .HasColumnName("status");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Users__3213E83F80FC9A84");

            entity.HasIndex(e => e.Email, "UQ_Users_Email").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.AvatarPublicId)
                .HasMaxLength(255)
                .HasColumnName("avatar_public_id");
            entity.Property(e => e.AvatarUrl).HasColumnName("avatar_url");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())", "DF_Users_CreatedAt")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.Email)
                .HasMaxLength(255)
                .HasColumnName("email");
            entity.Property(e => e.FullName)
                .HasMaxLength(255)
                .HasColumnName("full_name");
            entity.Property(e => e.LastLoginAt)
                .HasColumnType("datetime")
                .HasColumnName("last_login_at");
            entity.Property(e => e.LoyaltyPoints).HasColumnName("loyalty_points");
            entity.Property(e => e.Address)
                .HasMaxLength(500)
                .HasColumnName("address");
            entity.Property(e => e.DateOfBirth)
                .HasColumnType("date")
                .HasColumnName("date_of_birth");
            entity.Property(e => e.LastBirthdayCouponYear)
                .HasColumnName("last_birthday_coupon_year");
            entity.Property(e => e.MembershipId).HasColumnName("membership_id");
            entity.Property(e => e.PasswordHash)
                .HasMaxLength(255)
                .HasColumnName("password_hash");
            entity.Property(e => e.Phone)
                .HasMaxLength(50)
                .HasColumnName("phone");
            entity.Property(e => e.RoleId).HasColumnName("role_id");
            entity.Property(e => e.Status)
                .HasDefaultValue(true, "DF_Users_Status")
                .HasColumnName("status");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("datetime")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.Membership).WithMany(p => p.Users)
                .HasForeignKey(d => d.MembershipId)
                .HasConstraintName("FK_Users_Memberships");

            entity.HasOne(d => d.Role).WithMany(p => p.Users)
                .HasForeignKey(d => d.RoleId)
                .HasConstraintName("FK_Users_Roles");
        });

                modelBuilder.Entity<Voucher>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Vouchers__3213E83FF1D19D35");

            entity.HasIndex(e => e.Code, "UQ_Vouchers_Code").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Code)
                .HasMaxLength(50)
                .HasColumnName("code");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.DiscountType)
                .HasMaxLength(50)
                .HasColumnName("discount_type");
            entity.Property(e => e.DiscountValue)
                .HasColumnType("decimal(18, 2)")
                .HasColumnName("discount_value");
            entity.Property(e => e.MinBookingValue)
                .HasColumnType("decimal(18, 2)")
                .HasColumnName("min_booking_value");
            entity.Property(e => e.ValidFrom)
                .HasColumnType("datetime")
                .HasColumnName("valid_from");
            entity.Property(e => e.ValidTo)
                .HasColumnType("datetime")
                .HasColumnName("valid_to");
            entity.Property(e => e.UsageLimit).HasColumnName("usage_limit");

            entity.Ignore(e => e.MinBookingAmount);
            entity.Ignore(e => e.UsedCount);
            entity.Ignore(e => e.Status);
            entity.Ignore(e => e.CreatedAt);
            entity.Ignore(e => e.UpdatedAt);
            entity.Ignore(e => e.Reason);  // Không có cột Reason trong DB

        });
        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.ToTable("Refresh_Tokens");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.Property(e => e.Token)
            .HasMaxLength(500)
            .HasColumnName("token");

            entity.Property(e => e.JwtId)
            .HasMaxLength(255)
            .HasColumnName("jwt_id");

            entity.Property(e => e.IsUsed).HasColumnName("is_used");
            entity.Property(e => e.IsRevoked).HasColumnName("is_revoked");

            entity.Property(e => e.CreatedAt)
            .HasColumnType("datetime")
            .HasDefaultValueSql("(getdate())")
            .HasColumnName("created_at");

            entity.Property(e => e.ExpireAt)
            .HasColumnType("datetime")
            .HasColumnName("expire_at");

            entity.HasOne(d => d.User)
            .WithMany() // Liên kết 1 chiều từ RefreshToken về User
            .HasForeignKey(d => d.UserId)
            .OnDelete(DeleteBehavior.ClientSetNull)
            .HasConstraintName("FK_RefreshTokens_Users");
        });

        modelBuilder.Entity<RoomTypeAmenity>(entity =>
{
    entity.HasKey(e => new { e.RoomTypeId, e.AmenityId });

    entity.ToTable("RoomType_Amenities");

    entity.Property(e => e.RoomTypeId).HasColumnName("room_type_id");
    entity.Property(e => e.AmenityId).HasColumnName("amenity_id");

    entity.HasOne(d => d.Amenity).WithMany(p => p.RoomTypeAmenities)
        .HasForeignKey(d => d.AmenityId)
        .OnDelete(DeleteBehavior.ClientSetNull)
        .HasConstraintName("FK_RoomTypeAmenities_Amenities");

    entity.HasOne(d => d.RoomType).WithMany(p => p.RoomTypeAmenities)
        .HasForeignKey(d => d.RoomTypeId)
        .OnDelete(DeleteBehavior.ClientSetNull)
        .HasConstraintName("FK_RoomTypeAmenities_RoomTypes");
});
        modelBuilder.Entity<Room>().HasQueryFilter(r => r.DeletedAt == null);
        modelBuilder.Entity<RoomType>().HasQueryFilter(rt => rt.DeletedAt == null);

        modelBuilder.Entity<RoleDashboardPeriodState>(entity =>
        {
            entity.ToTable("Role_Dashboard_Period_States");
            entity.HasKey(e => e.Id);
            entity.HasOne(d => d.Role).WithMany().HasForeignKey(d => d.RoleId).OnDelete(DeleteBehavior.ClientSetNull).HasConstraintName("FK_RoleDashboardPeriod_Roles");
            entity.HasOne(d => d.UpdatedByUser).WithMany().HasForeignKey(d => d.UpdatedBy).HasConstraintName("FK_RoleDashboardPeriod_UpdatedBy");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
