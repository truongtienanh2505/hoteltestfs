import React, { useState, useEffect, useRef } from 'react';
import { message } from 'antd';
import authApi from '../../api/authApi';
import { useNavigate, Link } from 'react-router-dom';

const G = '#b8956a';
const HERO = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1400';

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500&family=Inter:wght@300;400;500;600&display=swap');
  @keyframes fpFadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
  @keyframes spinSlow { to{transform:rotate(360deg)} }
  @keyframes progressBar { from{width:0%} to{width:100%} }
  .fp-input{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.12);border-radius:4px;width:100%;height:52px;padding:0 18px;color:white;font-size:14px;font-family:'Inter',sans-serif;outline:none;transition:border-color 300ms,background 300ms,box-shadow 300ms;box-sizing:border-box}
  .fp-input::placeholder{color:rgba(255,255,255,0.3);font-size:13px}
  .fp-input:focus,.fp-input.focused{border-color:${G};background:rgba(184,149,106,0.06);box-shadow:0 0 0 3px rgba(184,149,106,0.08)}
  .fp-input-otp{text-align:center;letter-spacing:0.6em;font-size:20px;font-weight:600;font-family:'Inter',sans-serif}
  .fp-btn{width:100%;height:52px;background:${G};border:none;color:white;font-size:11px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;font-family:'Inter',sans-serif;cursor:pointer;border-radius:2px;transition:all 300ms;position:relative;overflow:hidden}
  .fp-btn:hover:not(:disabled){background:#c9a97a;box-shadow:0 8px 32px rgba(184,149,106,0.35);transform:translateY(-1px)}
  .fp-btn:disabled{opacity:0.6;cursor:not-allowed}
  .fp-btn::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent);transform:translateX(-100%);transition:transform 600ms}
  .fp-btn:hover::after{transform:translateX(100%)}
  .fp-btn-ghost{width:100%;height:44px;background:transparent;border:1px solid rgba(255,255,255,0.12);color:rgba(255,255,255,0.5);font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;font-family:'Inter',sans-serif;cursor:pointer;border-radius:2px;transition:all 300ms}
  .fp-btn-ghost:hover{border-color:${G};color:${G}}
  .fp-label{display:block;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.35);margin-bottom:8px;font-weight:600;transition:color 300ms}
  .fp-label.active{color:${G}}
  .fp-link{color:rgba(255,255,255,0.4);font-size:10px;letter-spacing:1.5px;text-transform:uppercase;text-decoration:none;transition:color 250ms;font-weight:500}
  .fp-link:hover{color:${G}}
  .fp-link-gold{color:${G};font-size:10px;letter-spacing:1.5px;text-transform:uppercase;text-decoration:none;font-weight:600;border-bottom:1px solid ${G};padding-bottom:2px;transition:color 250ms,border-color 250ms}
  .fp-link-gold:hover{color:white;border-color:white}
  .home-btn{position:fixed;top:32px;left:32px;z-index:100;display:flex;align-items:center;gap:10px;color:rgba(255,255,255,0.6);text-decoration:none;transition:color 300ms}
  .home-btn:hover{color:white}
  .home-btn:hover .home-circle{border-color:white;background:rgba(255,255,255,0.08)}
  .home-circle{width:36px;height:36px;border:1px solid rgba(255,255,255,0.25);border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.03);backdrop-filter:blur(8px);transition:all 300ms}
  .step-dot{width:6px;height:6px;border-radius:50%;transition:all 400ms;cursor:default}
`;

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1=email, 2=otp+newpass
  const [emailSent, setEmailSent] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [focusField, setFocusField] = useState('');
  const [countdown, setCountdown] = useState(0);

  // Form values
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass, setShowPass] = useState(false);

  const timerRef = useRef(null);

  useEffect(() => { setTimeout(() => setMounted(true), 60); }, []);

  useEffect(() => {
    if (countdown > 0) {
      timerRef.current = setTimeout(() => setCountdown(c => c - 1), 1000);
    }
    return () => clearTimeout(timerRef.current);
  }, [countdown]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email) { message.warning('Vui lòng nhập địa chỉ email!'); return; }
    setLoading(true);
    try {
      await authApi.forgotPassword({ email });
      setEmailSent(email);
      setCountdown(300);
      message.success('Mã OTP đã được gửi đến email của bạn!');
      setStep(2);
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể gửi OTP. Vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (!otp || !newPass || !confirmPass) { message.warning('Vui lòng điền đầy đủ!'); return; }
    if (newPass !== confirmPass) { message.error('Mật khẩu xác nhận không khớp!'); return; }
    setLoading(true);
    try {
      await authApi.resetPasswordWithOtp({ email: emailSent, otpCode: otp, newPassword: newPass });
      message.success('Đổi mật khẩu thành công!');
      navigate('/login');
    } catch (err) {
      message.error(err.response?.data?.message || 'Mã OTP không đúng hoặc đã hết hạn!');
    } finally {
      setLoading(false);
    }
  };

  const fmtTime = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  const EyeIcon = ({ show }) => show
    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" strokeLinecap="round"/></svg>
    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0d0d0d', fontFamily: "'Inter', sans-serif" }}>
      <style>{CSS}</style>

      {/* Hero left panel */}
      <div style={{ flex: '0 0 50%', position: 'relative', overflow: 'hidden', display: 'none' }} className="fp-hero-panel">
        <style>{`@media(min-width:900px){.fp-hero-panel{display:block!important;}}`}</style>
        <img src={HERO} alt="resort" style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.04)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,rgba(0,0,0,0.78) 0%,rgba(0,0,0,0.35) 60%,rgba(0,0,0,0.6) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '60px 56px' }}>
          <div style={{ width: 32, height: 1, background: G, marginBottom: 24 }} />
          <p style={{ fontSize: 10, letterSpacing: '3px', textTransform: 'uppercase', color: G, marginBottom: 16, fontWeight: 600 }}>Bảo mật tài khoản</p>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(30px,3vw,46px)', color: 'white', lineHeight: 1.25, margin: '0 0 20px', fontWeight: 500 }}>
            Khôi phục quyền<br />truy cập an toàn.
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.8, maxWidth: 360, margin: 0 }}>
            Chúng tôi sẽ gửi mã xác thực OTP về email đã đăng ký để bảo vệ tài khoản của bạn.
          </p>
          {/* Steps indicator */}
          <div style={{ marginTop: 48, display: 'flex', flexDirection: 'column', gap: 20 }}>
            {[
              { n: 1, label: 'Nhập địa chỉ email', desc: 'Email tài khoản đã đăng ký' },
              { n: 2, label: 'Xác thực OTP', desc: 'Mã gửi về hộp thư của bạn' },
              { n: 3, label: 'Tạo mật khẩu mới', desc: 'Đặt lại và hoàn tất' },
            ].map(({ n, label, desc }) => {
              const done = (step === 1 && n < 1) || (step === 2 && n < 2);
              const active = (step === 1 && n === 1) || (step === 2 && n >= 2);
              return (
                <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 16, opacity: active ? 1 : 0.4 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', border: `1px solid ${active ? G : 'rgba(255,255,255,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: done ? G : 'transparent', transition: 'all 400ms' }}>
                    {done
                      ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" strokeLinecap="round"/></svg>
                      : <span style={{ fontSize: 11, color: active ? G : 'rgba(255,255,255,0.4)', fontWeight: 600 }}>{n}</span>
                    }
                  </div>
                  <div>
                    <p style={{ fontSize: 13, color: 'white', margin: 0, fontWeight: 500 }}>{label}</p>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 32px', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: 1, height: '100%', background: 'linear-gradient(to bottom,transparent,rgba(184,149,106,0.2),transparent)' }} />

        <Link to="/" className="home-btn">
          <div className="home-circle">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 12L12 3l9 9M4.5 10.5V20a1 1 0 001 1H9v-5h6v5h3.5a1 1 0 001-1v-9.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={{ fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 600 }}>Trang chủ</span>
        </Link>

        <div style={{ width: '100%', maxWidth: 400, opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(24px)', transition: 'opacity 600ms ease, transform 600ms ease' }}>

          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, border: `1px solid ${G}`, borderRadius: '50%', marginBottom: 18, fontFamily: "'Playfair Display', serif", fontSize: 18, color: G }}>A</div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, color: 'white', margin: '0 0 8px', fontWeight: 400, letterSpacing: '4px', textTransform: 'uppercase' }}>Asteria</h1>
            <div style={{ width: 32, height: 1, background: G, margin: '0 auto 12px' }} />
            <p style={{ fontSize: 9, letterSpacing: '2.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', margin: 0, fontWeight: 600 }}>
              {step === 1 ? 'Khôi phục mật khẩu' : 'Đặt lại mật khẩu'}
            </p>
          </div>

          {/* Step dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 36 }}>
            <div className="step-dot" style={{ width: step === 1 ? 20 : 6, background: step === 1 ? G : 'rgba(184,149,106,0.4)', borderRadius: step === 1 ? 3 : '50%' }} />
            <div className="step-dot" style={{ width: step === 2 ? 20 : 6, background: step === 2 ? G : 'rgba(255,255,255,0.15)', borderRadius: step === 2 ? 3 : '50%' }} />
          </div>

          {/* ── STEP 1: Email ── */}
          {step === 1 && (
            <form onSubmit={handleSendOtp} noValidate key="step1" style={{ animation: 'fpFadeUp 400ms ease both' }}>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, marginBottom: 28, textAlign: 'center' }}>
                Nhập email đã đăng ký — chúng tôi sẽ gửi mã OTP 6 số để xác thực danh tính.
              </p>

              <div style={{ marginBottom: 28 }}>
                <label className={`fp-label ${focusField === 'email' ? 'active' : ''}`}>Địa chỉ Email</label>
                <input
                  id="fp-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setFocusField('email')}
                  onBlur={() => setFocusField('')}
                  placeholder="your@email.com"
                  className={`fp-input ${focusField === 'email' ? 'focused' : ''}`}
                  autoComplete="email"
                />
              </div>

              <button type="submit" className="fp-btn" id="fp-send-otp-btn" disabled={loading}>
                {loading
                  ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spinSlow 0.8s linear infinite' }}><circle cx="12" cy="12" r="10" strokeOpacity="0.3"/><path d="M12 2a10 10 0 0110 10"/></svg>
                      Đang gửi...
                    </span>
                  : 'Gửi mã xác nhận'
                }
              </button>

              <div style={{ textAlign: 'center', marginTop: 28 }}>
                <Link to="/login" className="fp-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round"/></svg>
                  Quay lại đăng nhập
                </Link>
              </div>
            </form>
          )}

          {/* ── STEP 2: OTP + New Password ── */}
          {step === 2 && (
            <form onSubmit={handleReset} noValidate key="step2" style={{ animation: 'fpFadeUp 400ms ease both' }}>
              {/* Email badge */}
              <div style={{ background: 'rgba(184,149,106,0.07)', border: '1px solid rgba(184,149,106,0.18)', borderRadius: 4, padding: '14px 18px', marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', margin: '0 0 4px', fontWeight: 600 }}>Mã OTP gửi đến</p>
                  <p style={{ fontSize: 14, color: G, margin: 0, fontWeight: 500 }}>{emailSent}</p>
                </div>
                {countdown > 0
                  ? <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>{fmtTime(countdown)}</span>
                  : <button type="button" onClick={() => { setStep(1); setCountdown(0); }} style={{ background: 'none', border: 'none', color: G, fontSize: 11, cursor: 'pointer', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 600, padding: 0 }}>Gửi lại</button>
                }
              </div>

              {/* OTP input */}
              <div style={{ marginBottom: 22 }}>
                <label className={`fp-label ${focusField === 'otp' ? 'active' : ''}`}>Mã OTP (6 chữ số)</label>
                <input
                  id="fp-otp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  onFocus={() => setFocusField('otp')}
                  onBlur={() => setFocusField('')}
                  placeholder="• • • • • •"
                  className={`fp-input fp-input-otp ${focusField === 'otp' ? 'focused' : ''}`}
                  autoComplete="one-time-code"
                />
              </div>

              {/* New password */}
              <div style={{ marginBottom: 22 }}>
                <label className={`fp-label ${focusField === 'newpass' ? 'active' : ''}`}>Mật khẩu mới</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="fp-newpass"
                    type={showPass ? 'text' : 'password'}
                    value={newPass}
                    onChange={e => setNewPass(e.target.value)}
                    onFocus={() => setFocusField('newpass')}
                    onBlur={() => setFocusField('')}
                    placeholder="Tối thiểu 8 ký tự"
                    className={`fp-input ${focusField === 'newpass' ? 'focused' : ''}`}
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowPass(p => !p)} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', padding: 4, lineHeight: 1, transition: 'color 200ms' }}>
                    <EyeIcon show={showPass} />
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div style={{ marginBottom: 32 }}>
                <label className={`fp-label ${focusField === 'confirm' ? 'active' : ''}`}>Xác nhận mật khẩu mới</label>
                <input
                  id="fp-confirm"
                  type="password"
                  value={confirmPass}
                  onChange={e => setConfirmPass(e.target.value)}
                  onFocus={() => setFocusField('confirm')}
                  onBlur={() => setFocusField('')}
                  placeholder="••••••••"
                  className={`fp-input ${focusField === 'confirm' ? 'focused' : ''}`}
                  style={{ borderColor: confirmPass && confirmPass !== newPass ? '#ef4444' : undefined }}
                  autoComplete="new-password"
                />
                {confirmPass && confirmPass !== newPass && (
                  <p style={{ fontSize: 11, color: '#ef4444', marginTop: 6 }}>Mật khẩu không khớp</p>
                )}
              </div>

              <button type="submit" className="fp-btn" id="fp-reset-btn" disabled={loading}>
                {loading
                  ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spinSlow 0.8s linear infinite' }}><circle cx="12" cy="12" r="10" strokeOpacity="0.3"/><path d="M12 2a10 10 0 0110 10"/></svg>
                      Đang xử lý...
                    </span>
                  : 'Xác nhận đổi mật khẩu'
                }
              </button>

              <div style={{ textAlign: 'center', marginTop: 20 }}>
                <button type="button" onClick={() => { setStep(1); setOtp(''); setNewPass(''); setConfirmPass(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }} className="fp-link">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round"/></svg>
                  Nhập email khác
                </button>
              </div>
            </form>
          )}

          <div style={{ marginTop: 48, textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 24 }}>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)', letterSpacing: '1.5px', textTransform: 'uppercase', margin: '0 0 10px' }}>
              © {new Date().getFullYear()} Asteria Resort. All rights reserved.
            </p>
            <span className="fp-link" style={{ marginRight: 8 }}>Nhớ mật khẩu?</span>
            <Link to="/login" className="fp-link-gold">Đăng nhập ngay</Link>
          </div>
        </div>
      </div>
    </div>
  );
}