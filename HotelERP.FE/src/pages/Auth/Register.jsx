import React, { useState, useEffect } from 'react';
import { message } from 'antd';
import authApi from '../../api/authApi';
import { useNavigate, Link } from 'react-router-dom';

const G = '#b8956a';
const D = '#0d0d0d';

const SLIDE = 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?q=80&w=1400';

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '', phone: '', address: '', dateOfBirth: '' });
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [focusField, setFocusField] = useState('');
  const [passStrength, setPassStrength] = useState(0);

  useEffect(() => { setTimeout(() => setMounted(true), 60); }, []);

  const getStrength = (p) => {
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  };

  const onChange = (field) => (e) => {
    const val = e.target.value;
    setForm(f => ({ ...f, [field]: val }));
    if (field === 'password') setPassStrength(getStrength(val));
  };

  const strengthColors = ['#3f3f46', '#ef4444', '#f59e0b', '#22c55e', '#16a34a'];
  const strengthLabels = ['', 'Yếu', 'Trung bình', 'Mạnh', 'Rất mạnh'];

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.fullName || !form.email || !form.password || !form.confirmPassword) {
      message.warning('Vui lòng điền đầy đủ thông tin!'); return;
    }
    if (form.password !== form.confirmPassword) {
      message.error('Mật khẩu xác nhận không khớp!'); return;
    }
    setLoading(true);
    try {
      await authApi.register({ 
        fullName: form.fullName, 
        email: form.email, 
        password: form.password,
        phone: form.phone,
        address: form.address,
        dateOfBirth: form.dateOfBirth || null
      });
      message.success('Đăng ký thành công! Vui lòng đăng nhập.');
      navigate('/login');
    } catch (err) {
      message.error(err.response?.data?.message || 'Đăng ký thất bại!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: D, fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600&family=Inter:wght@300;400;500;600&display=swap');
        @keyframes authFadeUp { from { opacity:0; transform:translateY(28px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spinSlow { to { transform: rotate(360deg); } }
        .auth-input { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.12); border-radius: 4px; width: 100%; height: 52px; padding: 0 48px 0 18px; color: white; font-size: 14px; font-family: 'Inter', sans-serif; outline: none; transition: border-color 300ms, background 300ms, box-shadow 300ms; box-sizing: border-box; }
        .auth-input::placeholder { color: rgba(255,255,255,0.3); font-size: 13px; }
        .auth-input:focus { border-color: ${G}; background: rgba(184,149,106,0.06); box-shadow: 0 0 0 3px rgba(184,149,106,0.08); }
        .auth-input.focused { border-color: ${G}; background: rgba(184,149,106,0.06); box-shadow: 0 0 0 3px rgba(184,149,106,0.08); }
        .auth-btn { width: 100%; height: 52px; background: ${G}; border: none; color: white; font-size: 11px; font-weight: 700; letter-spacing: 2.5px; text-transform: uppercase; font-family: 'Inter', sans-serif; cursor: pointer; border-radius: 2px; transition: all 300ms; position: relative; overflow: hidden; }
        .auth-btn:hover:not(:disabled) { background: #c9a97a; box-shadow: 0 8px 32px rgba(184,149,106,0.35); transform: translateY(-1px); }
        .auth-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .auth-btn::after { content:''; position:absolute; inset:0; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent); transform:translateX(-100%); transition: transform 600ms; }
        .auth-btn:hover::after { transform:translateX(100%); }
        .auth-link { color: rgba(255,255,255,0.45); font-size: 11px; letter-spacing: 1px; text-transform: uppercase; text-decoration: none; transition: color 250ms; }
        .auth-link:hover { color: ${G}; }
        .auth-link-gold { color: ${G}; font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; text-decoration: none; font-weight: 600; border-bottom: 1px solid ${G}; padding-bottom: 2px; transition: color 250ms, border-color 250ms; }
        .auth-link-gold:hover { color: white; border-color: white; }
        .field-label { display: block; font-size: 9px; letter-spacing: 2px; text-transform: uppercase; color: rgba(255,255,255,0.35); margin-bottom: 8px; font-weight: 600; transition: color 300ms; }
        .field-label.active { color: ${G}; }
        .eye-btn { position: absolute; right: 16px; top: 50%; transform: translateY(-50%); background: none; border: none; color: rgba(255,255,255,0.35); cursor: pointer; padding: 4px; line-height: 1; transition: color 200ms; }
        .eye-btn:hover { color: ${G}; }
        .home-btn { position: fixed; top: 32px; left: 32px; z-index: 100; display: flex; align-items: center; gap: 10px; color: rgba(255,255,255,0.6); text-decoration: none; transition: color 300ms; }
        .home-btn:hover { color: white; }
        .home-btn:hover .home-circle { border-color: white; background: rgba(255,255,255,0.08); }
        .home-circle { width: 36px; height: 36px; border: 1px solid rgba(255,255,255,0.25); border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.03); backdrop-filter: blur(8px); transition: all 300ms; }
      `}</style>

      {/* Left panel — Hero */}
      <div style={{ flex: '0 0 48%', position: 'relative', overflow: 'hidden', display: 'none' }} className="auth-hero-panel">
        <style>{`@media(min-width:900px){.auth-hero-panel{display:block!important;}}`}</style>
        <img src={SLIDE} alt="hotel" style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.04)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.4) 70%, rgba(0,0,0,0.6) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '60px 56px' }}>
          <div style={{ width: 32, height: 1, background: G, marginBottom: 24 }} />
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, letterSpacing: '3px', textTransform: 'uppercase', color: G, marginBottom: 16, fontWeight: 600 }}>Thành viên Asteria</p>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(30px,3vw,46px)', color: 'white', lineHeight: 1.25, margin: '0 0 20px', fontWeight: 500 }}>
            Tham gia cộng đồng<br />hội viên thượng lưu.
          </h2>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.8, maxWidth: 360, margin: 0 }}>
            Đặc quyền hội viên, ưu đãi độc quyền và những trải nghiệm được cá nhân hoá chỉ dành riêng cho bạn.
          </p>
          {/* Benefits */}
          <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {['Ưu đãi giá phòng độc quyền hội viên', 'Tích điểm mỗi lần lưu trú', 'Dịch vụ concierge 24/7'].map(b => (
              <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: G, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{b}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — Form */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 32px', overflowY: 'auto', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: 1, height: '100%', background: 'linear-gradient(to bottom, transparent, rgba(184,149,106,0.2), transparent)' }} />

        <Link to="/" className="home-btn">
          <div className="home-circle">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 12L12 3l9 9M4.5 10.5V20a1 1 0 001 1H9v-5h6v5h3.5a1 1 0 001-1v-9.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span style={{ fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 600 }}>Trang chủ</span>
        </Link>

        <div style={{
          width: '100%', maxWidth: 420,
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(28px)',
          transition: 'opacity 600ms ease, transform 600ms ease',
          paddingTop: 20,
        }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, border: `1px solid ${G}`, borderRadius: '50%', marginBottom: 18, fontFamily: "'Playfair Display', serif", fontSize: 18, color: G }}>A</div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, color: 'white', margin: '0 0 8px', fontWeight: 400, letterSpacing: '4px', textTransform: 'uppercase' }}>Asteria</h1>
            <div style={{ width: 32, height: 1, background: G, margin: '0 auto 12px' }} />
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, letterSpacing: '2.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', margin: 0, fontWeight: 600 }}>Tạo tài khoản mới</p>
          </div>

          <form onSubmit={onSubmit} noValidate>
            {/* Full name */}
            <div style={{ marginBottom: 18 }}>
              <label className={`field-label ${focusField === 'fullName' ? 'active' : ''}`}>Họ và Tên</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="reg-fullname"
                  type="text"
                  value={form.fullName}
                  onChange={onChange('fullName')}
                  onFocus={() => setFocusField('fullName')}
                  onBlur={() => setFocusField('')}
                  placeholder="Nguyễn Văn A"
                  className={`auth-input ${focusField === 'fullName' ? 'focused' : ''}`}
                  autoComplete="name"
                />
              </div>
            </div>

            {/* Email */}
            <div style={{ marginBottom: 18 }}>
              <label className={`field-label ${focusField === 'email' ? 'active' : ''}`}>Địa chỉ Email</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="reg-email"
                  type="email"
                  value={form.email}
                  onChange={onChange('email')}
                  onFocus={() => setFocusField('email')}
                  onBlur={() => setFocusField('')}
                  placeholder="your@email.com"
                  className={`auth-input ${focusField === 'email' ? 'focused' : ''}`}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Phone & Date of Birth */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 18 }}>
              <div style={{ flex: 1 }}>
                <label className={`field-label ${focusField === 'phone' ? 'active' : ''}`}>Số điện thoại</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={onChange('phone')}
                  onFocus={() => setFocusField('phone')}
                  onBlur={() => setFocusField('')}
                  placeholder="09xx xxx xxx"
                  className={`auth-input ${focusField === 'phone' ? 'focused' : ''}`}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label className={`field-label ${focusField === 'dob' ? 'active' : ''}`}>Ngày sinh</label>
                <input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={onChange('dateOfBirth')}
                  onFocus={() => setFocusField('dob')}
                  onBlur={() => setFocusField('')}
                  className={`auth-input ${focusField === 'dob' ? 'focused' : ''}`}
                  style={{ paddingRight: 12 }}
                />
              </div>
            </div>

            {/* Address */}
            <div style={{ marginBottom: 18 }}>
              <label className={`field-label ${focusField === 'address' ? 'active' : ''}`}>Địa chỉ</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={form.address}
                  onChange={onChange('address')}
                  onFocus={() => setFocusField('address')}
                  onBlur={() => setFocusField('')}
                  placeholder="Số nhà, tên đường, quận/huyện..."
                  className={`auth-input ${focusField === 'address' ? 'focused' : ''}`}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: 10 }}>
              <label className={`field-label ${focusField === 'password' ? 'active' : ''}`}>Mật khẩu</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="reg-password"
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={onChange('password')}
                  onFocus={() => setFocusField('password')}
                  onBlur={() => setFocusField('')}
                  placeholder="Tối thiểu 8 ký tự"
                  className={`auth-input ${focusField === 'password' ? 'focused' : ''}`}
                  autoComplete="new-password"
                />
                <button type="button" className="eye-btn" onClick={() => setShowPass(p => !p)}>
                  {showPass
                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" strokeLinecap="round" /></svg>
                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                  }
                </button>
              </div>
              {/* Strength bar */}
              {form.password && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                    {[1,2,3,4].map(i => (
                      <div key={i} style={{ flex: 1, height: 2, borderRadius: 1, background: passStrength >= i ? strengthColors[passStrength] : 'rgba(255,255,255,0.1)', transition: 'background 300ms' }} />
                    ))}
                  </div>
                  <span style={{ fontSize: 9, letterSpacing: '1.5px', textTransform: 'uppercase', color: strengthColors[passStrength], fontWeight: 600 }}>{strengthLabels[passStrength]}</span>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div style={{ marginBottom: 32 }}>
              <label className={`field-label ${focusField === 'confirm' ? 'active' : ''}`}>Xác nhận mật khẩu</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="reg-confirm"
                  type={showConfirm ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={onChange('confirmPassword')}
                  onFocus={() => setFocusField('confirm')}
                  onBlur={() => setFocusField('')}
                  placeholder="••••••••"
                  className={`auth-input ${focusField === 'confirm' ? 'focused' : ''}`}
                  autoComplete="new-password"
                  style={{ borderColor: form.confirmPassword && form.confirmPassword !== form.password ? '#ef4444' : undefined }}
                />
                <button type="button" className="eye-btn" onClick={() => setShowConfirm(p => !p)}>
                  {showConfirm
                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" strokeLinecap="round" /></svg>
                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                  }
                </button>
              </div>
              {form.confirmPassword && form.confirmPassword !== form.password && (
                <p style={{ fontSize: 11, color: '#ef4444', marginTop: 6, letterSpacing: '0.5px' }}>Mật khẩu không khớp</p>
              )}
            </div>

            <button type="submit" className="auth-btn" id="register-submit-btn" disabled={loading}>
              {loading
                ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spinSlow 0.8s linear infinite' }}><circle cx="12" cy="12" r="10" strokeOpacity="0.3" /><path d="M12 2a10 10 0 0110 10" /></svg>
                    Đang xử lý...
                  </span>
                : 'Tạo tài khoản'
              }
            </button>

            <div style={{ textAlign: 'center', marginTop: 28 }}>
              <span className="auth-link" style={{ marginRight: 8 }}>Đã có tài khoản?</span>
              <Link to="/login" className="auth-link-gold">Đăng nhập</Link>
            </div>
          </form>

          <div style={{ marginTop: 48, textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 24 }}>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)', letterSpacing: '1.5px', textTransform: 'uppercase', margin: 0 }}>
              © {new Date().getFullYear()} Asteria Resort. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}