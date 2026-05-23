namespace HotelERP.BE.Application.DTOs;

public record RoomInventoryResponseDto(
    int Id,
    int EquipmentId,
    string ItemName,
    string Category,
    int Quantity,
    string Unit,
    string Status,
    decimal PriceIfLost
);

public record AddInventoryRequest(
    int EquipmentId,
    int Quantity,
    string? Condition,
    bool IsMinibar,
    decimal PriceIfLost
);

public record UpdateInventoryRequest(
    int EquipmentId,
    int Quantity,
    string? Condition,
    bool IsMinibar,
    decimal PriceIfLost
);