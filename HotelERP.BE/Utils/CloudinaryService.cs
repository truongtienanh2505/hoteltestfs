using CloudinaryDotNet;
using CloudinaryDotNet.Actions;

namespace HotelERP.BE.Utils;

public interface ICloudinaryService
{
    Task<(string Url, string PublicId)> UploadImageAsync(IFormFile file, string folder);
    Task<bool> DeleteImageAsync(string publicId);
}

public class CloudinaryService : ICloudinaryService
{
    private readonly Cloudinary _cloudinary;

    public CloudinaryService(IConfiguration config)
    {
        var account = new Account(
            config["Cloudinary:CloudName"],
            config["Cloudinary:ApiKey"],
            config["Cloudinary:ApiSecret"]
        );
        _cloudinary = new Cloudinary(account);
    }

    public async Task<(string Url, string PublicId)> UploadImageAsync(IFormFile file, string folder)
    {
        if (file == null || file.Length == 0) return (string.Empty, string.Empty);

        using var stream = file.OpenReadStream();
        var uploadParams = new ImageUploadParams
        {
            File = new FileDescription(file.FileName, stream),
            Folder = folder,
            Transformation = new Transformation().Quality("auto").FetchFormat("auto")
        };

        var uploadResult = await _cloudinary.UploadAsync(uploadParams);

        if (uploadResult.Error != null)
            throw new Exception($"Cloudinary Error: {uploadResult.Error.Message}");

        return (uploadResult.SecureUrl.ToString(), uploadResult.PublicId);
    }

    public async Task<bool> DeleteImageAsync(string publicId)
    {
        if (string.IsNullOrEmpty(publicId)) return true;

        var deleteParams = new DeletionParams(publicId);
        var result = await _cloudinary.DestroyAsync(deleteParams);
        
        return result.Result == "ok";
    }

    internal async Task UploadImageAsync(IFormFile file)
    {
        throw new NotImplementedException();
    }
}