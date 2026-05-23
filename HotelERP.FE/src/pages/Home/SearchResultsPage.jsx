import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import bookingApi from '../../api/bookingApi';

const GOLD  = '#b8956a';
const DARK  = '#111111';
const GREEN = '#16a34a';

/* ── helpers ── */
function formatVND(n) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);
}
function formatDateVI(str) {
  return new Date(str).toLocaleDateString('vi-VN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatDateISO(str) {
  return new Date(str).toISOString().split('T')[0];
}

const specStyle = { fontSize: 12, color: '#52525b', display: 'flex', alignItems: 'center', gap: 4 };

/* ── Header ── */
function Header() {
  const navigate = useNavigate();
  return (
    <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, background: DARK, boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => navigate('/')}>
          <div style={{ width: 30, height: 30, border: '1px solid white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Playfair Display', serif", fontSize: 14, color: 'white' }}>A</div>
          <span style={{ color: 'white', fontSize: 12, fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Asteria Resort</span>
        </div>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.7)', padding: '7px 16px', borderRadius: 3, fontSize: 11, cursor: 'pointer', fontWeight: 600, letterSpacing: '1px', transition: 'all 200ms' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = GOLD; e.currentTarget.style.color = GOLD; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}>
          ← Quay lại
        </button>
      </div>
    </header>
  );
}

/* ══════════════════════════════════════════════
   ROOM PICKER MODAL (Cấu trúc B)
   Hiện danh sách phòng vật lý để User chọn 1 cái cụ thể
══════════════════════════════════════════════ */
function RoomPickerModal({ roomType, searchParams, nights, initialSelectedIds, onClose, onConfirm }) {
  const [physicalRooms, setPhysicalRooms] = useState([]);
  const [loadingRooms, setLoadingRooms]   = useState(true);
  const [selectedRoomIds, setSelectedRoomIds] = useState(initialSelectedIds || []);

  React.useEffect(() => {
    setLoadingRooms(true);
    bookingApi.getAvailablePhysicalRooms(
      roomType.id,
      formatDateISO(searchParams.checkIn),
      formatDateISO(searchParams.checkOut)
    ).then(res => {
      setPhysicalRooms(res.data?.data || []);
    }).catch(() => {
      setPhysicalRooms([]);
    }).finally(() => setLoadingRooms(false));
  }, [roomType.id]);

  const handleConfirm = () => {
    const selectedPhysicalRooms = physicalRooms.filter(r => selectedRoomIds.includes(r.id));
    onConfirm(selectedPhysicalRooms);
  };

  const toggleRoom = (id) => {
    setSelectedRoomIds(prev => 
      prev.includes(id) ? prev.filter(rId => rId !== id) : [...prev, id]
    );
  };

  // Group by floor
  const byFloor = physicalRooms.reduce((acc, r) => {
    const f = r.floor ?? 'Khác';
    if (!acc[f]) acc[f] = [];
    acc[f].push(r);
    return acc;
  }, {});
  const floors = Object.keys(byFloor).sort((a, b) => Number(a) - Number(b));

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'white', borderRadius: 12, width: '92%', maxWidth: 560, maxHeight: '86vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(0,0,0,0.3)' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ margin: 0, fontSize: 10, color: GOLD, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Chọn phòng cụ thể</p>
            <h2 style={{ margin: '4px 0 4px', fontSize: 18, color: DARK, fontFamily: "'Playfair Display', serif" }}>{roomType.name}</h2>
            <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>
              {formatDateVI(searchParams.checkIn)} → {formatDateVI(searchParams.checkOut)} · {nights} đêm · {formatVND(roomType.basePrice)}/đêm
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9ca3af', padding: '4px 8px', lineHeight: 1 }}>✕</button>
        </div>

        {/* Room list */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '16px 24px' }}>
          {loadingRooms ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af', fontSize: 13 }}>
              <div style={{ width: 28, height: 28, border: `2px solid ${GOLD}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .7s linear infinite', margin: '0 auto 12px' }} />
              Đang tải danh sách phòng...
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          ) : physicalRooms.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>😔</div>
              <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>Không còn phòng trống trong khoảng thời gian này.</p>
              <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Hãy thử chọn ngày khác.</p>
            </div>
          ) : (
            <>
              <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 14px' }}>
                Có <strong style={{ color: DARK }}>{physicalRooms.length}</strong> phòng trống — chọn phòng bạn muốn:
              </p>
              {floors.map(floor => (
                <div key={floor} style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#9ca3af', margin: '0 0 8px' }}>
                    Tầng {floor}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {byFloor[floor].map(room => {
                      const isSelected = selectedRoomIds.includes(room.id);
                      return (
                        <button key={room.id} onClick={() => toggleRoom(room.id)}
                          style={{
                            padding: '10px 16px', borderRadius: 8, cursor: 'pointer', transition: 'all 200ms',
                            border: isSelected ? `2px solid ${GOLD}` : '2px solid #e5e7eb',
                            background: isSelected ? `${GOLD}15` : 'white',
                            color: isSelected ? GOLD : DARK,
                            fontWeight: isSelected ? 700 : 500,
                            fontSize: 14, minWidth: 72, textAlign: 'center',
                            boxShadow: isSelected ? `0 0 0 3px ${GOLD}20` : 'none',
                          }}>
                          <div style={{ fontSize: 15, marginBottom: 2 }}>🏠</div>
                          <div>P.{room.roomNumber}</div>
                          {isSelected && <div style={{ fontSize: 9, color: GOLD, marginTop: 2, fontWeight: 700 }}>✓ ĐÃ CHỌN</div>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, background: '#fafafa' }}>
          <div>
            {selectedRoomIds.length > 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: DARK }}>
                Đã chọn: <strong style={{ color: GOLD }}>{selectedRoomIds.length} phòng</strong>
              </p>
            ) : (
              <p style={{ margin: 0, fontSize: 13, color: '#9ca3af' }}>Chưa chọn phòng nào</p>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{ padding: '10px 18px', background: 'white', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
              Hủy
            </button>
            <button onClick={handleConfirm}
              style={{
                padding: '10px 22px', background: DARK,
                color: 'white',
                border: 'none', borderRadius: 6, cursor: 'pointer',
                fontSize: 12, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', transition: 'all 200ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = GOLD; }}
              onMouseLeave={e => { e.currentTarget.style.background = DARK; }}>
              Xác nhận chọn phòng →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Room Type Card ── */
function RoomCard({ room, nights, onBook, cartItems = [] }) {
  const [hovered, setHovered] = useState(false);
  const totalPrice = room.basePrice * nights;
  const fallbackImg = 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?q=80&w=800&auto=format&fit=crop';
  const inCart = cartItems.length > 0;

  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ background: 'white', borderRadius: 6, overflow: 'hidden', border: `2px solid ${inCart ? GREEN : hovered ? GOLD : '#e5e7eb'}`, boxShadow: hovered ? '0 12px 36px rgba(184,149,106,0.15)' : '0 2px 8px rgba(0,0,0,0.06)', transition: 'all 280ms ease', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Selected badge */}
      {inCart && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2, background: GREEN, color: 'white', fontSize: 11, fontWeight: 700, padding: '5px 12px', textAlign: 'center', letterSpacing: '.05em' }}>
          ✓ Đã chọn {cartItems.length} phòng: P.{cartItems.map(c => c.roomNumber).join(', P.')}
        </div>
      )}

      {/* Image */}
      <div style={{ height: 200, overflow: 'hidden', position: 'relative', flexShrink: 0, marginTop: inCart ? 28 : 0 }}>
        <img src={room.imageUrl || fallbackImg} alt={room.name} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 500ms ease', transform: hovered ? 'scale(1.06)' : 'scale(1)' }} />
        {!inCart && (
          <div style={{ position: 'absolute', top: 12, right: 12, background: GREEN, color: 'white', fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 2, letterSpacing: '.1em' }}>
            {room.availableCount} phòng trống
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: '#18181b', margin: '0 0 6px' }}>{room.name}</h3>
        <div style={{ display: 'flex', gap: 14, marginBottom: 10, flexWrap: 'wrap' }}>
          {room.sizeSqm && <span style={specStyle}>📐 {room.sizeSqm} m²</span>}
          {room.bedType  && <span style={specStyle}>🛏 {room.bedType}</span>}
          <span style={specStyle}>👥 {room.capacityAdults} người lớn{room.capacityChildren > 0 ? `, ${room.capacityChildren} trẻ em` : ''}</span>
        </div>
        {room.description && (
          <p style={{ fontSize: 13, color: '#71717a', lineHeight: 1.7, margin: '0 0 12px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{room.description}</p>
        )}

        {/* Price + CTA */}
        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
          <div>
            <p style={{ fontSize: 10, color: '#a1a1aa', margin: 0, letterSpacing: '.1em', textTransform: 'uppercase' }}>Giá / đêm</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: GOLD, margin: '2px 0 0', fontFamily: "'Playfair Display', serif" }}>{formatVND(room.basePrice)}</p>
            {nights > 1 && <p style={{ fontSize: 11, color: '#71717a', margin: '2px 0 0' }}>Tổng {nights} đêm: {formatVND(totalPrice)}</p>}
          </div>
          <button onClick={() => onBook(room)}
            style={{ padding: '11px 22px', background: inCart ? '#15803d' : DARK, color: 'white', border: 'none', borderRadius: 3, fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', cursor: 'pointer', transition: 'background 200ms', whiteSpace: 'nowrap' }}
            onMouseEnter={e => e.currentTarget.style.background = GOLD}
            onMouseLeave={e => e.currentTarget.style.background = inCart ? '#15803d' : DARK}>
            {inCart ? 'Sửa chọn phòng ↺' : 'Chọn phòng →'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════
   SEARCH RESULTS PAGE
════════════════════════════════════════════= */
/* ── Cart Bar (sticky bottom) ── */
function CartBar({ cart, nights, onRemove, onCheckout }) {
  const total = cart.reduce((sum, c) => sum + c.basePrice * nights, 0);
  if (cart.length === 0) return null;
  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200, background: DARK, borderTop: `3px solid ${GOLD}`, boxShadow: '0 -8px 32px rgba(0,0,0,0.35)', padding: '14px clamp(16px,4vw,48px)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{ width: 24, height: 24, background: GOLD, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'white', fontWeight: 700 }}>{cart.length}</div>
          <span style={{ fontSize: 13, color: 'white', fontWeight: 600 }}>Phòng đã chọn</span>
        </div>

        {/* Cart items */}
        <div style={{ display: 'flex', gap: 8, flex: 1, flexWrap: 'wrap', minWidth: 0 }}>
          {cart.map(item => (
            <div key={item.roomId} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 6, padding: '5px 10px', fontSize: 12, color: 'white' }}>
              <span style={{ color: GOLD, fontWeight: 600 }}>P.{item.roomNumber}</span>
              <span style={{ color: 'rgba(255,255,255,0.6)' }}>{item.roomName} · {item.floor ? `Tầng ${item.floor}` : ''}</span>
              <button onClick={() => onRemove(item.roomId)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 14, padding: '0 2px', lineHeight: 1 }}>✕</button>
            </div>
          ))}
        </div>

        {/* Total + Checkout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '.1em' }}>Tổng {nights} đêm</p>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: GOLD, fontFamily: "'Playfair Display',serif" }}>{new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND',maximumFractionDigits:0}).format(total)}</p>
          </div>
          <button onClick={onCheckout}
            style={{ padding: '12px 28px', background: GOLD, color: 'white', border: 'none', borderRadius: 4, fontSize: 12, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background 200ms' }}
            onMouseEnter={e => e.currentTarget.style.background = '#9a7b52'}
            onMouseLeave={e => e.currentTarget.style.background = GOLD}>
            Đặt phòng ({cart.length}) →
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SearchResultsPage() {
  const { state }  = useLocation();
  const navigate   = useNavigate();

  const searchParams   = state?.searchParams   ?? null;
  const availableRooms = state?.availableRooms ?? [];
  const nights         = searchParams?.nights  ?? 1;

  const [pickerRoom, setPickerRoom] = useState(null);
  // Cart: [{ roomTypeId, roomName, basePrice, roomId, roomNumber, floor }]
  const [cart, setCart] = useState([]);

  const handleOpenPicker = (roomType) => setPickerRoom(roomType);

  const handleRoomConfirmed = (selectedPhysicalRooms) => {
    setCart(prev => {
      // Bỏ tất cả các phòng cũ thuộc hạng này
      const filtered = prev.filter(c => c.roomTypeId !== pickerRoom.id);
      
      // Thêm danh sách phòng mới chọn
      const newItems = selectedPhysicalRooms.map(physicalRoom => ({
        roomTypeId: pickerRoom.id,
        roomName:   pickerRoom.name,
        basePrice:  pickerRoom.basePrice,
        roomId:     physicalRoom.id,
        roomNumber: physicalRoom.roomNumber,
        floor:      physicalRoom.floor,
      }));
      
      return [...filtered, ...newItems];
    });
    setPickerRoom(null);
  };

  const handleRemoveFromCart = (roomId) => {
    setCart(prev => prev.filter(c => c.roomId !== roomId));
  };

  const handleCheckout = () => {
    navigate('/booking/new', {
      state: {
        // Multi-cart checkout
        cartItems: cart,
        // Backward-compat cho booking page single-room
        roomTypeId:  cart[0]?.roomTypeId,
        roomName:    cart.length === 1 ? cart[0].roomName : `${cart.length} phòng`,
        basePrice:   cart.reduce((s, c) => s + c.basePrice, 0),
        selectedRoomId:     cart.length === 1 ? cart[0].roomId     : null,
        selectedRoomNumber: cart.length === 1 ? cart[0].roomNumber : null,
        selectedFloor:      cart.length === 1 ? cart[0].floor      : null,
        ...searchParams,
      },
    });
  };

  return (
    <div style={{ background: '#f5f5f4', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      <Header />

      {/* Hero bar */}
      <div style={{ background: DARK, paddingTop: 60 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px 24px' }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.3em', textTransform: 'uppercase', color: GOLD, margin: '0 0 8px' }}>KẾT QUẢ TÌM KIẾM</p>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, color: 'white', margin: 0 }}>Phòng trống tại Asteria Resort</h1>
          {searchParams && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, marginTop: 16, fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>
              <span>📅 {formatDateVI(searchParams.checkIn)} → {formatDateVI(searchParams.checkOut)} ({nights} đêm)</span>
              <span>👥 {searchParams.adults} người lớn{searchParams.children > 0 ? `, ${searchParams.children} trẻ em` : ''}</span>
              <span>🏨 {searchParams.rooms} phòng</span>
              <button onClick={() => navigate(-1)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.65)', padding: '4px 12px', borderRadius: 2, fontSize: 10, fontWeight: 700, letterSpacing: '1px', cursor: 'pointer', textTransform: 'uppercase' }}>
                Thay đổi
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px 64px' }}>
        {!state ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <p style={{ fontSize: 16, color: '#71717a' }}>Không có dữ liệu tìm kiếm.</p>
            <button onClick={() => navigate('/')} style={{ marginTop: 16, padding: '10px 24px', background: DARK, color: 'white', border: 'none', borderRadius: 3, fontSize: 12, fontWeight: 700, letterSpacing: '1px', cursor: 'pointer' }}>Về Trang Chủ</button>
          </div>
        ) : availableRooms.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🏨</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, color: '#18181b', marginBottom: 8 }}>Không có phòng phù hợp</h2>
            <p style={{ color: '#71717a', fontSize: 14, marginBottom: 24 }}>Rất tiếc, không còn phòng trống trong khoảng thời gian bạn chọn.</p>
            <button onClick={() => navigate(-1)} style={{ padding: '11px 28px', background: DARK, color: 'white', border: 'none', borderRadius: 3, fontSize: 11, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', cursor: 'pointer' }}>Tìm Lại</button>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 13, color: '#71717a', marginBottom: 24 }}>Tìm thấy <strong style={{ color: '#18181b' }}>{availableRooms.length}</strong> loại phòng phù hợp</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 24, paddingBottom: cart.length > 0 ? 80 : 0 }}>
              {availableRooms.map(room => (
                <RoomCard
                  key={room.id}
                  room={room}
                  nights={nights}
                  onBook={handleOpenPicker}
                  cartItems={cart.filter(c => c.roomTypeId === room.id)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Room Picker Modal */}
      {pickerRoom && (
        <RoomPickerModal
          roomType={pickerRoom}
          searchParams={searchParams}
          nights={nights}
          initialSelectedIds={cart.filter(c => c.roomTypeId === pickerRoom.id).map(c => c.roomId)}
          onClose={() => setPickerRoom(null)}
          onConfirm={handleRoomConfirmed}
        />
      )}

      {/* Sticky Cart Bar */}
      <CartBar
        cart={cart}
        nights={nights}
        onRemove={handleRemoveFromCart}
        onCheckout={handleCheckout}
      />
    </div>
  );
}
