using HotelERP.BE.Domain.Models;
using HotelERP.BE.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HotelERP.BE.Services;

public class LoyaltyService
{
    private readonly HotelDbContext _context;

    public LoyaltyService(HotelDbContext context)
    {
        _context = context;
    }

    public async Task<bool> ProcessCompletedInvoiceAsync(int invoiceId)
    {
        var invoice = await _context.Invoices
            .Include(i => i.Booking)
                .ThenInclude(b => b!.User)
            .FirstOrDefaultAsync(i => i.Id == invoiceId);

        if (invoice == null || invoice.Booking == null || invoice.Booking.UserId == null || invoice.Booking.User == null) 
            return false;

        if (string.IsNullOrEmpty(invoice.Status) || invoice.Status?.ToUpper() != "PAID") 
            return false;

        if (invoice.Booking.IsPointsAwarded == true) 
            return false; 

        decimal finalAmount = (invoice.FinalTotal ?? 0);
        int pointsToAdd = (int)(finalAmount / 10000);

        if (pointsToAdd <= 0) 
            return false; 

        var user = invoice.Booking.User;
        int currentPoints = user.LoyaltyPoints;
        user.LoyaltyPoints = currentPoints + pointsToAdd;

        var activeMemberships = await _context.Memberships
            .Where(m => m.Status == "ACTIVE")
            .OrderByDescending(m => m.MinPoints)
            .ToListAsync();

        var newTier = activeMemberships.FirstOrDefault(m => user.LoyaltyPoints >= m.MinPoints);
        
        if (newTier != null && user.MembershipId != newTier.Id)
        {
            user.MembershipId = newTier.Id;
        }

        invoice.Booking.IsPointsAwarded = true;

        _context.Users.Update(user);
        _context.Bookings.Update(invoice.Booking);
        
        await _context.SaveChangesAsync();

        return true;
    }
}