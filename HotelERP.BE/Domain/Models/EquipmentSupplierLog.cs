namespace HotelERP.BE.Domain.Models;

public class EquipmentSupplierLog
{
    public int Id { get; set; }

    public int EquipmentId { get; set; }

    public virtual Equipment Equipment { get; set; } = null!;

    /// <summary>Người thực hiện nhập kho (UserId, nullable nếu import hệ thống)</summary>
    public int? UserId { get; set; }

    public virtual User? User { get; set; }

    public DateTime LogDate { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// JSON chứa toàn bộ thông tin lần nhập:
    /// { supplierName, quantity, unitPrice, notes, source }
    /// </summary>
    public string LogData { get; set; } = "{}";
}
