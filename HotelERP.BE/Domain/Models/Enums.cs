namespace HotelERP.BE.Models.Enums
{
    public enum NotificationAction
    {
        CreateAccount,
        UpdateAccount,
        ChangeRole,
        LockAccount,
        UnlockAccount,
        ResetPassword,
        SystemUpdate,
        CreateBooking,
        CheckIn,
        CheckOut,
        CancelBooking,
        ChangeRoom,
        AddDeposit,
        ConfirmPayment,
        FinalizeInvoice,
        AddExtraFee,
        CreateDamage,
        UpdateDamage,
        RedirectToReview
    }

    public enum NotificationType
    {
        Info,
        Success,
        Warning,
        Error
    }
}