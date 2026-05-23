import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { message } from 'antd';
import voucherApi from '../../api/voucherApi';
import RoomSearchWidget from '../RoomSearch/RoomSearchWidget';

const G = '#b8956a';
const SF = { fontFamily: "'Playfair Display',serif" };

export default function FloatingSidebar() {
  const nav = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuthStore();
  const [bookOpen, setBookOpen] = useState(false);
  const [vouchers, setVouchers] = useState([]);

  // Ẩn trên các trang admin và auth
  const hiddenPaths = ['/admin', '/login', '/register', '/forgot-password'];
  const shouldHide = hiddenPaths.some(p => location.pathname.startsWith(p));

  useEffect(() => {
    voucherApi.getAll().then(r => {
      const vList = Array.isArray(r) ? r : (r?.data || []);
      setVouchers(vList.filter(v => v.isActive !== false).slice(0, 10));
    }).catch(() => {});
  }, []);

  // Xử lý mở/đóng modal tìm phòng dựa trên chuyển trang và custom event
  useEffect(() => {
    if (location.state?.openBooking) {
      setBookOpen(true);
      // Xóa state để tránh mở lại khi reload/back
      nav(location.pathname, { replace: true, state: { ...location.state, openBooking: false } });
    } else {
      setBookOpen(false);
    }
  }, [location.pathname]);

  useEffect(() => {
    const handleOpen = () => setBookOpen(true);
    window.addEventListener('open-booking-widget', handleOpen);
    return () => window.removeEventListener('open-booking-widget', handleOpen);
  }, []);

  if (shouldHide) return null;

  return (
    <>
      {/* ── FLOATING SIDEBAR TOOLBAR ── */}
      <style>{`
        .sidebar-pill-item { position: relative; width: 100%; }
        .sidebar-pill-item .sidebar-tooltip {
          position: absolute; right: calc(100% + 15px); top: 50%; transform: translateY(-50%);
          background: #b8956a; color: white; padding: 6px 12px; border-radius: 4px;
          font-size: 11px; font-weight: 600; white-space: nowrap;
          opacity: 0; pointer-events: none; transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
          transform: translateY(-50%) translateX(10px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.25);
          letter-spacing: 0.5px;
        }
        .sidebar-pill-item .sidebar-tooltip::after {
          content: ''; position: absolute; right: -4px; top: 50%; transform: translateY(-50%);
          border: 4px solid transparent; border-left-color: #b8956a;
        }
        .sidebar-pill-item:hover .sidebar-tooltip { opacity: 1; transform: translateY(-50%) translateX(0); }
        
        .sidebar-pill-btn {
          width: 46px; height: 46px; display: flex; align-items: center; justify-content: center;
          background: none; border: none; cursor: pointer;
          color: #b8956a; transition: all 300ms ease;
          position: relative;
        }
        .sidebar-pill-btn:hover { color: #ffffff; background: rgba(184, 149, 106, 0.2); }
        .sidebar-pill-btn svg { transition: transform 300ms ease; }
        .sidebar-pill-btn:hover svg { transform: scale(1.15); }

        @keyframes backdropIn{from{opacity:0}to{opacity:1}}
        @keyframes modalIn{from{opacity:0;transform:scale(0.93) translateY(12px)}to{opacity:1;transform:scale(1) translateY(0)}}
      `}</style>

      {/* Main Sidebar Tooltip container */}
      <div style={{
        position: 'fixed', right: 20, top: '50%', transform: 'translateY(-50%)', zIndex: 9998,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        background: 'rgba(10, 10, 10, 0.95)', 
        borderRadius: 32,
        border: '1px solid rgba(184, 149, 106, 0.3)',
        boxShadow: '0 10px 40px rgba(0,0,0,0.5), 0 0 20px rgba(184, 149, 106, 0.1)',
        backdropFilter: 'blur(20px)',
        overflow: 'hidden', width: 46,
      }}>
        {[
          {
            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-1.5-1.5L12 5l-1.5-1.5L9 5 7.5 3.5 6 5v14l1.5-1.5L9 19l1.5-1.5L12 19l1.5-1.5L15 19l1.5-1.5L18 19V5l-1.5-1.5L15 5z"/><path d="M12 11h.01"/><path d="M12 15h.01"/><path d="M8 11h.01"/><path d="M8 15h.01"/><path d="M16 11h.01"/><path d="M16 15h.01"/></svg>,
            label: 'Vouchers & Điểm thưởng',
            action: () => {
              if (location.pathname === '/profile') {
                window.dispatchEvent(new CustomEvent('profile-tab-change', { detail: 'vouchers' }));
              } else {
                nav('/profile?tab=vouchers');
              }
            }
          },
          {
            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
            label: 'Hồ sơ cá nhân',
            action: () => {
              if (location.pathname === '/profile') {
                window.dispatchEvent(new CustomEvent('profile-tab-change', { detail: 'profile' }));
              } else {
                nav('/profile');
              }
            }
          },
          {
            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
            label: 'Lịch sử đặt phòng',
            action: () => {
              if (location.pathname === '/profile') {
                window.dispatchEvent(new CustomEvent('profile-tab-change', { detail: 'bookings' }));
              } else {
                nav('/profile?tab=bookings');
              }
            }
          },
          {
            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>,
            label: 'Dịch vụ của tôi',
            action: () => {
              if (location.pathname === '/profile') {
                window.dispatchEvent(new CustomEvent('profile-tab-change', { detail: 'services' }));
              } else {
                nav('/profile?tab=services');
              }
            }
          },
          {
            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>,
            label: 'Lên đầu trang',
            action: () => window.scrollTo({ top: 0, behavior: 'smooth' })
          }
        ].map((item, i, arr) => (
          <div key={i} className="sidebar-pill-item" style={{ borderBottom: i < arr.length - 1 ? '1px solid rgba(184, 149, 106, 0.1)' : 'none' }}>
            <button onClick={item.action} className="sidebar-pill-btn">
              {item.icon}
            </button>
            <span className="sidebar-tooltip">{item.label}</span>
          </div>
        ))}
      </div>

      {/* ── GLOBAL BOOK FAB ── */}
      <div style={{ position: 'fixed', bottom: 32, right: 32, zIndex: 9999 }}>
        <button
          onClick={() => setBookOpen(!bookOpen)}
          style={{
            width: 72, height: 72, borderRadius: '50%', border: 'none', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
            background: bookOpen ? '#3f3f46' : 'linear-gradient(135deg,#c9a97a,#9a7b52)',
            color: 'white',
            boxShadow: bookOpen ? 'none' : '0 12px 36px rgba(184,149,106,0.4)',
            transform: 'scale(1)',
            transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08) translateY(-4px)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}>
          {bookOpen
            ? <span style={{ fontSize: 24, lineHeight: 1 }}>✕</span>
            : (<>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: -2 }}>
                <path d="M12 2C8.13 2 5 5.13 5 9C5 11.47 6.29 13.63 8.24 14.85V22L12 20L15.76 22V14.85C17.71 13.63 19 11.47 19 9C19 5.13 15.87 2 12 2ZM12 11C10.9 11 10 10.1 10 9C10 7.9 10.9 7 12 7C13.1 7 14 7.9 14 9C14 10.1 13.1 11 12 11Z" fill="white" />
                <path d="M12 4C9.24 4 7 6.24 7 9C7 10.85 8.01 12.45 9.5 13.31V19.24L12 17.9L14.5 19.24V13.31C15.99 12.45 17 10.85 17 9C17 6.24 14.76 4 12 4ZM12 10C11.45 10 11 9.55 11 9C11 8.45 11.45 8 12 8C12.55 8 13 8.45 13 9C13 9.55 12.55 10 12 10Z" fill="rgba(255,255,255,0.4)" />
              </svg>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginTop: 2 }}>Book</span>
            </>)
          }
        </button>
      </div>

      {/* ── MODAL OVERLAY ── */}
      {bookOpen && (
        <div
          onClick={() => setBookOpen(false)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9998,
            animation: 'backdropIn 300ms ease',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            className="book-modal-inner"
            onClick={e => e.stopPropagation()}
            style={{
              width: 420,
              maxHeight: '90dvh',
              animation: 'modalIn 400ms cubic-bezier(0.34,1.56,0.64,1)',
              borderRadius: 16,
              overflow: 'hidden',
              boxShadow: '0 30px 90px rgba(0,0,0,0.45)',
            }}
          >
            <RoomSearchWidget onClose={() => setBookOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
