import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { message, Modal, Table, Alert, Select, InputNumber, Empty, Spin, Button, Form, Input, Space, Row, Col, Statistic, Popconfirm, Tag } from 'antd';
import { 
  UserOutlined, LockOutlined, PhoneOutlined, MailOutlined, HomeOutlined, 
  CameraOutlined, EyeOutlined, EyeInvisibleOutlined, ArrowLeftOutlined,
  CalendarOutlined, CheckCircleOutlined, ShoppingCartOutlined, PlusOutlined,
  DeleteOutlined, PrinterOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../store/authStore';
import userProfileApi from '../../api/userProfileApi';
import voucherApi from '../../api/voucherApi';
import bookingManagementApi from '../../api/bookingManagementApi';
import GuestServiceTab from './GuestServiceTab';
import MainFooter from '../../components/Layout/MainFooter';

const G = '#b8956a';
const SF = { fontFamily: "'Playfair Display', serif" };

// ── Theme configuration helper ───────────────────────────────
const getTheme = (isAdmin) => ({
  text: isAdmin ? '#1a1814' : '#ffffff',
  subText: isAdmin ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.5)',
  inputBg: isAdmin ? '#fcfcfc' : 'rgba(255,255,255,0.06)',
  inputColor: isAdmin ? '#1a1814' : '#ffffff',
  inputBorder: isAdmin ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.12)',
  cardBg: isAdmin ? '#ffffff' : 'rgba(255,255,255,0.03)',
  cardBorder: isAdmin ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
  sectionBg: isAdmin ? 'transparent' : '#0d0d0d'
});

// ── Input component theo theme ───────────────────────────────
function Field({ label, icon: Icon, type = 'text', value, onChange, placeholder, disabled = false, required = false, theme }) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  return (
    <div style={{ marginBottom: 20 }}>
      {label && (
        <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: required ? G : theme.subText, marginBottom: 8 }}>
          {required && <span style={{ color: G, marginRight: 4 }}>*</span>}{label}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        {Icon && <Icon style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: G, opacity: 0.7, fontSize: 14, zIndex: 1 }} />}
        <input
          type={isPassword ? (show ? 'text' : 'password') : type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: `13px 16px 13px ${Icon ? '40px' : '16px'}`,
            paddingRight: isPassword ? 44 : 16,
            background: disabled ? 'rgba(0,0,0,0.02)' : theme.inputBg,
            border: `1px solid ${theme.inputBorder}`,
            borderRadius: 4, color: disabled ? theme.subText : theme.inputColor,
            fontSize: 14, outline: 'none', transition: 'all 200ms',
          }}
          onFocus={e => { if (!disabled) { e.target.style.borderColor = G; e.target.style.boxShadow = `0 0 0 2px ${G}15`; } }}
          onBlur={e => { e.target.style.borderColor = theme.inputBorder; e.target.style.boxShadow = 'none'; }}
        />
        {isPassword && (
          <button type="button" onClick={() => setShow(p => !p)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: theme.subText, cursor: 'pointer', padding: 4 }}>
            {show ? <EyeInvisibleOutlined /> : <EyeOutlined />}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Section title ────────────────────────────────────────────
function SectionTitle({ label, sub, theme }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.3em', textTransform: 'uppercase', color: G, display: 'block', marginBottom: 8 }}>{sub}</span>
      <h2 style={{ ...SF, fontSize: 24, color: theme.text, margin: 0, fontWeight: 400 }}>{label}</h2>
      <div style={{ width: 32, height: 1, background: G, marginTop: 12 }} />
    </div>
  );
}

export default function UserProfile() {
  const navigate = useNavigate();
  const location = useLocation();
  const { token, user, login } = useAuthStore();

  const [loading, setLoading] = useState(false);
  const [savingInfo, setSavingInfo] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [sc, setSc] = useState(false);
  const [profileData, setProfileData] = useState(null);

  // Đọc tab ban đầu từ URL (chỉ 1 lần khi mount)
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get('tab') || 'profile';
  });

  const [myBookings, setMyBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [vouchers, setVouchers] = useState([]);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);

  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');

  const isAdminArea = location.pathname.startsWith('/admin');
  const theme = getTheme(isAdminArea);

  // Walk-in service modal (triggered from FloatingSidebar)
  const [walkInOpen, setWalkInOpen] = useState(false);

  useEffect(() => {
    const f = () => setSc(window.scrollY > 50);
    window.addEventListener('scroll', f);
    return () => window.removeEventListener('scroll', f);
  }, []);

  // Nhận event từ FloatingSidebar (chử không navigate để tránh reload)
  useEffect(() => {
    const onTabChange = (e) => setActiveTab(e.detail);
    const onOpenWalkIn = () => setWalkInOpen(true);
    window.addEventListener('profile-tab-change', onTabChange);
    window.addEventListener('open-walkin-service', onOpenWalkIn);
    return () => {
      window.removeEventListener('profile-tab-change', onTabChange);
      window.removeEventListener('open-walkin-service', onOpenWalkIn);
    };
  }, []);

  const handleSyncPoints = async () => {
    try {
      const res = await userProfileApi.syncPoints();
      const data = res.data;
      if (data.success) {
        message.success(data.message);
        fetchProfile();
      } else {
        message.error(data.message);
      }
    } catch (err) {
      message.error('Lỗi khi đồng bộ điểm');
    }
  };

  useEffect(() => {
    document.title = 'Hồ Sơ Cá Nhân - Asteria Resort';
    if (!token) {
        navigate('/login');
        return;
    }
    fetchProfile();
    fetchMyBookings();
    fetchVouchers();
  }, [token]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await userProfileApi.getMyProfile();
      const d = res.data.data || res.data;
      setProfileData(d);
      setFullName(d.fullName || '');
      setEmail(d.email || '');
      setPhone(d.phone || '');
      setAddress(d.address || '');
      if (d.dateOfBirth) setDateOfBirth(d.dateOfBirth.split('T')[0]);
      setAvatarUrl(d.avatarUrl || '');
      setLoyaltyPoints(d.loyaltyPoints || 0);
    } catch {
      message.error('Không thể tải thông tin cá nhân!');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyBookings = async () => {
    setLoadingBookings(true);
    try {
      const res = await userProfileApi.getMyBookings();
      setMyBookings(res.data.data || []);
    } catch {
      message.error('Không thể tải lịch sử đặt phòng!');
    } finally {
      setLoadingBookings(false);
    }
  };

  const fetchVouchers = async () => {
    try {
      const r = await userProfileApi.getMyVouchers();
      setVouchers(r.data?.data || r.data || []);
    } catch {
      console.error('Failed to fetch vouchers');
    }
  };

  const [redeemLoading, setRedeemLoading] = useState(false);
  const handleRedeemPoints = async (pts) => {
    setRedeemLoading(true);
    try {
      await userProfileApi.redeemPoints(pts);
      message.success('Quy đổi điểm thành công!');
      if (user) {
        const newPoints = user.loyaltyPoints - pts;
        login({ ...user, loyaltyPoints: newPoints }, token, useAuthStore.getState().refreshToken, useAuthStore.getState().permissions);
      }
      fetchVouchers(); 
    } catch (err) {
      message.error(err.response?.data?.message || 'Lỗi quy đổi điểm!');
    } finally {
      setRedeemLoading(false);
    }
  };

  const handleUpdateInfo = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) { message.warning('Vui lòng nhập họ và tên!'); return; }
    setSavingInfo(true);
    try {
      await userProfileApi.updateProfile({ fullName, phone, address, dateOfBirth: dateOfBirth || null });
      message.success('Cập nhật thông tin thành công!');
      if (user) {
        login({ ...user, fullName }, token, useAuthStore.getState().refreshToken, useAuthStore.getState().permissions);
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'Cập nhật thất bại!');
    } finally {
      setSavingInfo(false);
    }
  };

  const handleChangePwd = async (e) => {
    e.preventDefault();
    if (!oldPwd) { message.warning('Vui lòng nhập mật khẩu hiện tại!'); return; }
    if (newPwd.length < 6) { message.warning('Mật khẩu mới phải có ít nhất 6 ký tự!'); return; }
    if (newPwd !== confirmPwd) { message.warning('Mật khẩu xác nhận không khớp!'); return; }
    setSavingPwd(true);
    try {
      await userProfileApi.changePassword({ oldPassword: oldPwd, newPassword: newPwd });
      message.success('Đổi mật khẩu thành công!');
      setOldPwd(''); setNewPwd(''); setConfirmPwd('');
    } catch (err) {
      message.error(err.response?.data?.message || 'Mật khẩu hiện tại không chính xác!');
    } finally {
      setSavingPwd(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await userProfileApi.uploadAvatar(formData);
      const newUrl = res.data.avatarUrl;
      setAvatarUrl(newUrl);
      if (user) {
        login({ ...user, avatarUrl: newUrl }, token, useAuthStore.getState().refreshToken, useAuthStore.getState().permissions);
      }
      message.success('Cập nhật ảnh đại diện thành công!');
    } catch {
      message.error('Tải ảnh thất bại!');
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code).then(() => {
      message.success(`Đã sao chép mã: ${code}`);
    });
  };

  const initials = fullName ? fullName.trim().split(' ').map(w => w[0]).slice(-2).join('').toUpperCase() : '?';

  const renderContent = () => (
    <>
      <div style={{ display: 'flex', gap: 32, marginBottom: 40, borderBottom: `1px solid ${theme.cardBorder}` }}>
        {[
          { id: 'profile', label: 'Hồ Sơ & Bảo Mật' },
          { id: 'bookings', label: 'Lịch Sử Đặt Phòng' },
          { id: 'services', label: '✦ Đặt Dịch Vụ' },
          { id: 'vouchers', label: 'Phiếu Giảm Giá' }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            background: 'none', border: 'none', padding: '0 0 16px', cursor: 'pointer',
            color: activeTab === tab.id ? G : theme.subText,
            fontSize: 11, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase',
            borderBottom: `2px solid ${activeTab === tab.id ? G : 'transparent'}`,
            transition: 'all 200ms',
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'profile' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
          <div style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: '36px 36px 40px', boxShadow: isAdminArea ? '0 4px 20px rgba(0,0,0,0.03)' : 'none' }}>
            <SectionTitle label="Thông Tin Cá Nhân" sub="Hồ sơ" theme={theme} />
            <form onSubmit={handleUpdateInfo}>
              <Field label="Họ và Tên" icon={UserOutlined} value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Nhập họ và tên..." required theme={theme} />
              <Field label="Email" icon={MailOutlined} value={email} disabled theme={theme} />
              <Field label="Số điện thoại" icon={PhoneOutlined} value={phone} onChange={e => setPhone(e.target.value)} placeholder="Số điện thoại" theme={theme} />
              <Field label="Ngày sinh" icon={CalendarOutlined} type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} disabled={!!(profileData && profileData.dateOfBirth)} theme={theme} />
              <Field label="Địa chỉ" icon={HomeOutlined} value={address} onChange={e => setAddress(e.target.value)} placeholder="Địa chỉ của bạn" theme={theme} />
              <button type="submit" disabled={savingInfo} style={{ width: '100%', padding: '14px', background: G, border: 'none', color: 'white', fontSize: 11, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', cursor: 'pointer', borderRadius: 4, marginTop: 10 }}>Lưu Thay Đổi</button>
            </form>
          </div>
          <div style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: '36px 36px 40px', boxShadow: isAdminArea ? '0 4px 20px rgba(0,0,0,0.03)' : 'none' }}>
            <SectionTitle label="Bảo Mật" sub="Mật khẩu" theme={theme} />
            <form onSubmit={handleChangePwd}>
              <Field label="Mật khẩu hiện tại" icon={LockOutlined} type="password" value={oldPwd} onChange={e => setOldPwd(e.target.value)} required theme={theme} />
              <Field label="Mật khẩu mới" icon={LockOutlined} type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} required theme={theme} />
              <Field label="Xác nhận mật khẩu" icon={LockOutlined} type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} required theme={theme} />
              <button type="submit" disabled={savingPwd} style={{ width: '100%', padding: '14px', background: 'transparent', border: `1px solid ${G}`, color: G, fontSize: 11, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', cursor: 'pointer', borderRadius: 4, marginTop: 10 }}>Đổi Mật Khẩu</button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'bookings' && (
        <div style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: '36px', boxShadow: isAdminArea ? '0 4px 20px rgba(0,0,0,0.03)' : 'none' }}>
          <SectionTitle label="Lịch Sử Đặt Phòng" sub="Đơn hàng" theme={theme} />
          {loadingBookings ? <p style={{ color: theme.text }}>Đang tải...</p> : myBookings.length === 0 ? <p style={{ color: theme.subText }}>Bạn chưa có đơn nào.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {myBookings.map(b => (
                <div key={b.id} style={{ border: `1px solid ${theme.cardBorder}`, borderRadius: 12, padding: 24, background: isAdminArea ? '#fcfcfc' : 'rgba(0,0,0,0.2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ color: G, fontWeight: 700, fontSize: 14, letterSpacing: '1px' }}>#{b.bookingCode}</span>
                    </div>
                    <span style={{ color: theme.subText, fontSize: 11, textTransform: 'uppercase', letterSpacing: '1px' }}>Ngày đặt: {new Date(b.createdAt).toLocaleDateString('vi-VN')}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {b.details?.map((d, i) => (
                      <div key={i} style={{ paddingBottom: 12, borderBottom: i === b.details.length - 1 ? 'none' : `1px dashed ${theme.cardBorder}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: theme.text, fontSize: 14, fontWeight: 500 }}>{d.roomTypeName}</span>
                          <span style={{ color: theme.text, fontWeight: 600 }}>{d.lineTotal.toLocaleString()}₫</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ borderTop: `1px solid ${theme.cardBorder}`, marginTop: 16, paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: 10, color: theme.subText, textTransform: 'uppercase', letterSpacing: '1px' }}>Trạng thái: <span style={{ color: b.status === 'Cancelled' ? '#ff4d4f' : '#52c41a' }}>{b.status}</span></span>
                      <span style={{ fontSize: 12, color: theme.subText, textTransform: 'uppercase', letterSpacing: '1px', marginTop: 4 }}>Tổng thanh toán</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: G, fontSize: 20, fontWeight: 700, ...SF, marginBottom: (['CheckedOut', 'Completed'].includes(b.status)) ? 8 : 0 }}>{b.finalAmount?.toLocaleString()}₫</div>
                      {['CheckedOut', 'Completed'].includes(b.status) && (
                        <button 
                          onClick={() => navigate(`/booking/${b.id}/review`)}
                          style={{ padding: '6px 16px', background: G, color: 'white', border: 'none', borderRadius: 4, fontSize: 11, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '1px' }}
                        >
                          Đánh giá ngay
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'vouchers' && (
        <div style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: '36px', boxShadow: isAdminArea ? '0 4px 20px rgba(0,0,0,0.03)' : 'none' }}>
          <SectionTitle label="Phiếu Giảm Giá" sub="Ưu đãi & Đặc quyền" theme={theme} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
            {vouchers.map(v => (
              <div key={v.id} style={{ 
                border: `1px solid ${G}40`, borderRadius: 12, padding: 0, 
                background: isAdminArea ? '#fcfcfc' : 'rgba(184,149,106,0.05)',
                display: 'flex', overflow: 'hidden'
              }}>
                <div style={{ width: 80, background: G, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 20 }}>
                  {v.discountType === 'PERCENT' ? v.discountValue + '%' : 'SALE'}
                </div>
                <div style={{ flex: 1, padding: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: theme.text, marginBottom: 4 }}>{v.code}</div>
                  <div style={{ fontSize: 16, color: G, fontWeight: 700, marginBottom: 12 }}>
                    {v.discountValue?.toLocaleString()}{v.discountType === 'PERCENT' ? '%' : '₫'} OFF
                  </div>
                  <button onClick={() => handleCopyCode(v.code)} style={{ width: '100%', padding: '8px', background: 'transparent', border: `1px solid ${G}`, color: G, fontSize: 10, fontWeight: 700, cursor: 'pointer', borderRadius: 4, transition: 'all 200ms' }}>SAO CHÉP MÃ</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {activeTab === 'services' && (
        <GuestServiceTab myBookings={myBookings} theme={theme} isAdminArea={isAdminArea} />
      )}
    </>
  );

  if (isAdminArea) {
    return (
      <div style={{ padding: '0 0 40px', background: 'transparent' }}>
        <style>{`
          input:-webkit-autofill { -webkit-box-shadow: 0 0 0 1000px #ffffff inset !important; -webkit-text-fill-color: #1a1814 !important; }
        `}</style>
        
        <SectionTitle label="Hồ Sơ Cá Nhân" sub="Quản lý tài khoản" theme={theme} />
        
        <div style={{ 
          background: 'linear-gradient(135deg, #1a1a1a, #111111)', 
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, 
          padding: 32, marginBottom: 40, display: 'flex', alignItems: 'center', gap: 32,
          boxShadow: '0 10px 30px rgba(0,0,0,0.15)'
        }}>
          <div style={{ position: 'relative' }}>
            <div style={{ width: 100, height: 100, borderRadius: '50%', border: `3px solid ${G}`, overflow: 'hidden', background: `${G}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {avatarUrl ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ ...SF, fontSize: 36, color: G }}>{initials}</span>}
            </div>
            <label htmlFor="avatar-upload-admin" style={{ position: 'absolute', bottom: 0, right: 0, width: 30, height: 30, background: G, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px solid #1a1a1a' }}>
              <CameraOutlined style={{ color: 'white', fontSize: 12 }} />
            </label>
            <input id="avatar-upload-admin" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ ...SF, fontSize: 28, margin: 0, color: 'white' }}>{fullName || 'Admin'}</h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', margin: '4px 0 16px', fontSize: 14 }}>{email}</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', color: G, background: `${G}20`, padding: '4px 12px', borderRadius: 4, border: `1px solid ${G}40` }}>{user?.roleName || 'Quản Trị Viên'}</span>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', color: '#fff', background: 'rgba(255,255,255,0.1)', padding: '4px 12px', borderRadius: 4 }}>ID: {user?.id?.slice(-6).toUpperCase()}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 48, paddingRight: 20 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ ...SF, fontSize: 24, color: G, fontWeight: 600 }}>{profileData?.membershipTier || 'Khách Mới'}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', marginTop: 4 }}>HẠNG THẺ</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ ...SF, fontSize: 24, color: G, fontWeight: 600 }}>{loyaltyPoints.toLocaleString()}P</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', marginTop: 4 }}>ĐIỂM</div>
            </div>
          </div>
        </div>
        
        <div style={{ background: 'white', padding: '32px', borderRadius: 12, border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          {renderContent()}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d0d', color: 'white', fontFamily: "'Inter', sans-serif" }}>
      <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: sc ? 'rgba(13,13,13,0.98)' : 'transparent', backdropFilter: sc ? 'blur(20px)' : 'none', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 80px', transition: 'all 400ms', borderBottom: sc ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
        <div onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <div style={{ width: 28, height: 28, border: `1px solid ${G}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: G, fontFamily: "'Playfair Display', serif", fontSize: 12 }}>A</div>
          <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase' }}>ASTERIA RESORT</span>
        </div>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', padding: '8px 24px', cursor: 'pointer', fontSize: 11, letterSpacing: '1px', borderRadius: 2, transition: 'all 200ms' }} onMouseEnter={e => e.currentTarget.style.borderColor = G} onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'}>
          <ArrowLeftOutlined /> TRANG CHỦ
        </button>
      </header>

      <div style={{ height: 320, background: 'linear-gradient(to bottom, #1a1209, #0d0d0d)', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'flex-end', padding: '0 80px 60px' }}>
         <div style={{ position: 'absolute', top: 0, right: 0, width: '40%', height: '100%', background: 'radial-gradient(circle, rgba(184,149,106,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
         <div>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.3em', color: G, textTransform: 'uppercase', display: 'block', marginBottom: 12 }}>Tài khoản khách hàng</span>
          <h1 style={{ ...SF, fontSize: 48, margin: 0, fontWeight: 400 }}>Hồ Sơ Cá Nhân</h1>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 80px 80px' }}>
        <div style={{ background: 'rgba(184,149,106,0.12)', border: `1px solid ${G}30`, borderRadius: 12, padding: 40, display: 'flex', alignItems: 'center', gap: 40, marginTop: -60, backdropFilter: 'blur(30px)', position: 'relative', zIndex: 5, boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
          <div style={{ position: 'relative' }}>
            <div style={{ width: 110, height: 110, borderRadius: '50%', border: `3px solid ${G}`, overflow: 'hidden', background: `${G}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {avatarUrl ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ ...SF, fontSize: 40, color: G }}>{initials}</span>}
            </div>
            <label htmlFor="avatar-upload" style={{ position: 'absolute', bottom: 4, right: 4, width: 32, height: 32, background: G, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '3px solid #0d0d0d', transition: 'transform 200ms' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
              <CameraOutlined style={{ color: 'white', fontSize: 14 }} />
            </label>
            <input id="avatar-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ ...SF, fontSize: 30, margin: 0 }}>{fullName || 'Quý khách'}</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', margin: '6px 0 12px' }}>{email}</p>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.15em', color: G, background: `${G}20`, padding: '4px 14px', borderRadius: 20, border: `1px solid ${G}30` }}>{user?.roleName || 'Thành Viên'}</span>
          </div>
          <div style={{ display: 'flex', gap: 48 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ ...SF, fontSize: 26, color: G, fontWeight: 500 }}>{profileData?.membershipTier || 'Khách Mới'}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', marginTop: 6, textTransform: 'uppercase' }}>Hạng thẻ</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ ...SF, fontSize: 26, color: G, fontWeight: 500 }}>{loyaltyPoints.toLocaleString()}P</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', marginTop: 6, textTransform: 'uppercase' }}>Điểm thưởng</div>
            </div>
          </div>
        </div>
        <div style={{ marginTop: 50 }}>{renderContent()}</div>
      </div>
      <MainFooter />
    </div>
  );
}
