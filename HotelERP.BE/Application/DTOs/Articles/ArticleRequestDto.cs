namespace HotelERP.BE.Application.DTOs.Article;

public class ArticleRequestDto
{
    public string Title { get; set; } = null!;
    public string? Summary { get; set; }
    public string? Content { get; set; }

    // Hỗ trợ nhiều chuyên mục (Many-to-Many) — gửi dạng JSON string từ FE
    // VD: '["Tin Tức Khách Sạn","Sự Kiện"]'
    public string? CategoryNamesJson { get; set; }

    // Tương thích ngược với FE cũ gửi 1 chuyên mục
    public string? CategoryName { get; set; }

    public string? Tags { get; set; }
    public string? MetaTitle { get; set; }
    public string? MetaDescription { get; set; }
    public string? Status { get; set; }

    // IFormFile dùng để nhận file ảnh upload từ FE (Form-data)
    public IFormFile? Thumbnail { get; set; }
}