namespace HotelERP.BE.Application.DTOs;

public class ImageUploadResult
{
    public string Url { get; set; } = string.Empty;
    public string PublicId { get; set; } = string.Empty;

    public ImageUploadResult(string url, string publicId)
    {
        Url = url;
        PublicId = publicId;
    }
}