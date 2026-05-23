using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using HotelERP.BE.Application.Interfaces;
using HotelERP.BE.Application.DTOs;
using HotelERP.BE.Infrastructure.Data;
using HotelERP.BE.Domain.Models;
using HotelERP.BE.Utils;

namespace HotelERP.BE.Application.Services;

public class AmenityService(HotelDbContext context, ICloudinaryService cloudinaryService) : IAmenityService
{
    public async Task<IEnumerable<AmenityResponseDto>> GetAllAmenitiesAsync()
    {
        return await context.Amenities
            .AsNoTracking()
            .Where(a => a.DeletedAt == null)
            .OrderBy(a => a.Id)
            .Select(a => new AmenityResponseDto(
                a.Id,
                a.Name,
                a.IconUrl
            ))
            .ToListAsync();
    }

    public async Task<AmenityResponseDto?> GetAmenityByIdAsync(int id)
    {
        return await context.Amenities
            .AsNoTracking()
            .Where(a => a.Id == id && a.DeletedAt == null)
            .Select(a => new AmenityResponseDto(
                a.Id,
                a.Name,
                a.IconUrl
            ))
            .FirstOrDefaultAsync();
    }

    public async Task<int> CreateAmenityAsync(CreateAmenityRequest request)
    {
        var iconUrl = await UploadAmenityImageAsync(request.IconFile);

        var amenity = new Amenity
        {
            Name = request.Name.Trim(),
            IconUrl = iconUrl,
            Status = "ACTIVE",
            CreatedAt = DateTime.UtcNow
        };

        context.Amenities.Add(amenity);
        await context.SaveChangesAsync();

        return amenity.Id;
    }

    public async Task<bool> UpdateAmenityAsync(int id, UpdateAmenityRequest request)
    {
        var currentAmenity = await context.Amenities
            .AsNoTracking()
            .Where(a => a.Id == id && a.DeletedAt == null)
            .Select(a => new
            {
                a.Id,
                a.IconUrl
            })
            .FirstOrDefaultAsync();

        if (currentAmenity == null) return false;

        var nextIconUrl = currentAmenity.IconUrl;

        if (request.IconFile != null && request.IconFile.Length > 0)
        {
            nextIconUrl = await UploadAmenityImageAsync(request.IconFile);
        }

        var amenity = new Amenity
        {
            Id = id,
            Name = request.Name.Trim(),
            IconUrl = nextIconUrl,
            UpdatedAt = DateTime.UtcNow
        };

        context.Amenities.Attach(amenity);

        context.Entry(amenity).Property(a => a.Name).IsModified = true;
        context.Entry(amenity).Property(a => a.IconUrl).IsModified = true;
        context.Entry(amenity).Property(a => a.UpdatedAt).IsModified = true;

        await context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAmenityAsync(int id)
    {
        var exists = await context.Amenities
            .AsNoTracking()
            .AnyAsync(a => a.Id == id && a.DeletedAt == null);

        if (!exists) return false;

        var amenity = new Amenity
        {
            Id = id,
            DeletedAt = DateTime.UtcNow
        };

        context.Amenities.Attach(amenity);
        context.Entry(amenity).Property(a => a.DeletedAt).IsModified = true;

        await context.SaveChangesAsync();
        return true;
    }

    private async Task<string?> UploadAmenityImageAsync(IFormFile? iconFile)
    {
        if (iconFile == null || iconFile.Length == 0)
        {
            return null;
        }

        var uploadResult = await cloudinaryService.UploadImageAsync(iconFile, "amenities");

        if (string.IsNullOrWhiteSpace(uploadResult.Url))
        {
            throw new Exception("Upload ảnh tiện ích lên Cloudinary thất bại.");
        }

        return uploadResult.Url;
    }
}