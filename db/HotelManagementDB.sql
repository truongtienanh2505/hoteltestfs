-- ========================================================================
-- PHẦN 1: TẠO DATABASE VÀ CẤU TRÚC BẢNG (ĐÃ GỘP 100% CÁC BỔ SUNG MỚI NHẤT)
-- ========================================================================
USE master;
GO

IF DB_ID(N'HotelManagementDB') IS NOT NULL
BEGIN
    ALTER DATABASE [HotelManagementDB] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE [HotelManagementDB];
END
GO

CREATE DATABASE [HotelManagementDB];
GO

USE [HotelManagementDB];
GO

-- Tạm thời tắt kiểm tra khóa ngoại để tránh lỗi khi chèn dữ liệu
EXEC sp_msforeachtable 'ALTER TABLE ? NOCHECK CONSTRAINT ALL';
GO

-- ==========================================
-- 1. QUẢN LÝ QUYỀN VÀ NGƯỜI DÙNG
-- ==========================================
CREATE TABLE [dbo].[Roles](
	[id] [int] IDENTITY(1,1) NOT NULL PRIMARY KEY,
	[name] [nvarchar](100) NOT NULL,
	[description] [nvarchar](max) NULL,
	[status] [nvarchar](20) NOT NULL DEFAULT 'ACTIVE',
	[created_at] [datetime] NULL DEFAULT GETDATE(),
	[updated_at] [datetime] NULL
);

CREATE TABLE [dbo].[Permissions](
	[id] [int] IDENTITY(1,1) NOT NULL PRIMARY KEY,
	[name] [nvarchar](100) NOT NULL,
	[description] [nvarchar](500) NULL,
	[group_name] [nvarchar](100) NULL,
	[created_at] [datetime] NULL DEFAULT GETDATE()
);

CREATE TABLE [dbo].[Role_Permissions](
	[role_id] [int] NOT NULL,
	[permission_id] [int] NOT NULL,
	[created_at] [datetime] DEFAULT GETDATE(),
    PRIMARY KEY ([role_id], [permission_id])
);

CREATE TABLE [dbo].[Memberships](
	[id] [int] IDENTITY(1,1) NOT NULL PRIMARY KEY,
	[tier_name] [nvarchar](100) NOT NULL,
	[min_points] [int] NULL DEFAULT 0,
	[discount_percent] [decimal](5, 2) NULL DEFAULT 0.00,
	[benefits] [nvarchar](1000) NULL,
	[status] [nvarchar](20) NOT NULL DEFAULT 'ACTIVE',
	[created_at] [datetime] NULL DEFAULT GETDATE(),
	[updated_at] [datetime] NULL
);

CREATE TABLE [dbo].[Users](
	[id] [int] IDENTITY(1,1) NOT NULL PRIMARY KEY,
	[role_id] [int] NULL,
	[membership_id] [int] NULL,
	[full_name] [nvarchar](255) NOT NULL,
	[email] [nvarchar](255) NOT NULL UNIQUE,
	[phone] [nvarchar](50) NULL,
	[password_hash] [nvarchar](max) NOT NULL,
	[status] [bit] NULL DEFAULT 1,
	[avatar_url] [nvarchar](255) NULL,
	[avatar_public_id] [nvarchar](255) NULL,
	[loyalty_points] [int] NOT NULL DEFAULT 0,
	[address] [nvarchar](500) NULL,
	[date_of_birth] [date] NULL,
	[last_birthday_coupon_year] [int] NULL,
	[created_at] [datetime] NULL DEFAULT GETDATE(),
	[updated_at] [datetime] NULL,
	[last_login_at] [datetime] NULL,
	[identity_document_public_id] [nvarchar](max) NULL
);

-- BẢNG MỚI THEO CODE CỦA BẠN
CREATE TABLE [dbo].[User_Permissions] (
    [user_id] INT NOT NULL,
    [permission_id] INT NOT NULL,
    [is_granted] BIT NOT NULL, 
    [created_at] DATETIME DEFAULT GETDATE(),
    PRIMARY KEY ([user_id], [permission_id])
);

-- BẢNG MỚI THEO CODE CỦA BẠN
CREATE TABLE [dbo].[Refresh_Tokens] (
    [id] int NOT NULL IDENTITY(1,1) PRIMARY KEY,
    [user_id] int NOT NULL,
    [token] nvarchar(500) NOT NULL,
    [jwt_id] nvarchar(255) NOT NULL,
    [is_used] bit NOT NULL DEFAULT 0,
    [is_revoked] bit NOT NULL DEFAULT 0,
    [created_at] datetime NOT NULL DEFAULT GETDATE(),
    [expire_at] datetime NOT NULL
);
CREATE INDEX [IX_Refresh_Tokens_user_id] ON [dbo].[Refresh_Tokens] ([user_id]);


-- ==========================================
-- 2. PHÒNG VÀ VẬT TƯ (INVENTORY)
-- ==========================================
CREATE TABLE [dbo].[Amenities](
	[id] [int] IDENTITY(1,1) NOT NULL PRIMARY KEY,
	[name] [nvarchar](255) NOT NULL,
	[icon_url] [nvarchar](max) NULL,
	[is_active] [bit] NULL DEFAULT 1,
	[status] [nvarchar](20) NOT NULL DEFAULT 'ACTIVE',
	[created_at] [datetime] NULL DEFAULT GETDATE(),
	[UpdatedAt] [datetime] NULL,
	[DeletedAt] [datetime] NULL
);

CREATE TABLE [dbo].[Room_Types](
	[id] [int] IDENTITY(1,1) NOT NULL PRIMARY KEY,
	[name] [nvarchar](255) NOT NULL,
	[base_price] [decimal](18, 2) NOT NULL,
	[capacity_adults] [int] NOT NULL DEFAULT 2,
	[capacity_children] [int] NOT NULL DEFAULT 0,
	[description] [nvarchar](max) NULL,
	[size_sqm] [int] NULL,
	[bed_type] [nvarchar](100) NULL,
	[view_type] [nvarchar](100) NULL,
	[slug] [varchar](255) NULL,
	[content] [nvarchar](max) NULL,
	[early_checkin_fee_percent] [decimal](5,2) NOT NULL DEFAULT 0,
	[late_checkout_fee_percent] [decimal](5,2) NOT NULL DEFAULT 0,
	[extra_hour_price] [decimal](18,2) NOT NULL DEFAULT 0,
	[status] [nvarchar](20) NOT NULL DEFAULT 'ACTIVE',
	[is_active] [bit] NULL DEFAULT 1,
	[ImageUrl] [nvarchar](max) NULL,
	[CloudinaryPublicId] [nvarchar](255) NULL,
	[created_at] [datetime] NULL DEFAULT GETDATE(),
	[updated_at] [datetime] NULL,
	[DeletedAt] [datetime] NULL
);

CREATE TABLE [dbo].[RoomType_Amenities](
	[room_type_id] [int] NOT NULL,
	[amenity_id] [int] NOT NULL,
    PRIMARY KEY ([room_type_id], [amenity_id])
);

CREATE TABLE [dbo].[Room_Images](
	[id] [int] IDENTITY(1,1) NOT NULL PRIMARY KEY,
	[room_type_id] [int] NULL,
	[image_url] [nvarchar](max) NOT NULL,
	[cloud_public_id] [nvarchar](255) NULL,
	[is_primary] [bit] NULL DEFAULT 0,
	[is_active] [bit] NULL DEFAULT 1,
	[status] [nvarchar](20) NOT NULL DEFAULT 'ACTIVE',
	[created_at] [datetime] NULL DEFAULT GETDATE()
);

CREATE TABLE [dbo].[Rooms](
	[id] [int] IDENTITY(1,1) NOT NULL PRIMARY KEY,
	[room_type_id] [int] NULL,
	[room_number] [nvarchar](50) NOT NULL,
	[floor] [int] NULL,
	[status] [nvarchar](50) NULL DEFAULT 'Available',
	[cleaning_status] [varchar](50) NULL DEFAULT 'Clean',
	[extension_number] [varchar](20) NULL,
	[notes] [nvarchar](max) NULL,
	[is_active] [bit] NULL DEFAULT 1,
	[created_at] [datetime] NULL DEFAULT GETDATE(),
	[updated_at] [datetime] NULL,
    [DeletedAt] [datetime] NULL
);

CREATE TABLE [dbo].[Equipments](
	[Id] [int] IDENTITY(1,1) NOT NULL PRIMARY KEY,
	[ItemCode] [varchar](50) NOT NULL UNIQUE,
	[Name] [nvarchar](255) NOT NULL,
	[Category] [nvarchar](100) NOT NULL,
	[Unit] [nvarchar](50) NOT NULL,
	[TotalQuantity] [int] NOT NULL DEFAULT 0,
	[InUseQuantity] [int] NOT NULL DEFAULT 0,
	[DamagedQuantity] [int] NOT NULL DEFAULT 0,
	[LiquidatedQuantity] [int] NOT NULL DEFAULT 0,
	[InStockQuantity] AS ((([TotalQuantity]-[InUseQuantity])-[DamagedQuantity])-[LiquidatedQuantity]),
	[BasePrice] [decimal](18, 2) NOT NULL DEFAULT 0,
	[DefaultPriceIfLost] [decimal](18, 2) NOT NULL DEFAULT 0,
	[Supplier] [nvarchar](255) NULL,
	[IsActive] [bit] NOT NULL DEFAULT 1,
	[ImageUrl] [nvarchar](max) NULL,
	[CreatedAt] [datetime] NULL DEFAULT GETUTCDATE(),
	[UpdatedAt] [datetime] NULL,
	[DeletedAt] [datetime] NULL
);

CREATE TABLE [dbo].[EquipmentSupplierLogs] (
    [Id]          INT            IDENTITY (1, 1) NOT NULL,
    [EquipmentId] INT            NOT NULL,
    [UserId]      INT            NULL,           -- Cho phép NULL nếu là hệ thống tự chạy
    [LogDate]     DATETIME       NOT NULL,       -- Gom nhóm theo ngày
    [LogData]     NVARCHAR (MAX) NOT NULL,       -- Chuỗi JSON chứa mảng các đợt nhập
    CONSTRAINT [PK_EquipmentSupplierLogs] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK_EquipmentSupplierLogs_Equipments] FOREIGN KEY ([EquipmentId]) REFERENCES [dbo].[Equipments] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_EquipmentSupplierLogs_Users] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users] ([Id])
);
GO

-- Tạo index cho khóa ngoại để tối ưu truy vấn
CREATE NONCLUSTERED INDEX [IX_EquipmentSupplierLogs_EquipmentId]
    ON [dbo].[EquipmentSupplierLogs]([EquipmentId] ASC);
GO

CREATE NONCLUSTERED INDEX [IX_EquipmentSupplierLogs_UserId]
    ON [dbo].[EquipmentSupplierLogs]([UserId] ASC);
GO

CREATE TABLE [dbo].[Room_Inventory](
	[id] [int] IDENTITY(1,1) NOT NULL PRIMARY KEY,
	[room_id] [int] NULL,
    [EquipmentId] [int] NOT NULL DEFAULT 0,
	[item_type] [varchar](50) NULL DEFAULT 'Asset',
	[quantity] [int] NULL DEFAULT 1,
	[price_if_lost] [decimal](18, 2) NULL DEFAULT 0,
	[note] [nvarchar](255) NULL,
	[is_active] [bit] NULL DEFAULT 1,
	[item_name] [nvarchar](255) NOT NULL DEFAULT '',
	[status] [nvarchar](20) NOT NULL DEFAULT 'Active',
	[unit] [nvarchar](50) NULL,
	[updated_at] [datetime] NULL
);


-- ==========================================
-- 3. BOOKING, VOUCHERS VÀ DỊCH VỤ
-- ==========================================
CREATE TABLE [dbo].[Vouchers](
	[id] [int] IDENTITY(1,1) NOT NULL PRIMARY KEY,
	[code] [nvarchar](50) NOT NULL UNIQUE,
	[discount_type] [nvarchar](50) NOT NULL,
	[discount_value] [decimal](18, 2) NOT NULL,
	[min_booking_value] [decimal](18, 2) NULL DEFAULT 0,
	[valid_from] [datetime] NULL,
	[valid_to] [datetime] NULL,
	[usage_limit] [int] NULL,
	[user_id] [int] NULL,
	[status] [nvarchar](50) NULL,
	[used_count] [int] NULL,
	[created_at] [datetime] NULL DEFAULT GETDATE(),
	[updated_at] [datetime] NULL
);

CREATE TABLE [dbo].[Bookings](
	[id] [int] IDENTITY(1,1) NOT NULL PRIMARY KEY,
	[user_id] [int] NULL,
	[guest_name] [nvarchar](255) NULL,
	[guest_phone] [nvarchar](50) NULL,
	[guest_email] [nvarchar](255) NULL,
	[booking_code] [nvarchar](50) NOT NULL UNIQUE,
	[voucher_id] [int] NULL,
	[booked_at] [datetime] NOT NULL DEFAULT GETDATE(),
	[hold_expires_at] [datetime] NULL,
	[booking_subtotal] [decimal](18, 2) NOT NULL DEFAULT 0,
	[discount_amount] [decimal](18, 2) NOT NULL DEFAULT 0,
	[final_amount] [decimal](18, 2) NOT NULL DEFAULT 0,
	[payment_status] [nvarchar](50) NOT NULL DEFAULT 'UNPAID',
	[status] [nvarchar](50) NULL DEFAULT 'Pending',
	[notes] [nvarchar](1000) NULL,
	[deposit_amount] [decimal](18, 2) NOT NULL DEFAULT 0,
	[is_points_awarded] [bit] DEFAULT 0,
	[created_at] [datetime] NULL DEFAULT GETDATE(),
	[updated_at] [datetime] NULL,
	[membership_discount_amount] [decimal](18, 2) NULL DEFAULT 0
);

CREATE TABLE [dbo].[Booking_Details](
	[id] [int] IDENTITY(1,1) NOT NULL PRIMARY KEY,
	[booking_id] [int] NULL,
	[room_id] [int] NULL,
	[room_type_id] [int] NULL,
	[check_in_date] [datetime] NOT NULL,
	[check_out_date] [datetime] NOT NULL,
	[price_per_night] [decimal](18, 2) NOT NULL,
	[adults_count] [int] NOT NULL DEFAULT 1,
	[children_count] [int] NOT NULL DEFAULT 0,
	[nights] [int] NOT NULL DEFAULT 1,
	[early_check_in_fee] [decimal](18, 2) NOT NULL DEFAULT 0,
	[late_check_out_fee] [decimal](18, 2) NOT NULL DEFAULT 0,
	[line_total] [decimal](18, 2) NOT NULL DEFAULT 0,
	[status] [nvarchar](50) NOT NULL DEFAULT 'Booked',
	[identity_document_url] [nvarchar](max) NULL,
	[identity_document_public_id] [nvarchar](255) NULL,
	[actual_check_in_at] [datetime] NULL,
	[actual_check_out_at] [datetime] NULL,
	[created_at] [datetime] NULL DEFAULT GETDATE(),
	[updated_at] [datetime] NULL
);

CREATE TABLE [dbo].[Invoices](
	[id] [int] IDENTITY(1,1) NOT NULL PRIMARY KEY,
	[booking_id] [int] NULL,
	[total_room_amount] [decimal](18, 2) NULL DEFAULT 0,
	[total_service_amount] [decimal](18, 2) NULL DEFAULT 0,
	[discount_amount] [decimal](18, 2) NULL DEFAULT 0,
	[tax_amount] [decimal](18, 2) NULL DEFAULT 0,
	[final_total] [decimal](18, 2) NULL DEFAULT 0,
	[status] [nvarchar](50) NULL DEFAULT 'Unpaid'
);

CREATE TABLE [dbo].[Payments](
	[id] [int] IDENTITY(1,1) NOT NULL PRIMARY KEY,
	[invoice_id] [int] NULL,
	[payment_method] [nvarchar](50) NULL,
	[amount_paid] [decimal](18, 2) NOT NULL,
	[transaction_code] [nvarchar](100) NULL,
	[payment_date] [datetime] NULL DEFAULT GETDATE()
);

CREATE TABLE [dbo].[Loss_And_Damages](
	[id] [int] IDENTITY(1,1) NOT NULL PRIMARY KEY,
	[booking_detail_id] [int] NULL,
	[room_inventory_id] [int] NULL,
	[room_id] [int] NULL,
	[quantity] [int] NOT NULL,
	[penalty_amount] [decimal](18, 2) NOT NULL,
	[description] [nvarchar](max) NULL,
	[ImageUrl] [nvarchar](max) NULL,
    [evidence_image_url] [nvarchar](max) NULL,
    [evidence_public_id] [nvarchar](255) NULL,
    [reported_by_user_id] [int] NULL,
    [status] [nvarchar](50) DEFAULT 'Pending',
	[created_at] [datetime] NULL DEFAULT GETDATE(),
    [updated_at] [datetime] NULL
);

CREATE TABLE [dbo].[Service_Categories](
	[id] [int] IDENTITY(1,1) NOT NULL PRIMARY KEY,
	[name] [nvarchar](255) NOT NULL,
	[status] [nvarchar](50) NOT NULL DEFAULT 'ACTIVE',
	[created_at] [datetime] NULL DEFAULT GETDATE()
);

CREATE TABLE [dbo].[Services](
	[id] [int] IDENTITY(1,1) NOT NULL PRIMARY KEY,
	[category_id] [int] NULL,
	[name] [nvarchar](255) NOT NULL,
	[description] [nvarchar](max) NULL,
	[price] [decimal](18, 2) NOT NULL,
	[unit] [nvarchar](50) NULL,
	[image_url] [nvarchar](max) NULL,
	[status] [nvarchar](50) NOT NULL DEFAULT 'ACTIVE',
	[created_at] [datetime] NULL DEFAULT GETDATE(),
	[updated_at] [datetime] NULL,
	[DeletedAt] [datetime] NULL
);

CREATE TABLE [dbo].[Order_Services](
	[id] [int] IDENTITY(1,1) NOT NULL PRIMARY KEY,
	[booking_detail_id] [int] NULL,
	[order_date] [datetime] NULL DEFAULT GETDATE(),
	[total_amount] [decimal](18, 2) NULL DEFAULT 0,
	[status] [nvarchar](50) NULL DEFAULT 'Pending'
);

CREATE TABLE [dbo].[Order_Service_Details](
	[id] [int] IDENTITY(1,1) NOT NULL PRIMARY KEY,
	[order_service_id] [int] NULL,
	[service_id] [int] NULL,
	[quantity] [int] NOT NULL,
	[unit_price] [decimal](18, 2) NOT NULL,
	[status] [nvarchar](20) NOT NULL DEFAULT 'Active'
);


-- ==========================================
-- 4. BÀI VIẾT, ĐÁNH GIÁ VÀ HỆ THỐNG KHÁC
-- ==========================================
CREATE TABLE [dbo].[Reviews](
	[id] [int] IDENTITY(1,1) NOT NULL PRIMARY KEY,
	[user_id] [int] NULL,
	[room_type_id] [int] NULL,
	[rating] [int] NULL CHECK (rating >= 1 AND rating <= 5),
	[comment] [nvarchar](max) NULL,
	[image_url] [nvarchar](max) NULL, 
    [image_public_id] [nvarchar](255) NULL, 
    [is_approved] [bit] DEFAULT 1,
    [status] [varchar](50) DEFAULT 'VISIBLE',
	[created_at] [datetime] NULL DEFAULT GETDATE(),
	[like_count] [int] NOT NULL DEFAULT 0,
	[highlight] [nvarchar](255) NULL,
	[service_quality] [nvarchar](255) NULL
);

CREATE TABLE [dbo].[Article_Categories](
	[id] [int] IDENTITY(1,1) NOT NULL PRIMARY KEY,
	[name] [nvarchar](255) NOT NULL,
	[status] [nvarchar](20) NOT NULL DEFAULT 'ACTIVE',
	[created_at] [datetime] NULL DEFAULT GETDATE(),
	[updated_at] [datetime] NULL,
	[is_active] [bit] NULL DEFAULT 1
);

CREATE TABLE [dbo].[Articles](
	[id] [int] IDENTITY(1,1) NOT NULL PRIMARY KEY,
	[category_id] [int] NULL,
	[author_id] [int] NULL,
	[title] [nvarchar](max) NOT NULL,
	[slug] [nvarchar](255) NULL UNIQUE,
	[summary] [nvarchar](1000) NULL,
	[content] [nvarchar](max) NULL,
	[thumbnail_url] [nvarchar](max) NULL,
	[thumbnail_public_id] [nvarchar](255) NULL,
	[tags] [nvarchar](max) NULL,
	[meta_title] [nvarchar](500) NULL,
	[meta_description] [nvarchar](1000) NULL,
	[status] [nvarchar](50) NOT NULL DEFAULT 'Draft',
	[is_published] [bit] NULL DEFAULT 0,
	[published_at] [datetime] NULL DEFAULT GETDATE(),
	[is_active] [bit] NULL DEFAULT 1,
	[created_at] [datetime] NULL DEFAULT GETDATE(),
	[updated_at] [datetime] NULL
);

CREATE TABLE [dbo].[ArticleCategoryMappings](
	[ArticleId] [int] NOT NULL,
	[CategoryId] [int] NOT NULL,
	PRIMARY KEY CLUSTERED ([ArticleId], [CategoryId]),
	FOREIGN KEY ([ArticleId]) REFERENCES [dbo].[Articles] ([id]) ON DELETE CASCADE,
	FOREIGN KEY ([CategoryId]) REFERENCES [dbo].[Article_Categories] ([id]) ON DELETE CASCADE
);

CREATE TABLE [dbo].[Attractions](
	[id] [int] IDENTITY(1,1) NOT NULL PRIMARY KEY,
	[name] [nvarchar](255) NOT NULL,
	[distance_km] [decimal](5, 2) NULL,
	[description] [nvarchar](max) NULL,
	[map_embed_link] [nvarchar](max) NULL,
	[latitude] [decimal](10, 8) NULL,
	[longitude] [decimal](11, 8) NULL,
	[address] [nvarchar](500) NULL,
	[image_url] [nvarchar](max) NULL, 
    [image_public_id] [nvarchar](255) NULL, 
    [created_at] [datetime] NULL DEFAULT GETDATE(), 
    [status] [varchar](50) NULL DEFAULT 'ACTIVE',
	[is_active] [bit] NULL DEFAULT 1,
	[type] [nvarchar](max) NULL,
	[updated_at] [datetime] NULL
);

CREATE TABLE [dbo].[Audit_Logs](
	[id] [bigint] IDENTITY(1,1) NOT NULL PRIMARY KEY,
	[user_id] [int] NOT NULL,
	[role_name] [nvarchar](50) NULL,
	[log_date] [date] NOT NULL DEFAULT (CAST(GETDATE() AS DATE)),
	[log_data] [nvarchar](max) NOT NULL DEFAULT N'{"TotalEvents":0, "Events":[]}'
);
GO
-- Thêm role_name vào index để khi đổi role sẽ tạo dòng mới trong cùng ngày
CREATE UNIQUE INDEX [UIX_Audit_Daily] ON [dbo].[Audit_Logs] ([user_id], [role_name], [log_date]);
GO

CREATE TABLE [dbo].[Notifications](
	[id] [int] IDENTITY(1,1) NOT NULL PRIMARY KEY,
	[user_id] [int] NULL,
	[title] [nvarchar](255) NOT NULL,
	[content] [nvarchar](max) NOT NULL,
	[type] [varchar](50) NULL,
	[reference_link] [varchar](255) NULL,
	[is_read] [bit] NOT NULL DEFAULT 0,
	[created_at] [datetime] NULL DEFAULT GETDATE()
);
GO
-- ========================================================================
-- PHẦN 2: CHÈN DỮ LIỆU & THIẾT LẬP KHÓA NGOẠI (FOREIGN KEYS)
-- ========================================================================

SET IDENTITY_INSERT [dbo].[Amenities] ON 

INSERT [dbo].[Amenities] ([id], [name], [icon_url], [is_active]) VALUES (1, N'Wifi Miễn Phí', N'wifi.png', 1)
INSERT [dbo].[Amenities] ([id], [name], [icon_url], [is_active]) VALUES (2, N'Smart TV', N'tv.png', 1)
INSERT [dbo].[Amenities] ([id], [name], [icon_url], [is_active]) VALUES (3, N'Điều Hòa', N'ac.png', 1)
INSERT [dbo].[Amenities] ([id], [name], [icon_url], [is_active]) VALUES (4, N'Bồn Tắm Sứ', N'bathtub.png', 1)
INSERT [dbo].[Amenities] ([id], [name], [icon_url], [is_active]) VALUES (5, N'Ban Công', N'balcony.png', 1)
INSERT [dbo].[Amenities] ([id], [name], [icon_url], [is_active]) VALUES (6, N'Minibar', N'minibar.png', 1)
INSERT [dbo].[Amenities] ([id], [name], [icon_url], [is_active]) VALUES (7, N'Két Sắt', N'safe.png', 1)
INSERT [dbo].[Amenities] ([id], [name], [icon_url], [is_active]) VALUES (8, N'Máy Sấy Tóc', N'hairdryer.png', 1)
INSERT [dbo].[Amenities] ([id], [name], [icon_url], [is_active]) VALUES (9, N'Máy Pha Cà Phê', N'coffee.png', 1)
INSERT [dbo].[Amenities] ([id], [name], [icon_url], [is_active]) VALUES (10, N'Bàn Làm Việc', N'desk.png', 1)
SET IDENTITY_INSERT [dbo].[Amenities] OFF
GO
SET IDENTITY_INSERT [dbo].[Article_Categories] ON 

INSERT [dbo].[Article_Categories] ([id], [name], [is_active]) VALUES (1, N'Tin Tức Khách Sạn', NULL)
INSERT [dbo].[Article_Categories] ([id], [name], [is_active]) VALUES (2, N'Cẩm Nang Du Lịch', NULL)
INSERT [dbo].[Article_Categories] ([id], [name], [is_active]) VALUES (3, N'Khám Phá Ẩm Thực', NULL)
INSERT [dbo].[Article_Categories] ([id], [name], [is_active]) VALUES (4, N'Sự Kiện & Lễ Hội', NULL)
INSERT [dbo].[Article_Categories] ([id], [name], [is_active]) VALUES (5, N'Chương Trình Khuyến Mãi', NULL)
INSERT [dbo].[Article_Categories] ([id], [name], [is_active]) VALUES (6, N'Văn Hóa Địa Phương', NULL)
INSERT [dbo].[Article_Categories] ([id], [name], [is_active]) VALUES (7, N'Hướng Dẫn Di Chuyển', NULL)
INSERT [dbo].[Article_Categories] ([id], [name], [is_active]) VALUES (8, N'Góc Thư Giãn', NULL)
INSERT [dbo].[Article_Categories] ([id], [name], [is_active]) VALUES (9, N'Hỏi Đáp (FAQ)', NULL)
INSERT [dbo].[Article_Categories] ([id], [name], [is_active]) VALUES (10, N'Thư Viện Ảnh', NULL)
SET IDENTITY_INSERT [dbo].[Article_Categories] OFF
GO
SET IDENTITY_INSERT [dbo].[Articles] ON 

INSERT [dbo].[Articles] ([id], [category_id], [author_id], [title], [slug], [content], [thumbnail_url], [published_at], [is_active]) VALUES (1, 1, 1, N'Khai trương nhà hàng mới', N'khai-truong-nha-hang', N'Nội dung...', NULL, CAST(N'2026-03-06T22:07:35.023' AS DateTime), NULL)
INSERT [dbo].[Articles] ([id], [category_id], [author_id], [title], [slug], [content], [thumbnail_url], [published_at], [is_active]) VALUES (2, 2, 2, N'5 điểm đến không thể bỏ lỡ', N'5-diem-den', N'Nội dung...', NULL, CAST(N'2026-03-06T22:07:35.023' AS DateTime), NULL)
INSERT [dbo].[Articles] ([id], [category_id], [author_id], [title], [slug], [content], [thumbnail_url], [published_at], [is_active]) VALUES (3, 3, 3, N'Món ngon hải sản địa phương', N'mon-ngon-hai-san', N'Nội dung...', NULL, CAST(N'2026-03-06T22:07:35.023' AS DateTime), NULL)
INSERT [dbo].[Articles] ([id], [category_id], [author_id], [title], [slug], [content], [thumbnail_url], [published_at], [is_active]) VALUES (4, 4, 1, N'Sự kiện đếm ngược năm mới', N'su-kien-nam-moi', N'Nội dung...', NULL, CAST(N'2026-03-06T22:07:35.023' AS DateTime), NULL)
INSERT [dbo].[Articles] ([id], [category_id], [author_id], [title], [slug], [content], [thumbnail_url], [published_at], [is_active]) VALUES (5, 5, 2, N'Khuyến mãi mùa hè 2026', N'khuyen-mai-mua-he', N'Nội dung...', NULL, CAST(N'2026-03-06T22:07:35.023' AS DateTime), NULL)
INSERT [dbo].[Articles] ([id], [category_id], [author_id], [title], [slug], [content], [thumbnail_url], [published_at], [is_active]) VALUES (6, 6, 3, N'Lịch sử văn hóa vùng miền', N'lich-su-van-hoa', N'Nội dung...', NULL, CAST(N'2026-03-06T22:07:35.023' AS DateTime), NULL)
INSERT [dbo].[Articles] ([id], [category_id], [author_id], [title], [slug], [content], [thumbnail_url], [published_at], [is_active]) VALUES (7, 7, 1, N'Từ sân bay về khách sạn', N'tu-san-bay-ve-ks', N'Nội dung...', NULL, CAST(N'2026-03-06T22:07:35.023' AS DateTime), NULL)
INSERT [dbo].[Articles] ([id], [category_id], [author_id], [title], [slug], [content], [thumbnail_url], [published_at], [is_active]) VALUES (8, 8, 2, N'Cách thư giãn cuối tuần', N'cach-thu-gian', N'Nội dung...', NULL, CAST(N'2026-03-06T22:07:35.023' AS DateTime), NULL)
INSERT [dbo].[Articles] ([id], [category_id], [author_id], [title], [slug], [content], [thumbnail_url], [published_at], [is_active]) VALUES (9, 9, 3, N'Quy định nhận trả phòng', N'quy-dinh-nhan-tra', N'Nội dung...', NULL, CAST(N'2026-03-06T22:07:35.023' AS DateTime), NULL)
INSERT [dbo].[Articles] ([id], [category_id], [author_id], [title], [slug], [content], [thumbnail_url], [published_at], [is_active]) VALUES (10, 10, 1, N'Bộ ảnh resort flycam', N'bo-anh-resort', N'Nội dung...', NULL, CAST(N'2026-03-06T22:07:35.023' AS DateTime), NULL)
SET IDENTITY_INSERT [dbo].[Articles] OFF
GO
SET IDENTITY_INSERT [dbo].[Attractions] ON 

INSERT [dbo].[Attractions] ([id], [name], [distance_km], [description], [map_embed_link], [latitude], [longitude], [address], [is_active]) VALUES (1, N'Chợ Trung Tâm', CAST(1.50 AS Decimal(5, 2)), N'Khu chợ truyền thống sầm uất', N'link_map_1', NULL, NULL, NULL, NULL)
INSERT [dbo].[Attractions] ([id], [name], [distance_km], [description], [map_embed_link], [latitude], [longitude], [address], [is_active]) VALUES (2, N'Bãi Biển Chính', CAST(0.50 AS Decimal(5, 2)), N'Bãi tắm công cộng tuyệt đẹp', N'link_map_2', NULL, NULL, NULL, NULL)
INSERT [dbo].[Attractions] ([id], [name], [distance_km], [description], [map_embed_link], [latitude], [longitude], [address], [is_active]) VALUES (3, N'Bảo Tàng Thành Phố', CAST(3.00 AS Decimal(5, 2)), N'Lưu giữ giá trị lịch sử', N'link_map_3', NULL, NULL, NULL, NULL)
INSERT [dbo].[Attractions] ([id], [name], [distance_km], [description], [map_embed_link], [latitude], [longitude], [address], [is_active]) VALUES (4, N'Phố Đi Bộ', CAST(1.00 AS Decimal(5, 2)), N'Khu vực vui chơi giải trí về đêm', N'link_map_4', NULL, NULL, NULL, NULL)
INSERT [dbo].[Attractions] ([id], [name], [distance_km], [description], [map_embed_link], [latitude], [longitude], [address], [is_active]) VALUES (5, N'Chùa Cổ Lịch Sử', CAST(5.50 AS Decimal(5, 2)), N'Ngôi chùa linh thiêng', N'link_map_5', NULL, NULL, NULL, NULL)
INSERT [dbo].[Attractions] ([id], [name], [distance_km], [description], [map_embed_link], [latitude], [longitude], [address], [is_active]) VALUES (6, N'Khu Vui Chơi Giải Trí', CAST(8.00 AS Decimal(5, 2)), N'Công viên trò chơi quy mô lớn', N'link_map_6', NULL, NULL, NULL, NULL)
INSERT [dbo].[Attractions] ([id], [name], [distance_km], [description], [map_embed_link], [latitude], [longitude], [address], [is_active]) VALUES (7, N'Suối Nước Nóng', CAST(15.00 AS Decimal(5, 2)), N'Điểm nghỉ dưỡng thiên nhiên', N'link_map_7', NULL, NULL, NULL, NULL)
INSERT [dbo].[Attractions] ([id], [name], [distance_km], [description], [map_embed_link], [latitude], [longitude], [address], [is_active]) VALUES (8, N'Làng Nghề Truyền Thống', CAST(12.00 AS Decimal(5, 2)), N'Trải nghiệm văn hóa bản địa', N'link_map_8', NULL, NULL, NULL, NULL)
INSERT [dbo].[Attractions] ([id], [name], [distance_km], [description], [map_embed_link], [latitude], [longitude], [address], [is_active]) VALUES (9, N'Trung Tâm Thương Mại', CAST(2.00 AS Decimal(5, 2)), N'Khu mua sắm cao cấp', N'link_map_9', NULL, NULL, NULL, NULL)
INSERT [dbo].[Attractions] ([id], [name], [distance_km], [description], [map_embed_link], [latitude], [longitude], [address], [is_active]) VALUES (10, N'Điểm Ngắm Hoàng Hôn', CAST(4.00 AS Decimal(5, 2)), N'Nơi có view biển đẹp nhất', N'link_map_10', NULL, NULL, NULL, NULL)
SET IDENTITY_INSERT [dbo].[Attractions] OFF
GO
-- Dọn dẹp dữ liệu cũ (Xóa log quá 3 tháng) mỗi khi nạp lại schema hoặc chạy định kỳ
DELETE FROM [dbo].[Audit_Logs] WHERE [log_date] < DATEADD(MONTH, -3, GETDATE());
GO
GO
SET IDENTITY_INSERT [dbo].[Booking_Details] ON 

INSERT [dbo].[Booking_Details] ([id], [booking_id], [room_id], [room_type_id], [check_in_date], [check_out_date], [price_per_night]) VALUES (1, 1, 1, 1, CAST(N'2026-03-01T00:00:00.000' AS DateTime), CAST(N'2026-03-03T00:00:00.000' AS DateTime), CAST(400000.00 AS Decimal(18, 2)))
INSERT [dbo].[Booking_Details] ([id], [booking_id], [room_id], [room_type_id], [check_in_date], [check_out_date], [price_per_night]) VALUES (2, 2, 2, 2, CAST(N'2026-03-05T00:00:00.000' AS DateTime), CAST(N'2026-03-10T00:00:00.000' AS DateTime), CAST(500000.00 AS Decimal(18, 2)))
INSERT [dbo].[Booking_Details] ([id], [booking_id], [room_id], [room_type_id], [check_in_date], [check_out_date], [price_per_night]) VALUES (3, 3, NULL, 3, CAST(N'2026-04-10T00:00:00.000' AS DateTime), CAST(N'2026-04-12T00:00:00.000' AS DateTime), CAST(700000.00 AS Decimal(18, 2)))
INSERT [dbo].[Booking_Details] ([id], [booking_id], [room_id], [room_type_id], [check_in_date], [check_out_date], [price_per_night]) VALUES (4, 4, NULL, 4, CAST(N'2026-05-01T00:00:00.000' AS DateTime), CAST(N'2026-05-05T00:00:00.000' AS DateTime), CAST(900000.00 AS Decimal(18, 2)))
INSERT [dbo].[Booking_Details] ([id], [booking_id], [room_id], [room_type_id], [check_in_date], [check_out_date], [price_per_night]) VALUES (5, 5, NULL, 5, CAST(N'2026-03-15T00:00:00.000' AS DateTime), CAST(N'2026-03-16T00:00:00.000' AS DateTime), CAST(1200000.00 AS Decimal(18, 2)))
INSERT [dbo].[Booking_Details] ([id], [booking_id], [room_id], [room_type_id], [check_in_date], [check_out_date], [price_per_night]) VALUES (6, 6, 6, 6, CAST(N'2026-02-10T00:00:00.000' AS DateTime), CAST(N'2026-02-12T00:00:00.000' AS DateTime), CAST(1500000.00 AS Decimal(18, 2)))
INSERT [dbo].[Booking_Details] ([id], [booking_id], [room_id], [room_type_id], [check_in_date], [check_out_date], [price_per_night]) VALUES (7, 7, 7, 7, CAST(N'2026-03-07T00:00:00.000' AS DateTime), CAST(N'2026-03-09T00:00:00.000' AS DateTime), CAST(1800000.00 AS Decimal(18, 2)))
INSERT [dbo].[Booking_Details] ([id], [booking_id], [room_id], [room_type_id], [check_in_date], [check_out_date], [price_per_night]) VALUES (8, 8, 13, 8, CAST(N'2026-06-01T00:00:00.000' AS DateTime), CAST(N'2026-06-05T00:00:00.000' AS DateTime), CAST(2500000.00 AS Decimal(18, 2)))
INSERT [dbo].[Booking_Details] ([id], [booking_id], [room_id], [room_type_id], [check_in_date], [check_out_date], [price_per_night]) VALUES (9, 9, 9, 9, CAST(N'2026-01-20T00:00:00.000' AS DateTime), CAST(N'2026-01-25T00:00:00.000' AS DateTime), CAST(5000000.00 AS Decimal(18, 2)))
INSERT [dbo].[Booking_Details] ([id], [booking_id], [room_id], [room_type_id], [check_in_date], [check_out_date], [price_per_night]) VALUES (10, 10, 13, 1, CAST(N'2026-03-06T00:00:00.000' AS DateTime), CAST(N'2026-03-08T00:00:00.000' AS DateTime), CAST(8000000.00 AS Decimal(18, 2)))
SET IDENTITY_INSERT [dbo].[Booking_Details] OFF
GO
SET IDENTITY_INSERT [dbo].[Bookings] ON 

INSERT [dbo].[Bookings] ([id], [user_id], [guest_name], [guest_phone], [guest_email], [booking_code], [voucher_id], [status]) VALUES (1, 6, N'Khách Hàng A', N'0900000006', NULL, N'BK-0001', NULL, N'Completed')
INSERT [dbo].[Bookings] ([id], [user_id], [guest_name], [guest_phone], [guest_email], [booking_code], [voucher_id], [status]) VALUES (2, 7, N'Khách Hàng B', N'0900000007', NULL, N'BK-0002', 1, N'Checked_in')
INSERT [dbo].[Bookings] ([id], [user_id], [guest_name], [guest_phone], [guest_email], [booking_code], [voucher_id], [status]) VALUES (3, 8, N'Khách Hàng C', N'0900000008', NULL, N'BK-0003', NULL, N'Confirmed')
INSERT [dbo].[Bookings] ([id], [user_id], [guest_name], [guest_phone], [guest_email], [booking_code], [voucher_id], [status]) VALUES (4, 9, N'Khách Hàng D', N'0900000009', NULL, N'BK-0004', 2, N'Pending')
INSERT [dbo].[Bookings] ([id], [user_id], [guest_name], [guest_phone], [guest_email], [booking_code], [voucher_id], [status]) VALUES (5, 10, N'Khách Hàng E', N'0900000010', NULL, N'BK-0005', NULL, N'Cancelled')
INSERT [dbo].[Bookings] ([id], [user_id], [guest_name], [guest_phone], [guest_email], [booking_code], [voucher_id], [status]) VALUES (6, NULL, N'Khách Vãng Lai 1', N'0911111111', NULL, N'BK-0006', NULL, N'Completed')
INSERT [dbo].[Bookings] ([id], [user_id], [guest_name], [guest_phone], [guest_email], [booking_code], [voucher_id], [status]) VALUES (7, NULL, N'Khách Vãng Lai 2', N'0922222222', NULL, N'BK-0007', 3, N'Checked_in')
INSERT [dbo].[Bookings] ([id], [user_id], [guest_name], [guest_phone], [guest_email], [booking_code], [voucher_id], [status]) VALUES (8, 6, N'Khách Hàng A', N'0900000006', NULL, N'BK-0008', NULL, N'Confirmed')
INSERT [dbo].[Bookings] ([id], [user_id], [guest_name], [guest_phone], [guest_email], [booking_code], [voucher_id], [status]) VALUES (9, 7, N'Khách Hàng B', N'0900000007', NULL, N'BK-0009', NULL, N'Completed')
INSERT [dbo].[Bookings] ([id], [user_id], [guest_name], [guest_phone], [guest_email], [booking_code], [voucher_id], [status]) VALUES (10, 8, N'Khách Hàng C', N'0900000008', NULL, N'BK-0010', 4, N'Checked_in')
SET IDENTITY_INSERT [dbo].[Bookings] OFF
GO
SET IDENTITY_INSERT [dbo].[Equipments] ON 

INSERT [dbo].[Equipments] ([Id], [ItemCode], [Name], [Category], [Unit], [TotalQuantity], [InUseQuantity], [DamagedQuantity], [LiquidatedQuantity], [BasePrice], [DefaultPriceIfLost], [Supplier], [IsActive], [CreatedAt], [UpdatedAt], [ImageUrl]) VALUES (1, N'TV-SS-43', N'Smart TV Samsung 43 inch', N'Điện tử', N'Cái', 50, 50, 1, 0, CAST(7500000.00 AS Decimal(18, 2)), CAST(8000000.00 AS Decimal(18, 2)), N'Samsung Vietnam', 1, CAST(N'2026-03-25T14:10:11.023' AS DateTime), CAST(N'2026-03-26T17:31:18.543' AS DateTime), N'https://res.cloudinary.com/dzfuzh2xg/image/upload/v1774546277/QuanTriKhachSan/Equipments/cuqwgr36qaagcjkxqz6w.jpg')
INSERT [dbo].[Equipments] ([Id], [ItemCode], [Name], [Category], [Unit], [TotalQuantity], [InUseQuantity], [DamagedQuantity], [LiquidatedQuantity], [BasePrice], [DefaultPriceIfLost], [Supplier], [IsActive], [CreatedAt], [UpdatedAt], [ImageUrl]) VALUES (2, N'AC-DK-9000', N'Điều hòa Daikin 9000 BTU', N'Điện tử', N'Cái', 50, 55, 0, 0, CAST(8200000.00 AS Decimal(18, 2)), CAST(9000000.00 AS Decimal(18, 2)), N'Daikin Vietnam', 1, CAST(N'2026-03-25T14:10:11.023' AS DateTime), CAST(N'2026-03-26T17:30:04.510' AS DateTime), N'https://res.cloudinary.com/dzfuzh2xg/image/upload/v1774546203/QuanTriKhachSan/Equipments/gzxphd2ogyjcqaqwfgdl.jpg')
INSERT [dbo].[Equipments] ([Id], [ItemCode], [Name], [Category], [Unit], [TotalQuantity], [InUseQuantity], [DamagedQuantity], [LiquidatedQuantity], [BasePrice], [DefaultPriceIfLost], [Supplier], [IsActive], [CreatedAt], [UpdatedAt], [ImageUrl]) VALUES (3, N'MB-AF-50', N'Tủ lạnh Minibar Aqua 50L', N'Điện tử', N'Cái', 55, 58, 2, 0, CAST(2500000.00 AS Decimal(18, 2)), CAST(3000000.00 AS Decimal(18, 2)), N'Aqua', 1, CAST(N'2026-03-25T14:10:11.023' AS DateTime), NULL, NULL)
INSERT [dbo].[Equipments] ([Id], [ItemCode], [Name], [Category], [Unit], [TotalQuantity], [InUseQuantity], [DamagedQuantity], [LiquidatedQuantity], [BasePrice], [DefaultPriceIfLost], [Supplier], [IsActive], [CreatedAt], [UpdatedAt], [ImageUrl]) VALUES (4, N'HD-PN-1000', N'Máy sấy tóc Panasonic', N'Điện tử', N'Cái', 60, 58, 5, 1, CAST(450000.00 AS Decimal(18, 2)), CAST(600000.00 AS Decimal(18, 2)), N'Điện Máy Xanh', 1, CAST(N'2026-03-25T14:10:11.023' AS DateTime), NULL, NULL)
INSERT [dbo].[Equipments] ([Id], [ItemCode], [Name], [Category], [Unit], [TotalQuantity], [InUseQuantity], [DamagedQuantity], [LiquidatedQuantity], [BasePrice], [DefaultPriceIfLost], [Supplier], [IsActive], [CreatedAt], [UpdatedAt], [ImageUrl]) VALUES (5, N'KL-SH-17', N'Ấm đun nước siêu tốc Sunhouse', N'Điện tử', N'Cái', 60, 58, 2, 2, CAST(250000.00 AS Decimal(18, 2)), CAST(350000.00 AS Decimal(18, 2)), N'Sunhouse', 1, CAST(N'2026-03-25T14:10:11.023' AS DateTime), NULL, NULL)
INSERT [dbo].[Equipments] ([Id], [ItemCode], [Name], [Category], [Unit], [TotalQuantity], [InUseQuantity], [DamagedQuantity], [LiquidatedQuantity], [BasePrice], [DefaultPriceIfLost], [Supplier], [IsActive], [CreatedAt], [UpdatedAt], [ImageUrl]) VALUES (6, N'BD-KG-20', N'Giường King Size 2m x 2m2', N'Nội thất', N'Chiếc', 20, 24, 0, 0, CAST(12000000.00 AS Decimal(18, 2)), CAST(15000000.00 AS Decimal(18, 2)), N'Nội thất Hòa Phát', 1, CAST(N'2026-03-25T14:10:11.023' AS DateTime), NULL, NULL)
INSERT [dbo].[Equipments] ([Id], [ItemCode], [Name], [Category], [Unit], [TotalQuantity], [InUseQuantity], [DamagedQuantity], [LiquidatedQuantity], [BasePrice], [DefaultPriceIfLost], [Supplier], [IsActive], [CreatedAt], [UpdatedAt], [ImageUrl]) VALUES (7, N'BD-SG-12', N'Giường Single 1m2 x 2m', N'Nội thất', N'Chiếc', 40, 41, 0, 0, CAST(5500000.00 AS Decimal(18, 2)), CAST(7000000.00 AS Decimal(18, 2)), N'Nội thất Hòa Phát', 1, CAST(N'2026-03-25T14:10:11.023' AS DateTime), NULL, NULL)
INSERT [dbo].[Equipments] ([Id], [ItemCode], [Name], [Category], [Unit], [TotalQuantity], [InUseQuantity], [DamagedQuantity], [LiquidatedQuantity], [BasePrice], [DefaultPriceIfLost], [Supplier], [IsActive], [CreatedAt], [UpdatedAt], [ImageUrl]) VALUES (8, N'WD-WD-01', N'Tủ quần áo gỗ công nghiệp', N'Nội thất', N'Cái', 50, 58, 0, 0, CAST(3500000.00 AS Decimal(18, 2)), CAST(5000000.00 AS Decimal(18, 2)), N'Xưởng Gỗ An Cường', 1, CAST(N'2026-03-25T14:10:11.023' AS DateTime), NULL, NULL)
INSERT [dbo].[Equipments] ([Id], [ItemCode], [Name], [Category], [Unit], [TotalQuantity], [InUseQuantity], [DamagedQuantity], [LiquidatedQuantity], [BasePrice], [DefaultPriceIfLost], [Supplier], [IsActive], [CreatedAt], [UpdatedAt], [ImageUrl]) VALUES (9, N'TB-WK-01', N'Bàn làm việc + Ghế đệm', N'Nội thất', N'Bộ', 50, 54, 1, 0, CAST(2200000.00 AS Decimal(18, 2)), CAST(3000000.00 AS Decimal(18, 2)), N'Nội thất Hòa Phát', 1, CAST(N'2026-03-25T14:10:11.023' AS DateTime), NULL, NULL)
INSERT [dbo].[Equipments] ([Id], [ItemCode], [Name], [Category], [Unit], [TotalQuantity], [InUseQuantity], [DamagedQuantity], [LiquidatedQuantity], [BasePrice], [DefaultPriceIfLost], [Supplier], [IsActive], [CreatedAt], [UpdatedAt], [ImageUrl]) VALUES (10, N'HG-WD-01', N'Móc treo quần áo bằng gỗ', N'Nội thất', N'Chiếc', 500, 408, 10, 5, CAST(15000.00 AS Decimal(18, 2)), CAST(30000.00 AS Decimal(18, 2)), N'Nhựa Duy Tân', 1, CAST(N'2026-03-25T14:10:11.023' AS DateTime), NULL, NULL)
INSERT [dbo].[Equipments] ([Id], [ItemCode], [Name], [Category], [Unit], [TotalQuantity], [InUseQuantity], [DamagedQuantity], [LiquidatedQuantity], [BasePrice], [DefaultPriceIfLost], [Supplier], [IsActive], [CreatedAt], [UpdatedAt], [ImageUrl]) VALUES (11, N'TW-BT-01', N'Khăn tắm cotton 70x140cm', N'Đồ vải', N'Chiếc', 200, 110, 5, 10, CAST(85000.00 AS Decimal(18, 2)), CAST(150000.00 AS Decimal(18, 2)), N'Dệt may Thành Công', 1, CAST(N'2026-03-25T14:10:11.023' AS DateTime), CAST(N'2026-03-26T16:28:01.897' AS DateTime), N'https://res.cloudinary.com/dzfuzh2xg/image/upload/v1774542481/QuanTriKhachSan/Equipments/t51at52hvtqpdhxb9ikz.jpg')
INSERT [dbo].[Equipments] ([Id], [ItemCode], [Name], [Category], [Unit], [TotalQuantity], [InUseQuantity], [DamagedQuantity], [LiquidatedQuantity], [BasePrice], [DefaultPriceIfLost], [Supplier], [IsActive], [CreatedAt], [UpdatedAt], [ImageUrl]) VALUES (12, N'TW-FC-01', N'Khăn mặt cotton 30x30cm', N'Đồ vải', N'Chiếc', 200, 108, 2, 5, CAST(25000.00 AS Decimal(18, 2)), CAST(50000.00 AS Decimal(18, 2)), N'Dệt may Thành Công', 1, CAST(N'2026-03-25T14:10:11.023' AS DateTime), CAST(N'2026-03-26T15:50:21.173' AS DateTime), N'https://res.cloudinary.com/dzfuzh2xg/image/upload/v1774540220/QuanTriKhachSan/Equipments/gj8owns6gawqmjz91k2m.jpg')
INSERT [dbo].[Equipments] ([Id], [ItemCode], [Name], [Category], [Unit], [TotalQuantity], [InUseQuantity], [DamagedQuantity], [LiquidatedQuantity], [BasePrice], [DefaultPriceIfLost], [Supplier], [IsActive], [CreatedAt], [UpdatedAt], [ImageUrl]) VALUES (13, N'MT-FT-01', N'Thảm chùi chân', N'Đồ vải', N'Chiếc', 100, 58, 0, 2, CAST(45000.00 AS Decimal(18, 2)), CAST(80000.00 AS Decimal(18, 2)), N'Dệt may Thành Công', 1, CAST(N'2026-03-25T14:10:11.023' AS DateTime), CAST(N'2026-03-26T15:49:47.400' AS DateTime), N'https://res.cloudinary.com/dzfuzh2xg/image/upload/v1774540186/QuanTriKhachSan/Equipments/zxzvuqsgdbxly6ifwlv2.jpg')
INSERT [dbo].[Equipments] ([Id], [ItemCode], [Name], [Category], [Unit], [TotalQuantity], [InUseQuantity], [DamagedQuantity], [LiquidatedQuantity], [BasePrice], [DefaultPriceIfLost], [Supplier], [IsActive], [CreatedAt], [UpdatedAt], [ImageUrl]) VALUES (14, N'BL-DC-01', N'Chăn lông vũ', N'Đồ vải', N'Chiếc', 80, 58, 1, 0, CAST(850000.00 AS Decimal(18, 2)), CAST(1200000.00 AS Decimal(18, 2)), N'Everon', 1, CAST(N'2026-03-25T14:10:11.023' AS DateTime), CAST(N'2026-03-26T15:49:09.747' AS DateTime), N'https://res.cloudinary.com/dzfuzh2xg/image/upload/v1774540149/QuanTriKhachSan/Equipments/huzcgbezdzmqlpjqla2n.jpg')
INSERT [dbo].[Equipments] ([Id], [ItemCode], [Name], [Category], [Unit], [TotalQuantity], [InUseQuantity], [DamagedQuantity], [LiquidatedQuantity], [BasePrice], [DefaultPriceIfLost], [Supplier], [IsActive], [CreatedAt], [UpdatedAt], [ImageUrl]) VALUES (15, N'PL-CT-01', N'Gối tựa lưng / Gối ngủ', N'Đồ vải', N'Chiếc', 150, 108, 0, 0, CAST(150000.00 AS Decimal(18, 2)), CAST(250000.00 AS Decimal(18, 2)), N'Everon', 1, CAST(N'2026-03-25T14:10:11.023' AS DateTime), CAST(N'2026-03-26T15:41:36.917' AS DateTime), N'https://res.cloudinary.com/dzfuzh2xg/image/upload/v1774539696/QuanTriKhachSan/Equipments/bjpgyfibnh5y71upb8fo.jpg')
INSERT [dbo].[Equipments] ([Id], [ItemCode], [Name], [Category], [Unit], [TotalQuantity], [InUseQuantity], [DamagedQuantity], [LiquidatedQuantity], [BasePrice], [DefaultPriceIfLost], [Supplier], [IsActive], [CreatedAt], [UpdatedAt], [ImageUrl]) VALUES (16, N'DR-LV-500', N'Nước suối Lavie 500ml', N'Minibar', N'Chai', 493, 108, -4, 0, CAST(4000.00 AS Decimal(18, 2)), CAST(0.00 AS Decimal(18, 2)), N'Lavie', 1, CAST(N'2026-03-25T14:10:11.023' AS DateTime), CAST(N'2026-03-26T16:48:30.790' AS DateTime), N'https://res.cloudinary.com/dzfuzh2xg/image/upload/v1774538785/QuanTriKhachSan/Equipments/kznyl7dkrsknfv0d2pt2.jpg')
INSERT [dbo].[Equipments] ([Id], [ItemCode], [Name], [Category], [Unit], [TotalQuantity], [InUseQuantity], [DamagedQuantity], [LiquidatedQuantity], [BasePrice], [DefaultPriceIfLost], [Supplier], [IsActive], [CreatedAt], [UpdatedAt], [ImageUrl]) VALUES (17, N'DR-CC-320', N'Nước ngọt Coca Cola 320ml', N'Minibar', N'Lon', 296, 60, 0, 0, CAST(7000.00 AS Decimal(18, 2)), CAST(20000.00 AS Decimal(18, 2)), N'Coca Cola', 0, CAST(N'2026-03-25T14:10:11.023' AS DateTime), CAST(N'2026-03-27T09:17:54.757' AS DateTime), N'https://res.cloudinary.com/dzfuzh2xg/image/upload/v1774538766/QuanTriKhachSan/Equipments/qaqy3mnzmvsgfoyvah2a.jpg')
INSERT [dbo].[Equipments] ([Id], [ItemCode], [Name], [Category], [Unit], [TotalQuantity], [InUseQuantity], [DamagedQuantity], [LiquidatedQuantity], [BasePrice], [DefaultPriceIfLost], [Supplier], [IsActive], [CreatedAt], [UpdatedAt], [ImageUrl]) VALUES (18, N'DR-HB-330', N'Bia Heineken 330ml', N'Minibar', N'Lon', 200, 46, 0, 0, CAST(16000.00 AS Decimal(18, 2)), CAST(35000.00 AS Decimal(18, 2)), N'Heineken', 1, CAST(N'2026-03-25T14:10:11.023' AS DateTime), CAST(N'2026-03-26T15:28:55.683' AS DateTime), N'https://res.cloudinary.com/dzfuzh2xg/image/upload/v1774538733/QuanTriKhachSan/Equipments/frbshpj0tetjn3tk8brk.jpg')
INSERT [dbo].[Equipments] ([Id], [ItemCode], [Name], [Category], [Unit], [TotalQuantity], [InUseQuantity], [DamagedQuantity], [LiquidatedQuantity], [BasePrice], [DefaultPriceIfLost], [Supplier], [IsActive], [CreatedAt], [UpdatedAt], [ImageUrl]) VALUES (19, N'SN-OM-01', N'Mì ly Omachi', N'Minibar', N'Ly', 100, 28, 0, 0, CAST(12000.00 AS Decimal(18, 2)), CAST(25000.00 AS Decimal(18, 2)), N'Masan', 1, CAST(N'2026-03-25T14:10:11.023' AS DateTime), CAST(N'2026-03-26T15:28:50.370' AS DateTime), N'https://res.cloudinary.com/dzfuzh2xg/image/upload/v1774538702/QuanTriKhachSan/Equipments/rvl2xfua67yrfqqpq71t.jpg')
INSERT [dbo].[Equipments] ([Id], [ItemCode], [Name], [Category], [Unit], [TotalQuantity], [InUseQuantity], [DamagedQuantity], [LiquidatedQuantity], [BasePrice], [DefaultPriceIfLost], [Supplier], [IsActive], [CreatedAt], [UpdatedAt], [ImageUrl]) VALUES (20, N'SN-OR-01', N'Bánh Oreo 133g', N'Minibar', N'Hộp', 97, 26, -1, 0, CAST(15000.00 AS Decimal(18, 2)), CAST(30000.00 AS Decimal(18, 2)), N'Mondelez', 1, CAST(N'2026-03-25T14:10:11.023' AS DateTime), CAST(N'2026-03-26T15:24:19.507' AS DateTime), N'https://res.cloudinary.com/dzfuzh2xg/image/upload/v1774538658/QuanTriKhachSan/Equipments/trawiqiv9m0u4ncvutsr.jpg')
INSERT [dbo].[Equipments] ([Id], [ItemCode], [Name], [Category], [Unit], [TotalQuantity], [InUseQuantity], [DamagedQuantity], [LiquidatedQuantity], [BasePrice], [DefaultPriceIfLost], [Supplier], [IsActive], [CreatedAt], [UpdatedAt], [ImageUrl]) VALUES (21, N'TV-SS-55', N'Tivi SamSung 55 inch', N'Điện tử', N'cái', 5, 2, 0, 0, CAST(15000000.00 AS Decimal(18, 2)), CAST(17000000.00 AS Decimal(18, 2)), N'Điện Máy Xanh', 1, CAST(N'2026-03-26T17:29:39.020' AS DateTime), NULL, N'https://res.cloudinary.com/dzfuzh2xg/image/upload/v1774546178/QuanTriKhachSan/Equipments/xmxreisazllzyx0iiuwe.jpg')
INSERT [dbo].[Equipments] ([Id], [ItemCode], [Name], [Category], [Unit], [TotalQuantity], [InUseQuantity], [DamagedQuantity], [LiquidatedQuantity], [BasePrice], [DefaultPriceIfLost], [Supplier], [IsActive], [CreatedAt], [UpdatedAt], [ImageUrl]) VALUES (22, N'SH-DK-01', N'Dầu gội đầu thảo dược L''Occitane', N'Tiện nghi', N'Chai', 300, 150, 0, 0, CAST(35000.00 AS Decimal(18, 2)), CAST(50000.00 AS Decimal(18, 2)), N'L''Occitane', 1, CAST(N'2026-03-25T14:10:11.023' AS DateTime), NULL, N'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?q=80&w=300')
INSERT [dbo].[Equipments] ([Id], [ItemCode], [Name], [Category], [Unit], [TotalQuantity], [InUseQuantity], [DamagedQuantity], [LiquidatedQuantity], [BasePrice], [DefaultPriceIfLost], [Supplier], [IsActive], [CreatedAt], [UpdatedAt], [ImageUrl]) VALUES (23, N'SG-DK-01', N'Sữa tắm dưỡng ẩm L''Occitane', N'Tiện nghi', N'Chai', 300, 150, 0, 0, CAST(35000.00 AS Decimal(18, 2)), CAST(50000.00 AS Decimal(18, 2)), N'L''Occitane', 1, CAST(N'2026-03-25T14:10:11.023' AS DateTime), NULL, N'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?q=80&w=300')
INSERT [dbo].[Equipments] ([Id], [ItemCode], [Name], [Category], [Unit], [TotalQuantity], [InUseQuantity], [DamagedQuantity], [LiquidatedQuantity], [BasePrice], [DefaultPriceIfLost], [Supplier], [IsActive], [CreatedAt], [UpdatedAt], [ImageUrl]) VALUES (24, N'TB-DK-01', N'Bàn chải đánh răng tre', N'Tiện nghi', N'Chiếc', 500, 250, 0, 0, CAST(8000.00 AS Decimal(18, 2)), CAST(15000.00 AS Decimal(18, 2)), N'Eco Friendly Co', 1, CAST(N'2026-03-25T14:10:11.023' AS DateTime), NULL, N'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?q=80&w=300')
INSERT [dbo].[Equipments] ([Id], [ItemCode], [Name], [Category], [Unit], [TotalQuantity], [InUseQuantity], [DamagedQuantity], [LiquidatedQuantity], [BasePrice], [DefaultPriceIfLost], [Supplier], [IsActive], [CreatedAt], [UpdatedAt], [ImageUrl]) VALUES (25, N'TP-DK-01', N'Kem đánh răng mini Colgate', N'Tiện nghi', N'Tuýp', 500, 250, 0, 0, CAST(5000.00 AS Decimal(18, 2)), CAST(10000.00 AS Decimal(18, 2)), N'Colgate', 1, CAST(N'2026-03-25T14:10:11.023' AS DateTime), NULL, N'https://images.unsplash.com/photo-1559599101-f09722fb4948?q=80&w=300')
INSERT [dbo].[Equipments] ([Id], [ItemCode], [Name], [Category], [Unit], [TotalQuantity], [InUseQuantity], [DamagedQuantity], [LiquidatedQuantity], [BasePrice], [DefaultPriceIfLost], [Supplier], [IsActive], [CreatedAt], [UpdatedAt], [ImageUrl]) VALUES (26, N'SL-DK-01', N'Dép đi trong nhà Asteria', N'Đồ vải', N'Đôi', 200, 120, 5, 2, CAST(25000.00 AS Decimal(18, 2)), CAST(40000.00 AS Decimal(18, 2)), N'An Phát', 1, CAST(N'2026-03-25T14:10:11.023' AS DateTime), NULL, N'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=300')
INSERT [dbo].[Equipments] ([Id], [ItemCode], [Name], [Category], [Unit], [TotalQuantity], [InUseQuantity], [DamagedQuantity], [LiquidatedQuantity], [BasePrice], [DefaultPriceIfLost], [Supplier], [IsActive], [CreatedAt], [UpdatedAt], [ImageUrl]) VALUES (27, N'RB-DK-01', N'Áo choàng tắm Cotton', N'Đồ vải', N'Chiếc', 100, 60, 2, 1, CAST(250000.00 AS Decimal(18, 2)), CAST(350000.00 AS Decimal(18, 2)), N'Everon', 1, CAST(N'2026-03-25T14:10:11.023' AS DateTime), NULL, N'https://images.unsplash.com/photo-1563170351-be82bc888bb4?q=80&w=300')
INSERT [dbo].[Equipments] ([Id], [ItemCode], [Name], [Category], [Unit], [TotalQuantity], [InUseQuantity], [DamagedQuantity], [LiquidatedQuantity], [BasePrice], [DefaultPriceIfLost], [Supplier], [IsActive], [CreatedAt], [UpdatedAt], [ImageUrl]) VALUES (28, N'SF-DK-01', N'Két sắt điện tử chống trộm', N'Điện tử', N'Cái', 40, 38, 0, 0, CAST(2200000.00 AS Decimal(18, 2)), CAST(2500000.00 AS Decimal(18, 2)), N'Yale', 1, CAST(N'2026-03-25T14:10:11.023' AS DateTime), NULL, N'https://images.unsplash.com/photo-1582139329536-e7284fece509?q=80&w=300')
INSERT [dbo].[Equipments] ([Id], [ItemCode], [Name], [Category], [Unit], [TotalQuantity], [InUseQuantity], [DamagedQuantity], [LiquidatedQuantity], [BasePrice], [DefaultPriceIfLost], [Supplier], [IsActive], [CreatedAt], [UpdatedAt], [ImageUrl]) VALUES (29, N'IR-DK-01', N'Bàn là hơi nước cầm tay', N'Điện tử', N'Cái', 30, 25, 1, 0, CAST(850000.00 AS Decimal(18, 2)), CAST(1000000.00 AS Decimal(18, 2)), N'Philips', 1, CAST(N'2026-03-25T14:10:11.023' AS DateTime), NULL, N'https://images.unsplash.com/photo-1479064555552-3ef4979f8908?q=80&w=300')
INSERT [dbo].[Equipments] ([Id], [ItemCode], [Name], [Category], [Unit], [TotalQuantity], [InUseQuantity], [DamagedQuantity], [LiquidatedQuantity], [BasePrice], [DefaultPriceIfLost], [Supplier], [IsActive], [CreatedAt], [UpdatedAt], [ImageUrl]) VALUES (30, N'IB-DK-01', N'Cầu là quần áo gấp gọn', N'Nội thất', N'Cái', 30, 25, 0, 0, CAST(300000.00 AS Decimal(18, 2)), CAST(400000.00 AS Decimal(18, 2)), N'Hòa Phát', 1, CAST(N'2026-03-25T14:10:11.023' AS DateTime), NULL, N'https://images.unsplash.com/photo-1590486803833-ffc6f78f500c?q=80&w=300')
INSERT [dbo].[Equipments] ([Id], [ItemCode], [Name], [Category], [Unit], [TotalQuantity], [InUseQuantity], [DamagedQuantity], [LiquidatedQuantity], [BasePrice], [DefaultPriceIfLost], [Supplier], [IsActive], [CreatedAt], [UpdatedAt], [ImageUrl]) VALUES (31, N'GL-DK-01', N'Ly thủy tinh uống nước cao cấp', N'Nội thất', N'Chiếc', 150, 110, 12, 5, CAST(15000.00 AS Decimal(18, 2)), CAST(30000.00 AS Decimal(18, 2)), N'Ocean Glass', 1, CAST(N'2026-03-25T14:10:11.023' AS DateTime), NULL, N'https://images.unsplash.com/photo-1517256064527-09c53b2d0bc6?q=80&w=300')
INSERT [dbo].[Equipments] ([Id], [ItemCode], [Name], [Category], [Unit], [TotalQuantity], [InUseQuantity], [DamagedQuantity], [LiquidatedQuantity], [BasePrice], [DefaultPriceIfLost], [Supplier], [IsActive], [CreatedAt], [UpdatedAt], [ImageUrl]) VALUES (32, N'CP-DK-01', N'Tách sứ uống cà phê Bát Tràng', N'Nội thất', N'Chiếc', 120, 90, 8, 2, CAST(30000.00 AS Decimal(18, 2)), CAST(50000.00 AS Decimal(18, 2)), N'Bát Tràng', 1, CAST(N'2026-03-25T14:10:11.023' AS DateTime), NULL, N'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=300')
INSERT [dbo].[Equipments] ([Id], [ItemCode], [Name], [Category], [Unit], [TotalQuantity], [InUseQuantity], [DamagedQuantity], [LiquidatedQuantity], [BasePrice], [DefaultPriceIfLost], [Supplier], [IsActive], [CreatedAt], [UpdatedAt], [ImageUrl]) VALUES (33, N'TB-DK-02', N'Gói trà túi lọc Oolong Phúc Long', N'Minibar', N'Gói', 1000, 300, 0, 0, CAST(3000.00 AS Decimal(18, 2)), CAST(5000.00 AS Decimal(18, 2)), N'Phúc Long', 1, CAST(N'2026-03-25T14:10:11.023' AS DateTime), NULL, N'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?q=80&w=300')
INSERT [dbo].[Equipments] ([Id], [ItemCode], [Name], [Category], [Unit], [TotalQuantity], [InUseQuantity], [DamagedQuantity], [LiquidatedQuantity], [BasePrice], [DefaultPriceIfLost], [Supplier], [IsActive], [CreatedAt], [UpdatedAt], [ImageUrl]) VALUES (34, N'CF-DK-02', N'Gói cà phê hòa tan Trung Nguyên', N'Minibar', N'Gói', 1000, 400, 0, 0, CAST(4000.00 AS Decimal(18, 2)), CAST(6000.00 AS Decimal(18, 2)), N'Trung Nguyên', 1, CAST(N'2026-03-25T14:10:11.023' AS DateTime), NULL, N'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=300')
INSERT [dbo].[Equipments] ([Id], [ItemCode], [Name], [Category], [Unit], [TotalQuantity], [InUseQuantity], [DamagedQuantity], [LiquidatedQuantity], [BasePrice], [DefaultPriceIfLost], [Supplier], [IsActive], [CreatedAt], [UpdatedAt], [ImageUrl]) VALUES (35, N'TL-DK-01', N'Điện thoại IP để bàn Cisco', N'Điện tử', N'Cái', 45, 42, 1, 0, CAST(1200000.00 AS Decimal(18, 2)), CAST(1500000.00 AS Decimal(18, 2)), N'Cisco', 1, CAST(N'2026-03-25T14:10:11.023' AS DateTime), NULL, N'https://images.unsplash.com/photo-1520607117406-88d447d25e0b?q=80&w=300')
INSERT [dbo].[Equipments] ([Id], [ItemCode], [Name], [Category], [Unit], [TotalQuantity], [InUseQuantity], [DamagedQuantity], [LiquidatedQuantity], [BasePrice], [DefaultPriceIfLost], [Supplier], [IsActive], [CreatedAt], [UpdatedAt], [ImageUrl]) VALUES (36, N'HR-DK-01', N'Thùng rác inox phòng ngủ', N'Nội thất', N'Cái', 60, 55, 2, 1, CAST(12000.00 AS Decimal(18, 2)), CAST(18000.00 AS Decimal(18, 2)), N'Duy Tân', 1, CAST(N'2026-03-25T14:10:11.023' AS DateTime), NULL, N'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?q=80&w=300')

SET IDENTITY_INSERT [dbo].[Equipments] OFF
GO
SET IDENTITY_INSERT [dbo].[Invoices] ON 

INSERT [dbo].[Invoices] ([id], [booking_id], [total_room_amount], [total_service_amount], [discount_amount], [tax_amount], [final_total], [status]) VALUES (1, 1, CAST(800000.00 AS Decimal(18, 2)), CAST(0.00 AS Decimal(18, 2)), CAST(0.00 AS Decimal(18, 2)), CAST(80000.00 AS Decimal(18, 2)), CAST(880000.00 AS Decimal(18, 2)), N'Paid')
INSERT [dbo].[Invoices] ([id], [booking_id], [total_room_amount], [total_service_amount], [discount_amount], [tax_amount], [final_total], [status]) VALUES (2, 2, CAST(2500000.00 AS Decimal(18, 2)), CAST(200000.00 AS Decimal(18, 2)), CAST(250000.00 AS Decimal(18, 2)), CAST(245000.00 AS Decimal(18, 2)), CAST(2695000.00 AS Decimal(18, 2)), N'Unpaid')
INSERT [dbo].[Invoices] ([id], [booking_id], [total_room_amount], [total_service_amount], [discount_amount], [tax_amount], [final_total], [status]) VALUES (3, 3, CAST(1400000.00 AS Decimal(18, 2)), CAST(0.00 AS Decimal(18, 2)), CAST(0.00 AS Decimal(18, 2)), CAST(140000.00 AS Decimal(18, 2)), CAST(1540000.00 AS Decimal(18, 2)), N'Unpaid')
INSERT [dbo].[Invoices] ([id], [booking_id], [total_room_amount], [total_service_amount], [discount_amount], [tax_amount], [final_total], [status]) VALUES (4, 4, CAST(3600000.00 AS Decimal(18, 2)), CAST(0.00 AS Decimal(18, 2)), CAST(100000.00 AS Decimal(18, 2)), CAST(350000.00 AS Decimal(18, 2)), CAST(3850000.00 AS Decimal(18, 2)), N'Unpaid')
INSERT [dbo].[Invoices] ([id], [booking_id], [total_room_amount], [total_service_amount], [discount_amount], [tax_amount], [final_total], [status]) VALUES (5, 5, CAST(1200000.00 AS Decimal(18, 2)), CAST(0.00 AS Decimal(18, 2)), CAST(0.00 AS Decimal(18, 2)), CAST(120000.00 AS Decimal(18, 2)), CAST(1320000.00 AS Decimal(18, 2)), N'Refunded')
INSERT [dbo].[Invoices] ([id], [booking_id], [total_room_amount], [total_service_amount], [discount_amount], [tax_amount], [final_total], [status]) VALUES (6, 6, CAST(3000000.00 AS Decimal(18, 2)), CAST(500000.00 AS Decimal(18, 2)), CAST(0.00 AS Decimal(18, 2)), CAST(350000.00 AS Decimal(18, 2)), CAST(3850000.00 AS Decimal(18, 2)), N'Paid')
INSERT [dbo].[Invoices] ([id], [booking_id], [total_room_amount], [total_service_amount], [discount_amount], [tax_amount], [final_total], [status]) VALUES (7, 7, CAST(3600000.00 AS Decimal(18, 2)), CAST(0.00 AS Decimal(18, 2)), CAST(540000.00 AS Decimal(18, 2)), CAST(306000.00 AS Decimal(18, 2)), CAST(3366000.00 AS Decimal(18, 2)), N'Unpaid')
INSERT [dbo].[Invoices] ([id], [booking_id], [total_room_amount], [total_service_amount], [discount_amount], [tax_amount], [final_total], [status]) VALUES (8, 8, CAST(10000000.00 AS Decimal(18, 2)), CAST(0.00 AS Decimal(18, 2)), CAST(0.00 AS Decimal(18, 2)), CAST(1000000.00 AS Decimal(18, 2)), CAST(11000000.00 AS Decimal(18, 2)), N'Unpaid')
INSERT [dbo].[Invoices] ([id], [booking_id], [total_room_amount], [total_service_amount], [discount_amount], [tax_amount], [final_total], [status]) VALUES (9, 9, CAST(25000000.00 AS Decimal(18, 2)), CAST(1000000.00 AS Decimal(18, 2)), CAST(0.00 AS Decimal(18, 2)), CAST(2600000.00 AS Decimal(18, 2)), CAST(28600000.00 AS Decimal(18, 2)), N'Paid')
INSERT [dbo].[Invoices] ([id], [booking_id], [total_room_amount], [total_service_amount], [discount_amount], [tax_amount], [final_total], [status]) VALUES (10, 10, CAST(16000000.00 AS Decimal(18, 2)), CAST(0.00 AS Decimal(18, 2)), CAST(200000.00 AS Decimal(18, 2)), CAST(1580000.00 AS Decimal(18, 2)), CAST(17380000.00 AS Decimal(18, 2)), N'Unpaid')
SET IDENTITY_INSERT [dbo].[Invoices] OFF
GO
SET IDENTITY_INSERT [dbo].[Loss_And_Damages] ON 

INSERT [dbo].[Loss_And_Damages] ([id], [booking_detail_id], [room_inventory_id], [quantity], [penalty_amount], [description], [created_at], [ImageUrl]) VALUES (24, 10, 135, 1, CAST(15000.00 AS Decimal(18, 2)), NULL, CAST(N'2026-03-27T15:08:59.037' AS DateTime), NULL)
INSERT [dbo].[Loss_And_Damages] ([id], [booking_detail_id], [room_inventory_id], [quantity], [penalty_amount], [description], [created_at], [ImageUrl]) VALUES (25, 10, 136, 2, CAST(20000.00 AS Decimal(18, 2)), NULL, CAST(N'2026-03-27T15:16:06.550' AS DateTime), NULL)
INSERT [dbo].[Loss_And_Damages] ([id], [booking_detail_id], [room_inventory_id], [quantity], [penalty_amount], [description], [created_at], [ImageUrl]) VALUES (26, 10, 137, 1, CAST(30000.00 AS Decimal(18, 2)), NULL, CAST(N'2026-03-27T15:16:37.547' AS DateTime), NULL)
INSERT [dbo].[Loss_And_Damages] ([id], [booking_detail_id], [room_inventory_id], [quantity], [penalty_amount], [description], [created_at], [ImageUrl]) VALUES (31, 2, 118, 2, CAST(20000.00 AS Decimal(18, 2)), NULL, CAST(N'2026-03-27T15:42:13.707' AS DateTime), NULL)
INSERT [dbo].[Loss_And_Damages] ([id], [booking_detail_id], [room_inventory_id], [quantity], [penalty_amount], [description], [created_at], [ImageUrl]) VALUES (32, 2, 117, 2, CAST(0.00 AS Decimal(18, 2)), NULL, CAST(N'2026-03-27T15:43:18.230' AS DateTime), NULL)
INSERT [dbo].[Loss_And_Damages] ([id], [booking_detail_id], [room_inventory_id], [quantity], [penalty_amount], [description], [created_at], [ImageUrl]) VALUES (34, 2, 119, 1, CAST(30000.00 AS Decimal(18, 2)), N'khách dùng', CAST(N'2026-03-28T01:26:23.170' AS DateTime), NULL)
SET IDENTITY_INSERT [dbo].[Loss_And_Damages] OFF
GO
SET IDENTITY_INSERT [dbo].[Memberships] ON 

INSERT [dbo].[Memberships] ([id], [tier_name], [min_points], [discount_percent]) VALUES (1, N'Khách Mới', 0, CAST(0.00 AS Decimal(5, 2)))
INSERT [dbo].[Memberships] ([id], [tier_name], [min_points], [discount_percent]) VALUES (2, N'Đồng', 500, CAST(2.00 AS Decimal(5, 2)))
INSERT [dbo].[Memberships] ([id], [tier_name], [min_points], [discount_percent]) VALUES (3, N'Bạc', 1000, CAST(5.00 AS Decimal(5, 2)))
INSERT [dbo].[Memberships] ([id], [tier_name], [min_points], [discount_percent]) VALUES (4, N'Vàng', 3000, CAST(8.00 AS Decimal(5, 2)))
INSERT [dbo].[Memberships] ([id], [tier_name], [min_points], [discount_percent]) VALUES (5, N'Bạch Kim', 5000, CAST(10.00 AS Decimal(5, 2)))
INSERT [dbo].[Memberships] ([id], [tier_name], [min_points], [discount_percent]) VALUES (6, N'Kim Cương', 10000, CAST(15.00 AS Decimal(5, 2)))
INSERT [dbo].[Memberships] ([id], [tier_name], [min_points], [discount_percent]) VALUES (7, N'Elite', 20000, CAST(20.00 AS Decimal(5, 2)))
INSERT [dbo].[Memberships] ([id], [tier_name], [min_points], [discount_percent]) VALUES (8, N'VIP', 50000, CAST(25.00 AS Decimal(5, 2)))
INSERT [dbo].[Memberships] ([id], [tier_name], [min_points], [discount_percent]) VALUES (9, N'VVIP', 100000, CAST(30.00 AS Decimal(5, 2)))
INSERT [dbo].[Memberships] ([id], [tier_name], [min_points], [discount_percent]) VALUES (10, N'Signature', 200000, CAST(35.00 AS Decimal(5, 2)))
SET IDENTITY_INSERT [dbo].[Memberships] OFF
GO
SET IDENTITY_INSERT [dbo].[Notifications] ON 

INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (1, 1, N'Tạo tài khoản thành công', N'Tài khoản manhung08062@gmail.com đã được cấp quyền Receptionist.', N'success', NULL, 0, CAST(N'2026-03-20T07:07:59.983' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (2, 1, N'Thông báo hệ thống', N'Có cập nhật mới từ hệ thống.', N'info', NULL, 0, CAST(N'2026-03-20T12:22:56.750' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (3, 2, N'Thông báo hệ thống', N'Có cập nhật mới từ hệ thống.', N'info', NULL, 0, CAST(N'2026-03-20T12:22:56.750' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (4, 11, N'Thông báo hệ thống', N'Có cập nhật mới từ hệ thống.', N'info', NULL, 0, CAST(N'2026-03-20T12:22:56.750' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (5, 3, N'Thông báo hệ thống', N'Có cập nhật mới từ hệ thống.', N'info', NULL, 0, CAST(N'2026-03-20T12:22:56.750' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (6, 1, N'Thông báo hệ thống', N'Có cập nhật mới từ hệ thống.', N'info', NULL, 0, CAST(N'2026-03-20T12:29:48.573' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (7, 2, N'Thông báo hệ thống', N'Có cập nhật mới từ hệ thống.', N'info', NULL, 0, CAST(N'2026-03-20T12:29:48.573' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (8, 11, N'Thông báo hệ thống', N'Có cập nhật mới từ hệ thống.', N'info', NULL, 0, CAST(N'2026-03-20T12:29:48.573' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (9, 3, N'Thông báo hệ thống', N'Có cập nhật mới từ hệ thống.', N'info', NULL, 0, CAST(N'2026-03-20T12:29:48.573' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (10, 1, N'Khóa tài khoản', N'Tài khoản reception1@hotel.com đã bị vô hiệu hóa thành công.', N'info', NULL, 0, CAST(N'2026-03-20T12:32:24.123' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (11, 2, N'Khóa tài khoản', N'Tài khoản reception1@hotel.com đã bị vô hiệu hóa thành công.', N'info', NULL, 0, CAST(N'2026-03-20T12:32:24.123' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (12, 11, N'Khóa tài khoản', N'Tài khoản reception1@hotel.com đã bị vô hiệu hóa thành công.', N'info', NULL, 0, CAST(N'2026-03-20T12:32:24.123' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (13, 3, N'Khóa tài khoản', N'Tài khoản reception1@hotel.com đã bị vô hiệu hóa thành công.', N'info', NULL, 0, CAST(N'2026-03-20T12:32:24.123' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (14, 1, N'Mở khóa tài khoản', N'Tài khoản reception1@hotel.com đã được khôi phục hoạt động.', N'info', NULL, 0, CAST(N'2026-03-20T12:33:26.073' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (15, 2, N'Mở khóa tài khoản', N'Tài khoản reception1@hotel.com đã được khôi phục hoạt động.', N'info', NULL, 0, CAST(N'2026-03-20T12:33:26.073' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (16, 11, N'Mở khóa tài khoản', N'Tài khoản reception1@hotel.com đã được khôi phục hoạt động.', N'info', NULL, 0, CAST(N'2026-03-20T12:33:26.073' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (17, 3, N'Mở khóa tài khoản', N'Tài khoản reception1@hotel.com đã được khôi phục hoạt động.', N'info', NULL, 0, CAST(N'2026-03-20T12:33:26.073' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (18, 1, N'Khóa tài khoản', N'Tài khoản reception1@hotel.com đã bị vô hiệu hóa thành công.', N'warning', NULL, 0, CAST(N'2026-03-20T12:36:20.103' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (19, 2, N'Khóa tài khoản', N'Tài khoản reception1@hotel.com đã bị vô hiệu hóa thành công.', N'warning', NULL, 0, CAST(N'2026-03-20T12:36:20.103' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (20, 11, N'Khóa tài khoản', N'Tài khoản reception1@hotel.com đã bị vô hiệu hóa thành công.', N'warning', NULL, 0, CAST(N'2026-03-20T12:36:20.103' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (21, 3, N'Khóa tài khoản', N'Tài khoản reception1@hotel.com đã bị vô hiệu hóa thành công.', N'warning', NULL, 0, CAST(N'2026-03-20T12:36:20.103' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (22, 1, N'Mở khóa tài khoản', N'Tài khoản reception1@hotel.com đã được khôi phục hoạt động.', N'success', NULL, 0, CAST(N'2026-03-20T12:36:52.300' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (23, 2, N'Mở khóa tài khoản', N'Tài khoản reception1@hotel.com đã được khôi phục hoạt động.', N'success', NULL, 0, CAST(N'2026-03-20T12:36:52.300' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (24, 11, N'Mở khóa tài khoản', N'Tài khoản reception1@hotel.com đã được khôi phục hoạt động.', N'success', NULL, 0, CAST(N'2026-03-20T12:36:52.300' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (25, 3, N'Mở khóa tài khoản', N'Tài khoản reception1@hotel.com đã được khôi phục hoạt động.', N'success', NULL, 0, CAST(N'2026-03-20T12:36:52.300' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (26, 1, N'Khóa tài khoản', N'Tài khoản guestA@gmail.com đã bị vô hiệu hóa thành công.', N'warning', NULL, 0, CAST(N'2026-03-20T12:39:55.433' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (27, 2, N'Khóa tài khoản', N'Tài khoản guestA@gmail.com đã bị vô hiệu hóa thành công.', N'warning', NULL, 0, CAST(N'2026-03-20T12:39:55.433' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (28, 11, N'Khóa tài khoản', N'Tài khoản guestA@gmail.com đã bị vô hiệu hóa thành công.', N'warning', NULL, 0, CAST(N'2026-03-20T12:39:55.433' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (29, 6, N'Khóa tài khoản', N'Tài khoản guestA@gmail.com đã bị vô hiệu hóa thành công.', N'warning', NULL, 0, CAST(N'2026-03-20T12:39:55.433' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (30, 1, N'Mở khóa tài khoản', N'Tài khoản guestA@gmail.com đã được khôi phục hoạt động.', N'success', NULL, 0, CAST(N'2026-03-20T12:43:10.427' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (31, 2, N'Mở khóa tài khoản', N'Tài khoản guestA@gmail.com đã được khôi phục hoạt động.', N'success', NULL, 0, CAST(N'2026-03-20T12:43:10.427' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (32, 11, N'Mở khóa tài khoản', N'Tài khoản guestA@gmail.com đã được khôi phục hoạt động.', N'success', NULL, 0, CAST(N'2026-03-20T12:43:10.427' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (33, 6, N'Mở khóa tài khoản', N'Tài khoản guestA@gmail.com đã được khôi phục hoạt động.', N'success', NULL, 0, CAST(N'2026-03-20T12:43:10.427' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (34, 1, N'Khóa tài khoản', N'Tài khoản reception2@hotel.com đã bị vô hiệu hóa thành công.', N'warning', NULL, 0, CAST(N'2026-03-21T00:52:34.273' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (35, 2, N'Khóa tài khoản', N'Tài khoản reception2@hotel.com đã bị vô hiệu hóa thành công.', N'warning', NULL, 0, CAST(N'2026-03-21T00:52:34.273' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (36, 11, N'Khóa tài khoản', N'Tài khoản reception2@hotel.com đã bị vô hiệu hóa thành công.', N'warning', NULL, 0, CAST(N'2026-03-21T00:52:34.273' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (37, 4, N'Khóa tài khoản', N'Tài khoản reception2@hotel.com đã bị vô hiệu hóa thành công.', N'warning', NULL, 0, CAST(N'2026-03-21T00:52:34.273' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (38, 1, N'Khóa tài khoản', N'Tài khoản accountant@hotel.com đã bị vô hiệu hóa thành công.', N'warning', NULL, 0, CAST(N'2026-03-21T00:53:31.520' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (39, 2, N'Khóa tài khoản', N'Tài khoản accountant@hotel.com đã bị vô hiệu hóa thành công.', N'warning', NULL, 0, CAST(N'2026-03-21T00:53:31.520' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (40, 11, N'Khóa tài khoản', N'Tài khoản accountant@hotel.com đã bị vô hiệu hóa thành công.', N'warning', NULL, 0, CAST(N'2026-03-21T00:53:31.520' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (41, 5, N'Khóa tài khoản', N'Tài khoản accountant@hotel.com đã bị vô hiệu hóa thành công.', N'warning', NULL, 0, CAST(N'2026-03-21T00:53:31.520' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (42, 1, N'Cập nhật phân quyền', N'Tài khoản guestA@gmail.com vừa được đổi sang vai trò Accountant.', N'warning', NULL, 0, CAST(N'2026-03-21T00:55:02.247' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (43, 2, N'Cập nhật phân quyền', N'Tài khoản guestA@gmail.com vừa được đổi sang vai trò Accountant.', N'warning', NULL, 0, CAST(N'2026-03-21T00:55:02.247' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (44, 11, N'Cập nhật phân quyền', N'Tài khoản guestA@gmail.com vừa được đổi sang vai trò Accountant.', N'warning', NULL, 0, CAST(N'2026-03-21T00:55:02.247' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (45, 6, N'Cập nhật phân quyền', N'Tài khoản guestA@gmail.com vừa được đổi sang vai trò Accountant.', N'warning', NULL, 0, CAST(N'2026-03-21T00:55:02.247' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (46, 1, N'Tạo tài khoản thành công', N'Tài khoản dainguyen1254@gmail.com đã được khởi tạo với vai trò Housekeeping.', N'success', NULL, 0, CAST(N'2026-03-21T01:57:00.360' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (47, 2, N'Tạo tài khoản thành công', N'Tài khoản dainguyen1254@gmail.com đã được khởi tạo với vai trò Housekeeping.', N'success', NULL, 0, CAST(N'2026-03-21T01:57:00.360' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (48, 11, N'Tạo tài khoản thành công', N'Tài khoản dainguyen1254@gmail.com đã được khởi tạo với vai trò Housekeeping.', N'success', NULL, 0, CAST(N'2026-03-21T01:57:00.360' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (49, 14, N'Tạo tài khoản thành công', N'Tài khoản dainguyen1254@gmail.com đã được khởi tạo với vai trò Housekeeping.', N'success', NULL, 0, CAST(N'2026-03-21T01:57:00.360' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (50, 1, N'Cấp lại mật khẩu', N'Hệ thống đã gửi mật khẩu mới vào email của dainguyen1254@gmail.com.', N'warning', NULL, 0, CAST(N'2026-03-21T01:58:40.487' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (51, 2, N'Cấp lại mật khẩu', N'Hệ thống đã gửi mật khẩu mới vào email của dainguyen1254@gmail.com.', N'warning', NULL, 0, CAST(N'2026-03-21T01:58:40.487' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (52, 11, N'Cấp lại mật khẩu', N'Hệ thống đã gửi mật khẩu mới vào email của dainguyen1254@gmail.com.', N'warning', NULL, 0, CAST(N'2026-03-21T01:58:40.487' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (53, 14, N'Cấp lại mật khẩu', N'Hệ thống đã gửi mật khẩu mới vào email của dainguyen1254@gmail.com.', N'warning', NULL, 0, CAST(N'2026-03-21T01:58:40.487' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (54, 1, N'Mở khóa tài khoản', N'Tài khoản accountant@hotel.com đã được khôi phục hoạt động.', N'success', NULL, 0, CAST(N'2026-03-21T02:24:47.463' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (55, 2, N'Mở khóa tài khoản', N'Tài khoản accountant@hotel.com đã được khôi phục hoạt động.', N'success', NULL, 0, CAST(N'2026-03-21T02:24:47.463' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (56, 11, N'Mở khóa tài khoản', N'Tài khoản accountant@hotel.com đã được khôi phục hoạt động.', N'success', NULL, 0, CAST(N'2026-03-21T02:24:47.463' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (57, 5, N'Mở khóa tài khoản', N'Tài khoản accountant@hotel.com đã được khôi phục hoạt động.', N'success', NULL, 0, CAST(N'2026-03-21T02:24:47.463' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (58, 1, N'Mở khóa tài khoản', N'Tài khoản reception2@hotel.com đã được khôi phục hoạt động.', N'success', NULL, 0, CAST(N'2026-03-21T02:24:51.517' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (59, 2, N'Mở khóa tài khoản', N'Tài khoản reception2@hotel.com đã được khôi phục hoạt động.', N'success', NULL, 0, CAST(N'2026-03-21T02:24:51.517' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (60, 11, N'Mở khóa tài khoản', N'Tài khoản reception2@hotel.com đã được khôi phục hoạt động.', N'success', NULL, 0, CAST(N'2026-03-21T02:24:51.517' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (61, 4, N'Mở khóa tài khoản', N'Tài khoản reception2@hotel.com đã được khôi phục hoạt động.', N'success', NULL, 0, CAST(N'2026-03-21T02:24:51.517' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (62, 1, N'Lỗi tạo tài khoản', N'Không thể tạo tài khoản. Lỗi: nguyenbinhan2707@gmail.com', N'warning', NULL, 0, CAST(N'2026-03-21T06:33:09.297' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (63, 2, N'Lỗi tạo tài khoản', N'Không thể tạo tài khoản. Lỗi: nguyenbinhan2707@gmail.com', N'warning', NULL, 0, CAST(N'2026-03-21T06:33:09.297' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (64, 11, N'Lỗi tạo tài khoản', N'Không thể tạo tài khoản. Lỗi: nguyenbinhan2707@gmail.com', N'warning', NULL, 0, CAST(N'2026-03-21T06:33:09.297' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (65, 15, N'Lỗi tạo tài khoản', N'Không thể tạo tài khoản. Lỗi: nguyenbinhan2707@gmail.com', N'warning', NULL, 0, CAST(N'2026-03-21T06:33:09.297' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (66, 1, N'Khóa tài khoản', N'Tài khoản dainguyen1254@gmail.com đã bị vô hiệu hóa thành công.', N'warning', NULL, 0, CAST(N'2026-03-21T06:35:08.167' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (67, 2, N'Khóa tài khoản', N'Tài khoản dainguyen1254@gmail.com đã bị vô hiệu hóa thành công.', N'warning', NULL, 0, CAST(N'2026-03-21T06:35:08.167' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (68, 11, N'Khóa tài khoản', N'Tài khoản dainguyen1254@gmail.com đã bị vô hiệu hóa thành công.', N'warning', NULL, 0, CAST(N'2026-03-21T06:35:08.167' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (69, 14, N'Khóa tài khoản', N'Tài khoản dainguyen1254@gmail.com đã bị vô hiệu hóa thành công.', N'warning', NULL, 0, CAST(N'2026-03-21T06:35:08.167' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (70, 1, N'Mở khóa tài khoản', N'Tài khoản dainguyen1254@gmail.com đã được khôi phục hoạt động.', N'success', NULL, 0, CAST(N'2026-03-21T07:27:43.490' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (71, 2, N'Mở khóa tài khoản', N'Tài khoản dainguyen1254@gmail.com đã được khôi phục hoạt động.', N'success', NULL, 0, CAST(N'2026-03-21T07:27:43.490' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (72, 11, N'Mở khóa tài khoản', N'Tài khoản dainguyen1254@gmail.com đã được khôi phục hoạt động.', N'success', NULL, 0, CAST(N'2026-03-21T07:27:43.490' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (73, 14, N'Mở khóa tài khoản', N'Tài khoản dainguyen1254@gmail.com đã được khôi phục hoạt động.', N'success', NULL, 0, CAST(N'2026-03-21T07:27:43.490' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (74, 1, N'Khóa tài khoản', N'Tài khoản guestB@gmail.com đã bị vô hiệu hóa thành công.', N'warning', NULL, 0, CAST(N'2026-03-21T07:40:18.280' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (75, 2, N'Khóa tài khoản', N'Tài khoản guestB@gmail.com đã bị vô hiệu hóa thành công.', N'warning', NULL, 0, CAST(N'2026-03-21T07:40:18.280' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (76, 11, N'Khóa tài khoản', N'Tài khoản guestB@gmail.com đã bị vô hiệu hóa thành công.', N'warning', NULL, 0, CAST(N'2026-03-21T07:40:18.280' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (77, 7, N'Khóa tài khoản', N'Tài khoản guestB@gmail.com đã bị vô hiệu hóa thành công.', N'warning', NULL, 0, CAST(N'2026-03-21T07:40:18.280' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (78, 1, N'Mở khóa tài khoản', N'Tài khoản guestB@gmail.com đã được khôi phục hoạt động.', N'success', NULL, 0, CAST(N'2026-03-21T07:42:39.183' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (79, 2, N'Mở khóa tài khoản', N'Tài khoản guestB@gmail.com đã được khôi phục hoạt động.', N'success', NULL, 0, CAST(N'2026-03-21T07:42:39.183' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (80, 11, N'Mở khóa tài khoản', N'Tài khoản guestB@gmail.com đã được khôi phục hoạt động.', N'success', NULL, 0, CAST(N'2026-03-21T07:42:39.183' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (81, 7, N'Mở khóa tài khoản', N'Tài khoản guestB@gmail.com đã được khôi phục hoạt động.', N'success', NULL, 0, CAST(N'2026-03-21T07:42:39.183' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (82, 1, N'Khóa tài khoản', N'Tài khoản guestE@gmail.com đã bị vô hiệu hóa thành công.', N'warning', NULL, 0, CAST(N'2026-03-21T07:44:48.810' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (83, 2, N'Khóa tài khoản', N'Tài khoản guestE@gmail.com đã bị vô hiệu hóa thành công.', N'warning', NULL, 0, CAST(N'2026-03-21T07:44:48.810' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (84, 11, N'Khóa tài khoản', N'Tài khoản guestE@gmail.com đã bị vô hiệu hóa thành công.', N'warning', NULL, 0, CAST(N'2026-03-21T07:44:48.810' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (85, 10, N'Khóa tài khoản', N'Tài khoản guestE@gmail.com đã bị vô hiệu hóa thành công.', N'warning', NULL, 0, CAST(N'2026-03-21T07:44:48.810' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (86, 1, N'Mở khóa tài khoản', N'Tài khoản guestE@gmail.com đã được khôi phục hoạt động.', N'success', NULL, 0, CAST(N'2026-03-25T01:42:24.840' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (87, 2, N'Mở khóa tài khoản', N'Tài khoản guestE@gmail.com đã được khôi phục hoạt động.', N'success', NULL, 0, CAST(N'2026-03-25T01:42:24.840' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (88, 11, N'Mở khóa tài khoản', N'Tài khoản guestE@gmail.com đã được khôi phục hoạt động.', N'success', NULL, 0, CAST(N'2026-03-25T01:42:24.840' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (89, 10, N'Mở khóa tài khoản', N'Tài khoản guestE@gmail.com đã được khôi phục hoạt động.', N'success', NULL, 0, CAST(N'2026-03-25T01:42:24.840' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (90, 1, N'Khóa tài khoản', N'Tài khoản dainguyen1254@gmail.com đã bị vô hiệu hóa thành công.', N'warning', NULL, 0, CAST(N'2026-03-25T02:05:33.513' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (91, 2, N'Khóa tài khoản', N'Tài khoản dainguyen1254@gmail.com đã bị vô hiệu hóa thành công.', N'warning', NULL, 0, CAST(N'2026-03-25T02:05:33.513' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (92, 11, N'Khóa tài khoản', N'Tài khoản dainguyen1254@gmail.com đã bị vô hiệu hóa thành công.', N'warning', NULL, 0, CAST(N'2026-03-25T02:05:33.513' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (93, 14, N'Khóa tài khoản', N'Tài khoản dainguyen1254@gmail.com đã bị vô hiệu hóa thành công.', N'warning', NULL, 0, CAST(N'2026-03-25T02:05:33.513' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (94, 1, N'Mở khóa tài khoản', N'Tài khoản dainguyen1254@gmail.com đã được khôi phục hoạt động.', N'success', NULL, 0, CAST(N'2026-03-25T02:05:35.560' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (95, 2, N'Mở khóa tài khoản', N'Tài khoản dainguyen1254@gmail.com đã được khôi phục hoạt động.', N'success', NULL, 0, CAST(N'2026-03-25T02:05:35.560' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (96, 11, N'Mở khóa tài khoản', N'Tài khoản dainguyen1254@gmail.com đã được khôi phục hoạt động.', N'success', NULL, 0, CAST(N'2026-03-25T02:05:35.560' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (97, 14, N'Mở khóa tài khoản', N'Tài khoản dainguyen1254@gmail.com đã được khôi phục hoạt động.', N'success', NULL, 0, CAST(N'2026-03-25T02:05:35.560' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (98, 2, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 102 phát sinh khoản phạt 150,000đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-26T16:41:17.063' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (99, 3, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 102 phát sinh khoản phạt 150,000đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-26T16:41:17.063' AS DateTime))
GO
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (100, 11, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 102 phát sinh khoản phạt 150,000đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-26T16:41:17.063' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (101, 13, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 102 phát sinh khoản phạt 150,000đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-26T16:41:17.063' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (102, 2, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 102 phát sinh khoản phạt 0đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-26T16:48:53.277' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (103, 3, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 102 phát sinh khoản phạt 0đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-26T16:48:53.277' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (104, 11, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 102 phát sinh khoản phạt 0đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-26T16:48:53.277' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (105, 13, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 102 phát sinh khoản phạt 0đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-26T16:48:53.277' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (106, 3, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Khăn tắm cotton 70x140cm'' tại phòng 102 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-26T16:55:03.863' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (107, 13, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Khăn tắm cotton 70x140cm'' tại phòng 102 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-26T16:55:03.863' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (108, 3, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước suối Lavie 500ml'' tại phòng 102 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-26T16:55:05.930' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (109, 13, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước suối Lavie 500ml'' tại phòng 102 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-26T16:55:05.930' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (110, 2, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 102 phát sinh khoản phạt 0đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-26T16:56:23.687' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (111, 3, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 102 phát sinh khoản phạt 0đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-26T16:56:23.687' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (112, 11, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 102 phát sinh khoản phạt 0đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-26T16:56:23.687' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (113, 13, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 102 phát sinh khoản phạt 0đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-26T16:56:23.687' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (114, 2, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 102 phát sinh khoản phạt 20,000đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-26T16:59:42.320' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (115, 3, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 102 phát sinh khoản phạt 20,000đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-26T16:59:42.320' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (116, 11, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 102 phát sinh khoản phạt 20,000đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-26T16:59:42.320' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (117, 13, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 102 phát sinh khoản phạt 20,000đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-26T16:59:42.320' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (118, 2, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 103 phát sinh khoản phạt 0đ do ''đã dùng''.', N'warning', NULL, 0, CAST(N'2026-03-26T17:09:57.023' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (119, 3, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 103 phát sinh khoản phạt 0đ do ''đã dùng''.', N'warning', NULL, 0, CAST(N'2026-03-26T17:09:57.023' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (120, 11, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 103 phát sinh khoản phạt 0đ do ''đã dùng''.', N'warning', NULL, 0, CAST(N'2026-03-26T17:09:57.023' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (121, 13, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 103 phát sinh khoản phạt 0đ do ''đã dùng''.', N'warning', NULL, 0, CAST(N'2026-03-26T17:09:57.023' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (122, 2, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 103 phát sinh khoản phạt 20,000đ do ''đã dùng''.', N'warning', NULL, 0, CAST(N'2026-03-26T17:10:04.970' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (123, 3, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 103 phát sinh khoản phạt 20,000đ do ''đã dùng''.', N'warning', NULL, 0, CAST(N'2026-03-26T17:10:04.970' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (124, 11, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 103 phát sinh khoản phạt 20,000đ do ''đã dùng''.', N'warning', NULL, 0, CAST(N'2026-03-26T17:10:04.970' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (125, 13, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 103 phát sinh khoản phạt 20,000đ do ''đã dùng''.', N'warning', NULL, 0, CAST(N'2026-03-26T17:10:04.970' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (126, 3, N'Cập nhật khoản phạt', N'[CẬP NHẬT] Khoản phạt vật tư ''Nước suối Lavie 500ml'' tại phòng 102 đã được điều chỉnh thành 0đ.', N'info', NULL, 0, CAST(N'2026-03-26T17:10:41.540' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (127, 4, N'Cập nhật khoản phạt', N'[CẬP NHẬT] Khoản phạt vật tư ''Nước suối Lavie 500ml'' tại phòng 102 đã được điều chỉnh thành 0đ.', N'info', NULL, 0, CAST(N'2026-03-26T17:10:41.540' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (128, 5, N'Cập nhật khoản phạt', N'[CẬP NHẬT] Khoản phạt vật tư ''Nước suối Lavie 500ml'' tại phòng 102 đã được điều chỉnh thành 0đ.', N'info', NULL, 0, CAST(N'2026-03-26T17:10:41.540' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (129, 6, N'Cập nhật khoản phạt', N'[CẬP NHẬT] Khoản phạt vật tư ''Nước suối Lavie 500ml'' tại phòng 102 đã được điều chỉnh thành 0đ.', N'info', NULL, 0, CAST(N'2026-03-26T17:10:41.540' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (130, 13, N'Cập nhật khoản phạt', N'[CẬP NHẬT] Khoản phạt vật tư ''Nước suối Lavie 500ml'' tại phòng 102 đã được điều chỉnh thành 0đ.', N'info', NULL, 0, CAST(N'2026-03-26T17:10:41.540' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (131, 15, N'Cập nhật khoản phạt', N'[CẬP NHẬT] Khoản phạt vật tư ''Nước suối Lavie 500ml'' tại phòng 102 đã được điều chỉnh thành 0đ.', N'info', NULL, 0, CAST(N'2026-03-26T17:10:41.540' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (132, 2, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 102 phát sinh khoản phạt 150,000đ do ''thủng''.', N'warning', NULL, 0, CAST(N'2026-03-26T17:11:16.253' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (133, 3, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 102 phát sinh khoản phạt 150,000đ do ''thủng''.', N'warning', NULL, 0, CAST(N'2026-03-26T17:11:16.253' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (134, 11, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 102 phát sinh khoản phạt 150,000đ do ''thủng''.', N'warning', NULL, 0, CAST(N'2026-03-26T17:11:16.253' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (135, 13, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 102 phát sinh khoản phạt 150,000đ do ''thủng''.', N'warning', NULL, 0, CAST(N'2026-03-26T17:11:16.253' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (136, 2, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 103 phát sinh khoản phạt 30,000đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-27T14:00:52.047' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (137, 3, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 103 phát sinh khoản phạt 30,000đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-27T14:00:52.047' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (138, 11, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 103 phát sinh khoản phạt 30,000đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-27T14:00:52.047' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (139, 13, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 103 phát sinh khoản phạt 30,000đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-27T14:00:52.047' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (140, 2, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 103 phát sinh khoản phạt 150,000đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-27T14:01:24.173' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (141, 3, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 103 phát sinh khoản phạt 150,000đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-27T14:01:24.173' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (142, 11, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 103 phát sinh khoản phạt 150,000đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-27T14:01:24.173' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (143, 13, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 103 phát sinh khoản phạt 150,000đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-27T14:01:24.173' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (144, 3, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Khăn tắm cotton 70x140cm'' tại phòng 103 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T14:28:28.297' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (145, 13, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Khăn tắm cotton 70x140cm'' tại phòng 103 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T14:28:28.297' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (146, 2, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 103 phát sinh khoản phạt 150,000đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-27T14:32:04.663' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (147, 3, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 103 phát sinh khoản phạt 150,000đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-27T14:32:04.663' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (148, 11, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 103 phát sinh khoản phạt 150,000đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-27T14:32:04.663' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (149, 13, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 103 phát sinh khoản phạt 150,000đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-27T14:32:04.663' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (150, 3, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Khăn tắm cotton 70x140cm'' tại phòng 103 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T14:32:14.603' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (151, 13, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Khăn tắm cotton 70x140cm'' tại phòng 103 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T14:32:14.603' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (152, 2, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Bánh Oreo 133g'' tại phòng 103 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T14:33:34.930' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (153, 3, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Bánh Oreo 133g'' tại phòng 103 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T14:33:34.930' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (154, 4, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Bánh Oreo 133g'' tại phòng 103 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T14:33:34.930' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (155, 5, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Bánh Oreo 133g'' tại phòng 103 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T14:33:34.930' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (156, 6, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Bánh Oreo 133g'' tại phòng 103 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T14:33:34.930' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (157, 11, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Bánh Oreo 133g'' tại phòng 103 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T14:33:34.930' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (158, 13, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Bánh Oreo 133g'' tại phòng 103 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T14:33:34.930' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (159, 15, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Bánh Oreo 133g'' tại phòng 103 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T14:33:34.930' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (160, 2, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 103 phát sinh khoản phạt 150,000đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-27T14:56:01.497' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (161, 3, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 103 phát sinh khoản phạt 150,000đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-27T14:56:01.497' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (162, 11, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 103 phát sinh khoản phạt 150,000đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-27T14:56:01.497' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (163, 13, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 103 phát sinh khoản phạt 150,000đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-27T14:56:01.497' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (164, 2, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Khăn tắm cotton 70x140cm'' tại phòng 103 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T14:56:10.490' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (165, 3, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Khăn tắm cotton 70x140cm'' tại phòng 103 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T14:56:10.490' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (166, 4, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Khăn tắm cotton 70x140cm'' tại phòng 103 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T14:56:10.490' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (167, 5, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Khăn tắm cotton 70x140cm'' tại phòng 103 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T14:56:10.490' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (168, 6, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Khăn tắm cotton 70x140cm'' tại phòng 103 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T14:56:10.490' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (169, 11, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Khăn tắm cotton 70x140cm'' tại phòng 103 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T14:56:10.490' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (170, 13, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Khăn tắm cotton 70x140cm'' tại phòng 103 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T14:56:10.490' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (171, 15, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Khăn tắm cotton 70x140cm'' tại phòng 103 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T14:56:10.490' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (172, 2, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 103 phát sinh khoản phạt 150,000đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-27T14:56:15.777' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (173, 3, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 103 phát sinh khoản phạt 150,000đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-27T14:56:15.777' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (174, 11, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 103 phát sinh khoản phạt 150,000đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-27T14:56:15.777' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (175, 13, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 103 phát sinh khoản phạt 150,000đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-27T14:56:15.777' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (176, 2, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 103 phát sinh khoản phạt 9,000,000đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-27T14:56:53.193' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (177, 3, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 103 phát sinh khoản phạt 9,000,000đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-27T14:56:53.193' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (178, 11, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 103 phát sinh khoản phạt 9,000,000đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-27T14:56:53.193' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (179, 13, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 103 phát sinh khoản phạt 9,000,000đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-27T14:56:53.193' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (180, 2, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Điều hòa Daikin 9000 BTU'' tại phòng 103 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T14:56:56.690' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (181, 3, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Điều hòa Daikin 9000 BTU'' tại phòng 103 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T14:56:56.690' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (182, 4, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Điều hòa Daikin 9000 BTU'' tại phòng 103 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T14:56:56.690' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (183, 5, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Điều hòa Daikin 9000 BTU'' tại phòng 103 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T14:56:56.690' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (184, 6, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Điều hòa Daikin 9000 BTU'' tại phòng 103 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T14:56:56.690' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (185, 11, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Điều hòa Daikin 9000 BTU'' tại phòng 103 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T14:56:56.690' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (186, 13, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Điều hòa Daikin 9000 BTU'' tại phòng 103 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T14:56:56.690' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (187, 15, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Điều hòa Daikin 9000 BTU'' tại phòng 103 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T14:56:56.690' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (188, 2, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Khăn tắm cotton 70x140cm'' tại phòng 103 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T14:56:59.610' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (189, 3, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Khăn tắm cotton 70x140cm'' tại phòng 103 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T14:56:59.610' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (190, 4, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Khăn tắm cotton 70x140cm'' tại phòng 103 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T14:56:59.610' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (191, 5, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Khăn tắm cotton 70x140cm'' tại phòng 103 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T14:56:59.610' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (192, 6, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Khăn tắm cotton 70x140cm'' tại phòng 103 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T14:56:59.610' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (193, 11, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Khăn tắm cotton 70x140cm'' tại phòng 103 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T14:56:59.610' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (194, 13, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Khăn tắm cotton 70x140cm'' tại phòng 103 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T14:56:59.610' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (195, 15, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Khăn tắm cotton 70x140cm'' tại phòng 103 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T14:56:59.610' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (196, 2, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước suối Lavie 500ml'' tại phòng 103 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:08:50.413' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (197, 3, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước suối Lavie 500ml'' tại phòng 103 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:08:50.413' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (198, 4, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước suối Lavie 500ml'' tại phòng 103 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:08:50.413' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (199, 5, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước suối Lavie 500ml'' tại phòng 103 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:08:50.413' AS DateTime))
GO
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (200, 6, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước suối Lavie 500ml'' tại phòng 103 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:08:50.413' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (201, 11, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước suối Lavie 500ml'' tại phòng 103 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:08:50.413' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (202, 13, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước suối Lavie 500ml'' tại phòng 103 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:08:50.413' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (203, 15, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước suối Lavie 500ml'' tại phòng 103 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:08:50.413' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (204, 2, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 103 phát sinh khoản phạt 15,000đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-27T15:08:59.047' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (205, 3, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 103 phát sinh khoản phạt 15,000đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-27T15:08:59.047' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (206, 11, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 103 phát sinh khoản phạt 15,000đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-27T15:08:59.047' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (207, 13, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 103 phát sinh khoản phạt 15,000đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-27T15:08:59.047' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (208, 1, N'Khóa tài khoản', N'Tài khoản guestE@gmail.com đã bị vô hiệu hóa thành công.', N'warning', NULL, 0, CAST(N'2026-03-27T15:12:56.603' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (209, 2, N'Khóa tài khoản', N'Tài khoản guestE@gmail.com đã bị vô hiệu hóa thành công.', N'warning', NULL, 0, CAST(N'2026-03-27T15:12:56.603' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (210, 11, N'Khóa tài khoản', N'Tài khoản guestE@gmail.com đã bị vô hiệu hóa thành công.', N'warning', NULL, 0, CAST(N'2026-03-27T15:12:56.603' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (211, 10, N'Khóa tài khoản', N'Tài khoản guestE@gmail.com đã bị vô hiệu hóa thành công.', N'warning', NULL, 0, CAST(N'2026-03-27T15:12:56.603' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (212, 1, N'Mở khóa tài khoản', N'Tài khoản guestE@gmail.com đã được khôi phục hoạt động.', N'success', NULL, 0, CAST(N'2026-03-27T15:13:00.267' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (213, 2, N'Mở khóa tài khoản', N'Tài khoản guestE@gmail.com đã được khôi phục hoạt động.', N'success', NULL, 0, CAST(N'2026-03-27T15:13:00.267' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (214, 11, N'Mở khóa tài khoản', N'Tài khoản guestE@gmail.com đã được khôi phục hoạt động.', N'success', NULL, 0, CAST(N'2026-03-27T15:13:00.267' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (215, 10, N'Mở khóa tài khoản', N'Tài khoản guestE@gmail.com đã được khôi phục hoạt động.', N'success', NULL, 0, CAST(N'2026-03-27T15:13:00.267' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (216, 1, N'Khóa tài khoản', N'Tài khoản guestD@gmail.com đã bị vô hiệu hóa thành công.', N'warning', NULL, 0, CAST(N'2026-03-27T15:13:05.463' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (217, 2, N'Khóa tài khoản', N'Tài khoản guestD@gmail.com đã bị vô hiệu hóa thành công.', N'warning', NULL, 0, CAST(N'2026-03-27T15:13:05.463' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (218, 11, N'Khóa tài khoản', N'Tài khoản guestD@gmail.com đã bị vô hiệu hóa thành công.', N'warning', NULL, 0, CAST(N'2026-03-27T15:13:05.463' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (219, 9, N'Khóa tài khoản', N'Tài khoản guestD@gmail.com đã bị vô hiệu hóa thành công.', N'warning', NULL, 0, CAST(N'2026-03-27T15:13:05.463' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (220, 1, N'Mở khóa tài khoản', N'Tài khoản guestD@gmail.com đã được khôi phục hoạt động.', N'success', NULL, 0, CAST(N'2026-03-27T15:13:09.863' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (221, 2, N'Mở khóa tài khoản', N'Tài khoản guestD@gmail.com đã được khôi phục hoạt động.', N'success', NULL, 0, CAST(N'2026-03-27T15:13:09.863' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (222, 11, N'Mở khóa tài khoản', N'Tài khoản guestD@gmail.com đã được khôi phục hoạt động.', N'success', NULL, 0, CAST(N'2026-03-27T15:13:09.863' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (223, 9, N'Mở khóa tài khoản', N'Tài khoản guestD@gmail.com đã được khôi phục hoạt động.', N'success', NULL, 0, CAST(N'2026-03-27T15:13:09.863' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (224, 1, N'Khóa tài khoản', N'Tài khoản guestD@gmail.com đã bị vô hiệu hóa thành công.', N'warning', NULL, 0, CAST(N'2026-03-27T15:13:11.517' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (225, 2, N'Khóa tài khoản', N'Tài khoản guestD@gmail.com đã bị vô hiệu hóa thành công.', N'warning', NULL, 0, CAST(N'2026-03-27T15:13:11.517' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (226, 11, N'Khóa tài khoản', N'Tài khoản guestD@gmail.com đã bị vô hiệu hóa thành công.', N'warning', NULL, 0, CAST(N'2026-03-27T15:13:11.517' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (227, 9, N'Khóa tài khoản', N'Tài khoản guestD@gmail.com đã bị vô hiệu hóa thành công.', N'warning', NULL, 0, CAST(N'2026-03-27T15:13:11.517' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (228, 1, N'Mở khóa tài khoản', N'Tài khoản guestD@gmail.com đã được khôi phục hoạt động.', N'success', NULL, 0, CAST(N'2026-03-27T15:13:14.797' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (229, 2, N'Mở khóa tài khoản', N'Tài khoản guestD@gmail.com đã được khôi phục hoạt động.', N'success', NULL, 0, CAST(N'2026-03-27T15:13:14.797' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (230, 11, N'Mở khóa tài khoản', N'Tài khoản guestD@gmail.com đã được khôi phục hoạt động.', N'success', NULL, 0, CAST(N'2026-03-27T15:13:14.797' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (231, 9, N'Mở khóa tài khoản', N'Tài khoản guestD@gmail.com đã được khôi phục hoạt động.', N'success', NULL, 0, CAST(N'2026-03-27T15:13:14.797' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (232, 1, N'Khóa tài khoản', N'Tài khoản guestD@gmail.com đã bị vô hiệu hóa thành công.', N'warning', NULL, 0, CAST(N'2026-03-27T15:13:15.803' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (233, 2, N'Khóa tài khoản', N'Tài khoản guestD@gmail.com đã bị vô hiệu hóa thành công.', N'warning', NULL, 0, CAST(N'2026-03-27T15:13:15.803' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (234, 11, N'Khóa tài khoản', N'Tài khoản guestD@gmail.com đã bị vô hiệu hóa thành công.', N'warning', NULL, 0, CAST(N'2026-03-27T15:13:15.803' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (235, 9, N'Khóa tài khoản', N'Tài khoản guestD@gmail.com đã bị vô hiệu hóa thành công.', N'warning', NULL, 0, CAST(N'2026-03-27T15:13:15.803' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (236, 1, N'Mở khóa tài khoản', N'Tài khoản guestD@gmail.com đã được khôi phục hoạt động.', N'success', NULL, 0, CAST(N'2026-03-27T15:13:16.353' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (237, 2, N'Mở khóa tài khoản', N'Tài khoản guestD@gmail.com đã được khôi phục hoạt động.', N'success', NULL, 0, CAST(N'2026-03-27T15:13:16.353' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (238, 11, N'Mở khóa tài khoản', N'Tài khoản guestD@gmail.com đã được khôi phục hoạt động.', N'success', NULL, 0, CAST(N'2026-03-27T15:13:16.353' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (239, 9, N'Mở khóa tài khoản', N'Tài khoản guestD@gmail.com đã được khôi phục hoạt động.', N'success', NULL, 0, CAST(N'2026-03-27T15:13:16.353' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (240, 1, N'Khóa tài khoản', N'Tài khoản guestD@gmail.com đã bị vô hiệu hóa thành công.', N'warning', NULL, 0, CAST(N'2026-03-27T15:13:16.817' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (241, 2, N'Khóa tài khoản', N'Tài khoản guestD@gmail.com đã bị vô hiệu hóa thành công.', N'warning', NULL, 0, CAST(N'2026-03-27T15:13:16.817' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (242, 11, N'Khóa tài khoản', N'Tài khoản guestD@gmail.com đã bị vô hiệu hóa thành công.', N'warning', NULL, 0, CAST(N'2026-03-27T15:13:16.817' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (243, 9, N'Khóa tài khoản', N'Tài khoản guestD@gmail.com đã bị vô hiệu hóa thành công.', N'warning', NULL, 0, CAST(N'2026-03-27T15:13:16.817' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (244, 1, N'Mở khóa tài khoản', N'Tài khoản guestD@gmail.com đã được khôi phục hoạt động.', N'success', NULL, 0, CAST(N'2026-03-27T15:13:18.407' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (245, 2, N'Mở khóa tài khoản', N'Tài khoản guestD@gmail.com đã được khôi phục hoạt động.', N'success', NULL, 0, CAST(N'2026-03-27T15:13:18.407' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (246, 11, N'Mở khóa tài khoản', N'Tài khoản guestD@gmail.com đã được khôi phục hoạt động.', N'success', NULL, 0, CAST(N'2026-03-27T15:13:18.407' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (247, 9, N'Mở khóa tài khoản', N'Tài khoản guestD@gmail.com đã được khôi phục hoạt động.', N'success', NULL, 0, CAST(N'2026-03-27T15:13:18.407' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (248, 1, N'Khóa tài khoản', N'Tài khoản guestC@gmail.com đã bị vô hiệu hóa thành công.', N'warning', NULL, 0, CAST(N'2026-03-27T15:14:31.383' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (249, 2, N'Khóa tài khoản', N'Tài khoản guestC@gmail.com đã bị vô hiệu hóa thành công.', N'warning', NULL, 0, CAST(N'2026-03-27T15:14:31.383' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (250, 11, N'Khóa tài khoản', N'Tài khoản guestC@gmail.com đã bị vô hiệu hóa thành công.', N'warning', NULL, 0, CAST(N'2026-03-27T15:14:31.383' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (251, 8, N'Khóa tài khoản', N'Tài khoản guestC@gmail.com đã bị vô hiệu hóa thành công.', N'warning', NULL, 0, CAST(N'2026-03-27T15:14:31.383' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (252, 1, N'Mở khóa tài khoản', N'Tài khoản guestC@gmail.com đã được khôi phục hoạt động.', N'success', NULL, 0, CAST(N'2026-03-27T15:14:35.597' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (253, 2, N'Mở khóa tài khoản', N'Tài khoản guestC@gmail.com đã được khôi phục hoạt động.', N'success', NULL, 0, CAST(N'2026-03-27T15:14:35.597' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (254, 11, N'Mở khóa tài khoản', N'Tài khoản guestC@gmail.com đã được khôi phục hoạt động.', N'success', NULL, 0, CAST(N'2026-03-27T15:14:35.597' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (255, 8, N'Mở khóa tài khoản', N'Tài khoản guestC@gmail.com đã được khôi phục hoạt động.', N'success', NULL, 0, CAST(N'2026-03-27T15:14:35.597' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (256, 1, N'Khóa tài khoản', N'Tài khoản guestC@gmail.com đã bị vô hiệu hóa thành công.', N'warning', NULL, 0, CAST(N'2026-03-27T15:14:46.153' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (257, 2, N'Khóa tài khoản', N'Tài khoản guestC@gmail.com đã bị vô hiệu hóa thành công.', N'warning', NULL, 0, CAST(N'2026-03-27T15:14:46.153' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (258, 11, N'Khóa tài khoản', N'Tài khoản guestC@gmail.com đã bị vô hiệu hóa thành công.', N'warning', NULL, 0, CAST(N'2026-03-27T15:14:46.153' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (259, 8, N'Khóa tài khoản', N'Tài khoản guestC@gmail.com đã bị vô hiệu hóa thành công.', N'warning', NULL, 0, CAST(N'2026-03-27T15:14:46.153' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (260, 1, N'Mở khóa tài khoản', N'Tài khoản guestC@gmail.com đã được khôi phục hoạt động.', N'success', NULL, 0, CAST(N'2026-03-27T15:14:52.200' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (261, 2, N'Mở khóa tài khoản', N'Tài khoản guestC@gmail.com đã được khôi phục hoạt động.', N'success', NULL, 0, CAST(N'2026-03-27T15:14:52.200' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (262, 11, N'Mở khóa tài khoản', N'Tài khoản guestC@gmail.com đã được khôi phục hoạt động.', N'success', NULL, 0, CAST(N'2026-03-27T15:14:52.200' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (263, 8, N'Mở khóa tài khoản', N'Tài khoản guestC@gmail.com đã được khôi phục hoạt động.', N'success', NULL, 0, CAST(N'2026-03-27T15:14:52.200' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (264, 2, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước ngọt Coca Cola 320ml'' tại phòng 103 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:15:48.090' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (265, 3, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước ngọt Coca Cola 320ml'' tại phòng 103 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:15:48.090' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (266, 4, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước ngọt Coca Cola 320ml'' tại phòng 103 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:15:48.090' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (267, 5, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước ngọt Coca Cola 320ml'' tại phòng 103 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:15:48.090' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (268, 6, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước ngọt Coca Cola 320ml'' tại phòng 103 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:15:48.090' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (269, 11, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước ngọt Coca Cola 320ml'' tại phòng 103 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:15:48.090' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (270, 13, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước ngọt Coca Cola 320ml'' tại phòng 103 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:15:48.090' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (271, 15, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước ngọt Coca Cola 320ml'' tại phòng 103 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:15:48.090' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (272, 2, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 103 phát sinh khoản phạt 20,000đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-27T15:16:06.567' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (273, 3, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 103 phát sinh khoản phạt 20,000đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-27T15:16:06.567' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (274, 11, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 103 phát sinh khoản phạt 20,000đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-27T15:16:06.567' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (275, 13, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 103 phát sinh khoản phạt 20,000đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-27T15:16:06.567' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (276, 2, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 103 phát sinh khoản phạt 30,000đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-27T15:16:37.563' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (277, 3, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 103 phát sinh khoản phạt 30,000đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-27T15:16:37.563' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (278, 11, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 103 phát sinh khoản phạt 30,000đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-27T15:16:37.563' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (279, 13, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 103 phát sinh khoản phạt 30,000đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-27T15:16:37.563' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (280, 2, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 103 phát sinh khoản phạt 15,000đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-27T15:34:24.650' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (281, 3, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 103 phát sinh khoản phạt 15,000đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-27T15:34:24.650' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (282, 11, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 103 phát sinh khoản phạt 15,000đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-27T15:34:24.650' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (283, 13, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 103 phát sinh khoản phạt 15,000đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-27T15:34:24.650' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (284, 2, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước suối Lavie 500ml'' tại phòng 103 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:34:29.493' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (285, 3, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước suối Lavie 500ml'' tại phòng 103 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:34:29.493' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (286, 4, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước suối Lavie 500ml'' tại phòng 103 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:34:29.493' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (287, 5, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước suối Lavie 500ml'' tại phòng 103 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:34:29.493' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (288, 6, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước suối Lavie 500ml'' tại phòng 103 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:34:29.493' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (289, 11, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước suối Lavie 500ml'' tại phòng 103 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:34:29.493' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (290, 13, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước suối Lavie 500ml'' tại phòng 103 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:34:29.493' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (291, 15, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước suối Lavie 500ml'' tại phòng 103 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:34:29.493' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (292, 2, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Khăn tắm cotton 70x140cm'' tại phòng 102 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:36:46.793' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (293, 3, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Khăn tắm cotton 70x140cm'' tại phòng 102 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:36:46.793' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (294, 4, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Khăn tắm cotton 70x140cm'' tại phòng 102 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:36:46.793' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (295, 5, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Khăn tắm cotton 70x140cm'' tại phòng 102 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:36:46.793' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (296, 6, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Khăn tắm cotton 70x140cm'' tại phòng 102 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:36:46.793' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (297, 11, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Khăn tắm cotton 70x140cm'' tại phòng 102 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:36:46.793' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (298, 13, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Khăn tắm cotton 70x140cm'' tại phòng 102 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:36:46.793' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (299, 15, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Khăn tắm cotton 70x140cm'' tại phòng 102 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:36:46.793' AS DateTime))
GO
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (300, 2, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước ngọt Coca Cola 320ml'' tại phòng 102 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:36:56.710' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (301, 3, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước ngọt Coca Cola 320ml'' tại phòng 102 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:36:56.710' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (302, 4, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước ngọt Coca Cola 320ml'' tại phòng 102 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:36:56.710' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (303, 5, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước ngọt Coca Cola 320ml'' tại phòng 102 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:36:56.710' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (304, 6, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước ngọt Coca Cola 320ml'' tại phòng 102 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:36:56.710' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (305, 11, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước ngọt Coca Cola 320ml'' tại phòng 102 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:36:56.710' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (306, 13, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước ngọt Coca Cola 320ml'' tại phòng 102 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:36:56.710' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (307, 15, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước ngọt Coca Cola 320ml'' tại phòng 102 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:36:56.710' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (308, 2, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước suối Lavie 500ml'' tại phòng 102 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:36:59.563' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (309, 3, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước suối Lavie 500ml'' tại phòng 102 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:36:59.563' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (310, 4, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước suối Lavie 500ml'' tại phòng 102 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:36:59.563' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (311, 5, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước suối Lavie 500ml'' tại phòng 102 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:36:59.563' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (312, 6, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước suối Lavie 500ml'' tại phòng 102 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:36:59.563' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (313, 11, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước suối Lavie 500ml'' tại phòng 102 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:36:59.563' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (314, 13, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước suối Lavie 500ml'' tại phòng 102 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:36:59.563' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (315, 15, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước suối Lavie 500ml'' tại phòng 102 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:36:59.563' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (316, 2, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 102 phát sinh khoản phạt 0đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-27T15:37:08.860' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (317, 3, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 102 phát sinh khoản phạt 0đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-27T15:37:08.860' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (318, 11, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 102 phát sinh khoản phạt 0đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-27T15:37:08.860' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (319, 13, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 102 phát sinh khoản phạt 0đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-27T15:37:08.860' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (320, 2, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước suối Lavie 500ml'' tại phòng 102 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:40:41.123' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (321, 3, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước suối Lavie 500ml'' tại phòng 102 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:40:41.123' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (322, 4, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước suối Lavie 500ml'' tại phòng 102 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:40:41.123' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (323, 5, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước suối Lavie 500ml'' tại phòng 102 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:40:41.123' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (324, 6, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước suối Lavie 500ml'' tại phòng 102 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:40:41.123' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (325, 11, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước suối Lavie 500ml'' tại phòng 102 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:40:41.123' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (326, 13, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước suối Lavie 500ml'' tại phòng 102 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:40:41.123' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (327, 15, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước suối Lavie 500ml'' tại phòng 102 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:40:41.123' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (328, 2, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 102 phát sinh khoản phạt 0đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-27T15:41:00.933' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (329, 3, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 102 phát sinh khoản phạt 0đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-27T15:41:00.933' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (330, 11, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 102 phát sinh khoản phạt 0đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-27T15:41:00.933' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (331, 13, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 102 phát sinh khoản phạt 0đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-27T15:41:00.933' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (332, 2, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước suối Lavie 500ml'' tại phòng 102 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:41:10.717' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (333, 3, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước suối Lavie 500ml'' tại phòng 102 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:41:10.717' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (334, 4, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước suối Lavie 500ml'' tại phòng 102 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:41:10.717' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (335, 5, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước suối Lavie 500ml'' tại phòng 102 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:41:10.717' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (336, 6, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước suối Lavie 500ml'' tại phòng 102 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:41:10.717' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (337, 11, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước suối Lavie 500ml'' tại phòng 102 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:41:10.717' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (338, 13, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước suối Lavie 500ml'' tại phòng 102 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:41:10.717' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (339, 15, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước suối Lavie 500ml'' tại phòng 102 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:41:10.717' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (340, 2, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 102 phát sinh khoản phạt 0đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-27T15:41:24.677' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (341, 3, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 102 phát sinh khoản phạt 0đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-27T15:41:24.677' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (342, 11, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 102 phát sinh khoản phạt 0đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-27T15:41:24.677' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (343, 13, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 102 phát sinh khoản phạt 0đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-27T15:41:24.677' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (344, 2, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 102 phát sinh khoản phạt 20,000đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-27T15:42:13.727' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (345, 3, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 102 phát sinh khoản phạt 20,000đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-27T15:42:13.727' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (346, 11, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 102 phát sinh khoản phạt 20,000đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-27T15:42:13.727' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (347, 13, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 102 phát sinh khoản phạt 20,000đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-27T15:42:13.727' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (348, 2, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước suối Lavie 500ml'' tại phòng 102 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:43:03.907' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (349, 3, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước suối Lavie 500ml'' tại phòng 102 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:43:03.907' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (350, 4, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước suối Lavie 500ml'' tại phòng 102 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:43:03.907' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (351, 5, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước suối Lavie 500ml'' tại phòng 102 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:43:03.907' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (352, 6, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước suối Lavie 500ml'' tại phòng 102 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:43:03.907' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (353, 11, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước suối Lavie 500ml'' tại phòng 102 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:43:03.907' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (354, 13, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước suối Lavie 500ml'' tại phòng 102 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:43:03.907' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (355, 15, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Nước suối Lavie 500ml'' tại phòng 102 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-27T15:43:03.907' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (356, 2, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 102 phát sinh khoản phạt 0đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-27T15:43:18.250' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (357, 3, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 102 phát sinh khoản phạt 0đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-27T15:43:18.250' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (358, 11, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 102 phát sinh khoản phạt 0đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-27T15:43:18.250' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (359, 13, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 102 phát sinh khoản phạt 0đ do ''''.', N'warning', NULL, 0, CAST(N'2026-03-27T15:43:18.250' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (360, 2, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 102 phát sinh khoản phạt 150,000đ do ''thủng lỗ''.', N'warning', NULL, 0, CAST(N'2026-03-28T01:09:35.863' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (361, 3, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 102 phát sinh khoản phạt 150,000đ do ''thủng lỗ''.', N'warning', NULL, 0, CAST(N'2026-03-28T01:09:35.863' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (362, 11, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 102 phát sinh khoản phạt 150,000đ do ''thủng lỗ''.', N'warning', NULL, 0, CAST(N'2026-03-28T01:09:35.863' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (363, 13, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 102 phát sinh khoản phạt 150,000đ do ''thủng lỗ''.', N'warning', NULL, 0, CAST(N'2026-03-28T01:09:35.863' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (364, 2, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Khăn tắm cotton 70x140cm'' tại phòng 102 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-28T01:10:18.603' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (365, 3, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Khăn tắm cotton 70x140cm'' tại phòng 102 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-28T01:10:18.603' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (366, 4, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Khăn tắm cotton 70x140cm'' tại phòng 102 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-28T01:10:18.603' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (367, 5, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Khăn tắm cotton 70x140cm'' tại phòng 102 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-28T01:10:18.603' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (368, 6, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Khăn tắm cotton 70x140cm'' tại phòng 102 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-28T01:10:18.603' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (369, 11, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Khăn tắm cotton 70x140cm'' tại phòng 102 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-28T01:10:18.603' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (370, 13, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Khăn tắm cotton 70x140cm'' tại phòng 102 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-28T01:10:18.603' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (371, 15, N'Hủy báo cáo phạt', N'[HỦY PHẠT] Báo cáo đền bù ''Khăn tắm cotton 70x140cm'' tại phòng 102 đã bị hủy.', N'success', NULL, 0, CAST(N'2026-03-28T01:10:18.603' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (372, 2, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 102 phát sinh khoản phạt 30,000đ do ''khách dùng''.', N'warning', NULL, 0, CAST(N'2026-03-28T01:26:23.180' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (373, 3, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 102 phát sinh khoản phạt 30,000đ do ''khách dùng''.', N'warning', NULL, 0, CAST(N'2026-03-28T01:26:23.180' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (374, 11, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 102 phát sinh khoản phạt 30,000đ do ''khách dùng''.', N'warning', NULL, 0, CAST(N'2026-03-28T01:26:23.180' AS DateTime))
INSERT [dbo].[Notifications] ([id], [user_id], [title], [content], [type], [reference_link], [is_read], [created_at]) VALUES (375, 13, N'Báo cáo thất thoát mới', N'[CẢNH BÁO] Phòng 102 phát sinh khoản phạt 30,000đ do ''khách dùng''.', N'warning', NULL, 0, CAST(N'2026-03-28T01:26:23.180' AS DateTime))
SET IDENTITY_INSERT [dbo].[Notifications] OFF
GO
SET IDENTITY_INSERT [dbo].[Order_Service_Details] ON 

INSERT [dbo].[Order_Service_Details] ([id], [order_service_id], [service_id], [quantity], [unit_price]) VALUES (1, 2, 2, 1, CAST(150000.00 AS Decimal(18, 2)))
INSERT [dbo].[Order_Service_Details] ([id], [order_service_id], [service_id], [quantity], [unit_price]) VALUES (2, 2, 10, 1, CAST(50000.00 AS Decimal(18, 2)))
INSERT [dbo].[Order_Service_Details] ([id], [order_service_id], [service_id], [quantity], [unit_price]) VALUES (3, 4, 3, 1, CAST(500000.00 AS Decimal(18, 2)))
INSERT [dbo].[Order_Service_Details] ([id], [order_service_id], [service_id], [quantity], [unit_price]) VALUES (4, 6, 5, 1, CAST(350000.00 AS Decimal(18, 2)))
INSERT [dbo].[Order_Service_Details] ([id], [order_service_id], [service_id], [quantity], [unit_price]) VALUES (5, 7, 9, 1, CAST(800000.00 AS Decimal(18, 2)))
INSERT [dbo].[Order_Service_Details] ([id], [order_service_id], [service_id], [quantity], [unit_price]) VALUES (6, 9, 1, 5, CAST(200000.00 AS Decimal(18, 2)))
INSERT [dbo].[Order_Service_Details] ([id], [order_service_id], [service_id], [quantity], [unit_price]) VALUES (7, 10, 2, 1, CAST(150000.00 AS Decimal(18, 2)))
INSERT [dbo].[Order_Service_Details] ([id], [order_service_id], [service_id], [quantity], [unit_price]) VALUES (8, 4, 8, 2, CAST(40000.00 AS Decimal(18, 2)))
INSERT [dbo].[Order_Service_Details] ([id], [order_service_id], [service_id], [quantity], [unit_price]) VALUES (9, 6, 10, 2, CAST(50000.00 AS Decimal(18, 2)))
INSERT [dbo].[Order_Service_Details] ([id], [order_service_id], [service_id], [quantity], [unit_price]) VALUES (10, 7, 6, 2, CAST(100000.00 AS Decimal(18, 2)))
SET IDENTITY_INSERT [dbo].[Order_Service_Details] OFF
GO
SET IDENTITY_INSERT [dbo].[Order_Services] ON 

INSERT [dbo].[Order_Services] ([id], [booking_detail_id], [order_date], [total_amount], [status]) VALUES (1, 1, CAST(N'2026-03-06T22:07:35.027' AS DateTime), CAST(0.00 AS Decimal(18, 2)), N'Cancelled')
INSERT [dbo].[Order_Services] ([id], [booking_detail_id], [order_date], [total_amount], [status]) VALUES (2, 2, CAST(N'2026-03-06T22:07:35.027' AS DateTime), CAST(200000.00 AS Decimal(18, 2)), N'Delivered')
INSERT [dbo].[Order_Services] ([id], [booking_detail_id], [order_date], [total_amount], [status]) VALUES (3, 3, CAST(N'2026-03-06T22:07:35.027' AS DateTime), CAST(0.00 AS Decimal(18, 2)), N'Pending')
INSERT [dbo].[Order_Services] ([id], [booking_detail_id], [order_date], [total_amount], [status]) VALUES (4, 4, CAST(N'2026-03-06T22:07:35.027' AS DateTime), CAST(500000.00 AS Decimal(18, 2)), N'Delivered')
INSERT [dbo].[Order_Services] ([id], [booking_detail_id], [order_date], [total_amount], [status]) VALUES (5, 5, CAST(N'2026-03-06T22:07:35.027' AS DateTime), CAST(0.00 AS Decimal(18, 2)), N'Pending')
INSERT [dbo].[Order_Services] ([id], [booking_detail_id], [order_date], [total_amount], [status]) VALUES (6, 6, CAST(N'2026-03-06T22:07:35.027' AS DateTime), CAST(350000.00 AS Decimal(18, 2)), N'Delivered')
INSERT [dbo].[Order_Services] ([id], [booking_detail_id], [order_date], [total_amount], [status]) VALUES (7, 7, CAST(N'2026-03-06T22:07:35.027' AS DateTime), CAST(800000.00 AS Decimal(18, 2)), N'Delivered')
INSERT [dbo].[Order_Services] ([id], [booking_detail_id], [order_date], [total_amount], [status]) VALUES (8, 8, CAST(N'2026-03-06T22:07:35.027' AS DateTime), CAST(0.00 AS Decimal(18, 2)), N'Pending')
INSERT [dbo].[Order_Services] ([id], [booking_detail_id], [order_date], [total_amount], [status]) VALUES (9, 9, CAST(N'2026-03-06T22:07:35.027' AS DateTime), CAST(1000000.00 AS Decimal(18, 2)), N'Delivered')
INSERT [dbo].[Order_Services] ([id], [booking_detail_id], [order_date], [total_amount], [status]) VALUES (10, 10, CAST(N'2026-03-06T22:07:35.027' AS DateTime), CAST(150000.00 AS Decimal(18, 2)), N'Delivered')
SET IDENTITY_INSERT [dbo].[Order_Services] OFF
GO
SET IDENTITY_INSERT [dbo].[Payments] ON 

INSERT [dbo].[Payments] ([id], [invoice_id], [payment_method], [amount_paid], [transaction_code], [payment_date]) VALUES (1, 1, N'Cash', CAST(880000.00 AS Decimal(18, 2)), N'CASH001', CAST(N'2026-03-06T22:07:35.027' AS DateTime))
INSERT [dbo].[Payments] ([id], [invoice_id], [payment_method], [amount_paid], [transaction_code], [payment_date]) VALUES (2, 2, N'VNPay', CAST(1000000.00 AS Decimal(18, 2)), N'VNPAY123', CAST(N'2026-03-06T22:07:35.027' AS DateTime))
INSERT [dbo].[Payments] ([id], [invoice_id], [payment_method], [amount_paid], [transaction_code], [payment_date]) VALUES (3, 3, N'Credit Card', CAST(500000.00 AS Decimal(18, 2)), N'CC456', CAST(N'2026-03-06T22:07:35.027' AS DateTime))
INSERT [dbo].[Payments] ([id], [invoice_id], [payment_method], [amount_paid], [transaction_code], [payment_date]) VALUES (4, 4, N'Momo', CAST(3850000.00 AS Decimal(18, 2)), N'MOMO789', CAST(N'2026-03-06T22:07:35.027' AS DateTime))
INSERT [dbo].[Payments] ([id], [invoice_id], [payment_method], [amount_paid], [transaction_code], [payment_date]) VALUES (5, 5, N'Bank Transfer', CAST(1320000.00 AS Decimal(18, 2)), N'BANK001', CAST(N'2026-03-06T22:07:35.027' AS DateTime))
INSERT [dbo].[Payments] ([id], [invoice_id], [payment_method], [amount_paid], [transaction_code], [payment_date]) VALUES (6, 6, N'Cash', CAST(3850000.00 AS Decimal(18, 2)), N'CASH002', CAST(N'2026-03-06T22:07:35.027' AS DateTime))
INSERT [dbo].[Payments] ([id], [invoice_id], [payment_method], [amount_paid], [transaction_code], [payment_date]) VALUES (7, 7, N'VNPay', CAST(3366000.00 AS Decimal(18, 2)), N'VNPAY999', CAST(N'2026-03-06T22:07:35.027' AS DateTime))
INSERT [dbo].[Payments] ([id], [invoice_id], [payment_method], [amount_paid], [transaction_code], [payment_date]) VALUES (8, 8, N'Credit Card', CAST(11000000.00 AS Decimal(18, 2)), N'CC888', CAST(N'2026-03-06T22:07:35.027' AS DateTime))
INSERT [dbo].[Payments] ([id], [invoice_id], [payment_method], [amount_paid], [transaction_code], [payment_date]) VALUES (9, 9, N'Bank Transfer', CAST(28600000.00 AS Decimal(18, 2)), N'BANK002', CAST(N'2026-03-06T22:07:35.027' AS DateTime))
INSERT [dbo].[Payments] ([id], [invoice_id], [payment_method], [amount_paid], [transaction_code], [payment_date]) VALUES (10, 10, N'Momo', CAST(5000000.00 AS Decimal(18, 2)), N'MOMO111', CAST(N'2026-03-06T22:07:35.027' AS DateTime))
SET IDENTITY_INSERT [dbo].[Payments] OFF
GO

SET IDENTITY_INSERT [dbo].[Reviews] ON 

INSERT [dbo].[Reviews] ([id], [user_id], [room_type_id], [rating], [comment], [created_at]) VALUES (1, 6, 1, 5, N'Phòng tuyệt vời!', CAST(N'2026-03-06T22:07:35.023' AS DateTime))
INSERT [dbo].[Reviews] ([id], [user_id], [room_type_id], [rating], [comment], [created_at]) VALUES (2, 7, 2, 4, N'Khá tốt, nhân viên thân thiện.', CAST(N'2026-03-06T22:07:35.023' AS DateTime))
INSERT [dbo].[Reviews] ([id], [user_id], [room_type_id], [rating], [comment], [created_at]) VALUES (3, 8, 3, 3, N'Bình thường, điều hòa hơi ồn.', CAST(N'2026-03-06T22:07:35.023' AS DateTime))
INSERT [dbo].[Reviews] ([id], [user_id], [room_type_id], [rating], [comment], [created_at]) VALUES (4, 9, 4, 5, N'View biển rất đẹp.', CAST(N'2026-03-06T22:07:35.023' AS DateTime))
INSERT [dbo].[Reviews] ([id], [user_id], [room_type_id], [rating], [comment], [created_at]) VALUES (5, 10, 5, 4, N'Bữa sáng ngon miệng.', CAST(N'2026-03-06T22:07:35.023' AS DateTime))
INSERT [dbo].[Reviews] ([id], [user_id], [room_type_id], [rating], [comment], [created_at]) VALUES (6, 6, 6, 5, N'Rất thích hợp cho gia đình.', CAST(N'2026-03-06T22:07:35.023' AS DateTime))
INSERT [dbo].[Reviews] ([id], [user_id], [room_type_id], [rating], [comment], [created_at]) VALUES (7, 7, 7, 5, N'Sang trọng, đẳng cấp.', CAST(N'2026-03-06T22:07:35.023' AS DateTime))
INSERT [dbo].[Reviews] ([id], [user_id], [room_type_id], [rating], [comment], [created_at]) VALUES (8, 8, 8, 2, N'Chưa hài lòng với dịch vụ dọn phòng.', CAST(N'2026-03-06T22:07:35.023' AS DateTime))
INSERT [dbo].[Reviews] ([id], [user_id], [room_type_id], [rating], [comment], [created_at]) VALUES (9, 9, 9, 5, N'Hoàn hảo mọi mặt.', CAST(N'2026-03-06T22:07:35.023' AS DateTime))
INSERT [dbo].[Reviews] ([id], [user_id], [room_type_id], [rating], [comment], [created_at]) VALUES (10, 10, 10, 5, N'Trải nghiệm tuyệt vời nhất.', CAST(N'2026-03-06T22:07:35.023' AS DateTime))
SET IDENTITY_INSERT [dbo].[Reviews] OFF
GO

SET IDENTITY_INSERT [dbo].[Room_Images] ON 

INSERT [dbo].[Room_Images] ([id], [room_type_id], [image_url], [cloud_public_id], [is_primary], [is_active], [status]) VALUES (1, 1, N'https://res.cloudinary.com/dfvdvkssv/image/upload/v1779469239/room_types/bl3jxmg8lueyxkwmn0ie.jpg', N'room_types/bl3jxmg8lueyxkwmn0ie', 1, 1, N'ACTIVE')
INSERT [dbo].[Room_Images] ([id], [room_type_id], [image_url], [cloud_public_id], [is_primary], [is_active], [status]) VALUES (2, 1, N'https://res.cloudinary.com/dfvdvkssv/image/upload/v1779470298/room_types/qp2o5qg19efcie3klyp4.jpg', N'room_types/qp2o5qg19efcie3klyp4', 0, 1, N'ACTIVE')
INSERT [dbo].[Room_Images] ([id], [room_type_id], [image_url], [cloud_public_id], [is_primary], [is_active], [status]) VALUES (3, 1, N'https://res.cloudinary.com/dfvdvkssv/image/upload/v1779470300/room_types/e1g0kjotbpnpqxbfwtli.jpg', N'room_types/e1g0kjotbpnpqxbfwtli', 0, 1, N'ACTIVE')
INSERT [dbo].[Room_Images] ([id], [room_type_id], [image_url], [cloud_public_id], [is_primary], [is_active], [status]) VALUES (4, 2, N'https://res.cloudinary.com/dfvdvkssv/image/upload/v1779468592/room_types/g285leoszqnnnsdnbxym.jpg', N'room_types/g285leoszqnnnsdnbxym', 1, 1, N'ACTIVE')
INSERT [dbo].[Room_Images] ([id], [room_type_id], [image_url], [cloud_public_id], [is_primary], [is_active], [status]) VALUES (5, 2, N'https://res.cloudinary.com/dfvdvkssv/image/upload/v1779470301/room_types/dlwrhqrssrreqwfef7uj.jpg', N'room_types/dlwrhqrssrreqwfef7uj', 0, 1, N'ACTIVE')
INSERT [dbo].[Room_Images] ([id], [room_type_id], [image_url], [cloud_public_id], [is_primary], [is_active], [status]) VALUES (6, 2, N'https://res.cloudinary.com/dfvdvkssv/image/upload/v1779470302/room_types/uhlerkmabui7bdvta0tj.jpg', N'room_types/uhlerkmabui7bdvta0tj', 0, 1, N'ACTIVE')
INSERT [dbo].[Room_Images] ([id], [room_type_id], [image_url], [cloud_public_id], [is_primary], [is_active], [status]) VALUES (7, 3, N'https://res.cloudinary.com/dfvdvkssv/image/upload/v1779468595/room_types/rnvydzibrsrlfkqusk6q.jpg', N'room_types/rnvydzibrsrlfkqusk6q', 1, 1, N'ACTIVE')
INSERT [dbo].[Room_Images] ([id], [room_type_id], [image_url], [cloud_public_id], [is_primary], [is_active], [status]) VALUES (8, 3, N'https://res.cloudinary.com/dfvdvkssv/image/upload/v1779470304/room_types/forovskl6rusijfjtt37.jpg', N'room_types/forovskl6rusijfjtt37', 0, 1, N'ACTIVE')
INSERT [dbo].[Room_Images] ([id], [room_type_id], [image_url], [cloud_public_id], [is_primary], [is_active], [status]) VALUES (9, 3, N'https://res.cloudinary.com/dfvdvkssv/image/upload/v1779470305/room_types/lyqta8pbjewtldnxd8cn.jpg', N'room_types/lyqta8pbjewtldnxd8cn', 0, 1, N'ACTIVE')
INSERT [dbo].[Room_Images] ([id], [room_type_id], [image_url], [cloud_public_id], [is_primary], [is_active], [status]) VALUES (10, 4, N'https://res.cloudinary.com/dfvdvkssv/image/upload/v1779468598/room_types/tsyqa4a3iaoferlru3np.jpg', N'room_types/tsyqa4a3iaoferlru3np', 1, 1, N'ACTIVE')
INSERT [dbo].[Room_Images] ([id], [room_type_id], [image_url], [cloud_public_id], [is_primary], [is_active], [status]) VALUES (11, 4, N'https://res.cloudinary.com/dfvdvkssv/image/upload/v1779470306/room_types/jtl3kddbxr0rs5owaigu.jpg', N'room_types/jtl3kddbxr0rs5owaigu', 0, 1, N'ACTIVE')
INSERT [dbo].[Room_Images] ([id], [room_type_id], [image_url], [cloud_public_id], [is_primary], [is_active], [status]) VALUES (12, 4, N'https://res.cloudinary.com/dfvdvkssv/image/upload/v1779470308/room_types/p0yrfftf3dgumpwy0az0.jpg', N'room_types/p0yrfftf3dgumpwy0az0', 0, 1, N'ACTIVE')
INSERT [dbo].[Room_Images] ([id], [room_type_id], [image_url], [cloud_public_id], [is_primary], [is_active], [status]) VALUES (13, 5, N'https://res.cloudinary.com/dfvdvkssv/image/upload/v1779468601/room_types/yysc94x7eak2f216hy2t.jpg', N'room_types/yysc94x7eak2f216hy2t', 1, 1, N'ACTIVE')
INSERT [dbo].[Room_Images] ([id], [room_type_id], [image_url], [cloud_public_id], [is_primary], [is_active], [status]) VALUES (14, 5, N'https://res.cloudinary.com/dfvdvkssv/image/upload/v1779470309/room_types/urmf9gqe6pmrv7fcprfz.jpg', N'room_types/urmf9gqe6pmrv7fcprfz', 0, 1, N'ACTIVE')
INSERT [dbo].[Room_Images] ([id], [room_type_id], [image_url], [cloud_public_id], [is_primary], [is_active], [status]) VALUES (15, 5, N'https://res.cloudinary.com/dfvdvkssv/image/upload/v1779470311/room_types/g5xv7rru58vd0hngayuo.jpg', N'room_types/g5xv7rru58vd0hngayuo', 0, 1, N'ACTIVE')
INSERT [dbo].[Room_Images] ([id], [room_type_id], [image_url], [cloud_public_id], [is_primary], [is_active], [status]) VALUES (16, 6, N'https://res.cloudinary.com/dfvdvkssv/image/upload/v1779468610/room_types/nkbpmpefoaysu1ktiofx.jpg', N'room_types/nkbpmpefoaysu1ktiofx', 1, 1, N'ACTIVE')
INSERT [dbo].[Room_Images] ([id], [room_type_id], [image_url], [cloud_public_id], [is_primary], [is_active], [status]) VALUES (17, 6, N'https://res.cloudinary.com/dfvdvkssv/image/upload/v1779470312/room_types/p69bolw5q7xqlykzitmp.jpg', N'room_types/p69bolw5q7xqlykzitmp', 0, 1, N'ACTIVE')
INSERT [dbo].[Room_Images] ([id], [room_type_id], [image_url], [cloud_public_id], [is_primary], [is_active], [status]) VALUES (18, 6, N'https://res.cloudinary.com/dfvdvkssv/image/upload/v1779470314/room_types/fgdhzdfebvnp1kj9bdbr.jpg', N'room_types/fgdhzdfebvnp1kj9bdbr', 0, 1, N'ACTIVE')
INSERT [dbo].[Room_Images] ([id], [room_type_id], [image_url], [cloud_public_id], [is_primary], [is_active], [status]) VALUES (19, 7, N'https://res.cloudinary.com/dfvdvkssv/image/upload/v1779468614/room_types/yo6mxy2o6nirygibtrve.jpg', N'room_types/yo6mxy2o6nirygibtrve', 1, 1, N'ACTIVE')
INSERT [dbo].[Room_Images] ([id], [room_type_id], [image_url], [cloud_public_id], [is_primary], [is_active], [status]) VALUES (20, 7, N'https://res.cloudinary.com/dfvdvkssv/image/upload/v1779470315/room_types/ful4vl4jzjgzrzlc1bju.jpg', N'room_types/ful4vl4jzjgzrzlc1bju', 0, 1, N'ACTIVE')
INSERT [dbo].[Room_Images] ([id], [room_type_id], [image_url], [cloud_public_id], [is_primary], [is_active], [status]) VALUES (21, 7, N'https://res.cloudinary.com/dfvdvkssv/image/upload/v1779470317/room_types/bl9yo9v3f0mlhi9hdx8s.jpg', N'room_types/bl9yo9v3f0mlhi9hdx8s', 0, 1, N'ACTIVE')
INSERT [dbo].[Room_Images] ([id], [room_type_id], [image_url], [cloud_public_id], [is_primary], [is_active], [status]) VALUES (22, 8, N'https://res.cloudinary.com/dfvdvkssv/image/upload/v1779468617/room_types/pbtjsowernbpfz0iognd.jpg', N'room_types/pbtjsowernbpfz0iognd', 1, 1, N'ACTIVE')
INSERT [dbo].[Room_Images] ([id], [room_type_id], [image_url], [cloud_public_id], [is_primary], [is_active], [status]) VALUES (23, 8, N'https://res.cloudinary.com/dfvdvkssv/image/upload/v1779470319/room_types/abqehbmbb87vpz1z5eqx.jpg', N'room_types/abqehbmbb87vpz1z5eqx', 0, 1, N'ACTIVE')
INSERT [dbo].[Room_Images] ([id], [room_type_id], [image_url], [cloud_public_id], [is_primary], [is_active], [status]) VALUES (24, 8, N'https://res.cloudinary.com/dfvdvkssv/image/upload/v1779470320/room_types/xawjnvcipbeofoyyb6om.jpg', N'room_types/xawjnvcipbeofoyyb6om', 0, 1, N'ACTIVE')
INSERT [dbo].[Room_Images] ([id], [room_type_id], [image_url], [cloud_public_id], [is_primary], [is_active], [status]) VALUES (25, 9, N'https://res.cloudinary.com/dfvdvkssv/image/upload/v1779468620/room_types/go4bb3tfc3qioic3o8ne.jpg', N'room_types/go4bb3tfc3qioic3o8ne', 1, 1, N'ACTIVE')
INSERT [dbo].[Room_Images] ([id], [room_type_id], [image_url], [cloud_public_id], [is_primary], [is_active], [status]) VALUES (26, 9, N'https://res.cloudinary.com/dfvdvkssv/image/upload/v1779470322/room_types/m3bfyqnwu9czduksi9at.jpg', N'room_types/m3bfyqnwu9czduksi9at', 0, 1, N'ACTIVE')
INSERT [dbo].[Room_Images] ([id], [room_type_id], [image_url], [cloud_public_id], [is_primary], [is_active], [status]) VALUES (27, 9, N'https://res.cloudinary.com/dfvdvkssv/image/upload/v1779470323/room_types/sni4fa07ppwhk9lkb2m3.jpg', N'room_types/sni4fa07ppwhk9lkb2m3', 0, 1, N'ACTIVE')
INSERT [dbo].[Room_Images] ([id], [room_type_id], [image_url], [cloud_public_id], [is_primary], [is_active], [status]) VALUES (28, 10, N'https://res.cloudinary.com/dfvdvkssv/image/upload/v1779468629/room_types/uopt9uuyqk29xtsdiuq3.jpg', N'room_types/uopt9uuyqk29xtsdiuq3', 1, 1, N'ACTIVE')
INSERT [dbo].[Room_Images] ([id], [room_type_id], [image_url], [cloud_public_id], [is_primary], [is_active], [status]) VALUES (29, 10, N'https://res.cloudinary.com/dfvdvkssv/image/upload/v1779470324/room_types/n6lomnv5tlhrvl44prpv.jpg', N'room_types/n6lomnv5tlhrvl44prpv', 0, 1, N'ACTIVE')
INSERT [dbo].[Room_Images] ([id], [room_type_id], [image_url], [cloud_public_id], [is_primary], [is_active], [status]) VALUES (30, 10, N'https://res.cloudinary.com/dfvdvkssv/image/upload/v1779470327/room_types/nevne74br1knyn7g2mnp.jpg', N'room_types/nevne74br1knyn7g2mnp', 0, 1, N'ACTIVE')

SET IDENTITY_INSERT [dbo].[Room_Images] OFF
GO
SET IDENTITY_INSERT [dbo].[Room_Inventory] ON 

INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (83, 1, 1, CAST(8000000.00 AS Decimal(18, 2)), N'Treo tường', 0, N'Asset', 1)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (84, 1, 1, CAST(9000000.00 AS Decimal(18, 2)), N'Mới bảo dưỡng', 1, N'Asset', 2)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (85, 1, 1, CAST(15000000.00 AS Decimal(18, 2)), N'Không đệm', 0, N'Asset', 6)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (86, 1, 2, CAST(150000.00 AS Decimal(18, 2)), N'Gấp trên giường', 1, N'Asset', 11)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (87, 1, 2, CAST(15000.00 AS Decimal(18, 2)), N'Miễn phí hàng ngày', 1, N'Asset', 16)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (88, 1, 2, CAST(20000.00 AS Decimal(18, 2)), N'Trong Minibar', 1, N'Asset', 17)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (89, 2, 1, CAST(8000000.00 AS Decimal(18, 2)), N'Treo tường', 0, N'Asset', 1)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (90, 2, 1, CAST(9000000.00 AS Decimal(18, 2)), N'', 0, N'Asset', 2)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (91, 2, 2, CAST(7000000.00 AS Decimal(18, 2)), N'Phòng Twin', 0, N'Asset', 7)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (92, 2, 2, CAST(150000.00 AS Decimal(18, 2)), N'', 0, N'Asset', 11)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (93, 2, 2, CAST(15000.00 AS Decimal(18, 2)), N'Miễn phí hàng ngày', 0, N'Asset', 16)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (94, 2, 2, CAST(35000.00 AS Decimal(18, 2)), N'Trong Minibar', 0, N'Asset', 18)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (95, 14, 1, CAST(8000000.00 AS Decimal(18, 2)), N'Treo tường', 0, N'Asset', 1)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (96, 14, 1, CAST(9000000.00 AS Decimal(18, 2)), N'Mới bảo dưỡng', 1, N'Asset', 2)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (97, 14, 1, CAST(15000000.00 AS Decimal(18, 2)), N'Không đệm', 1, N'Asset', 6)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (98, 14, 2, CAST(150000.00 AS Decimal(18, 2)), N'Gấp trên giường', 1, N'Asset', 11)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (99, 14, 2, CAST(15000.00 AS Decimal(18, 2)), N'Miễn phí hàng ngày', 1, N'Asset', 16)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (100, 14, 2, CAST(20000.00 AS Decimal(18, 2)), N'Trong Minibar', 1, N'Asset', 17)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (101, 1, 1, CAST(30000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 20)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (102, 1, 1, CAST(350000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 5)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (103, 1, 1, CAST(1200000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 14)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (104, 1, 1, CAST(5000000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 8)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (105, 1, 1, CAST(7000000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 7)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (106, 1, 1, CAST(50000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 12)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (107, 1, 1, CAST(30000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 10)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (108, 1, 1, CAST(80000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 13)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (109, 1, 1, CAST(250000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 15)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (110, 1, 1, CAST(35000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 18)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (111, 1, 1, CAST(3000000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 3)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (112, 1, 1, CAST(600000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 4)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (113, 1, 1, CAST(25000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 19)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (114, 2, 1, CAST(8000000.00 AS Decimal(18, 2)), N'Treo tường', 1, N'Asset', 1)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (115, 2, 1, CAST(9000000.00 AS Decimal(18, 2)), N'Mới bảo dưỡng', 1, N'Asset', 2)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (116, 2, 2, CAST(150000.00 AS Decimal(18, 2)), N'Gấp trên giường', 1, N'Asset', 11)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (117, 2, 2, CAST(0.00 AS Decimal(18, 2)), N'Miễn phí hàng ngày', 1, N'Asset', 16)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (118, 2, 2, CAST(20000.00 AS Decimal(18, 2)), N'Trong Minibar', 1, N'Asset', 17)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (119, 2, 0, CAST(30000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 20)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (120, 2, 1, CAST(350000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 5)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (121, 2, 1, CAST(1200000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 14)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (122, 2, 1, CAST(5000000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 8)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (123, 2, 1, CAST(7000000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 7)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (124, 2, 1, CAST(50000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 12)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (125, 2, 1, CAST(30000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 10)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (126, 2, 1, CAST(80000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 13)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (127, 2, 1, CAST(250000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 15)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (128, 2, 1, CAST(35000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 18)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (129, 2, 1, CAST(3000000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 3)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (130, 2, 1, CAST(600000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 4)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (131, 2, 1, CAST(25000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 19)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (132, 13, 1, CAST(8000000.00 AS Decimal(18, 2)), N'Treo tường', 1, N'Asset', 1)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (133, 13, 1, CAST(9000000.00 AS Decimal(18, 2)), N'Mới bảo dưỡng', 1, N'Asset', 2)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (134, 13, 2, CAST(150000.00 AS Decimal(18, 2)), N'Gấp trên giường', 1, N'Asset', 11)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (135, 13, 2, CAST(15000.00 AS Decimal(18, 2)), N'Miễn phí hàng ngày', 1, N'Asset', 16)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (136, 13, 2, CAST(20000.00 AS Decimal(18, 2)), N'Trong Minibar', 1, N'Asset', 17)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (137, 13, 1, CAST(30000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 20)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (138, 13, 1, CAST(350000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 5)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (139, 13, 1, CAST(1200000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 14)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (140, 13, 1, CAST(5000000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 8)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (141, 13, 1, CAST(7000000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 7)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (142, 13, 1, CAST(50000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 12)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (143, 13, 1, CAST(30000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 10)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (144, 13, 1, CAST(80000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 13)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (145, 13, 1, CAST(250000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 15)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (146, 13, 1, CAST(35000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 18)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (147, 13, 1, CAST(3000000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 3)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (148, 13, 1, CAST(600000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 4)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (149, 13, 1, CAST(25000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 19)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (150, 3, 1, CAST(9000000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 2)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (151, 3, 1, CAST(15000000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 6)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (152, 3, 1, CAST(3000000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 3)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (153, 3, 1, CAST(20000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 17)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (154, 3, 1, CAST(600000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 4)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (155, 3, 1, CAST(35000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 18)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (156, 3, 1, CAST(30000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 10)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (157, 3, 1, CAST(250000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 15)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (158, 3, 1, CAST(80000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 13)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (159, 3, 1, CAST(30000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 20)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (160, 3, 1, CAST(15000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 16)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (161, 3, 1, CAST(350000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 5)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (162, 3, 1, CAST(8000000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 0, N'Asset', 1)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (163, 3, 1, CAST(5000000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 8)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (164, 3, 1, CAST(150000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 11)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (165, 3, 1, CAST(7000000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 7)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (166, 3, 1, CAST(1200000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 14)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (167, 3, 1, CAST(25000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 19)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (168, 3, 1, CAST(3000000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 9)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (169, 3, 1, CAST(50000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 12)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (170, 4, 1, CAST(9000000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 2)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (171, 4, 1, CAST(15000000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 6)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (172, 4, 1, CAST(3000000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 3)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (173, 4, 1, CAST(20000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 17)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (174, 4, 1, CAST(600000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 4)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (175, 4, 1, CAST(35000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 18)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (176, 4, 1, CAST(30000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 10)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (177, 4, 1, CAST(250000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 15)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (178, 4, 1, CAST(80000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 13)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (179, 4, 1, CAST(30000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 20)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (180, 4, 1, CAST(15000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 16)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (181, 4, 1, CAST(350000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 5)
GO
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (182, 4, 1, CAST(8000000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 1)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (183, 4, 1, CAST(5000000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 8)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (184, 4, 1, CAST(150000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 11)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (185, 4, 1, CAST(7000000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 7)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (186, 4, 1, CAST(1200000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 14)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (187, 4, 1, CAST(25000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 19)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (188, 4, 1, CAST(3000000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 9)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (189, 4, 1, CAST(50000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 12)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (190, 6, 1, CAST(8000000.00 AS Decimal(18, 2)), N'Treo tường', 1, N'Asset', 1)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (191, 6, 1, CAST(9000000.00 AS Decimal(18, 2)), N'Mới bảo dưỡng', 1, N'Asset', 2)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (192, 6, 2, CAST(150000.00 AS Decimal(18, 2)), N'Gấp trên giường', 1, N'Asset', 11)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (193, 6, 2, CAST(0.00 AS Decimal(18, 2)), N'Miễn phí hàng ngày', 1, N'Asset', 16)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (194, 6, 2, CAST(20000.00 AS Decimal(18, 2)), N'Trong Minibar', 1, N'Asset', 17)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (195, 6, 1, CAST(30000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 20)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (196, 6, 1, CAST(350000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 5)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (197, 6, 1, CAST(1200000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 14)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (198, 6, 1, CAST(5000000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 8)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (199, 6, 1, CAST(7000000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 7)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (200, 6, 1, CAST(50000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 12)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (201, 6, 1, CAST(30000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 10)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (202, 6, 1, CAST(80000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 13)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (203, 6, 1, CAST(250000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 15)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (204, 6, 1, CAST(35000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 18)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (205, 6, 1, CAST(3000000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 3)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (206, 6, 1, CAST(600000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 4)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (207, 6, 1, CAST(25000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 19)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (208, 1, 1, CAST(8000000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 1)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (209, 3, 1, CAST(17000000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 21)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (210, 15, 1, CAST(9000000.00 AS Decimal(18, 2)), N'Mới bảo dưỡng', 0, N'Asset', 2)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (211, 15, 2, CAST(150000.00 AS Decimal(18, 2)), N'Gấp trên giường', 0, N'Asset', 11)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (212, 15, 2, CAST(15000.00 AS Decimal(18, 2)), N'Miễn phí hàng ngày', 0, N'Asset', 16)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (213, 15, 2, CAST(20000.00 AS Decimal(18, 2)), N'Trong Minibar', 0, N'Asset', 17)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (214, 15, 1, CAST(30000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 0, N'Asset', 20)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (215, 15, 1, CAST(350000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 0, N'Asset', 5)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (216, 15, 1, CAST(1200000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 0, N'Asset', 14)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (217, 15, 1, CAST(5000000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 0, N'Asset', 8)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (218, 15, 1, CAST(7000000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 0, N'Asset', 7)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (219, 15, 1, CAST(50000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 0, N'Asset', 12)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (220, 15, 1, CAST(30000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 0, N'Asset', 10)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (221, 15, 1, CAST(80000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 0, N'Asset', 13)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (222, 15, 1, CAST(250000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 0, N'Asset', 15)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (223, 15, 1, CAST(35000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 0, N'Asset', 18)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (224, 15, 1, CAST(3000000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 0, N'Asset', 3)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (225, 15, 1, CAST(600000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 0, N'Asset', 4)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (226, 15, 1, CAST(25000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 0, N'Asset', 19)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (227, 15, 1, CAST(8000000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 0, N'Asset', 1)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (228, 15, 1, CAST(9000000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 2)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (229, 15, 1, CAST(15000000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 6)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (230, 15, 1, CAST(3000000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 3)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (231, 15, 1, CAST(20000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 17)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (232, 15, 1, CAST(600000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 4)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (233, 15, 1, CAST(35000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 18)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (234, 15, 1, CAST(30000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 10)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (235, 15, 1, CAST(250000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 15)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (236, 15, 1, CAST(80000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 13)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (237, 15, 1, CAST(30000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 20)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (238, 15, 1, CAST(15000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 16)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (239, 15, 1, CAST(350000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 5)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (240, 15, 1, CAST(8000000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 0, N'Asset', 1)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (241, 15, 1, CAST(5000000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 8)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (242, 15, 1, CAST(150000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 11)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (243, 15, 1, CAST(7000000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 7)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (244, 15, 1, CAST(1200000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 14)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (245, 15, 1, CAST(25000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 19)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (246, 15, 1, CAST(3000000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 9)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (247, 15, 1, CAST(50000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 12)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (248, 14, 1, CAST(8000000.00 AS Decimal(18, 2)), NULL, 1, N'Asset', 1)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (249, 14, 1, CAST(8000000.00 AS Decimal(18, 2)), NULL, 1, N'Asset', 1)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (250, 16, 1, CAST(9000000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 2)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (251, 16, 1, CAST(15000000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 6)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (252, 16, 1, CAST(3000000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 3)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (253, 16, 1, CAST(20000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 17)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (254, 16, 1, CAST(600000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 4)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (255, 16, 1, CAST(35000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 18)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (256, 16, 1, CAST(30000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 10)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (257, 16, 1, CAST(250000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 15)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (258, 16, 1, CAST(80000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 13)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (259, 16, 1, CAST(30000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 20)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (260, 16, 1, CAST(15000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 16)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (261, 16, 1, CAST(350000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 5)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (262, 16, 1, CAST(5000000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 8)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (263, 16, 1, CAST(150000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 11)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (264, 16, 1, CAST(7000000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 7)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (265, 16, 1, CAST(1200000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 14)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (266, 16, 1, CAST(25000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 19)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (267, 16, 1, CAST(3000000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 9)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (268, 16, 1, CAST(50000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 12)
INSERT [dbo].[Room_Inventory] ([id], [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [EquipmentId]) VALUES (269, 16, 1, CAST(17000000.00 AS Decimal(18, 2)), N'Đồng bộ từ kho', 1, N'Asset', 21)
SET IDENTITY_INSERT [dbo].[Room_Inventory] OFF
GO
SET IDENTITY_INSERT [dbo].[Room_Types] ON 

INSERT [dbo].[Room_Types] ([id], [name], [base_price], [capacity_adults], [capacity_children], [description], [size_sqm], [bed_type], [view_type], [is_active], [slug], [content]) VALUES (1, N'Phòng tiêu chuẩn 1 giường đơn', CAST(400000.00 AS Decimal(18, 2)), 1, 0, N'Phòng tiêu chuẩn 1 giường đơn', NULL, NULL, NULL, 1, N'phong-tieu-chuan-1-giuong-don', NULL)
INSERT [dbo].[Room_Types] ([id], [name], [base_price], [capacity_adults], [capacity_children], [description], [size_sqm], [bed_type], [view_type], [is_active], [slug], [content]) VALUES (2, N'Phòng tiêu chuẩn 1 giường đôi', CAST(500000.00 AS Decimal(18, 2)), 2, 1, N'Phòng tiêu chuẩn 1 giường đôi', NULL, NULL, NULL, 1, N'phong-tieu-chuan-1-giuong-doi', NULL)
INSERT [dbo].[Room_Types] ([id], [name], [base_price], [capacity_adults], [capacity_children], [description], [size_sqm], [bed_type], [view_type], [is_active], [slug], [content]) VALUES (3, N'Phòng cao cấp hướng phố', CAST(700000.00 AS Decimal(18, 2)), 2, 1, N'Phòng cao cấp hướng phố', NULL, NULL, NULL, 1, N'phong-cao-cap-huong-pho', NULL)
INSERT [dbo].[Room_Types] ([id], [name], [base_price], [capacity_adults], [capacity_children], [description], [size_sqm], [bed_type], [view_type], [is_active], [slug], [content]) VALUES (4, N'Phòng Deluxe hướng biển', CAST(900000.00 AS Decimal(18, 2)), 2, 2, N'Phòng Deluxe hướng biển', NULL, NULL, NULL, 1, N'phong-deluxe-huong-bien', NULL)
INSERT [dbo].[Room_Types] ([id], [name], [base_price], [capacity_adults], [capacity_children], [description], [size_sqm], [bed_type], [view_type], [is_active], [slug], [content]) VALUES (5, N'Phòng Premium tiện nghi cao cấp', CAST(1200000.00 AS Decimal(18, 2)), 2, 2, N'Phòng Premium tiện nghi cao cấp', NULL, NULL, NULL, 1, N'phong-premium-tien-nghi-cao-cap', NULL)
INSERT [dbo].[Room_Types] ([id], [name], [base_price], [capacity_adults], [capacity_children], [description], [size_sqm], [bed_type], [view_type], [is_active], [slug], [content]) VALUES (6, N'Phòng Suite cho gia đình', CAST(1500000.00 AS Decimal(18, 2)), 4, 2, N'Phòng Suite cho gia đình', NULL, NULL, NULL, 1, N'phong-suite-cho-gia-dinh', NULL)
INSERT [dbo].[Room_Types] ([id], [name], [base_price], [capacity_adults], [capacity_children], [description], [size_sqm], [bed_type], [view_type], [is_active], [slug], [content]) VALUES (7, N'Phòng Suite nhỏ nhắn sang trọng', CAST(1800000.00 AS Decimal(18, 2)), 2, 2, N'Phòng Suite nhỏ nhắn sang trọng', NULL, NULL, NULL, 1, N'phong-suite-nho-nhan-sang-trong', NULL)
INSERT [dbo].[Room_Types] ([id], [name], [base_price], [capacity_adults], [capacity_children], [description], [size_sqm], [bed_type], [view_type], [is_active], [slug], [content]) VALUES (8, N'Phòng Suite cho doanh nhân', CAST(2500000.00 AS Decimal(18, 2)), 2, 2, N'Phòng Suite cho doanh nhân', NULL, NULL, NULL, 1, N'phong-suite-cho-doanh-nhan', NULL)
INSERT [dbo].[Room_Types] ([id], [name], [base_price], [capacity_adults], [capacity_children], [description], [size_sqm], [bed_type], [view_type], [is_active], [slug], [content]) VALUES (9, N'Phòng Tổng thống', CAST(5000000.00 AS Decimal(18, 2)), 4, 2, N'Phòng Tổng thống', NULL, NULL, NULL, 1, N'phong-tong-thong', NULL)
INSERT [dbo].[Room_Types] ([id], [name], [base_price], [capacity_adults], [capacity_children], [description], [size_sqm], [bed_type], [view_type], [is_active], [slug], [content]) VALUES (10, N'Biệt thự hoàng gia nguyên căn', CAST(8000000.00 AS Decimal(18, 2)), 6, 4, N'Biệt thự hoàng gia nguyên căn', NULL, NULL, NULL, 1, NULL, NULL)
SET IDENTITY_INSERT [dbo].[Room_Types] OFF
GO
SET IDENTITY_INSERT [dbo].[Rooms] ON 

INSERT [dbo].[Rooms] ([id], [room_type_id], [room_number], [floor], [status], [cleaning_status], [extension_number]) VALUES (1, 1, N'101', 1, N'Available', N'Clean', NULL)
INSERT [dbo].[Rooms] ([id], [room_type_id], [room_number], [floor], [status], [cleaning_status], [extension_number]) VALUES (2, 1, N'102', 1, N'Occupied', N'Inspecting', NULL)
INSERT [dbo].[Rooms] ([id], [room_type_id], [room_number], [floor], [status], [cleaning_status], [extension_number]) VALUES (3, 3, N'201', 2, N'Available', N'Clean', NULL)
INSERT [dbo].[Rooms] ([id], [room_type_id], [room_number], [floor], [status], [cleaning_status], [extension_number]) VALUES (4, 4, N'202', 2, N'Available', N'Clean', NULL)
INSERT [dbo].[Rooms] ([id], [room_type_id], [room_number], [floor], [status], [cleaning_status], [extension_number]) VALUES (5, 5, N'301', 3, N'Available', N'Clean', NULL)
INSERT [dbo].[Rooms] ([id], [room_type_id], [room_number], [floor], [status], [cleaning_status], [extension_number]) VALUES (6, 6, N'302', 3, N'Available', N'Clean', NULL)
INSERT [dbo].[Rooms] ([id], [room_type_id], [room_number], [floor], [status], [cleaning_status], [extension_number]) VALUES (7, 7, N'401', 4, N'Available', N'Clean', NULL)
INSERT [dbo].[Rooms] ([id], [room_type_id], [room_number], [floor], [status], [cleaning_status], [extension_number]) VALUES (8, 8, N'402', 4, N'Available', N'Clean', NULL)
INSERT [dbo].[Rooms] ([id], [room_type_id], [room_number], [floor], [status], [cleaning_status], [extension_number]) VALUES (9, 9, N'501', 5, N'Available', N'Clean', NULL)
INSERT [dbo].[Rooms] ([id], [room_type_id], [room_number], [floor], [status], [cleaning_status], [extension_number]) VALUES (10, 10, N'VILLA-1', 1, N'Available', N'Clean', NULL)
INSERT [dbo].[Rooms] ([id], [room_type_id], [room_number], [floor], [status], [cleaning_status], [extension_number]) VALUES (13, 1, N'103', 1, N'Occupied', N'Inspecting', NULL)
INSERT [dbo].[Rooms] ([id], [room_type_id], [room_number], [floor], [status], [cleaning_status], [extension_number]) VALUES (14, 1, N'104', 1, N'Occupied', N'Inspecting', NULL)
INSERT [dbo].[Rooms] ([id], [room_type_id], [room_number], [floor], [status], [cleaning_status], [extension_number]) VALUES (15, 4, N'203', 2, N'Available', N'Clean', NULL)
INSERT [dbo].[Rooms] ([id], [room_type_id], [room_number], [floor], [status], [cleaning_status], [extension_number]) VALUES (16, 3, N'204', 2, N'Available', N'Clean', NULL)
SET IDENTITY_INSERT [dbo].[Rooms] OFF
GO
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (1, 1)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (1, 2)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (1, 3)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (2, 1)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (2, 2)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (3, 4)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (3, 5)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (4, 6)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (4, 7)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (5, 8)
GO
SET IDENTITY_INSERT [dbo].[Service_Categories] ON 

INSERT [dbo].[Service_Categories] ([id], [name]) VALUES (1, N'Nhà Hàng & Ẩm Thực')
INSERT [dbo].[Service_Categories] ([id], [name]) VALUES (2, N'Spa & Massage')
INSERT [dbo].[Service_Categories] ([id], [name]) VALUES (3, N'Di Chuyển & Đưa Đón')
INSERT [dbo].[Service_Categories] ([id], [name]) VALUES (4, N'Giặt Ủi')
INSERT [dbo].[Service_Categories] ([id], [name]) VALUES (5, N'Tour Du Lịch')
INSERT [dbo].[Service_Categories] ([id], [name]) VALUES (6, N'Phòng Gym & Yoga')
INSERT [dbo].[Service_Categories] ([id], [name]) VALUES (7, N'Hồ Bơi')
INSERT [dbo].[Service_Categories] ([id], [name]) VALUES (8, N'Tổ Chức Sự Kiện')
INSERT [dbo].[Service_Categories] ([id], [name]) VALUES (9, N'Khu Vui Chơi Trẻ Em')
INSERT [dbo].[Service_Categories] ([id], [name]) VALUES (10, N'Cửa Hàng Lưu Niệm')
SET IDENTITY_INSERT [dbo].[Service_Categories] OFF
GO
SET IDENTITY_INSERT [dbo].[Services] ON 

INSERT [dbo].[Services] ([id], [category_id], [name], [price], [unit]) VALUES (1, 1, N'Set Ăn Sáng Buffet', CAST(200000.00 AS Decimal(18, 2)), N'Người')
INSERT [dbo].[Services] ([id], [category_id], [name], [price], [unit]) VALUES (2, 1, N'Mì Ý Hải Sản', CAST(150000.00 AS Decimal(18, 2)), N'Phần')
INSERT [dbo].[Services] ([id], [category_id], [name], [price], [unit]) VALUES (3, 2, N'Massage Toàn Thân 60p', CAST(500000.00 AS Decimal(18, 2)), N'Lượt')
INSERT [dbo].[Services] ([id], [category_id], [name], [price], [unit]) VALUES (4, 2, N'Xông Hơi Thảo Dược', CAST(300000.00 AS Decimal(18, 2)), N'Lượt')
INSERT [dbo].[Services] ([id], [category_id], [name], [price], [unit]) VALUES (5, 3, N'Đưa Đón Sân Bay 4 Chỗ', CAST(350000.00 AS Decimal(18, 2)), N'Chuyến')
INSERT [dbo].[Services] ([id], [category_id], [name], [price], [unit]) VALUES (6, 3, N'Thuê Xe Máy Nửa Ngày', CAST(100000.00 AS Decimal(18, 2)), N'Chiếc')
INSERT [dbo].[Services] ([id], [category_id], [name], [price], [unit]) VALUES (7, 4, N'Giặt Khô Áo Vest', CAST(120000.00 AS Decimal(18, 2)), N'Cái')
INSERT [dbo].[Services] ([id], [category_id], [name], [price], [unit]) VALUES (8, 4, N'Giặt Sấy Tiêu Chuẩn', CAST(40000.00 AS Decimal(18, 2)), N'Kg')
INSERT [dbo].[Services] ([id], [category_id], [name], [price], [unit]) VALUES (9, 5, N'Tour Đảo Nửa Ngày', CAST(800000.00 AS Decimal(18, 2)), N'Người')
INSERT [dbo].[Services] ([id], [category_id], [name], [price], [unit]) VALUES (10, 10, N'Móc Khóa Kỷ Niệm', CAST(50000.00 AS Decimal(18, 2)), N'Cái')
SET IDENTITY_INSERT [dbo].[Services] OFF
GO

SET IDENTITY_INSERT [dbo].[Roles] ON 
INSERT [dbo].[Roles] ([id], [name], [description]) VALUES 
(1, N'Admin', N'Quản trị viên'), (2, N'Manager', N'Quản lý khách sạn'), (3, N'Receptionist', N'Lễ tân'), 
(4, N'Accountant', N'Kế toán'), (5, N'Housekeeping', N'Buồng phòng'), (6, N'Security', N'Bảo vệ'), 
(7, N'Chef', N'Đầu bếp'), (8, N'Waiter', N'Nhân viên phục vụ'), (9, N'IT Support', N'Kỹ thuật viên'), (10, N'Guest', N'Khách hàng'),
(11, N'WarehouseStaff', N'Nhân viên thủ kho')
SET IDENTITY_INSERT [dbo].[Roles] OFF
GO

-- Chèn danh sách 17 Quyền hạn
SET IDENTITY_INSERT [dbo].[Permissions] ON;
IF NOT EXISTS (SELECT 1 FROM [dbo].[Permissions] WHERE id = 1)
BEGIN
    INSERT [dbo].[Permissions] ([id], [name], [description]) VALUES 
    (1, N'VIEW_DASHBOARD', N'Xem bảng điều khiển tổng quan'),
    (2, N'MANAGE_USERS', N'Quản lý tài khoản người dùng'),
    (3, N'MANAGE_ROLES', N'Quản lý các vai trò phân quyền'),
    (4, N'MANAGE_ROOMS', N'Quản lý danh mục và phòng'),
    (5, N'MANAGE_BOOKINGS', N'Quản lý các đơn đặt phòng'),
    (6, N'MANAGE_INVOICES', N'Quản lý hóa đơn và thanh toán'),
    (7, N'MANAGE_SERVICES', N'Quản lý các dịch vụ đi kèm'),
    (8, N'VIEW_REPORTS', N'Xem các báo cáo thống kê'),
    (9, N'MANAGE_CONTENT', N'Quản lý bài viết và nội dung'),
    (10, N'MANAGE_INVENTORY', N'Quản lý kho và tài sản thiết bị'),
    (11, N'VIEW_SYSTEM_LOGS', N'Xem nhật ký hệ thống'),
    (12, N'VIEW_NOTIFICATIONS', N'Xem thông báo'),
    (13, N'VIEW_ROOMS', N'Xem trạng thái phòng'),
    (14, N'UPDATE_ROOM_STATUS', N'Cập nhật dọn phòng'),
    (15, N'CHECK_IN_OUT', N'Thủ tục nhận/trả phòng'),
    (16, N'MANAGE_AMENITIES', N'Quản lý tiện nghi'),
    (17, N'MANAGE_MAINTENANCE', N'Quản lý bảo trì');
END
SET IDENTITY_INSERT [dbo].[Permissions] OFF;
GO

-- Phân quyền cho các vai trò (Các role 6-10 hiện tại chưa có quyền admin dashboard, nếu cần bạn có thể thêm sau)
IF NOT EXISTS (SELECT 1 FROM [dbo].[Role_Permissions] WHERE role_id = 1)
BEGIN
    INSERT [dbo].[Role_Permissions] ([role_id], [permission_id]) VALUES 
    (1,1), (1,2), (1,3), (1,4), (1,5), (1,6), (1,7), (1,8), (1,9), (1,10), (1,11), (1,12), (1,13), (1,14), (1,15), (1,16), (1,17), -- Admin
    (2,1), (2,4), (2,5), (2,6), (2,7), (2,8), (2,10), (2,12), -- Manager
    (3,1), (3,4), (3,5), (3,6), (3,7), (3,12), -- Receptionist
    (4,1), (4,6), (4,8), (4,12), -- Accountant
    (5,4), (5,10), (5,12), -- Housekeeping
    (11,1), (11,10), (11,12); -- WarehouseStaff
END
GO

SET IDENTITY_INSERT [dbo].[Users] ON 

INSERT [dbo].[Users] ([id], [role_id], [membership_id], [full_name], [email], [phone], [password_hash], [status], [avatar_url], [created_at], [date_of_birth], [address]) VALUES (1, 1, NULL, N'Admin', N'admin@hotel.com', N'0589784564', N'$2a$11$Ps2lDwm2Ewmq8R7aWM4G3OAL.YeltOJLTideDnNcJXGbXDWB6zO2C', 1, N'https://res.cloudinary.com/dzfuzh2xg/image/upload/v1773398430/QuanTriKhachSan/Avatars/ufmestnrdxqu9ulbgkko.png', NULL, NULL, NULL)
INSERT [dbo].[Users] ([id], [role_id], [membership_id], [full_name], [email], [phone], [password_hash], [status], [avatar_url], [created_at], [date_of_birth], [address]) VALUES (2, 2, NULL, N'Trần Manager', N'manager@hotel.com', N'0900000002', N'hash2', 1, NULL, NULL, NULL, NULL)
INSERT [dbo].[Users] ([id], [role_id], [membership_id], [full_name], [email], [phone], [password_hash], [status], [avatar_url], [created_at], [date_of_birth], [address]) VALUES (3, 3, NULL, N'Lê Lễ Tân', N'reception1@hotel.com', N'0900000003', N'hash3', 1, NULL, NULL, NULL, NULL)
INSERT [dbo].[Users] ([id], [role_id], [membership_id], [full_name], [email], [phone], [password_hash], [status], [avatar_url], [created_at], [date_of_birth], [address]) VALUES (4, 4, NULL, N'Phạm Lễ Tân', N'reception2@hotel.com', N'0900000004', N'hash4', 1, NULL, NULL, NULL, NULL)
INSERT [dbo].[Users] ([id], [role_id], [membership_id], [full_name], [email], [phone], [password_hash], [status], [avatar_url], [created_at], [date_of_birth], [address]) VALUES (5, 4, NULL, N'Hoàng Kế Toán', N'accountant@hotel.com', N'0900000005', N'hash5', 1, NULL, NULL, NULL, NULL)
INSERT [dbo].[Users] ([id], [role_id], [membership_id], [full_name], [email], [phone], [password_hash], [status], [avatar_url], [created_at], [date_of_birth], [address]) VALUES (6, 4, 1, N'Khách Hàng A', N'guestA@gmail.com', N'0900000006', N'hash6', 1, NULL, NULL, NULL, NULL)
INSERT [dbo].[Users] ([id], [role_id], [membership_id], [full_name], [email], [phone], [password_hash], [status], [avatar_url], [created_at], [date_of_birth], [address]) VALUES (7, 10, 2, N'Khách Hàng B', N'guestB@gmail.com', N'0900000007', N'hash7', 1, NULL, NULL, NULL, NULL)
INSERT [dbo].[Users] ([id], [role_id], [membership_id], [full_name], [email], [phone], [password_hash], [status], [avatar_url], [created_at], [date_of_birth], [address]) VALUES (8, 10, 3, N'Khách Hàng C', N'guestC@gmail.com', N'0900000008', N'hash8', 1, NULL, NULL, NULL, NULL)
INSERT [dbo].[Users] ([id], [role_id], [membership_id], [full_name], [email], [phone], [password_hash], [status], [avatar_url], [created_at], [date_of_birth], [address]) VALUES (9, 10, 4, N'Khách Hàng D', N'guestD@gmail.com', N'0900000009', N'hash9', 1, NULL, NULL, NULL, NULL)
INSERT [dbo].[Users] ([id], [role_id], [membership_id], [full_name], [email], [phone], [password_hash], [status], [avatar_url], [created_at], [date_of_birth], [address]) VALUES (10, 10, 5, N'Khách Hàng E', N'guestE@gmail.com', N'0900000010', N'hash10', 1, NULL, NULL, NULL, NULL)
INSERT [dbo].[Users] ([id], [role_id], [membership_id], [full_name], [email], [phone], [password_hash], [status], [avatar_url], [created_at], [date_of_birth], [address]) VALUES (11, 2, NULL, N'Lê Mạnh Hùng', N'hunglm@vaa.edu.vn', N'0123672890', N'$2a$11$Wl2Q.mU9p319OyPPEpztTeFSuZznXYyjFEGoW1ZBKvMWbmPtV3RXW', 1, N'https://res.cloudinary.com/dzfuzh2xg/image/upload/v1773974558/QuanTriKhachSan/Avatars/m94gqu4x7mx6jkoo1iis.jpg', CAST(N'2026-03-20T01:46:38.153' AS DateTime), CAST(N'2026-04-03' AS Date), NULL)
INSERT [dbo].[Users] ([id], [role_id], [membership_id], [full_name], [email], [phone], [password_hash], [status], [avatar_url], [created_at], [date_of_birth], [address]) VALUES (13, 3, NULL, N'Hùng Lê Mạnh 2', N'manhung08062@gmail.com', N'02323453454', N'$2a$11$GH6uRTL8Gzzycgfk18GQzuoElmtrFXWOR3AlAC9h.XXR1gk5gRXUu', 1, NULL, CAST(N'2026-03-20T07:07:59.807' AS DateTime), NULL, NULL)
INSERT [dbo].[Users] ([id], [role_id], [membership_id], [full_name], [email], [phone], [password_hash], [status], [avatar_url], [created_at], [date_of_birth], [address]) VALUES (14, 5, NULL, N'Trần Đại Nguyên', N'dainguyen1254@gmail.com', N'02343667263', N'$2a$11$zBce/0Lfo/cm/.1m3Nglieuj0kb9yWsMByKIXiBQELxUGutr5k0zS', 1, NULL, CAST(N'2026-03-21T01:57:00.337' AS DateTime), NULL, NULL)
INSERT [dbo].[Users] ([id], [role_id], [membership_id], [full_name], [email], [phone], [password_hash], [status], [avatar_url], [created_at], [date_of_birth], [address]) VALUES (15, 4, NULL, N'Nguyễn Bình An', N'nguyenbinhan2707@gmail.com', N'0589784564', N'$2a$11$gI69kqhBEAYBzcWPxglrj..uv7MwDAIgU/CvyjsjARrkU2Aw/YCBS', 1, NULL, CAST(N'2026-03-21T06:33:09.247' AS DateTime), NULL, NULL)
INSERT [dbo].[Users] ([id], [role_id], [membership_id], [full_name], [email], [phone], [password_hash], [status], [avatar_url], [created_at], [date_of_birth], [address]) VALUES (16, 1, NULL, N'ADMIN', N'ADMIN', N'0589784564', N'$2a$12$GfRSOCRq1reANysT6QfMAOVlWmE7SRkVr9xjn2tjOmT0f/Qmx.Q0u', 1, NULL, CAST(N'2026-03-21T06:33:09.247' AS DateTime), NULL, NULL)
INSERT [dbo].[Users] ([id], [role_id], [membership_id], [full_name], [email], [phone], [password_hash], [status], [avatar_url], [created_at], [date_of_birth], [address]) VALUES (17, 1, NULL, N'ADMIN', N'ADMIN2', N'0589783464', N'$2a$12$GfRSOCRq1reANysT6QfMAOVlWmE7SRkVr9xjn2tjOmT0f/Qmx.Q0u', 1, NULL, CAST(N'2026-03-21T06:33:09.247' AS DateTime), NULL, NULL)
SET IDENTITY_INSERT [dbo].[Users] OFF
GO
SET IDENTITY_INSERT [dbo].[Vouchers] ON 

INSERT [dbo].[Vouchers] ([id], [code], [discount_type], [discount_value], [min_booking_value], [valid_from], [valid_to], [usage_limit]) VALUES (1, N'KM1', N'PERCENT', CAST(10.00 AS Decimal(18, 2)), CAST(500000.00 AS Decimal(18, 2)), CAST(N'2025-01-01T00:00:00.000' AS DateTime), CAST(N'2026-12-31T00:00:00.000' AS DateTime), 100)
INSERT [dbo].[Vouchers] ([id], [code], [discount_type], [discount_value], [min_booking_value], [valid_from], [valid_to], [usage_limit]) VALUES (2, N'KM2', N'FIXED_AMOUNT', CAST(100000.00 AS Decimal(18, 2)), CAST(1000000.00 AS Decimal(18, 2)), CAST(N'2025-01-01T00:00:00.000' AS DateTime), CAST(N'2026-12-31T00:00:00.000' AS DateTime), 50)
INSERT [dbo].[Vouchers] ([id], [code], [discount_type], [discount_value], [min_booking_value], [valid_from], [valid_to], [usage_limit]) VALUES (3, N'KM3', N'PERCENT', CAST(15.00 AS Decimal(18, 2)), CAST(2000000.00 AS Decimal(18, 2)), CAST(N'2025-01-01T00:00:00.000' AS DateTime), CAST(N'2026-12-31T00:00:00.000' AS DateTime), 30)
INSERT [dbo].[Vouchers] ([id], [code], [discount_type], [discount_value], [min_booking_value], [valid_from], [valid_to], [usage_limit]) VALUES (4, N'KM4', N'FIXED_AMOUNT', CAST(200000.00 AS Decimal(18, 2)), CAST(1500000.00 AS Decimal(18, 2)), CAST(N'2025-01-01T00:00:00.000' AS DateTime), CAST(N'2026-12-31T00:00:00.000' AS DateTime), 50)
INSERT [dbo].[Vouchers] ([id], [code], [discount_type], [discount_value], [min_booking_value], [valid_from], [valid_to], [usage_limit]) VALUES (5, N'KM5', N'PERCENT', CAST(20.00 AS Decimal(18, 2)), CAST(3000000.00 AS Decimal(18, 2)), CAST(N'2025-01-01T00:00:00.000' AS DateTime), CAST(N'2026-12-31T00:00:00.000' AS DateTime), 20)
INSERT [dbo].[Vouchers] ([id], [code], [discount_type], [discount_value], [min_booking_value], [valid_from], [valid_to], [usage_limit]) VALUES (6, N'KM6', N'FIXED_AMOUNT', CAST(50000.00 AS Decimal(18, 2)), CAST(0.00 AS Decimal(18, 2)), CAST(N'2025-01-01T00:00:00.000' AS DateTime), CAST(N'2026-12-31T00:00:00.000' AS DateTime), 200)
INSERT [dbo].[Vouchers] ([id], [code], [discount_type], [discount_value], [min_booking_value], [valid_from], [valid_to], [usage_limit]) VALUES (7, N'KM7', N'PERCENT', CAST(5.00 AS Decimal(18, 2)), CAST(0.00 AS Decimal(18, 2)), CAST(N'2025-01-01T00:00:00.000' AS DateTime), CAST(N'2026-12-31T00:00:00.000' AS DateTime), 500)
INSERT [dbo].[Vouchers] ([id], [code], [discount_type], [discount_value], [min_booking_value], [valid_from], [valid_to], [usage_limit]) VALUES (8, N'KM8', N'FIXED_AMOUNT', CAST(500000.00 AS Decimal(18, 2)), CAST(5000000.00 AS Decimal(18, 2)), CAST(N'2025-01-01T00:00:00.000' AS DateTime), CAST(N'2026-12-31T00:00:00.000' AS DateTime), 10)
INSERT [dbo].[Vouchers] ([id], [code], [discount_type], [discount_value], [min_booking_value], [valid_from], [valid_to], [usage_limit]) VALUES (9, N'KM9', N'PERCENT', CAST(25.00 AS Decimal(18, 2)), CAST(10000000.00 AS Decimal(18, 2)), CAST(N'2025-01-01T00:00:00.000' AS DateTime), CAST(N'2026-12-31T00:00:00.000' AS DateTime), 5)
INSERT [dbo].[Vouchers] ([id], [code], [discount_type], [discount_value], [min_booking_value], [valid_from], [valid_to], [usage_limit]) VALUES (10, N'KM10', N'FIXED_AMOUNT', CAST(1000000.00 AS Decimal(18, 2)), CAST(20000000.00 AS Decimal(18, 2)), CAST(N'2025-01-01T00:00:00.000' AS DateTime), CAST(N'2026-12-31T00:00:00.000' AS DateTime), 2)
SET IDENTITY_INSERT [dbo].[Vouchers] OFF
GO


-- ========================================================================
-- 2. CẬP NHẬT DỮ LIỆU MẪU & PHÂN QUYỀN TỰ ĐỘNG (Dựa trên code bạn cung cấp)
-- ========================================================================
GO
-- Cập nhật Password (Mã hóa Bcrypt) cho các tài khoản mẫu
UPDATE [dbo].[Users] 
SET [password_hash] = N'$2y$10$wN7KjZt59g0xK5A03v0s/eTq8P9g9B1N0jU3zR5M5N0x3B8b6Q1Oa' 
WHERE [email] IN (
    'admin@hotel.com', 'manager@hotel.com', 'reception1@hotel.com', 
    'reception2@hotel.com', 'accountant@hotel.com', 'guestA@gmail.com', 
    'guestB@gmail.com', 'guestC@gmail.com', 'guestD@gmail.com', 'guestE@gmail.com'
);

-- Cập nhật mô tả (description) cho các quyền
UPDATE [dbo].[Permissions] SET [description] = N'Xem bảng điều khiển tổng quan' WHERE [name] = 'VIEW_DASHBOARD';
UPDATE [dbo].[Permissions] SET [description] = N'Quản lý tài khoản người dùng' WHERE [name] = 'MANAGE_USERS';
UPDATE [dbo].[Permissions] SET [description] = N'Quản lý các vai trò phân quyền' WHERE [name] = 'MANAGE_ROLES';
UPDATE [dbo].[Permissions] SET [description] = N'Quản lý danh mục và phòng' WHERE [name] = 'MANAGE_ROOMS';
UPDATE [dbo].[Permissions] SET [description] = N'Quản lý các đơn đặt phòng' WHERE [name] = 'MANAGE_BOOKINGS';
UPDATE [dbo].[Permissions] SET [description] = N'Quản lý hóa đơn và thanh toán' WHERE [name] = 'MANAGE_INVOICES';
UPDATE [dbo].[Permissions] SET [description] = N'Quản lý các dịch vụ đi kèm' WHERE [name] = 'MANAGE_SERVICES';
UPDATE [dbo].[Permissions] SET [description] = N'Xem các báo cáo thống kê' WHERE [name] = 'VIEW_REPORTS';
UPDATE [dbo].[Permissions] SET [description] = N'Quản lý bài viết và nội dung' WHERE [name] = 'MANAGE_CONTENT';
UPDATE [dbo].[Permissions] SET [description] = N'Quản lý kho và tài sản thiết bị' WHERE [name] = 'MANAGE_INVENTORY';
GO

-- ========================================================================
-- 3. THIẾT LẬP TOÀN BỘ KHÓA NGOẠI (FOREIGN KEYS)
-- ========================================================================
ALTER TABLE [dbo].[Articles] WITH CHECK ADD FOREIGN KEY([author_id]) REFERENCES [dbo].[Users] ([id]);
ALTER TABLE [dbo].[Articles] WITH CHECK ADD FOREIGN KEY([category_id]) REFERENCES [dbo].[Article_Categories] ([id]);

ALTER TABLE [dbo].[Audit_Logs] WITH CHECK ADD CONSTRAINT [FK_AuditLogs_Users] FOREIGN KEY([user_id]) REFERENCES [dbo].[Users] ([id]);

ALTER TABLE [dbo].[Booking_Details] WITH CHECK ADD FOREIGN KEY([booking_id]) REFERENCES [dbo].[Bookings] ([id]);
ALTER TABLE [dbo].[Booking_Details] WITH CHECK ADD FOREIGN KEY([room_id]) REFERENCES [dbo].[Rooms] ([id]);
ALTER TABLE [dbo].[Booking_Details] WITH CHECK ADD FOREIGN KEY([room_type_id]) REFERENCES [dbo].[Room_Types] ([id]);

ALTER TABLE [dbo].[Bookings] WITH CHECK ADD FOREIGN KEY([user_id]) REFERENCES [dbo].[Users] ([id]);
ALTER TABLE [dbo].[Bookings] WITH CHECK ADD FOREIGN KEY([voucher_id]) REFERENCES [dbo].[Vouchers] ([id]);

ALTER TABLE [dbo].[Invoices] WITH CHECK ADD FOREIGN KEY([booking_id]) REFERENCES [dbo].[Bookings] ([id]);

ALTER TABLE [dbo].[Loss_And_Damages] WITH CHECK ADD FOREIGN KEY([booking_detail_id]) REFERENCES [dbo].[Booking_Details] ([id]);
ALTER TABLE [dbo].[Loss_And_Damages] WITH CHECK ADD FOREIGN KEY([room_inventory_id]) REFERENCES [dbo].[Room_Inventory] ([id]);

ALTER TABLE [dbo].[Notifications] WITH CHECK ADD CONSTRAINT [FK_Notifications_Users] FOREIGN KEY([user_id]) REFERENCES [dbo].[Users] ([id]);

ALTER TABLE [dbo].[Order_Service_Details] WITH CHECK ADD FOREIGN KEY([order_service_id]) REFERENCES [dbo].[Order_Services] ([id]);
ALTER TABLE [dbo].[Order_Service_Details] WITH CHECK ADD FOREIGN KEY([service_id]) REFERENCES [dbo].[Services] ([id]);

ALTER TABLE [dbo].[Order_Services] WITH CHECK ADD FOREIGN KEY([booking_detail_id]) REFERENCES [dbo].[Booking_Details] ([id]);

ALTER TABLE [dbo].[Payments] WITH CHECK ADD FOREIGN KEY([invoice_id]) REFERENCES [dbo].[Invoices] ([id]);

ALTER TABLE [dbo].[Refresh_Tokens] WITH CHECK ADD CONSTRAINT [FK_RefreshTokens_Users] FOREIGN KEY([user_id]) REFERENCES [dbo].[Users] ([id]);

ALTER TABLE [dbo].[Reviews] WITH CHECK ADD FOREIGN KEY([room_type_id]) REFERENCES [dbo].[Room_Types] ([id]);
ALTER TABLE [dbo].[Reviews] WITH CHECK ADD FOREIGN KEY([user_id]) REFERENCES [dbo].[Users] ([id]);

ALTER TABLE [dbo].[Role_Permissions] WITH CHECK ADD FOREIGN KEY([permission_id]) REFERENCES [dbo].[Permissions] ([id]);
ALTER TABLE [dbo].[Role_Permissions] WITH CHECK ADD FOREIGN KEY([role_id]) REFERENCES [dbo].[Roles] ([id]);

ALTER TABLE [dbo].[Room_Images] WITH CHECK ADD FOREIGN KEY([room_type_id]) REFERENCES [dbo].[Room_Types] ([id]);

ALTER TABLE [dbo].[Room_Inventory] WITH CHECK ADD CONSTRAINT [FK_RoomInventory_Rooms] FOREIGN KEY([room_id]) REFERENCES [dbo].[Rooms] ([id]);
ALTER TABLE [dbo].[Room_Inventory] WITH CHECK ADD CONSTRAINT [FK_RoomInventory_Equipments] FOREIGN KEY([EquipmentId]) REFERENCES [dbo].[Equipments] ([Id]);

ALTER TABLE [dbo].[Rooms] WITH CHECK ADD FOREIGN KEY([room_type_id]) REFERENCES [dbo].[Room_Types] ([id]);

ALTER TABLE [dbo].[RoomType_Amenities] WITH CHECK ADD FOREIGN KEY([amenity_id]) REFERENCES [dbo].[Amenities] ([id]);
ALTER TABLE [dbo].[RoomType_Amenities] WITH CHECK ADD FOREIGN KEY([room_type_id]) REFERENCES [dbo].[Room_Types] ([id]);

ALTER TABLE [dbo].[Services] WITH CHECK ADD FOREIGN KEY([category_id]) REFERENCES [dbo].[Service_Categories] ([id]);

ALTER TABLE [dbo].[User_Permissions] WITH CHECK ADD CONSTRAINT [FK_UserPermissions_Users] FOREIGN KEY([user_id]) REFERENCES [dbo].[Users] ([id]);
ALTER TABLE [dbo].[User_Permissions] WITH CHECK ADD CONSTRAINT [FK_UserPermissions_Permissions] FOREIGN KEY([permission_id]) REFERENCES [dbo].[Permissions] ([id]);

ALTER TABLE [dbo].[Users] WITH CHECK ADD FOREIGN KEY([membership_id]) REFERENCES [dbo].[Memberships] ([id]);
ALTER TABLE [dbo].[Users] WITH CHECK ADD FOREIGN KEY([role_id]) REFERENCES [dbo].[Roles] ([id]);
GO

-- ========================================================================
-- 4. BẬT LẠI KIỂM TRA KHÓA NGOẠI VÀ HOÀN TẤT
-- ========================================================================
EXEC sp_msforeachtable 'ALTER TABLE ? CHECK CONSTRAINT ALL';
GO

-- ========================================================================
-- 5. TINH CHỈNH CÁC DỮ LIỆU Ở ĐÂY
-- ========================================================================

-- 1. Quét sạch các ô trống của dữ liệu cũ và lấp đầy bằng ngày giờ hiện tại
UPDATE Users SET created_at = GETDATE() WHERE created_at IS NULL;
UPDATE Users SET updated_at = GETDATE() WHERE updated_at IS NULL;
UPDATE Users SET last_login_at = GETDATE() WHERE last_login_at IS NULL;

UPDATE Roles SET created_at = GETDATE() WHERE created_at IS NULL;
UPDATE Roles SET updated_at = GETDATE() WHERE updated_at IS NULL;

-- 2. Đặt "Chế độ tự động" (Default Constraint) cho tương lai
-- Từ nay về sau, nếu C# hoặc ai đó thêm User/Role mới mà quên nhập ngày tháng, 
-- SQL sẽ tự động lấy giờ hệ thống điền vào, tuyệt đối không bao giờ bị NULL nữa.
-- (Đã có sẵn trong CREATE TABLE nên ta bỏ qua lệnh ADD CONSTRAINT cho created_at)
-- ALTER TABLE Users ADD CONSTRAINT DF_Users_CreatedAt DEFAULT GETDATE() FOR created_at;
ALTER TABLE Users ADD CONSTRAINT DF_Users_UpdatedAt DEFAULT GETDATE() FOR updated_at;

-- ALTER TABLE Roles ADD CONSTRAINT DF_Roles_CreatedAt DEFAULT GETDATE() FOR created_at;
ALTER TABLE Roles ADD CONSTRAINT DF_Roles_UpdatedAt DEFAULT GETDATE() FOR updated_at;

-- ========================================================================
-- 6. BỔ SUNG QUYỀN ÉP HỦY BOOKING CHO ADMIN & MANAGER
-- ========================================================================
GO

-- 1. Thêm quyền FORCE_CANCEL_BOOKINGS vào bảng Permissions (nếu chưa có)
IF NOT EXISTS (SELECT 1 FROM [dbo].[Permissions] WHERE [name] = 'FORCE_CANCEL_BOOKINGS')
BEGIN
    INSERT INTO [dbo].[Permissions] ([name], [description], [group_name])
    VALUES (
        'FORCE_CANCEL_BOOKINGS', 
        N'Ép hủy Đặt phòng (Chỉ dành cho cấp Quản lý)', 
        N'Quản lý Đặt phòng & Tài chính'
    );
    PRINT N'Đã thêm quyền FORCE_CANCEL_BOOKINGS thành công!';
END
GO

-- 2. Cấp quyền này cho Role Admin (role_id = 1) và Manager (role_id = 2)
DECLARE @ForceCancelPermId INT = (SELECT [id] FROM [dbo].[Permissions] WHERE [name] = 'FORCE_CANCEL_BOOKINGS');

IF @ForceCancelPermId IS NOT NULL
BEGIN
    -- Cấp cho Admin
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Role_Permissions] WHERE [role_id] = 1 AND [permission_id] = @ForceCancelPermId)
    BEGIN
        INSERT INTO [dbo].[Role_Permissions] ([role_id], [permission_id]) VALUES (1, @ForceCancelPermId);
    END

    -- Cấp cho Manager
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Role_Permissions] WHERE [role_id] = 2 AND [permission_id] = @ForceCancelPermId)
    BEGIN
        INSERT INTO [dbo].[Role_Permissions] ([role_id], [permission_id]) VALUES (2, @ForceCancelPermId);
    END

    PRINT N'Đã cấp quyền ép hủy cho Admin và Manager thành công!';
END
GO

/* ========================================================================
   GÓI PATCH BỔ SUNG (GỘP CODE CỦA DU & LONG) 
   - Đảm bảo an toàn (không lỗi khi chạy nhiều lần)
   - Khớp 100% với file Model C# (Dùng DATETIME2, GETUTCDATE, NVARCHAR 100)
   - Kèm Trigger tự động tính toán Invoice
   ======================================================================== */

/* =========================================================
   1. PATCH Booking_Details
   ========================================================= */
IF COL_LENGTH('dbo.Booking_Details', 'identity_document_public_id') IS NULL
BEGIN
    ALTER TABLE dbo.Booking_Details
    ADD identity_document_public_id NVARCHAR(255) NULL;
END
GO

/* =========================================================
   2. PATCH Order_Services
   ========================================================= */
IF COL_LENGTH('dbo.Order_Services', 'order_code') IS NULL
BEGIN
    ALTER TABLE dbo.Order_Services
    ADD order_code NVARCHAR(50) NULL;
END
GO

IF COL_LENGTH('dbo.Order_Services', 'notes') IS NULL
BEGIN
    ALTER TABLE dbo.Order_Services
    ADD notes NVARCHAR(1000) NULL;
END
GO

IF COL_LENGTH('dbo.Order_Services', 'created_at') IS NULL
BEGIN
    ALTER TABLE dbo.Order_Services
    ADD created_at DATETIME2 NULL;
END
GO

IF COL_LENGTH('dbo.Order_Services', 'updated_at') IS NULL
BEGIN
    ALTER TABLE dbo.Order_Services
    ADD updated_at DATETIME2 NULL;
END
GO

UPDATE dbo.Order_Services
SET
    order_code = ISNULL(order_code, CONCAT('OS-', RIGHT('000000' + CAST(id AS VARCHAR(6)), 6))),
    created_at = ISNULL(created_at, GETUTCDATE())
WHERE order_code IS NULL
   OR created_at IS NULL;
GO

BEGIN TRY
    ALTER TABLE dbo.Order_Services
    ALTER COLUMN order_code NVARCHAR(50) NOT NULL;
END TRY
BEGIN CATCH
    -- Column already NOT NULL or error during alteration
END CATCH
GO

BEGIN TRY
    ALTER TABLE dbo.Order_Services
    ALTER COLUMN created_at DATETIME2 NOT NULL;
END TRY
BEGIN CATCH
    -- Column already NOT NULL or error during alteration
END CATCH
GO

/* =========================================================
   3. PATCH Order_Service_Details
   ========================================================= */
IF COL_LENGTH('dbo.Order_Service_Details', 'line_total') IS NULL
BEGIN
    ALTER TABLE dbo.Order_Service_Details
    ADD line_total DECIMAL(18,2) NOT NULL CONSTRAINT DF_OrderServiceDetails_LineTotal DEFAULT 0;
END
GO

IF COL_LENGTH('dbo.Order_Service_Details', 'notes') IS NULL
BEGIN
    ALTER TABLE dbo.Order_Service_Details
    ADD notes NVARCHAR(500) NULL;
END
GO

IF COL_LENGTH('dbo.Order_Service_Details', 'status') IS NULL
BEGIN
    ALTER TABLE dbo.Order_Service_Details
    ADD status NVARCHAR(20) NOT NULL CONSTRAINT DF_OrderServiceDetails_Status DEFAULT 'Active';
END
GO

UPDATE dbo.Order_Service_Details
SET line_total = CASE
                    WHEN ISNULL(line_total, 0) > 0 THEN line_total
                    ELSE ISNULL(quantity, 0) * ISNULL(unit_price, 0)
                 END;
GO

/* =========================================================
   4. PATCH Invoices (ĐÃ GỘP CHUẨN MODEL CỦA DU)
   ========================================================= */
IF COL_LENGTH('dbo.Invoices', 'invoice_code') IS NULL
BEGIN
    ALTER TABLE dbo.Invoices
    ADD invoice_code NVARCHAR(100) NULL; -- Kích thước theo yêu cầu của Du
END
GO

IF COL_LENGTH('dbo.Invoices', 'total_damage_amount') IS NULL
BEGIN
    ALTER TABLE dbo.Invoices
    ADD total_damage_amount DECIMAL(18,2) NOT NULL CONSTRAINT DF_Invoices_TotalDamageAmount DEFAULT 0;
END
GO

IF COL_LENGTH('dbo.Invoices', 'manual_adjustment_amount') IS NULL
BEGIN
    ALTER TABLE dbo.Invoices
    ADD manual_adjustment_amount DECIMAL(18,2) NOT NULL CONSTRAINT DF_Invoices_ManualAdjustmentAmount DEFAULT 0;
END
GO

IF COL_LENGTH('dbo.Invoices', 'refund_amount') IS NULL
BEGIN
    ALTER TABLE dbo.Invoices
    ADD refund_amount DECIMAL(18,2) NOT NULL CONSTRAINT DF_Invoices_RefundAmount DEFAULT 0;
END
GO

IF COL_LENGTH('dbo.Invoices', 'notes') IS NULL
BEGIN
    ALTER TABLE dbo.Invoices
    ADD notes NVARCHAR(1000) NULL;
END
GO

IF COL_LENGTH('dbo.Invoices', 'issued_at') IS NULL
BEGIN
    ALTER TABLE dbo.Invoices
    ADD issued_at DATETIME2 NULL; -- Kiểu DATETIME2 của Du
END
GO

IF COL_LENGTH('dbo.Invoices', 'paid_at') IS NULL
BEGIN
    ALTER TABLE dbo.Invoices
    ADD paid_at DATETIME2 NULL; -- Kiểu DATETIME2 của Du
END
GO

IF COL_LENGTH('dbo.Invoices', 'created_at') IS NULL
BEGIN
    ALTER TABLE dbo.Invoices
    ADD created_at DATETIME2 CONSTRAINT DF_Invoices_CreatedAt DEFAULT GETUTCDATE(); -- Của Du
END
GO

IF COL_LENGTH('dbo.Invoices', 'updated_at') IS NULL
BEGIN
    ALTER TABLE dbo.Invoices
    ADD updated_at DATETIME2 NULL; -- Kiểu DATETIME2 của Du
END
GO

UPDATE inv
SET
    invoice_code = ISNULL(inv.invoice_code, CONCAT('INV-', UPPER(ISNULL(b.booking_code, CONCAT('BOOKING-', inv.booking_id))))),
    total_room_amount = ISNULL(inv.total_room_amount, 0),
    total_service_amount = ISNULL(inv.total_service_amount, 0),
    total_damage_amount = ISNULL(inv.total_damage_amount, 0),
    discount_amount = ISNULL(inv.discount_amount, 0),
    manual_adjustment_amount = ISNULL(inv.manual_adjustment_amount, 0),
    tax_amount = ISNULL(inv.tax_amount, 0),
    final_total = ISNULL(inv.final_total, 0),
    refund_amount = ISNULL(inv.refund_amount, 0),
    status = CASE
                WHEN inv.status IS NULL OR LTRIM(RTRIM(inv.status)) = '' THEN 'Draft'
                WHEN UPPER(LTRIM(RTRIM(inv.status))) = 'UNPAID' THEN 'Draft'
                ELSE inv.status
             END,
    created_at = ISNULL(inv.created_at, GETUTCDATE())
FROM dbo.Invoices inv
LEFT JOIN dbo.Bookings b ON b.id = inv.booking_id;
GO

BEGIN TRY
    ALTER TABLE dbo.Invoices
    ALTER COLUMN invoice_code NVARCHAR(100) NOT NULL;
END TRY
BEGIN CATCH
    -- Column already NOT NULL or error during alteration
END CATCH
GO

BEGIN TRY
    ALTER TABLE dbo.Invoices
    ALTER COLUMN status NVARCHAR(50) NOT NULL;
END TRY
BEGIN CATCH
    -- Column already NOT NULL or error during alteration
END CATCH
GO

BEGIN TRY
    ALTER TABLE dbo.Invoices
    ALTER COLUMN created_at DATETIME2 NOT NULL;
END TRY
BEGIN CATCH
    -- Column already NOT NULL or error during alteration
END CATCH
GO

/* =========================================================
   5. PATCH Payments
   ========================================================= */
IF COL_LENGTH('dbo.Payments', 'payment_direction') IS NULL
BEGIN
    ALTER TABLE dbo.Payments
    ADD payment_direction NVARCHAR(10) NULL;
END
GO

IF COL_LENGTH('dbo.Payments', 'gateway_name') IS NULL
BEGIN
    ALTER TABLE dbo.Payments
    ADD gateway_name NVARCHAR(100) NULL;
END
GO

IF COL_LENGTH('dbo.Payments', 'provider_response') IS NULL
BEGIN
    ALTER TABLE dbo.Payments
    ADD provider_response NVARCHAR(MAX) NULL;
END
GO

IF COL_LENGTH('dbo.Payments', 'status') IS NULL
BEGIN
    ALTER TABLE dbo.Payments
    ADD status NVARCHAR(50) NULL;
END
GO

IF COL_LENGTH('dbo.Payments', 'created_at') IS NULL
BEGIN
    ALTER TABLE dbo.Payments
    ADD created_at DATETIME2 NULL;
END
GO

UPDATE dbo.Payments
SET
    payment_direction = ISNULL(payment_direction, 'IN'),
    status = ISNULL(status, 'SUCCESS'),
    created_at = ISNULL(created_at, GETUTCDATE()),
    payment_date = ISNULL(payment_date, GETUTCDATE())
WHERE payment_direction IS NULL
   OR status IS NULL
   OR created_at IS NULL
   OR payment_date IS NULL;
GO

BEGIN TRY
    ALTER TABLE dbo.Payments
    ALTER COLUMN payment_direction NVARCHAR(10) NOT NULL;
END TRY
BEGIN CATCH
    -- Column already NOT NULL or error during alteration
END CATCH
GO

BEGIN TRY
    ALTER TABLE dbo.Payments
    ALTER COLUMN status NVARCHAR(50) NOT NULL;
END TRY
BEGIN CATCH
    -- Column already NOT NULL or error during alteration
END CATCH
GO

BEGIN TRY
    ALTER TABLE dbo.Payments
    ALTER COLUMN created_at DATETIME2 NOT NULL;
END TRY
BEGIN CATCH
    -- Column already NOT NULL or error during alteration
END CATCH
GO

/* =========================================================
   6. OPTIONAL INDEX
   ========================================================= */
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.Invoices')
      AND name = 'IX_Invoices_InvoiceCode'
)
BEGIN
    CREATE INDEX IX_Invoices_InvoiceCode
    ON dbo.Invoices(invoice_code);
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.Order_Services')
      AND name = 'IX_OrderServices_OrderCode'
)
BEGIN
    CREATE INDEX IX_OrderServices_OrderCode
    ON dbo.Order_Services(order_code);
END
GO

/* =========================================================
   7. RECALC TOÀN BỘ INVOICE CHƯA PAID
   ========================================================= */
;WITH RoomTotals AS
(
    SELECT
        bd.booking_id,
        SUM(
            CASE
                WHEN ISNULL(bd.line_total, 0) > 0 THEN ISNULL(bd.line_total, 0)
                ELSE
                    (ISNULL(bd.price_per_night, 0) *
                     CASE
                         WHEN ISNULL(bd.nights, 0) > 0 THEN bd.nights
                         WHEN DATEDIFF(DAY, bd.check_in_date, bd.check_out_date) > 0 THEN DATEDIFF(DAY, bd.check_in_date, bd.check_out_date)
                         ELSE 1
                     END)
                    + ISNULL(bd.early_check_in_fee, 0)
                    + ISNULL(bd.late_check_out_fee, 0)
            END
        ) AS total_room_amount
    FROM dbo.Booking_Details bd
    GROUP BY bd.booking_id
),
OrderServiceDetailAgg AS
(
    SELECT
        osd.order_service_id,
        SUM(
            CASE
                WHEN ISNULL(osd.line_total, 0) > 0 THEN ISNULL(osd.line_total, 0)
                ELSE ISNULL(osd.quantity, 0) * ISNULL(osd.unit_price, 0)
            END
        ) AS detail_total
    FROM dbo.Order_Service_Details osd
    GROUP BY osd.order_service_id
),
OrderServiceAmount AS
(
    SELECT
        bd.booking_id,
        os.id AS order_service_id,
        CASE
            WHEN os.id IS NULL THEN 0
            WHEN UPPER(LTRIM(RTRIM(ISNULL(os.status, 'PENDING')))) = 'CANCELLED' THEN 0
            WHEN ISNULL(os.total_amount, 0) > 0 THEN ISNULL(os.total_amount, 0)
            ELSE ISNULL(osda.detail_total, 0)
        END AS order_total
    FROM dbo.Booking_Details bd
    LEFT JOIN dbo.Order_Services os
        ON os.booking_detail_id = bd.id
    LEFT JOIN OrderServiceDetailAgg osda
        ON osda.order_service_id = os.id
),
ServiceTotals AS
(
    SELECT
        booking_id,
        SUM(order_total) AS total_service_amount
    FROM OrderServiceAmount
    GROUP BY booking_id
),
DamageTotals AS
(
    SELECT
        bd.booking_id,
        SUM(
            CASE
                WHEN ld.id IS NULL THEN 0
                WHEN UPPER(LTRIM(RTRIM(ISNULL(ld.status, 'OPEN')))) IN ('WAIVED', 'CANCELLED', 'VOIDED') THEN 0
                ELSE ISNULL(ld.penalty_amount, 0)
            END
        ) AS total_damage_amount
    FROM dbo.Booking_Details bd
    LEFT JOIN dbo.Loss_And_Damages ld ON ld.booking_detail_id = bd.id
    GROUP BY bd.booking_id
)
UPDATE inv
SET
    inv.total_room_amount = ROUND(ISNULL(rt.total_room_amount, 0), 2),
    inv.total_service_amount = ROUND(ISNULL(st.total_service_amount, 0), 2),
    inv.total_damage_amount = ROUND(ISNULL(dt.total_damage_amount, 0), 2),
    inv.discount_amount = ROUND(ISNULL(b.discount_amount, 0), 2),
    inv.tax_amount = ROUND(
        CASE
            WHEN (
                ISNULL(rt.total_room_amount, 0)
                + ISNULL(st.total_service_amount, 0)
                + ISNULL(dt.total_damage_amount, 0)
                + ISNULL(inv.manual_adjustment_amount, 0)
                - ISNULL(b.discount_amount, 0)
            ) > 0
            THEN (
                ISNULL(rt.total_room_amount, 0)
                + ISNULL(st.total_service_amount, 0)
                + ISNULL(dt.total_damage_amount, 0)
                + ISNULL(inv.manual_adjustment_amount, 0)
                - ISNULL(b.discount_amount, 0)
            ) * 0.10
            ELSE 0
        END
    , 2),
    inv.final_total = ROUND(
        CASE
            WHEN (
                ISNULL(rt.total_room_amount, 0)
                + ISNULL(st.total_service_amount, 0)
                + ISNULL(dt.total_damage_amount, 0)
                + ISNULL(inv.manual_adjustment_amount, 0)
                - ISNULL(b.discount_amount, 0)
            ) > 0
            THEN (
                ISNULL(rt.total_room_amount, 0)
                + ISNULL(st.total_service_amount, 0)
                + ISNULL(dt.total_damage_amount, 0)
                + ISNULL(inv.manual_adjustment_amount, 0)
                - ISNULL(b.discount_amount, 0)
            )
            + (
                (
                    ISNULL(rt.total_room_amount, 0)
                    + ISNULL(st.total_service_amount, 0)
                    + ISNULL(dt.total_damage_amount, 0)
                    + ISNULL(inv.manual_adjustment_amount, 0)
                    - ISNULL(b.discount_amount, 0)
                ) * 0.10
            )
            - ISNULL(inv.refund_amount, 0)
            ELSE 0
        END
    , 2),
    inv.updated_at = GETUTCDATE(),
    inv.status = CASE
                    WHEN UPPER(LTRIM(RTRIM(ISNULL(inv.status, 'DRAFT')))) = 'UNPAID' THEN 'Draft'
                    WHEN inv.status IS NULL OR LTRIM(RTRIM(inv.status)) = '' THEN 'Draft'
                    ELSE inv.status
                 END
FROM dbo.Invoices inv
LEFT JOIN dbo.Bookings b ON b.id = inv.booking_id
LEFT JOIN RoomTotals rt ON rt.booking_id = inv.booking_id
LEFT JOIN ServiceTotals st ON st.booking_id = inv.booking_id
LEFT JOIN DamageTotals dt ON dt.booking_id = inv.booking_id
WHERE UPPER(LTRIM(RTRIM(ISNULL(inv.status, 'DRAFT')))) <> 'PAID';
GO

/* =========================================================
   PATCH GÓI 2 
   - Đồng bộ schema Invoices/Payments
   - BỎ trigger tự sinh invoice
   - Chuyển sang invoice theo booking_detail
   ========================================================= */

SET NOCOUNT ON;
GO

/* =========================================================
   A. PATCH BẢNG INVOICES
   ========================================================= */

IF COL_LENGTH('dbo.Invoices', 'invoice_code') IS NULL
BEGIN
    ALTER TABLE dbo.Invoices ADD invoice_code NVARCHAR(50) NULL;
END
GO

UPDATE dbo.Invoices
SET invoice_code = CONCAT('INV-BK-', RIGHT('000000' + CAST(ISNULL(booking_id, id) AS VARCHAR(6)), 6), '-', RIGHT('000000' + CAST(id AS VARCHAR(6)), 6))
WHERE invoice_code IS NULL;
GO

IF EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.Invoices')
      AND name = 'invoice_code'
      AND is_nullable = 1
)
BEGIN
    ALTER TABLE dbo.Invoices ALTER COLUMN invoice_code NVARCHAR(50) NOT NULL;
END
GO

IF COL_LENGTH('dbo.Invoices', 'total_damage_amount') IS NULL
BEGIN
    ALTER TABLE dbo.Invoices ADD total_damage_amount DECIMAL(18,2) NOT NULL CONSTRAINT DF_Invoices_TotalDamageAmount DEFAULT 0;
END
GO

IF COL_LENGTH('dbo.Invoices', 'manual_adjustment_amount') IS NULL
BEGIN
    ALTER TABLE dbo.Invoices ADD manual_adjustment_amount DECIMAL(18,2) NOT NULL CONSTRAINT DF_Invoices_ManualAdjustmentAmount DEFAULT 0;
END
GO

IF COL_LENGTH('dbo.Invoices', 'refund_amount') IS NULL
BEGIN
    ALTER TABLE dbo.Invoices ADD refund_amount DECIMAL(18,2) NOT NULL CONSTRAINT DF_Invoices_RefundAmount DEFAULT 0;
END
GO

IF COL_LENGTH('dbo.Invoices', 'notes') IS NULL
BEGIN
    ALTER TABLE dbo.Invoices ADD notes NVARCHAR(1000) NULL;
END
GO

IF COL_LENGTH('dbo.Invoices', 'issued_at') IS NULL
BEGIN
    ALTER TABLE dbo.Invoices ADD issued_at DATETIME NULL;
END
GO

IF COL_LENGTH('dbo.Invoices', 'paid_at') IS NULL
BEGIN
    ALTER TABLE dbo.Invoices ADD paid_at DATETIME NULL;
END
GO

IF COL_LENGTH('dbo.Invoices', 'created_at') IS NULL
BEGIN
    ALTER TABLE dbo.Invoices ADD created_at DATETIME NOT NULL CONSTRAINT DF_Invoices_CreatedAt_Package2 DEFAULT GETDATE();
END
GO

IF COL_LENGTH('dbo.Invoices', 'updated_at') IS NULL
BEGIN
    ALTER TABLE dbo.Invoices ADD updated_at DATETIME NULL;
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'UQ_Invoices_Code'
      AND object_id = OBJECT_ID('dbo.Invoices')
)
BEGIN
    CREATE UNIQUE INDEX UQ_Invoices_Code ON dbo.Invoices(invoice_code);
END
GO

/* =========================================================
   B. PATCH BẢNG PAYMENTS
   ========================================================= */

IF COL_LENGTH('dbo.Payments', 'payment_direction') IS NULL
BEGIN
    ALTER TABLE dbo.Payments ADD payment_direction NVARCHAR(20) NOT NULL CONSTRAINT DF_Payments_PaymentDirection DEFAULT 'IN';
END
GO

IF COL_LENGTH('dbo.Payments', 'gateway_name') IS NULL
BEGIN
    ALTER TABLE dbo.Payments ADD gateway_name NVARCHAR(100) NULL;
END
GO

IF COL_LENGTH('dbo.Payments', 'provider_response') IS NULL
BEGIN
    ALTER TABLE dbo.Payments ADD provider_response NVARCHAR(MAX) NULL;
END
GO

IF COL_LENGTH('dbo.Payments', 'status') IS NULL
BEGIN
    ALTER TABLE dbo.Payments ADD status NVARCHAR(50) NOT NULL CONSTRAINT DF_Payments_Status DEFAULT 'SUCCESS';
END
GO

IF COL_LENGTH('dbo.Payments', 'created_at') IS NULL
BEGIN
    ALTER TABLE dbo.Payments ADD created_at DATETIME NOT NULL CONSTRAINT DF_Payments_CreatedAt DEFAULT GETDATE();
END
GO

/* =========================================================
   C. CHUẨN HÓA DATA CŨ
   ========================================================= */

UPDATE dbo.Invoices
SET total_room_amount = ISNULL(total_room_amount, 0),
    total_service_amount = ISNULL(total_service_amount, 0),
    total_damage_amount = ISNULL(total_damage_amount, 0),
    manual_adjustment_amount = ISNULL(manual_adjustment_amount, 0),
    discount_amount = ISNULL(discount_amount, 0),
    tax_amount = ISNULL(tax_amount, 0),
    final_total = ISNULL(final_total, 0),
    refund_amount = ISNULL(refund_amount, 0),
    created_at = ISNULL(created_at, GETDATE())
WHERE 1 = 1;
GO

UPDATE dbo.Payments
SET payment_direction = ISNULL(payment_direction, 'IN'),
    status = ISNULL(status, 'SUCCESS'),
    created_at = ISNULL(created_at, GETDATE())
WHERE 1 = 1;
GO

/* =========================================================
   D. HƯỚNG B: KHÔNG DÙNG TRIGGER TỰ TẠO HÓA ĐƠN
   ========================================================= */

DROP TRIGGER IF EXISTS dbo.trg_BookingDetails_AutoDraftInvoice_WhenCheckout;
GO

/* =========================================================
   E. THÊM TRẠNG THÁI THANH TOÁN Ở MỨC BOOKING_DETAIL
   ========================================================= */

IF COL_LENGTH('dbo.Booking_Details', 'settlement_status') IS NULL
BEGIN
    ALTER TABLE dbo.Booking_Details
    ADD settlement_status NVARCHAR(50) NOT NULL
        CONSTRAINT DF_BookingDetails_SettlementStatus DEFAULT 'UNPAID';
END
GO

IF COL_LENGTH('dbo.Booking_Details', 'settled_at') IS NULL
BEGIN
    ALTER TABLE dbo.Booking_Details
    ADD settled_at DATETIME NULL;
END
GO

/* =========================================================
   F. BẢNG LIÊN KẾT INVOICE <-> BOOKING_DETAIL
   ========================================================= */

IF OBJECT_ID(N'dbo.Invoice_Booking_Details', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Invoice_Booking_Details
    (
        id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        invoice_id INT NOT NULL,
        booking_detail_id INT NOT NULL,

        room_charge DECIMAL(18,2) NOT NULL CONSTRAINT DF_InvoiceBookingDetails_RoomCharge DEFAULT 0,
        service_charge DECIMAL(18,2) NOT NULL CONSTRAINT DF_InvoiceBookingDetails_ServiceCharge DEFAULT 0,
        damage_charge DECIMAL(18,2) NOT NULL CONSTRAINT DF_InvoiceBookingDetails_DamageCharge DEFAULT 0,
        discount_amount DECIMAL(18,2) NOT NULL CONSTRAINT DF_InvoiceBookingDetails_DiscountAmount DEFAULT 0,
        extra_fee_amount DECIMAL(18,2) NOT NULL CONSTRAINT DF_InvoiceBookingDetails_ExtraFeeAmount DEFAULT 0,
        tax_amount DECIMAL(18,2) NOT NULL CONSTRAINT DF_InvoiceBookingDetails_TaxAmount DEFAULT 0,
        line_total DECIMAL(18,2) NOT NULL CONSTRAINT DF_InvoiceBookingDetails_LineTotal DEFAULT 0,

        created_at DATETIME NOT NULL CONSTRAINT DF_InvoiceBookingDetails_CreatedAt DEFAULT GETDATE()
    );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = 'FK_InvoiceBookingDetails_Invoices'
)
BEGIN
    ALTER TABLE dbo.Invoice_Booking_Details
    ADD CONSTRAINT FK_InvoiceBookingDetails_Invoices
        FOREIGN KEY (invoice_id) REFERENCES dbo.Invoices(id);
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = 'FK_InvoiceBookingDetails_BookingDetails'
)
BEGIN
    ALTER TABLE dbo.Invoice_Booking_Details
    ADD CONSTRAINT FK_InvoiceBookingDetails_BookingDetails
        FOREIGN KEY (booking_detail_id) REFERENCES dbo.Booking_Details(id);
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'UQ_InvoiceBookingDetails_InvoiceDetail'
      AND object_id = OBJECT_ID('dbo.Invoice_Booking_Details')
)
BEGIN
    CREATE UNIQUE INDEX UQ_InvoiceBookingDetails_InvoiceDetail
    ON dbo.Invoice_Booking_Details(invoice_id, booking_detail_id);
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_InvoiceBookingDetails_BookingDetail'
      AND object_id = OBJECT_ID('dbo.Invoice_Booking_Details')
)
BEGIN
    CREATE INDEX IX_InvoiceBookingDetails_BookingDetail
    ON dbo.Invoice_Booking_Details(booking_detail_id);
END
GO

/* =========================================================
   G. BACKFILL DỮ LIỆU CŨ TỪ BOOKING-LEVEL INVOICE
   ========================================================= */

INSERT INTO dbo.Invoice_Booking_Details
(
    invoice_id,
    booking_detail_id,
    room_charge,
    service_charge,
    damage_charge,
    discount_amount,
    extra_fee_amount,
    tax_amount,
    line_total,
    created_at
)
SELECT
    i.id,
    bd.id,
    CASE
        WHEN ISNULL(bd.line_total, 0) > 0 THEN ISNULL(bd.line_total, 0)
        ELSE
            (ISNULL(bd.price_per_night, 0) *
             CASE
                WHEN ISNULL(bd.nights, 0) > 0 THEN bd.nights
                WHEN DATEDIFF(DAY, bd.check_in_date, bd.check_out_date) > 0 THEN DATEDIFF(DAY, bd.check_in_date, bd.check_out_date)
                ELSE 1
             END)
            + ISNULL(bd.early_check_in_fee, 0)
            + ISNULL(bd.late_check_out_fee, 0)
    END AS room_charge,
    0 AS service_charge,
    0 AS damage_charge,
    0 AS discount_amount,
    0 AS extra_fee_amount,
    0 AS tax_amount,
    CASE
        WHEN ISNULL(bd.line_total, 0) > 0 THEN ISNULL(bd.line_total, 0)
        ELSE
            (ISNULL(bd.price_per_night, 0) *
             CASE
                WHEN ISNULL(bd.nights, 0) > 0 THEN bd.nights
                WHEN DATEDIFF(DAY, bd.check_in_date, bd.check_out_date) > 0 THEN DATEDIFF(DAY, bd.check_in_date, bd.check_out_date)
                ELSE 1
             END)
            + ISNULL(bd.early_check_in_fee, 0)
            + ISNULL(bd.late_check_out_fee, 0)
    END AS line_total,
    GETDATE()
FROM dbo.Invoices i
INNER JOIN dbo.Booking_Details bd
    ON bd.booking_id = i.booking_id
WHERE NOT EXISTS
(
    SELECT 1
    FROM dbo.Invoice_Booking_Details ibd
    WHERE ibd.invoice_id = i.id
      AND ibd.booking_detail_id = bd.id
);
GO

/* =========================================================
   H. BACKFILL settlement_status CHO DỮ LIỆU CŨ
   ========================================================= */

;WITH PaidBookings AS
(
    SELECT DISTINCT booking_id, MAX(paid_at) AS max_paid_at
    FROM dbo.Invoices
    WHERE UPPER(LTRIM(RTRIM(ISNULL(status, '')))) = 'PAID'
    GROUP BY booking_id
),
OpenInvoiceBookings AS
(
    SELECT DISTINCT booking_id
    FROM dbo.Invoices
    WHERE UPPER(LTRIM(RTRIM(ISNULL(status, '')))) NOT IN ('PAID', 'REFUNDED', 'CANCELLED', 'VOIDED')
)
UPDATE bd
SET
    settlement_status =
        CASE
            WHEN pb.booking_id IS NOT NULL THEN 'PAID'
            WHEN oib.booking_id IS NOT NULL THEN 'DRAFTED'
            ELSE 'UNPAID'
        END,
    settled_at =
        CASE
            WHEN pb.booking_id IS NOT NULL AND bd.settled_at IS NULL THEN pb.max_paid_at
            ELSE bd.settled_at
        END
FROM dbo.Booking_Details bd
LEFT JOIN PaidBookings pb
    ON pb.booking_id = bd.booking_id
LEFT JOIN OpenInvoiceBookings oib
    ON oib.booking_id = bd.booking_id;
GO


-- ==============================================================================
-- ES: CẬP NHẬT CẤU TRÚC BẢNG 
-- ==============================================================================

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Vouchers') AND name = 'created_at')
ALTER TABLE Vouchers ADD created_at DATETIME NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Vouchers') AND name = 'status')
ALTER TABLE Vouchers ADD status NVARCHAR(50) NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Vouchers') AND name = 'updated_at')
ALTER TABLE Vouchers ADD updated_at DATETIME NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Vouchers') AND name = 'used_count')
ALTER TABLE Vouchers ADD used_count INT NULL;
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'identity_document_public_id')
ALTER TABLE Users ADD identity_document_public_id NVARCHAR(MAX) NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'created_at')
ALTER TABLE Users ADD created_at DATETIME NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'updated_at')
ALTER TABLE Users ADD updated_at DATETIME NULL;
GO
INSERT [dbo].[Rooms] ([room_type_id], [room_number], [floor], [status], [cleaning_status], [extension_number]) VALUES
(2, N'105', 1, N'Occupied', N'Dirty', N'8105'),
(2, N'106', 1, N'Maintenance', N'Dirty', N'8106'),
(2, N'107', 1, N'Occupied', N'Clean', N'8107'),
(2, N'108', 1, N'Available', N'Clean', N'8108'),
(2, N'109', 1, N'Available', N'Cleaning', NULL),
(2, N'110', 1, N'Occupied', N'Dirty', N'8110'),

(2, N'205', 2, N'Occupied', N'Dirty', NULL),
(3, N'206', 2, N'Available', N'Clean', N'8206'),
(3, N'207', 2, N'Available', N'Clean', N'8207'),
(3, N'208', 2, N'Maintenance', N'Dirty', N'8208'),
(3, N'209', 2, N'Occupied', N'Clean', N'8209'),
(3, N'210', 2, N'Available', N'Clean', NULL),

(3, N'303', 3, N'Available', N'Clean', N'8303'),
(3, N'304', 3, N'Available', N'Cleaning', NULL),
(3, N'305', 3, N'Available', N'Clean', N'8305'),
(4, N'306', 3, N'Occupied', N'Clean', N'8306'),
(4, N'307', 3, N'Available', N'Clean', N'8307'),
(4, N'308', 3, N'Available', N'Clean', N'8308'),
(4, N'309', 3, N'Available', N'Cleaning', N'8309'),
(4, N'310', 3, N'Maintenance', N'Dirty', NULL),

(4, N'403', 4, N'Available', N'Clean', NULL),
(4, N'404', 4, N'Available', N'Cleaning', N'8404'),
(4, N'405', 4, N'Available', N'Clean', N'8405'),
(6, N'406', 4, N'Occupied', N'Dirty', N'8406'),
(6, N'407', 4, N'Available', N'Clean', N'8407'),
(6, N'408', 4, N'Available', N'Clean', N'8408'),
(6, N'409', 4, N'Occupied', N'Clean', NULL),
(6, N'410', 4, N'Available', N'Clean', N'8410'),

(6, N'502', 5, N'Occupied', N'Clean', N'8502'),
(6, N'503', 5, N'Occupied', N'Clean', N'8503'),
(6, N'504', 5, N'Occupied', N'Dirty', NULL),
(6, N'505', 5, N'Available', N'Clean', N'8505'),
(9, N'506', 5, N'Available', N'Cleaning', N'8506'),
(9, N'507', 5, N'Available', N'Clean', N'8507'),
(9, N'508', 5, N'Maintenance', N'Dirty', N'8508'),
(9, N'509', 5, N'Available', N'Clean', NULL),
(9, N'510', 5, N'Available', N'Clean', N'8510');
GO

-- Đã có cột deposit_amount ở CREATE TABLE Bookings nên lệnh này gây lỗi Duplicate Column
-- ALTER TABLE [dbo].[Bookings] ADD [DepositAmount] DECIMAL(18,2) NOT NULL DEFAULT 0;
GO

-- =============================================
-- 5. STORED PROCEDURE: LƯU AUDIT LOG JSON (DAILY)
-- =============================================
GO
CREATE PROCEDURE [dbo].[sp_SubmitAuditLog]
    @UserId INT,
    @RoleName NVARCHAR(50),
    @ActionType NVARCHAR(50),      
    @EntityType NVARCHAR(100),    
    @ContextParams NVARCHAR(MAX),  
    @ChangesParams NVARCHAR(MAX),  
    @Message NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Today DATE = CAST(GETDATE() AS DATE);
    DECLARE @NewEvent NVARCHAR(MAX) = (
        SELECT 
            NEWID() AS [eventId],
            FORMAT(GETUTCDATE(), 'yyyy-MM-ddTHH:mm:ss.ffffffZ') AS [timestamp],
            @ActionType AS [actionType],
            @EntityType AS [entityType],
            JSON_QUERY(@ContextParams) AS [context],
            JSON_QUERY(@ChangesParams) AS [changes],
            @Message AS [message]
        FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
    );

    -- UPSERT logic: New day OR New role = New row
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Audit_Logs] WHERE user_id = @UserId AND role_name = @RoleName AND log_date = @Today)
    BEGIN
        INSERT INTO [dbo].[Audit_Logs] (user_id, role_name, log_date, log_data)
        VALUES (@UserId, @RoleName, @Today, 
            JSON_MODIFY(
                JSON_MODIFY(N'{"TotalEvents":0, "Events":[]}', '$.TotalEvents', 1),
                'append $.Events', JSON_QUERY(@NewEvent)
            )
        );
    END
    ELSE
    BEGIN
        UPDATE [dbo].[Audit_Logs]
        SET log_data = JSON_MODIFY(
                            JSON_MODIFY(log_data, 'append $.Events', JSON_QUERY(@NewEvent)),
                            '$.TotalEvents', 
                            CAST(JSON_VALUE(log_data, '$.TotalEvents') AS INT) + 1
                        )
        WHERE user_id = @UserId AND role_name = @RoleName AND log_date = @Today;
    END
END;
GO
EXEC sp_msforeachtable 'ALTER TABLE ? CHECK CONSTRAINT ALL';
GO

-- ========================================================
-- 6. TẠO SQL SERVER AGENT JOB TỰ XOÁ AUDIT LOG QUÁ 3 THÁNG
-- ========================================================
USE msdb;
GO

IF EXISTS (SELECT job_id FROM msdb.dbo.sysjobs_view WHERE name = N'AutoPurge_OldAuditLogs')
    EXEC msdb.dbo.sp_delete_job @job_name = N'AutoPurge_OldAuditLogs', @delete_unused_schedule = 1;
GO

EXEC dbo.sp_add_job @job_name = N'AutoPurge_OldAuditLogs';
GO

EXEC sp_add_jobstep
    @job_name = N'AutoPurge_OldAuditLogs',
    @step_name = N'Purge 3 Months Logic',
    @subsystem = N'TSQL',
    @command = N'DELETE FROM [HotelManagementDB].[dbo].[Audit_Logs] WHERE log_date < DATEADD(month, -3, GETDATE())',
    @retry_attempts = 3,
    @retry_interval = 5;
GO

EXEC dbo.sp_add_schedule
    @schedule_name = N'Daily 2AM',
    @freq_type = 4, -- Daily
    @freq_interval = 1,
    @active_start_time = 020000; -- 2:00:00 AM
GO

EXEC sp_attach_schedule
   @job_name = N'AutoPurge_OldAuditLogs',
   @schedule_name = N'Daily 2AM';
GO

EXEC dbo.sp_add_jobserver @job_name = N'AutoPurge_OldAuditLogs';
GO

-- ========================================================================
-- TRIGGER: Tự động xóa log cũ khi log_date bị chỉnh sửa trực tiếp trong DB
-- ========================================================================
USE [HotelManagementDB];
GO

IF OBJECT_ID('TR_AuditLogs_AutoPurgeOnUpdate', 'TR') IS NOT NULL
    DROP TRIGGER TR_AuditLogs_AutoPurgeOnUpdate;
GO

CREATE TRIGGER TR_AuditLogs_AutoPurgeOnUpdate
ON Audit_Logs
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    -- Chỉ chạy logic xóa nếu cột log_date thực sự bị thay đổi
    IF UPDATE(log_date)
    BEGIN
        DECLARE @cutoff DATE = CAST(DATEADD(MONTH, -3, GETUTCDATE()) AS DATE);

        DELETE FROM Audit_Logs
        WHERE log_date < @cutoff;
    END
END;
GO

-- ========================================================================
-- 7. EF CORE MIGRATION HISTORY & INITIALIZATION
-- ========================================================================
IF OBJECT_ID(N'[__EFMigrationsHistory]') IS NULL
BEGIN
    CREATE TABLE [__EFMigrationsHistory] (
        [MigrationId] nvarchar(150) NOT NULL,
        [ProductVersion] nvarchar(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END
GO

-- Chèn bản ghi migration để EF Core không chạy lại các migration đã gộp
IF NOT EXISTS (SELECT 1 FROM [__EFMigrationsHistory] WHERE [MigrationId] = N'20260424140949_AddDepositAmount')
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260424140949_AddDepositAmount', N'10.0.5');
END
GO

IF NOT EXISTS (SELECT 1 FROM [__EFMigrationsHistory] WHERE [MigrationId] = N'20260508130233_AddLoyaltyPointHistoryTable')
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260508130233_AddLoyaltyPointHistoryTable', N'10.0.5');
END
GO

-- Đồng bộ trạng thái bài viết (Dựa trên db_admin_reset)
UPDATE [dbo].[Articles] SET [status] = 'Published' WHERE [id] <= 10;
GO

EXEC sp_msforeachtable 'ALTER TABLE ? CHECK CONSTRAINT ALL';
GO

-- =============================================
-- 8. MỞ RỘNG CỘT notes CỦA Invoices LÊN NVARCHAR(MAX)
--    (Tránh lỗi 500 khi audit log tích lũy quá 1000 ký tự)
-- =============================================
IF COL_LENGTH('dbo.Invoices', 'notes') IS NOT NULL
BEGIN
    ALTER TABLE [dbo].[Invoices] ALTER COLUMN [notes] NVARCHAR(MAX) NULL;
    PRINT 'Đã mở rộng cột notes của Invoices thành NVARCHAR(MAX)';
END
GO

-- =============================================
-- 9. THÊM CỘT THIẾU CHO BẢNG Articles & Article_Categories
--    (Tránh lỗi 500 Invalid column name khi query bài viết)
-- =============================================
IF COL_LENGTH('dbo.Articles', 'tags') IS NULL
    ALTER TABLE [dbo].[Articles] ADD [tags] NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.Articles', 'meta_title') IS NULL
    ALTER TABLE [dbo].[Articles] ADD [meta_title] NVARCHAR(500) NULL;
IF COL_LENGTH('dbo.Articles', 'meta_description') IS NULL
    ALTER TABLE [dbo].[Articles] ADD [meta_description] NVARCHAR(1000) NULL;

IF COL_LENGTH('dbo.Article_Categories', 'updated_at') IS NULL
    ALTER TABLE [dbo].[Article_Categories] ADD [updated_at] DATETIME NULL;
GO
PRINT 'Đã thêm cột còn thiếu vào Articles và Article_Categories';
GO

-- ==========================================
-- 11. LỊCH SỬ ĐIỂM THƯỞNG (LOYALTY) - BỔ SUNG MỚI
-- ==========================================
IF OBJECT_ID(N'[dbo].[Loyalty_Point_Histories]') IS NULL
BEGIN
    CREATE TABLE [dbo].[Loyalty_Point_Histories] (
        [id] int NOT NULL IDENTITY(1,1) PRIMARY KEY,
        [booking_id] int NOT NULL,
        [user_id] int NOT NULL,
        [action_type] nvarchar(50) NOT NULL,
        [source_amount] decimal(18,2) NOT NULL,
        [points_added] int NOT NULL,
        [balance_before] int NOT NULL,
        [balance_after] int NOT NULL,
        [reason] nvarchar(500) NOT NULL,
        [created_at] datetime NOT NULL DEFAULT GETDATE()
    );
    CREATE UNIQUE INDEX [UQ_Loyalty_Point_Histories_BookingAction] ON [dbo].[Loyalty_Point_Histories] ([booking_id], [action_type]);
    CREATE INDEX [IX_Loyalty_Point_Histories_user_id] ON [dbo].[Loyalty_Point_Histories] ([user_id]);
    PRINT 'Đã thêm bảng Loyalty_Point_Histories';
END
GO
-- ========================================================================
-- 7. BỔ SUNG CÁC CỘT CÒN THIẾU (VOUCHER USER_ID & MEMBERSHIP DISCOUNT)
-- ========================================================================
GO

-- 1. Thêm cột user_id vào bảng Vouchers (Dùng cho voucher cá nhân)
IF COL_LENGTH('dbo.Vouchers', 'user_id') IS NULL
BEGIN
    ALTER TABLE dbo.Vouchers ADD user_id INT NULL;
    PRINT N'Đã thêm cột user_id vào bảng Vouchers thành công!';
END
GO

-- 2. Thêm cột membership_discount_amount vào bảng Bookings (Lưu số tiền giảm giá hội viên)
IF COL_LENGTH('dbo.Bookings', 'membership_discount_amount') IS NULL
BEGIN
    ALTER TABLE dbo.Bookings ADD membership_discount_amount DECIMAL(18, 2) NULL DEFAULT 0;
    PRINT N'Đã thêm cột membership_discount_amount vào bảng Bookings thành công!';
END
GO

-- ========================================================================
-- 8. THÊM BẢNG DASHBOARD THEO KỲ VÀ SEED DỮ LIỆU
-- ========================================================================
USE [HotelManagementDB]
GO

SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

IF OBJECT_ID(N'[dbo].[Role_Dashboard_Period_States]', N'U') IS NOT NULL
BEGIN
    PRINT N'Bảng [dbo].[Role_Dashboard_Period_States] đã tồn tại. Không tạo lại.';
END
ELSE
BEGIN
    CREATE TABLE [dbo].[Role_Dashboard_Period_States]
    (
        [id] [int] IDENTITY(1,1) NOT NULL,

        [role_id] [int] NOT NULL,
        [role_name] [nvarchar](100) NOT NULL,

        [dashboard_code] [varchar](100) NOT NULL,
        [dashboard_title] [nvarchar](255) NOT NULL,

        [period_type] [varchar](20) NOT NULL,
        [period_key] [varchar](30) NOT NULL,

        [period_start] [datetime2](7) NOT NULL,
        [period_end] [datetime2](7) NOT NULL,

        [dashboard_json] [nvarchar](max) NOT NULL,
        [comparison_json] [nvarchar](max) NULL,

        [status] [varchar](20) NOT NULL
            CONSTRAINT [DF_RoleDashboardPeriod_Status] DEFAULT ('OPEN'),

        [is_current] [bit] NOT NULL
            CONSTRAINT [DF_RoleDashboardPeriod_IsCurrent] DEFAULT ((0)),

        [last_event_type] [varchar](100) NULL,
        [last_event_source] [varchar](100) NULL,
        [last_event_ref_id] [int] NULL,

        [version] [int] NOT NULL
            CONSTRAINT [DF_RoleDashboardPeriod_Version] DEFAULT ((1)),

        [created_at] [datetime2](7) NOT NULL
            CONSTRAINT [DF_RoleDashboardPeriod_CreatedAt] DEFAULT (SYSUTCDATETIME()),

        [updated_at] [datetime2](7) NOT NULL
            CONSTRAINT [DF_RoleDashboardPeriod_UpdatedAt] DEFAULT (SYSUTCDATETIME()),

        [closed_at] [datetime2](7) NULL,

        [updated_by] [int] NULL,

        CONSTRAINT [PK_Role_Dashboard_Period_States]
            PRIMARY KEY CLUSTERED ([id] ASC),

        CONSTRAINT [FK_RoleDashboardPeriod_Roles]
            FOREIGN KEY ([role_id])
            REFERENCES [dbo].[Roles]([id]),

        CONSTRAINT [FK_RoleDashboardPeriod_UpdatedBy]
            FOREIGN KEY ([updated_by])
            REFERENCES [dbo].[Users]([id]),

        CONSTRAINT [CK_RoleDashboardPeriod_PeriodType]
            CHECK ([period_type] IN ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY')),

        CONSTRAINT [CK_RoleDashboardPeriod_Status]
            CHECK ([status] IN ('OPEN', 'CLOSED', 'REBUILT', 'CORRECTED')),

        CONSTRAINT [CK_RoleDashboardPeriod_DashboardJson_IsJson]
            CHECK (ISJSON([dashboard_json]) = 1),

        CONSTRAINT [CK_RoleDashboardPeriod_ComparisonJson_IsJson]
            CHECK ([comparison_json] IS NULL OR ISJSON([comparison_json]) = 1)
    );

    PRINT N'Đã tạo bảng [dbo].[Role_Dashboard_Period_States].';
END
GO

-- Script tạo Index - Chạy sau khi tạo bảng thành công:
USE [HotelManagementDB]
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'UX_RoleDashboardPeriod_Role_Dashboard_Period'
      AND object_id = OBJECT_ID(N'[dbo].[Role_Dashboard_Period_States]')
)
BEGIN
    CREATE UNIQUE INDEX [UX_RoleDashboardPeriod_Role_Dashboard_Period]
    ON [dbo].[Role_Dashboard_Period_States]
    (
        [role_id],
        [dashboard_code],
        [period_type],
        [period_key]
    );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_RoleDashboardPeriod_Query'
      AND object_id = OBJECT_ID(N'[dbo].[Role_Dashboard_Period_States]')
)
BEGIN
    CREATE INDEX [IX_RoleDashboardPeriod_Query]
    ON [dbo].[Role_Dashboard_Period_States]
    (
        [dashboard_code],
        [role_name],
        [period_type],
        [period_start],
        [period_end]
    );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_RoleDashboardPeriod_Current'
      AND object_id = OBJECT_ID(N'[dbo].[Role_Dashboard_Period_States]')
)
BEGIN
    CREATE INDEX [IX_RoleDashboardPeriod_Current]
    ON [dbo].[Role_Dashboard_Period_States]
    (
        [role_id],
        [dashboard_code],
        [period_type],
        [is_current]
    )
    WHERE [is_current] = 1;
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_RoleDashboardPeriod_UpdatedAt'
      AND object_id = OBJECT_ID(N'[dbo].[Role_Dashboard_Period_States]')
)
BEGIN
    CREATE INDEX [IX_RoleDashboardPeriod_UpdatedAt]
    ON [dbo].[Role_Dashboard_Period_States]
    (
        [updated_at] DESC
    );
END
GO

-- Script seed dữ liệu dashboard mẫu theo Roles
USE [HotelManagementDB]
GO

DECLARE @PeriodType VARCHAR(20) = 'MONTHLY';
DECLARE @PeriodKey VARCHAR(30) = FORMAT(GETDATE(), 'yyyy-MM');
DECLARE @PeriodStart DATETIME2(7) = DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1);
DECLARE @PeriodEnd DATETIME2(7) = DATEADD(SECOND, -1, DATEADD(MONTH, 1, @PeriodStart));

INSERT INTO [dbo].[Role_Dashboard_Period_States]
(
    [role_id],
    [role_name],
    [dashboard_code],
    [dashboard_title],
    [period_type],
    [period_key],
    [period_start],
    [period_end],
    [dashboard_json],
    [comparison_json],
    [status],
    [is_current]
)
SELECT
    r.[id] AS [role_id],
    r.[name] AS [role_name],

    CASE r.[name]
        WHEN N'Admin' THEN 'ADMIN_DASHBOARD'
        WHEN N'Manager' THEN 'MANAGER_DASHBOARD'
        WHEN N'Receptionist' THEN 'RECEPTION_DASHBOARD'
        WHEN N'Accountant' THEN 'ACCOUNTANT_DASHBOARD'
        WHEN N'Housekeeping' THEN 'HOUSEKEEPING_DASHBOARD'
        WHEN N'Security' THEN 'SECURITY_DASHBOARD'
        WHEN N'Chef' THEN 'CHEF_DASHBOARD'
        WHEN N'Waiter' THEN 'WAITER_DASHBOARD'
        WHEN N'IT Support' THEN 'IT_SUPPORT_DASHBOARD'
        WHEN N'Guest' THEN 'GUEST_DASHBOARD'
        ELSE UPPER(REPLACE(CONVERT(VARCHAR(100), r.[name]), ' ', '_')) + '_DASHBOARD'
    END AS [dashboard_code],

    r.[name] + N' Dashboard' AS [dashboard_title],

    @PeriodType AS [period_type],
    @PeriodKey AS [period_key],
    @PeriodStart AS [period_start],
    @PeriodEnd AS [period_end],

    N'{
        "meta": {
            "schemaVersion": 1,
            "dashboardCode": "",
            "roleName": "",
            "periodType": "MONTHLY",
            "periodKey": "",
            "status": "OPEN"
        },
        "summary": {},
        "widgets": {},
        "breakdown": {},
        "alerts": [],
        "events": []
    }' AS [dashboard_json],

    N'{
        "base": {
            "comparisonType": "PREVIOUS_PERIOD"
        },
        "metrics": {}
    }' AS [comparison_json],

    'OPEN' AS [status],
    1 AS [is_current]
FROM [dbo].[Roles] r
WHERE NOT EXISTS
(
    SELECT 1
    FROM [dbo].[Role_Dashboard_Period_States] d
    WHERE d.[role_id] = r.[id]
      AND d.[period_type] = @PeriodType
      AND d.[period_key] = @PeriodKey
      AND d.[dashboard_code] =
        CASE r.[name]
            WHEN N'Admin' THEN 'ADMIN_DASHBOARD'
            WHEN N'Manager' THEN 'MANAGER_DASHBOARD'
            WHEN N'Receptionist' THEN 'RECEPTION_DASHBOARD'
            WHEN N'Accountant' THEN 'ACCOUNTANT_DASHBOARD'
            WHEN N'Housekeeping' THEN 'HOUSEKEEPING_DASHBOARD'
            WHEN N'Security' THEN 'SECURITY_DASHBOARD'
            WHEN N'Chef' THEN 'CHEF_DASHBOARD'
            WHEN N'Waiter' THEN 'WAITER_DASHBOARD'
            WHEN N'IT Support' THEN 'IT_SUPPORT_DASHBOARD'
            WHEN N'Guest' THEN 'GUEST_DASHBOARD'
            ELSE UPPER(REPLACE(CONVERT(VARCHAR(100), r.[name]), ' ', '_')) + '_DASHBOARD'
        END
);
GO




-- ========================================================================
-- 9. KHẮC PHỤC LỖI NULL CỦA ENTITY FRAMEWORK (ĐỔI CỘT THÀNH NOT NULL)
-- ========================================================================
USE [HotelManagementDB];
GO

-- Attractions
UPDATE dbo.Attractions SET created_at = GETDATE() WHERE created_at IS NULL;
ALTER TABLE dbo.Attractions ALTER COLUMN created_at DATETIME NOT NULL;

UPDATE dbo.Attractions SET latitude = 0 WHERE latitude IS NULL;
ALTER TABLE dbo.Attractions ALTER COLUMN latitude DECIMAL(10,8) NOT NULL;

UPDATE dbo.Attractions SET longitude = 0 WHERE longitude IS NULL;
ALTER TABLE dbo.Attractions ALTER COLUMN longitude DECIMAL(11,8) NOT NULL;

UPDATE dbo.Attractions SET status = 'ACTIVE' WHERE status IS NULL;
ALTER TABLE dbo.Attractions ALTER COLUMN status VARCHAR(50) NOT NULL;

-- Users
UPDATE dbo.Users SET created_at = GETDATE() WHERE created_at IS NULL;
ALTER TABLE dbo.Users ALTER COLUMN created_at DATETIME NOT NULL;

-- Loss_And_Damages
UPDATE dbo.Loss_And_Damages SET created_at = GETDATE() WHERE created_at IS NULL;
ALTER TABLE dbo.Loss_And_Damages ALTER COLUMN created_at DATETIME NOT NULL;

-- Reviews
UPDATE dbo.Reviews SET created_at = GETDATE() WHERE created_at IS NULL;
ALTER TABLE dbo.Reviews ALTER COLUMN created_at DATETIME NOT NULL;

-- Notifications
UPDATE dbo.Notifications SET created_at = GETDATE() WHERE created_at IS NULL;
ALTER TABLE dbo.Notifications ALTER COLUMN created_at DATETIME NOT NULL;
GO

-- ========================================================================
-- 9. SEED DATA MẶC ĐỊNH - ATTRACTIONS (Type, Tọa độ, Địa chỉ)
-- Chạy lại mỗi khi reset DB để phục hồi data mặc định
-- ========================================================================
USE [HotelManagementDB]
GO

-- Thêm cột type và address nếu chưa có
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Attractions') AND name = 'type')
    ALTER TABLE [dbo].[Attractions] ADD [type] NVARCHAR(100) NULL;
GO

-- Cập nhật loại hình, tọa độ và hình ảnh Unsplash chất lượng cao cho các địa điểm mặc định
UPDATE [Attractions] SET [type]=N'Ẩm thực',   [latitude]=10.9485,[longitude]=106.7911,[image_url]=N'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?q=80&w=600',   [image_public_id]=NULL    WHERE [name]=N'Chợ Trung Tâm';
UPDATE [Attractions] SET [type]=N'Thiên nhiên',[latitude]=10.9310,[longitude]=106.8320,[image_url]=N'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600',    [image_public_id]=NULL     WHERE [name]=N'Bãi Biển Chính';
UPDATE [Attractions] SET [type]=N'Di tích',   [latitude]=10.9455,[longitude]=106.8150,[image_url]=N'https://images.unsplash.com/photo-1566121318599-4c281df68f07?q=80&w=600',   [image_public_id]=NULL    WHERE [name]=N'Bảo Tàng Thành Phố';
UPDATE [Attractions] SET [type]=N'Giải trí',  [latitude]=10.9520,[longitude]=106.8080,[image_url]=N'https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=600',   [image_public_id]=NULL    WHERE [name]=N'Phố Đi Bộ';
UPDATE [Attractions] SET [type]=N'Di tích',   [latitude]=10.9380,[longitude]=106.7980,[image_url]=N'https://images.unsplash.com/photo-1528164344705-47542687000d?q=80&w=600',   [image_public_id]=NULL    WHERE [name]=N'Chùa Cổ Lịch Sử';
UPDATE [Attractions] SET [type]=N'Giải trí',  [latitude]=10.9610,[longitude]=106.8250,[image_url]=N'https://images.unsplash.com/photo-1513885045260-6b15d6754452?q=80&w=600',     [image_public_id]=NULL      WHERE [name] LIKE N'%Vui Chơi%' OR [name] LIKE N'%Giải Trí%';
UPDATE [Attractions] SET [type]=N'Thiên nhiên',[latitude]=10.9275,[longitude]=106.7850,[image_url]=N'https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=600',[image_public_id]=NULL WHERE [name] LIKE N'%Suối%';
UPDATE [Attractions] SET [type]=N'Di tích',   [latitude]=10.9190,[longitude]=106.7760,[image_url]=N'https://images.unsplash.com/photo-1508013861974-9f63471638f5?q=80&w=600',  [image_public_id]=NULL   WHERE [name] LIKE N'%Làng Nghề%';
UPDATE [Attractions] SET [type]=N'Giải trí',  [latitude]=10.9500,[longitude]=106.8190,[image_url]=N'https://images.unsplash.com/photo-1567401893930-79072f53e224?q=80&w=600',   [image_public_id]=NULL    WHERE [name] LIKE N'%Thương Mại%' OR [name] LIKE N'%Mua Sắm%';
UPDATE [Attractions] SET [type]=N'Thiên nhiên',[latitude]=10.9150,[longitude]=106.8400,[image_url]=N'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=600',   [image_public_id]=NULL    WHERE [name] LIKE N'%Ngắm%' OR [name] LIKE N'%View%';
GO

GO

PRINT N'✅ Seed data Attractions hoàn tất!';
GO

-- ============================================================
-- SEED: Cập nhật Summary cho 10 bài viết mặc định
-- ============================================================
UPDATE [Articles] SET [summary]=N'Nhà hàng mới của Asteria Resort chính thức khai trương với không gian sang trọng, thực đơn đặc sắc kết hợp tinh hoa ẩm thực địa phương và quốc tế, hứa hẹn mang đến trải nghiệm ẩm thực đỉnh cao cho thực khách.' WHERE [slug]=N'khai-truong-nha-hang';
UPDATE [Articles] SET [summary]=N'Khám phá 5 địa điểm du lịch nổi bật nhất quanh Asteria Resort — từ những bãi biển hoang sơ, khu di tích lịch sử đến những khu ẩm thực nhộn nhịp mà bạn nhất định không thể bỏ qua trong chuyến nghỉ dưỡng.' WHERE [slug]=N'5-diem-den';
UPDATE [Articles] SET [summary]=N'Vùng biển quanh resort sở hữu nguồn hải sản tươi ngon phong phú. Cùng khám phá những món ăn trứ danh từ tôm hùm, cua biển đến các đặc sản địa phương được chế biến tinh tế bởi đội ngũ đầu bếp của Asteria.' WHERE [slug]=N'mon-ngon-hai-san';
UPDATE [Articles] SET [summary]=N'Đón năm mới 2026 cùng Asteria Resort với đêm tiệc đếm ngược hoành tráng — pháo hoa rực rỡ, âm nhạc sôi động và những trải nghiệm độc đáo được chuẩn bị chu đáo để kỳ nghỉ của bạn trở nên thật đặc biệt.' WHERE [slug]=N'su-kien-nam-moi';
UPDATE [Articles] SET [summary]=N'Mùa hè 2026, Asteria Resort tung ra loạt ưu đãi hấp dẫn: giảm đến 30% giá phòng, miễn phí bữa sáng và nhiều đặc quyền dành riêng cho hội viên. Đặt phòng sớm để không bỏ lỡ cơ hội nghỉ dưỡng tuyệt vời!' WHERE [slug]=N'khuyen-mai-mua-he';
UPDATE [Articles] SET [summary]=N'Vùng đất nơi Asteria Resort tọa lạc ẩn chứa bề dày lịch sử và văn hóa đặc sắc. Hãy cùng chúng tôi khám phá những di tích, phong tục tập quán và câu chuyện hấp dẫn của người dân địa phương.' WHERE [slug]=N'lich-su-van-hoa';
UPDATE [Articles] SET [summary]=N'Hướng dẫn chi tiết các phương tiện di chuyển từ sân bay đến Asteria Resort: xe đưa đón riêng, taxi, xe buýt và ứng dụng gọi xe — giúp hành trình của bạn thuận tiện và tiết kiệm nhất.' WHERE [slug]=N'tu-san-bay-ve-ks';
UPDATE [Articles] SET [summary]=N'Cuối tuần lý tưởng tại Asteria Resort: ngâm mình trong hồ bơi vô cực, thư giãn tại spa đẳng cấp, thưởng thức cocktail hoàng hôn bên bờ biển — tất cả những bí quyết để bạn nạp lại năng lượng trọn vẹn.' WHERE [slug]=N'cach-thu-gian';
UPDATE [Articles] SET [summary]=N'Mọi thông tin bạn cần biết về quy trình nhận và trả phòng tại Asteria Resort: giờ check-in, thủ tục, chính sách hành lý, dịch vụ phòng và những lưu ý quan trọng để chuyến lưu trú diễn ra suôn sẻ.' WHERE [slug]=N'quy-dinh-nhan-tra';
UPDATE [Articles] SET [summary]=N'Bộ ảnh flycam độc quyền ghi lại vẻ đẹp toàn cảnh Asteria Resort từ trên cao — hồ bơi vô cực, bãi biển riêng, khuôn viên xanh mát và kiến trúc sang trọng hòa mình cùng thiên nhiên tuyệt mỹ.' WHERE [slug]=N'bo-anh-resort';
GO

-- ============================================================
-- SEED: 6 Bài viết mới chất lượng cao
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM Articles WHERE slug=N'nghe-thuat-thu-gian-spa-asteria')
INSERT INTO Articles (category_id,author_id,title,slug,summary,content,thumbnail_url,tags,status,published_at,created_at) VALUES
(8,1,N'Nghệ Thuật Thư Giãn — Liệu Pháp Spa Độc Đáo Tại Asteria',N'nghe-thuat-thu-gian-spa-asteria',
N'Spa tại Asteria Resort không đơn thuần là nơi massage — đó là hành trình phục hồi tâm hồn và thể xác với các liệu pháp kết hợp tinh dầu thiên nhiên, đá núi lửa và kỹ thuật cổ truyền phương Đông.',
N'<h2>Spa Asteria — Nơi Thân Thể Được Hồi Sinh</h2><p>Giữa không gian xanh mát của resort, khu Spa Asteria hiện ra như một ốc đảo yên bình tách biệt hoàn toàn khỏi nhịp sống bận rộn. Ánh sáng dịu nhẹ, tiếng nhạc thiền định và mùi hương tinh dầu sả chanh lan tỏa nhẹ nhàng ngay từ khi bước vào cửa.</p><h2>Các Liệu Trình Nổi Bật</h2><p><strong>Thạch Trị Liệu:</strong> Những viên đá bazan được nung nóng đến nhiệt độ lý tưởng, đặt dọc theo các huyệt đạo để khai thông kinh mạch, giảm đau cơ và cải thiện tuần hoàn máu.</p><p><strong>Liệu Pháp Hoa Sen:</strong> Kết hợp tắm muối hoa sen, đắp mặt nạ bùn khoáng và massage toàn thân bằng tinh dầu sen trắng.</p><blockquote>Hãy để Asteria Spa là nơi bạn tìm lại chính mình sau những tháng ngày vội vã.</blockquote>',
N'https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=1200',
N'spa,thư giãn,wellness,nghỉ dưỡng',N'ACTIVE',GETDATE(),GETDATE());

IF NOT EXISTS (SELECT 1 FROM Articles WHERE slug=N'tinh-hoa-am-thuc-mien-bien')
INSERT INTO Articles (category_id,author_id,title,slug,summary,content,thumbnail_url,tags,status,published_at,created_at) VALUES
(3,1,N'Tinh Hoa Ẩm Thực Miền Biển — Hành Trình Khơi Dậy Vị Giác',N'tinh-hoa-am-thuc-mien-bien',
N'Từ mâm cơm dân dã của ngư dân đến bàn tiệc fine dining sang trọng, ẩm thực miền biển nơi Asteria Resort tọa lạc là câu chuyện về sự kết hợp hoàn hảo giữa nguyên liệu tươi sống và nghệ thuật chế biến tinh tế.',
N'<h2>Vùng Nguyên Liệu Vàng Của Biển Cả</h2><p>Mỗi buổi sáng, ngư dân địa phương mang về những mẻ cá tươi roi rói — tôm hùm đỏ au, cua biển chắc thịt, mực ống bạc trắng và nghêu sò vừa vớt lên từ lòng đại dương. Đội bếp của Asteria Resort trực tiếp có mặt tại bến cảng để chọn lựa những nguyên liệu ngon nhất ngay từ sáng sớm.</p><h2>Những Món Ăn Không Thể Bỏ Qua</h2><p><strong>Tôm Hùm Nướng Bơ Tỏi:</strong> Tôm hùm tươi sống nướng trên than hoa, phủ bơ tỏi thơm lừng và chanh tươi.</p><p><strong>Gỏi Cá Trích Cuốn Bánh Tráng:</strong> Đặc sản địa phương — cá trích tươi sống xắt mỏng, ướp cùng sả, ớt và các loại rau thơm rừng.</p><blockquote>Ẩm thực miền biển không chỉ là thức ăn — đó là văn hóa, là câu chuyện và là ký ức.</blockquote>',
N'https://images.unsplash.com/photo-1559058789-672da06263d8?q=80&w=1200',
N'ẩm thực,hải sản,nhà hàng,đặc sản',N'ACTIVE',GETDATE(),GETDATE());

IF NOT EXISTS (SELECT 1 FROM Articles WHERE slug=N'cam-nang-du-lich-bien-bi-quyet')
INSERT INTO Articles (category_id,author_id,title,slug,summary,content,thumbnail_url,tags,status,published_at,created_at) VALUES
(2,1,N'Cẩm Nang Du Lịch Biển — 7 Bí Quyết Cho Kỳ Nghỉ Hoàn Hảo',N'cam-nang-du-lich-bien-bi-quyet',
N'Đừng để những điều nhỏ nhặt làm hỏng kỳ nghỉ mà bạn đã mong đợi cả năm. 7 bí quyết thiết thực dưới đây sẽ giúp bạn tận hưởng trọn vẹn từng khoảnh khắc tại vùng biển tuyệt đẹp của Asteria Resort.',
N'<h2>1. Đặt Phòng Sớm</h2><p>Các phòng view biển thường cháy chỗ vào cuối tuần. Đặt sớm giúp tiết kiệm đến 25%.</p><h2>2. Chọn Thời Điểm Vàng</h2><p>Mùa lý tưởng nhất là từ <strong>tháng 3 đến tháng 8</strong> — biển êm, nắng đẹp và ít mưa.</p><h2>3. Tận Dụng Dịch Vụ Miễn Phí</h2><p>Bể bơi vô cực, phòng tập gym, xe đạp, kayak và yoga bình minh — tất cả miễn phí cho khách lưu trú.</p><h2>4. Khám Phá Ẩm Thực Địa Phương</h2><p>Nhờ lễ tân gợi ý những quán ăn địa phương xung quanh để tìm hương vị chân thực.</p>',
N'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200',
N'cẩm nang,du lịch,bí quyết,mẹo hay',N'ACTIVE',GETDATE(),GETDATE());

IF NOT EXISTS (SELECT 1 FROM Articles WHERE slug=N'asteria-ra-mat-dich-vu-butler')
INSERT INTO Articles (category_id,author_id,title,slug,summary,content,thumbnail_url,tags,status,published_at,created_at) VALUES
(1,1,N'Asteria Resort Ra Mắt Dịch Vụ Butler Cá Nhân Hóa',N'asteria-ra-mat-dich-vu-butler',
N'Từ tháng 6 năm 2026, Asteria Resort chính thức triển khai dịch vụ Butler — người phục vụ riêng 24/7 sẵn sàng đáp ứng mọi nhu cầu từ đặt bàn nhà hàng, sắp xếp tour đến chuẩn bị bữa sáng theo khẩu vị cá nhân.',
N'<h2>Dịch Vụ Butler — Đẳng Cấp 5 Sao Thực Sự</h2><p>Asteria Resort nâng trải nghiệm khách lên tầm cao mới với <strong>Personal Butler</strong> — người phục vụ riêng được đào tạo chuyên nghiệp từ trường quản trị khách sạn quốc tế.</p><h2>Butler Có Thể Làm Gì?</h2><ul><li>Chuẩn bị phòng theo sở thích cá nhân trước khi bạn đến</li><li>Đặt bàn tại các nhà hàng trong và ngoài resort</li><li>Sắp xếp phương tiện di chuyển và tour khám phá</li><li>Tư vấn và đặt liệu trình Spa phù hợp</li></ul><blockquote>Lần đầu tiên tôi cảm nhận được sự khác biệt thực sự của dịch vụ 5 sao. — Nguyễn Thị Lan, Hà Nội</blockquote>',
N'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?q=80&w=1200',
N'dịch vụ,butler,5 sao,tin tức resort',N'ACTIVE',GETDATE(),GETDATE());

IF NOT EXISTS (SELECT 1 FROM Articles WHERE slug=N'le-hoi-anh-sang-mua-he')
INSERT INTO Articles (category_id,author_id,title,slug,summary,content,thumbnail_url,tags,status,published_at,created_at) VALUES
(4,1,N'Lễ Hội Ánh Sáng Mùa Hè — Đêm Hội Không Thể Quên Tại Asteria',N'le-hoi-anh-sang-mua-he',
N'Mỗi tối thứ 7 của tháng 7, bãi biển Asteria Resort biến thành sân khấu của lễ hội ánh sáng lung linh với hàng nghìn ngọn đèn lồng, màn trình diễn fire show và âm nhạc acoustic dưới bầu trời đêm đầy sao.',
N'<h2>Khi Đêm Biển Trở Thành Huyền Ảo</h2><p>Bãi biển riêng của Asteria Resort được thắp lên bằng hàng nghìn ngọn đèn lồng giấy đủ màu sắc — khoảnh khắc mà nhiều du khách gọi là <em>kỷ niệm đẹp nhất trong cuộc đời</em>.</p><h2>Chương Trình Đêm Hội</h2><p><strong>18:30</strong> — Sunset Cocktail Party trên bãi biển</p><p><strong>19:30</strong> — Fire Show mãn nhãn bởi nghệ sĩ chuyên nghiệp</p><p><strong>20:00</strong> — Thả đèn lồng và viết ước nguyện</p><p><strong>21:00</strong> — Acoustic Live Music và BBQ hải sản</p><blockquote>Những ngọn đèn lồng bay lên trời như những giấc mơ được thả tự do — trải nghiệm chỉ có tại Asteria.</blockquote>',
N'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?q=80&w=1200',
N'sự kiện,lễ hội,đêm hội,ánh sáng',N'ACTIVE',GETDATE(),GETDATE());

IF NOT EXISTS (SELECT 1 FROM Articles WHERE slug=N'kham-pha-lang-chai-co-van-hoa')
INSERT INTO Articles (category_id,author_id,title,slug,summary,content,thumbnail_url,tags,status,published_at,created_at) VALUES
(6,1,N'Khám Phá Làng Chài Cổ — Nét Văn Hóa Ngàn Năm Còn Đó',N'kham-pha-lang-chai-co-van-hoa',
N'Chỉ cách Asteria Resort 3km, làng chài cổ hơn 200 năm tuổi vẫn còn lưu giữ nguyên vẹn lối sống và văn hóa truyền thống của ngư dân — một hành trình trở về với những điều bình dị và chân thực nhất.',
N'<h2>Làng Chài Cổ — Kho Tàng Văn Hóa Sống</h2><p>Nơi này vẫn giữ nguyên nét cổ kính với những ngôi nhà mái ngói rêu phong, thuyền gỗ sơn đỏ đậu dọc bến và những người phụ nữ ngồi vá lưới dưới bóng cây.</p><h2>Một Ngày Cùng Ngư Dân</h2><p>Asteria Resort tổ chức <strong>tour một ngày làm ngư dân</strong>: thức dậy lúc 4 giờ sáng, ra khơi cùng thuyền đánh cá, học cách thả lưới và mang hải sản về nấu bữa trưa ngay trên thuyền.</p><h2>Những Điểm Nhất Định Phải Ghé</h2><ul><li><strong>Đền Ngư Phủ:</strong> 180 năm tuổi, kiến trúc kết hợp Chăm và Việt</li><li><strong>Chợ Hải Sản Buổi Sáng:</strong> Họp từ 5-7 giờ, mua hải sản tươi giá thực</li><li><strong>Xưởng Đóng Thuyền Gỗ:</strong> Nghề thủ công 150 năm của gia đình cụ Bảy</li></ul><blockquote>Văn hóa không phải thứ được trình diễn cho du khách — hãy đến bằng tâm thế của người học hỏi.</blockquote>',
N'https://images.unsplash.com/photo-1528702748617-c64d49f918af?q=80&w=1200',
N'văn hóa,làng chài,truyền thống,khám phá',N'ACTIVE',GETDATE(),GETDATE());
GO

PRINT N'✅ Seed data Articles hoàn tất!';
GO

-- ============================================================
-- SEED: SEO Metadata (meta_title + meta_description) cho 16 bài viết
-- ============================================================
UPDATE [Articles] SET [meta_title]=N'Khai Trương Nhà Hàng Mới | Asteria Resort',                  [meta_description]=N'Nhà hàng mới tại Asteria Resort khai trương với thực đơn đặc sắc kết hợp ẩm thực địa phương và quốc tế. Đặt bàn ngay hôm nay để trải nghiệm.'       WHERE [slug]=N'khai-truong-nha-hang';
UPDATE [Articles] SET [meta_title]=N'5 Điểm Đến Không Thể Bỏ Lỡ | Asteria Resort',               [meta_description]=N'Khám phá 5 địa điểm du lịch nổi bật nhất quanh Asteria Resort từ bãi biển hoang sơ đến khu di tích lịch sử và khu ẩm thực đặc sắc.'               WHERE [slug]=N'5-diem-den';
UPDATE [Articles] SET [meta_title]=N'Món Ngon Hải Sản Địa Phương | Asteria Resort',                [meta_description]=N'Khám phá đặc sản hải sản tươi ngon: tôm hùm, cua biển, mực ống — được chế biến tinh tế bởi đội ngũ đầu bếp Asteria Resort.'                       WHERE [slug]=N'mon-ngon-hai-san';
UPDATE [Articles] SET [meta_title]=N'Sự Kiện Đếm Ngược Năm Mới 2026 | Asteria Resort',            [meta_description]=N'Đón năm mới 2026 tại Asteria Resort với đêm tiệc hoành tráng, pháo hoa rực rỡ và những trải nghiệm độc đáo không thể quên.'                     WHERE [slug]=N'su-kien-nam-moi';
UPDATE [Articles] SET [meta_title]=N'Khuyến Mãi Mùa Hè 2026 | Giảm 30% | Asteria Resort',        [meta_description]=N'Ưu đãi mùa hè 2026: giảm đến 30% giá phòng, miễn phí bữa sáng và đặc quyền dành riêng cho hội viên Asteria Rewards.'                          WHERE [slug]=N'khuyen-mai-mua-he';
UPDATE [Articles] SET [meta_title]=N'Lịch Sử Văn Hóa Vùng Miền | Asteria Resort',                 [meta_description]=N'Khám phá bề dày lịch sử và văn hóa đặc sắc của vùng đất nơi Asteria Resort tọa lạc qua di tích và phong tục truyền thống.'                  WHERE [slug]=N'lich-su-van-hoa';
UPDATE [Articles] SET [meta_title]=N'Từ Sân Bay Đến Asteria Resort | Hướng Dẫn Di Chuyển',        [meta_description]=N'Hướng dẫn chi tiết các phương tiện di chuyển từ sân bay đến Asteria Resort: xe đưa đón riêng, taxi, xe buýt và ứng dụng gọi xe.'           WHERE [slug]=N'tu-san-bay-ve-ks';
UPDATE [Articles] SET [meta_title]=N'Bí Quyết Thư Giãn Cuối Tuần | Asteria Resort',               [meta_description]=N'Tận hưởng cuối tuần lý tưởng tại Asteria Resort: hồ bơi vô cực, spa đẳng cấp 5 sao và cocktail hoàng hôn bên bờ biển tuyệt đẹp.'             WHERE [slug]=N'cach-thu-gian';
UPDATE [Articles] SET [meta_title]=N'Quy Định Nhận Trả Phòng | Asteria Resort',                    [meta_description]=N'Thông tin đầy đủ về check-in, check-out tại Asteria Resort: giờ nhận phòng, chính sách hành lý và các dịch vụ tiện ích đi kèm.'               WHERE [slug]=N'quy-dinh-nhan-tra';
UPDATE [Articles] SET [meta_title]=N'Bộ Ảnh Flycam Asteria Resort | Toàn Cảnh Từ Trên Cao',       [meta_description]=N'Chiêm ngưỡng vẻ đẹp toàn cảnh Asteria Resort qua bộ ảnh flycam: hồ bơi vô cực, bãi biển riêng và kiến trúc sang trọng hòa cùng thiên nhiên.' WHERE [slug]=N'bo-anh-resort';
UPDATE [Articles] SET [meta_title]=N'Liệu Pháp Spa Đặc Sắc | Asteria Spa & Wellness',             [meta_description]=N'Trải nghiệm các liệu trình spa cao cấp tại Asteria: thạch trị liệu, liệu pháp hoa sen và massage đá nóng Himalaya phục hồi toàn diện.'        WHERE [slug]=N'nghe-thuat-thu-gian-spa-asteria';
UPDATE [Articles] SET [meta_title]=N'Ẩm Thực Miền Biển Đặc Sắc | Nhà Hàng Asteria Resort',       [meta_description]=N'Thưởng thức hải sản tươi sống mỗi ngày tại Asteria Resort: tôm hùm nướng bơ tỏi, gỏi cá trích và BBQ hải sản trên bãi biển mỗi cuối tuần.'  WHERE [slug]=N'tinh-hoa-am-thuc-mien-bien';
UPDATE [Articles] SET [meta_title]=N'7 Bí Quyết Du Lịch Biển Hoàn Hảo | Asteria Resort',         [meta_description]=N'7 bí quyết giúp bạn tận hưởng kỳ nghỉ biển trọn vẹn tại Asteria Resort: đặt phòng sớm, chọn thời điểm vàng và khám phá ẩm thực địa phương.' WHERE [slug]=N'cam-nang-du-lich-bien-bi-quyet';
UPDATE [Articles] SET [meta_title]=N'Dịch Vụ Personal Butler 24/7 | Asteria Resort 5 Sao',        [meta_description]=N'Asteria Resort ra mắt dịch vụ Butler cá nhân hóa — người phục vụ riêng 24/7 sẵn sàng đáp ứng mọi nhu cầu từ đặt bàn đến sắp xếp tour.'       WHERE [slug]=N'asteria-ra-mat-dich-vu-butler';
UPDATE [Articles] SET [meta_title]=N'Lễ Hội Ánh Sáng Mùa Hè | Sự Kiện Asteria Resort',           [meta_description]=N'Tham gia lễ hội ánh sáng mỗi tối thứ 7 tháng 7 tại Asteria Resort: hàng nghìn đèn lồng, fire show mãn nhãn và BBQ hải sản trên bãi biển.'    WHERE [slug]=N'le-hoi-anh-sang-mua-he';
UPDATE [Articles] SET [meta_title]=N'Khám Phá Làng Chài Cổ 200 Năm | Văn Hóa Địa Phương',       [meta_description]=N'Làng chài cổ cách Asteria Resort 3km lưu giữ văn hóa ngư dân truyền thống: đền Ngư Phủ 180 năm, chợ hải sản và xưởng đóng thuyền gỗ thủ công.' WHERE [slug]=N'kham-pha-lang-chai-co-van-hoa';
GO

PRINT N'✅ Seed data SEO Metadata Articles hoàn tất!';
GO

-- ============================================================
-- SEED: Thumbnail Cloudinary cho 16 bài viết
-- ============================================================
UPDATE [Articles] SET [thumbnail_url]=N'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=800', [thumbnail_public_id]=NULL WHERE [slug]=N'khai-truong-nha-hang';
UPDATE [Articles] SET [thumbnail_url]=N'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=800', [thumbnail_public_id]=NULL WHERE [slug]=N'5-diem-den';
UPDATE [Articles] SET [thumbnail_url]=N'https://images.unsplash.com/photo-1534080391025-0979e8304b2e?q=80&w=800', [thumbnail_public_id]=NULL WHERE [slug]=N'mon-ngon-hai-san';
UPDATE [Articles] SET [thumbnail_url]=N'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=800', [thumbnail_public_id]=NULL WHERE [slug]=N'su-kien-nam-moi';
UPDATE [Articles] SET [thumbnail_url]=N'https://images.unsplash.com/photo-1501854140801-50d01698950b?q=80&w=800', [thumbnail_public_id]=NULL WHERE [slug]=N'khuyen-mai-mua-he';
UPDATE [Articles] SET [thumbnail_url]=N'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=800', [thumbnail_public_id]=NULL WHERE [slug]=N'lich-su-van-hoa';
UPDATE [Articles] SET [thumbnail_url]=N'https://images.unsplash.com/photo-1542282088-fe8426682b8f?q=80&w=800', [thumbnail_public_id]=NULL WHERE [slug]=N'tu-san-bay-ve-ks';
UPDATE [Articles] SET [thumbnail_url]=N'https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=800', [thumbnail_public_id]=NULL WHERE [slug]=N'cach-thu-gian';
UPDATE [Articles] SET [thumbnail_url]=N'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=800', [thumbnail_public_id]=NULL WHERE [slug]=N'quy-dinh-nhan-tra';
UPDATE [Articles] SET [thumbnail_url]=N'https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=800', [thumbnail_public_id]=NULL WHERE [slug]=N'bo-anh-resort';
UPDATE [Articles] SET [thumbnail_url]=N'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=800', [thumbnail_public_id]=NULL WHERE [slug]=N'nghe-thuat-thu-gian-spa-asteria';
UPDATE [Articles] SET [thumbnail_url]=N'https://images.unsplash.com/photo-1559058789-672da06263d8?q=80&w=800', [thumbnail_public_id]=NULL WHERE [slug]=N'tinh-hoa-am-thuc-mien-bien';
UPDATE [Articles] SET [thumbnail_url]=N'https://images.unsplash.com/photo-1519046904884-53103b34b206?q=80&w=800', [thumbnail_public_id]=NULL WHERE [slug]=N'cam-nang-du-lich-bien-bi-quyet';
UPDATE [Articles] SET [thumbnail_url]=N'https://images.unsplash.com/photo-1485217988980-11786ced9454?q=80&w=800', [thumbnail_public_id]=NULL WHERE [slug]=N'asteria-ra-mat-dich-vu-butler';
UPDATE [Articles] SET [thumbnail_url]=N'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=800', [thumbnail_public_id]=NULL WHERE [slug]=N'le-hoi-anh-sang-mua-he';
UPDATE [Articles] SET [thumbnail_url]=N'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800', [thumbnail_public_id]=NULL WHERE [slug]=N'kham-pha-lang-chai-co-van-hoa';
GO

PRINT N'✅ Seed data Thumbnails Articles hoàn tất!';
GO

-- ========================================================================
-- 6. TỐI ƯU HÓA HIỆU SUẤT (INDEXES)
-- ========================================================================
CREATE NONCLUSTERED INDEX [IX_Users_Email] ON [dbo].[Users]([email]);
CREATE NONCLUSTERED INDEX [IX_Bookings_BookingCode] ON [dbo].[Bookings]([booking_code]);
CREATE NONCLUSTERED INDEX [IX_Bookings_Status] ON [dbo].[Bookings]([status]);
CREATE NONCLUSTERED INDEX [IX_Invoices_BookingId] ON [dbo].[Invoices]([booking_id]);
CREATE NONCLUSTERED INDEX [IX_Invoices_Status] ON [dbo].[Invoices]([status]);
CREATE NONCLUSTERED INDEX [IX_BookingDetails_BookingId] ON [dbo].[Booking_Details]([booking_id]);
CREATE NONCLUSTERED INDEX [IX_BookingDetails_RoomId] ON [dbo].[Booking_Details]([room_id]);
GO

-- ========================================================================
-- 7. TỐI ƯU HÓA HIỆU SUẤT (INDEXES)
-- ========================================================================
CREATE NONCLUSTERED INDEX [IX_Users_Email] ON [dbo].[Users]([email]);
CREATE NONCLUSTERED INDEX [IX_Bookings_BookingCode] ON [dbo].[Bookings]([booking_code]);
CREATE NONCLUSTERED INDEX [IX_Bookings_Status] ON [dbo].[Bookings]([status]);
CREATE NONCLUSTERED INDEX [IX_Invoices_BookingId] ON [dbo].[Invoices]([booking_id]);
CREATE NONCLUSTERED INDEX [IX_Invoices_Status] ON [dbo].[Invoices]([status]);
CREATE NONCLUSTERED INDEX [IX_BookingDetails_BookingId] ON [dbo].[Booking_Details]([booking_id]);
CREATE NONCLUSTERED INDEX [IX_BookingDetails_RoomId] ON [dbo].[Booking_Details]([room_id]);
GO

-- ============================================================
-- 10. THÊM CỘT GALLERY ẢNH CHO BẢNG Attractions
--     Lưu danh sách ảnh gallery dạng JSON array string
-- ============================================================
USE [HotelManagementDB];
GO

IF COL_LENGTH('dbo.Attractions', 'GalleryImages') IS NULL
BEGIN
    ALTER TABLE [dbo].[Attractions] ADD [GalleryImages] NVARCHAR(MAX) NULL;
    PRINT N'✅ Đã thêm cột GalleryImages vào bảng Attractions.';
END
ELSE
    PRINT N'ℹ️  Cột GalleryImages đã tồn tại.';

IF COL_LENGTH('dbo.Attractions', 'GalleryPublicIds') IS NULL
BEGIN
    ALTER TABLE [dbo].[Attractions] ADD [GalleryPublicIds] NVARCHAR(MAX) NULL;
    PRINT N'✅ Đã thêm cột GalleryPublicIds vào bảng Attractions.';
END
ELSE
    PRINT N'ℹ️  Cột GalleryPublicIds đã tồn tại.';
GO

-- ============================================================
-- MANY-TO-MANY: Article <-> ArticleCategory mapping table
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Article_Category_Mappings')
BEGIN
    CREATE TABLE [dbo].[Article_Category_Mappings] (
        [article_id] INT NOT NULL,
        [category_id] INT NOT NULL,
        CONSTRAINT [PK_ArticleCategoryMappings] PRIMARY KEY ([article_id], [category_id]),
        CONSTRAINT [FK_ACM_Articles] FOREIGN KEY ([article_id]) REFERENCES [dbo].[Articles]([id]) ON DELETE CASCADE,
        CONSTRAINT [FK_ACM_Categories] FOREIGN KEY ([category_id]) REFERENCES [dbo].[Article_Categories]([id]) ON DELETE CASCADE
    );
    INSERT INTO [dbo].[Article_Category_Mappings] ([article_id], [category_id])
    SELECT [id], [category_id] FROM [dbo].[Articles] WHERE [category_id] IS NOT NULL;
END
