import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchRooms } from '../../api/roomSearchApi';

/* ─────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────── */
const GOLD = '#b8956a';
const DARK = '#111111';

const MONTH_VI = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6',
                  'Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];
const DOW_VI   = ['CN','T2','T3','T4','T5','T6','T7'];

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function startOfDay(d) {
  const x = new Date(d); x.setHours(0,0,0,0); return x;
}
function isSameDay(a, b) {
  return a && b && startOfDay(a).getTime() === startOfDay(b).getTime();
}
function isBefore(a, b) {
  return startOfDay(a) < startOfDay(b);
}
function isBetween(d, a, b) {
  const sd = startOfDay(d).getTime();
  return sd > startOfDay(a).getTime() && sd < startOfDay(b).getTime();
}
function formatVN(date) {
  if (!date) return '—';
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfWeek(year, month) {
  return new Date(year, month, 1).getDay(); // 0 = Sun
}

/* ─────────────────────────────────────────────
   MINI CALENDAR
───────────────────────────────────────────── */
function Calendar({ viewYear, viewMonth, checkIn, checkOut, hovered, onSelectDate, onHover, onPrevMonth, onNextMonth }) {
  const today = startOfDay(new Date());
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDow    = getFirstDayOfWeek(viewYear, viewMonth);

  const cells = [];
  // Empty cells before first day
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div style={{ width: 280, fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button onClick={onPrevMonth} style={navBtnStyle}>‹</button>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#18181b', letterSpacing: '.02em' }}>
          {MONTH_VI[viewMonth]} {viewYear}
        </span>
        <button onClick={onNextMonth} style={navBtnStyle}>›</button>
      </div>

      {/* Day-of-week header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
        {DOW_VI.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#a1a1aa', padding: '4px 0', letterSpacing: '.05em' }}>{d}</div>
        ))}
      </div>

      {/* Date cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
        {cells.map((day, idx) => {
          if (!day) return <div key={`e-${idx}`} />;
          const date     = new Date(viewYear, viewMonth, day);
          const isPast   = isBefore(date, today);
          const isCI     = isSameDay(date, checkIn);
          const isCO     = isSameDay(date, checkOut);
          const isRange  = checkIn && (checkOut || hovered) && isBetween(date, checkIn, checkOut || hovered);
          const isEdge   = isCI || isCO;
          const isHov    = isSameDay(date, hovered) && !checkOut;

          let bg = 'transparent', color = '#18181b', borderRadius = '50%';
          if (isEdge)   { bg = DARK; color = 'white'; }
          else if (isHov) { bg = '#e5e7eb'; }
          else if (isRange) { bg = '#f3ede6'; borderRadius = '0'; }

          const isRangeStart = isCI && (checkOut || hovered);
          const isRangeEnd   = isCO;

          return (
            <div
              key={day}
              onClick={() => !isPast && onSelectDate(date)}
              onMouseEnter={() => !isPast && onHover(date)}
              onMouseLeave={() => onHover(null)}
              style={{
                textAlign: 'center', padding: '6px 0', cursor: isPast ? 'default' : 'pointer',
                position: 'relative',
                background: isRange ? '#f3ede6' : (isRangeStart || isRangeEnd ? (isRange ? '#f3ede6' : 'transparent') : 'transparent'),
                borderRadius: isRangeStart ? '50% 0 0 50%' : isRangeEnd ? '0 50% 50% 0' : (isRange ? '0' : '0'),
              }}
            >
              {/* Circle for selected / hovered */}
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 32, height: 32, borderRadius: '50%',
                background: bg, color,
                fontSize: 12, fontWeight: isEdge ? 600 : 400,
                opacity: isPast ? 0.3 : 1,
                transition: 'background 150ms, color 150ms',
              }}>
                {day}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const navBtnStyle = {
  background: 'none', border: '1px solid #e5e7eb', borderRadius: 4,
  width: 28, height: 28, cursor: 'pointer', fontSize: 16, color: '#71717a',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'border-color 150ms, color 150ms',
};

/* ─────────────────────────────────────────────
   COUNTER ROW
───────────────────────────────────────────── */
function CounterRow({ label, value, min, max, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f4f4f5' }}>
      <span style={{ fontSize: 13, color: '#18181b', fontWeight: 500 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          style={{
            width: 30, height: 30, borderRadius: '50%', border: '1px solid',
            borderColor: value <= min ? '#e5e7eb' : '#b8956a',
            background: 'transparent', cursor: value <= min ? 'default' : 'pointer',
            color: value <= min ? '#d4d4d8' : GOLD, fontSize: 18, lineHeight: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 150ms',
          }}
        >−</button>
        <span style={{ fontSize: 15, fontWeight: 600, color: '#18181b', minWidth: 20, textAlign: 'center' }}>{value}</span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          style={{
            width: 30, height: 30, borderRadius: '50%', border: '1px solid',
            borderColor: value >= max ? '#e5e7eb' : '#b8956a',
            background: 'transparent', cursor: value >= max ? 'default' : 'pointer',
            color: value >= max ? '#d4d4d8' : GOLD, fontSize: 18, lineHeight: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 150ms',
          }}
        >+</button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function RoomSearchWidget({ onClose }) {
  const today = startOfDay(new Date());

  // Date state
  const [checkIn,  setCheckIn]  = useState(null);
  const [checkOut, setCheckOut] = useState(null);
  const [picking,  setPicking]  = useState('in'); // 'in' | 'out' | null
  const [hovered,  setHovered]  = useState(null);
  const [calOpen,  setCalOpen]  = useState(false);
  const calRef = useRef(null);

  // Calendar navigation
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  // Guest state
  const [guestOpen, setGuestOpen] = useState(false);
  const [adults,    setAdults]    = useState(2);
  const [children,  setChildren]  = useState(0);
  const [rooms,     setRooms]     = useState(1);
  const guestRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (calRef.current && !calRef.current.contains(e.target)) setCalOpen(false);
      if (guestRef.current && !guestRef.current.contains(e.target)) setGuestOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const handleSelectDate = (date) => {
    if (picking === 'in') {
      setCheckIn(date);
      setCheckOut(null);
      setPicking('out');
    } else {
      if (checkIn && isBefore(date, checkIn)) {
        // If selected before checkIn, reset
        setCheckIn(date);
        setCheckOut(null);
        setPicking('out');
      } else {
        setCheckOut(date);
        setPicking(null);
        setCalOpen(false);
      }
    }
  };

  const openCal = (mode) => {
    setPicking(mode);
    setCalOpen(true);
    setGuestOpen(false);
  };

  const dateLabel = () => {
    if (!checkIn && !checkOut) return <span style={{ color: '#a1a1aa' }}>Chọn ngày nhận và trả phòng</span>;
    return (
      <span style={{ color: '#18181b', fontWeight: 500 }}>
        {formatVN(checkIn)} &nbsp;→&nbsp; {checkOut ? formatVN(checkOut) : <em style={{ color: '#a1a1aa', fontStyle: 'normal' }}>Chọn ngày trả</em>}
      </span>
    );
  };

  const guestLabel = `${adults} Người lớn, ${children} Trẻ em, ${rooms} Phòng`;

  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const navigate = useNavigate();

  const handleSearch = async () => {
    if (!checkIn || !checkOut) {
      setSearchError('Vui lòng chọn ngày nhận và trả phòng.');
      return;
    }
    setSearchError(null);
    setSearching(true);
    try {
      const fmt = (d) => d.toLocaleDateString('en-CA'); // YYYY-MM-DD
      const result = await searchRooms({
        checkIn:  fmt(checkIn),
        checkOut: fmt(checkOut),
        adults,
        children,
        rooms,
      });
      if (onClose) onClose();
      navigate('/rooms/search-results', { state: result });
    } catch (err) {
      const msg = err?.response?.data?.message || 'Đã xảy ra lỗi khi tìm kiếm. Vui lòng thử lại.';
      setSearchError(msg);
    } finally {
      setSearching(false);
    }
  };

  /* ── render ── */
  return (
    <div style={{ width: 420, background: 'white', borderRadius: 0, overflow: 'hidden', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ background: DARK, padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontFamily: "'Playfair Display', serif", color: GOLD, fontSize: 20, margin: 0, letterSpacing: '.05em' }}>Tìm kiếm phòng</h3>
        {onClose && (
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.5)', fontSize: 18, lineHeight: 1, padding: 0, transition: 'color 150ms' }}
            onMouseEnter={e => e.target.style.color = 'white'} onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,.5)'}>✕</button>
        )}
      </div>

      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* ── DATE PICKER FIELD ── */}
        <div ref={calRef} style={{ position: 'relative' }}>
          <div
            onClick={() => openCal(picking === null ? 'in' : picking)}
            style={{
              border: `1px solid ${calOpen ? GOLD : '#e5e7eb'}`, borderRadius: 4,
              padding: '11px 14px', cursor: 'pointer', transition: 'border-color 200ms',
            }}
          >
            <label style={labelStyle}>Nhận phòng — Trả phòng</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <span style={{ fontSize: 13 }}>{dateLabel()}</span>
            </div>
            {/* Check-in / Check-out tab hints */}
            {calOpen && (
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                {['Ngày nhận phòng', 'Ngày trả phòng'].map((lbl, i) => {
                  const active = (i === 0 && picking === 'in') || (i === 1 && picking === 'out');
                  return (
                    <button key={lbl}
                      onClick={e => { e.stopPropagation(); setPicking(i === 0 ? 'in' : 'out'); }}
                      style={{
                        flex: 1, padding: '5px', fontSize: 10, fontWeight: 700, letterSpacing: '.1em',
                        textTransform: 'uppercase', border: `1px solid ${active ? GOLD : '#e5e7eb'}`,
                        borderRadius: 3, background: active ? '#fdf8f3' : 'transparent',
                        color: active ? GOLD : '#a1a1aa', cursor: 'pointer', transition: 'all 150ms',
                      }}>
                      {lbl}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Calendar panel - inline, no absolute positioning */}
          {calOpen && (
            <div style={{
              marginTop: 8,
              background: 'white', border: '1px solid #e5e7eb', borderRadius: 6,
              padding: '16px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              animation: 'fadeSlideDown 200ms ease',
            }}>
              <style>{`@keyframes fadeSlideDown{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}`}</style>
              <Calendar
                viewYear={viewYear} viewMonth={viewMonth}
                checkIn={checkIn} checkOut={checkOut} hovered={hovered}
                onSelectDate={handleSelectDate}
                onHover={setHovered}
                onPrevMonth={prevMonth} onNextMonth={nextMonth}
              />
              {(checkIn || checkOut) && (
                <button
                  onClick={() => { setCheckIn(null); setCheckOut(null); setPicking('in'); }}
                  style={{ marginTop: 10, width: '100%', fontSize: 11, fontWeight: 600, color: '#71717a', background: 'none', border: '1px solid #e5e7eb', borderRadius: 3, padding: '5px', cursor: 'pointer', letterSpacing: '.05em' }}
                >
                  Xóa lựa chọn
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── GUEST & ROOM FIELD ── */}
        <div ref={guestRef} style={{ position: 'relative' }}>
          <div
            onClick={() => { setGuestOpen(v => !v); setCalOpen(false); }}
            style={{
              border: `1px solid ${guestOpen ? GOLD : '#e5e7eb'}`, borderRadius: 4,
              padding: '11px 14px', cursor: 'pointer', transition: 'border-color 200ms',
            }}
          >
            <label style={labelStyle}>Khách & Phòng</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <span style={{ fontSize: 13, color: '#18181b', fontWeight: 500 }}>{guestLabel}</span>
            </div>
          </div>

          {/* Guest panel - inline */}
          {guestOpen && (
            <div style={{
              marginTop: 8,
              background: 'white', border: '1px solid #e5e7eb', borderRadius: 6,
              padding: '8px 20px 4px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              animation: 'fadeSlideDown 200ms ease',
            }}>
              <CounterRow label="Người lớn"  value={adults}   min={1} max={10} onChange={setAdults} />
              <CounterRow label="Trẻ em"     value={children} min={0} max={10} onChange={setChildren} />
              <CounterRow label="Phòng"      value={rooms}    min={1} max={5}  onChange={setRooms} />
              <button
                onClick={() => setGuestOpen(false)}
                style={{
                  width: '100%', margin: '12px 0', padding: '9px',
                  background: DARK, color: 'white', border: 'none', borderRadius: 3,
                  fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase',
                  cursor: 'pointer', transition: 'background 150ms',
                }}
                onMouseEnter={e => e.target.style.background = '#333'}
                onMouseLeave={e => e.target.style.background = DARK}
              >
                Áp dụng
              </button>
            </div>
          )}
        </div>

        {/* ── ERROR MESSAGE ── */}
        {searchError && (
          <div style={{
            padding: '10px 12px', background: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: 4, fontSize: 12, color: '#dc2626', lineHeight: 1.5,
          }}>
            ⚠️ {searchError}
          </div>
        )}

        {/* ── SEARCH BUTTON ── */}
        <button
          onClick={handleSearch}
          disabled={searching}
          style={{
            width: '100%', padding: '13px', color: 'white',
            background: searching ? '#555' : DARK,
            border: 'none', borderRadius: 4, fontSize: 11, fontWeight: 700,
            letterSpacing: '2px', textTransform: 'uppercase',
            cursor: searching ? 'not-allowed' : 'pointer',
            transition: 'background 200ms', marginTop: 2,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
          onMouseEnter={e => { if (!searching) e.currentTarget.style.background = '#222'; }}
          onMouseLeave={e => { if (!searching) e.currentTarget.style.background = DARK; }}
        >
          {searching ? (
            <>
              <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 600ms linear infinite' }} />
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              ĐANG TÌM...
            </>
          ) : 'TÌM KIẾM'}
        </button>
      </div>
    </div>
  );
}

const labelStyle = {
  display: 'block', fontSize: 9, fontWeight: 700,
  letterSpacing: '.25em', textTransform: 'uppercase', color: '#71717a',
};
