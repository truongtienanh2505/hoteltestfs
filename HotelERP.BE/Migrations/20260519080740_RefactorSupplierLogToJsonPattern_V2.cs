using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HotelERP.BE.Migrations
{
    /// <inheritdoc />
    public partial class RefactorSupplierLogToJsonPattern_V2 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Notes",
                table: "EquipmentSupplierLogs");

            migrationBuilder.DropColumn(
                name: "Quantity",
                table: "EquipmentSupplierLogs");

            migrationBuilder.DropColumn(
                name: "SupplierName",
                table: "EquipmentSupplierLogs");

            migrationBuilder.DropColumn(
                name: "UnitPrice",
                table: "EquipmentSupplierLogs");

            migrationBuilder.RenameColumn(
                name: "ImportedAt",
                table: "EquipmentSupplierLogs",
                newName: "LogDate");

            migrationBuilder.AddColumn<string>(
                name: "LogData",
                table: "EquipmentSupplierLogs",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "UserId",
                table: "EquipmentSupplierLogs",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_EquipmentSupplierLogs_UserId",
                table: "EquipmentSupplierLogs",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_EquipmentSupplierLogs_Users",
                table: "EquipmentSupplierLogs",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_EquipmentSupplierLogs_Users",
                table: "EquipmentSupplierLogs");

            migrationBuilder.DropIndex(
                name: "IX_EquipmentSupplierLogs_UserId",
                table: "EquipmentSupplierLogs");

            migrationBuilder.DropColumn(
                name: "LogData",
                table: "EquipmentSupplierLogs");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "EquipmentSupplierLogs");

            migrationBuilder.RenameColumn(
                name: "LogDate",
                table: "EquipmentSupplierLogs",
                newName: "ImportedAt");

            migrationBuilder.AddColumn<string>(
                name: "Notes",
                table: "EquipmentSupplierLogs",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Quantity",
                table: "EquipmentSupplierLogs",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "SupplierName",
                table: "EquipmentSupplierLogs",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "UnitPrice",
                table: "EquipmentSupplierLogs",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);
        }
    }
}
