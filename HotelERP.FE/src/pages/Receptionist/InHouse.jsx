import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Input, Button, Space, Typography, Tooltip, message,
  Modal, Select, InputNumber, Form, Tag, Collapse,
  Empty, Spin, Row, Col, Statistic, Popconfirm, Checkbox, Alert,
} from 'antd';
import {
  SearchOutlined, EyeOutlined, CopyOutlined, PlusOutlined,
  ShoppingCartOutlined, DeleteOutlined, UserOutlined, UnorderedListOutlined,
  PlayCircleOutlined, CheckCircleOutlined, CloseCircleOutlined, DollarOutlined,
  PrinterOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import bookingManagementApi from '../../api/bookingManagementApi';
import invoiceApi from '../../api/invoiceApi';
import { useSignalR } from '../../hooks/useSignalR.jsx';
import { notification } from '../../utils/antdGlobal';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;
const { Panel } = Collapse;

// ============================================================
// STATUS CONFIG
// ============================================================
const ORDER_STATUS_COLOR = {
  Booked:     'blue',
  InProgress: 'orange',
  Completed:  'green',
  Cancelled:  'red',
  Pending:    'default',
  Delivered:  'cyan',   // seed data cũ
};
const ORDER_STATUS_LABEL = {
  Booked:     'Đã đặt',
  InProgress: 'Đang thực hiện',
  Completed:  'Hoàn tất',
  Cancelled:  'Đã hủy',
  Pending:    'Chờ xử lý',
  Delivered:  'Đã giao',   // seed data cũ
};

// ── Config ngân hàng (thay đổi theo thực tế) ──
const BANK_CONFIG = {
  bankId: 'MB',           // Mã ngân hàng VietQR (MB, VCB, TCB, ACB, ...)
  accountNo: '0388888888', // Số tài khoản
  accountName: 'ASTERIA RESORT',
  template: 'compact2',    // compact | compact2 | print | qr_only
};

// Tạo URL QR VietQR
const buildVietQR = (amount, description = '') => {
  const { bankId, accountNo, accountName, template } = BANK_CONFIG;
  const desc = encodeURIComponent(description.slice(0, 25));
  const name = encodeURIComponent(accountName);
  return `https://img.vietqr.io/image/${bankId}-${accountNo}-${template}.png?amount=${amount}&addInfo=${desc}&accountName=${name}`;
};

// ============================================================
// HELPER: In hóa đơn dịch vụ tại quầy cho khách vãng lai
// ============================================================
const printWalkInReceipt = (order, guestName) => {
  const items = order.items || [];
  const rows = items.map(i => `
    <tr>
      <td>${i.serviceName}</td>
      <td align="center">${i.quantity}</td>
      <td align="right">${Number(i.unitPrice).toLocaleString('vi-VN')}đ</td>
      <td align="right">${Number(i.lineTotal).toLocaleString('vi-VN')}đ</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
    <title>Hóa đơn ${order.orderCode}</title>
    <style>
      @media print { body { margin: 0; } }
      body{font-family:'Segoe UI',sans-serif;padding:24px;max-width:420px;margin:auto;color:#111}
      h2{text-align:center;margin:0 0 4px}p{margin:2px 0;font-size:13px}
      table{width:100%;border-collapse:collapse;margin-top:12px}
      th{background:#f5f5f5;padding:6px 8px;font-size:12px;border-bottom:2px solid #ddd}
      td{padding:5px 8px;font-size:13px;border-bottom:1px solid #eee}
      .total{font-size:16px;font-weight:700;color:#c00;text-align:right;margin-top:12px;border-top:2px solid #333;padding-top:8px}
      .paid-stamp{text-align:center;margin-top:14px;padding:8px;border:2px solid #52c41a;border-radius:6px;color:#52c41a;font-weight:700;font-size:14px;letter-spacing:2px}
      .footer{text-align:center;margin-top:14px;font-size:11px;color:#666}
    </style></head><body>
    <h2>ASTERIA RESORT</h2>
    <p style="text-align:center;color:#666;font-size:12px">HÓA ĐƠN DỊCH VỤ TẠI QUẦY</p>
    <hr/>
    <p><b>Mã đơn:</b> ${order.orderCode}</p>
    <p><b>Ngày:</b> ${new Date().toLocaleString('vi-VN')}</p>
    ${guestName ? `<p><b>Khách:</b> ${guestName}</p>` : ''}
    <table><thead><tr><th>Dịch vụ</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <div class="total">TỔNG CỘNG: ${Number(order.totalAmount).toLocaleString('vi-VN')}đ</div>
    <div class="paid-stamp">✅ ĐÃ THANH TOÁN</div>
    <div class="footer">Đã thanh toán — Cảm ơn quý khách!<br/>Asteria Resort © 2026</div>
  </body></html>`;

  const win = window.open('', '_blank', 'width=480,height=620');
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
};

// ============================================================
// HELPER: In phiếu tạm tính (TRƯỚC khi tạo đơn - dùng cartItems)
// ============================================================
const printCartPreview = (cartItems, totalAmount, guestName) => {
  const rows = cartItems.map(i => `
    <tr>
      <td>${i.serviceName}<br/><span style="font-size:11px;color:#888">${i.categoryName || ''}</span></td>
      <td align="center">${i.quantity}</td>
      <td align="right">${Number(i.unitPrice).toLocaleString('vi-VN')}đ</td>
      <td align="right"><b>${Number(i.unitPrice * i.quantity).toLocaleString('vi-VN')}đ</b></td>
    </tr>`).join('');

  const qrUrl = buildVietQR(totalAmount, `Tam tinh DV`);

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
    <title>Phiếu tạm tính</title>
    <style>
      @media print { body { margin: 0; } }
      body{font-family:'Segoe UI',sans-serif;padding:24px;max-width:420px;margin:auto;color:#111}
      h2{text-align:center;margin:0 0 2px;font-size:18px}
      .sub{text-align:center;color:#666;font-size:12px;margin-bottom:12px}
      hr{border:none;border-top:1px dashed #aaa;margin:10px 0}
      p{margin:2px 0;font-size:13px}
      table{width:100%;border-collapse:collapse;margin-top:12px}
      th{background:#f0f4ff;padding:6px 8px;font-size:12px;border-bottom:2px solid #99b;text-align:left}
      td{padding:6px 8px;font-size:13px;border-bottom:1px solid #eee;vertical-align:top}
      .total-row{font-size:17px;font-weight:700;color:#c00;text-align:right;margin-top:14px;border-top:2px solid #333;padding-top:10px}
      .qr-section{text-align:center;margin-top:14px;padding:10px;border:1px dashed #ccc;border-radius:8px}
      .qr-section img{width:160px;height:160px;display:block;margin:6px auto}
      .qr-label{font-size:11px;color:#555;margin-top:4px}
      .pending{text-align:center;background:#fff3cd;border:1px solid #ffc107;border-radius:4px;padding:6px;font-size:12px;font-weight:600;color:#856404;margin-top:12px}
      .note{text-align:center;margin-top:12px;font-size:11px;color:#666;font-style:italic}
    </style></head><body>
    <h2>ASTERIA RESORT</h2>
    <div class="sub">PHIẾU TẠM TÍNH – DỊCH VỤ KHÁCH VÃNG LAI</div>
    <hr/>
    <p><b>Ngày:</b> ${new Date().toLocaleString('vi-VN')}</p>
    ${guestName ? `<p><b>Khách:</b> ${guestName}</p>` : ''}
    <table>
      <thead><tr><th>Dịch vụ</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="total-row">TỔNG CỘNG: ${Number(totalAmount).toLocaleString('vi-VN')}đ</div>
    <div class="qr-section">
      <div style="font-size:12px;font-weight:700;margin-bottom:4px">📱 QUÉT QR CHUYỂN KHOẢN</div>
      <img src="${qrUrl}" alt="QR" onerror="this.style.display='none'"/>
      <div class="qr-label"><b>${BANK_CONFIG.bankId}</b> — ${BANK_CONFIG.accountNo}<br/>${BANK_CONFIG.accountName}</div>
    </div>
    <div class="pending">⏳ Vui lòng thanh toán trước khi sử dụng dịch vụ</div>
    <div class="note">Chuyển khoản / Tiền mặt / QR Pay<br/>Asteria Resort © 2026</div>
  </body></html>`;

  const win = window.open('', '_blank', 'width=480,height=820');
  win.document.write(html);
  win.document.close();
  win.focus();
  win.onload = () => setTimeout(() => win.print(), 200);
  setTimeout(() => { if (!win.closed) win.print(); }, 2500);
};

// ============================================================
// MODAL ĐẶT DỊCH VỤ (dùng chung cho in-house và vãng lai)
// ============================================================
const OrderServiceModal = ({ open, onClose, bookingDetailId, guestName, onSuccess }) => {
  const [form] = Form.useForm();
  const [categories, setCategories] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState(null);
  const [qty, setQty] = useState(1);
  // walk-in 3-step flow: 'cart' | 'preview' | 'success'
  const [step, setStep] = useState('cart');
  const [createdOrder, setCreatedOrder] = useState(null);

  const isWalkIn = !bookingDetailId;

  // Flatten services từ categories
  const allServices = categories.flatMap(c => c.services.map(s => ({ ...s, categoryName: c.name })));

  // Load dịch vụ khi modal mở
  useEffect(() => {
    if (!open) return;
    setCartItems([]);
    setSelectedServiceId(null);
    setQty(1);
    setStep('cart');
    setCreatedOrder(null);
    form.resetFields();

    const fetchServices = async () => {
      setLoadingServices(true);
      try {
        const res = await bookingManagementApi.getServices();
        if (res.data?.success) setCategories(res.data.data);
      } catch {
        message.error('Không thể tải danh sách dịch vụ.');
      } finally {
        setLoadingServices(false);
      }
    };
    fetchServices();
  }, [open, form]);

  const totalAmount = cartItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  const handleAddToCart = () => {
    if (!selectedServiceId) { message.warning('Vui lòng chọn dịch vụ.'); return; }
    const service = allServices.find(s => s.id === selectedServiceId);
    if (!service) return;
    setCartItems(prev => {
      const existing = prev.find(i => i.serviceId === service.id);
      if (existing) return prev.map(i => i.serviceId === service.id ? { ...i, quantity: i.quantity + qty } : i);
      return [...prev, { serviceId: service.id, serviceName: service.name, unitPrice: service.price, unit: service.unit || 'lần', quantity: qty, categoryName: service.categoryName }];
    });
    setSelectedServiceId(null);
    setQty(1);
  };

  const handleRemoveFromCart = (serviceId) => setCartItems(prev => prev.filter(i => i.serviceId !== serviceId));
  const handleQtyChange = (serviceId, newQty) => {
    if (newQty < 1) return;
    setCartItems(prev => prev.map(i => i.serviceId === serviceId ? { ...i, quantity: newQty } : i));
  };

  // Tạo đơn vào DB (chỉ gọi sau khi khách xác nhận thanh toán)
  const handleConfirmPaymentAndCreate = async () => {
    let notes;
    try { const values = await form.validateFields(); notes = values.notes; } catch { return; }

    setSubmitting(true);
    try {
      const guestNameInput = form.getFieldValue('guestName');
      const payload = {
        bookingDetailId: bookingDetailId ?? null,
        guestName: guestNameInput || null,
        items: cartItems.map(i => ({ serviceId: i.serviceId, quantity: i.quantity })),
        notes: notes || null,
      };

      const res = await bookingManagementApi.createOrder(payload);
      if (res.data?.success) {
        const orderId = res.data.data?.id ?? res.data.data?.Id;
        const orderCode = res.data.data?.orderCode ?? res.data.data?.OrderCode;

        // Tự động tạo hóa đơn walk-in vào hệ thống
        let invoiceCode = null;
        try {
          const invRes = await invoiceApi.createWalkInInvoice({
            orderId,
            guestName: guestNameInput || null,
            paymentMethod: 'CASH',
            transactionCode: null,
          });
          if (invRes.data?.success) {
            invoiceCode = invRes.data.invoiceCode;
            message.success(`✅ Hóa đơn ${invoiceCode} đã được lưu vào hệ thống.`);
          }
        } catch {
          // Không block luồng nếu tạo invoice lỗi
          message.warning('⚠️ Đơn đã tạo nhưng chưa lưu được hóa đơn.');
        }

        message.success(`✅ ${res.data.message}`);
        onSuccess?.();
        if (isWalkIn) {
          setCreatedOrder({ ...res.data.data, guestNameDisplay: guestNameInput, invoiceCode });
          setStep('success');
        } else {
          onClose();
        }
      } else {
        message.error(res.data?.message || 'Tạo đơn thất bại.');
      }
    } catch (err) {
      message.error(err?.response?.data?.message || 'Có lỗi xảy ra khi tạo đơn.');
    } finally {
      setSubmitting(false);
    }
  };

  // Non walk-in: submit thẳng 1 bước
  const handleSubmitInHouse = async () => {
    if (cartItems.length === 0) { message.warning('Giỏ hàng trống.'); return; }
    let notes;
    try { const values = await form.validateFields(); notes = values.notes; } catch { return; }
    setSubmitting(true);
    try {
      const res = await bookingManagementApi.createOrder({
        bookingDetailId: bookingDetailId ?? null,
        guestName: null,
        items: cartItems.map(i => ({ serviceId: i.serviceId, quantity: i.quantity })),
        notes: notes || null,
      });
      if (res.data?.success) { message.success(`✅ ${res.data.message}`); onSuccess?.(); onClose(); }
      else message.error(res.data?.message || 'Tạo đơn thất bại.');
    } catch (err) {
      message.error(err?.response?.data?.message || 'Có lỗi xảy ra khi tạo đơn.');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Title theo step ───
  const modalTitle = () => {
    if (!isWalkIn) return `Đặt dịch vụ – ${guestName || 'Khách đang lưu trú'}`;
    if (step === 'preview') return '🧾 Xem hóa đơn – Chờ thanh toán';
    if (step === 'success') return '✅ Đặt dịch vụ thành công';
    return 'Đặt dịch vụ – Khách vãng lai';
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      centered
      title={
        <Space>
          <ShoppingCartOutlined style={{ color: '#1890ff' }} />
          <span>{modalTitle()}</span>
        </Space>
      }
      width={760}
      footer={null}
      destroyOnClose
      styles={{
        body: {
          maxHeight: 'calc(100vh - 180px)',
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingRight: 4,
        },
      }}
    >
      {/* ═══════════════════════════════════════
          BƯỚC 3: SUCCESS (walk-in, sau khi lưu DB)
      ═══════════════════════════════════════ */}
      {step === 'success' && createdOrder ? (
        <div style={{ textAlign: 'center' }}>
          <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a', marginBottom: 12 }} />
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Thanh toán & Đặt dịch vụ thành công!</div>
          <div style={{ color: '#666', marginBottom: 16 }}>Mã đơn: <b>{createdOrder.orderCode}</b></div>
          <Table
            size="small"
            dataSource={createdOrder.items}
            rowKey={(r, idx) => r.detailId > 0 ? r.detailId : `s-${idx}`}
            pagination={false}
            style={{ marginBottom: 12, textAlign: 'left' }}
            columns={[
              { title: 'Dịch vụ', dataIndex: 'serviceName' },
              { title: 'SL', dataIndex: 'quantity', align: 'center', width: 40 },
              { title: 'Thành tiền', dataIndex: 'lineTotal', align: 'right',
                render: v => <Text strong style={{ color: '#1890ff' }}>{Number(v).toLocaleString('vi-VN')}đ</Text> },
            ]}
          />
          <div style={{ fontSize: 20, fontWeight: 700, color: '#c00', marginBottom: 20 }}>
            Tổng cộng: {Number(createdOrder.totalAmount).toLocaleString('vi-VN')}đ
          </div>
          <Space>
            <Button type="primary" icon={<PrinterOutlined />}
              onClick={() => printWalkInReceipt(createdOrder, createdOrder.guestNameDisplay)}>
              In hóa đơn chính thức
            </Button>
            <Button onClick={onClose}>Đóng</Button>
          </Space>
        </div>

      /* ═══════════════════════════════════════
         BƯỚC 2: XEM HÓA ĐƠN TẠM (walk-in)
         In ra → khách thanh toán → xác nhận
      ═══════════════════════════════════════ */
      ) : step === 'preview' && isWalkIn ? (
        <div>
          <Alert
            type="info"
            showIcon
            message="Đưa phiếu này cho khách thanh toán"
            description='Sau khi khách chuyển khoản hoặc trả tiền mặt, nhấn "Xác nhận đã thanh toán" để lưu đơn.'
            style={{ marginBottom: 16 }}
          />

          {/* Tên khách */}
          <Form form={form} layout="vertical">
            <Form.Item name="guestName" label={<Text type="secondary">Tên khách (tùy chọn)</Text>}>
              <Input prefix={<UserOutlined />} placeholder="Không bắt buộc" />
            </Form.Item>
          </Form>

          {/* Bảng dịch vụ tạm tính */}
          <Table
            size="small"
            dataSource={cartItems}
            rowKey="serviceId"
            pagination={false}
            style={{ marginBottom: 8 }}
            columns={[
              { title: 'Dịch vụ', dataIndex: 'serviceName',
                render: (name, r) => <div><div>{name}</div><Text type="secondary" style={{ fontSize: 11 }}>{r.categoryName}</Text></div> },
              { title: 'SL', dataIndex: 'quantity', align: 'center', width: 50 },
              { title: 'Đơn giá', dataIndex: 'unitPrice', align: 'right', width: 120,
                render: (v, r) => `${Number(v).toLocaleString('vi-VN')}đ/${r.unit}` },
              { title: 'Thành tiền', align: 'right', width: 120,
                render: (_, r) => <Text strong style={{ color: '#1890ff' }}>{Number(r.unitPrice * r.quantity).toLocaleString('vi-VN')}đ</Text> },
            ]}
          />
          <div style={{ textAlign: 'right', marginBottom: 16 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#c00' }}>
              TỔNG CỘNG: {Number(totalAmount).toLocaleString('vi-VN')}đ
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <Button icon={<PrinterOutlined />}
              onClick={() => printCartPreview(cartItems, totalAmount, form.getFieldValue('guestName'))}>
              In phiếu cho khách
            </Button>
            <Space>
              <Button onClick={() => setStep('cart')}>← Quay lại chỉnh sửa</Button>
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                loading={submitting}
                onClick={handleConfirmPaymentAndCreate}
                style={{ background: '#52c41a', borderColor: '#52c41a' }}
              >
                ✅ Xác nhận đã thanh toán
              </Button>
            </Space>
          </div>
        </div>

      /* ═══════════════════════════════════════
         BƯỚC 1: GIỎ HÀNG (cả walk-in và in-house)
      ═══════════════════════════════════════ */
      ) : (
      <Spin spinning={loadingServices}>
        {/* Chọn dịch vụ */}
        <div style={{ marginBottom: 8 }}>
          <Text strong>Chọn dịch vụ</Text>
        </div>
        <Row gutter={8} style={{ marginBottom: 16 }}>
          <Col flex="auto">
            <Select
              showSearch
              placeholder="Tìm và chọn dịch vụ..."
              style={{ width: '100%' }}
              value={selectedServiceId}
              onChange={setSelectedServiceId}
              optionFilterProp="label"
              options={categories.flatMap(c =>
                c.services.map(s => ({
                  label: `${s.name} — ${Number(s.price).toLocaleString('vi-VN')}đ/${s.unit || 'lần'}`,
                  value: s.id,
                  category: c.name,
                }))
              )}
              optionRender={(opt) => (
                <div>
                  <div>{opt.data.label}</div>
                  <Text type="secondary" style={{ fontSize: 11 }}>{opt.data.category}</Text>
                </div>
              )}
            />
          </Col>
          <Col>
            <InputNumber min={1} max={99} value={qty} onChange={v => setQty(v || 1)} style={{ width: 70 }} />
          </Col>
          <Col>
            <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddToCart}>Thêm</Button>
          </Col>
        </Row>

        {/* Giỏ hàng */}
        {cartItems.length === 0 ? (
          <Empty description="Chưa có dịch vụ nào trong giỏ" style={{ marginBottom: 16 }} />
        ) : (
          <>
            <Table
              size="small"
              dataSource={cartItems}
              rowKey="serviceId"
              pagination={false}
              style={{ marginBottom: 12 }}
              columns={[
                { title: 'Dịch vụ', dataIndex: 'serviceName',
                  render: (name, r) => <div><div>{name}</div><Text type="secondary" style={{ fontSize: 11 }}>{r.categoryName}</Text></div> },
                { title: 'Đơn giá', dataIndex: 'unitPrice', align: 'right',
                  render: (v, r) => `${Number(v).toLocaleString('vi-VN')}đ/${r.unit}` },
                { title: 'SL', dataIndex: 'quantity', align: 'center', width: 80,
                  render: (qty, r) => (
                    <InputNumber size="small" min={1} max={99} value={qty}
                      onChange={v => handleQtyChange(r.serviceId, v || 1)} style={{ width: 60 }} />
                  ) },
                { title: 'Thành tiền', align: 'right',
                  render: (_, r) => <Text strong style={{ color: '#1890ff' }}>{Number(r.unitPrice * r.quantity).toLocaleString('vi-VN')}đ</Text> },
                { title: '', width: 40,
                  render: (_, r) => <Button type="text" danger icon={<DeleteOutlined />} size="small" onClick={() => handleRemoveFromCart(r.serviceId)} /> },
              ]}
            />
            <div style={{ textAlign: 'right', marginBottom: 16 }}>
              <Statistic
                title="Tổng tiền"
                value={totalAmount}
                suffix="đ"
                formatter={v => Number(v).toLocaleString('vi-VN')}
                valueStyle={{ color: '#cf1322', fontSize: 20, fontWeight: 700 }}
              />
            </div>
          </>
        )}

        {/* Ghi chú */}
        {!isWalkIn && (
          <Form form={form} layout="vertical">
            <Form.Item name="notes" label="Ghi chú">
              <Input.TextArea rows={2} placeholder="Ghi chú thêm cho đơn dịch vụ..." />
            </Form.Item>
          </Form>
        )}

        {/* Footer buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={onClose}>Hủy</Button>
          {isWalkIn ? (
            <Button
              type="primary"
              icon={<PrinterOutlined />}
              disabled={cartItems.length === 0}
              onClick={() => {
                if (cartItems.length === 0) { message.warning('Giỏ hàng trống.'); return; }
                setStep('preview');
              }}
            >
              Xem hóa đơn & Thanh toán →
            </Button>
          ) : (
            <Button
              type="primary"
              icon={<ShoppingCartOutlined />}
              loading={submitting}
              disabled={cartItems.length === 0}
              onClick={handleSubmitInHouse}
            >
              Xác nhận đặt dịch vụ
            </Button>
          )}
        </div>
      </Spin>
      )}
    </Modal>
  );
};


// ============================================================
// EXPANDED ROW: Lịch sử đơn dịch vụ + nút điều khiển workflow
// ============================================================
const OrderHistoryPanel = ({ bookingDetailId }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // orderId đang xử lý

  const fetchOrders = useCallback(async () => {
    if (!bookingDetailId) return;
    setLoading(true);
    try {
      const res = await bookingManagementApi.getOrdersByBookingDetail(bookingDetailId);
      if (res.data?.success) setOrders(res.data.data);
    } catch {
      message.error('Không thể tải lịch sử dịch vụ.');
    } finally {
      setLoading(false);
    }
  }, [bookingDetailId]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleStatusUpdate = async (orderId, newStatus) => {
    setActionLoading(orderId);
    try {
      const res = await bookingManagementApi.updateOrderStatus(orderId, newStatus);
      if (res.data?.success) {
        message.success(res.data.message);
        // Tự động ghi nợ vào folio khi hoàn tất
        if (newStatus === 'Completed') {
          try {
            const folioRes = await bookingManagementApi.postOrderToFolio(orderId);
            if (folioRes.data?.success) {
              message.success('✅ Đã tự động ghi nợ vào hóa đơn phòng.');
            }
          } catch {
            // Đơn vãng lai hoặc folio lỗi → không block
          }
        }
        fetchOrders();
      } else {
        message.error(res.data?.message || 'Cập nhật thất bại.');
      }
    } catch (err) {
      message.error(err?.response?.data?.message || 'Có lỗi xảy ra.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelItem = async (detailId) => {
    setActionLoading(`detail-${detailId}`);
    try {
      const res = await bookingManagementApi.cancelOrderDetail(detailId);
      if (res.data?.success) {
        message.success(res.data.message);
        fetchOrders();
      } else {
        message.error(res.data?.message || 'Không thể hủy dịch vụ.');
      }
    } catch (err) {
      message.error(err?.response?.data?.message || 'Có lỗi xảy ra.');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePostToFolio = async (orderId) => {
    setActionLoading(orderId);
    try {
      const res = await bookingManagementApi.postOrderToFolio(orderId);
      if (res.data?.success) {
        message.success(res.data.message);
        fetchOrders();
      } else {
        message.error(res.data?.message || 'Ghi nợ thất bại.');
      }
    } catch (err) {
      message.error(err?.response?.data?.message || 'Có lỗi xảy ra.');
    } finally {
      setActionLoading(null);
    }
  };

  const [activeOrderKeys, setActiveOrderKeys] = useState([]);

  if (loading) return <Spin size="small" style={{ display: 'block', margin: '16px auto' }} />;
  if (orders.length === 0)
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="Chưa có đơn dịch vụ nào"
        style={{ margin: '12px 0' }}
      />
    );

  return (
    <div style={{ padding: '0 16px 8px' }}>
      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
        Lịch sử đơn dịch vụ ({orders.length} đơn)
      </Text>
      <Collapse
        size="small"
        ghost
        activeKey={activeOrderKeys}
        onChange={(keys) => setActiveOrderKeys(keys)}
      >
        {orders.map(order => (
          <Panel
            key={order.id}
            header={
              <Space wrap>
                <Tag color={ORDER_STATUS_COLOR[order.status] || 'default'}>
                  {ORDER_STATUS_LABEL[order.status] || order.status}
                </Tag>
                <Text strong>{order.orderCode}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {dayjs(order.orderDate).format('DD/MM HH:mm')}
                </Text>
                <Text strong style={{ color: '#cf1322' }}>
                  {Number(order.totalAmount).toLocaleString('vi-VN')}đ
                </Text>
                {order.isPostedToFolio && (
                  <Tag color="purple" style={{ fontSize: 11 }}>Đã ghi folio</Tag>
                )}
              </Space>
            }
          >
            {/* Bảng dịch vụ */}
            {(!order.items || order.items.length === 0) ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Không có dịch vụ nào"
                style={{ margin: '8px 0' }}
              />
            ) : (
            <Table
              size="small"
              dataSource={order.items}
              rowKey={(r, idx) => r.detailId > 0 ? r.detailId : `fallback-${idx}`}
              pagination={false}
              style={{ marginBottom: 8 }}
              rowClassName={(r) => r.status === 'Cancelled' ? 'opacity-50' : ''}
              columns={[
                {
                  title: 'Dịch vụ',
                  dataIndex: 'serviceName',
                  render: (name, r) => (
                    <span style={{ textDecoration: r.status === 'Cancelled' ? 'line-through' : 'none', color: r.status === 'Cancelled' ? '#999' : undefined }}>
                      {name}
                    </span>
                  ),
                },
                { title: 'SL', dataIndex: 'quantity', align: 'center', width: 40 },
                {
                  title: 'Đơn giá', dataIndex: 'unitPrice', align: 'right', width: 110,
                  render: v => `${Number(v).toLocaleString('vi-VN')}đ`,
                },
                {
                  title: 'Thành tiền', dataIndex: 'lineTotal', align: 'right', width: 110,
                  render: (v, r) => (
                    <Text strong style={{ color: r.status === 'Cancelled' ? '#999' : '#1890ff', textDecoration: r.status === 'Cancelled' ? 'line-through' : 'none' }}>
                      {Number(v).toLocaleString('vi-VN')}đ
                    </Text>
                  ),
                },
                {
                  title: 'Trạng thái',
                  dataIndex: 'status',
                  align: 'center',
                  width: 100,
                  render: (s) => (
                    <Tag color={s === 'Cancelled' ? 'red' : 'green'} style={{ fontSize: 11 }}>
                      {s === 'Cancelled' ? 'Đã hủy' : 'Hoạt động'}
                    </Tag>
                  ),
                },
                {
                  title: '',
                  width: 36,
                  render: (_, r) => (
                    r.status !== 'Cancelled' && (order.status === 'Booked' || order.status === 'InProgress') ? (
                      <Popconfirm
                        title={`Hủy dịch vụ "${r.serviceName}"?`}
                        description="Thao tác này không thể hoàn tác."
                        onConfirm={() => handleCancelItem(r.detailId)}
                        okText="Hủy dịch vụ" cancelText="Giữ lại" okType="danger"
                      >
                        <Button
                          type="text"
                          danger
                          icon={<CloseCircleOutlined />}
                          size="small"
                          loading={actionLoading === `detail-${r.detailId}`}
                        />
                      </Popconfirm>
                    ) : null
                  ),
                },
              ]}
            />
            )}

            {/* Ghi chú */}
            {order.notes && (
              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>
                📝 {order.notes}
              </Text>
            )}

            {/* Nút điều khiển workflow */}
            <Space wrap size="small">
              {/* Booked → InProgress */}
              {order.status === 'Booked' && (
                <Popconfirm
                  title="Bắt đầu thực hiện dịch vụ?"
                  onConfirm={() => handleStatusUpdate(order.id, 'InProgress')}
                  okText="Bắt đầu" cancelText="Hủy"
                >
                  <Button
                    size="small" type="primary"
                    icon={<PlayCircleOutlined />}
                    loading={actionLoading === order.id}
                  >
                    Bắt đầu
                  </Button>
                </Popconfirm>
              )}

              {/* InProgress → Completed */}
              {order.status === 'InProgress' && (
                <Popconfirm
                  title="Xác nhận hoàn tất dịch vụ?"
                  onConfirm={() => handleStatusUpdate(order.id, 'Completed')}
                  okText="Hoàn tất" cancelText="Hủy"
                >
                  <Button
                    size="small" type="primary" style={{ background: '#52c41a', borderColor: '#52c41a' }}
                    icon={<CheckCircleOutlined />}
                    loading={actionLoading === order.id}
                  >
                    Hoàn tất
                  </Button>
                </Popconfirm>
              )}

              {/* Ghi nợ vào folio (chỉ khi Completed và chưa post) */}
              {order.status === 'Completed' && !order.isPostedToFolio && (
                <Popconfirm
                  title={`Ghi nợ ${Number(order.totalAmount).toLocaleString('vi-VN')}đ vào hóa đơn phòng?`}
                  description="Khách sẽ thanh toán khi Check-out."
                  onConfirm={() => handlePostToFolio(order.id)}
                  okText="Ghi nợ" cancelText="Hủy" okType="primary"
                >
                  <Button
                    size="small"
                    icon={<DollarOutlined />}
                    style={{ borderColor: '#722ed1', color: '#722ed1' }}
                    loading={actionLoading === order.id}
                  >
                    Ghi nợ vào phòng
                  </Button>
                </Popconfirm>
              )}

              {/* Huỷ đơn (Booked hoặc InProgress) */}
              {(order.status === 'Booked' || order.status === 'InProgress') && (
                <Popconfirm
                  title="Xác nhận hủy đơn dịch vụ này?"
                  onConfirm={() => handleStatusUpdate(order.id, 'Cancelled')}
                  okText="Hủy đơn" cancelText="Giữ lại" okType="danger"
                >
                  <Button
                    size="small" danger
                    icon={<CloseCircleOutlined />}
                    loading={actionLoading === order.id}
                  >
                    Hủy đơn
                  </Button>
                </Popconfirm>
              )}
            </Space>
          </Panel>
        ))}
      </Collapse>
    </div>
  );
};

// ============================================================
// MAIN COMPONENT: InHouse
// ============================================================
const InHouse = () => {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTarget, setModalTarget] = useState({ bookingDetailId: null, guestName: '' });

  // Walk-in POS modal
  const [walkInModalOpen, setWalkInModalOpen] = useState(false);

  const fetchInHouse = useCallback(async () => {
    setLoading(true);
    try {
      const response = await bookingManagementApi.getInHouseGuests();
      if (response.data?.success) {
        setData(response.data.data);
      }
    } catch (error) {
      console.error('Lỗi khi tải danh sách khách đang lưu trú:', error);
      message.error('Không thể tải dữ liệu khách đang lưu trú.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInHouse();
  }, [fetchInHouse]);

  // ── SignalR real-time: lắng nghe đơn dịch vụ mới ──────────────────────────
  const { connection } = useSignalR();
  useEffect(() => {
    if (!connection) return;
    const handler = (payload) => {
      // Auto refresh danh sách khách lưu trú
      fetchInHouse();
      // Toast realtime
      notification.info({
        message: '🛒 Đơn dịch vụ mới',
        description: (
          <div>
            <div><b>Mã đơn:</b> {payload.orderCode}</div>
            <div><b>Khách:</b> {payload.guestName || 'Vãng lai'}</div>
            <div><b>Tổng tiền:</b> {Number(payload.totalAmount).toLocaleString('vi-VN')}đ</div>
            <div style={{ color: payload.isWalkIn ? '#fa8c16' : '#52c41a', fontSize: 12, marginTop: 4 }}>
              {payload.isWalkIn ? '🚶 Khách vãng lai' : `🏨 ${payload.roomInfo}`}
            </div>
          </div>
        ),
        placement: 'topRight',
        duration: 8,
      });
    };
    connection.on('NewServiceOrder', handler);
    return () => connection.off('NewServiceOrder', handler);
  }, [connection, fetchInHouse]);
  // ─────────────────────────────────────────────────────────────────

  const handleCopy = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    message.success('Đã copy mã booking');
  };

  const openOrderModal = (record) => {
    const detail = record.details?.[0];
    setModalTarget({
      bookingDetailId: detail?.id ?? null,
      guestName: record.guestName,
    });
    setModalOpen(true);
  };

  const filteredData = data.filter((item) => {
    const detail = item.details?.[0];
    return (
      item.guestName?.toLowerCase().includes(searchText.toLowerCase()) ||
      item.bookingCode?.toLowerCase().includes(searchText.toLowerCase()) ||
      detail?.roomNumber?.toLowerCase().includes(searchText.toLowerCase())
    );
  });

  const columns = [
    {
      title: 'Phòng',
      key: 'roomName',
      render: (_, record) => (
        <Typography.Text strong style={{ color: '#1890ff' }}>
          {record.details?.[0]?.roomNumber || 'Chưa xếp phòng'}
        </Typography.Text>
      ),
    },
    {
      title: 'Khách hàng',
      key: 'customerName',
      render: (_, record) => record.guestName,
    },
    {
      title: 'Mã Booking',
      dataIndex: 'bookingCode',
      key: 'bookingCode',
      render: (text) => (
        <Space>
          <Typography.Text>{text}</Typography.Text>
          {text && (
            <Tooltip title="Copy">
              <CopyOutlined
                style={{ color: '#1890ff', cursor: 'pointer' }}
                onClick={() => handleCopy(text)}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'Hạng phòng',
      key: 'roomType',
      render: (_, record) => record.details?.[0]?.roomTypeName,
    },
    {
      title: 'Giờ Check-in thực tế',
      key: 'actualCheckIn',
      render: (_, record) => {
        const date = record.details?.[0]?.actualCheckInAt;
        return date ? dayjs(date).format('DD/MM/YYYY HH:mm') : '';
      },
    },
    {
      title: 'Dự kiến Check-out',
      key: 'expectedCheckOut',
      render: (_, record) => {
        const date = record.details?.[0]?.checkOutDate;
        return date ? dayjs(date).format('DD/MM/YYYY HH:mm') : '';
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Xem chi tiết booking">
            <Button
              icon={<EyeOutlined />}
              size="small"
              onClick={() => navigate('/admin/bookings/' + record.bookingCode)}
            />
          </Tooltip>
          <Tooltip title="Đặt dịch vụ cho khách">
            <Button
              icon={<ShoppingCartOutlined />}
              size="small"
              type="primary"
              ghost
              onClick={() => openOrderModal(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card
        title={<Title level={4} style={{ margin: 0 }}>Khách đang lưu trú (In-House)</Title>}
        bordered={false}
        style={{ margin: 24, borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
        extra={
          <Button
            type="primary"
            icon={<ShoppingCartOutlined />}
            onClick={() => setWalkInModalOpen(true)}
          >
            Khách vãng lai – Đặt dịch vụ
          </Button>
        }
      >
        <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 16 }}>
          <Input
            placeholder="Tìm theo Số phòng, Tên khách, Mã Booking..."
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 400 }}
          />
        </div>

        <Table
          columns={columns}
          dataSource={filteredData}
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: 'Không có dữ liệu' }}
          expandable={{
            expandedRowRender: (record) => (
              <OrderHistoryPanel bookingDetailId={record.details?.[0]?.id} />
            ),
            rowExpandable: (record) => !!record.details?.[0]?.id,
            expandRowByClick: false,
          }}
        />
      </Card>

      {/* Modal đặt dịch vụ cho khách in-house */}
      <OrderServiceModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        bookingDetailId={modalTarget.bookingDetailId}
        guestName={modalTarget.guestName}
        onSuccess={fetchInHouse}
      />

      {/* Modal đặt dịch vụ POS cho khách vãng lai */}
      <OrderServiceModal
        open={walkInModalOpen}
        onClose={() => setWalkInModalOpen(false)}
        bookingDetailId={null}
        guestName={null}
        onSuccess={() => message.success('Đơn vãng lai đã được ghi nhận.')}
      />
    </>
  );
};

export default InHouse;
