import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Dropdown, Avatar, Space, ConfigProvider, theme, Badge, List, Button, Popover } from 'antd';
import { UserOutlined, LogoutOutlined, DashboardOutlined } from '@ant-design/icons';
import axiosClient from '../../api/axiosClient';

const G = '#b8956a', D = '#111111';
const SF = { fontFamily: "'Playfair Display',serif" };

import { useSignalR } from '../../hooks/useSignalR.jsx';

export default function MainHeader({ transparent = true }) {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, login, token, refreshToken, permissions } = useAuthStore();
  const { connection } = useSignalR();
  const [scrolled, setScrolled] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [profile, setProfile] = useState(null);
  const [activeSection, setActiveSection] = useState('');

  const isAdmin = isAuthenticated && (user?.roleName === 'Admin' || user?.role?.name === 'Admin' || user?.role === 'Admin' || user?.roleId === 1);
  // Tất cả nhân viên có role trong hệ thống (trừ Guest/Customer) đều thấy nút vào khu vực quản trị
  const STAFF_ROLES = ['Admin', 'Manager', 'Receptionist', 'Housekeeping', 'Accountant', 'WarehouseStaff', 'Marketing', 'MarketingStaff'];
  const isStaff = isAuthenticated && STAFF_ROLES.includes(user?.roleName);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll detection for Home Page sections
  useEffect(() => {
    if (window.location.pathname !== '/') {
      setActiveSection('');
      return;
    }

    const sections = [
      { id: 'hero-sec', link: '/' },
      { id: 'attractions-sec', link: '/#attractions-sec' },
      { id: 'news-sec', link: '/#news-sec' },
      { id: 'member', link: '/#member' }
    ];

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const section = sections.find(s => s.id === entry.target.id);
            if (section) setActiveSection(section.link);
          }
        });
      },
      { threshold: 0.3 }
    );

    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [window.location.pathname]);

  useEffect(() => {
    if (token) {
      fetchNotifications();
      fetchProfile();
    }
  }, [token]);

  useEffect(() => {
    if (connection) {
      connection.on("ReceiveNotification", (newNotif) => {
        setNotifications(prev => [newNotif, ...prev]);
        setUnreadCount(prev => prev + 1);
      });
    }
    return () => {
      if (connection) {
        connection.off("ReceiveNotification");
      }
    };
  }, [connection]);

  const fetchNotifications = async () => {
    try {
      const res = await axiosClient.get('/UserProfile/my-notifications');
      const data = res.data?.data || [];
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.isRead).length);
    } catch (err) {
      console.error("Lỗi fetch Notifications", err);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await axiosClient.get('/UserProfile/my-profile');
      const data = res.data?.data || res.data;
      setProfile(data);
      login({ ...user, ...data }, token, refreshToken, permissions);
    } catch (err) {
      console.error("Lỗi fetch Profile", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axiosClient.put('/UserProfile/my-notifications/read-all');
      fetchNotifications();
    } catch (err) {
      console.error("Lỗi mark as read", err);
    }
  };

  const userMenuItems = [
    { 
      key: 'membership', 
      label: (
        <div style={{ padding: '4px 0' }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', marginBottom: 2 }}>Hạng thành viên</div>
          <div style={{ color: G, fontWeight: 700, fontSize: 13 }}>{profile?.membershipTier || user?.membershipTier || 'Khách Mới'}</div>
          {(profile?.loyaltyPoints !== undefined || user?.loyaltyPoints !== undefined) && (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>
              {(profile?.loyaltyPoints ?? user?.loyaltyPoints).toLocaleString()} điểm tích lũy
            </div>
          )}
        </div>
      ),
      disabled: true
    },
    { type: 'divider' },
    { key: 'profile', label: 'Trang cá nhân', icon: <UserOutlined />, onClick: () => navigate('/profile') },
    ...(isStaff ? [{ key: 'admin', label: 'Quản trị hệ thống', icon: <DashboardOutlined />, onClick: () => navigate('/admin') }] : []),
    { type: 'divider' },
    { key: 'logout', label: 'Đăng xuất', icon: <LogoutOutlined />, danger: true, onClick: () => { logout(); navigate('/'); } },
  ];

  const AuthBlock = (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      {isAuthenticated ? (
        <ConfigProvider theme={{ algorithm: theme.darkAlgorithm, token: { colorPrimary: G, colorBgElevated: '#1a1a1a', borderRadiusLG: 12 } }}>
          <Dropdown
            menu={{ items: userMenuItems }}
            trigger={['click']}
            placement="bottomRight"
          >
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
              padding: '6px 14px 6px 8px', borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.05)',
              transition: 'all 200ms',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.borderColor = G; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}>
              <Avatar
                size={32}
                src={user?.avatarUrl || user?.avatar || user?.profilePicture}
                icon={!(user?.avatarUrl || user?.avatar || user?.profilePicture) && <UserOutlined />}
                style={{ background: `linear-gradient(135deg, ${G}, #9a7b52)`, fontSize: 14, flexShrink: 0 }}
              />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ color: 'white', fontSize: 12, fontWeight: 600, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2 }}>
                  {profile?.fullName || user?.fullName || user?.username || 'Tài khoản'}
                </span>
                {(profile?.membershipTier || user?.membershipTier) && (
                  <span style={{ color: G, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {profile?.membershipTier || user?.membershipTier}
                  </span>
                )}
              </div>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 4, flexShrink: 0 }}>
                <polyline points="6,9 12,15 18,9"/>
              </svg>
            </div>
          </Dropdown>
        </ConfigProvider>
      ) : (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <a href="/login" style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontSize: 11, transition: 'color 200ms', letterSpacing: '0.5px' }} onMouseEnter={e => e.target.style.color = 'white'} onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.8)'}>Đăng nhập</a>
          <a href="/register" style={{ color: 'white', textDecoration: 'none', fontSize: 11, background: G, padding: '5px 14px', borderRadius: 999, letterSpacing: '0.5px', transition: 'opacity 200ms' }} onMouseEnter={e => e.currentTarget.style.opacity = '0.85'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>Đăng ký</a>
        </div>
      )}
    </div>
  );

  return (
    <header style={{ 
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, 
      background: (scrolled || !transparent) ? D : 'linear-gradient(to bottom,rgba(0,0,0,.8),transparent)', 
      transition: 'background 400ms', 
      boxShadow: (scrolled || !transparent) ? '0 2px 20px rgba(0,0,0,.5)' : 'none' 
    }}>
      <div>
        {/* Top Row */}
        <div style={{ 
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
          height: scrolled ? 0 : 64, 
          opacity: scrolled ? 0 : 1, 
          overflow: 'hidden', 
          borderBottom: scrolled ? 'none' : '1px solid rgba(255,255,255,0.1)', 
          padding: '0 clamp(24px,5vw,80px)', 
          transition: 'height 300ms ease, opacity 300ms ease, border-bottom 300ms ease' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => navigate('/')}>
            <div style={{ width: 32, height: 32, border: '1px solid white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', ...SF, fontSize: 14, color: 'white' }}>A</div>
            <span style={{ color: 'white', fontSize: 15, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase' }}>Asteria Resort</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: 11, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.5px' }}>
            <div style={{ display: 'flex', gap: 20 }}>
              <a href="/#member" style={{ color: 'inherit', textDecoration: 'none', transition: 'color 200ms' }} onMouseEnter={e => e.target.style.color = 'white'} onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.7)'}>Hội Viên Rewards</a>
            </div>
            <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.15)' }} />
            
            {token ? (
              <Popover
                content={
                  <div style={{ width: 320, background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'white', fontWeight: 600, fontSize: 13 }}>Thông báo</span>
                      {unreadCount > 0 && (
                        <span onClick={markAllAsRead} style={{ color: G, fontSize: 11, cursor: 'pointer' }}>Đánh dấu đã đọc</span>
                      )}
                    </div>
                    <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                      {notifications.length === 0 ? (
                        <div style={{ padding: 20, textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Chưa có thông báo nào</div>
                      ) : (
                        notifications.map(n => (
                          <div key={n.id} style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: n.isRead ? 'transparent' : 'rgba(184,149,106,0.1)', cursor: 'pointer', transition: 'background 200ms' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = n.isRead ? 'transparent' : 'rgba(184,149,106,0.1)'}>
                            <div style={{ color: n.isRead ? 'rgba(255,255,255,0.8)' : 'white', fontSize: 12, fontWeight: n.isRead ? 400 : 600, marginBottom: 4 }}>{n.title}</div>
                            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, lineHeight: 1.4 }}>{n.content}</div>
                            <div style={{ color: G, fontSize: 10, marginTop: 4 }}>{new Date(n.createdAt).toLocaleDateString('vi-VN')} {new Date(n.createdAt).toLocaleTimeString('vi-VN')}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                }
                trigger="click"
                placement="bottomRight"
                styles={{ content: { padding: 0, background: 'transparent', border: 'none', boxShadow: 'none' } }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', padding: '4px 8px', borderRadius: 4, transition: 'background 200ms' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <Badge count={unreadCount} size="small" offset={[2, 0]} color={G}>
                    <span style={{ color: G, fontSize: 13 }}>🔔</span>
                  </Badge>
                  <span style={{ color: 'rgba(255,255,255,0.75)', marginLeft: 4 }}>Thông báo</span>
                </span>
              </Popover>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', padding: '4px 8px', borderRadius: 4, transition: 'background 200ms' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                onClick={() => navigate('/login')}>
                <span style={{ color: G, fontSize: 13 }}>🔔</span>
                <span style={{ color: 'rgba(255,255,255,0.75)' }}>Thông báo</span>
              </span>
            )}
            <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.15)' }} />
            {AuthBlock}
          </div>
        </div>

        {/* Bottom Row */}
        <div style={{ display: 'flex', alignItems: 'center', height: 60, position: 'relative', padding: '0 clamp(40px,8vw,160px)' }}>
          <div style={{ position: 'absolute', left: 'clamp(40px,8vw,160px)', opacity: scrolled ? 1 : 0, pointerEvents: scrolled ? 'auto' : 'none', transition: 'opacity 300ms ease', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => navigate('/')}>
            <div style={{ width: 24, height: 24, border: '1px solid white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', ...SF, fontSize: 11, color: 'white' }}>A</div>
          </div>
        <nav style={{ display: 'flex', gap: 48, width: '100%', justifyContent: 'center' }}>
          {[
            ['THƯƠNG HIỆU', '/'],
            ['TRẢI NGHIỆM', '/#attractions-sec'],
            ['TIN TỨC', '/#news-sec'],
            ['THÀNH VIÊN', '/#member'],
            ['Ý KIẾN', '/reviews'],
          ].map(([l, h]) => {
            const isPathActive = (h === '/' && window.location.pathname === '/') ||
                                 (h !== '/' && !h.startsWith('/#') && window.location.pathname.startsWith(h));
            const isActive = (window.location.pathname === '/' && activeSection)
              ? activeSection === h
              : (window.location.pathname === '/' && h === '/')
                ? !activeSection
                : isPathActive;

            const handleClick = (e) => {
              e.preventDefault();
              if (h.startsWith('/#')) {
                // Hash section — scroll nếu đang ở trang chủ, navigate nếu ở trang khác
                const sectionId = h.slice(2);
                if (window.location.pathname === '/') {
                  document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
                } else {
                  navigate('/');
                  setTimeout(() => {
                    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
                  }, 300);
                }
              } else if (h === '/') {
                if (window.location.pathname === '/') {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                  navigate('/');
                }
              } else {
                navigate(h);
              }
            };

            return (
              <a key={l} href={h} onClick={handleClick} style={{
                fontSize: 11, fontWeight: 500, letterSpacing: '1.5px', color: isActive ? 'white' : 'rgba(255,255,255,.7)',
                textDecoration: 'none', height: 60, display: 'flex', alignItems: 'center',
                borderBottom: isActive ? `2px solid ${G}` : '2px solid transparent', transition: 'color 300ms, border-color 300ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'white'; e.currentTarget.style.borderBottomColor = G; }}
              onMouseLeave={e => { e.currentTarget.style.color = isActive ? 'white' : 'rgba(255,255,255,.7)'; e.currentTarget.style.borderBottomColor = isActive ? G : 'transparent'; }}>
                {l}
              </a>
            );
          })}
        </nav>

          <div style={{ position: 'absolute', right: 'clamp(40px,8vw,160px)', opacity: scrolled ? 1 : 0, pointerEvents: scrolled ? 'auto' : 'none', transition: 'opacity 300ms ease' }}>
            {AuthBlock}
          </div>
        </div>
      </div>
    </header>
  );
}
