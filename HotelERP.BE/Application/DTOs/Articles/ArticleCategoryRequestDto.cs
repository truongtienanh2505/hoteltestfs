using System.ComponentModel.DataAnnotations;

namespace HotelERP.BE.DTOs;

public class ArticleCategoryRequestDto
{
    // Bắt buộc phải nhập tên danh mục (VD: "Tin tức", "Khuyến mãi")
    public string Name { get; set; } = null!; 
    
    // Thêm [RegularExpression] để khóa chặt giá trị đầu vào
    [RegularExpression("^(ACTIVE|INACTIVE)$", ErrorMessage = "Trạng thái (Status) chỉ được phép nhập 'ACTIVE' hoặc 'INACTIVE'.")]
    public string? Status { get; set; } = "ACTIVE";
}