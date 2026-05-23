using HotelERP.BE.Domain.Models;
using HotelERP.BE.Infrastructure.Data;
using HotelERP.BE.Application.DTOs.Article;
using HotelERP.BE.Utils;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;

namespace HotelERP.BE.Services;

public class ArticleService
{
    private readonly HotelDbContext _context;
    private readonly ICloudinaryService _cloudinary;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public ArticleService(HotelDbContext context, ICloudinaryService cloudinary, IHttpContextAccessor httpContextAccessor)
    {
        _context = context;
        _cloudinary = cloudinary;
        _httpContextAccessor = httpContextAccessor;
    }

    // ==========================================
    // HELPER: Resolve danh sách tên chuyên mục → IDs, tự động tạo nếu chưa có
    // ==========================================
    private async Task<List<int>> ResolveCategoryIdsAsync(List<string>? names)
    {
        if (names == null || names.Count == 0) return new List<int>();

        var ids = new List<int>();
        foreach (var name in names.Where(n => !string.IsNullOrWhiteSpace(n)).Distinct())
        {
            var trimmed = name.Trim();
            var cat = await _context.ArticleCategories
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(c => c.Name == trimmed);

            if (cat == null)
            {
                cat = new ArticleCategory
                {
                    Name = trimmed,
                    Status = "ACTIVE",
                    CreatedAt = DateTime.UtcNow
                };
                _context.ArticleCategories.Add(cat);
                await _context.SaveChangesAsync();
            }
            ids.Add(cat.Id);
        }
        return ids;
    }

    // ==========================================
    // HELPER: Đồng bộ bảng pivot cho bài viết
    // ==========================================
    private async Task SyncCategoryMappingsAsync(int articleId, List<int> categoryIds)
    {
        var existing = await _context.ArticleCategoryMappings
            .Where(m => m.ArticleId == articleId)
            .ToListAsync();
        _context.ArticleCategoryMappings.RemoveRange(existing);

        foreach (var catId in categoryIds.Distinct())
        {
            _context.ArticleCategoryMappings.Add(new ArticleCategoryMapping
            {
                ArticleId = articleId,
                CategoryId = catId
            });
        }
        await _context.SaveChangesAsync();
    }

    // ==========================================
    // CREATE API
    // ==========================================
    public async Task<Article> CreateArticleAsync(ArticleRequestDto request)
    {
        var userIdString = _httpContextAccessor.HttpContext?.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString))
            throw new UnauthorizedAccessException("Không xác định được danh tính người dùng.");

        int authorId = int.Parse(userIdString);

        // Auto-Slug
        string baseSlug = SlugHelper.GenerateSlug(request.Title);
        string finalSlug = baseSlug;
        int counter = 1;
        while (await _context.Articles.IgnoreQueryFilters().AnyAsync(a => a.Slug == finalSlug))
        {
            finalSlug = $"{baseSlug}-{counter}";
            counter++;
        }

        // Auto-Excerpt
        string? summary = request.Summary;
        if (string.IsNullOrWhiteSpace(summary) && !string.IsNullOrWhiteSpace(request.Content))
        {
            var plainText = System.Text.RegularExpressions.Regex.Replace(request.Content, "<.*?>", string.Empty);
            summary = plainText.Length > 150 ? plainText.Substring(0, 150) + "..." : plainText;
        }

        // Status
        string status = "Draft";
        if (!string.IsNullOrEmpty(request.Status) &&
            (request.Status == "Published" || request.Status == "Pending Review" || request.Status == "Draft"))
            status = request.Status;

        // Upload thumbnail
        string? thumbnailUrl = null;
        string? thumbnailPublicId = null;
        if (request.Thumbnail != null)
        {
            var uploadResult = await _cloudinary.UploadImageAsync(request.Thumbnail, "articles");
            thumbnailUrl = uploadResult.Url;
            thumbnailPublicId = uploadResult.PublicId;
        }

        // Parse CategoryNamesJson (JSON string từ FE) hoặc dùng CategoryName (tương thích ngược)
        var allNames = new List<string>();
        if (!string.IsNullOrWhiteSpace(request.CategoryNamesJson))
        {
            try {
                var parsed = System.Text.Json.JsonSerializer.Deserialize<List<string>>(request.CategoryNamesJson);
                if (parsed != null) allNames.AddRange(parsed);
            } catch { }
        }
        if (allNames.Count == 0 && !string.IsNullOrWhiteSpace(request.CategoryName))
            allNames.Add(request.CategoryName);

        var categoryIds = await ResolveCategoryIdsAsync(allNames);
        int? primaryCategoryId = categoryIds.Count > 0 ? categoryIds[0] : null;

        var newArticle = new Article
        {
            Title = request.Title,
            Slug = finalSlug,
            Content = request.Content,
            Summary = summary,
            CategoryId = primaryCategoryId,
            AuthorId = authorId,
            ThumbnailUrl = thumbnailUrl,
            ThumbnailPublicId = thumbnailPublicId,
            Tags = request.Tags,
            MetaTitle = request.MetaTitle,
            MetaDescription = request.MetaDescription,
            Status = status,
            PublishedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };

        _context.Articles.Add(newArticle);
        await _context.SaveChangesAsync();

        await SyncCategoryMappingsAsync(newArticle.Id, categoryIds);

        return newArticle;
    }

    // ==========================================
    // UPDATE API
    // ==========================================
    public async Task<Article> UpdateArticleAsync(int id, ArticleRequestDto request)
    {
        var article = await _context.Articles.FindAsync(id);
        if (article == null) throw new Exception("Không tìm thấy bài viết");

        // Auto-Excerpt
        string? summary = request.Summary;
        if (string.IsNullOrWhiteSpace(summary) && !string.IsNullOrWhiteSpace(request.Content))
        {
            var plainText = System.Text.RegularExpressions.Regex.Replace(request.Content, "<.*?>", string.Empty);
            summary = plainText.Length > 150 ? plainText.Substring(0, 150) + "..." : plainText;
        }

        string status = article.Status;
        if (!string.IsNullOrEmpty(request.Status) &&
            (request.Status == "Published" || request.Status == "Pending Review" || request.Status == "Draft"))
            status = request.Status;

        article.Title = request.Title;
        article.Content = request.Content;
        article.Summary = summary;
        article.Tags = request.Tags;
        article.MetaTitle = request.MetaTitle;
        article.MetaDescription = request.MetaDescription;
        article.Status = status;
        article.UpdatedAt = DateTime.UtcNow;

        // Parse CategoryNamesJson
        var allNames = new List<string>();
        if (!string.IsNullOrWhiteSpace(request.CategoryNamesJson))
        {
            try {
                var parsed = System.Text.Json.JsonSerializer.Deserialize<List<string>>(request.CategoryNamesJson);
                if (parsed != null) allNames.AddRange(parsed);
            } catch { }
        }
        if (allNames.Count == 0 && !string.IsNullOrWhiteSpace(request.CategoryName))
            allNames.Add(request.CategoryName);

        if (allNames.Count > 0)
        {
            var categoryIds = await ResolveCategoryIdsAsync(allNames);
            article.CategoryId = categoryIds[0];
            _context.Articles.Update(article);
            await _context.SaveChangesAsync();
            await SyncCategoryMappingsAsync(article.Id, categoryIds);
        }
        else
        {
            _context.Articles.Update(article);
        }

        if (request.Thumbnail != null)
        {
            if (!string.IsNullOrEmpty(article.ThumbnailPublicId))
                await _cloudinary.DeleteImageAsync(article.ThumbnailPublicId);

            var uploadResult = await _cloudinary.UploadImageAsync(request.Thumbnail, "articles");
            article.ThumbnailUrl = uploadResult.Url;
            article.ThumbnailPublicId = uploadResult.PublicId;
        }

        await _context.SaveChangesAsync();
        return article;
    }

    // ==========================================
    // DELETE (Soft)
    // ==========================================
    public async Task DeleteArticleAsync(int id)
    {
        var article = await _context.Articles.FindAsync(id);
        if (article == null) throw new Exception("Không tìm thấy bài viết");

        article.Status = "INACTIVE";
        article.UpdatedAt = DateTime.UtcNow;
        _context.Articles.Update(article);
        await _context.SaveChangesAsync();
    }

    // ==========================================
    // SEARCH
    // ==========================================
    public async Task<List<ArticleResponseDto>> SearchArticlesAsync(string? keyword, string? categoryName, string? status = "Published")
    {
        var query = _context.Articles
            .Include(a => a.CategoryMappings)
                .ThenInclude(m => m.Category)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(categoryName))
            query = query.Where(a => a.CategoryMappings.Any(m => m.Category != null && m.Category.Name == categoryName && m.Category.Status == "ACTIVE"));

        if (status != "ALL" && !string.IsNullOrWhiteSpace(status))
            query = query.Where(a => a.Status == status);

        var articles = await query
            .OrderByDescending(a => a.PublishedAt)
            .ToListAsync();

        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var nk = RemoveDiacritics(keyword.ToLower().Trim());
            articles = articles.Where(a =>
                RemoveDiacritics(a.Title?.ToLower() ?? "").Contains(nk) ||
                RemoveDiacritics((a.Summary ?? "").ToLower()).Contains(nk)
            ).ToList();
        }

        return articles.Select(a => new ArticleResponseDto
        {
            Id = a.Id,
            Title = a.Title,
            Slug = a.Slug,
            Summary = a.Summary,
            ThumbnailUrl = a.ThumbnailUrl,
            PublishedAt = a.PublishedAt,
            CategoryNames = a.CategoryMappings
                .Where(m => m.Category != null && m.Category.Status == "ACTIVE")
                .Select(m => m.Category.Name)
                .ToList(),
            Tags = a.Tags,
            MetaTitle = a.MetaTitle,
            MetaDescription = a.MetaDescription,
            Status = a.Status,
            Content = a.Content
        }).ToList();
    }

    private static string RemoveDiacritics(string text)
    {
        if (string.IsNullOrEmpty(text)) return text;
        var normalized = text.Normalize(System.Text.NormalizationForm.FormD);
        var sb = new System.Text.StringBuilder();
        foreach (var c in normalized)
        {
            var cat = System.Globalization.CharUnicodeInfo.GetUnicodeCategory(c);
            if (cat != System.Globalization.UnicodeCategory.NonSpacingMark)
                sb.Append(c);
        }
        return sb.ToString().Normalize(System.Text.NormalizationForm.FormC);
    }

    // ==========================================
    // UPLOAD THUMBNAIL
    // ==========================================
    public async Task<string> UploadThumbnailAsync(int id, IFormFile file)
    {
        var article = await _context.Articles.FindAsync(id);
        if (article == null) throw new Exception("Không tìm thấy bài viết với ID này.");

        var uploadResult = await _cloudinary.UploadImageAsync(file, "articles");
        if (string.IsNullOrEmpty(uploadResult.Url)) throw new Exception("Upload ảnh thất bại.");

        if (!string.IsNullOrEmpty(article.ThumbnailPublicId))
            await _cloudinary.DeleteImageAsync(article.ThumbnailPublicId);

        article.ThumbnailUrl = uploadResult.Url;
        article.ThumbnailPublicId = uploadResult.PublicId;
        article.UpdatedAt = DateTime.UtcNow;

        _context.Articles.Update(article);
        await _context.SaveChangesAsync();
        return article.ThumbnailUrl;
    }
}