import React, { useState, useEffect } from 'react';
import { InputNumber, Button, Badge, message, Spin } from 'antd';
import {
  PlusOutlined, DeleteOutlined, CheckCircleOutlined, ShoppingCartOutlined, SendOutlined,
} from '@ant-design/icons';
import bookingManagementApi from '../../api/bookingManagementApi';

const G = '#b8956a';

// ──────────────────────────────────────────────────────────────────────────────
// Màu sắc cho từng danh mục
// ──────────────────────────────────────────────────────────────────────────────
const CATEGORY_COLORS = [
  '#6366f1', '#0ea5e9', '#10b981', '#f59e0b',
  '#ec4899', '#8b5cf6', '#14b8a6', '#f97316',
];

const fmtPrice = (v) => `${Number(v).toLocaleString('vi-VN')}đ`;

// ──────────────────────────────────────────────────────────────────────────────
// ServiceCard — luôn hiển thị nút Thêm với mọi user đã đăng nhập
// ──────────────────────────────────────────────────────────────────────────────
function ServiceCard({ service, onAdd, accentColor }) {
  const [qty, setQty] = useState(1);
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid rgba(255,255,255,0.08)`,
        borderRadius: 10,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        transition: 'transform 180ms, box-shadow 180ms',
        cursor: 'default',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = `0 8px 24px ${accentColor}22`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = '';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#f0f0f0', lineHeight: 1.3 }}>{service.name}</div>
          {service.description && (
            <div style={{ fontSize: 11, color: '#888', marginTop: 3, lineHeight: 1.4 }}>{service.description}</div>
          )}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: accentColor }}>{fmtPrice(service.price)}</div>
          <div style={{ fontSize: 10, color: '#666' }}>/{service.unit || 'lần'}</div>
        </div>
      </div>

      {/* Luôn hiện nút Thêm — bất kể đang check-in hay không */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <InputNumber
          size="small" min={1} max={20} value={qty}
          onChange={v => setQty(v || 1)}
          style={{ width: 58 }}
        />
        <Button
          size="small" type="primary" icon={<PlusOutlined />}
          onClick={() => { onAdd(service, qty); setQty(1); }}
          style={{ background: accentColor, borderColor: accentColor, flex: 1 }}
        >
          Thêm vào giỏ
        </Button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// CategorySection
// ──────────────────────────────────────────────────────────────────────────────
function CategorySection({ category, colorIndex, onAdd }) {
  const color = CATEGORY_COLORS[colorIndex % CATEGORY_COLORS.length];
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ width: 4, height: 18, borderRadius: 2, background: color }} />
        <span style={{ fontSize: 13, fontWeight: 700, color, letterSpacing: '.15em', textTransform: 'uppercase' }}>
          {category.name}
        </span>
        <span style={{ fontSize: 11, color: '#555', marginLeft: 4 }}>({category.services?.length || 0} dịch vụ)</span>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: 12,
      }}>
        {(category.services || []).map(svc => (
          <ServiceCard key={svc.id} service={svc} accentColor={color} onAdd={onAdd} />
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// CartPanel — giỏ hàng sticky ở dưới
// ──────────────────────────────────────────────────────────────────────────────
function CartPanel({ cartItems, onRemove, onChangeQty, onSubmit, submitting, checkedInDetails, selectedDetailId, onSelectDetail, isCheckedIn }) {
  const total = cartItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

  if (cartItems.length === 0) return null;

  return (
    <div style={{
      position: 'sticky', bottom: 0, zIndex: 10,
      background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)',
      border: `1px solid ${G}50`,
      borderRadius: '16px 16px 0 0',
      padding: '18px 24px',
      boxShadow: '0 -12px 40px rgba(0,0,0,0.6)',
      marginTop: 24,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ShoppingCartOutlined style={{ color: G, fontSize: 20 }} />
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>Giỏ dịch vụ</span>
          <Badge count={cartItems.length} style={{ background: G }} />
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: '#888' }}>Tổng cộng</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#ff6b6b' }}>{fmtPrice(total)}</div>
        </div>
      </div>

      {/* Chọn phòng nếu đang ở nhiều phòng */}
      {isCheckedIn && checkedInDetails.length > 1 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>Chọn phòng ghi dịch vụ vào:</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {checkedInDetails.map(d => (
              <button
                key={d.id}
                onClick={() => onSelectDetail(d.id)}
                style={{
                  padding: '5px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  background: selectedDetailId === d.id ? G : 'rgba(255,255,255,0.06)',
                  color: selectedDetailId === d.id ? '#fff' : '#aaa',
                  border: `1px solid ${selectedDetailId === d.id ? G : 'rgba(255,255,255,0.1)'}`,
                  transition: 'all 180ms',
                }}
              >
                Phòng {d.roomNumber || d.roomTypeName}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Danh sách items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflowY: 'auto', marginBottom: 14 }}>
        {cartItems.map(i => (
          <div key={i.serviceId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
            <div style={{ flex: 1, fontSize: 13, color: '#e0e0e0' }}>{i.serviceName}</div>
            <InputNumber
              size="small" min={1} max={20} value={i.quantity}
              onChange={v => onChangeQty(i.serviceId, v || 1)}
              style={{ width: 55 }}
            />
            <div style={{ width: 90, textAlign: 'right', fontSize: 13, color: G, fontWeight: 600 }}>
              {fmtPrice(i.unitPrice * i.quantity)}
            </div>
            <Button type="text" size="small" danger icon={<DeleteOutlined />}
              onClick={() => onRemove(i.serviceId)} />
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 12, color: '#666', maxWidth: 240, lineHeight: 1.5 }}>
          {isCheckedIn
            ? '💳 Chi phí ghi vào hóa đơn phòng, thanh toán khi Check-out'
            : '📞 Nhân viên sẽ liên hệ xác nhận và tới phục vụ'}
        </div>
        <Button
          type="primary"
          loading={submitting}
          icon={<SendOutlined />}
          onClick={onSubmit}
          style={{ background: G, borderColor: G, height: 40, paddingInline: 24, fontWeight: 700, fontSize: 14 }}
          disabled={isCheckedIn && checkedInDetails.length > 1 && !selectedDetailId}
        >
          {isCheckedIn ? '📨 Gửi yêu cầu' : '📋 Đặt dịch vụ'}
        </Button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// MAIN: GuestServiceTab
// ──────────────────────────────────────────────────────────────────────────────
export default function GuestServiceTab({ myBookings = [], theme, isAdminArea }) {
  // ── Parse danh sách phòng đang check-in ────────────────────────────────────
  // Normalize: strip underscores/spaces, lowercase  → 'Checked_in' ≡ 'CheckedIn' ≡ 'CHECKED_IN'
  const getStatus = (obj) =>
    (obj?.status ?? obj?.Status ?? '').toLowerCase().replace(/[^a-z]/g, '');
  const getId = (obj) => obj?.id ?? obj?.Id;
  const getDetails = (obj) => obj?.details ?? obj?.Details ?? [];
  const getRoomNumber = (obj) => obj?.roomNumber ?? obj?.RoomNumber ?? '';
  const getRoomTypeName = (obj) => obj?.roomTypeName ?? obj?.RoomTypeName ?? '';

  const checkedInDetails = myBookings
    .filter(b => getStatus(b) === 'checkedin')
    .flatMap(b =>
      getDetails(b)
        .filter(d => getStatus(d) === 'checkedin')
        .map(d => ({
          ...d,
          id: getId(d),
          roomNumber: getRoomNumber(d),
          roomTypeName: getRoomTypeName(d),
          bookingCode: b.bookingCode ?? b.BookingCode,
        }))
    );

  const isCheckedIn = checkedInDetails.length > 0;

  // ── State ───────────────────────────────────────────────────────────────────
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cartItems, setCartItems] = useState([]);
  const [selectedDetailId, setSelectedDetailId] = useState(
    checkedInDetails.length === 1 ? checkedInDetails[0].id : null
  );
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState('browse');
  const [createdOrder, setCreatedOrder] = useState(null);

  // ── Load dịch vụ ────────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    bookingManagementApi.getServices()
      .then(r => { if (r.data?.success) setCategories(r.data.data || []); })
      .catch(() => message.error('Không thể tải danh sách dịch vụ. Vui lòng thử lại.'))
      .finally(() => setLoading(false));
  }, []);

  // ── Giỏ hàng ────────────────────────────────────────────────────────────────
  const addToCart = (svc, qty) => {
    setCartItems(prev => {
      const ex = prev.find(i => i.serviceId === svc.id);
      if (ex) return prev.map(i => i.serviceId === svc.id ? { ...i, quantity: i.quantity + qty } : i);
      return [...prev, {
        serviceId: svc.id,
        serviceName: svc.name,
        unitPrice: svc.price,
        unit: svc.unit || 'lần',
        quantity: qty,
      }];
    });
    message.success({ content: `✅ Đã thêm "${svc.name}"`, duration: 1.5 });
  };

  const removeFromCart = (serviceId) =>
    setCartItems(prev => prev.filter(i => i.serviceId !== serviceId));

  const changeQty = (serviceId, qty) =>
    setCartItems(prev => prev.map(i => i.serviceId === serviceId ? { ...i, quantity: qty } : i));

  // ── Submit đơn ──────────────────────────────────────────────────────────────
  const doSubmit = async (notes) => {
    setSubmitting(true);
    try {
      const bookingDetailId = isCheckedIn
        ? (checkedInDetails.length === 1 ? checkedInDetails[0].id : selectedDetailId)
        : null;

      const res = await bookingManagementApi.createOrder({
        bookingDetailId,
        items: cartItems.map(i => ({ serviceId: i.serviceId, quantity: i.quantity })),
        notes: notes || null,
      });

      if (res.data?.success) {
        setCreatedOrder(res.data.data);
        setCartItems([]);
        setStep('success');
      } else {
        message.error(res.data?.message || 'Đặt dịch vụ thất bại, vui lòng thử lại.');
      }
    } catch (err) {
      console.error('[GuestServiceTab] Đặt dịch vụ lỗi:', err?.response?.status, err?.response?.data);
      const status = err?.response?.status;
      if (status === 401) {
        message.error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
      } else if (status === 403) {
        message.error('Hệ thống chưa được cấu hình đúng (403). Hãy liên hệ quản trị viên.');
      } else {
        message.error(err?.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = () => {
    if (!cartItems.length) { message.warning('Chưa có dịch vụ nào trong giỏ.'); return; }
    if (checkedInDetails.length > 1 && !selectedDetailId) {
      message.warning('Vui lòng chọn phòng để ghi dịch vụ vào.');
      return;
    }
    doSubmit(null);
  };

  // ── Màn hình thành công ──────────────────────────────────────────────────────
  if (step === 'success' && createdOrder) {
    const orderCode = createdOrder.orderCode ?? createdOrder.OrderCode ?? '---';
    return (
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${G}40`,
        borderRadius: 14,
        padding: '52px 32px',
        textAlign: 'center',
      }}>
        <CheckCircleOutlined style={{ fontSize: 56, color: '#52c41a', marginBottom: 18 }} />
        <div style={{ fontSize: 24, fontWeight: 700, color: '#f0f0f0', marginBottom: 10 }}>
          Đã gửi yêu cầu dịch vụ!
        </div>
        <div style={{ color: '#aaa', fontSize: 14, marginBottom: 6 }}>
          Mã đơn: <b style={{ color: G, fontSize: 16 }}>{orderCode}</b>
        </div>
        <div style={{
          color: '#666', fontSize: 13, marginBottom: 32,
          maxWidth: 420, margin: '10px auto 32px',
          lineHeight: 1.7,
        }}>
          {isCheckedIn
            ? 'Nhân viên sẽ xác nhận và thực hiện ngay. Chi phí tự động ghi vào hóa đơn phòng của bạn.'
            : 'Nhân viên sẽ liên hệ bạn sớm để xác nhận đặt chỗ và thanh toán.'}
        </div>
        <Button
          type="primary"
          onClick={() => { setStep('browse'); setCreatedOrder(null); }}
          style={{ background: G, borderColor: G, height: 42, paddingInline: 32, fontWeight: 700 }}
        >
          ← Tiếp tục chọn dịch vụ
        </Button>
      </div>
    );
  }

  // ── Màn hình khoá khi chưa check-in ────────────────────────────────────────
  if (!isCheckedIn) {
    return (
      <div style={{ position: 'relative' }}>
        {/* Catalog mờ phía sau */}
        <div style={{ filter: 'blur(3px)', opacity: 0.35, pointerEvents: 'none', userSelect: 'none' }}>
          <Spin spinning={loading} tip="Đang tải...">
            {categories.map((cat, idx) => (
              <CategorySection key={cat.id ?? idx} category={cat} colorIndex={idx} onAdd={() => {}} />
            ))}
          </Spin>
        </div>

        {/* Overlay khoá trung tâm */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          zIndex: 10,
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 100%)',
            border: `1px solid ${G}50`,
            borderRadius: 20,
            padding: '40px 48px',
            textAlign: 'center',
            boxShadow: `0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px ${G}20`,
            maxWidth: 420,
          }}>
            {/* Icon khoá */}
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: `radial-gradient(circle, ${G}30, ${G}10)`,
              border: `2px solid ${G}60`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: 32,
            }}>
              🔒
            </div>

            <div style={{ fontSize: 20, fontWeight: 800, color: '#f0f0f0', marginBottom: 10 }}>
              Tính năng bị khoá
            </div>

            <div style={{ fontSize: 13, color: '#999', lineHeight: 1.7, marginBottom: 24 }}>
              Bạn cần <b style={{ color: G }}>đang lưu trú (Check-in)</b> tại Asteria Resort
              để có thể đặt dịch vụ.
              <br />
              Vui lòng liên hệ lễ tân để được hỗ trợ.
            </div>

            {/* Thông tin liên hệ */}
            <div style={{
              background: 'rgba(184,149,106,0.08)',
              border: `1px solid ${G}25`,
              borderRadius: 10,
              padding: '12px 18px',
              marginBottom: 20,
            }}>
              <div style={{ fontSize: 11, color: '#666', marginBottom: 6, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Liên hệ lễ tân</div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 24 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18 }}>📞</div>
                  <div style={{ fontSize: 12, color: G, fontWeight: 600, marginTop: 4 }}>Ext. 0</div>
                  <div style={{ fontSize: 10, color: '#555' }}>Điện thoại nội bộ</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18 }}>💬</div>
                  <div style={{ fontSize: 12, color: G, fontWeight: 600, marginTop: 4 }}>Chat</div>
                  <div style={{ fontSize: 10, color: '#555' }}>Ứng dụng khách sạn</div>
                </div>
              </div>
            </div>

            <div style={{ fontSize: 11, color: '#444', lineHeight: 1.6 }}>
              Dịch vụ sẽ tự động ghi nợ vào hóa đơn phòng
              <br />và thanh toán khi Check-out.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Màn hình chính (đã check-in) ────────────────────────────────────────────
  return (
    <div>
      {/* Banner đang lưu trú */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(82,196,26,0.12), rgba(82,196,26,0.04))',
        border: '1px solid rgba(82,196,26,0.25)',
        borderRadius: 10,
        padding: '14px 20px',
        marginBottom: 24,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{ fontSize: 22 }}>🏨</span>
        <div>
          <div style={{ fontSize: 13, color: '#b7eb8f', fontWeight: 700 }}>
            Bạn đang lưu trú tại Asteria Resort
          </div>
          <div style={{ fontSize: 12, color: '#6b9c5a', marginTop: 2 }}>
            Thêm dịch vụ vào giỏ → Gửi yêu cầu → Chi phí ghi vào hóa đơn phòng, thanh toán khi Check-out.
          </div>
        </div>
      </div>

      {/* Catalog dịch vụ */}
      <Spin spinning={loading} tip="Đang tải dịch vụ...">
        {!loading && categories.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#555', fontSize: 14 }}>
            😔 Hiện chưa có dịch vụ nào.
          </div>
        ) : (
          categories.map((cat, idx) => (
            <CategorySection
              key={cat.id ?? idx}
              category={cat}
              colorIndex={idx}
              onAdd={addToCart}
            />
          ))
        )}
      </Spin>

      {/* Giỏ hàng sticky */}
      <CartPanel
        cartItems={cartItems}
        onRemove={removeFromCart}
        onChangeQty={changeQty}
        onSubmit={handleSubmit}
        submitting={submitting}
        checkedInDetails={checkedInDetails}
        selectedDetailId={selectedDetailId}
        onSelectDetail={setSelectedDetailId}
        isCheckedIn={isCheckedIn}
      />
    </div>
  );
}
