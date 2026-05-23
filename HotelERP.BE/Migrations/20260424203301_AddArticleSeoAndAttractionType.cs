using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HotelERP.BE.Migrations
{
    /// <inheritdoc />
    public partial class AddArticleSeoAndAttractionType : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Type",
                table: "Attractions",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Type",
                table: "Attractions");
        }
    }
}
