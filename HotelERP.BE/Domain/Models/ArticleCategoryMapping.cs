namespace HotelERP.BE.Domain.Models;

public class ArticleCategoryMapping
{
    public int ArticleId { get; set; }
    public int CategoryId { get; set; }

    public virtual Article Article { get; set; } = null!;
    public virtual ArticleCategory Category { get; set; } = null!;
}
