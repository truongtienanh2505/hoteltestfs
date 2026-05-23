using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using HotelERP.BE.Application.Interfaces;
using Microsoft.AspNetCore.Http;

namespace HotelERP.BE.Application.Services;

public class PhotoService : IPhotoService
{
    private readonly Cloudinary _cloudinary;

    public PhotoService(IConfiguration config)
    {
        // Lấy cấu hình từ appsettings.json để kết nối với Cloudinary của bạn
        var account = new Account(
            config["Cloudinary:CloudName"],
            config["Cloudinary:ApiKey"],
            config["Cloudinary:ApiSecret"]
        );
        _cloudinary = new Cloudinary(account);
    }

    public async Task<(string Url, string PublicId)> UploadPhotoAsync(IFormFile file)
    {
        if (file.Length == 0) throw new Exception("File ảnh bị rỗng.");

        var uploadResult = new ImageUploadResult();

        using (var stream = file.OpenReadStream())
        {
            var uploadParams = new ImageUploadParams
            {
                File = new FileDescription(file.FileName, stream),
                Folder = "HotelERP_Avatars", // Nó sẽ tự tạo thư mục này trên Cloudinary cho gọn
                Transformation = new Transformation().Height(500).Width(500).Crop("fill").Gravity("face") // Tự động cắt vuông vào mặt
            };
            uploadResult = await _cloudinary.UploadAsync(uploadParams);
        }

        if (uploadResult.Error != null)
            throw new Exception(uploadResult.Error.Message);

        return (uploadResult.SecureUrl.ToString(), uploadResult.PublicId);
    }

    public async Task<bool> DeletePhotoAsync(string publicId)
    {
        var deleteParams = new DeletionParams(publicId);
        var result = await _cloudinary.DestroyAsync(deleteParams);
        return result.Result == "ok";
    }
}