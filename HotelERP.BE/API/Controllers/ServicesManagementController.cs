using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HotelERP.BE.Infrastructure.Data;
using HotelERP.BE.Domain.Models;
using HotelERP.BE.Application.Interfaces;

namespace HotelERP.BE.Controllers;

[ApiController]
[Route("api/services-management")]
[Authorize(Roles = "Admin,Manager,Receptionist")]
public class ServicesManagementController(HotelDbContext context, IPhotoService photoService) : ControllerBase
{
    // =====================================================================
    // UPLOAD IMAGE → CLOUDINARY
    // =====================================================================
    [HttpPost("upload-image")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadImage(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { success = false, message = "Không có file ảnh." });

        try
        {
            var (url, publicId) = await photoService.UploadPhotoAsync(file);
            return Ok(new { success = true, imageUrl = url, publicId });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = "Lỗi upload ảnh: " + ex.Message });
        }
    }

    // =====================================================================
    // CATEGORIES
    // =====================================================================

    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories()
    {
        var cats = await context.ServiceCategories
            .OrderBy(c => c.Name)
            .Select(c => new { c.Id, c.Name, c.Status, serviceCount = c.Services.Count })
            .ToListAsync();
        return Ok(new { success = true, data = cats });
    }

    [HttpPost("categories")]
    public async Task<IActionResult> CreateCategory([FromBody] CategoryUpsertDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest(new { success = false, message = "Tên danh mục không được rỗng." });

        var cat = new ServiceCategory
        {
            Name = dto.Name.Trim(),
            Status = "ACTIVE",
            CreatedAt = DateTime.UtcNow
        };
        context.ServiceCategories.Add(cat);
        await context.SaveChangesAsync();
        return Ok(new { success = true, message = "Thêm danh mục thành công.", data = new { cat.Id, cat.Name, cat.Status } });
    }

    [HttpPut("categories/{id}")]
    public async Task<IActionResult> UpdateCategory(int id, [FromBody] CategoryUpsertDto dto)
    {
        var cat = await context.ServiceCategories.FindAsync(id);
        if (cat == null) return NotFound(new { success = false, message = "Không tìm thấy danh mục." });

        if (!string.IsNullOrWhiteSpace(dto.Name)) cat.Name = dto.Name.Trim();
        if (!string.IsNullOrWhiteSpace(dto.Status)) cat.Status = dto.Status.Trim().ToUpper();
        await context.SaveChangesAsync();
        return Ok(new { success = true, message = "Cập nhật danh mục thành công." });
    }

    [HttpDelete("categories/{id}")]
    public async Task<IActionResult> DeleteCategory(int id)
    {
        var cat = await context.ServiceCategories.Include(c => c.Services).FirstOrDefaultAsync(c => c.Id == id);
        if (cat == null) return NotFound(new { success = false, message = "Không tìm thấy danh mục." });
        if (cat.Services.Count > 0)
            return BadRequest(new { success = false, message = $"Danh mục có {cat.Services.Count} dịch vụ. Xóa hoặc chuyển danh mục cho dịch vụ trước." });

        context.ServiceCategories.Remove(cat);
        await context.SaveChangesAsync();
        return Ok(new { success = true, message = "Xóa danh mục thành công." });
    }

    // =====================================================================
    // SERVICES
    // =====================================================================

    [HttpGet]
    public async Task<IActionResult> GetServices([FromQuery] string? search, [FromQuery] int? categoryId, [FromQuery] string? status)
    {
        var query = context.Services
            .Include(s => s.Category)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(s => s.Name.Contains(search));
        if (categoryId.HasValue)
            query = query.Where(s => s.CategoryId == categoryId);
        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(s => s.Status.ToUpper() == status.ToUpper());

        var services = await query
            .OrderBy(s => s.Category != null ? s.Category.Name : "")
            .ThenBy(s => s.Name)
            .Select(s => new
            {
                s.Id, s.Name, s.Description, s.Price, s.Unit, s.ImageUrl, s.Status,
                s.CreatedAt, s.UpdatedAt,
                categoryId = s.CategoryId,
                categoryName = s.Category != null ? s.Category.Name : null
            })
            .ToListAsync();

        return Ok(new { success = true, data = services });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetService(int id)
    {
        var svc = await context.Services.Include(s => s.Category).FirstOrDefaultAsync(s => s.Id == id);
        if (svc == null) return NotFound(new { success = false, message = "Không tìm thấy dịch vụ." });
        return Ok(new { success = true, data = new
        {
            svc.Id, svc.Name, svc.Description, svc.Price, svc.Unit, svc.ImageUrl, svc.Status,
            categoryId = svc.CategoryId,
            categoryName = svc.Category?.Name
        }});
    }

    [HttpPost]
    public async Task<IActionResult> CreateService([FromBody] ServiceUpsertDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest(new { success = false, message = "Tên dịch vụ không được rỗng." });
        if (dto.Price < 0)
            return BadRequest(new { success = false, message = "Giá không hợp lệ." });

        var svc = new Service
        {
            Name = dto.Name.Trim(),
            Description = dto.Description?.Trim(),
            Price = dto.Price,
            Unit = dto.Unit?.Trim() ?? "lần",
            ImageUrl = dto.ImageUrl?.Trim(),
            CategoryId = dto.CategoryId,
            Status = (dto.Status?.Trim().ToUpper() is "ACTIVE" or "INACTIVE" ? dto.Status.Trim().ToUpper() : null) ?? "ACTIVE",
            CreatedAt = DateTime.UtcNow
        };
        context.Services.Add(svc);
        await context.SaveChangesAsync();
        return Ok(new { success = true, message = $"Thêm dịch vụ \"{svc.Name}\" thành công.", data = new { svc.Id } });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateService(int id, [FromBody] ServiceUpsertDto dto)
    {
        var svc = await context.Services.FindAsync(id);
        if (svc == null) return NotFound(new { success = false, message = "Không tìm thấy dịch vụ." });

        if (!string.IsNullOrWhiteSpace(dto.Name)) svc.Name = dto.Name.Trim();
        svc.Description = dto.Description?.Trim();
        if (dto.Price >= 0) svc.Price = dto.Price;
        if (!string.IsNullOrWhiteSpace(dto.Unit)) svc.Unit = dto.Unit.Trim();
        svc.ImageUrl = dto.ImageUrl?.Trim();
        if (dto.CategoryId.HasValue) svc.CategoryId = dto.CategoryId;
        if (!string.IsNullOrWhiteSpace(dto.Status)) svc.Status = dto.Status.Trim().ToUpper();
        svc.UpdatedAt = DateTime.UtcNow;

        await context.SaveChangesAsync();
        return Ok(new { success = true, message = $"Cập nhật dịch vụ \"{svc.Name}\" thành công." });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteService(int id)
    {
        var svc = await context.Services.FindAsync(id);
        if (svc == null) return NotFound(new { success = false, message = "Không tìm thấy dịch vụ." });

        // Soft delete: set INACTIVE
        svc.Status = "INACTIVE";
        svc.UpdatedAt = DateTime.UtcNow;
        await context.SaveChangesAsync();
        return Ok(new { success = true, message = $"Đã ẩn dịch vụ \"{svc.Name}\"." });
    }

    // Xóa vĩnh viễn (hard delete) - chỉ Admin/Manager
    [HttpDelete("{id}/hard")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> HardDeleteService(int id)
    {
        var svc = await context.Services
            .Include(s => s.OrderServiceDetails)
            .FirstOrDefaultAsync(s => s.Id == id);
        if (svc == null) return NotFound(new { success = false, message = "Không tìm thấy dịch vụ." });
        if (svc.OrderServiceDetails.Count > 0)
            return BadRequest(new { success = false, message = $"Dịch vụ có {svc.OrderServiceDetails.Count} lịch sử đặt. Không thể xóa vĩnh viễn." });

        context.Services.Remove(svc);
        await context.SaveChangesAsync();
        return Ok(new { success = true, message = $"Đã xóa vĩnh viễn dịch vụ \"{svc.Name}\"." });
    }
}

// ── DTOs ──────────────────────────────────────────────────────────────────────
public record CategoryUpsertDto(string Name, string? Status);
public record ServiceUpsertDto(
    string Name,
    string? Description,
    decimal Price,
    string? Unit,
    string? ImageUrl,
    int? CategoryId,
    string? Status
);
