using Microsoft.AspNetCore.Http;

namespace HotelERP.BE.Application.DTOs;

public record RoomFilterRequest(string? Status, string? CleaningStatus, int? RoomTypeId);

public record RoomResponseDto(int Id, string RoomNumber, int? Floor, string Status, string CleaningStatus, string RoomTypeName, int? RoomTypeId);

public record RoomDetailResponseDto(
    int Id, 
    string RoomNumber, 
    string Status, 
    string CleaningStatus, 
    int? RoomTypeId, 
    string RoomTypeName, 
    decimal BasePrice
);

public record CreateRoomRequest(string RoomNumber,int? Floor, int? RoomTypeId, string Status, string CleaningStatus);
public record UpdateRoomRequest(string RoomNumber, int? Floor, int? RoomTypeId);
public record UpdateCleaningStatusRequest(string NewCleaningStatus);
public record UpdateRoomStatusRequest(string NewStatus);
public record ReportDamageRequest(
    int RoomId, 
    int? BookingDetailId,
    int? RoomInventoryId,
    string ItemName, 
    string? Description, 
    decimal PenaltyAmount,
    int Quantity, 
    string Reason, 
    IFormFile? EvidenceImage
);

public record DamageReportResponseDto(
    int Id, 
    string? Description, 
    decimal PenaltyAmount, 
    int Quantity, 
    string? EvidenceImageUrl, 
    DateTime? CreatedAt
);