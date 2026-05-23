using System;
using System.Collections.Generic;

namespace HotelERP.BE.Domain.Models;

public partial class Article
{
    public int Id { get; set; }

    public int? CategoryId { get; set; }

    public int? AuthorId { get; set; }

    public string Title { get; set; } = null!;

    public string Slug { get; set; } = null!;

    public string? Summary { get; set; }

    public string? Content { get; set; }

    public string? ThumbnailUrl { get; set; }

    public string? ThumbnailPublicId { get; set; }

    public string? Tags { get; set; }

    public string? MetaTitle { get; set; }

    public string? MetaDescription { get; set; }

    public string Status { get; set; } = null!;

    public DateTime PublishedAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual User? Author { get; set; }

    // Quan hệ cũ (giữ lại để tương thích ngược)
    public virtual ArticleCategory? Category { get; set; }

    // Quan hệ mới: 1 bài viết có nhiều chuyên mục
    public virtual ICollection<ArticleCategoryMapping> CategoryMappings { get; set; } = new List<ArticleCategoryMapping>();
}
