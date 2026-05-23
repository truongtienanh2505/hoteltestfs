using System.ComponentModel.DataAnnotations.Schema;
using HotelERP.BE.Domain.Models;

namespace HotelERP.BE.Models // (Sửa namespace cho khớp với dự án của bạn)
{
    [Table("User_Permissions")]
    public class UserPermission
    {
        [Column("user_id")]
        public int UserId { get; set; }
        
        [Column("permission_id")]
        public int PermissionId { get; set; }
        
        [Column("is_granted")]
        public bool IsGranted { get; set; } // True: Cấp thêm | False: Cấm/Tước quyền
        
        public virtual User? User { get; set; }
        public virtual Permission? Permission { get; set; }
    }
}