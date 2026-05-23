using HotelERP.BE.Domain.Models;
using HotelERP.BE.Infrastructure.Data;
using HotelERP.BE.DTOs;
using Microsoft.EntityFrameworkCore;

namespace HotelERP.BE.Services;

public class ArticleCategoryService
{
    private readonly HotelDbContext _context;

    public ArticleCategoryService(HotelDbContext context)
    {
        _context = context;
    }

    // 1. LẤY DANH SÁCH TẤT CẢ DANH MỤC kèm số bài viết
    public async Task<List<object>> GetAllCategoriesAsync()
    {
        // IgnoreQueryFilters để admin thấy cả danh mục INACTIVE
        var cats = await _context.ArticleCategories
            .IgnoreQueryFilters()
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();

        var counts = await _context.ArticleCategoryMappings
            .GroupBy(m => m.CategoryId)
            .Select(g => new { CategoryId = g.Key, Count = g.Count() })
            .ToListAsync();

        var countMap = counts.ToDictionary(x => x.CategoryId, x => x.Count);

        return cats.Select(c => (object)new
        {
            c.Id,
            c.Name,
            c.Status,
            c.CreatedAt,
            ArticleCount = countMap.TryGetValue(c.Id, out var cnt) ? cnt : 0,
        }).ToList();
    }

    // 2. THÊM DANH MỤC MỚI
    public async Task<ArticleCategory> CreateCategoryAsync(ArticleCategoryRequestDto request)
    {
        // Kiểm tra trùng tên
        if (await _context.ArticleCategories.AnyAsync(c => c.Name == request.Name))
        {
            throw new Exception("Tên danh mục này đã tồn tại!");
        }

        var newCategory = new ArticleCategory
        {
            Name = request.Name,
            Status = request.Status ?? "ACTIVE",
            CreatedAt = DateTime.UtcNow
        };

        _context.ArticleCategories.Add(newCategory);
        await _context.SaveChangesAsync();
        return newCategory;
    }

    // 3. SỬA TÊN DANH MỤC
    public async Task<ArticleCategory> UpdateCategoryAsync(int id, ArticleCategoryRequestDto request)
    {
        var category = await _context.ArticleCategories.IgnoreQueryFilters().FirstOrDefaultAsync(c => c.Id == id);
        if (category == null) throw new Exception("Không tìm thấy danh mục này.");

        // Kiểm tra trùng tên với danh mục khác
        if (await _context.ArticleCategories.AnyAsync(c => c.Name == request.Name && c.Id != id))
        {
            throw new Exception("Tên danh mục này đã bị trùng với một danh mục khác!");
        }

        category.Name = request.Name;
        if (!string.IsNullOrEmpty(request.Status))
        {
            category.Status = request.Status;
        }
        category.UpdatedAt = DateTime.UtcNow;

        _context.ArticleCategories.Update(category);
        await _context.SaveChangesAsync();
        return category;
    }

    // 4. XÓA DANH MỤC (Lưu ý: Chỉ xóa mềm hoặc kiểm tra xem có bài viết nào đang dùng không)
    public async Task DeleteCategoryAsync(int id)
    {
        var category = await _context.ArticleCategories.IgnoreQueryFilters().FirstOrDefaultAsync(c => c.Id == id);
        if (category == null) throw new Exception("Không tìm thấy danh mục này.");

        // Kiểm tra xem có bài viết nào đang thuộc danh mục này không
        bool hasArticles = await _context.Articles.AnyAsync(a => a.CategoryId == id && a.Status != "INACTIVE");
        if (hasArticles)
        {
            throw new Exception("Không thể xóa danh mục này vì đang có bài viết sử dụng nó. Vui lòng xóa/chuyển các bài viết trước.");
        }

        // Xóa mềm
        category.Status = "INACTIVE";
        category.UpdatedAt = DateTime.UtcNow;

        _context.ArticleCategories.Update(category);
        await _context.SaveChangesAsync();
    }
}