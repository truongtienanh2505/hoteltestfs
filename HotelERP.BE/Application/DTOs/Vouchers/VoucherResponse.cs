namespace HotelERP.BE.DTOs.Vouchers
{
    public class VoucherResponse
    {
        public decimal Subtotal { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal FinalAmount { get; set; }
    }
}