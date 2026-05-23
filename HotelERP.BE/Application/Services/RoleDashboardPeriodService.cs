using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using HotelERP.BE.Domain.DTOs.Dashboard;
using HotelERP.BE.Helpers.DashBoard;
using HotelERP.BE.Domain.Models;
using HotelERP.BE.Infrastructure.Data;
using HotelERP.BE.Application.Interfaces;

namespace HotelERP.BE.Application.Services;

public sealed class RoleDashboardPeriodService : IRoleDashboardPeriodService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = false
    };

    private readonly HotelDbContext _context;

    public RoleDashboardPeriodService(HotelDbContext context)
    {
        _context = context;
    }

    public async Task<DashboardPeriodResponseDto?> GetDashboardAsync(
        string roleName,
        string periodType,
        string? periodKey,
        bool currentOnly,
        CancellationToken cancellationToken = default)
    {
        var normalizedPeriodType = DashboardPeriodHelper.NormalizePeriodType(periodType);
        var dashboardCode = DashboardPeriodHelper.GetDashboardCode(roleName);

        var query = _context.RoleDashboardPeriodStates
            .AsNoTracking()
            .Where(x => x.RoleName == roleName
                && x.DashboardCode == dashboardCode
                && x.PeriodType == normalizedPeriodType);

        query = currentOnly || string.IsNullOrWhiteSpace(periodKey)
            ? query.Where(x => x.IsCurrent)
            : query.Where(x => x.PeriodKey == periodKey);

        var entity = await query
            .OrderByDescending(x => x.PeriodStart)
            .FirstOrDefaultAsync(cancellationToken);

        return entity == null ? null : ToResponseDto(entity);
    }

    public async Task<IReadOnlyList<DashboardHistoryItemDto>> GetHistoryAsync(
        string roleName,
        string periodType,
        int take,
        CancellationToken cancellationToken = default)
    {
        var normalizedPeriodType = DashboardPeriodHelper.NormalizePeriodType(periodType);
        var dashboardCode = DashboardPeriodHelper.GetDashboardCode(roleName);
        var safeTake = Math.Clamp(take, 1, 36);

        return await _context.RoleDashboardPeriodStates
            .AsNoTracking()
            .Where(x => x.RoleName == roleName
                && x.DashboardCode == dashboardCode
                && x.PeriodType == normalizedPeriodType)
            .OrderByDescending(x => x.PeriodStart)
            .Take(safeTake)
            .Select(x => new DashboardHistoryItemDto
            {
                Id = x.Id,
                RoleName = x.RoleName,
                DashboardCode = x.DashboardCode,
                PeriodType = x.PeriodType,
                PeriodKey = x.PeriodKey,
                PeriodStart = x.PeriodStart,
                PeriodEnd = x.PeriodEnd,
                Status = x.Status,
                IsCurrent = x.IsCurrent,
                UpdatedAt = x.UpdatedAt
            })
            .ToListAsync(cancellationToken);
    }

    public async Task RebuildDashboardAsync(
        string roleName,
        string periodType,
        DateTime occurredAtUtc,
        int? updatedByUserId,
        string eventType,
        int? eventRefId,
        CancellationToken cancellationToken = default)
    {
        var period = DashboardPeriodHelper.Resolve(periodType, occurredAtUtc);
        var role = await _context.Roles.FirstOrDefaultAsync(x => x.Name == roleName, cancellationToken);
        if (role == null)
        {
            return;
        }

        var dashboardCode = DashboardPeriodHelper.GetDashboardCode(role.Name);
        var dashboardTitle = role.Name + " Dashboard";

        var periodMetrics = await BuildMetricsAsync(period.PeriodStart, period.PeriodEnd, cancellationToken);
        var previousMetrics = await BuildMetricsAsync(period.PreviousPeriodStart, period.PreviousPeriodEnd, cancellationToken);

        var dashboardJson = BuildDashboardJson(role.Name, dashboardCode, period, periodMetrics);
        var comparisonJson = BuildComparisonJson(period, periodMetrics, previousMetrics);

        var existing = await _context.RoleDashboardPeriodStates.FirstOrDefaultAsync(x =>
            x.RoleId == role.Id
            && x.DashboardCode == dashboardCode
            && x.PeriodType == period.PeriodType
            && x.PeriodKey == period.PeriodKey,
            cancellationToken);

        await ClearCurrentFlagAsync(role.Id, dashboardCode, period.PeriodType, period.IsCurrent, cancellationToken);

        if (existing == null)
        {
            existing = new RoleDashboardPeriodState
            {
                RoleId = role.Id,
                RoleName = role.Name,
                DashboardCode = dashboardCode,
                DashboardTitle = dashboardTitle,
                PeriodType = period.PeriodType,
                PeriodKey = period.PeriodKey,
                CreatedAt = DateTime.UtcNow
            };

            _context.RoleDashboardPeriodStates.Add(existing);
        }

        existing.RoleName = role.Name;
        existing.DashboardTitle = dashboardTitle;
        existing.PeriodStart = period.PeriodStart;
        existing.PeriodEnd = period.PeriodEnd;
        existing.DashboardJson = dashboardJson;
        existing.ComparisonJson = comparisonJson;
        existing.Status = period.IsCurrent ? "OPEN" : "CLOSED";
        existing.IsCurrent = period.IsCurrent;
        existing.LastEventType = eventType;
        existing.LastEventSource = "RoleDashboardPeriodService";
        existing.LastEventRefId = eventRefId;
        existing.Version += existing.Id == 0 ? 0 : 1;
        existing.UpdatedAt = DateTime.UtcNow;
        existing.ClosedAt = period.IsCurrent ? null : existing.ClosedAt ?? DateTime.UtcNow;
        existing.UpdatedBy = updatedByUserId;

        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task RebuildAffectedDashboardsAsync(
        string eventType,
        DateTime occurredAtUtc,
        int? updatedByUserId,
        int? eventRefId,
        CancellationToken cancellationToken = default)
    {
        var affectedRoles = await ResolveAffectedRolesAsync(eventType, cancellationToken);

        foreach (var roleName in affectedRoles)
        {
            foreach (var periodType in DashboardPeriodHelper.DefaultEventPeriods)
            {
                await RebuildDashboardAsync(roleName, periodType, occurredAtUtc, updatedByUserId, eventType, eventRefId, cancellationToken);
            }
        }
    }

    public async Task RebuildAllCurrentDashboardsAsync(int? updatedByUserId, CancellationToken cancellationToken = default)
    {
        var roles = await _context.Roles
            .AsNoTracking()
            .Where(x => x.Name == "Admin"
                || x.Name == "Manager"
                || x.Name == "Receptionist"
                || x.Name == "Accountant"
                || x.Name == "Housekeeping"
                || x.Name == "WarehouseStaff")
            .Select(x => x.Name)
            .ToListAsync(cancellationToken);

        var now = DateTime.UtcNow;
        foreach (var roleName in roles)
        {
            foreach (var periodType in DashboardPeriodHelper.DefaultEventPeriods)
            {
                await RebuildDashboardAsync(roleName, periodType, now, updatedByUserId, "MANUAL_REBUILD", null, cancellationToken);
            }
        }
    }

    private async Task ClearCurrentFlagAsync(int roleId, string dashboardCode, string periodType, bool shouldClear, CancellationToken cancellationToken)
    {
        if (!shouldClear)
        {
            return;
        }

        var currentRows = await _context.RoleDashboardPeriodStates
            .Where(x => x.RoleId == roleId
                && x.DashboardCode == dashboardCode
                && x.PeriodType == periodType
                && x.IsCurrent)
            .ToListAsync(cancellationToken);

        foreach (var row in currentRows)
        {
            row.IsCurrent = false;
            if (row.Status == "OPEN")
            {
                row.Status = "CLOSED";
                row.ClosedAt = DateTime.UtcNow;
            }
        }
    }

    private async Task<IReadOnlyList<string>> ResolveAffectedRolesAsync(string eventType, CancellationToken cancellationToken)
    {
        var normalizedEvent = eventType.Trim().ToUpperInvariant();
        var required = normalizedEvent switch
        {
            "DAMAGE_REPORTED" or "DAMAGE_UPDATED" or "DAMAGE_CANCELLED" => new[] { "WarehouseStaff", "Housekeeping", "Accountant", "Manager", "Admin" },
            "PAYMENT_CREATED" or "INVOICE_CREATED" or "INVOICE_UPDATED" => new[] { "Accountant", "Receptionist", "Manager", "Admin" },
            "BOOKING_CREATED" or "BOOKING_UPDATED" or "BOOKING_STATUS_CHANGED" or "BOOKING_CANCELLED" => new[] { "Receptionist", "Manager", "Admin" },
            "CHECK_IN" or "CHECK_OUT" or "ROOM_ASSIGNED" => new[] { "Receptionist", "Housekeeping", "Manager", "Admin" },
            "ROOM_CLEANING_UPDATED" => new[] { "Housekeeping", "Manager", "Admin" },
            _ => new[] { "Admin", "Manager", "Receptionist", "Accountant", "Housekeeping", "WarehouseStaff" }
        };

        return await _context.Roles
            .AsNoTracking()
            .Where(x => required.Contains(x.Name))
            .Select(x => x.Name)
            .ToListAsync(cancellationToken);
    }

    private async Task<DashboardMetrics> BuildMetricsAsync(DateTime start, DateTime end, CancellationToken cancellationToken)
    {
        var totalUsers = await _context.Users.CountAsync(cancellationToken);
        var activeUsers = await _context.Users.CountAsync(x => x.Status == true, cancellationToken);
        var newCustomers = await _context.Users
            .Where(x => x.Role != null && x.Role.Name == "Guest" && x.CreatedAt >= start && x.CreatedAt <= end)
            .CountAsync(cancellationToken);

        var auditEvents = await _context.AuditLogs
            .Where(x => x.LogDate >= start.Date && x.LogDate <= end.Date)
            .CountAsync(cancellationToken);

        var unreadNotifications = await _context.Notifications
            .Where(x => x.IsRead == false && x.CreatedAt >= start && x.CreatedAt <= end)
            .CountAsync(cancellationToken);

        var lockedUsers = await _context.Users.CountAsync(x => x.Status == false, cancellationToken);

        var roleUserCountsRaw = await _context.Roles
            .AsNoTracking()
            .Select(x => new
            {
                RoleId = x.Id,
                RoleName = x.Name,
                UserCount = _context.Users.Count(u => u.RoleId == x.Id)
            })
            .OrderBy(x => x.RoleName)
            .ToListAsync(cancellationToken);

        var roleUserCounts = roleUserCountsRaw
            .Select(x => new RoleUserCount(
                RoleId: x.RoleId,
                RoleName: x.RoleName,
                UserCount: x.UserCount))
            .ToList();

        var bookings = await _context.Bookings
            .Where(x => x.CreatedAt >= start && x.CreatedAt <= end)
            .GroupBy(x => x.Status ?? "Unknown")
            .Select(g => new { Status = g.Key, Total = g.Count() })
            .ToListAsync(cancellationToken);

        var totalBookings = bookings.Sum(x => x.Total);
        var completedBookings = bookings.Where(x => x.Status == "Completed").Sum(x => x.Total);
        var cancelledBookings = bookings.Where(x => x.Status == "Cancelled").Sum(x => x.Total);
        var pendingBookings = bookings.Where(x => x.Status == "Pending").Sum(x => x.Total);
        var confirmedBookings = bookings.Where(x => x.Status == "Confirmed").Sum(x => x.Total);
        var inProgressBookings = bookings.Where(x => x.Status == "In_Progress").Sum(x => x.Total);

        var checkIns = await _context.BookingDetails.CountAsync(x => x.ActualCheckInAt.HasValue && x.ActualCheckInAt >= start && x.ActualCheckInAt <= end, cancellationToken);
        var checkOuts = await _context.BookingDetails.CountAsync(x => x.ActualCheckOutAt.HasValue && x.ActualCheckOutAt >= start && x.ActualCheckOutAt <= end, cancellationToken);

        var totalRevenue = await _context.Payments
            .Where(x => x.PaymentDate >= start && x.PaymentDate <= end)
            .SumAsync(x => (decimal?)x.AmountPaid, cancellationToken) ?? 0m;

        var invoiceMetrics = await _context.Invoices
            .Where(x => x.CreatedAt >= start && x.CreatedAt <= end)
            .GroupBy(_ => 1)
            .Select(g => new
            {
                RoomRevenue = g.Sum(x => x.Status == "Cancelled" ? 0m : (x.TotalRoomAmount ?? 0m)),
                ServiceRevenue = g.Sum(x => x.Status == "Cancelled" ? 0m : (x.TotalServiceAmount ?? 0m)),
                PendingPaymentAmount = g.Sum(x => x.Status == "Unpaid" ? (x.FinalTotal ?? 0m) : 0m),
                PaidInvoices = g.Count(x => x.Status == "Paid"),
                UnpaidInvoices = g.Count(x => x.Status == "Unpaid")
            })
            .FirstOrDefaultAsync(cancellationToken);

        var totalRooms = await _context.Rooms.CountAsync(cancellationToken);
        var availableRooms = await _context.Rooms.CountAsync(x => x.Status == "Available", cancellationToken);
        var occupiedRooms = await _context.Rooms.CountAsync(x => x.Status == "Occupied", cancellationToken);
        var maintenanceRooms = await _context.Rooms.CountAsync(x => x.Status == "Maintenance", cancellationToken);
        var dirtyRooms = await _context.Rooms.CountAsync(x => x.CleaningStatus == "Dirty", cancellationToken);
        var cleaningRooms = await _context.Rooms.CountAsync(x => x.CleaningStatus == "Cleaning", cancellationToken);
        var occupancyRate = totalRooms == 0 ? 0m : Math.Round((decimal)occupiedRooms / totalRooms * 100m, 2);

        var damageMetrics = await _context.LossAndDamages
            .Where(x => x.CreatedAt >= start && x.CreatedAt <= end)
            .GroupBy(_ => 1)
            .Select(g => new
            {
                Reports = g.Count(),
                Quantity = g.Sum(x => x.Quantity),
                PenaltyAmount = g.Sum(x => x.PenaltyAmount)
            })
            .FirstOrDefaultAsync(cancellationToken);

        var equipmentMetrics = await _context.Equipments
            .Where(x => x.IsActive)
            .GroupBy(_ => 1)
            .Select(g => new
            {
                TotalEquipmentTypes = g.Count(),
                InStockQuantity = g.Sum(x => (x.TotalQuantity - x.InUseQuantity - x.DamagedQuantity - x.LiquidatedQuantity)),
                InUseQuantity = g.Sum(x => x.InUseQuantity),
                CurrentDamagedQuantity = g.Sum(x => x.DamagedQuantity),
                LowStockItems = g.Count(x => ((x.TotalQuantity - x.InUseQuantity - x.DamagedQuantity - x.LiquidatedQuantity)) <= 10)
            })
            .FirstOrDefaultAsync(cancellationToken);

        var reviewMetrics = await _context.Reviews
            .Where(x => x.CreatedAt >= start && x.CreatedAt <= end)
            .GroupBy(_ => 1)
            .Select(g => new
            {
                NewReviews = g.Count(),
                AverageRating = g.Average(x => (decimal)x.Rating)
            })
            .FirstOrDefaultAsync(cancellationToken);

        var recentAuditLogs = await _context.AuditLogs
            .AsNoTracking()
            .Include(x => x.User)
            .OrderByDescending(x => x.LogDate)
            .ThenByDescending(x => x.Id)
            .Take(20)
            .ToListAsync(cancellationToken);

        var recentAudits = recentAuditLogs
            .SelectMany(ExtractAuditEvents)
            .OrderByDescending(x => x.Timestamp)
            .Take(10)
            .ToList();

        return new DashboardMetrics
        {
            TotalUsers = totalUsers,
            ActiveUsers = activeUsers,
            NewCustomers = newCustomers,
            AuditEvents = auditEvents,
            UnreadNotifications = unreadNotifications,
            LockedUsers = lockedUsers,
            ManagedRoles = roleUserCounts.Count,
            RoleUserCounts = roleUserCounts,
            RecentAudits = recentAudits,
            TotalBookings = totalBookings,
            CompletedBookings = completedBookings,
            CancelledBookings = cancelledBookings,
            PendingBookings = pendingBookings,
            ConfirmedBookings = confirmedBookings,
            InProgressBookings = inProgressBookings,
            CheckIns = checkIns,
            CheckOuts = checkOuts,
            TotalRevenue = totalRevenue,
            RoomRevenue = invoiceMetrics?.RoomRevenue ?? 0m,
            ServiceRevenue = invoiceMetrics?.ServiceRevenue ?? 0m,
            PendingPaymentAmount = invoiceMetrics?.PendingPaymentAmount ?? 0m,
            PaidInvoices = invoiceMetrics?.PaidInvoices ?? 0,
            UnpaidInvoices = invoiceMetrics?.UnpaidInvoices ?? 0,
            TotalRooms = totalRooms,
            AvailableRooms = availableRooms,
            OccupiedRooms = occupiedRooms,
            MaintenanceRooms = maintenanceRooms,
            DirtyRooms = dirtyRooms,
            CleaningRooms = cleaningRooms,
            OccupancyRate = occupancyRate,
            DamageReports = damageMetrics?.Reports ?? 0,
            DamagedQuantityInPeriod = damageMetrics?.Quantity ?? 0,
            PenaltyAmount = damageMetrics?.PenaltyAmount ?? 0m,
            TotalEquipmentTypes = equipmentMetrics?.TotalEquipmentTypes ?? 0,
            InStockQuantity = equipmentMetrics?.InStockQuantity ?? 0,
            InUseQuantity = equipmentMetrics?.InUseQuantity ?? 0,
            CurrentDamagedQuantity = equipmentMetrics?.CurrentDamagedQuantity ?? 0,
            LowStockItems = equipmentMetrics?.LowStockItems ?? 0,
            NewReviews = reviewMetrics?.NewReviews ?? 0,
            AverageRating = Math.Round(reviewMetrics?.AverageRating ?? 0m, 2)
        };
    }

    private string BuildDashboardJson(string roleName, string dashboardCode, DashboardPeriodInfo period, DashboardMetrics metrics)
    {
        var alerts = new List<object>();
        if (metrics.LowStockItems > 0)
        {
            alerts.Add(new
            {
                level = "warning",
                code = "LOW_STOCK_ITEMS",
                message = "Có vật tư dưới ngưỡng tồn kho.",
                value = metrics.LowStockItems,
                createdAt = DateTime.UtcNow
            });
        }

        if (metrics.PendingPaymentAmount > 0)
        {
            alerts.Add(new
            {
                level = "warning",
                code = "PENDING_PAYMENT_AMOUNT",
                message = "Có hóa đơn chưa thanh toán trong kỳ.",
                value = metrics.PendingPaymentAmount,
                createdAt = DateTime.UtcNow
            });
        }

        var payload = new
        {
            meta = new
            {
                schemaVersion = 1,
                dashboardCode,
                roleName,
                periodType = period.PeriodType,
                periodKey = period.PeriodKey,
                periodStart = period.PeriodStart,
                periodEnd = period.PeriodEnd,
                status = period.IsCurrent ? "OPEN" : "CLOSED",
                generatedAt = DateTime.UtcNow,
                lastUpdatedAt = DateTime.UtcNow
            },
            summary = new
            {
                system = new
                {
                    metrics.TotalUsers,
                    metrics.ActiveUsers,
                    metrics.NewCustomers,
                    metrics.AuditEvents,
                    metrics.UnreadNotifications,
                    metrics.LockedUsers,
                    metrics.ManagedRoles
                },
                booking = new
                {
                    metrics.TotalBookings,
                    metrics.CompletedBookings,
                    metrics.CancelledBookings,
                    metrics.PendingBookings,
                    metrics.ConfirmedBookings,
                    metrics.InProgressBookings,
                    metrics.CheckIns,
                    metrics.CheckOuts
                },
                revenue = new
                {
                    metrics.TotalRevenue,
                    metrics.RoomRevenue,
                    metrics.ServiceRevenue,
                    metrics.PendingPaymentAmount,
                    metrics.PaidInvoices,
                    metrics.UnpaidInvoices
                },
                rooms = new
                {
                    metrics.TotalRooms,
                    metrics.AvailableRooms,
                    metrics.OccupiedRooms,
                    metrics.MaintenanceRooms,
                    metrics.DirtyRooms,
                    metrics.CleaningRooms,
                    metrics.OccupancyRate
                },
                warehouse = new
                {
                    metrics.TotalEquipmentTypes,
                    metrics.InStockQuantity,
                    metrics.InUseQuantity,
                    metrics.CurrentDamagedQuantity,
                    metrics.DamageReports,
                    metrics.DamagedQuantityInPeriod,
                    metrics.PenaltyAmount,
                    metrics.LowStockItems
                },
                housekeeping = new
                {
                    metrics.DirtyRooms,
                    metrics.CleaningRooms,
                    metrics.DamageReports,
                    metrics.PenaltyAmount
                },
                customer = new
                {
                    metrics.NewCustomers,
                    metrics.AverageRating,
                    metrics.NewReviews
                },
                admin = new
                {
                    metrics.ManagedRoles,
                    metrics.LockedUsers,
                    PendingBookings = metrics.PendingBookings,
                    metrics.UnpaidInvoices,
                    metrics.UnreadNotifications,
                    metrics.AuditEvents
                }
            },
            widgets = new
            {
                kpiCards = BuildKpiCards(roleName, metrics),
                departmentOverview = BuildDepartmentOverview(metrics)
            },
            tables = new
            {
                usersByRole = metrics.RoleUserCounts,
                recentAudits = metrics.RecentAudits
            },
            admin = new
            {
                kpis = new
                {
                    metrics.TotalUsers,
                    metrics.ActiveUsers,
                    metrics.AuditEvents,
                    metrics.UnreadNotifications,
                    metrics.TotalBookings,
                    metrics.TotalRevenue
                },
                systemStatus = new
                {
                    RolesManaged = metrics.ManagedRoles,
                    metrics.LockedUsers,
                    PendingBookings = metrics.PendingBookings,
                    metrics.UnpaidInvoices
                },
                usersByRole = metrics.RoleUserCounts,
                recentAudits = metrics.RecentAudits
            },
            breakdown = new
            {
                roleName,
                dataSource = "Database aggregation"
            },
            alerts,
            events = new[]
            {
                new
                {
                    eventType = "DASHBOARD_REBUILT",
                    source = "RoleDashboardPeriodService",
                    refId = (int?)null,
                    description = "Dashboard period snapshot was rebuilt from source tables.",
                    createdAt = DateTime.UtcNow
                }
            }
        };

        return JsonSerializer.Serialize(payload, JsonOptions);
    }

    private string BuildComparisonJson(DashboardPeriodInfo period, DashboardMetrics current, DashboardMetrics previous)
    {
        var payload = new
        {
            baseInfo = new
            {
                comparisonType = "PREVIOUS_PERIOD",
                currentPeriodKey = period.PeriodKey,
                currentPeriodStart = period.PeriodStart,
                currentPeriodEnd = period.PeriodEnd,
                previousPeriodStart = period.PreviousPeriodStart,
                previousPeriodEnd = period.PreviousPeriodEnd
            },
            metrics = new
            {
                totalBookings = CompareMetric(current.TotalBookings, previous.TotalBookings, "higher_is_better"),
                totalRevenue = CompareMetric(current.TotalRevenue, previous.TotalRevenue, "higher_is_better"),
                occupancyRate = CompareMetric(current.OccupancyRate, previous.OccupancyRate, "higher_is_better"),
                damageReports = CompareMetric(current.DamageReports, previous.DamageReports, "lower_is_better"),
                damagedQuantityInPeriod = CompareMetric(current.DamagedQuantityInPeriod, previous.DamagedQuantityInPeriod, "lower_is_better"),
                penaltyAmount = CompareMetric(current.PenaltyAmount, previous.PenaltyAmount, "lower_is_better"),
                pendingPaymentAmount = CompareMetric(current.PendingPaymentAmount, previous.PendingPaymentAmount, "lower_is_better"),
                newCustomers = CompareMetric(current.NewCustomers, previous.NewCustomers, "higher_is_better"),
                dirtyRooms = CompareMetric(current.DirtyRooms, previous.DirtyRooms, "lower_is_better")
            }
        };

        return JsonSerializer.Serialize(payload, JsonOptions);
    }

    private static object CompareMetric(decimal current, decimal previous, string directionMeaning)
    {
        return new
        {
            current,
            previous,
            difference = current - previous,
            growthRate = DashboardPeriodHelper.CalculateGrowthRate(current, previous),
            trend = DashboardPeriodHelper.ResolveTrend(current, previous),
            directionMeaning
        };
    }

    private static object CompareMetric(int current, int previous, string directionMeaning)
    {
        return CompareMetric((decimal)current, previous, directionMeaning);
    }

    private static IReadOnlyList<object> BuildKpiCards(string roleName, DashboardMetrics metrics)
    {
        return roleName switch
        {
            "WarehouseStaff" => new object[]
            {
                new { code = "inStockQuantity", title = "Tồn kho", value = metrics.InStockQuantity, unit = "item" },
                new { code = "damageReports", title = "Báo cáo hỏng/mất", value = metrics.DamageReports, unit = "report" },
                new { code = "lowStockItems", title = "Dưới ngưỡng tồn", value = metrics.LowStockItems, unit = "item" }
            },
            "Housekeeping" => new object[]
            {
                new { code = "dirtyRooms", title = "Phòng cần dọn", value = metrics.DirtyRooms, unit = "room" },
                new { code = "cleaningRooms", title = "Phòng đang dọn", value = metrics.CleaningRooms, unit = "room" },
                new { code = "damageReports", title = "Báo cáo hỏng/mất", value = metrics.DamageReports, unit = "report" }
            },
            "Accountant" => new object[]
            {
                new { code = "totalRevenue", title = "Doanh thu", value = metrics.TotalRevenue, unit = "VND" },
                new { code = "pendingPaymentAmount", title = "Chưa thanh toán", value = metrics.PendingPaymentAmount, unit = "VND" },
                new { code = "paidInvoices", title = "Hóa đơn đã trả", value = metrics.PaidInvoices, unit = "invoice" }
            },
            _ => new object[]
            {
                new { code = "totalBookings", title = "Tổng đặt phòng", value = metrics.TotalBookings, unit = "booking" },
                new { code = "totalRevenue", title = "Doanh thu", value = metrics.TotalRevenue, unit = "VND" },
                new { code = "occupancyRate", title = "Tỷ lệ lấp đầy", value = metrics.OccupancyRate, unit = "%" }
            }
        };
    }

    private static IReadOnlyList<object> BuildDepartmentOverview(DashboardMetrics metrics)
    {
        return new object[]
        {
            new { department = "Reception", status = metrics.PendingBookings > 0 ? "warning" : "normal", value = metrics.PendingBookings, metric = "pendingBookings" },
            new { department = "Accountant", status = metrics.PendingPaymentAmount > 0 ? "warning" : "normal", value = metrics.PendingPaymentAmount, metric = "pendingPaymentAmount" },
            new { department = "Warehouse", status = metrics.LowStockItems > 0 ? "warning" : "normal", value = metrics.LowStockItems, metric = "lowStockItems" },
            new { department = "Housekeeping", status = metrics.DirtyRooms > 0 ? "warning" : "normal", value = metrics.DirtyRooms, metric = "dirtyRooms" }
        };
    }

    private static IEnumerable<RecentAuditItem> ExtractAuditEvents(AuditLog log)
    {
        if (string.IsNullOrWhiteSpace(log.LogData))
        {
            yield break;
        }

        using var document = JsonDocument.Parse(log.LogData);
        if (!TryGetProperty(document.RootElement, "Events", "events", out var events) || events.ValueKind != JsonValueKind.Array)
        {
            yield break;
        }

        foreach (var item in events.EnumerateArray())
        {
            var timestamp = GetDateTime(item, "timestamp") ?? log.LogDate;

            yield return new RecentAuditItem(
                UserId: log.UserId,
                UserName: log.User?.FullName ?? log.User?.Email ?? "Unknown",
                RoleName: log.RoleName ?? "Unknown",
                Action: GetString(item, "actionType") ?? GetString(item, "action") ?? "UNKNOWN",
                EntityType: GetString(item, "entityType"),
                Message: GetString(item, "message"),
                Timestamp: timestamp);
        }
    }

    private static bool TryGetProperty(JsonElement element, string firstName, string secondName, out JsonElement value)
    {
        return element.TryGetProperty(firstName, out value) || element.TryGetProperty(secondName, out value);
    }

    private static string? GetString(JsonElement element, string propertyName)
    {
        return element.TryGetProperty(propertyName, out var value) && value.ValueKind == JsonValueKind.String
            ? value.GetString()
            : null;
    }

    private static DateTime? GetDateTime(JsonElement element, string propertyName)
    {
        return element.TryGetProperty(propertyName, out var value)
            && value.ValueKind == JsonValueKind.String
            && value.TryGetDateTime(out var result)
                ? result
                : null;
    }

    private static DashboardPeriodResponseDto ToResponseDto(RoleDashboardPeriodState entity)
    {
        return new DashboardPeriodResponseDto
        {
            Id = entity.Id,
            RoleId = entity.RoleId,
            RoleName = entity.RoleName,
            DashboardCode = entity.DashboardCode,
            DashboardTitle = entity.DashboardTitle,
            PeriodType = entity.PeriodType,
            PeriodKey = entity.PeriodKey,
            PeriodStart = entity.PeriodStart,
            PeriodEnd = entity.PeriodEnd,
            Status = entity.Status,
            IsCurrent = entity.IsCurrent,
            Version = entity.Version,
            UpdatedAt = entity.UpdatedAt,
            Dashboard = DeserializeJson(entity.DashboardJson),
            Comparison = string.IsNullOrWhiteSpace(entity.ComparisonJson) ? null : DeserializeJson(entity.ComparisonJson)
        };
    }

    private static JsonElement? DeserializeJson(string json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return null;
        }

        using var document = JsonDocument.Parse(json);
        return document.RootElement.Clone();
    }

    private sealed class DashboardMetrics
    {
        public int TotalUsers { get; init; }
        public int ActiveUsers { get; init; }
        public int NewCustomers { get; init; }
        public int AuditEvents { get; init; }
        public int UnreadNotifications { get; init; }
        public int LockedUsers { get; init; }
        public int ManagedRoles { get; init; }
        public IReadOnlyList<RoleUserCount> RoleUserCounts { get; init; } = Array.Empty<RoleUserCount>();
        public IReadOnlyList<RecentAuditItem> RecentAudits { get; init; } = Array.Empty<RecentAuditItem>();
        public int TotalBookings { get; init; }
        public int CompletedBookings { get; init; }
        public int CancelledBookings { get; init; }
        public int PendingBookings { get; init; }
        public int ConfirmedBookings { get; init; }
        public int InProgressBookings { get; init; }
        public int CheckIns { get; init; }
        public int CheckOuts { get; init; }
        public decimal TotalRevenue { get; init; }
        public decimal RoomRevenue { get; init; }
        public decimal ServiceRevenue { get; init; }
        public decimal PendingPaymentAmount { get; init; }
        public int PaidInvoices { get; init; }
        public int UnpaidInvoices { get; init; }
        public int TotalRooms { get; init; }
        public int AvailableRooms { get; init; }
        public int OccupiedRooms { get; init; }
        public int MaintenanceRooms { get; init; }
        public int DirtyRooms { get; init; }
        public int CleaningRooms { get; init; }
        public decimal OccupancyRate { get; init; }
        public int DamageReports { get; init; }
        public int DamagedQuantityInPeriod { get; init; }
        public decimal PenaltyAmount { get; init; }
        public int TotalEquipmentTypes { get; init; }
        public int InStockQuantity { get; init; }
        public int InUseQuantity { get; init; }
        public int CurrentDamagedQuantity { get; init; }
        public int LowStockItems { get; init; }
        public int NewReviews { get; init; }
        public decimal AverageRating { get; init; }
    }

    private sealed record RoleUserCount(
        int RoleId,
        string RoleName,
        int UserCount);

    private sealed record RecentAuditItem(
        int UserId,
        string UserName,
        string RoleName,
        string Action,
        string? EntityType,
        string? Message,
        DateTime Timestamp);
}




