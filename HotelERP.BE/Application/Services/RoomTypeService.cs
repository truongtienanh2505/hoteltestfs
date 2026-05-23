using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using HotelERP.BE.Application.Interfaces;
using HotelERP.BE.Application.DTOs;
using HotelERP.BE.Infrastructure.Data;
using HotelERP.BE.Domain.Models;
using HotelERP.BE.Utils;

namespace HotelERP.BE.Application.Services;

public class RoomTypeService(HotelDbContext context, ICloudinaryService cloudinaryService) : IRoomTypeService
{
    private const string ActiveStatus = "ACTIVE";
    private const string DeletedStatus = "DELETED";

    public async Task<IEnumerable<RoomTypeResponseDto>> GetRoomTypesAsync()
    {
        var roomTypes = await context.RoomTypes
            .AsNoTracking()
            .Where(rt => rt.DeletedAt == null)
            .OrderBy(rt => rt.Id)
            .Select(rt => new
            {
                rt.Id,
                rt.Name,
                rt.Description,
                rt.BasePrice,
                rt.CapacityAdults,
                rt.CapacityChildren,
                LegacyImageUrl = rt.ImageUrl,
                Images = rt.RoomImages
                    .Where(img => img.Status == ActiveStatus)
                    .OrderByDescending(img => img.IsPrimary)
                    .ThenBy(img => img.Id)
                    .Select(img => new RoomTypeImageDto(img.Id, img.ImageUrl, img.IsPrimary))
                    .ToList(),
                Amenities = rt.RoomTypeAmenities
                    .Where(rta => rta.Amenity.DeletedAt == null)
                    .Select(rta => new AmenitySimpleDto(rta.AmenityId, rta.Amenity.Name, rta.Amenity.IconUrl))
                    .ToList()
            })
            .ToListAsync();

        return roomTypes.Select(rt =>
        {
            var primaryImageUrl = rt.Images.FirstOrDefault(img => img.IsPrimary)?.ImageUrl
                ?? rt.Images.FirstOrDefault()?.ImageUrl
                ?? rt.LegacyImageUrl;

            return new RoomTypeResponseDto(
                rt.Id,
                rt.Name,
                rt.Description,
                rt.BasePrice,
                rt.CapacityAdults,
                rt.CapacityChildren,
                primaryImageUrl,
                rt.Images,
                rt.Amenities
            );
        });
    }

    public async Task<RoomTypeResponseDto?> GetRoomTypeByIdAsync(int id)
    {
        var roomType = await context.RoomTypes
            .AsNoTracking()
            .Where(rt => rt.Id == id && rt.DeletedAt == null)
            .Select(rt => new
            {
                rt.Id,
                rt.Name,
                rt.Description,
                rt.BasePrice,
                rt.CapacityAdults,
                rt.CapacityChildren,
                LegacyImageUrl = rt.ImageUrl,
                Images = rt.RoomImages
                    .Where(img => img.Status == ActiveStatus)
                    .OrderByDescending(img => img.IsPrimary)
                    .ThenBy(img => img.Id)
                    .Select(img => new RoomTypeImageDto(img.Id, img.ImageUrl, img.IsPrimary))
                    .ToList(),
                Amenities = rt.RoomTypeAmenities
                    .Where(rta => rta.Amenity.DeletedAt == null)
                    .Select(rta => new AmenitySimpleDto(rta.AmenityId, rta.Amenity.Name, rta.Amenity.IconUrl))
                    .ToList()
            })
            .FirstOrDefaultAsync();

        if (roomType == null) return null;

        var primaryImageUrl = roomType.Images.FirstOrDefault(img => img.IsPrimary)?.ImageUrl
            ?? roomType.Images.FirstOrDefault()?.ImageUrl
            ?? roomType.LegacyImageUrl;

        return new RoomTypeResponseDto(
            roomType.Id,
            roomType.Name,
            roomType.Description,
            roomType.BasePrice,
            roomType.CapacityAdults,
            roomType.CapacityChildren,
            primaryImageUrl,
            roomType.Images,
            roomType.Amenities
        );
    }

    public async Task<int> CreateRoomTypeAsync(CreateRoomTypeRequest request)
    {
        var roomType = new RoomType
        {
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            BasePrice = request.BasePrice,
            CapacityAdults = request.CapacityAdults,
            CapacityChildren = request.CapacityChildren,
            Status = ActiveStatus,
            CreatedAt = DateTime.UtcNow
        };

        context.RoomTypes.Add(roomType);
        await context.SaveChangesAsync();

        var uploadFiles = GetUploadFiles(request.Image, request.Images);
        var uploadedImages = await UploadRoomImagesAsync(roomType.Id, uploadFiles);

        var selectedIndexes = GetRequestedIndexes(
            request.PrimaryImageIndexes,
            request.PrimaryImageIndex,
            uploadedImages.Count
        );

        var primaryImages = selectedIndexes
            .Select(index => uploadedImages[index])
            .ToList();

        if (primaryImages.Count == 0 && uploadedImages.Count > 0)
        {
            primaryImages.Add(uploadedImages[0]);
        }

        if (primaryImages.Count > 0)
        {
            SetPrimaryImages(roomType, uploadedImages, primaryImages);
        }

        await context.SaveChangesAsync();
        return roomType.Id;
    }

    public async Task<bool> UpdateRoomTypeAsync(int id, UpdateRoomTypeRequest request)
    {
        var roomType = await context.RoomTypes
            .FirstOrDefaultAsync(rt => rt.Id == id && rt.DeletedAt == null);

        if (roomType == null) return false;

        roomType.Name = request.Name.Trim();
        roomType.Description = request.Description?.Trim();
        roomType.BasePrice = request.BasePrice;
        roomType.CapacityAdults = request.CapacityAdults;
        roomType.CapacityChildren = request.CapacityChildren;
        roomType.UpdatedAt = DateTime.UtcNow;

        var currentImages = await context.RoomImages
            .Where(img => img.RoomTypeId == id && img.Status == ActiveStatus)
            .ToListAsync();

        var deletedImageIds = request.DeletedImageIds?.Distinct().ToHashSet() ?? new HashSet<int>();

        if (deletedImageIds.Count > 0)
        {
            foreach (var image in currentImages.Where(img => deletedImageIds.Contains(img.Id)).ToList())
            {
                if (!string.IsNullOrWhiteSpace(image.CloudPublicId))
                {
                    await cloudinaryService.DeleteImageAsync(image.CloudPublicId);
                }

                image.Status = DeletedStatus;
                image.IsPrimary = false;
            }
        }

        var uploadFiles = GetUploadFiles(request.Image, request.Images);
        var uploadedImages = await UploadRoomImagesAsync(roomType.Id, uploadFiles);

        var activeImages = currentImages
            .Where(img => !deletedImageIds.Contains(img.Id))
            .Concat(uploadedImages)
            .ToList();

        var selectedPrimaryImages = new List<RoomImage>();
        var selectedPrimaryIds = new List<int>();

        if (request.PrimaryImageId.HasValue)
        {
            selectedPrimaryIds.Add(request.PrimaryImageId.Value);
        }

        if (request.PrimaryImageIds != null)
        {
            selectedPrimaryIds.AddRange(request.PrimaryImageIds);
        }

        foreach (var primaryId in selectedPrimaryIds.Distinct())
        {
            var image = activeImages.FirstOrDefault(img => img.Id == primaryId);
            if (image != null) AddUniquePrimaryImage(selectedPrimaryImages, image);
        }

        var selectedIndexes = GetRequestedIndexes(
            request.PrimaryImageIndexes,
            request.PrimaryImageIndex,
            uploadedImages.Count
        );

        foreach (var index in selectedIndexes)
        {
            AddUniquePrimaryImage(selectedPrimaryImages, uploadedImages[index]);
        }

        if (selectedPrimaryImages.Count == 0)
        {
            foreach (var image in activeImages.Where(img => img.IsPrimary))
            {
                AddUniquePrimaryImage(selectedPrimaryImages, image);
            }
        }

        if (selectedPrimaryImages.Count == 0 && activeImages.Count > 0)
        {
            selectedPrimaryImages.Add(activeImages[0]);
        }

        if (selectedPrimaryImages.Count > 0)
        {
            SetPrimaryImages(roomType, activeImages, selectedPrimaryImages);
        }
        else
        {
            roomType.ImageUrl = null;
            roomType.CloudinaryPublicId = null;
        }

        await context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteRoomTypeAsync(int id)
    {
        var roomType = await context.RoomTypes.FindAsync(id);
        if (roomType == null) return false;

        roomType.DeletedAt = DateTime.UtcNow;
        await context.SaveChangesAsync();
        return true;
    }

    private static List<IFormFile> GetUploadFiles(IFormFile? singleImage, List<IFormFile>? images)
    {
        var files = images?
            .Where(file => file != null && file.Length > 0)
            .ToList() ?? new List<IFormFile>();

        if (singleImage != null && singleImage.Length > 0)
        {
            var alreadyIncluded = files.Any(file =>
                string.Equals(file.FileName, singleImage.FileName, StringComparison.OrdinalIgnoreCase)
                && file.Length == singleImage.Length);

            if (!alreadyIncluded)
            {
                files.Add(singleImage);
            }
        }

        return files;
    }

    private async Task<List<RoomImage>> UploadRoomImagesAsync(int roomTypeId, IReadOnlyCollection<IFormFile> files)
    {
        var uploadedImages = new List<RoomImage>();

        foreach (var file in files)
        {
            var uploadResult = await cloudinaryService.UploadImageAsync(file, "room_types");
            if (string.IsNullOrWhiteSpace(uploadResult.Url)) continue;

            var roomImage = new RoomImage
            {
                RoomTypeId = roomTypeId,
                ImageUrl = uploadResult.Url,
                CloudPublicId = uploadResult.PublicId,
                IsPrimary = false,
                Status = ActiveStatus,
                CreatedAt = DateTime.UtcNow
            };

            context.RoomImages.Add(roomImage);
            uploadedImages.Add(roomImage);
        }

        return uploadedImages;
    }

    private static List<int> GetRequestedIndexes(List<int>? requestedIndexes, int? requestedIndex, int total)
    {
        if (total <= 0) return new List<int>();

        var indexes = new List<int>();

        if (requestedIndex.HasValue)
        {
            indexes.Add(requestedIndex.Value);
        }

        if (requestedIndexes != null)
        {
            indexes.AddRange(requestedIndexes);
        }

        return indexes
            .Where(index => index >= 0 && index < total)
            .Distinct()
            .ToList();
    }

    private static void SetPrimaryImages(RoomType roomType, List<RoomImage> images, List<RoomImage> primaryImages)
    {
        foreach (var image in images)
        {
            image.IsPrimary = primaryImages.Any(primary => SameImage(primary, image));
        }

        var firstPrimaryImage = primaryImages.FirstOrDefault();
        if (firstPrimaryImage == null) return;

        roomType.ImageUrl = firstPrimaryImage.ImageUrl;
        roomType.CloudinaryPublicId = firstPrimaryImage.CloudPublicId;
    }

    private static void AddUniquePrimaryImage(List<RoomImage> images, RoomImage image)
    {
        if (!images.Any(existing => SameImage(existing, image)))
        {
            images.Add(image);
        }
    }

    private static bool SameImage(RoomImage first, RoomImage second)
    {
        if (ReferenceEquals(first, second)) return true;
        return first.Id != 0 && first.Id == second.Id;
    }
}