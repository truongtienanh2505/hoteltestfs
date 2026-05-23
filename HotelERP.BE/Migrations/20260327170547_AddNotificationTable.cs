using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HotelERP.BE.Migrations
{
    /// <inheritdoc />
    public partial class AddNotificationTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {

            migrationBuilder.CreateTable(
                name: "Notifications",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: true),
                    Title = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    Content = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Type = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    ReferenceLink = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    IsRead = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Notifications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Notifications_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "id");
                });
        }              


        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_LoyaltyPointHistories_Bookings",
                table: "Loyalty_Point_Histories");

            migrationBuilder.DropForeignKey(
                name: "FK_LoyaltyPointHistories_Users",
                table: "Loyalty_Point_Histories");

            migrationBuilder.DropTable(
                name: "Notifications");

            migrationBuilder.DropPrimaryKey(
                name: "PKLoss_And3213E83FCAB03BE1",
                table: "Loss_And_Damages");

            migrationBuilder.DropIndex(
                name: "IX_Loss_And_Damages_room_id",
                table: "Loss_And_Damages");

            migrationBuilder.AlterColumn<string>(
                name: "status",
                table: "Loss_And_Damages",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "OPEN",
                oldClrType: typeof(string),
                oldType: "nvarchar(20)",
                oldMaxLength: 20,
                oldNullable: true,
                oldDefaultValue: "OPEN")
                .Annotation("Relational:DefaultConstraintName", "DF_LossAndDamages_Status");

            migrationBuilder.AlterColumn<DateTime>(
                name: "created_at",
                table: "Loss_And_Damages",
                type: "datetime",
                nullable: false,
                defaultValueSql: "(getdate())",
                oldClrType: typeof(DateTime),
                oldType: "datetime",
                oldNullable: true,
                oldDefaultValueSql: "(getdate())")
                .Annotation("Relational:DefaultConstraintName", "DF_LossAndDamages_CreatedAt");

            migrationBuilder.AddPrimaryKey(
                name: "PK__Loss_And__3213E83FCAB03BE1",
                table: "Loss_And_Damages",
                column: "id");
        }
    }
}
