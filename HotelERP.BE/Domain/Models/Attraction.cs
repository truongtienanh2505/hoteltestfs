using System;
using System.Collections.Generic;

namespace HotelERP.BE.Domain.Models;

public partial class Attraction
{
    public int Id { get; set; }
    
    public string Name { get; set; } = null!;
    
    // Thuộc tính loại hình điểm tham quan (Di tích, Ẩm thực, Giải trí, Thiên nhiên)
    public string? Type { get; set; }
    
    public string? Description { get; set; }
    
    public decimal? DistanceKm { get; set; }
    
    public string? ImageUrl { get; set; }
    
    public string? ImagePublicId { get; set; }
    
    public string? MapEmbedLink { get; set; }
    
    public string Status { get; set; } = null!;
    
    public DateTime CreatedAt { get; set; }
    
    public DateTime? UpdatedAt { get; set; }

    // 2 trường tọa độ GPS thêm vào cho Nhiệm vụ 4
    public decimal Latitude { get; set; }
    public decimal Longitude { get; set; }

    // Danh sách ảnh gallery (lưu dạng JSON array: ["url1","url2",...])
    public string? GalleryImages { get; set; }

    // Danh sách publicId tương ứng để xóa trên Cloudinary
    public string? GalleryPublicIds { get; set; }
}