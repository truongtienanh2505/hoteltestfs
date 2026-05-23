using System.ComponentModel.DataAnnotations;

namespace HotelERP.BE.DTOs.Invoices;

public class ApplyInvoiceVoucherRequestDto
{
    [StringLength(100, ErrorMessage = "code tối đa 100 ký tự.")]
    public string? Code { get; set; }
}
