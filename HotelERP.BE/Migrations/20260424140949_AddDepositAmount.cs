using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HotelERP.BE.Migrations
{
    /// <inheritdoc />
    public partial class AddDepositAmount : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
// migrationBuilder.DropForeignKey(
//     name: "FK_Notifications_Users_UserId",
//     table: "Notifications");

// migrationBuilder.DropIndex(
//     name: "IX_Vouchers_StatusDates",
//     table: "Vouchers");

// migrationBuilder.DropPrimaryKey(
//     name: "PK__Room_Inv__3213E83F11FADD17",
//     table: "Room_Inventory");

// migrationBuilder.DropIndex(
//     name: "UQ_Invoices_Code",
//     table: "Invoices");

//             migrationBuilder.DropColumn(
//                 name: "created_at",
//                 table: "Vouchers")
//                 .Annotation("Relational:DefaultConstraintName", "DF_Vouchers_CreatedAt");
//
//             migrationBuilder.DropColumn(
//                 name: "min_booking_amount",
//                 table: "Vouchers");
//
//             migrationBuilder.DropColumn(
//                 name: "status",
//                 table: "Vouchers")
//                 .Annotation("Relational:DefaultConstraintName", "DF_Vouchers_Status");
//
//             migrationBuilder.DropColumn(
//                 name: "updated_at",
//                 table: "Vouchers");

            migrationBuilder.DropColumn(
                name: "used_count",
                table: "Vouchers");

            migrationBuilder.DropColumn(
                name: "created_at",
                table: "RoomType_Amenities")
                .Annotation("Relational:DefaultConstraintName", "DF_RoomTypeAmenities_CreatedAt");

            migrationBuilder.DropColumn(
                name: "created_at",
                table: "Room_Inventory")
                .Annotation("Relational:DefaultConstraintName", "DF_RoomInventory_CreatedAt");

            migrationBuilder.DropColumn(
                name: "item_name",
                table: "Room_Inventory");

            migrationBuilder.DropColumn(
                name: "status",
                table: "Room_Inventory")
                .Annotation("Relational:DefaultConstraintName", "DF_RoomInventory_Status");

            migrationBuilder.DropColumn(
                name: "unit",
                table: "Room_Inventory");

            migrationBuilder.DropColumn(
                name: "updated_at",
                table: "Room_Inventory");

            migrationBuilder.RenameColumn(
                name: "Type",
                table: "Notifications",
                newName: "type");

            migrationBuilder.RenameColumn(
                name: "Title",
                table: "Notifications",
                newName: "title");

            migrationBuilder.RenameColumn(
                name: "Content",
                table: "Notifications",
                newName: "content");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "Notifications",
                newName: "id");

            migrationBuilder.RenameColumn(
                name: "UserId",
                table: "Notifications",
                newName: "user_id");

            migrationBuilder.RenameColumn(
                name: "ReferenceLink",
                table: "Notifications",
                newName: "reference_link");

            migrationBuilder.RenameColumn(
                name: "IsRead",
                table: "Notifications",
                newName: "is_read");

            migrationBuilder.RenameColumn(
                name: "CreatedAt",
                table: "Notifications",
                newName: "created_at");

            migrationBuilder.RenameIndex(
                name: "IX_Notifications_UserId",
                table: "Notifications",
                newName: "IX_Notifications_user_id");

            migrationBuilder.AlterColumn<decimal>(
                name: "min_booking_value",
                table: "Vouchers",
                type: "decimal(18,2)",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,2)");

            migrationBuilder.AlterColumn<int>(
                name: "quantity",
                table: "Room_Inventory",
                type: "int",
                nullable: false,
                defaultValue: 1,
                oldClrType: typeof(int),
                oldType: "int",
                oldDefaultValue: 1)
                .OldAnnotation("Relational:DefaultConstraintName", "DF_RoomInventory_Quantity");

            migrationBuilder.AlterColumn<string>(
                name: "item_type",
                table: "Room_Inventory",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "Asset",
                oldClrType: typeof(string),
                oldType: "nvarchar(20)",
                oldMaxLength: 20,
                oldDefaultValue: "ASSET")
                .OldAnnotation("Relational:DefaultConstraintName", "DF_RoomInventory_ItemType");

            migrationBuilder.AddColumn<int>(
                name: "EquipmentId",
                table: "Room_Inventory",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "is_active",
                table: "Room_Inventory",
                type: "bit",
                nullable: true,
                defaultValue: true);

            migrationBuilder.AddColumn<string>(
                name: "note",
                table: "Room_Inventory",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "total_service_amount",
                table: "Invoices",
                type: "decimal(18,2)",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,2)");

            migrationBuilder.AlterColumn<decimal>(
                name: "total_room_amount",
                table: "Invoices",
                type: "decimal(18,2)",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,2)");

            migrationBuilder.AlterColumn<decimal>(
                name: "total_damage_amount",
                table: "Invoices",
                type: "decimal(18,2)",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,2)");

            migrationBuilder.AlterColumn<decimal>(
                name: "tax_amount",
                table: "Invoices",
                type: "decimal(18,2)",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,2)");

            migrationBuilder.AlterColumn<string>(
                name: "status",
                table: "Invoices",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true,
                defaultValue: "Draft",
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50,
                oldDefaultValue: "Draft")
                .Annotation("Relational:DefaultConstraintName", "DF_Invoices_Status")
                .OldAnnotation("Relational:DefaultConstraintName", "DF_Invoices_Status");

            migrationBuilder.AlterColumn<decimal>(
                name: "refund_amount",
                table: "Invoices",
                type: "decimal(18,2)",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,2)");

            migrationBuilder.AlterColumn<decimal>(
                name: "manual_adjustment_amount",
                table: "Invoices",
                type: "decimal(18,2)",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,2)");

            migrationBuilder.AlterColumn<string>(
                name: "invoice_code",
                table: "Invoices",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50);

            migrationBuilder.AlterColumn<decimal>(
                name: "final_total",
                table: "Invoices",
                type: "decimal(18,2)",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,2)");

            migrationBuilder.AlterColumn<decimal>(
                name: "discount_amount",
                table: "Invoices",
                type: "decimal(18,2)",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,2)");

            migrationBuilder.AlterColumn<DateTime>(
                name: "created_at",
                table: "Invoices",
                type: "datetime",
                nullable: true,
                defaultValueSql: "(getdate())",
                oldClrType: typeof(DateTime),
                oldType: "datetime",
                oldDefaultValueSql: "(getdate())")
                .Annotation("Relational:DefaultConstraintName", "DF_Invoices_CreatedAt")
                .OldAnnotation("Relational:DefaultConstraintName", "DF_Invoices_CreatedAt");

            migrationBuilder.AddColumn<decimal>(
                name: "DepositAmount",
                table: "Bookings",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<DateTime>(
                name: "settled_at",
                table: "Booking_Details",
                type: "datetime",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "settlement_status",
                table: "Booking_Details",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "UNPAID")
                .Annotation("Relational:DefaultConstraintName", "DF_BookingDetails_SettlementStatus");

            migrationBuilder.AddPrimaryKey(
                name: "PKRoom_Inv3213E83F11FADD17",
                table: "Room_Inventory",
                column: "id");

            migrationBuilder.CreateTable(
                name: "Equipments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ItemCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    Category = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Unit = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    TotalQuantity = table.Column<int>(type: "int", nullable: false),
                    InUseQuantity = table.Column<int>(type: "int", nullable: false),
                    DamagedQuantity = table.Column<int>(type: "int", nullable: false),
                    LiquidatedQuantity = table.Column<int>(type: "int", nullable: false),
                    BasePrice = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    DefaultPriceIfLost = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Supplier = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime", nullable: true),
                    ImageUrl = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Equipments", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Invoice_Booking_Details",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    invoice_id = table.Column<int>(type: "int", nullable: false),
                    booking_detail_id = table.Column<int>(type: "int", nullable: false),
                    room_charge = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    service_charge = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    damage_charge = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    discount_amount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    extra_fee_amount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    tax_amount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    line_total = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: false, defaultValueSql: "(getdate())")
                        .Annotation("Relational:DefaultConstraintName", "DF_InvoiceBookingDetails_CreatedAt")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__InvoiceBookingDetails__3213E83F", x => x.id);
                    table.ForeignKey(
                        name: "FK_InvoiceBookingDetails_BookingDetails",
                        column: x => x.booking_detail_id,
                        principalTable: "Booking_Details",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_InvoiceBookingDetails_Invoices",
                        column: x => x.invoice_id,
                        principalTable: "Invoices",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "User_Permissions",
                columns: table => new
                {
                    user_id = table.Column<int>(type: "int", nullable: false),
                    permission_id = table.Column<int>(type: "int", nullable: false),
                    is_granted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_User_Permissions", x => new { x.user_id, x.permission_id });
                    table.ForeignKey(
                        name: "FK_User_Permissions_Permissions_permission_id",
                        column: x => x.permission_id,
                        principalTable: "Permissions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_User_Permissions_Users_user_id",
                        column: x => x.user_id,
                        principalTable: "Users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Room_Inventory_EquipmentId",
                table: "Room_Inventory",
                column: "EquipmentId");

            migrationBuilder.CreateIndex(
                name: "UQ_Invoices_Code",
                table: "Invoices",
                column: "invoice_code",
                unique: true,
                filter: "[invoice_code] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_InvoiceBookingDetails_BookingDetail",
                table: "Invoice_Booking_Details",
                column: "booking_detail_id");

            migrationBuilder.CreateIndex(
                name: "UQ_InvoiceBookingDetails_InvoiceDetail",
                table: "Invoice_Booking_Details",
                columns: new[] { "invoice_id", "booking_detail_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_User_Permissions_permission_id",
                table: "User_Permissions",
                column: "permission_id");

            migrationBuilder.AddForeignKey(
                name: "FK_Notifications_Users_user_id",
                table: "Notifications",
                column: "user_id",
                principalTable: "Users",
                principalColumn: "id");

            migrationBuilder.AddForeignKey(
                name: "FK_Room_Inventory_Equipments_EquipmentId",
                table: "Room_Inventory",
                column: "EquipmentId",
                principalTable: "Equipments",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Notifications_Users_user_id",
                table: "Notifications");

            migrationBuilder.DropForeignKey(
                name: "FK_Room_Inventory_Equipments_EquipmentId",
                table: "Room_Inventory");

            migrationBuilder.DropTable(
                name: "Equipments");

            migrationBuilder.DropTable(
                name: "Invoice_Booking_Details");

            migrationBuilder.DropTable(
                name: "User_Permissions");

            migrationBuilder.DropPrimaryKey(
                name: "PKRoom_Inv3213E83F11FADD17",
                table: "Room_Inventory");

            migrationBuilder.DropIndex(
                name: "IX_Room_Inventory_EquipmentId",
                table: "Room_Inventory");

            migrationBuilder.DropIndex(
                name: "UQ_Invoices_Code",
                table: "Invoices");

            migrationBuilder.DropColumn(
                name: "EquipmentId",
                table: "Room_Inventory");

            migrationBuilder.DropColumn(
                name: "is_active",
                table: "Room_Inventory");

            migrationBuilder.DropColumn(
                name: "note",
                table: "Room_Inventory");

            migrationBuilder.DropColumn(
                name: "DepositAmount",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "settled_at",
                table: "Booking_Details");

            migrationBuilder.DropColumn(
                name: "settlement_status",
                table: "Booking_Details")
                .Annotation("Relational:DefaultConstraintName", "DF_BookingDetails_SettlementStatus");

            migrationBuilder.RenameColumn(
                name: "type",
                table: "Notifications",
                newName: "Type");

            migrationBuilder.RenameColumn(
                name: "title",
                table: "Notifications",
                newName: "Title");

            migrationBuilder.RenameColumn(
                name: "content",
                table: "Notifications",
                newName: "Content");

            migrationBuilder.RenameColumn(
                name: "id",
                table: "Notifications",
                newName: "Id");

            migrationBuilder.RenameColumn(
                name: "user_id",
                table: "Notifications",
                newName: "UserId");

            migrationBuilder.RenameColumn(
                name: "reference_link",
                table: "Notifications",
                newName: "ReferenceLink");

            migrationBuilder.RenameColumn(
                name: "is_read",
                table: "Notifications",
                newName: "IsRead");

            migrationBuilder.RenameColumn(
                name: "created_at",
                table: "Notifications",
                newName: "CreatedAt");

            migrationBuilder.RenameIndex(
                name: "IX_Notifications_user_id",
                table: "Notifications",
                newName: "IX_Notifications_UserId");

            migrationBuilder.AlterColumn<decimal>(
                name: "min_booking_value",
                table: "Vouchers",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,2)",
                oldNullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "created_at",
                table: "Vouchers",
                type: "datetime",
                nullable: false,
                defaultValueSql: "(getdate())")
                .Annotation("Relational:DefaultConstraintName", "DF_Vouchers_CreatedAt");

            migrationBuilder.AddColumn<decimal>(
                name: "min_booking_amount",
                table: "Vouchers",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "status",
                table: "Vouchers",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "ACTIVE")
                .Annotation("Relational:DefaultConstraintName", "DF_Vouchers_Status");

            migrationBuilder.AddColumn<DateTime>(
                name: "updated_at",
                table: "Vouchers",
                type: "datetime",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "used_count",
                table: "Vouchers",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "created_at",
                table: "RoomType_Amenities",
                type: "datetime",
                nullable: false,
                defaultValueSql: "(getdate())")
                .Annotation("Relational:DefaultConstraintName", "DF_RoomTypeAmenities_CreatedAt");

            migrationBuilder.AlterColumn<int>(
                name: "quantity",
                table: "Room_Inventory",
                type: "int",
                nullable: false,
                defaultValue: 1,
                oldClrType: typeof(int),
                oldType: "int",
                oldDefaultValue: 1)
                .Annotation("Relational:DefaultConstraintName", "DF_RoomInventory_Quantity");

            migrationBuilder.AlterColumn<string>(
                name: "item_type",
                table: "Room_Inventory",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "ASSET",
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50,
                oldDefaultValue: "Asset")
                .Annotation("Relational:DefaultConstraintName", "DF_RoomInventory_ItemType");

            migrationBuilder.AddColumn<DateTime>(
                name: "created_at",
                table: "Room_Inventory",
                type: "datetime",
                nullable: false,
                defaultValueSql: "(getdate())")
                .Annotation("Relational:DefaultConstraintName", "DF_RoomInventory_CreatedAt");

            migrationBuilder.AddColumn<string>(
                name: "item_name",
                table: "Room_Inventory",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "status",
                table: "Room_Inventory",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "ACTIVE")
                .Annotation("Relational:DefaultConstraintName", "DF_RoomInventory_Status");

            migrationBuilder.AddColumn<string>(
                name: "unit",
                table: "Room_Inventory",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "updated_at",
                table: "Room_Inventory",
                type: "datetime",
                nullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "total_service_amount",
                table: "Invoices",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,2)",
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "total_room_amount",
                table: "Invoices",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,2)",
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "total_damage_amount",
                table: "Invoices",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,2)",
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "tax_amount",
                table: "Invoices",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,2)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "status",
                table: "Invoices",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "Draft",
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50,
                oldNullable: true,
                oldDefaultValue: "Draft")
                .Annotation("Relational:DefaultConstraintName", "DF_Invoices_Status")
                .OldAnnotation("Relational:DefaultConstraintName", "DF_Invoices_Status");

            migrationBuilder.AlterColumn<decimal>(
                name: "refund_amount",
                table: "Invoices",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,2)",
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "manual_adjustment_amount",
                table: "Invoices",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,2)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "invoice_code",
                table: "Invoices",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50,
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "final_total",
                table: "Invoices",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,2)",
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "discount_amount",
                table: "Invoices",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,2)",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "created_at",
                table: "Invoices",
                type: "datetime",
                nullable: false,
                defaultValueSql: "(getdate())",
                oldClrType: typeof(DateTime),
                oldType: "datetime",
                oldNullable: true,
                oldDefaultValueSql: "(getdate())")
                .Annotation("Relational:DefaultConstraintName", "DF_Invoices_CreatedAt")
                .OldAnnotation("Relational:DefaultConstraintName", "DF_Invoices_CreatedAt");

            migrationBuilder.AddPrimaryKey(
                name: "PK__Room_Inv__3213E83F11FADD17",
                table: "Room_Inventory",
                column: "id");

            migrationBuilder.CreateIndex(
                name: "IX_Vouchers_StatusDates",
                table: "Vouchers",
                columns: new[] { "status", "valid_from", "valid_to" });

            migrationBuilder.CreateIndex(
                name: "UQ_Invoices_Code",
                table: "Invoices",
                column: "invoice_code",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Notifications_Users_UserId",
                table: "Notifications",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "id");
        }
    }
}
