using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using HotelERP.BE.Domain.Models;
using HotelERP.BE.Infrastructure.Data;
using HotelERP.BE.Application.Interfaces;
using System.Text.Json;

namespace HotelERP.BE.Controllers;

// --- DTOs ---
public class CreateAttractionDto
{
    public string Name { get; set; } = null!;
    public string? Type { get; set; }
    public string? Description { get; set; }
    public decimal Latitude { get; set; }
    public decimal Longitude { get; set; }
    public decimal? DistanceKm { get; set; }
    public string? MapEmbedLink { get; set; }
    public string Status { get; set; } = "ACTIVE";

    // Ảnh đại diện chính
    public IFormFile? ImageFile { get; set; }

    // Nhiều ảnh gallery
    public List<IFormFile>? GalleryFiles { get; set; }
}

// DTO cập nhật địa điểm
public class UpdateAttractionDto : CreateAttractionDto
{
    public new string Status { get; set; } = "ACTIVE";
}

[Route("api/[controller]")]
[ApiController]
public class AttractionController(HotelDbContext context, IPhotoService photoService) : ControllerBase
{
    // ── GET all ──
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var attractions = await context.Attractions
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync();

        return Ok(attractions);
    }

    // ── GET by id ──
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var attraction = await context.Attractions.FindAsync(id);

        if (attraction is null)
        {
            return NotFound(new { message = "Không tìm thấy địa điểm." });
        }

        return Ok(attraction);
    }

    // ── CREATE ──
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromForm] CreateAttractionDto dto)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(dto.Name))
            {
                return BadRequest(new { message = "Tên địa điểm không được để trống." });
            }

            string? imageUrl = null;
            string? imagePublicId = null;

        // Upload ảnh chính
        if (dto.ImageFile != null)
        {
            var uploadResult = await photoService.UploadPhotoAsync(dto.ImageFile);
            imageUrl = uploadResult.Url;
            imagePublicId = uploadResult.PublicId;
        }

        // Upload nhiều ảnh gallery
        var galleryUrls = new List<string>();
        var galleryPublicIds = new List<string>();

        if (dto.GalleryFiles != null && dto.GalleryFiles.Count > 0)
        {
            foreach (var file in dto.GalleryFiles)
            {
                if (file.Length > 0)
                {
                    var result = await photoService.UploadPhotoAsync(file);
                    galleryUrls.Add(result.Url);
                    galleryPublicIds.Add(result.PublicId);
                }
            }
        }

        var newAttraction = new Attraction
        {
            Name = dto.Name,
            Type = dto.Type,
            Description = dto.Description,
            Latitude = dto.Latitude,
            Longitude = dto.Longitude,
            DistanceKm = dto.DistanceKm,
            ImageUrl = imageUrl,
            ImagePublicId = imagePublicId,
            MapEmbedLink = dto.MapEmbedLink,
            CreatedAt = DateTime.UtcNow,
            Status = !string.IsNullOrEmpty(dto.Status) ? dto.Status : "ACTIVE",
            GalleryImages = galleryUrls.Count > 0 ? JsonSerializer.Serialize(galleryUrls) : null,
            GalleryPublicIds = galleryPublicIds.Count > 0 ? JsonSerializer.Serialize(galleryPublicIds) : null,
        };

            context.Attractions.Add(newAttraction);
            await context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = newAttraction.Id }, newAttraction);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                message = "Lỗi khi tạo địa điểm.",
                error = ex.InnerException?.Message ?? ex.Message
            });
        }
    }

    // ── UPDATE ──
    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromForm] UpdateAttractionDto dto)
    {
        try
        {
            var attraction = await context.Attractions.FindAsync(id);

            if (attraction is null)
            {
                return NotFound(new { message = "Không tìm thấy địa điểm." });
            }

            if (string.IsNullOrWhiteSpace(dto.Name))
            {
                return BadRequest(new { message = "Tên địa điểm không được để trống." });
            }

            attraction.Name = dto.Name.Trim();
            attraction.Type = dto.Type;
            attraction.Description = dto.Description;
            attraction.Latitude = dto.Latitude;
            attraction.Longitude = dto.Longitude;
            attraction.DistanceKm = dto.DistanceKm;
            attraction.MapEmbedLink = dto.MapEmbedLink;
            attraction.Status = string.IsNullOrWhiteSpace(dto.Status) ? "ACTIVE" : dto.Status;
            attraction.UpdatedAt = DateTime.UtcNow;

        // Cập nhật ảnh chính nếu có file mới
        if (dto.ImageFile != null)
        {
            var uploadResult = await photoService.UploadPhotoAsync(dto.ImageFile);
            attraction.ImageUrl = uploadResult.Url;
            attraction.ImagePublicId = uploadResult.PublicId;
        }

        // Upload thêm ảnh gallery mới (append vào gallery hiện có)
        if (dto.GalleryFiles != null && dto.GalleryFiles.Count > 0)
        {
            var existingUrls = string.IsNullOrEmpty(attraction.GalleryImages)
                ? new List<string>()
                : JsonSerializer.Deserialize<List<string>>(attraction.GalleryImages) ?? new List<string>();

            var existingPublicIds = string.IsNullOrEmpty(attraction.GalleryPublicIds)
                ? new List<string>()
                : JsonSerializer.Deserialize<List<string>>(attraction.GalleryPublicIds) ?? new List<string>();

            foreach (var file in dto.GalleryFiles)
            {
                if (file.Length > 0)
                {
                    var result = await photoService.UploadPhotoAsync(file);
                    existingUrls.Add(result.Url);
                    existingPublicIds.Add(result.PublicId);
                }
            }

            attraction.GalleryImages = JsonSerializer.Serialize(existingUrls);
            attraction.GalleryPublicIds = JsonSerializer.Serialize(existingPublicIds);
        }

            await context.SaveChangesAsync();

            return Ok(new
            {
                message = "Cập nhật địa điểm thành công.",
                data = attraction
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                message = "Lỗi khi cập nhật địa điểm.",
                error = ex.InnerException?.Message ?? ex.Message
            });
        }
    }

    // ── DELETE gallery image ──
    [HttpDelete("{id}/gallery/{index}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteGalleryImage(int id, int index)
    {
        var attraction = await context.Attractions.FindAsync(id);
        if (attraction is null) return NotFound();

        var urls = string.IsNullOrEmpty(attraction.GalleryImages)
            ? new List<string>()
            : JsonSerializer.Deserialize<List<string>>(attraction.GalleryImages) ?? new List<string>();

        var publicIds = string.IsNullOrEmpty(attraction.GalleryPublicIds)
            ? new List<string>()
            : JsonSerializer.Deserialize<List<string>>(attraction.GalleryPublicIds) ?? new List<string>();

        if (index < 0 || index >= urls.Count)
            return BadRequest("Index không hợp lệ.");

        // Xóa khỏi Cloudinary
        if (index < publicIds.Count && !string.IsNullOrEmpty(publicIds[index]))
        {
            await photoService.DeletePhotoAsync(publicIds[index]);
            publicIds.RemoveAt(index);
        }

        urls.RemoveAt(index);
        attraction.GalleryImages = urls.Count > 0 ? JsonSerializer.Serialize(urls) : null;
        attraction.GalleryPublicIds = publicIds.Count > 0 ? JsonSerializer.Serialize(publicIds) : null;
        attraction.UpdatedAt = DateTime.UtcNow;

        await context.SaveChangesAsync();
        return Ok(new { message = "Đã xóa ảnh gallery.", galleryImages = attraction.GalleryImages });
    }

    // ── DELETE attraction ──
    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            var attraction = await context.Attractions.FindAsync(id);

            if (attraction is null)
            {
                return NotFound(new { message = "Không tìm thấy địa điểm." });
            }

            context.Attractions.Remove(attraction);
            await context.SaveChangesAsync();

            return Ok(new { message = "Đã xóa địa điểm." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                message = "Lỗi khi xóa địa điểm.",
                error = ex.InnerException?.Message ?? ex.Message
            });
        }
    }
}