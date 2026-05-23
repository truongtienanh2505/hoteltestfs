import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { message } from 'antd';

import RoomManagement from '../pages/Admin/RoomManagement';
import Dashboard from '../pages/Admin/Dashboard/Dashboard';
import PeriodDashboard from '../pages/Admin/PeriodDashboard/PeriodDashboard';
import RoomTypeManagement from '../pages/RoomTypes/RoomTypeManagement';
import RoomInventory from '../pages/RoomInventory/RoomInventory';
import HousekeepingMobile from '../pages/Housekeeping/HousekeepingMobile';
import InventoryChecklist from '../pages/Housekeeping/InventoryChecklist';
import Login from '../pages/Auth/Login';
import Register from '../pages/Auth/Register'; // 
import ForgotPassword from '../pages/Auth/ForgotPassword'; // 
import MainLayout from '../layouts/MainLayout';
import { useAuthStore } from '../store/authStore';
import UserManagement from '../pages/Users/UserManagement';
import RoleManagement from '../pages/Users/RoleManagement';
import AuditLogs from '../pages/Admin/AuditLogs';
import LossAndDamages from '../pages/LossAndDamages.jsx';
import UserProfile from '../pages/Profile/UserProfile';
import BookingSystem from '../pages/Booking/BookingPage';
import Arrivals from '../pages/Receptionist/Arrivals';
import InHouse from '../pages/Receptionist/InHouse';
import Departures from '../pages/Receptionist/Departures';
import InvoiceManagement from '../pages/Invoices/InvoiceManagement';
import InvoiceDashboard from '../pages/Admin/Invoices/InvoiceDashboard';
import VoucherManagement from '../pages/Admin/Vouchers/VoucherManagement';
import MembershipManagement from '../pages/Admin/MembershipManagement';

import ArticleManagement from '../pages/Admin/ArticleManagement';
import CategoryManagement from '../pages/Admin/CategoryManagement';
import AttractionManagement from '../pages/Admin/AttractionManagement';
import ReviewManagement from '../pages/Admin/ReviewManagement';
import ServiceManagementPage from '../pages/Admin/ServiceManagementPage';

const Placeholder = ({ title }) => (
  <div style={{ padding: 24, textAlign: 'center' }}>
    <h2 style={{ color: '#1890ff' }}>{title}</h2>
    <p>Giao diện đang được xây dựng...</p>
  </div>
);

// Danh sách các role được phép vào khu vực Admin
const ADMIN_ALLOWED_ROLES = ['Admin', 'Manager', 'Receptionist', 'Housekeeping', 'Accountant', 'WarehouseStaff', 'Marketing', 'MarketingStaff'];

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore((state) => state);

  // Chưa đăng nhập → về trang đăng nhập
  if (!isAuthenticated) {
    return <Navigate to='/login' replace />;
  }

  // Kiểm tra role: nếu role không nằm trong danh sách được phép → đá ra trang chủ
  const roleName = user?.roleName;
  if (!roleName || !ADMIN_ALLOWED_ROLES.includes(roleName)) {
    message.warning(`Tài khoản "${user?.fullName || 'của bạn'}" (${roleName || 'Không có quyền'}) không có quyền truy cập khu vực quản trị!`);
    return <Navigate to='/' replace />;
  }

  return children;
};

// Chỉ Admin mới được vào — các role khác redirect về dashboard
const AdminOnlyRoute = ({ children }) => {
  const { user } = useAuthStore((state) => state);
  if (user?.roleName !== 'Admin') {
    message.warning('Chức năng này chỉ dành cho Quản trị viên!');
    return <Navigate to='/admin/dashboard' replace />;
  }
  return children;
};

const AdminRoutes = () => {
  return (
    <Routes>
      {/* ROUTES KHÔNG CẦN ĐĂNG NHẬP */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} /> 
      <Route path="/forgot-password" element={<ForgotPassword />} /> 
      <Route path="/booking/search" element={<Placeholder title="Tìm kiếm & Chọn phòng trống" />} />
      <Route path="/booking/checkout" element={<Placeholder title="Thanh toán & Nhập Voucher" />} />

      <Route path='/' element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to='dashboard' replace />} />
        <Route path='dashboard' element={<Dashboard />} />
        <Route path='period-dashboard' element={<AdminOnlyRoute><PeriodDashboard /></AdminOnlyRoute>} />

        <Route path='users' element={<UserManagement />} />
        <Route path='roles' element={<RoleManagement />} />
        <Route path='audit-logs' element={<AuditLogs />} />
        <Route path='profile' element={<UserProfile />} />

        <Route path='room-types' element={<RoomTypeManagement />} />
        <Route path='rooms' element={<RoomManagement />} />
        <Route path='inventory' element={<RoomInventory />} />
        <Route path='housekeeping' element={<HousekeepingMobile />} />
        <Route path='damage-reports' element={<Placeholder title='Báo cáo Hư hỏng & Đền bù' />} />
        <Route path='loss-and-damages' element={<LossAndDamages />} />
        <Route path='invoices' element={<InvoiceDashboard />} />
        <Route path='vouchers' element={<VoucherManagement />} />
        <Route path='membership' element={<MembershipManagement />} />

        <Route path='article-categories' element={<CategoryManagement />} />
        <Route path='posts' element={<ArticleManagement />} />
        <Route path='attractions' element={<AttractionManagement />} />
        <Route path='reviews' element={<ReviewManagement />} />

        {/* MODULE 2 - QUẦY LỄ TÂN */}
        <Route path="reception-calendar" element={<Placeholder title="Lịch Lễ Tân (Gantt Chart)" />} />
        <Route path="bookings/*" element={<BookingSystem />} />
        <Route path="arrivals" element={<Arrivals />} />
        <Route path="in-house" element={<InHouse />} />
        <Route path="departures" element={<Departures />} />
        <Route path="services" element={<ServiceManagementPage />} />
        <Route path='invoices' element={<InvoiceDashboard />} />
        <Route path='invoices/workbench' element={<InvoiceManagement />} />

        <Route path='housekeeping/room/:id' element={<InventoryChecklist />} />
      </Route>

      <Route path='*' element={<Placeholder title='404 - Trang không tồn tại' />} />
    </Routes>
  );
};

export default AdminRoutes;
