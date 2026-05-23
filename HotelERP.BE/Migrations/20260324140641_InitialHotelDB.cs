using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HotelERP.BE.Migrations
{
    /// <inheritdoc />
    public partial class InitialHotelDB : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {

        }   

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Articles");

            migrationBuilder.DropTable(
                name: "Attractions");

            migrationBuilder.DropTable(
                name: "Audit_Logs");

            migrationBuilder.DropTable(
                name: "Loss_And_Damages");

            migrationBuilder.DropTable(
                name: "Loyalty_Point_Histories");

            migrationBuilder.DropTable(
                name: "Order_Service_Details");

            migrationBuilder.DropTable(
                name: "Payments");

            migrationBuilder.DropTable(
                name: "Refresh_Tokens");

            migrationBuilder.DropTable(
                name: "Reviews");

            migrationBuilder.DropTable(
                name: "Role_Permissions");

            migrationBuilder.DropTable(
                name: "Room_Images");

            migrationBuilder.DropTable(
                name: "RoomType_Amenities");

            migrationBuilder.DropTable(
                name: "Article_Categories");

            migrationBuilder.DropTable(
                name: "Room_Inventory");

            migrationBuilder.DropTable(
                name: "Order_Services");

            migrationBuilder.DropTable(
                name: "Services");

            migrationBuilder.DropTable(
                name: "Invoices");

            migrationBuilder.DropTable(
                name: "Permissions");

            migrationBuilder.DropTable(
                name: "Amenities");

            migrationBuilder.DropTable(
                name: "Booking_Details");

            migrationBuilder.DropTable(
                name: "Service_Categories");

            migrationBuilder.DropTable(
                name: "Bookings");

            migrationBuilder.DropTable(
                name: "Rooms");

            migrationBuilder.DropTable(
                name: "Users");

            migrationBuilder.DropTable(
                name: "Vouchers");

            migrationBuilder.DropTable(
                name: "Room_Types");

            migrationBuilder.DropTable(
                name: "Memberships");

            migrationBuilder.DropTable(
                name: "Roles");
        }
    }
}
