using System;
using System.Collections.Generic;

namespace HotelERP.BE.Domain.Models;

public partial class Payment
{
    public int Id { get; set; }

    public int? InvoiceId { get; set; }

    public string? PaymentMethod { get; set; }

    public decimal AmountPaid { get; set; }

    public string? TransactionCode { get; set; }

    public DateTime PaymentDate { get; set; }

    public string PaymentDirection { get; set; } = null!;

    public string? GatewayName { get; set; }

    public string? ProviderResponse { get; set; }

    public string Status { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public virtual Invoice? Invoice { get; set; }
}
