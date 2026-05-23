using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HotelERP.BE.Infrastructure.Data;
using HotelERP.BE.Application.DTOs;
using Microsoft.AspNetCore.Authorization;
using HotelERP.BE.Constants;
using System.Security.Claims;
using HotelERP.BE.Helpers.AuditLogs;

namespace HotelERP.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class EquipmentsController(HotelDbContext context) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetEquipments(
        [FromQuery] string? search,
        [FromQuery] string? category,
        [FromQuery] bool includeDeleted = false)
    {
        // Mặc định chỉ lấy IsActive=true, trừ khi muốn xem sản phẩm đã xóa mềm
        var query = includeDeleted
            ? context.Equipments.Where(e => !e.IsActive)
            : context.Equipments.Where(e => e.IsActive);

        if (!string.IsNullOrEmpty(search))
        {
            query = query.Where(e => e.Name.Contains(search) || e.ItemCode.Contains(search));
        }

        if (!string.IsNullOrEmpty(category))
        {
            query = query.Where(e => e.Category == category);
        }

        var equipments = await query
            .OrderBy(e => e.Name)
            .Select(e => new EquipmentResponseDto(
                e.Id,
                e.ImageUrl,
                e.ItemCode,
                e.Name,
                e.Category,
                e.Unit,
                e.TotalQuantity,
                Math.Max(0, e.TotalQuantity - e.InUseQuantity - e.DamagedQuantity - e.LiquidatedQuantity),
                e.InUseQuantity,
                e.DamagedQuantity,
                e.BasePrice,
                e.DefaultPriceIfLost,
                e.Supplier
            ))
            .ToListAsync();

        return Ok(new { success = true, data = equipments });
    }

    [HttpPost]
    public async Task<IActionResult> CreateEquipment([FromBody] CreateEquipmentDto req)
    {
        if (await context.Equipments.AnyAsync(e => e.ItemCode == req.ItemCode && e.IsActive))
        {
            return BadRequest(new { success = false, message = "Mã vật tư đã tồn tại!" });
        }

        var equipment = new HotelERP.BE.Domain.Models.Equipment
        {
            ItemCode = req.ItemCode,
            Name = req.Name,
            Category = req.Category,
            Unit = req.Unit,
            TotalQuantity = req.TotalQuantity,
            BasePrice = req.BasePrice,
            DefaultPriceIfLost = req.DefaultPriceIfLost,
            ImageUrl = req.ImageUrl,
            Supplier = req.Supplier,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        context.Equipments.Add(equipment);
        await context.SaveChangesAsync();

        return Ok(new { success = true, message = "Thêm vật tư thành công!", data = equipment.Id });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateEquipment(int id, [FromBody] UpdateEquipmentDto req)
    {
        var equipment = await context.Equipments.FirstOrDefaultAsync(e => e.Id == id && e.IsActive);
        if (equipment == null) return NotFound(new { success = false, message = "Không tìm thấy vật tư!" });

        if (await context.Equipments.AnyAsync(e => e.ItemCode == req.ItemCode && e.Id != id && e.IsActive))
        {
            return BadRequest(new { success = false, message = "Mã vật tư đã tồn tại ở mục khác!" });
        }

        equipment.ItemCode = req.ItemCode;
        equipment.Name = req.Name;
        equipment.Category = req.Category;
        equipment.Unit = req.Unit;
        equipment.TotalQuantity = req.TotalQuantity;
        equipment.BasePrice = req.BasePrice;
        equipment.DefaultPriceIfLost = req.DefaultPriceIfLost;
        equipment.ImageUrl = req.ImageUrl;

        // Dedup supplier string (phòng trường hợp UI trả về chuỗi bị lặp như "A | B | A | B")
        if (!string.IsNullOrWhiteSpace(req.Supplier))
        {
            var dedupedSuppliers = req.Supplier
                .Split(new[] { " | " }, StringSplitOptions.RemoveEmptyEntries)
                .Select(s => s.Trim())
                .Where(s => !string.IsNullOrEmpty(s))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();
            equipment.Supplier = string.Join(" | ", dedupedSuppliers);
        }
        else
        {
            equipment.Supplier = req.Supplier;
        }

        equipment.UpdatedAt = DateTime.UtcNow;

        await context.SaveChangesAsync();

        return Ok(new { success = true, message = "Cập nhật vật tư thành công!" });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteEquipment(int id)
    {
        var equipment = await context.Equipments.FirstOrDefaultAsync(e => e.Id == id && e.IsActive);
        if (equipment == null) return NotFound(new { success = false, message = "Không tìm thấy vật tư!" });

        equipment.IsActive = false;
        equipment.UpdatedAt = DateTime.UtcNow;
        
        await context.SaveChangesAsync();

        return Ok(new { success = true, message = "Đã xóa vật tư!" });
    }

    [HttpPatch("{id}/restore")]
    public async Task<IActionResult> RestoreEquipment(int id)
    {
        // Chỉ tìm trong sản phẩm đã xóa mềm
        var equipment = await context.Equipments.FirstOrDefaultAsync(e => e.Id == id && !e.IsActive);
        if (equipment == null)
            return NotFound(new { success = false, message = "Không tìm thấy vật tư đã xóa!" });

        // Kiểm tra xem trong kho có sản phẩm tương tự đang hoạt động không
        var duplicate = await context.Equipments.FirstOrDefaultAsync(e =>
            e.Name == equipment.Name &&
            e.Supplier == equipment.Supplier &&
            e.IsActive &&
            e.Id != id);

        if (duplicate != null)
        {
            return BadRequest(new
            {
                success = false,
                message = $"Không thể khôi phục: trong kho đang có sản phẩm \"{ equipment.Name}\" " +
                          $"(mã {duplicate.ItemCode}) cùng nhà cung cấp đang hoạt động. " +
                          $"Vui lòng xóa sản phẩm trùng trước khi khôi phục."
            });
        }

        equipment.IsActive = true;
        equipment.UpdatedAt = DateTime.UtcNow;
        await context.SaveChangesAsync();

        return Ok(new { success = true, message = $"Đã khôi phục \"{ equipment.Name}\" vào kho!" });
    }

    [HttpGet("{id}/suppliers")]
    public async Task<IActionResult> GetSupplierLogs(int id)
    {
        var equipment = await context.Equipments.FirstOrDefaultAsync(e => e.Id == id);
        if (equipment == null)
            return NotFound(new { success = false, message = "Không tìm thấy vật tư!" });

        var rawLogs = await context.EquipmentSupplierLogs
            .Where(l => l.EquipmentId == id)
            .OrderByDescending(l => l.LogDate)
            .ToListAsync();

        var flatEvents = new List<dynamic>();
        var jsonOptions = new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true };

        foreach (var log in rawLogs)
        {
            if (string.IsNullOrEmpty(log.LogData)) continue;
            try
            {
                var parsedData = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(log.LogData, jsonOptions);
                if (parsedData.TryGetProperty("events", out var eventsArray))
                {
                    foreach (var ev in eventsArray.EnumerateArray())
                    {
                        var timestampStr = ev.GetProperty("timestamp").GetString();
                        var dt = DateTime.TryParse(timestampStr, out var d) ? d : log.LogDate;
                        flatEvents.Add(new
                        {
                            SupplierName = ev.TryGetProperty("supplierName", out var sn) ? sn.GetString() : "N/A",
                            Quantity = ev.TryGetProperty("quantity", out var q) ? q.GetInt32() : 0,
                            UnitPrice = ev.TryGetProperty("unitPrice", out var u) ? u.GetDecimal() : 0,
                            ImportedAt = dt,
                            Notes = ev.TryGetProperty("notes", out var n) ? n.GetString() : null,
                            Source = ev.TryGetProperty("source", out var s) ? s.GetString() : null
                        });
                    }
                }
            }
            catch { /* ignore invalid json */ }
        }

        var logs = flatEvents.OrderByDescending(e => e.ImportedAt).ToList();

        // Tổng hợp theo từng NCC
        var summary = logs
            .GroupBy(l => l.SupplierName)
            .Select(g => new
            {
                supplierName = g.Key,
                totalQuantity = g.Sum(l => l.Quantity),
                lastUnitPrice = g.OrderByDescending(l => l.ImportedAt).First().UnitPrice,
                lastImportedAt = g.Max(l => l.ImportedAt),
                importCount = g.Count()
            })
            .OrderByDescending(s => s.totalQuantity)
            .ToList();

        return Ok(new { success = true, data = new { equipmentName = equipment.Name, summary, logs } });
    }

    [HttpGet("export-excel")]
    public async Task<IActionResult> ExportExcel([FromQuery] string? search, [FromQuery] string? category)
    {
        var query = context.Equipments.Where(e => e.IsActive);

        if (!string.IsNullOrEmpty(search))
            query = query.Where(e => e.Name.Contains(search) || e.ItemCode.Contains(search));

        if (!string.IsNullOrEmpty(category))
            query = query.Where(e => e.Category == category);

        var equipments = await query.OrderBy(e => e.ItemCode).ToListAsync();
        
        using var workbook = new ClosedXML.Excel.XLWorkbook();
        var ws = workbook.Worksheets.Add("VatTu");

        // Header
        ws.Cell(1, 1).Value = "Mã Vật Tư";
        ws.Cell(1, 2).Value = "Tên Vật Tư";
        ws.Cell(1, 3).Value = "Danh Mục";
        ws.Cell(1, 4).Value = "Đơn Vị Tính";
        ws.Cell(1, 5).Value = "Số Lượng Nhập";  // mỗi dòng = số lượng nhập từ 1 NCC
        ws.Cell(1, 6).Value = "Giá Nhập";
        ws.Cell(1, 7).Value = "Giá Bồi Thường";
        ws.Cell(1, 8).Value = "Nhà Cung Cấp";   // 1 NCC mỗi dòng

        var header = ws.Row(1);
        header.Style.Font.Bold = true;
        header.Style.Fill.BackgroundColor = ClosedXML.Excel.XLColor.LightGray;
        header.Style.Alignment.Horizontal = ClosedXML.Excel.XLAlignmentHorizontalValues.Center;

        int dataRow = 2;
        foreach (var e in equipments)
        {
            // Tách từng NCC → mỗi NCC 1 dòng riêng (cùng Mã VT, khác NCC)
            var suppliers = (e.Supplier ?? "")
                .Split(new[] { " | " }, StringSplitOptions.RemoveEmptyEntries)
                .Select(s => s.Trim())
                .Where(s => !string.IsNullOrEmpty(s))
                .ToList();

            if (suppliers.Count == 0) suppliers.Add(""); // chưa có NCC → 1 dòng trống

            foreach (var sup in suppliers)
            {
                ws.Cell(dataRow, 1).Value = e.ItemCode;
                ws.Cell(dataRow, 2).Value = e.Name;
                ws.Cell(dataRow, 3).Value = e.Category;
                ws.Cell(dataRow, 4).Value = e.Unit;
                ws.Cell(dataRow, 5).Value = 0;              // người dùng điền số lượng nhập
                ws.Cell(dataRow, 6).Value = (double)e.BasePrice;
                ws.Cell(dataRow, 7).Value = (double)e.DefaultPriceIfLost;
                ws.Cell(dataRow, 8).Value = sup;
                dataRow++;
            }
        }

        // Tô vàng cột "Số Lượng Nhập" để dễ nhận biết cần điền
        if (dataRow > 2)
            ws.Range(2, 5, dataRow - 1, 5).Style.Fill.BackgroundColor = ClosedXML.Excel.XLColor.LightYellow;

        ws.Columns().AdjustToContents();
        ws.Column(5).Width = 18;

        using var stream = new System.IO.MemoryStream();
        workbook.SaveAs(stream);
        return File(stream.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "DanhSachVatTu.xlsx");
    }

    [HttpPost("import-excel")]
    public async Task<IActionResult> ImportExcel(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { success = false, message = "Vui lòng chọn file Excel!" });

        // FIX #2: Validate định dạng file
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext != ".xlsx" && ext != ".xlsm")
            return BadRequest(new { success = false, message = "Chỉ hỗ trợ file .xlsx hoặc .xlsm. File .xls (Excel cũ) không được hỗ trợ." });

        int successCount = 0;
        var warnings = new List<string>();

        // FIX #4 + #6: Helper normalize giá (bỏ ký tự ngàn) + parse
        static decimal ParsePrice(string? raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return 0;
            // Bỏ dấu chấm/phẩy ngàn: "16.000" → "16000", "16,000" → "16000"
            var normalized = raw.Trim().Replace(".", "").Replace(",", "");
            return decimal.TryParse(normalized, out var result) ? result : 0;
        }

        // FIX #5: Parse số lượng linh hoạt ("10.5" → 10, "10 kg" → 10)
        static int ParseQty(string? raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return 0;
            var normalized = raw.Trim().Split(' ')[0].Replace(",", "").Replace(".", "");
            return int.TryParse(normalized, out var result) ? result
                   : (decimal.TryParse(raw.Trim(), out var d) ? (int)Math.Round(d) : 0);
        }

        // FIX #5b: Separator cho danh sách NCC — dùng " | " thay vì ", " tránh conflict tên NCC có dấu phẩy
        const string SupplierSep = " | ";

        int? currentUserId = null;
        if (User?.Identity?.IsAuthenticated == true)
        {
            var userIdClaim = User.FindFirst("UserId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (int.TryParse(userIdClaim, out var id)) currentUserId = id;
        }

        try
        {
            using var stream = new System.IO.MemoryStream();
            await file.CopyToAsync(stream);

            // FIX #3: Bắt lỗi file mật khẩu / file hỏng
            ClosedXML.Excel.XLWorkbook workbook;
            try { workbook = new ClosedXML.Excel.XLWorkbook(stream); }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = $"Không thể mở file Excel: {ex.Message}. File có thể bị mật khẩu bảo vệ hoặc bị hỏng." });
            }
            using (workbook)
            {
            // Tìm sheet "VatTu", fallback sheet đầu tiên. Header luôn ở dòng 1.
            var worksheet = workbook.Worksheets.FirstOrDefault(ws =>
                ws.Name.Equals("VatTu", StringComparison.OrdinalIgnoreCase))
                ?? workbook.Worksheet(1);
            int headerRowNumber = 1;

            // Helper đọc cell an toàn (formula cells, null cells, cached values)
            static string SafeCell(ClosedXML.Excel.IXLCell? cell)
                => cell == null ? "" : (cell.CachedValue.ToString()?.Trim() ?? cell.Value.ToString()?.Trim() ?? "");

            // Đọc header row theo số thứ tự đúng (NhapKho = row 2, VatTu = row 1)
            var headerRow = worksheet.Row(headerRowNumber).IsEmpty() ? null : worksheet.Row(headerRowNumber);
            int colItemCode = 1, colName = 2, colCategory = 3, colUnit = 4, colQty = 5;
            int colBasePrice = 6, colDefaultPrice = 7, colSupplier = 8; // mặc định

            if (headerRow != null)
            {
                var lastCol = headerRow.LastCellUsed()?.Address.ColumnNumber ?? 8;
                for (int c = 1; c <= lastCol; c++)
                {
                    var h = SafeCell(headerRow.Cell(c)).ToLowerInvariant().Replace(" ", "");
                    if (h.Contains("mãvậttư") || h.Contains("mavatu")) colItemCode = c;
                    else if (h.Contains("tênvậttư") || h.Contains("tenvatu")) colName = c;
                    else if (h.Contains("danhmục") || h.Contains("danhmuc")) colCategory = c;
                    else if (h.Contains("đơnvịtính") || h.Contains("donvitinh") || h.Contains("đvt")) colUnit = c;
                    else if (h.Contains("sốlượngnhập") || h.Contains("soluongnhap") ||
                             h.Contains("tổngsốlượng") || h.Contains("tongsoluong")) colQty = c;
                    else if (h.Contains("giánhập") || h.Contains("gianhap")) colBasePrice = c;
                    else if (h.Contains("giábồithường") || h.Contains("giaboi")) colDefaultPrice = c;
                    else if (h.Contains("nhàcungcấp") || h.Contains("nhacungcap")) colSupplier = c;
                }
            }

            // Bỏ qua tất cả các dòng từ đầu đến header (gồm cả dòng mô tả của NhapKho)
            var rows = worksheet.RowsUsed().Where(r => r.RowNumber() > headerRowNumber);

            foreach (var row in rows)
            {
                if (row == null) continue;

                var itemCode = SafeCell(row.Cell(colItemCode));
                var name     = SafeCell(row.Cell(colName));

                if (string.IsNullOrEmpty(itemCode) && string.IsNullOrEmpty(name)) continue;

                var category         = SafeCell(row.Cell(colCategory));
                var unit             = SafeCell(row.Cell(colUnit));
                var totalQuantityStr = SafeCell(row.Cell(colQty));
                var basePriceStr     = SafeCell(row.Cell(colBasePrice));
                var defaultPriceStr  = SafeCell(row.Cell(colDefaultPrice));
                var supplier         = SafeCell(row.Cell(colSupplier));

                HotelERP.BE.Domain.Models.Equipment? existing = null;
                if (!string.IsNullOrEmpty(itemCode))
                {
                    // Tìm theo ItemCode — ưu tiên Active trước
                    existing = await context.Equipments.FirstOrDefaultAsync(e => e.ItemCode == itemCode && e.IsActive);

                    if (existing == null)
                    {
                        // Không tìm thấy Active → kiểm tra soft-deleted
                        var deleted = await context.Equipments.FirstOrDefaultAsync(e => e.ItemCode == itemCode && !e.IsActive);
                        if (deleted != null)
                        {
                            // Tự động reactivate thay vì tạo mới (tránh vi phạm UNIQUE key)
                            existing = deleted;
                            warnings.Add($"Mã vật tư '{itemCode}' ({deleted.Name}) đã bị xóa khỏi kho, hệ thống tự động khôi phục và cập nhật dữ liệu.");
                        }
                    }

                    // ItemCode không tồn tại trong DB (cả active lẫn đã xóa)
                    // → Fallback sang Name + Unit để tránh tạo bản ghi trùng lặp
                    if (existing == null && !string.IsNullOrEmpty(name) && !string.IsNullOrEmpty(unit))
                    {
                        existing = await context.Equipments.FirstOrDefaultAsync(e =>
                            e.Name == name &&
                            e.Unit.ToLower() == unit.ToLower() &&
                            e.IsActive);

                        if (existing != null)
                            warnings.Add($"Mã '{itemCode}' không tồn tại — đã gộp vào sản phẩm '{existing.Name}' ({existing.ItemCode}) theo Tên + Đơn vị tính.");
                        else
                        {
                            // Kiểm tra cả soft-deleted
                            var deletedByNameUnit = await context.Equipments.FirstOrDefaultAsync(e =>
                                e.Name == name &&
                                e.Unit.ToLower() == unit.ToLower() &&
                                !e.IsActive);
                            if (deletedByNameUnit != null)
                            {
                                existing = deletedByNameUnit;
                                warnings.Add($"Mã '{itemCode}' không tồn tại — tìm thấy '{deletedByNameUnit.Name}' ({deletedByNameUnit.ItemCode}) đã xóa, tự động khôi phục.");
                            }
                        }
                    }
                }
                else if (!string.IsNullOrEmpty(name))
                {
                    // Không có ItemCode → tìm theo Name + Unit
                    // Cùng tên + cùng đơn vị = cùng 1 sản phẩm (dù khác NCC)
                    var lookupUnit = !string.IsNullOrEmpty(unit) ? unit : null;

                    if (lookupUnit != null)
                    {
                        // Tìm active theo Name + Unit
                        existing = await context.Equipments.FirstOrDefaultAsync(e =>
                            e.Name == name &&
                            e.Unit.ToLower() == lookupUnit.ToLower() &&
                            e.IsActive);

                        // Không có active → kiểm tra soft-deleted
                        if (existing == null)
                        {
                            var deletedByNameUnit = await context.Equipments.FirstOrDefaultAsync(e =>
                                e.Name == name &&
                                e.Unit.ToLower() == lookupUnit.ToLower() &&
                                !e.IsActive);

                            if (deletedByNameUnit != null)
                            {
                                existing = deletedByNameUnit;
                                warnings.Add($"Sản phẩm '{name}' ({lookupUnit}) đã bị xóa khỏi kho, hệ thống tự động khôi phục và cập nhật dữ liệu.");
                            }
                        }
                    }
                    else
                    {
                        // Không có đơn vị → fallback tìm theo tên (active) đúng 1 kết quả
                        var sameNameCount = await context.Equipments.CountAsync(e => e.Name == name && e.IsActive);

                        if (sameNameCount > 1)
                        {
                            warnings.Add($"Bỏ qua dòng '{name}': tìm thấy {sameNameCount} sản phẩm cùng tên — cần thêm Mã Vật Tư hoặc Đơn Vị Tính để xác định đúng.");
                            continue;
                        }

                        existing = await context.Equipments.FirstOrDefaultAsync(e => e.Name == name && e.IsActive);

                        if (existing == null)
                        {
                            var deletedCount = await context.Equipments.CountAsync(e => e.Name == name && !e.IsActive);
                            if (deletedCount == 1)
                            {
                                existing = await context.Equipments.FirstOrDefaultAsync(e => e.Name == name && !e.IsActive);
                                warnings.Add($"Sản phẩm '{name}' đã bị xóa khỏi kho, hệ thống tự động khôi phục.");
                            }
                            else if (deletedCount > 1)
                            {
                                warnings.Add($"Bỏ qua dòng '{name}': tìm thấy {deletedCount} sản phẩm đã xóa cùng tên — vui lòng thêm Mã Vật Tư hoặc Đơn Vị Tính.");
                                continue;
                            }
                        }
                    }
                }

                if (existing != null)
                {
                    // Cập nhật thông tin (giữ nguyên nếu cột không có trong file)
                    if (!string.IsNullOrEmpty(name))     existing.Name     = name;
                    if (!string.IsNullOrEmpty(category)) existing.Category = category;
                    if (!string.IsNullOrEmpty(unit)) existing.Unit = unit;

                    // Gộp NCC vào danh sách nếu chưa có (tránh trùng lặp)
                    // Supplier từ Excel có thể là chuỗi kết hợp "A | B" — cần split ra từng NCC rồi gộp
                    if (!string.IsNullOrEmpty(supplier))
                    {
                        var currentSuppliers = (existing.Supplier ?? "")
                            .Split(new[] { " | " }, StringSplitOptions.RemoveEmptyEntries)
                            .Select(s => s.Trim())
                            .Where(s => !string.IsNullOrEmpty(s))
                            .ToList();

                        // Split incoming supplier string (may be "A | B" from exported Excel)
                        var incomingSuppliers = supplier
                            .Split(new[] { " | " }, StringSplitOptions.RemoveEmptyEntries)
                            .Select(s => s.Trim())
                            .Where(s => !string.IsNullOrEmpty(s));

                        foreach (var s in incomingSuppliers)
                        {
                            if (!currentSuppliers.Any(c => c.Equals(s, StringComparison.OrdinalIgnoreCase)))
                                currentSuppliers.Add(s);
                        }

                        existing.Supplier = string.Join(SupplierSep, currentSuppliers);
                    }

                    // CỘNG thêm số lượng vào kho (import = nhập thêm hàng)
                    // Nếu qty = 0 (user chưa điền trong sheet NhapKho) → bỏ qua dòng này
                    var qty = ParseQty(totalQuantityStr);
                    if (qty == 0)
                    {
                        // Vẫn cập nhật thông tin sản phẩm (tên, NCC...) nhưng không nhập kho
                        existing.IsActive  = true;
                        existing.UpdatedAt = DateTime.UtcNow;
                        successCount++;
                        continue;
                    }

                    existing.TotalQuantity += qty;

                    var bp = ParsePrice(basePriceStr);
                    if (bp > 0) existing.BasePrice = bp;

                    var dp = ParsePrice(defaultPriceStr);
                    if (dp > 0) existing.DefaultPriceIfLost = dp;

                    existing.IsActive  = true;
                    existing.UpdatedAt = DateTime.UtcNow;

                    // Ghi log NCC — tách từng NCC riêng lẻ (supplier có thể là "A | B")
                    if (!string.IsNullOrEmpty(supplier))
                    {
                        var logSuppliers = supplier
                            .Split(new[] { " | " }, StringSplitOptions.RemoveEmptyEntries)
                            .Select(s => s.Trim())
                            .Where(s => !string.IsNullOrEmpty(s));
                        foreach (var logSup in logSuppliers)
                        {
                            await context.AddEquipmentSupplierLogAsync(
                                equipmentId: existing.Id,
                                userId: currentUserId,
                                supplierName: logSup,
                                quantity: qty,
                                unitPrice: bp,
                                source: "Excel"
                            );
                        }
                    }
                }
                else
                {
                    // Tự động tạo mã vật tư nếu thiếu: lấy 2 ký tự đầu của tên + 4 số ngẫu nhiên
                    string newCode;
                    if (!string.IsNullOrEmpty(itemCode))
                    {
                        newCode = itemCode;
                    }
                    else
                    {
                        var nameForCode = !string.IsNullOrEmpty(name) ? name : "VT";
                        // Bỏ dấu và ký tự đặc biệt, lấy chữ cái đầu của từng từ (tối đa 4 từ)
                        var words = nameForCode.Split(' ', StringSplitOptions.RemoveEmptyEntries);
                        var prefix = new string(words.Take(4)
                            .Select(w => char.ToUpperInvariant(w[0]))
                            .ToArray());
                        // Đảm bảo không trùng với mã đã có
                        var suffix = new Random().Next(1000, 9999).ToString();
                        newCode = $"{prefix}-{suffix}";
                        // Kiểm tra trùng, nếu trùng thì sinh lại
                        while (await context.Equipments.AnyAsync(e => e.ItemCode == newCode))
                            newCode = $"{prefix}-{new Random().Next(1000, 9999)}";
                        warnings.Add($"Sản phẩm '{nameForCode}' thiếu mã vật tư — đã tự động tạo mã: {newCode}");
                    }
                    var newName = !string.IsNullOrEmpty(name) ? name : newCode;
                    var newCategory = !string.IsNullOrEmpty(category) ? category : "Khác";
                    var newUnit = !string.IsNullOrEmpty(unit) ? unit : "Cái";
                    
                    var totalQuantity = ParseQty(totalQuantityStr);
                    var basePrice     = ParsePrice(basePriceStr);
                    var defaultPrice  = ParsePrice(defaultPriceStr);

                    var newEquipment = new HotelERP.BE.Domain.Models.Equipment
                    {
                        ItemCode           = newCode,
                        Name               = newName,
                        Category           = newCategory,
                        Unit               = newUnit,
                        TotalQuantity      = totalQuantity,
                        BasePrice          = basePrice,
                        DefaultPriceIfLost = defaultPrice,
                        Supplier           = supplier,
                        IsActive           = true,
                        CreatedAt          = DateTime.UtcNow
                    };
                    context.Equipments.Add(newEquipment);
                    await context.SaveChangesAsync(); // cần Id của newEquipment để log NCC

                    // Ghi log NCC cho sản phẩm mới — tách từng NCC riêng lẻ
                    if (!string.IsNullOrEmpty(supplier) && totalQuantity > 0)
                    {
                        var newLogSuppliers = supplier
                            .Split(new[] { " | " }, StringSplitOptions.RemoveEmptyEntries)
                            .Select(s => s.Trim())
                            .Where(s => !string.IsNullOrEmpty(s));
                        foreach (var logSup in newLogSuppliers)
                        {
                            await context.AddEquipmentSupplierLogAsync(
                                equipmentId: newEquipment.Id,
                                userId: currentUserId,
                                supplierName: logSup,
                                quantity: totalQuantity,
                                unitPrice: basePrice,
                                source: "Excel"
                            );
                        }
                    }
                } // end else (CREATE)
                successCount++;
            } // end foreach row

            await context.SaveChangesAsync();

            var message = $"Nhập Excel thành công! Đã xử lý {successCount} dòng.";
            if (warnings.Count > 0)
                message += $" {warnings.Count} dòng bị bỏ qua do thiếu thông tin định danh.";

            return Ok(new { success = true, message, warnings });

            } // end using (workbook)
        }
        catch (Exception ex)
        {
            var innerMsg = ex.InnerException?.InnerException?.Message 
                        ?? ex.InnerException?.Message 
                        ?? "Không có thêm chi tiết";
            return StatusCode(500, new { success = false, message = $"Lỗi: {ex.Message} | Chi tiết: {innerMsg}" });
        }
    }
}