using System;
using System.Collections.Generic;

namespace HotelERP.BE.Domain.Models;

public partial class ArticleCategory
{
    public int Id { get; set; }

    public string Name { get; set; } = null!;

    public string Status { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual ICollection<Article> Articles { get; set; } = new List<Article>();
    public virtual ICollection<ArticleCategoryMapping> CategoryMappings { get; set; } = new List<ArticleCategoryMapping>();
}
