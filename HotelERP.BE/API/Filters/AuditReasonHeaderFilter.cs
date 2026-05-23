using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace HotelERP.BE.API.Filters;

public class AuditReasonHeaderFilter : IOperationFilter
{
    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        if (operation.Parameters == null) operation.Parameters = new List<OpenApiParameter>();

        // Chỉ thêm ô nhập Header nếu API đó có gắn nhãn AuditLogInterceptor
        var hasAuditFilter = context.MethodInfo.GetCustomAttributes(true).OfType<AuditLogInterceptorAttribute>().Any();
        
        if (hasAuditFilter)
        {
            operation.Parameters.Add(new OpenApiParameter
            {
                Name = "X-Audit-Reason",
                In = ParameterLocation.Header,
                Description = "BẮT BUỘC: Nhập lý do thực hiện thao tác này để ghi Log hệ thống",
                Required = true // Bắt buộc nhập
            });
        }
    }
}