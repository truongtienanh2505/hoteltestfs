import React, { useEffect, useMemo, useState } from 'react';
import { Button, Space, Tag, message } from 'antd';
import { PrinterOutlined, ThunderboltOutlined, CheckCircleOutlined } from '@ant-design/icons';
import invoiceApi from '../../../api/invoiceApi';
import QuickActionModal from './QuickActionModal';
import FinalizeInvoiceModal from './FinalizeInvoiceModal';

const getValue = (obj, ...keys) => {
  for (const key of keys) {
    if (obj?.[key] !== undefined && obj?.[key] !== null) return obj[key];
  }
  return undefined;
};

const buildPrintableHtml = (payload) => {
  const bookingId = getValue(payload, 'bookingId', 'BookingId') || '';
  const bookingCode = getValue(payload, 'bookingCode', 'BookingCode') || '';
  const customerName =
    getValue(payload, 'customerName', 'CustomerName', 'guestName', 'GuestName') || 'Khách lẻ';

  const invoiceId = getValue(payload, 'invoiceId', 'InvoiceId') || '';
  const invoiceCode = getValue(payload, 'invoiceCode', 'InvoiceCode') || '';
  const grossTotal = getValue(payload, 'grossTotal', 'GrossTotal') ?? 0;
  const depositAmount = getValue(payload, 'depositAmount', 'DepositAmount') || 0;
  const finalTotal = getValue(payload, 'finalTotal', 'FinalTotal') || 0;
  const invoiceStatus = getValue(payload, 'invoiceStatus', 'InvoiceStatus') || '';
  const totalStayNights = getValue(payload, 'totalStayNights', 'TotalStayNights') || 0;
  const totalRoomAmount = getValue(payload, 'totalRoomAmount', 'TotalRoomAmount') || 0;
  const totalServiceAmount = getValue(payload, 'totalServiceAmount', 'TotalServiceAmount') || 0;
  const totalDamageAmount = getValue(payload, 'totalDamageAmount', 'TotalDamageAmount') || 0;
  const manualAdjustmentAmount = getValue(payload, 'manualAdjustmentAmount', 'ManualAdjustmentAmount') || 0;
  const discountAmount = getValue(payload, 'discountAmount', 'DiscountAmount') || 0;
  const taxAmount = getValue(payload, 'taxAmount', 'TaxAmount') || 0;
  const roomNumbers = getValue(payload, 'roomNumbers', 'RoomNumbers') || [];
  const bookingDetailIds = getValue(payload, 'bookingDetailIds', 'BookingDetailIds') || [];
  const notes = getValue(payload, 'notes', 'Notes') || '';

  const money = (val) =>
    new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(val || 0);

  return `
    <html>
      <head>
        <title>In bản nháp hóa đơn</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
          h1 { margin-bottom: 8px; }
          .meta { margin-bottom: 20px; }
          .meta div { margin-bottom: 6px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { border: 1px solid #d1d5db; padding: 10px; text-align: left; }
          th { background: #f3f4f6; }
          .final { font-size: 20px; font-weight: bold; color: #dc2626; margin-top: 12px; }
          .note { margin-top: 18px; white-space: pre-wrap; }
        </style>
      </head>
      <body>
        <h1>HÓA ĐƠN TẠM TÍNH</h1>
        <div class="meta">
          <div><b>Tên khách hàng:</b> ${customerName}</div>
          <div><b>Invoice ID:</b> ${invoiceId}</div>
          <div><b>Booking ID:</b> ${bookingId}</div>
          <div><b>Mã booking:</b> ${bookingCode}</div>
          <div><b>Mã hóa đơn:</b> ${invoiceCode}</div>
          <div><b>Trạng thái:</b> ${invoiceStatus}</div>
          <div><b>Phòng:</b> ${(roomNumbers || []).join(', ') || 'Không có'}</div>
          <div><b>Số ngày/đêm đã ở:</b> ${totalStayNights} ngày</div>
          <div><b>BookingDetailIds:</b> ${(bookingDetailIds || []).join(', ') || 'Không có'}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Khoản mục</th>
              <th>Số tiền</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Số ngày/đêm đã ở</td><td>${totalStayNights} ngày</td></tr>
            <tr><td>Tiền phòng</td><td>${money(totalRoomAmount)}</td></tr>
            <tr><td>Tiền dịch vụ</td><td>${money(totalServiceAmount)}</td></tr>
            <tr><td>Tiền đền bù</td><td>${money(totalDamageAmount)}</td></tr>
            <tr><td>Phụ phí thêm tay</td><td>${money(manualAdjustmentAmount)}</td></tr>
            <tr><td>Giảm giá</td><td>${money(discountAmount)}</td></tr>
            <tr><td>VAT</td><td>${money(taxAmount)}</td></tr>
            <tr><td><b>Tổng tiền hóa đơn</b></td><td><b>${money(grossTotal || finalTotal)}</b></td></tr>
            <tr><td><b>Tiền cọc đã thu</b></td><td><b>-${money(depositAmount)}</b></td></tr>
          </tbody>
        </table>

        <div class="final">SỐ TIỀN CẦN THANH TOÁN: ${money(finalTotal)}</div>

        <div class="note">
          <b>Ghi chú:</b><br/>
          ${notes || 'Không có'}
        </div>

        <script>
          window.onload = function () {
            window.print();
          };
        </script>
      </body>
    </html>
  `;
};

const normalizeIds = (ids = []) =>
  Array.from(new Set((Array.isArray(ids) ? ids : [ids]).map(Number).filter(Boolean))).sort((a, b) => a - b);

const InvoiceActionButtons = ({
  bookingId,
  bookingDetailId,
  bookingDetailIds,
  invoiceId,
  invoiceStatus,
  onChanged,
  onInvoiceCreated,
}) => {
  const [quickActionOpen, setQuickActionOpen] = useState(false);
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [activeInvoiceId, setActiveInvoiceId] = useState(invoiceId || null);

  useEffect(() => {
    setActiveInvoiceId(invoiceId || null);
  }, [invoiceId]);

  const resolvedDetailIds = useMemo(() => {
    const explicitIds = normalizeIds(bookingDetailIds);
    if (explicitIds.length) return explicitIds;
    if (bookingDetailId) return normalizeIds([bookingDetailId]);
    return [];
  }, [bookingDetailId, bookingDetailIds]);

  const normalizedStatus = String(invoiceStatus || '').toUpperCase();
  const isPaid = normalizedStatus === 'PAID';

  const ensureInvoiceId = async () => {
    if (activeInvoiceId) return activeInvoiceId;

    if (!bookingId) {
      throw new Error('Không có Booking ID để tạo hóa đơn.');
    }

    setResolving(true);
    try {
      let nextDetailIds = [...resolvedDetailIds];

      if (!nextDetailIds.length) {
        const eligibleRes = await invoiceApi.getEligibleBookingDetails(bookingId);
        const eligibleRows = eligibleRes?.data?.data || eligibleRes?.data || [];

        nextDetailIds = Array.isArray(eligibleRows)
          ? eligibleRows
              .filter((x) => (x?.canCreateInvoice ?? x?.CanCreateInvoice) === true)
              .map((x) => x?.bookingDetailId ?? x?.BookingDetailId)
              .filter(Boolean)
          : [];
      }

      if (!nextDetailIds.length) {
        throw new Error('Không có phòng nào đủ điều kiện để tạo hóa đơn.');
      }

      const createRes = await invoiceApi.createDraftInvoice({
        bookingId,
        bookingDetailIds: normalizeIds(nextDetailIds),
        note: 'Tạo invoice nháp từ màn hình quản lý hóa đơn theo booking',
      });

      const created = createRes?.data?.data || createRes?.data || {};
      const newInvoiceId = created?.invoiceId || created?.InvoiceId;

      if (!newInvoiceId) {
        throw new Error('Tạo invoice nháp không thành công.');
      }

      setActiveInvoiceId(newInvoiceId);
      onInvoiceCreated?.(newInvoiceId);
      await onChanged?.();

      message.success('Đã tạo hóa đơn nháp để tiếp tục thao tác.');
      return newInvoiceId;
    } finally {
      setResolving(false);
    }
  };

  const handlePrintDraft = async () => {
    try {
      setPrinting(true);
      const actualInvoiceId = await ensureInvoiceId();

      const res = await invoiceApi.getInvoiceDetail(actualInvoiceId);
      const payload = res?.data?.data || res?.data || {};

      const html = buildPrintableHtml(payload);
      const printWindow = window.open('', '_blank', 'width=900,height=700');

      if (!printWindow) {
        message.error('Trình duyệt đang chặn popup in.');
        return;
      }

      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
    } catch (error) {
      console.error('Print draft error:', error);
      message.error(error?.response?.data?.message || error?.message || 'Không in được bản nháp.');
    } finally {
      setPrinting(false);
    }
  };

  const handleOpenQuickAction = async () => {
    try {
      const actualInvoiceId = await ensureInvoiceId();
      setActiveInvoiceId(actualInvoiceId);
      setQuickActionOpen(true);
    } catch (error) {
      console.error('Open quick action error:', error);
      message.error(error?.response?.data?.message || error?.message || 'Không mở được thao tác nhanh.');
    }
  };

  const handleOpenFinalize = async () => {
    try {
      const actualInvoiceId = await ensureInvoiceId();
      setActiveInvoiceId(actualInvoiceId);
      setFinalizeOpen(true);
    } catch (error) {
      console.error('Open finalize error:', error);
      message.error(error?.response?.data?.message || error?.message || 'Không mở được bảng thanh toán.');
    }
  };

  const hasSource = !!(bookingId || activeInvoiceId);

  return (
    <>
      <Space wrap>
        <Button icon={<PrinterOutlined />} onClick={handlePrintDraft} loading={printing || resolving} disabled={!hasSource}>
          In bản nháp
        </Button>

        <Button icon={<ThunderboltOutlined />} onClick={handleOpenQuickAction} loading={resolving} disabled={!hasSource || isPaid}>
          Thao tác nhanh
        </Button>

        <Button type="primary" icon={<CheckCircleOutlined />} onClick={handleOpenFinalize} loading={resolving} disabled={!hasSource || isPaid}>
          Chốt hóa đơn
        </Button>

        {isPaid && <Tag color="green">Đã thanh toán</Tag>}
      </Space>

      <QuickActionModal
        open={quickActionOpen}
        invoiceId={activeInvoiceId}
        onCancel={() => setQuickActionOpen(false)}
        onSuccess={async () => {
          setQuickActionOpen(false);
          await onChanged?.();
        }}
      />

      <FinalizeInvoiceModal
        open={finalizeOpen}
        invoiceId={activeInvoiceId}
        onCancel={() => setFinalizeOpen(false)}
        onSuccess={async () => {
          setFinalizeOpen(false);
          await onChanged?.();
        }}
      />
    </>
  );
};

export default InvoiceActionButtons;
