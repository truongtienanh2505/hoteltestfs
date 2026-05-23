import React, { useState, useEffect } from 'react';
import { message } from 'antd';
import authApi from '../../api/authApi';
import { useAuthStore } from '../../store/authStore';
import { useNavigate, Link } from 'react-router-dom';

const G = '#b8956a';
const D = '#0d0d0d';

const parseJwt = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    );
    return JSON.parse(jsonPayload);
  } catch { return null; }
};

const SLIDES = [
  'https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=1400',
  'https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=1400',
  'https://images.unsplash.com/photo-1590490360182-c33d57733427?q=80&w=1400',
];

export default function Login() {
  const loginStore = useAuthStore(s => s.login);
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [slideIdx, setSlideIdx] = useState(0);
  const [focusField, setFocusField] = useState('');

  useEffect(() => { setTimeout(() => setMounted(true), 60); }, []);
  useEffect(() => {
    const t = setInterval(() => setSlideIdx(p => (p + 1) % SLIDES.length), 5500);
    return () => clearInterval(t);
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) { message.warning('Vui lòng điền đầy đủ thông tin!'); return; }
    setLoading(true);
    try {
      const response = await authApi.login({ username, password });
      const { accessToken, refreshToken } = response.data.data || response.data;
      if (!accessToken) { message.error('Token không hợp lệ!'); return; }

      const decoded = parseJwt(accessToken);
      let perms = decoded.permission || [];
      if (typeof perms === 'string') perms = [perms];

      const rawRole = decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || decoded.role || 'Admin';
      const role = Array.isArray(rawRole) ? rawRole[0] : rawRole;
      const fullName = decoded['unique_name'] || decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || decoded.name || decoded.fullName || null;
      const emailVal = decoded['email'] || decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] || null;

      loginStore({ fullName, email: emailVal, roleName: role }, accessToken, refreshToken, perms);
      message.success('Đăng nhập thành công!');
      if (role === 'Guest' || perms.includes('Guest')) navigate('/');
      else navigate('/admin/dashboard');
    } catch (err) {
      message.error(err.response?.data?.message || 'Đăng nhập thất bại!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: D, fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600&family=Inter:wght@300;400;500;600&display=swap');
        @keyframes authFadeUp { from { opacity:0; transform:translateY(28px); } to { opacity:1; transform:translateY(0); } }
        @keyframes authSlide { 0%{opacity:0} 8%{opacity:1} 92%{opacity:1} 100%{opacity:0} }
        @keyframes shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
        @keyframes spinSlow { to { transform: rotate(360deg); } }
        .auth-input { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.12); border-radius: 4px; width: 100%; height: 52px; padding: 0 48px 0 18px; color: white; font-size: 14px; font-family: 'Inter', sans-serif; outline: none; transition: border-color 300ms, background 300ms, box-shadow 300ms; box-sizing: border-box; }
        .auth-input::placeholder { color: rgba(255,255,255,0.3); font-size: 13px; }
        .auth-input:focus { border-color: ${G}; background: rgba(184,149,106,0.06); box-shadow: 0 0 0 3px rgba(184,149,106,0.08); }
        .auth-input.focused { border-color: ${G}; background: rgba(184,149,106,0.06); box-shadow: 0 0 0 3px rgba(184,149,106,0.08); }
        .auth-btn { width: 100%; height: 52px; background: ${G}; border: none; color: white; font-size: 11px; font-weight: 700; letter-spacing: 2.5px; text-transform: uppercase; font-family: 'Inter', sans-serif; cursor: pointer; border-radius: 2px; transition: all 300ms; position: relative; overflow: hidden; }
        .auth-btn:hover:not(:disabled) { background: #c9a97a; box-shadow: 0 8px 32px rgba(184,149,106,0.35); transform: translateY(-1px); }
        .auth-btn:active:not(:disabled) { transform: translateY(0); }
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
        .divider-or { display: flex; align-items: center; gap: 16px; margin: 24px 0; }
        .divider-or::before, .divider-or::after { content: ''; flex: 1; height: 1px; background: rgba(255,255,255,0.08); }
      `}</style>

      {/* Left panel — Hero image */}
      <div style={{ flex: '0 0 52%', position: 'relative', overflow: 'hidden', display: 'none' }} className="auth-hero-panel">
        <style>{`@media(min-width:900px){.auth-hero-panel{display:block!important;}}`}</style>
        {SLIDES.map((src, i) => (
          <div key={i} style={{
            position: 'absolute', inset: 0, zIndex: i === slideIdx ? 2 : 1,
            animation: i === slideIdx ? 'authSlide 5.5s ease forwards' : 'none',
          }}>
            <img src={src} alt="hotel" style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.04)', transition: 'transform 10s ease' }} />
          </div>
        ))}
        <div style={{ position: 'absolute', inset: 0, zIndex: 3, background: 'linear-gradient(120deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0.55) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, zIndex: 4, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '60px 56px' }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ width: 32, height: 1, background: G, marginBottom: 24 }} />
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, letterSpacing: '3px', textTransform: 'uppercase', color: G, marginBottom: 16, fontWeight: 600 }}>
              Asteria Resort
            </p>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(32px,3.5vw,50px)', color: 'white', lineHeight: 1.2, margin: '0 0 20px', fontWeight: 500 }}>
              Không gian nghỉ dưỡng<br />đẳng cấp thế giới.
            </h2>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.8, maxWidth: 380 }}>
              Nơi hội tụ tinh hoa ẩm thực, spa thư giãn và những trải nghiệm độc đáo dành riêng cho những vị khách tinh tế nhất.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 40 }}>
            {SLIDES.map((_, i) => (
              <div key={i} onClick={() => setSlideIdx(i)} style={{ height: 2, flex: i === slideIdx ? 2 : 1, background: i === slideIdx ? G : 'rgba(255,255,255,0.25)', borderRadius: 1, cursor: 'pointer', transition: 'all 500ms' }} />
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — Form */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 32px', position: 'relative', minWidth: 0 }}>
        {/* subtle vertical line decoration */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: 1, height: '100%', background: 'linear-gradient(to bottom, transparent, rgba(184,149,106,0.2), transparent)' }} />

        {/* Home button */}
        <Link to="/" className="home-btn">
          <div className="home-circle">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 12L12 3l9 9M4.5 10.5V20a1 1 0 001 1H9v-5h6v5h3.5a1 1 0 001-1v-9.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span style={{ fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 600 }}>Trang chủ</span>
        </Link>

        <div style={{
          width: '100%', maxWidth: 400,
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(28px)',
          transition: 'opacity 600ms ease, transform 600ms ease',
        }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, border: `1px solid ${G}`, borderRadius: '50%', marginBottom: 20, fontFamily: "'Playfair Display', serif", fontSize: 18, color: G }}>A</div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, color: 'white', margin: '0 0 8px', fontWeight: 400, letterSpacing: '4px', textTransform: 'uppercase' }}>Asteria</h1>
            <div style={{ width: 32, height: 1, background: G, margin: '0 auto 12px' }} />
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, letterSpacing: '2.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', margin: 0, fontWeight: 600 }}>Chào mừng trở lại</p>
          </div>

          {/* Form */}
          <form onSubmit={onSubmit} noValidate>
            <div style={{ marginBottom: 22 }}>
              <label className={`field-label ${focusField === 'username' ? 'active' : ''}`}>Email hoặc Số điện thoại</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-username"
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  onFocus={() => setFocusField('username')}
                  onBlur={() => setFocusField('')}
                  placeholder="Nhập email hoặc số điện thoại"
                  className={`auth-input ${focusField === 'username' ? 'focused' : ''}`}
                  autoComplete="username"
                />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className={`field-label ${focusField === 'password' ? 'active' : ''}`}>Mật khẩu</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setFocusField('password')}
                  onBlur={() => setFocusField('')}
                  placeholder="••••••••"
                  className={`auth-input ${focusField === 'password' ? 'focused' : ''}`}
                  autoComplete="current-password"
                />
                <button type="button" className="eye-btn" onClick={() => setShowPass(p => !p)}>
                  {showPass
                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" strokeLinecap="round" /></svg>
                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                  }
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 32 }}>
              <Link to="/forgot-password" className="auth-link" style={{ fontSize: 9, letterSpacing: '2px' }}>Quên mật khẩu?</Link>
            </div>

            <button type="submit" className="auth-btn" id="login-submit-btn" disabled={loading}>
              {loading
                ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spinSlow 0.8s linear infinite' }}><circle cx="12" cy="12" r="10" strokeOpacity="0.3" /><path d="M12 2a10 10 0 0110 10" /></svg>
                    Đang xử lý...
                  </span>
                : 'Đăng nhập'
              }
            </button>

            <div className="divider-or">
              <span style={{ fontSize: 9, letterSpacing: '2px', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase' }}>hoặc</span>
            </div>

            <div style={{ textAlign: 'center' }}>
              <span className="auth-link" style={{ marginRight: 8 }}>Chưa có tài khoản?</span>
              <Link to="/register" className="auth-link-gold">Đăng ký ngay</Link>
            </div>
          </form>

          {/* Bottom branding */}
          <div style={{ marginTop: 56, textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 28 }}>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)', letterSpacing: '1.5px', textTransform: 'uppercase', margin: 0 }}>
              © {new Date().getFullYear()} Asteria Resort. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}