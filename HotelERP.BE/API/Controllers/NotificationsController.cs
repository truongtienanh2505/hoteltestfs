using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HotelERP.BE.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using HotelERP.BE.Constants;

namespace HotelERP.BE.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class NotificationsController : ControllerBase
    {
        private readonly HotelDbContext _context;

        public NotificationsController(HotelDbContext context)
        {
            _context = context;
        }

        // 1. API: Lấy 20 thông báo mới nhất (cả đã đọc lẫn chưa đọc - hiện lịch sử)
        [HttpGet]
        [Authorize(Policy = PermissionKeys.ViewNotifications)]
        public async Task<IActionResult> GetNotifications()
        {
           try 
            {
                var notifications = await _context.Notifications
                .OrderByDescending(n => n.CreatedAt)   // Mới nhất lên đầu
                .Take(20)
                .Select(n => new {
                    n.Id,
                    n.Title,
                    n.Content,
                    n.Type,
                    n.IsRead,
                    n.CreatedAt,
                    n.ReferenceLink
                })
                .ToListAsync();

                return Ok(notifications);
            }
            catch (Exception ex)
            {
                 return StatusCode(500, new { message = ex.Message, inner = ex.InnerException?.Message });
            }
        }
        

        // 2. API: Đánh dấu 1 thông báo là đã đọc
        [HttpPut("{id}/read")]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            var noti = await _context.Notifications.FindAsync(id);
            if (noti == null) return NotFound();

            noti.IsRead = true;
            await _context.SaveChangesAsync();
            return Ok();
        }

        // 3. API: Đánh dấu TẤT CẢ đã đọc (badge số đỏ = 0, lịch sử vẫn còn)
        [HttpPut("read-all")]
        public async Task<IActionResult> MarkAllAsRead()
        {
            var unreadNotis = await _context.Notifications
                .Where(n => !n.IsRead)
                .ToListAsync();

            if (!unreadNotis.Any()) 
                return Ok(new { message = "Không có thông báo nào cần đọc" });

            foreach (var noti in unreadNotis)
            {
                noti.IsRead = true;
            }
            
            await _context.SaveChangesAsync();
            return Ok(new { message = "Đã đánh dấu đọc toàn bộ" });
        }
    }
}