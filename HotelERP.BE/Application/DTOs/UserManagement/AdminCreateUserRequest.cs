using System.ComponentModel.DataAnnotations;

namespace HotelERP.BE.Application.DTOs.UserManagement;

public class AdminCreateUserRequest
{
    [Required(ErrorMessage = "Họ tên không được để trống")]
    public string FullName { get; set; } = null!;

    [Required(ErrorMessage = "Email không được để trống")]
    [EmailAddress(ErrorMessage = "Email không đúng định dạng")]
    public string Email { get; set; } = null!;

    [Required(ErrorMessage = "Mật khẩu không được để trống")]
    [MinLength(6, ErrorMessage = "Mật khẩu phải có ít nhất 6 ký tự")]
    public string Password { get; set; } = null!;

    [Required(ErrorMessage = "Vui lòng phân quyền (Vai trò)")]
    public int RoleId { get; set; }

    public string? Phone { get; set; }
}