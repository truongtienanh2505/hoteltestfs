using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System.Net;
using System.Security.Claims;
using System.ComponentModel.DataAnnotations;
using HotelERP.BE.Domain.Models;
using HotelERP.BE.Services;
using HotelERP.BE.Infrastructure.Data;
using HotelERP.BE.Helpers.AuditLogs;
using HotelERP.BE.Utils;

namespace HotelERP.BE.Controllers;

// ✅ FIX BUG-05: Thêm [Range(1, 5)] để validate rating trước khi lưu DB.
// Trước đây Rating=10 gây 500 error do DB/constraint; nay trả 400 đúng spec.
public record CreateReviewDto(
    int? UserId,
    int RoomTypeId,
    [Range(1, 5, ErrorMessage = "Rating phải nằm trong khoảng từ 1 đến 5.")]
    int Rating,
    string? Comment,
    string? ImageUrl,
    string? ImagePublicId
);

[Route("api/[controller]")]
[ApiController]
public class ReviewController(HotelDbContext context, ICloudinaryService cloudinaryService) : ControllerBase
{
    // ==========================================
    // 1. LẤY DANH SÁCH CHO KHÁCH (CHỈ BÀI ĐÃ DUYỆT)
    // ==========================================
    [HttpGet("visible")]
    public async Task<IActionResult> GetVisibleReviews()
    {
        // Chỉ lấy những bài đã được Admin duyệt
        var reviews = await context.Reviews
            .Include(r => r.User)
            .Include(r => r.RoomType)
            .Where(r => r.IsApproved == true && (r.Status == "APPROVED" || r.Status == "VISIBLE"))
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new {
                r.Id,
                r.UserId,
                r.RoomTypeId,
                r.Rating,
                r.Comment,
                r.ImageUrl,
                r.CreatedAt,
                r.LikeCount,
                r.Highlight,
                r.ServiceQuality,
                User = r.User != null ? new { FullName = r.User.FullName } : null,
                RoomType = r.RoomType != null ? new { Name = r.RoomType.Name } : null
            })
            .ToListAsync();
        return Ok(reviews);
    }

    // ==========================================
    // 1b. LẤY TẤT CẢ CHO ADMIN (THẤY CẢ BÀI BỊ ẨN/CHỜ)
    // ==========================================
    [HttpGet("admin-all")]
    public async Task<IActionResult> GetAllForAdmin()
    {
        // Admin cần thấy mọi thứ để duyệt/ẩn
        var reviews = await context.Reviews
            .IgnoreQueryFilters()
            .Include(r => r.User)
            .Include(r => r.RoomType)
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new {
                r.Id,
                r.UserId,
                r.RoomTypeId,
                r.Rating,
                r.Comment,
                r.ImageUrl,
                r.CreatedAt,
                r.LikeCount,
                r.Highlight,
                r.ServiceQuality,
                r.IsApproved,
                r.Status,
                User = r.User != null ? new { r.User.FullName } : null,
                RoomType = r.RoomType != null ? new { r.RoomType.Name } : null
            })
            .ToListAsync();
        return Ok(reviews);
    }

    // ==========================================
    // 2. THÊM ĐÁNH GIÁ MỚI (TỪ KHÁCH HÀNG)
    // ==========================================
    [HttpPost]
    public async Task<IActionResult> Create(CreateReviewDto dto)
    {
        Review newReview = new()
        {
            UserId = dto.UserId,
            RoomTypeId = dto.RoomTypeId,
            Rating = dto.Rating,
            Comment = dto.Comment,
            ImageUrl = dto.ImageUrl,
            ImagePublicId = dto.ImagePublicId,
            
            // 🚀 ĐÃ SỬA: Mặc định chờ Admin duyệt
            IsApproved = false, 
            Status = "PENDING",
            
            CreatedAt = DateTime.UtcNow
        };

        context.Reviews.Add(newReview);
        await context.SaveChangesAsync();

        // ✅ FIX BUG-03: Trả DTO thay vì entity EF trực tiếp.
        // Lý do: Global Query Filter HasQueryFilter(e => e.IsApproved) tự động lọc
        // entity có IsApproved=false khỏi mọi truy vấn. Khi JSON serializer cố
        // lazy-load navigation property (User, RoomType) từ entity này, EF Core
        // truy vấn lại DB với filter "WHERE is_approved = 1" → không tìm thấy → 500 error.
        return Ok(new
        {
            message = "Gửi đánh giá thành công. Vui lòng chờ kiểm duyệt.",
            data = new
            {
                newReview.Id,
                newReview.UserId,
                newReview.RoomTypeId,
                newReview.Rating,
                newReview.Comment,
                newReview.ImageUrl,
                newReview.Status,
                newReview.IsApproved,
                newReview.CreatedAt
            }
        });
    }

    // ==========================================
    // 3A. ADMIN DUYỆT BÀI ĐÁNH GIÁ
    // ==========================================
    [Authorize]
    [HttpPut("{id}/approve")]
    public async Task<IActionResult> ApproveReview(int id)
    {
        var review = await context.Reviews.IgnoreQueryFilters().FirstOrDefaultAsync(r => r.Id == id);
        if (review is null) return NotFound("Không tìm thấy đánh giá.");

        review.IsApproved = true;
        review.Status = "APPROVED";

        await context.SaveChangesAsync();
        return Ok(new { message = "Đã duyệt đánh giá thành công." });
    }

    // ==========================================
    // 3B. ADMIN ẨN ĐÁNH GIÁ (KÈM LÝ DO)
    // ==========================================
    [Authorize]
    [HttpPut("{id}/hide")]
    public async Task<IActionResult> HideReview(int id)
    {
        var review = await context.Reviews.IgnoreQueryFilters().FirstOrDefaultAsync(r => r.Id == id);
        if (review is null) return NotFound("Không tìm thấy đánh giá.");

        // 1. Cập nhật trạng thái review — lưu trước, đảm bảo luôn thành công
        review.IsApproved = false;
        review.Status = "HIDDEN";
        await context.SaveChangesAsync();

        // 2. Lấy userId và role từ JWT token
        var userIdRaw = User.FindFirstValue(ClaimTypes.NameIdentifier)
                     ?? User.FindFirst("UserId")?.Value;
        int.TryParse(userIdRaw, out int actingUserId);
        var actingRole = User.FindFirstValue(ClaimTypes.Role) ?? "Admin";

        // 3. Lấy và Decode header X-Audit-Reason
        string decodedReason = "Không có lý do";
        if (Request.Headers.TryGetValue("X-Audit-Reason", out var reasonValues))
            decodedReason = WebUtility.UrlDecode(reasonValues.ToString());

        // 4. Ghi audit log — best-effort, không làm hỏng luồng chính
        if (actingUserId > 0)
        {
            try
            {
                await context.AddAuditLogAsync(
                    userId: actingUserId,
                    roleName: actingRole,
                    actionType: "HIDE_REVIEW",
                    entityType: "Reviews",
                    message: $"Ẩn đánh giá #{id}: {decodedReason}",
                    contextParams: new { reviewId = id },
                    changes: new { oldData = new { review.Status }, newData = new { Status = "HIDDEN" } }
                );
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[AuditLog Warning] HideReview #{id}: {ex.Message}");
            }
        }

        return Ok(new { message = "Đã ẩn đánh giá thành công." });
    }

    // ==========================================
    // 4 & 5. UPLOAD & DELETE (Giữ nguyên của bạn)
    // ==========================================
    [HttpPost("upload-image")]
    public async Task<IActionResult> UploadImage(IFormFile file)
    {
        try
        {
            var result = await cloudinaryService.UploadImageAsync(file, "reviews");
            return Ok(new { ImageUrl = result.Url, PublicId = result.PublicId });
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [Authorize]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var review = await context.Reviews.IgnoreQueryFilters().FirstOrDefaultAsync(r => r.Id == id);
        if (review is null) return NotFound("Không tìm thấy đánh giá.");

        // Nếu có ảnh trên Cloudinary, bạn có thể gọi API xóa ảnh ở đây trước khi xóa DB
        // if (!string.IsNullOrEmpty(review.ImagePublicId))
        // {
        //     await cloudinaryService.DeleteImageAsync(review.ImagePublicId);
        // }

        context.Reviews.Remove(review);
        await context.SaveChangesAsync();
        return Ok(new { message = "Đã xóa vĩnh viễn đánh giá." });
    }

    // ==========================================
    // 6. KHÁCH HÀNG LIKE ĐÁNH GIÁ
    // ==========================================
    [HttpPut("{id}/like")]
    public async Task<IActionResult> LikeReview(int id)
    {
        var review = await context.Reviews.FirstOrDefaultAsync(r => r.Id == id);
        if (review is null) return NotFound("Không tìm thấy đánh giá.");

        review.LikeCount += 1;
        await context.SaveChangesAsync();
        return Ok(new { message = "Đã thích đánh giá.", likeCount = review.LikeCount });
    }
}