using System.Text;
using HotelERP.BE.API.Filters;
using HotelERP.BE.Application.Interfaces;
using HotelERP.BE.Application.Services;
using HotelERP.BE.Infrastructure.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using StackExchange.Redis;
using RedLockNet;
using RedLockNet.SERedis;
using RedLockNet.SERedis.Configuration;
using Hangfire;
using HotelERP.BE.Utils;
using HotelERP.BE.Services;
using Microsoft.AspNetCore.Mvc;
using HotelERP.BE.DTOs.Configurations;
using HotelERP.BE.DTOs.Common;
using HotelERP.BE.Helpers.AuditLogs;
using HotelERP.BE.Services.Bookings;
using HotelERP.BE.Services.Loyalty;
using HotelERP.BE.Services.RoomTypes;
using HotelERP.BE.Services.Vouchers;
using HotelERP.BE.Hubs;
using HotelERP.BE.Constants;
using System.Reflection;

var builder = WebApplication.CreateBuilder(args);

// --- 1. CẤU HÌNH DATABASE ---
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' was not found.");

builder.Services.AddDbContext<HotelDbContext>(options =>
    options.UseSqlServer(connectionString));

// --- 2. CẤU HÌNH JSON VÀ VALIDATION (Gộp của bạn & Long) ---
builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
});

// Bộ lọc lỗi Validation xịn của Long
builder.Services.Configure<ApiBehaviorOptions>(options =>
{
    options.InvalidModelStateResponseFactory = context =>
    {
        var errors = context.ModelState
            .Where(x => x.Value is not null && x.Value.Errors.Count > 0)
            .Select(x => new
            {
                field = x.Key,
                errors = x.Value!.Errors.Select(e =>
                    string.IsNullOrWhiteSpace(e.ErrorMessage)
                        ? "Invalid value."
                        : e.ErrorMessage)
            });

        var response = ApiResult<object>.Fail(
            StatusCodes.Status400BadRequest,
            "VALIDATION_ERROR",
            "Dữ liệu đầu vào không hợp lệ.",
            errors);

        return new BadRequestObjectResult(response);
    };
});

// Cấu hình CORS cho SignalR 
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowSignalR", policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

// SignalR của L
builder.Services.AddSignalR();

// --- 3. CẤU HÌNH JWT AUTHENTICATION ---
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secretKeyString = jwtSettings["Secret"] ?? "HotelERP_Super_Secret_Key_Must_Be_Long_Enough_2026_DotNet10";
var secretKey = Encoding.UTF8.GetBytes(secretKeyString);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(secretKey),
        ValidateIssuer = true,
        ValidIssuer = jwtSettings["Issuer"] ?? "HotelERP.BE",
        ValidateAudience = true,
        ValidAudience = jwtSettings["Audience"] ?? "HotelERP.Clients",
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };

    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            // Lấy token từ tham số "access_token" trên URL mà SignalR gửi lên
            var accessToken = context.Request.Query["access_token"];

            // Kiểm tra nếu request đang gọi đến Hub (của cả bạn và Long)
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && 
                (path.StartsWithSegments("/notificationHub") || path.StartsWithSegments("/roomHub")))
            {
                // Gán token vào context để hệ thống chấp nhận kết nối
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
    };
});

// --- 4. CẤU HÌNH RBAC DYNAMICS (Tự động tạo Policy từ PermissionKeys) ---
builder.Services.AddAuthorization(options =>
{
    // Lấy tất cả các hằng số string trong lớp PermissionKeys
    var permissions = typeof(PermissionKeys)
        .GetFields(BindingFlags.Public | BindingFlags.Static | BindingFlags.FlattenHierarchy)
        .Where(f => f.IsLiteral && !f.IsInitOnly && f.FieldType == typeof(string))
        .Select(f => (string)f.GetRawConstantValue()!)
        .ToList();

    // Tự động tạo Policy cho từng Permission
    foreach (var permission in permissions)
    {
        options.AddPolicy(permission, policy => 
            policy.RequireClaim("permission", permission));
    }
});

// --- 5. CẤU HÌNH HANGFIRE & REDIS ---
builder.Services.AddHangfire(config => config
    .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
    .UseSimpleAssemblyNameTypeSerializer()
    .UseRecommendedSerializerSettings()
    .UseSqlServerStorage(connectionString));

builder.Services.AddHangfireServer(); 

// Lấy chuỗi kết nối từ appsettings.json
var redisConnectionString = builder.Configuration.GetConnectionString("Redis");
// KIỂM TRA CHUỖI KẾT NỐI REDIS
Console.WriteLine("Redis Connection String: " + redisConnectionString);
// Nếu chuỗi bị rỗng (null) thì báo lỗi ngay lập tức 
if (string.IsNullOrEmpty(redisConnectionString))
{
    throw new Exception("LỖI: Chưa lấy được chuỗi kết nối Redis từ appsettings.json!");
}
// Kết nối bằng chuỗi đã lấy
var redisConnection = ConnectionMultiplexer.Connect(redisConnectionString);
builder.Services.AddSingleton<IConnectionMultiplexer>(redisConnection);

builder.Services.AddSingleton<IDistributedLockFactory>(provider =>
{
    var multiplexers = new List<RedLockMultiplexer> { new RedLockMultiplexer(redisConnection) };
    return RedLockFactory.Create(multiplexers);
});

// --- 6. ĐĂNG KÝ SERVICES ---

// Options của Loyalty Points
builder.Services.Configure<MomoOptions>(
    builder.Configuration.GetSection(MomoOptions.SectionName));

builder.Services.Configure<LoyaltyPointsOptions>(
    builder.Configuration.GetSection(LoyaltyPointsOptions.SectionName));

builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUserProfileService, UserProfileService>();
builder.Services.AddScoped<IPhotoService, PhotoService>();
builder.Services.AddScoped<IUserManagementService, UserManagementService>();
builder.Services.AddScoped<IBookingEngineService, BookingEngineService>();
builder.Services.AddScoped<IRoomInventoryService, RoomInventoryService>();
builder.Services.AddScoped<ICloudinaryService, CloudinaryService>();
builder.Services.AddScoped<ArticleService>();
builder.Services.AddScoped<ILoyaltyPointService, LoyaltyPointService>();
builder.Services.AddScoped<IVoucherService, VoucherService>();
builder.Services.AddScoped<IVoucherAuditLogHelper, VoucherAuditLogHelper>();
builder.Services.AddScoped<IInvoiceService, InvoiceService>();
builder.Services.AddScoped<IRoomTypeService, RoomTypeService>();
builder.Services.AddScoped<IRoomTypeQueryService, RoomTypeQueryService>();
builder.Services.AddScoped<IBookingVoucherService, BookingVoucherService>();
builder.Services.AddScoped<IRoomService, RoomService>();
builder.Services.AddScoped<ArticleCategoryService>();
builder.Services.AddScoped<IAmenityService, AmenityService>();
builder.Services.AddScoped<IRoomTypeService, RoomTypeService>();
builder.Services.AddScoped<IRoomTypeAmenityService, RoomTypeAmenityService>();
builder.Services.AddSignalR();
builder.Services.AddScoped<IRoomTypeAmenityService, RoomTypeAmenityService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<IBookingManagementService, BookingManagementService>();
builder.Services.AddScoped<IOrderServiceManagementService, OrderServiceManagementService>();
builder.Services.AddScoped<IInvoiceService, InvoiceService>();
builder.Services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(typeof(Program).Assembly));
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IAuditLogService, AuditLogService>();
builder.Services.AddScoped<IRoleDashboardPeriodService, RoleDashboardPeriodService>();


builder.Services.AddHttpClient();
builder.Services.AddScoped<IMomoPaymentService, MomoPaymentService>();

builder.Services.AddHttpContextAccessor();
builder.Services.AddAuthorization();
builder.Services.AddEndpointsApiExplorer();

// --- 7. CẤU HÌNH SWAGGER ---
builder.Services.AddSwaggerGen(c =>
{
    c.OperationFilter<AuditReasonHeaderFilter>(); 
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Hotel ERP Backend API v1", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "Nhập 'Bearer' [khoảng trắng] và token của bạn vào ô bên dưới.",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

builder.Services.AddCors(options => {
    options.AddPolicy("AllowAll", policy => {
        policy.WithOrigins("http://localhost:5173") // Cổng Frontend của bạn
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials(); // BẮT BUỘC cho SignalR [cite: 615, 626]
    });
});

// ==========================================
// BUILD APP
// ==========================================
var app = builder.Build();

// --- 7. MIDDLEWARE PIPELINE ---
app.UseCors("AllowSignalR"); // CORS của phải nằm trước Auth

app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Hotel ERP Backend API v1");
    c.RoutePrefix = "swagger";
});

// Hangfire Job của bạn
using (var scope = app.Services.CreateScope())
{
    var recurringJobManager = scope.ServiceProvider.GetRequiredService<IRecurringJobManager>();
    
    // Job giải phóng booking hết hạn - chạy mỗi phút
    recurringJobManager.AddOrUpdate("ReleaseExpiredBookings", 
        () => scope.ServiceProvider.GetRequiredService<IBookingEngineService>().ReleaseExpiredBookingsAsync(), 
        Cron.Minutely);
    
    // Job 9h sáng giờ Việt Nam (UTC+7) = 02:00 UTC
    // Tự động chuyển tất cả phòng OCCUPIED + CLEAN → DIRTY (phòng có khách cần dọn lại)
    recurringJobManager.AddOrUpdate("MarkOccupiedRoomsDirtyAt9AM",
        () => scope.ServiceProvider.GetRequiredService<IRoomService>().MarkOccupiedRoomsDirtyAsync(),
        "0 2 * * *"); // 02:00 UTC = 09:00 Vietnam (UTC+7)

    // Job xóa audit log quá 3 tháng - chạy mỗi ngày lúc 17:00 UTC (00:00 Việt Nam)
    recurringJobManager.AddOrUpdate("PurgeOldAuditLogs",
        () => scope.ServiceProvider.GetRequiredService<IAuditLogService>().PurgeOldLogsAsync(),
        "0 17 * * *"); // 17:00 UTC = 00:00 Vietnam (UTC+7)

    // Job quét và vô hiệu hóa Voucher đã quá hạn, chạy mỗi ngày lúc 00:00 UTC (07:00 VN)
    recurringJobManager.AddOrUpdate("ExpireVouchersJob",
        () => scope.ServiceProvider.GetRequiredService<IVoucherService>().ExpireVouchersJobAsync(CancellationToken.None),
        Cron.Daily);
}

// app.UseHttpsRedirection(); // Commented out to prevent Authorization header stripping on Vite proxy redirect
app.UseCors("AllowSignalR"); // Dùng cái này là đủ cho cả API và SignalR
app.UseAuthentication();
app.UseAuthorization();
app.MapHub<NotificationHub>("/notificationHub"); // SignalR Hub
app.MapControllers();


// SignalR Hub 
app.MapHub<HotelERP.BE.DTOs.Hubs.RoomHub>("/roomHub");
app.MapHub<DamageHub>("/damageHub");

// --- 8. MINIMAL APIS (Health Checks & Summary) ---
app.MapGet("/", () => Results.Redirect("/swagger")).ExcludeFromDescription();

app.MapGet("/health", () => Results.Ok(new { status = "ok", utcTime = DateTime.UtcNow })).ExcludeFromDescription();

// Health DB (Bản của Long xịn hơn)
app.MapGet("/health/db", async () =>
{
    try
    {
        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync();

        await using var cmd = new SqlCommand(
            "SELECT DB_NAME() AS DbName, @@SERVERNAME AS ServerName",
            connection);
        await using var reader = await cmd.ExecuteReaderAsync();
        await reader.ReadAsync();

        var dbName = reader.IsDBNull(0) ? null : reader.GetString(0);
        var serverName = reader.IsDBNull(1) ? null : reader.GetString(1);

        return Results.Ok(new
        {
            status = "ok",
            database = dbName,
            server = serverName,
            utcTime = DateTime.UtcNow
        });
    }
    catch (Exception ex)
    {
        return Results.Problem(detail: ex.Message, statusCode: 503);
    }
}).ExcludeFromDescription();

app.MapGet("/api/system/seed-summary", async () =>
{
    try
    {
        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync();
        var sql = "SELECT (SELECT COUNT(*) FROM Users) AS users, (SELECT COUNT(*) FROM Rooms) AS rooms, (SELECT COUNT(*) FROM Bookings) AS bookings";
        await using var cmd = new SqlCommand(sql, connection);
        await using var reader = await cmd.ExecuteReaderAsync();
        await reader.ReadAsync();
        return Results.Ok(new { users = reader[0], rooms = reader[1], bookings = reader[2] });
    }
    catch (Exception ex)
    {
        return Results.Problem(detail: ex.Message);
    }
}).ExcludeFromDescription();

app.Run();