namespace HotelERP.BE.Constants
{
    public static class PermissionKeys
    {
        // 1. Hệ thống & Báo cáo
        public const string ViewDashboard = "VIEW_DASHBOARD";
        public const string ViewReports = "VIEW_REPORTS";
        public const string ViewSystemLogs = "VIEW_SYSTEM_LOGS";
        public const string ViewNotifications = "VIEW_NOTIFICATIONS";

        // 2. Quản lý Nhân sự & Quyền
        public const string ManageUsers = "MANAGE_USERS";
        public const string ManageRoles = "MANAGE_ROLES";

        // 3. Quản lý Phòng & Tiện nghi
        public const string ViewRooms = "VIEW_ROOMS";
        public const string ManageRooms = "MANAGE_ROOMS";
        public const string UpdateRoomStatus = "UPDATE_ROOM_STATUS";
        public const string ManageAmenities = "MANAGE_AMENITIES";
        public const string ManageMaintenance = "MANAGE_MAINTENANCE";

        // 4. Quản lý Đặt phòng & Tài chính
        public const string ManageBookings = "MANAGE_BOOKINGS";
        public const string ManageInvoices = "MANAGE_INVOICES";
        public const string CheckInOut = "CHECK_IN_OUT";
        public const string ForceCancelBookings = "FORCE_CANCEL_BOOKINGS";

        // 5. Quản lý Dịch vụ & Kho
        public const string ManageServices = "MANAGE_SERVICES";
        public const string ManageInventory = "MANAGE_INVENTORY";

        // 6. Quản lý Nội dung
        public const string ManageContent = "MANAGE_CONTENT";
    }
}