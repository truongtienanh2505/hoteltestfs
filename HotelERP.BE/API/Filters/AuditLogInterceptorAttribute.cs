using System.Security.Claims;
using HotelERP.BE.Domain.Models; 
using HotelERP.BE.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.DependencyInjection;

namespace HotelERP.BE.API.Filters;

// Dùng Attribute để có thể gắn [AuditLogInterceptor] lên bất kỳ API nào
public class AuditLogInterceptorAttribute : ActionFilterAttribute
{
    private readonly string _actionName;
    private readonly string _tableName;

    // Khi gắn nhãn, ta sẽ khai báo luôn API này đang làm hành động gì, trên bảng nào
    public AuditLogInterceptorAttribute(string actionName, string tableName)
    {
        _actionName = actionName;
        _tableName = tableName;
    }

    public override async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var rawReason = context.HttpContext.Request.Headers["X-Audit-Reason"].FirstOrDefault();
        
        if (string.IsNullOrWhiteSpace(rawReason))
        {
            context.Result = new BadRequestObjectResult(new { 
                success = false, 
                message = $"[Bảo mật] Thao tác '{_actionName}' trên bảng '{_tableName}' yêu cầu bắt buộc phải cung cấp lý do (Header: X-Audit-Reason)." 
            });
            return;
        }

        // Giải mã tiếng Việt
        var decodedReason = System.Net.WebUtility.UrlDecode(rawReason);

        // Đút "Lý do" và "Tên hành động" vào túi (HttpContext.Items) để mang vào tận trong kho DbContext
        context.HttpContext.Items["AuditReason"] = decodedReason;
        context.HttpContext.Items["AuditAction"] = _actionName;

        // Cho phép API chạy bình thường (KHÔNG lưu Database ở đây nữa)
        await next();
    }
}