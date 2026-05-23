import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Form, Input, Button, message, Divider, Space, Tag, Modal, Alert } from 'antd';
import { ArrowLeftOutlined, CheckCircleOutlined, InfoCircleOutlined, TagOutlined, CloseCircleOutlined, GiftOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../store/authStore';
import bookingApi from '../../api/bookingApi';

const GOLD = '#b8956a';
const DARK = '#111111';

/* ── Simple shared header ── */
function Header() {
  const navigate = useNavigate();
  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      background: DARK, boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
    }}>
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

function formatVND(n) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);
}

function formatDateVI(str) {
  if (!str) return '—';
  const d = new Date(str);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Custom Premium Input Style - Cập nhật cho Dark Mode
const premiumInputStyle = {
  borderRadius: '8px',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  padding: '12px 16px',
  fontSize: '15px',
  transition: 'all 0.3s ease',
  background: 'rgba(255, 255, 255, 0.05)',
  color: '#ffffff', // Chữ trắng
  boxShadow: 'none',
};

const premiumInputHoverStyle = `
  .premium-input:focus, .premium-input:hover {
    border-color: ${GOLD} !important;
    background: rgba(184, 149, 106, 0.05) !important;
    box-shadow: 0 0 0 2px rgba(184, 149, 106, 0.1) !important;
  }
  .premium-input::placeholder {
    color: rgba(255, 255, 255, 0.3) !important;
  }
  @keyframes birthday-float {
    0%, 100% { transform: translateY(0px) rotate(-2deg); }
    50%       { transform: translateY(-6px) rotate(2deg); }
  }
  @keyframes birthday-glow {
    0%, 100% { box-shadow: 0 0 20px rgba(255,200,80,0.3), 0 4px 24px rgba(0,0,0,0.4); }
    50%       { box-shadow: 0 0 40px rgba(255,200,80,0.55), 0 4px 24px rgba(0,0,0,0.4); }
  }
  .deposit-option {
    cursor: pointer;
    border: 2px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    padding: 14px 18px;
    transition: all 200ms;
    background: rgba(255,255,255,0.03);
  }
  .deposit-option:hover {
    border-color: rgba(184,149,106,0.5);
    background: rgba(184,149,106,0.06);
  }
  .deposit-option.selected {
    border-color: #b8956a;
    background: rgba(184,149,106,0.1);
  }
`;

export default function GuestBookingPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  // Auth
  const { user, isAuthenticated } = useAuthStore();

  const [loading, setLoading] = useState(false);
  const [successCode, setSuccessCode] = useState(null);

  // Voucher state
  const [voucherCode, setVoucherCode] = useState('');
  const [validatingVoucher, setValidatingVoucher] = useState(false);
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);

  // Birthday voucher state (single modal)
  const [birthdayVoucher, setBirthdayVoucher] = useState(null);
  const [showBirthdayModal, setShowBirthdayModal] = useState(false);

  // Birthday voucher list (banner / inline section)
  const [birthdayVouchers, setBirthdayVouchers] = useState([]);
  const [loadingBirthdayVouchers, setLoadingBirthdayVouchers] = useState(false);

  // Deposit state
  const [depositMethod, setDepositMethod] = useState('RESORT'); // 'TRANSFER' hoặc 'RESORT'
  const [transferRef, setTransferRef] = useState('');

  // Fallback if no state
  if (!state) {
    return (
      <div style={{ padding: '100px 20px', textAlign: 'center', color: 'white' }}>
        <p>Không có thông tin phòng. Vui lòng quay lại tìm kiếm.</p>
        <Button onClick={() => navigate('/', { state: { openBooking: true } })}>Quay lại tìm kiếm</Button>
      </div>
    );
  }


  const {
    roomTypeId, roomName, basePrice,
    checkIn, checkOut, adults, children, rooms, nights,
    selectedRoomId = null, selectedRoomNumber = null, selectedFloor = null,
    cartItems = null,
  } = state;

  const resolvedCart = cartItems ?? (roomTypeId ? [{
    roomTypeId, roomName, basePrice,
    roomId: selectedRoomId, roomNumber: selectedRoomNumber, floor: selectedFloor,
  }] : []);

  const subtotal = resolvedCart.reduce((s, c) => s + (c.basePrice ?? 0) * (nights ?? 1), 0);
  
  // NEW: Membership Discount
  const memDiscountPercent = user?.membershipDiscount ?? 0;
  const memDiscountAmount = Math.round(subtotal * (memDiscountPercent / 100));
  
  const totalPrice = subtotal - memDiscountAmount - discountAmount;

  // ── Birthday voucher: tự động kiểm tra khi trang load (chỉ khi đăng nhập) ──
  useEffect(() => {
    if (!isAuthenticated) return;
    bookingApi.getBirthdayVoucher()
      .then(res => {
        const voucher = res?.data?.data ?? res?.data ?? null;
        if (voucher && voucher.status === 'ACTIVE') {
          setBirthdayVoucher(voucher);
          setShowBirthdayModal(true);   // Hiện popup ngay khi phát hiện sinh nhật
        }
      })
      .catch(() => { /* Im lặng nếu lỗi — không block flow chính */ });
  }, [isAuthenticated]);

  // Áp dụng một voucher object bất kỳ (dùng chung cho modal & inline list)
  const applyVoucherObject = (voucher) => {
    if (!voucher) return;
    const code = voucher.code || voucher.Code;
    const discountType = voucher.discountType || voucher.DiscountType || 'FIXED_AMOUNT';
    const discountValue = voucher.discountValue || voucher.DiscountValue || 0;

    setAppliedVoucher({ ...voucher, code });
    setVoucherCode(code);

    let discount = 0;
    if (discountType === 'PERCENT') {
      discount = subtotal * (discountValue / 100);
    } else {
      discount = discountValue;
    }
    if (discount > subtotal) discount = subtotal;
    setDiscountAmount(discount);
    setShowBirthdayModal(false);
    message.success(`🎁 Voucher ${code} đã được áp dụng! Giảm ${formatVND(discount)}`);
  };

  // Áp dụng voucher sinh nhật trực tiếp từ Modal
  const applyBirthdayVoucher = () => {
    if (!birthdayVoucher) return;
    applyVoucherObject(birthdayVoucher);
  };

  const handleApplyVoucher = async () => {
    if (!voucherCode.trim()) {
      message.warning('Vui lòng nhập mã voucher');
      return;
    }
    setValidatingVoucher(true);
    try {
      const res = await bookingApi.validateVoucher(voucherCode.trim(), subtotal);
      const resData = res?.data ?? res;
      if (resData?.success) {
        const voucher = resData.data;
        applyVoucherObject(voucher, false);
        message.success('Áp dụng mã giảm giá thành công!');
      } else {
        // Dịch lỗi từ Backend sang tiếng Việt
        const errorMsg = resData?.message || '';
        let displayMsg = 'Mã voucher không hợp lệ.';
        
        if (errorMsg === 'VOUCHER_NOT_FOUND') displayMsg = 'Mã giảm giá không tồn tại.';
        else if (errorMsg === 'VOUCHER_NOT_STARTED') displayMsg = 'Mã giảm giá này chưa đến thời gian sử dụng.';
        else if (errorMsg === 'VOUCHER_EXPIRED') displayMsg = 'Mã giảm giá này đã hết hạn.';
        else if (errorMsg === 'VOUCHER_USAGE_LIMIT_EXCEEDED') displayMsg = 'Mã giảm giá này đã hết lượt sử dụng.';
        else if (errorMsg === 'MIN_BOOKING_NOT_MET') displayMsg = 'Đơn hàng chưa đạt giá trị tối thiểu để dùng mã này.';
        
        message.error(displayMsg);
      }
    } catch (err) {
      const errMsg = err?.response?.data?.message || 'Không thể kiểm tra mã voucher lúc này.';
      message.error(errMsg);
    } finally {
      setValidatingVoucher(false);
    }
  };

  const removeVoucher = () => {
    setAppliedVoucher(null);
    setDiscountAmount(0);
    setVoucherCode('');
    message.info('Đã gỡ mã giảm giá.');
  };

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const payload = {
        GuestName:  values.fullName,
        GuestPhone: values.phone,
        GuestEmail: values.email || '',
        Notes:      [
          values.notes || '',
          `[CỌC: ${depositMethod === 'TRANSFER' ? 'Chuyển khoản' : 'Thanh toán tại Resort'}]`,
          depositMethod === 'TRANSFER' && transferRef ? `[REF: ${transferRef}]` : '',
        ].filter(Boolean).join(' ').trim(),
        VoucherCode: appliedVoucher ? appliedVoucher.code : null,
        Items: resolvedCart.map(item => ({
          RoomTypeId:  item.roomTypeId,
          Quantity:    1,
          CheckInDate:  checkIn,
          CheckOutDate: checkOut,
          RoomIds: item.roomId ? [item.roomId] : [],
        }))
      };

      const res = await bookingApi.createMultiBooking(payload);
      const resData = res?.data ?? res;
      if (resData?.success || resData?.bookingId) {
        const code = resData.bookingCode || (resData.bookingId ? `BK-${resData.bookingId.toString().padStart(6, '0')}` : 'Thành công');
        setSuccessCode(code);
      } else {
        message.error(resData?.message || 'Đặt phòng thất bại. Vui lòng thử lại.');
      }
    } catch (err) {
      console.error('[GuestBooking] Error:', err);
      const errMsg = err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi tạo đơn đặt phòng!';
      message.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  if (successCode) {
    return (
      <div style={{ background: '#0d0d0d', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
        <Header />
        <div style={{ paddingTop: 100, paddingBottom: 60, maxWidth: 600, margin: '0 auto', paddingInline: 24 }}>
          <div style={{ background: '#1a1a1a', padding: 40, borderRadius: 12, boxShadow: '0 4px 24px rgba(0,0,0,0.2)', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
            <CheckCircleOutlined style={{ fontSize: 64, color: '#16a34a', marginBottom: 24 }} />
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, color: 'white', margin: '0 0 16px' }}>Đặt Phòng Thành Công!</h1>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, lineHeight: 1.6, marginBottom: 24 }}>
              Cảm ơn bạn đã lựa chọn Asteria Resort. Thông tin đặt phòng của bạn đã được ghi nhận. 
              Mã đặt phòng của bạn là lời cam kết của chúng tôi cho một kỳ nghỉ tuyệt vời.
            </p>
            <div style={{ background: 'rgba(184,149,106,0.1)', padding: 20, borderRadius: 8, marginBottom: 24, border: '1px dashed #b8956a' }}>
              <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px' }}>Mã đặt phòng của quý khách</p>
              <p style={{ margin: '8px 0 0', fontSize: 24, fontWeight: 700, color: GOLD }}>#{successCode}</p>
            </div>
            {/* Thông tin cọc */}
            {depositMethod === 'TRANSFER' ? (
              <div style={{ background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.25)', borderRadius: 10, padding: 20, marginBottom: 24, textAlign: 'left' }}>
                <div style={{ fontWeight: 700, color: '#4ade80', marginBottom: 10, fontSize: 14 }}>✅ Vui lòng chuyển cọc để xác nhận đặt phòng</div>
                <div style={{ fontFamily: 'monospace', fontSize: 13, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'rgba(255,255,255,0.45)' }}>Số tiền:</span><span style={{ color: GOLD, fontWeight: 700 }}>{formatVND(Math.round(totalPrice * 0.3))}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'rgba(255,255,255,0.45)' }}>Ngân hàng:</span><span style={{ color: 'white' }}>Vietcombank - 1019 3636 8888</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'rgba(255,255,255,0.45)' }}>Nội dung:</span><span style={{ color: '#4ade80', fontWeight: 600 }}>DATPHONG {successCode}</span></div>
                </div>
              </div>
            ) : (
              <div style={{ background: 'rgba(184,149,106,0.08)', border: '1px solid rgba(184,149,106,0.2)', borderRadius: 10, padding: 16, marginBottom: 24, display: 'flex', gap: 10 }}>
                <span style={{ fontSize: 18 }}>🏨</span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>Vui lòng đặt cọc <strong style={{color: GOLD}}>{formatVND(Math.round(totalPrice * 0.3))}</strong> khi nhận phòng tại quầy lễ tân.</span>
              </div>
            )}
            <Button 
              type="primary" 
              size="large" 
              onClick={() => navigate('/')}
              style={{ background: GOLD, borderColor: GOLD, color: 'white', width: '100%', height: 48, fontWeight: 600, letterSpacing: '1px' }}
            >
              VỀ TRANG CHỦ
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#0d0d0d', minHeight: '100vh', fontFamily: "'Inter', sans-serif", color: 'white' }}>
      <style>{premiumInputHoverStyle}</style>
      <Header />

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* BIRTHDAY VOUCHER MODAL                                     */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Modal
        open={showBirthdayModal}
        onCancel={() => setShowBirthdayModal(false)}
        footer={null}
        centered
        closable={false}
        styles={{
          content: { background: '#1a1212', border: '1px solid rgba(255,200,80,0.3)', borderRadius: 16, padding: 0, overflow: 'hidden' },
          mask: { backdropFilter: 'blur(4px)', background: 'rgba(0,0,0,0.75)' },
        }}
        width={480}
      >
        <div style={{ animation: 'birthday-glow 2.5s ease-in-out infinite', borderRadius: 16 }}>
          {/* Header gradient */}
          <div style={{
            background: 'linear-gradient(135deg, #7c4a00 0%, #c8860a 50%, #7c4a00 100%)',
            padding: '32px 32px 24px',
            textAlign: 'center',
            position: 'relative',
          }}>
            {/* Emoji dạng floating */}
            <div style={{ fontSize: 60, animation: 'birthday-float 3s ease-in-out infinite', display: 'inline-block', marginBottom: 8 }}>
              🎂
            </div>
            <h2 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 26, fontWeight: 700, color: '#fff8e7',
              margin: '8px 0 4px', textShadow: '0 2px 8px rgba(0,0,0,0.4)',
            }}>
              Chúc Mừng Sinh Nhật!
            </h2>
            <p style={{ color: 'rgba(255,248,231,0.85)', fontSize: 15, margin: 0 }}>
              {user?.fullName ? `Kính chúc ${user.fullName}` : 'Kính chúc quý khách'} một ngày thật vui vẻ! 🎉
            </p>
          </div>

          {/* Body */}
          <div style={{ padding: '28px 32px 32px' }}>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 1.7, marginBottom: 20, textAlign: 'center' }}>
              Nhân dịp đặc biệt này, Asteria Resort xin tặng quý khách voucher ưu đãi sinh nhật 
              đặc biệt — chỉ dành riêng cho hôm nay!
            </p>

            {/* Voucher card */}
            {birthdayVoucher && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(200,134,10,0.15), rgba(255,200,80,0.08))',
                border: '1.5px dashed #c8860a',
                borderRadius: 12, padding: '20px 24px',
                display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24,
              }}>
                <div style={{
                  width: 52, height: 52, background: 'rgba(200,134,10,0.2)',
                  borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, flexShrink: 0,
                }}>
                  🎁
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 800, color: '#f0c040', letterSpacing: 2 }}>
                    {birthdayVoucher.code}
                  </div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
                    Giảm <strong style={{ color: '#f0c040' }}>
                      {birthdayVoucher.discountType === 'PERCENT'
                        ? `${birthdayVoucher.discountValue}%`
                        : formatVND(birthdayVoucher.discountValue)}
                    </strong>
                    {' · '}Hiệu lực đến {birthdayVoucher.validTo ? formatDateVI(birthdayVoucher.validTo) : '7 ngày'}
                  </div>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 12 }}>
              <Button
                block
                onClick={applyBirthdayVoucher}
                style={{
                  height: 48, background: 'linear-gradient(135deg, #c8860a, #f0c040)',
                  border: 'none', color: '#1a0a00', fontWeight: 700, fontSize: 14,
                  letterSpacing: '0.5px', borderRadius: 8,
                  boxShadow: '0 4px 16px rgba(200,134,10,0.4)',
                }}
              >
                🎉 ÁP DỤNG NGAY
              </Button>
              <Button
                block
                onClick={() => setShowBirthdayModal(false)}
                style={{
                  height: 48, background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)',
                  fontWeight: 500, fontSize: 13, borderRadius: 8,
                }}
              >
                Để sau
              </Button>
            </div>

            <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 16, marginBottom: 0 }}>
              * Voucher sử dụng 1 lần, chỉ áp dụng trong ngày sinh nhật và 7 ngày tiếp theo.
            </p>
          </div>
        </div>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* BIRTHDAY BANNER (nhắc nhở khi modal đã tắt mà chưa dùng)  */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {birthdayVoucher && !appliedVoucher && !showBirthdayModal && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 100,
          background: 'linear-gradient(135deg, #7c4a00, #c8860a)',
          borderRadius: 12, padding: '14px 20px',
          display: 'flex', alignItems: 'center', gap: 12,
          boxShadow: '0 8px 32px rgba(200,134,10,0.45)',
          cursor: 'pointer', maxWidth: 340,
          animation: 'birthday-glow 2.5s ease-in-out infinite',
        }}
          onClick={() => setShowBirthdayModal(true)}
        >
          <GiftOutlined style={{ fontSize: 24, color: '#fff8e7' }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff8e7' }}>🎂 Quà sinh nhật đang chờ bạn!</div>
            <div style={{ fontSize: 12, color: 'rgba(255,248,231,0.8)', marginTop: 2 }}>
              Bấm để dùng voucher giảm {birthdayVoucher.discountValue}%
            </div>
          </div>
          <CloseCircleOutlined
            style={{ fontSize: 16, color: 'rgba(255,248,231,0.6)', marginLeft: 'auto' }}
            onClick={e => { e.stopPropagation(); setBirthdayVoucher(null); }}
          />
        </div>
      )}

      <div style={{ paddingTop: 100, paddingBottom: 60, maxWidth: 1000, margin: '0 auto', paddingInline: 24 }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, color: 'white', margin: '0 0 32px' }}>
          Hoàn tất đặt phòng
        </h1>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 32 }}>
          
          {/* CỘT TRÁI: Form điền thông tin */}
          <div style={{ background: '#1a1a1a', padding: 32, borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: 'white', margin: '0 0 24px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ display: 'inline-flex', width: 24, height: 24, background: GOLD, color: 'white', borderRadius: '50%', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>1</span>
              Thông tin liên hệ
            </h2>
            
            <Form 
              form={form} 
              layout="vertical" 
              onFinish={onFinish} 
              requiredMark="optional"
              initialValues={{
                fullName: user?.fullName || '',
                phone: user?.phone || '',
                email: user?.email || ''
              }}
            >
              <Form.Item 
                name="fullName" 
                label={<span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.85)', fontSize: '14px' }}>Họ và tên khách lưu trú</span>}
                rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
              >
                <Input className="premium-input" size="large" placeholder="Ví dụ: Nguyễn Văn Asteria" style={premiumInputStyle} />
              </Form.Item>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <Form.Item 
                  name="phone" 
                  label={<span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.85)', fontSize: '14px' }}>Số điện thoại</span>}
                  rules={[{ required: true, message: 'Vui lòng nhập số điện thoại' }]}
                >
                  <Input className="premium-input" size="large" placeholder="090 123 4567" style={premiumInputStyle} />
                </Form.Item>

                <Form.Item 
                  name="email" 
                  label={<span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.85)', fontSize: '14px' }}>Email <small style={{fontWeight: 400, color: 'rgba(255,255,255,0.45)'}}>(Tùy chọn)</small></span>}
                  rules={[{ type: 'email', message: 'Email không hợp lệ' }]}
                >
                  <Input className="premium-input" size="large" placeholder="guest@example.com" style={premiumInputStyle} />
                </Form.Item>
              </div>

              <Divider style={{ margin: '32px 0', borderColor: 'rgba(255,255,255,0.1)' }} />

              <h2 style={{ fontSize: 18, fontWeight: 600, color: 'white', margin: '0 0 24px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ display: 'inline-flex', width: 24, height: 24, background: GOLD, color: 'white', borderRadius: '50%', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>2</span>
                Yêu cầu bổ sung
              </h2>

              <Form.Item name="notes" label={<span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.85)', fontSize: '14px' }}>Ghi chú đặc biệt <small style={{fontWeight: 400, color: 'rgba(255,255,255,0.45)'}}>(Tùy chọn)</small></span>}>
                <Input.TextArea className="premium-input" rows={4} placeholder="Ví dụ: Tôi muốn yêu cầu phòng yên tĩnh hoặc quà tặng bất ngờ cho kỷ niệm ngày cưới..." style={{...premiumInputStyle, padding: '14px'}} />
              </Form.Item>
            </Form>
          </div>

          {/* CỘT PHẢI: Tóm tắt Đơn đặt phòng */}
          <div>
            <div style={{ background: '#1a1a1a', padding: 32, borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 4px 20px rgba(0,0,0,0.2)', position: 'sticky', top: 90 }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: 'white', margin: '0 0 24px' }}>
                Chi tiết đặt phòng
              </h2>

              {/* Room details */}
              <div style={{ marginBottom: 24 }}>
                {resolvedCart.length > 1 ? (
                  <>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'white', marginBottom: 12 }}>{resolvedCart.length} phòng đã chọn</div>
                    {resolvedCart.map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8, marginBottom: 8, fontSize: 14 }}>
                        <div>
                          <span style={{ fontWeight: 600, color: 'white' }}>P.{item.roomNumber}</span>
                          {item.floor && <span style={{ color: 'rgba(255,255,255,0.45)', marginLeft: 6 }}>Tầng {item.floor}</span>}
                          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{item.roomName}</div>
                        </div>
                        <span style={{ color: GOLD, fontWeight: 600 }}>{formatVND(item.basePrice)}</span>
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 17, fontWeight: 600, color: 'white', marginBottom: 6 }}>{resolvedCart[0]?.roomName}</div>
                    {resolvedCart[0]?.roomNumber && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(22, 163, 74, 0.1)', border: '1px solid rgba(22, 163, 74, 0.2)', borderRadius: 6, padding: '6px 14px', marginBottom: 16, fontSize: 13, color: '#4ade80', fontWeight: 600 }}>
                        <CheckCircleOutlined /> <span>Phòng {resolvedCart[0].roomNumber} · Tầng {resolvedCart[0].floor}</span>
                      </div>
                    )}
                  </>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 6 }}><span>Nhận phòng:</span><span style={{ fontWeight: 500, color: 'white' }}>{formatDateVI(checkIn)} (14:00)</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 6 }}><span>Trả phòng:</span><span style={{ fontWeight: 500, color: 'white' }}>{formatDateVI(checkOut)} (12:00)</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.6)', fontSize: 14 }}><span>Khách:</span><span style={{ color: 'white' }}>{adults} Người lớn{children > 0 ? `, ${children} Trẻ em` : ''}</span></div>
              </div>

              <Divider style={{ margin: '24px 0', borderColor: 'rgba(255,255,255,0.1)' }} />

              {/* VOUCHER SECTION */}
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontWeight: 600, fontSize: 14, color: 'white', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TagOutlined style={{color: GOLD}} /> Mã giảm giá (Voucher)
                </p>
                {!appliedVoucher ? (
                  <>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Input 
                        placeholder="Nhập mã ưu đãi..." 
                        value={voucherCode}
                        onChange={e => setVoucherCode(e.target.value.toUpperCase())}
                        style={{ ...premiumInputStyle, height: 44, padding: '0 16px' }}
                        className="premium-input"
                      />
                      <Button 
                        onClick={handleApplyVoucher} 
                        loading={validatingVoucher}
                        style={{ height: 44, borderColor: GOLD, color: GOLD, background: 'transparent', fontWeight: 600 }}
                      >
                        ÁP DỤNG
                      </Button>
                    </div>

                    {birthdayVouchers.length > 0 && (
                      <div style={{ marginTop: 12 }}>
                        <Alert
                          type="success"
                          showIcon
                          style={{
                            background: 'rgba(22, 163, 74, 0.1)',
                            border: '1px solid rgba(22, 163, 74, 0.25)',
                            color: '#4ade80',
                          }}
                          message="Bạn đang có voucher sinh nhật. Có muốn sử dụng không?"
                          description={
                            <Space direction="vertical" size={8} style={{ width: '100%', marginTop: 6 }}>
                              {birthdayVouchers.map((voucher) => {
                                const code = voucher.code || voucher.Code;
                                const displayText = voucher.displayText || voucher.DisplayText || `Giảm ${formatVND(voucher.discountValue || voucher.DiscountValue || 0)}`;

                                return (
                                  <div
                                    key={code}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      gap: 10,
                                      flexWrap: 'wrap',
                                    }}
                                  >
                                    <div>
                                      <Tag color="green" style={{ fontWeight: 700 }}>{code}</Tag>
                                      <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>{displayText}</span>
                                    </div>
                                    <Button
                                      size="small"
                                      loading={loadingBirthdayVouchers}
                                      onClick={() => applyVoucherObject(voucher)}
                                      style={{ borderColor: GOLD, color: GOLD, background: 'transparent', fontWeight: 600 }}
                                    >
                                      Dùng voucher này
                                    </Button>
                                  </div>
                                );
                              })}
                            </Space>
                          }
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ background: 'rgba(22, 163, 74, 0.1)', border: '1px solid rgba(22, 163, 74, 0.2)', padding: '10px 14px', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <Tag color="success" style={{margin: 0, fontWeight: 600}}>{appliedVoucher.code}</Tag>
                      <span style={{ fontSize: 13, color: '#4ade80', marginLeft: 8 }}>Đã áp dụng ưu đãi</span>
                    </div>
                    <Button type="text" danger icon={<CloseCircleOutlined />} onClick={removeVoucher} />
                  </div>
                )}
              </div>

              {/* Price summary */}
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 20, borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)', marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 12 }}>
                  <span>Giá tạm tính ({rooms} phòng × {nights} đêm)</span>
                  <span style={{fontWeight: 500, color: 'white'}}>{formatVND(subtotal)}</span>
                </div>
                {memDiscountAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: GOLD, fontSize: 14, marginBottom: 12 }}>
                    <span>Ưu đãi hội viên ({user.membershipTier})</span>
                    <span style={{fontWeight: 600}}>- {formatVND(memDiscountAmount)}</span>
                  </div>
                )}
                {discountAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4ade80', fontSize: 14, marginBottom: 12 }}>
                    <span>Voucher giảm giá</span>
                    <span style={{fontWeight: 600}}>- {formatVND(discountAmount)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 12 }}>
                  <span>Phí dịch vụ & Thuế (VAT)</span>
                  <span>Đã bao gồm</span>
                </div>
                <Divider style={{ margin: '12px 0', borderColor: 'rgba(255,255,255,0.1)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>Tổng thanh toán</span>
                  <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 800, color: GOLD }}>
                    {formatVND(totalPrice)}
                  </span>
                </div>
              </div>

              {/* ── PHƯƠNG THỨC ĐẶT CỌC ── */}
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontWeight: 700, fontSize: 14, color: 'white', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ display: 'inline-flex', width: 22, height: 22, background: GOLD, color: 'white', borderRadius: '50%', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>3</span>
                  Đặt cọc trước
                </p>

                {/* Số tiền cọc */}
                <div style={{ background: 'rgba(184,149,106,0.08)', border: '1px solid rgba(184,149,106,0.2)', borderRadius: 8, padding: '12px 16px', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>Tiền cọc yêu cầu (30%)</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: GOLD, fontFamily: "'Playfair Display', serif" }}>{formatVND(Math.round(totalPrice * 0.3))}</div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Phần còn lại<br/>thanh toán tại resort</div>
                </div>

                {/* Chọn phương thức */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {/* Option 1: Chuyển khoản */}
                  <div
                    className={`deposit-option${depositMethod === 'TRANSFER' ? ' selected' : ''}`}
                    onClick={() => setDepositMethod('TRANSFER')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${depositMethod === 'TRANSFER' ? GOLD : 'rgba(255,255,255,0.3)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {depositMethod === 'TRANSFER' && <div style={{ width: 8, height: 8, borderRadius: '50%', background: GOLD }} />}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'white' }}>💳 Chuyển khoản ngân hàng</div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>Xác nhận nhanh hơn — ưu tiên xử lý</div>
                      </div>
                    </div>
                    {depositMethod === 'TRANSFER' && (
                      <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: '14px 16px', marginBottom: 12, fontFamily: 'monospace', fontSize: 13 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span style={{ color: 'rgba(255,255,255,0.45)' }}>Ngân hàng:</span><span style={{ color: 'white', fontWeight: 600 }}>Vietcombank</span></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span style={{ color: 'rgba(255,255,255,0.45)' }}>Số TK:</span><span style={{ color: GOLD, fontWeight: 700, letterSpacing: '1px' }}>1019 3636 8888</span></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span style={{ color: 'rgba(255,255,255,0.45)' }}>Chủ TK:</span><span style={{ color: 'white' }}>CONG TY ASTERIA RESORT</span></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'rgba(255,255,255,0.45)' }}>Nội dung CK:</span><span style={{ color: '#4ade80', fontWeight: 600 }}>DATPHONG [SĐT của bạn]</span></div>
                        </div>
                        <div>
                          <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', display: 'block', marginBottom: 6, letterSpacing: '0.3px' }}>Mã giao dịch / Ref number (nếu có)</label>
                          <input
                            value={transferRef}
                            onChange={e => setTransferRef(e.target.value)}
                            placeholder="Ví dụ: FT26142ABC123"
                            style={{ ...premiumInputStyle, width: '100%', padding: '10px 14px', fontSize: 14, boxSizing: 'border-box' }}
                            className="premium-input"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Option 2: Tại resort */}
                  <div
                    className={`deposit-option${depositMethod === 'RESORT' ? ' selected' : ''}`}
                    onClick={() => setDepositMethod('RESORT')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${depositMethod === 'RESORT' ? GOLD : 'rgba(255,255,255,0.3)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {depositMethod === 'RESORT' && <div style={{ width: 8, height: 8, borderRadius: '50%', background: GOLD }} />}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'white' }}>🏨 Đặt cọc tại Resort</div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>Thanh toán toàn bộ khi nhận phòng</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Button 
                type="primary" 
                size="large" 
                onClick={() => form.submit()}
                loading={loading}
                style={{ 
                  background: GOLD, borderColor: GOLD, width: '100%', height: 54, color: 'white',
                  fontSize: 14, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase',
                  boxShadow: '0 4px 12px rgba(184,149,106,0.3)'
                }}
              >
                XÁC NHẬN ĐẶT PHÒNG
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
