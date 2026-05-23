using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HotelERP.BE.Infrastructure.Data;
using HotelERP.BE.Application.DTOs.BookingEngine;  

namespace HotelERP.BE.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SearchController : ControllerBase
    {
        private readonly HotelDbContext _context;

        public SearchController(HotelDbContext context)
        {
            _context = context;
        }

        // ==========================================
        // 1. API FETCH DANH MỤC (Categories/RoomTypes)
        // ==========================================
        [HttpGet("categories")]
        public async Task<IActionResult> GetRoomCategories()
        {
            // Lấy danh sách các loại phòng cơ bản làm danh mục tìm kiếm
            var categories = await _context.RoomTypes
                .Select(rt => new {
                    rt.Id,
                    rt.Name,
                    rt.Description,
                    rt.BasePrice
                    // Thêm thuộc tính hình ảnh đại diện nếu model của bạn có hỗ trợ
                })
                .ToListAsync();

            return Ok(categories);
        }

        // ==========================================
        // 2. API FILTER THUỘC TÍNH PHÒNG CƠ BẢN
        // ==========================================
        [HttpGet("filter")]
        public async Task<IActionResult> FilterRooms([FromQuery] RoomFilterDto filter)
        {
            // Sử dụng AsQueryable để build query linh hoạt dựa trên các filter được truyền vào
            var query = _context.RoomTypes
                                .Include(rt => rt.RoomTypeAmenities)
                                .ThenInclude(rta => rta.Amenity)
                                .AsQueryable();

            // Lọc theo giá thấp nhất
            if (filter.MinPrice.HasValue)
            {
                query = query.Where(rt => rt.BasePrice >= filter.MinPrice.Value);
            }

            // Lọc theo giá cao nhất
            if (filter.MaxPrice.HasValue)
            {
                query = query.Where(rt => rt.BasePrice <= filter.MaxPrice.Value);
            }

            // Lọc theo sức chứa (Giả sử model RoomType của bạn có trường Capacity/MaxAdults)
            // if (filter.Capacity.HasValue)
            // {
            //     query = query.Where(rt => rt.Capacity >= filter.Capacity.Value);
            // }

            // Lọc theo tiện ích (Amenity) - Yêu cầu loại phòng phải có TẤT CẢ các tiện ích được chọn
            if (filter.AmenityIds != null && filter.AmenityIds.Any())
            {
                foreach (var amenityId in filter.AmenityIds)
                {
                    query = query.Where(rt => rt.RoomTypeAmenities.Any(rta => rta.AmenityId == amenityId));
                }
            }

            // Thực thi query và map ra kết quả
            var results = await query
                .Select(rt => new {
                    rt.Id,
                    rt.Name,
                    rt.BasePrice,
                    Amenities = rt.RoomTypeAmenities.Select(rta => rta.Amenity.Name).ToList()
                })
                .ToListAsync();

            return Ok(results);
        }
    }
}