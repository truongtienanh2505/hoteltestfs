using System.ComponentModel.DataAnnotations;

namespace HotelERP.BE.DTOs.Invoices;

public class FinalizeInvoiceRequestDto
{
    [Required(ErrorMessage = "paymentMethod là bắt buộc.")]
    [StringLength(50, ErrorMessage = "paymentMethod tối đa 50 ký tự.")]
    public string PaymentMethod { get; set; } = "Cash";

    [StringLength(100, ErrorMessage = "transactionCode tối đa 100 ký tự.")]
    public string? TransactionCode { get; set; }

    [StringLength(1000, ErrorMessage = "note tối đa 1000 ký tự.")]
    public string? Note { get; set; }
}