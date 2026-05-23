import React, { useState } from 'react';
import { Layout, Menu, Button, Dropdown, Spin, Badge, Tooltip } from 'antd';
import {
  UserOutlined, TeamOutlined, SafetyCertificateOutlined, LogoutOutlined,
  AppstoreOutlined, HomeOutlined, DatabaseOutlined, FormatPainterOutlined,
  WarningOutlined, DashboardOutlined, IdcardOutlined, FileTextOutlined,
  GiftOutlined, EditOutlined, MenuFoldOutlined, MenuUnfoldOutlined,
  CommentOutlined, ShoppingOutlined, TrophyOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useLoadingStore } from '../store/loadingStore';
import NotificationBell from './NotificationBell.jsx';

const { Sider, Content } = Layout;

/* ─────────────────────────────────────────────────────────── */
/*  LOTTE DESIGN TOKENS (inline để override Ant Design)        */
/* ─────────────────────────────────────────────────────────── */
const GOLD   = '#b8956a';
const DARK   = '#111111';
const DARK2  = '#1a1a1a';
const DARK3  = '#222222';

const siderStyle = {
  background: DARK,
  borderRight: '1px solid rgba(255,255,255,0.06)',
  boxShadow: '4px 0 24px rgba(0,0,0,0.4)',
  height: '100vh',
  position: 'sticky',
  top: 0,
  overflow: 'hidden', // Changed to hidden to let inner flex container handle scroll
};

/* Custom menu styles injected via a <style> tag so Ant tokens apply */
const menuCss = `
  .lotte-sider-menu.ant-menu-dark { background: transparent !important; }
  .lotte-sider-menu .ant-menu-item,
  .lotte-sider-menu .ant-menu-submenu-title {
    border-radius: 0 !important;
    margin: 0 !important;
    width: 100% !important;
    color: rgba(255,255,255,0.55) !important;
    font-size: 12px !important;
    letter-spacing: 0.05em !important;
    transition: background 200ms, color 200ms !important;
  }
  .lotte-sider-menu .ant-menu-item:hover,
  .lotte-sider-menu .ant-menu-submenu-title:hover {
    background: rgba(184,149,106,0.08) !important;
    color: ${GOLD} !important;
  }
  .lotte-sider-menu .ant-menu-item-selected {
    background: rgba(184,149,106,0.12) !important;
    color: ${GOLD} !important;
    border-right: 2px solid ${GOLD} !important;
  }
  .lotte-sider-menu .ant-menu-item-selected .anticon,
  .lotte-sider-menu .ant-menu-item:hover .anticon {
    color: ${GOLD} !important;
  }
  .lotte-sider-menu .ant-menu-sub {
    background: rgba(0,0,0,0.2) !important;
  }
  .lotte-sider-menu .ant-menu-item-group-title {
    color: rgba(255,255,255,0.3) !important;
    font-size: 10px !important;
    letter-spacing: 1px !important;
    text-transform: uppercase !important;
    margin-top: 12px !important;
  }
  .lotte-sider-menu .ant-menu-submenu-arrow { color: rgba(255,255,255,0.3) !important; }
  .lotte-sider-menu .ant-menu-submenu-open > .ant-menu-submenu-title,
  .lotte-sider-menu .ant-menu-submenu-active > .ant-menu-submenu-title {
    color: ${GOLD} !important;
  }
`;

const MainLayout = () => {
  const { user, logout, permissions } = useAuthStore();
  const navigate  = useNavigate();
  const location  = useLocation();
  const isLoading = useLoadingStore((state) => state.isLoading);
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };
  const isAdmin = user?.roleName === 'Admin' || user?.fullName === 'Admin';

  /* ── Menu definition ── */
  const rawMenuItems = [
    { key: '/admin/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/admin/period-dashboard', icon: <AppstoreOutlined />, label: 'Báo cáo Định kỳ', adminOnly: true },

    {
      key: 'grp_frontdesk',
      label: 'Lễ tân & Đặt phòng',
      type: 'group',
      children: [
        {
          key: 'reception_menu',
          icon: <IdcardOutlined />,
          label: 'Quầy lễ tân',
          requiredPermission: 'MANAGE_BOOKINGS',
          children: [
            { key: '/admin/bookings',    label: 'Quản lý Đặt phòng' },
            { key: '/admin/arrivals',    label: 'Khách đến hôm nay' },
            { key: '/admin/in-house',    label: 'Khách đang lưu trú' },
            { key: '/admin/departures',  label: 'Thủ tục trả phòng' },
            { key: '/admin/services',    label: 'Quản lý Dịch vụ' },
          ],
        },
        { key: '/admin/invoices', icon: <FileTextOutlined />, label: 'Quản lý Hóa đơn', requiredPermission: 'MANAGE_INVOICES' },
        { key: '/admin/reviews', icon: <CommentOutlined />, label: 'Quản lý Đánh giá', requiredPermission: 'MANAGE_BOOKINGS' },
      ],
    },

    {
      key: 'grp_room',
      label: 'Buồng phòng & Vật tư',
      type: 'group',
      children: [
        { key: '/admin/room-types', icon: <AppstoreOutlined />, label: 'Hạng phòng', requiredPermission: 'MANAGE_AMENITIES' },
        { key: '/admin/rooms', icon: <HomeOutlined />, label: 'Quản lý phòng', requiredPermission: 'MANAGE_ROOMS' },
        { key: '/admin/housekeeping', icon: <FormatPainterOutlined />, label: 'Dọn phòng', requiredPermission: 'UPDATE_ROOM_STATUS' },
        { key: '/admin/inventory', icon: <DatabaseOutlined />, label: 'Kho vật tư', requiredPermission: 'MANAGE_INVENTORY' },
        { key: '/admin/loss-and-damages', icon: <WarningOutlined />, label: 'Thất thoát & Đền bù', requiredPermission: 'MANAGE_INVENTORY' },
      ],
    },

    {
      key: 'grp_marketing',
      label: 'Marketing & Nội dung',
      type: 'group',
      children: [
        { key: '/admin/vouchers', icon: <GiftOutlined />, label: 'Quản lý Voucher', requiredPermission: 'MANAGE_SERVICES' },
        { key: '/admin/membership', icon: <TrophyOutlined />, label: 'Hạng Thành Viên', requiredPermission: 'MANAGE_SERVICES' },
        {
          key: 'content_menu',
          icon: <EditOutlined />,
          label: 'Nội dung & Bài viết',
          requiredPermission: 'MANAGE_CONTENT',
          children: [
            { key: '/admin/article-categories', label: 'Quản lý Chuyên mục' },
            { key: '/admin/posts',              label: 'Quản lý Bài viết' },
          ],
        },
        { key: '/admin/attractions', icon: <HomeOutlined />, label: 'Khám phá Điểm đến', requiredPermission: 'MANAGE_CONTENT' },
      ],
    },

    {
      key: 'grp_system',
      label: 'Hệ thống',
      type: 'group',
      children: [
        { key: '/admin/users', icon: <TeamOutlined />, label: 'Danh sách Nhân sự', requiredPermission: 'MANAGE_USERS' },
        { key: '/admin/roles', icon: <SafetyCertificateOutlined />, label: 'Vai trò & Phân quyền', requiredPermission: 'MANAGE_ROLES' },
        { key: '/admin/audit-logs', icon: <DatabaseOutlined />, label: 'Nhật ký Hệ thống', requiredPermission: 'MANAGE_USERS' },
      ],
    },
  ];

  const filterMenuItems = (items) =>
    items
      .filter(item => {
        if (item.adminOnly && !isAdmin) return false;
        if (isAdmin) return true;
        if (!item.requiredPermission) return true;
        return permissions && permissions.includes(item.requiredPermission);
      })
      .map(item => {
        if (item.children) {
          return { ...item, children: filterMenuItems(item.children) };
        }
        return item;
      })
      .filter(item => !item.children || item.children.length > 0)
      .map(({ requiredPermission, adminOnly, ...rest }) => rest);

  const menuItems = filterMenuItems(rawMenuItems);

  /* ── User dropdown ── */
  const userMenu = {
    items: [
      { key: 'profile', icon: <UserOutlined />, label: 'Hồ sơ cá nhân', onClick: () => navigate('/admin/profile') },
      { type: 'divider' },
      { key: 'logout', icon: <LogoutOutlined />, label: 'Đăng xuất', danger: true, onClick: handleLogout },
    ],
  };

  const isHousekeeping = location.pathname.startsWith('/admin/housekeeping');

  return (
    <>
      {/* Inject custom CSS for menu */}
      <style>{menuCss}</style>

      <Spin spinning={isLoading} size="large" tip="Hệ thống đang xử lý...">
        <Layout style={{ minHeight: '100vh' }}>

          {/* ─── SIDEBAR ─────────────────────────────────────── */}
          <Sider
            width={260}
            collapsedWidth={64}
            collapsed={isHousekeeping ? true : collapsed}
            style={siderStyle}
          >
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ flex: 1, overflow: 'auto' }}>
                {/* Logo area */}
                <div style={{
                  padding: collapsed || isHousekeeping ? '20px 12px' : '20px 20px',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  overflow: 'hidden',
                  transition: 'padding 200ms',
                }}>
                  <div style={{
                    width: 36, height: 36, border: `1px solid ${GOLD}`, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: "'Playfair Display', serif", fontSize: 15, color: GOLD,
                    flexShrink: 0, cursor: 'pointer',
                  }} onClick={() => navigate('/')}>
                    A
                  </div>
                  {!collapsed && !isHousekeeping && (
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ color: 'white', fontSize: 13, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        Asteria
                      </div>
                      <div style={{ color: GOLD, fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase', marginTop: 1 }}>
                        Hotel ERP
                      </div>
                    </div>
                  )}
                </div>

                {/* User info chip */}
                {!collapsed && !isHousekeeping && (
                  <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: `linear-gradient(135deg, ${GOLD}, #9a7b52)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontSize: 12, fontWeight: 700, flexShrink: 0,
                      }}>
                        {(user?.fullName?.[0] || 'A').toUpperCase()}
                      </div>
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ color: 'white', fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {user?.fullName || 'Admin'}
                        </div>
                        <div style={{ color: GOLD, fontSize: 10, letterSpacing: '0.1em' }}>
                          {user?.roleName || 'Admin'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation Menu */}
                <Menu
                  className="lotte-sider-menu"
                  theme="dark"
                  mode="inline"
                  defaultOpenKeys={[
                    ...(location.pathname.startsWith('/admin/bookings') || location.pathname.startsWith('/admin/arrivals') || location.pathname.startsWith('/admin/in-house') || location.pathname.startsWith('/admin/departures') || location.pathname.startsWith('/admin/services') ? ['reception_menu'] : []),
                    ...(location.pathname.startsWith('/admin/posts') || location.pathname.startsWith('/admin/article-categories') ? ['content_menu'] : []),
                  ]}
                  selectedKeys={[location.pathname]}
                  items={menuItems}
                  onClick={(e) => navigate(e.key)}
                  style={{ background: 'transparent', border: 'none', marginTop: 8, paddingBottom: 24 }}
                />
              </div>

              {/* Collapse toggle */}
              {!isHousekeeping && (
                <div style={{
                  padding: '14px 20px',
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                  background: DARK,
                  flexShrink: 0,
                }}>
                  <Button
                    type="text"
                    onClick={() => setCollapsed(!collapsed)}
                    icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                    style={{ color: 'rgba(255,255,255,0.4)', width: '100%', textAlign: collapsed ? 'center' : 'left', fontSize: 14 }}
                  />
                </div>
              )}
            </div>
          </Sider>

          {/* ─── MAIN AREA ───────────────────────────────────── */}
          <Layout style={{ background: '#f4f4f5' }}>

            {/* Header */}
            <div style={{
              background: 'white',
              height: 56,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 24px',
              borderBottom: '1px solid #f0f0f0',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              position: 'sticky',
              top: 0,
              zIndex: 10,
            }}>
              {/* Breadcrumb-style title */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 3, height: 20, background: GOLD, borderRadius: 2 }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#18181b', letterSpacing: '0.05em' }}>
                  HOTEL ERP
                </span>
              </div>

              {/* Right actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <NotificationBell />
                <Dropdown menu={userMenu} placement="bottomRight" arrow>
                  <Button
                    type="text"
                    style={{ display: 'flex', alignItems: 'center', gap: 8, height: 40, paddingInline: 12 }}
                  >
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: `linear-gradient(135deg, ${GOLD}, #9a7b52)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontSize: 11, fontWeight: 700,
                    }}>
                      {(user?.fullName?.[0] || 'A').toUpperCase()}
                    </div>
                    <span style={{ fontSize: 13, color: '#18181b', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user?.fullName || 'Admin'}
                    </span>
                  </Button>
                </Dropdown>
              </div>
            </div>

            {/* Page content */}
            <Content style={{
              margin: isHousekeeping ? 0 : '20px',
              padding: isHousekeeping ? 0 : '20px',
              background: isHousekeeping ? '#f4f4f5' : 'white',
              borderRadius: isHousekeeping ? 0 : 8,
              minHeight: 'calc(100vh - 96px)',
              boxShadow: isHousekeeping ? 'none' : '0 1px 3px rgba(0,0,0,0.04)',
            }}>
              <Outlet />
            </Content>
          </Layout>
        </Layout>
      </Spin>
    </>
  );
};

export default MainLayout;