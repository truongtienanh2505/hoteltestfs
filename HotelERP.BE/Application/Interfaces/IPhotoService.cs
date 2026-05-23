using Microsoft.AspNetCore.Http;

namespace HotelERP.BE.Application.Interfaces;

public interface IPhotoService
{
    // Hàm này nhận vào 1 file ảnh từ người dùng, trả về Tuple (Đường link URL, Mã PublicId để sau này xóa)
    Task<(string Url, string PublicId)> UploadPhotoAsync(IFormFile file);
    Task<bool> DeletePhotoAsync(string publicId);
}