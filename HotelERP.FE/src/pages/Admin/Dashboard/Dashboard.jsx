import React, { useEffect, useState } from 'react';
import { Typography, Row, Col, Spin } from 'antd';
import { message } from '../../../utils/antdGlobal';
import {
  DashboardOutlined,
  CrownOutlined,
  IdcardOutlined,
  FormatPainterOutlined,
  FileTextOutlined,
  GiftOutlined,
  WarningOutlined,
  StarOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../../store/authStore';
import bookingManagementApi from '../../../api/bookingManagementApi';
import { roomInventoryApi } from '../../../api/roomInventoryApi';
import { invoiceApi } from '../../../api/invoiceApi';
import voucherApi from '../../../api/voucherApi';
import reviewApi from '../../../api/reviewApi';
import axiosClient from '../../../api/axiosClient';

import StatCards from './components/StatCards';
import RoomStatusChart from './components/RoomStatusChart';
import RevenueChart from './components/RevenueChart';

const { Title, Text } = Typography;

// ==========================================
// ROLE → MODULE MAPPING
// Định nghĩa rõ ràng: role nào thấy gì
// ==========================================
const ROLE_CONFIG = {
  Admin: {
    label: 'Quản trị viên',
    icon: <CrownOutlined />,
    color: '#722ed1',
    description: 'Toàn quyền xem và quản lý toàn bộ hệ thống.',
    modules: ['reception', 'housekeeping', 'finance', 'vouchers', 'roomChart', 'revenueChart', 'damages', 'reviews'],
  },
  Manager: {
    label: 'Quản lý',
    icon: <DashboardOutlined />,
    color: '#1890ff',
    description: 'Xem tổng quan tài chính, lễ tân và tình trạng phòng.',
    modules: ['reception', 'housekeeping', 'finance', 'vouchers', 'roomChart', 'revenueChart', 'damages', 'reviews'],
  },
  Receptionist: {
    label: 'Lễ tân',
    icon: <IdcardOutlined />,
    color: '#13c2c2',
    description: 'Quản lý đặt phòng, khách đến và khách trả phòng.',
    modules: ['reception', 'housekeeping'],
  },
  Housekeeping: {
    label: 'Buồng phòng',
    icon: <FormatPainterOutlined />,
    color: '#52c41a',
    description: 'Theo dõi và cập nhật trạng thái dọn phòng.',
    modules: ['housekeeping', 'roomChart', 'damages'],
  },
  Accountant: {
    label: 'Kế toán',
    icon: <FileTextOutlined />,
    color: '#fa8c16',
    description: 'Xem dữ liệu tài chính và hóa đơn.',
    modules: ['finance', 'vouchers', 'revenueChart'],
  },
  WarehouseStaff: {
    label: 'Thủ kho',
    icon: <WarningOutlined />,
    color: '#eb2f96',
    description: 'Quản lý kho vật tư và ghi nhận đền bù.',
    modules: ['damages'],
  },
  Marketing: {
    label: 'Marketing',
    icon: <StarOutlined />,
    color: '#722ed1',
    description: 'Quản lý voucher và tương tác đánh giá.',
    modules: ['vouchers', 'reviews'],
  },
};

const Dashboard = () => {
  const { user, permissions } = useAuthStore();
  const [loading, setLoading] = useState(true);

  const [receptionStats, setReceptionStats]     = useState({ arrivals: 0, inHouse: 0, departures: 0 });
  const [housekeepingStats, setHousekeepingStats] = useState({ available: 0, dirty: 0, maintenance: 0, occupied: 0 });
  const [invoiceStats, setInvoiceStats]           = useState({ totalRevenue: 0, todayRevenue: 0, totalPaid: 0 });
  const [voucherStats, setVoucherStats]           = useState({ total: 0, active: 0, expired: 0 });
  const [damageStats, setDamageStats]             = useState({ totalIncidents: 0, totalAmount: 0, totalQuantity: 0 });
  const [reviewStats, setReviewStats]             = useState({ total: 0, pending: 0, approved: 0 });

  // Xác định role và config hiển thị
  const roleName = user?.roleName || 'Guest';
  const roleConfig = ROLE_CONFIG[roleName] || {
    label: roleName,
    icon: <DashboardOutlined />,
    color: '#8c8c8c',
    description: 'Người dùng nội bộ',
    modules: ['reception', 'housekeeping', 'finance', 'vouchers', 'roomChart', 'revenueChart', 'damages', 'reviews']
  };
  const allowedModules = roleConfig?.modules || [];

  // Helper: kiểm tra module có được hiện không
  const can = (module) => allowedModules.includes(module);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const fetches = [];

      // Chỉ gọi API cần thiết theo role
      if (can('reception')) {
        fetches.push(
          Promise.all([
            bookingManagementApi.getTodayArrivals(),
            bookingManagementApi.getInHouseGuests(),
            bookingManagementApi.getTodayDepartures(),
          ]).then(([arrRes, inHouseRes, depRes]) => {
            setReceptionStats({
              arrivals: arrRes?.data?.count ?? arrRes?.data?.data?.length ?? 0,
              inHouse: inHouseRes?.data?.count ?? inHouseRes?.data?.data?.length ?? 0,
              departures: depRes?.data?.count ?? depRes?.data?.data?.length ?? 0,
            });
          })
        );
      }

      if (can('housekeeping') || can('roomChart')) {
        fetches.push(
          roomInventoryApi.getRooms().then((roomsRes) => {
            if (roomsRes?.data) {
              const rooms = roomsRes.data.data || roomsRes.data;
              let available = 0, dirty = 0, maintenance = 0, occupied = 0;
              if (Array.isArray(rooms)) {
                rooms.forEach((r) => {
                  const st = (r.status || '').toLowerCase();
                  if (st === 'available') available++;
                  else if (st === 'dirty') dirty++;
                  else if (st === 'maintenance' || st === 'out_of_order') maintenance++;
                  else if (st === 'occupied') occupied++;
                });
              }
              setHousekeepingStats({ available, dirty, maintenance, occupied });
            }
          })
        );
      }

      if (can('finance') || can('revenueChart')) {
        fetches.push(
          invoiceApi.getSummary().then((invRes) => {
            if (invRes?.data) {
              const invData = invRes.data.data || invRes.data;
              setInvoiceStats({
                totalRevenue: invData.totalRevenueAllTime || 0,
                todayRevenue: invData.todayRevenue || 0,
                totalPaid: invData.totalRevenueAllTime || 0,
                last7Days: invData.last7DaysRevenue || []
              });
            }
          })
        );
      }

      if (can('vouchers')) {
        fetches.push(
          voucherApi.getAll({ pageSize: 1000 }).then((vRes) => {
            const list = vRes?.data || vRes?.items || [];
            if (Array.isArray(list)) {
              const now = new Date();
              const active = list.filter(
                (v) => v.status === 'Active' && (!v.validTo || new Date(v.validTo) >= now)
              ).length;
              const expired = list.filter(
                (v) => v.status === 'Expired' || (v.validTo && new Date(v.validTo) < now)
              ).length;
              setVoucherStats({ total: list.length, active, expired });
            }
          }).catch(() => {}) // Voucher không bắt buộc thành công
        );
      }

      if (can('damages')) {
        fetches.push(
          axiosClient.get('/LossAndDamages').then((res) => {
            if (res?.data?.stats) {
              setDamageStats(res.data.stats);
            }
          }).catch(() => {}) // Không bắt buộc thành công
        );
      }

      if (can('reviews')) {
        fetches.push(
          reviewApi.getAllForAdmin().then((res) => {
            const list = res?.data || [];
            if (Array.isArray(list)) {
              setReviewStats({
                total:    list.length,
                pending:  list.filter(r => r.status === 'PENDING').length,
                approved: list.filter(r => r.status === 'APPROVED').length,
              });
            }
          }).catch(() => {})
        );
      }

      await Promise.allSettled(fetches);
    } catch (error) {
      console.error('Error fetching dashboard data', error);
      message.error('Không thể tải một số dữ liệu Dashboard!');
    } finally {
      setLoading(false);
    }
  };

  const rolesObj = { user, permissions };

  return (
    <Spin spinning={loading} size="large" description="Đang tải dữ liệu...">
      <div style={{ padding: 24 }}>

        {/* ── TIÊU ĐỀ & ROLE BADGE ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
            Dashboard Hoạt Động Khách Sạn
          </Title>
          {roleConfig && (
            <span
              style={{
                background: roleConfig.color,
                color: '#fff',
                padding: '2px 12px',
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {roleConfig.icon} {roleConfig.label}
            </span>
          )}
        </div>


        {/* ── MODULE: THỐNG KÊ LỄ TÂN & HOUSEKEEPING & TÀI CHÍNH ── */}
        <StatCards
          roles={rolesObj}
          receptionStats={receptionStats}
          housekeepingStats={housekeepingStats}
          invoiceStats={invoiceStats}
          canReception={can('reception')}
          canHousekeeping={can('housekeeping')}
          canFinance={can('finance')}
        />

        {/* ── MODULE: VOUCHER (Admin / Manager / Accountant) ── */}
        {can('vouchers') && (
          <div style={{ marginBottom: 24 }}>
            <Title level={5} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <GiftOutlined style={{ color: '#eb2f96' }} /> Quản lý Voucher
            </Title>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8}>
                <div style={{ background: '#fff0f6', border: '1px solid #ffadd2', borderRadius: 8, padding: '16px 20px' }}>
                  <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>Tổng số Voucher</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#eb2f96' }}>{voucherStats.total}</div>
                </div>
              </Col>
              <Col xs={24} sm={8}>
                <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 8, padding: '16px 20px' }}>
                  <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>Đang hoạt động</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#52c41a' }}>{voucherStats.active}</div>
                </div>
              </Col>
              <Col xs={24} sm={8}>
                <div style={{ background: '#fff1f0', border: '1px solid #ffa39e', borderRadius: 8, padding: '16px 20px' }}>
                  <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>Đã hết hạn / Tắt</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#ff4d4f' }}>{voucherStats.expired}</div>
                </div>
              </Col>
            </Row>
          </div>
        )}

        {/* ── MODULE: THẤT THOÁT ĐỀN BÙ (Admin / Manager / Housekeeping) ── */}
        {can('damages') && (
          <div style={{ marginBottom: 24 }}>
            <Title level={5} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <WarningOutlined style={{ color: '#faad14' }} /> Thất Thoát & Đền Bù
            </Title>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8}>
                <div style={{ background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 8, padding: '16px 20px' }}>
                  <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>Tổng sự cố ghi nhận</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#faad14' }}>{damageStats.totalIncidents}</div>
                </div>
              </Col>
              <Col xs={24} sm={8}>
                <div style={{ background: '#fff1f0', border: '1px solid #ffa39e', borderRadius: 8, padding: '16px 20px' }}>
                  <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>Tổng số món hỏng / mất</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#ff4d4f' }}>{damageStats.totalQuantity}</div>
                </div>
              </Col>
              <Col xs={24} sm={8}>
                <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 8, padding: '16px 20px' }}>
                  <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>Tổng tiền phạt (VND)</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#52c41a' }}>{damageStats.totalAmount.toLocaleString('vi-VN')}</div>
                </div>
              </Col>
            </Row>
          </div>
        )}

        {/* ── MODULE: ĐÁNH GIÁ KHÁCH HÀNG (Admin / Manager) ── */}
        {can('reviews') && (
          <div style={{ marginBottom: 24 }}>
            <Title level={5} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <StarOutlined style={{ color: '#fadb14' }} /> Đánh giá Khách hàng
            </Title>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8}>
                <div style={{ background: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: 8, padding: '16px 20px' }}>
                  <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>Tổng đánh giá</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#1890ff' }}>{reviewStats.total}</div>
                </div>
              </Col>
              <Col xs={24} sm={8}>
                <div style={{ background: '#fff7e6', border: '1px solid #ffd591', borderRadius: 8, padding: '16px 20px', position: 'relative' }}>
                  <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>Chờ duyệt</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#fa8c16' }}>{reviewStats.pending}</div>
                  {reviewStats.pending > 0 && (
                    <a href="/admin/reviews" style={{ fontSize: 11, color: '#fa8c16', position: 'absolute', bottom: 12, right: 16 }}>Duyệt ngay →</a>
                  )}
                </div>
              </Col>
              <Col xs={24} sm={8}>
                <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 8, padding: '16px 20px' }}>
                  <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>Đã duyệt</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#52c41a' }}>{reviewStats.approved}</div>
                </div>
              </Col>
            </Row>
          </div>
        )}

        {/* ── BIỂU ĐỒ ── */}
        <Row gutter={[24, 24]}>
          {can('roomChart') && (
            <Col xs={24} md={12} lg={10}>
              <RoomStatusChart {...housekeepingStats} />
            </Col>
          )}
          {can('revenueChart') && (
            <Col xs={24} md={12} lg={14}>
              <RevenueChart todayRevenue={invoiceStats.todayRevenue} totalRevenue={invoiceStats.totalRevenue} last7Days={invoiceStats.last7Days} />
            </Col>
          )}
        </Row>

      </div>
    </Spin>
  );
};

export default Dashboard;
