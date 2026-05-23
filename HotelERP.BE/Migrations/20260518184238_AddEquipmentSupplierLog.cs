using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HotelERP.BE.Migrations
{
    /// <inheritdoc />
    public partial class AddEquipmentSupplierLog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "EquipmentSupplierLogs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EquipmentId = table.Column<int>(type: "int", nullable: false),
                    SupplierName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    ImportedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EquipmentSupplierLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EquipmentSupplierLogs_Equipments_EquipmentId",
                        column: x => x.EquipmentId,
                        principalTable: "Equipments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Role_Dashboard_Period_States",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    role_id = table.Column<int>(type: "int", nullable: false),
                    role_name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    dashboard_code = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    dashboard_title = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    period_type = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    period_key = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    period_start = table.Column<DateTime>(type: "datetime2", nullable: false),
                    period_end = table.Column<DateTime>(type: "datetime2", nullable: false),
                    dashboard_json = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    comparison_json = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    is_current = table.Column<bool>(type: "bit", nullable: false),
                    last_event_type = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    last_event_source = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    last_event_ref_id = table.Column<int>(type: "int", nullable: true),
                    version = table.Column<int>(type: "int", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime2", nullable: false),
                    closed_at = table.Column<DateTime>(type: "datetime2", nullable: true),
                    updated_by = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Role_Dashboard_Period_States", x => x.id);
                    table.ForeignKey(
                        name: "FK_RoleDashboardPeriod_Roles",
                        column: x => x.role_id,
                        principalTable: "Roles",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_RoleDashboardPeriod_UpdatedBy",
                        column: x => x.updated_by,
                        principalTable: "Users",
                        principalColumn: "id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_EquipmentSupplierLogs_EquipmentId",
                table: "EquipmentSupplierLogs",
                column: "EquipmentId");

            migrationBuilder.CreateIndex(
                name: "IX_Role_Dashboard_Period_States_role_id",
                table: "Role_Dashboard_Period_States",
                column: "role_id");

            migrationBuilder.CreateIndex(
                name: "IX_Role_Dashboard_Period_States_updated_by",
                table: "Role_Dashboard_Period_States",
                column: "updated_by");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EquipmentSupplierLogs");

            migrationBuilder.DropTable(
                name: "Role_Dashboard_Period_States");
        }
    }
}
