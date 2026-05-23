using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HotelERP.BE.Infrastructure.Data;
using HotelERP.BE.Domain.Models;
using System;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace HotelERP.BE.Controllers;

[Route("api/[controller]")]
[ApiController]
public class BookingController : ControllerBase
{
    private readonly HotelDbContext _context;

    public BookingController(HotelDbContext context)
    {
        _context = context;
    }

    [HttpGet("available")]
    public async Task<IActionResult> CheckAvailability([FromQuery] DateTime checkIn, [FromQuery] DateTime checkOut, [FromQuery] int guests)
    {
        if (checkOut <= checkIn)
        {
            return BadRequest(new { message = "Ngày Check-out phải sau ngày Check-in." });
        }

        var bookedRoomIds = await _context.BookingDetails
            .Include(bd => bd.Booking)
            .Where(bd => bd.Booking != null && bd.Booking.Status != "Cancelled" && bd.Booking.Status != "CheckedOut")
            .Where(bd => checkIn < bd.CheckOutDate && checkOut > bd.CheckInDate)
            .Select(bd => bd.RoomId)
            .OfType<int>()
            .ToListAsync();

        var availableRooms = await _context.Rooms
            .Include(r => r.RoomType)
            .Where(r => !bookedRoomIds.Contains(r.Id))
            .Select(r => new 
            {
                r.Id,
                r.RoomNumber,
                RoomTypeName = r.RoomType != null ? r.RoomType.Name : string.Empty,
                PricePerNight = r.RoomType != null ? r.RoomType.BasePrice : 0
            })
            .ToListAsync();

        return Ok(availableRooms);
    }

    public record CreateBookingDto(int RoomId, string GuestName, string GuestPhone, string GuestEmail, DateTime CheckInDate, DateTime CheckOutDate, decimal TotalAmount);

    [HttpPost]
    public async Task<IActionResult> CreateBooking([FromBody] CreateBookingDto dto)
    {
        var newBooking = new Booking
        {
            GuestName = dto.GuestName,
            GuestPhone = dto.GuestPhone,
            GuestEmail = dto.GuestEmail,
            BookingCode = "BKG" + DateTime.UtcNow.ToString("yyyyMMddHHmmss"),
            BookingSubtotal = dto.TotalAmount,
            FinalAmount = dto.TotalAmount,
            DepositAmount = 0,
            Status = "Pending",
            PaymentStatus = "Unpaid",
            CreatedAt = DateTime.UtcNow,
            BookingDetails = new List<BookingDetail>
            {
                new BookingDetail
                {
                    RoomId = dto.RoomId,
                    CheckInDate = dto.CheckInDate,
                    CheckOutDate = dto.CheckOutDate,
                    PricePerNight = dto.TotalAmount / (decimal)Math.Max(1, (dto.CheckOutDate - dto.CheckInDate).TotalDays),
                    AdultsCount = 1,
                    ChildrenCount = 0,
                    Nights = (int)Math.Max(1, (dto.CheckOutDate - dto.CheckInDate).TotalDays),
                    LineTotal = dto.TotalAmount,
                    Status = "Pending",
                    SettlementStatus = "Unsettled",
                    CreatedAt = DateTime.UtcNow
                }
            }
        };

        _context.Bookings.Add(newBooking);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Đặt phòng thành công!", data = newBooking });
    }

    [HttpGet]
    public async Task<IActionResult> GetAllBookings()
    {
        var bookings = await _context.Bookings
            .Include(b => b.BookingDetails)
                .ThenInclude(bd => bd.Room)
            .OrderByDescending(b => b.CreatedAt)
            .ToListAsync();

        return Ok(bookings);
    }
}