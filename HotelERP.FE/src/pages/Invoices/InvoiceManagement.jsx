import React, { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Divider,
  InputNumber,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  FileSearchOutlined,
  FileAddOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import invoiceApi from '../../api/invoiceApi';
import InvoiceActionButtons from './components/InvoiceActionButtons';

const { Title, Paragraph, Text } = Typography;

const money = (value) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(value || 0);

const normalizeInvoicePayload = (payload = {}, oldRecord = {}) => ({
  key: payload.invoiceId ?? payload.InvoiceId ?? oldRecord.key,
  invoiceId: payload.invoiceId ?? payload.InvoiceId ?? oldRecord.invoiceId,
  bookingId: payload.bookingId ?? payload.BookingId ?? oldRecord.bookingId,
  bookingCode: payload.bookingCode ?? payload.BookingCode ?? oldRecord.bookingCode ?? '',
  invoiceCode: payload.invoiceCode ?? payload.InvoiceCode ?? oldRecord.invoiceCode ?? '',
  invoiceStatus: payload.invoiceStatus ?? payload.InvoiceStatus ?? oldRecord.invoiceStatus ?? 'Draft',
  bookingStatus: payload.bookingStatus ?? payload.BookingStatus ?? oldRecord.bookingStatus ?? '-',
  paymentStatus: payload.paymentStatus ?? payload.PaymentStatus ?? oldRecord.paymentStatus ?? '-',
  bookingDetailIds: payload.bookingDetailIds ?? payload.BookingDetailIds ?? oldRecord.bookingDetailIds ?? [],
  roomNumbers: payload.roomNumbers ?? payload.RoomNumbers ?? oldRecord.roomNumbers ?? [],
  finalTotal: payload.finalTotal ?? payload.FinalTotal ?? oldRecord.finalTotal ?? 0,
  updatedAt: payload.updatedAt ?? payload.UpdatedAt ?? new Date().toISOString(),
});

const statusColor = (status) => {
  const s = (status || '').toUpperCase();
  if (s === 'PAID') return 'green';
  if (s === 'DRAFT' || s === 'UNPAID') return 'gold';
  if (s === 'REFUNDED') return 'blue';
  return 'default';
};

const InvoiceManagement = () => {
  const [bookingId, setBookingId] = useState(null);
  const [eligibleRows, setEligibleRows] = useState([]);
  const [selectedDetailIds, setSelectedDetailIds] = useState([]);
  const [invoiceRows, setInvoiceRows] = useState([]);
  const [loadingEligible, setLoadingEligible] = useState(false);
  const [creatingDraft, setCreatingDraft] = useState(false);

  const handleLoadEligible = async () => {
    if (!bookingId || bookingId <= 0) {
      message.warning('Nhập bookingId hợp lệ trước đã.');
      return;
    }

    try {
      setLoadingEligible(true);
      const res = await invoiceApi.getEligibleBookingDetails(bookingId);
      const rows = res?.data?.data || [];
      setEligibleRows(rows);
      setSelectedDetailIds([]);
      message.success(res?.data?.message || 'Đã tải danh sách phòng đủ điều kiện.');
    } catch (error) {
      console.error('Load eligible booking details error:', error);
      message.error(error?.response?.data?.message || 'Không tải được danh sách phòng đủ điều kiện.');
    } finally {
      setLoadingEligible(false);
    }
  };

  const addOrUpdateInvoiceRow = (payload) => {
    const normalized = normalizeInvoicePayload(payload);

    setInvoiceRows((prev) => {
      const exists = prev.some((x) => x.invoiceId === normalized.invoiceId);
      if (exists) {
        return prev.map((item) =>
          item.invoiceId === normalized.invoiceId ? { ...item, ...normalized } : item
        );
      }

      return [normalized, ...prev];
    });
  };

  const handleCreateDraft = async () => {
    if (!bookingId || bookingId <= 0) {
      message.warning('Nhập bookingId trước.');
      return;
    }

    if (selectedDetailIds.length === 0) {
      message.warning('Chọn ít nhất 1 phòng đã checkout.');
      return;
    }

    try {
      setCreatingDraft(true);

      const res = await invoiceApi.createDraftInvoice({
        bookingId,
        bookingDetailIds: selectedDetailIds,
        note: 'Tạo draft invoice từ giao diện gói 2 theo Hướng B',
      });

      const payload = res?.data?.data || {};
      addOrUpdateInvoiceRow(payload);
      message.success(res?.data?.message || 'Tạo hóa đơn tạm tính thành công.');

      await handleLoadEligible();
    } catch (error) {
      console.error('Create draft invoice error:', error);
      message.error(error?.response?.data?.message || 'Không tạo được hóa đơn tạm tính.');
    } finally {
      setCreatingDraft(false);
    }
  };

  const handleReset = () => {
    setBookingId(null);
    setEligibleRows([]);
    setSelectedDetailIds([]);
    setInvoiceRows([]);
  };

  const eligibleColumns = useMemo(
    () => [
      {
        title: 'BookingDetail ID',
        dataIndex: 'bookingDetailId',
        key: 'bookingDetailId',
        width: 130,
      },
      {
        title: 'Phòng',
        dataIndex: 'roomNumber',
        key: 'roomNumber',
        render: (value) => value || <Text type="secondary">Chưa có</Text>,
      },
      {
        title: 'Loại phòng',
        dataIndex: 'roomTypeName',
        key: 'roomTypeName',
        render: (value) => value || <Text type="secondary">Chưa có</Text>,
      },
      {
        title: 'Checkout',
        dataIndex: 'checkoutStatus',
        key: 'checkoutStatus',
      },
      {
        title: 'Settlement',
        dataIndex: 'settlementStatus',
        key: 'settlementStatus',
        render: (value) => <Tag>{value || 'UNPAID'}</Tag>,
      },
      {
        title: 'Tiền phòng',
        dataIndex: 'roomCharge',
        key: 'roomCharge',
        render: (value) => money(value),
      },
      {
        title: 'Dịch vụ',
        dataIndex: 'serviceCharge',
        key: 'serviceCharge',
        render: (value) => money(value),
      },
      {
        title: 'Đền bù',
        dataIndex: 'damageCharge',
        key: 'damageCharge',
        render: (value) => money(value),
      },
      {
        title: 'Ghi chú',
        dataIndex: 'blockReason',
        key: 'blockReason',
        render: (_, record) =>
          record.canCreateInvoice ? (
            <Tag color="green">Có thể lập bill</Tag>
          ) : (
            <Text type="danger">{record.blockReason || 'Bị chặn'}</Text>
          ),
      },
    ],
    []
  );

  const invoiceColumns = useMemo(
    () => [
      {
        title: 'Invoice ID',
        dataIndex: 'invoiceId',
        key: 'invoiceId',
        width: 110,
      },
      {
        title: 'Booking ID',
        dataIndex: 'bookingId',
        key: 'bookingId',
        width: 110,
      },
      {
        title: 'Mã booking',
        dataIndex: 'bookingCode',
        key: 'bookingCode',
        render: (value) => value || <Text type="secondary">Chưa có</Text>,
      },
      {
        title: 'Mã hóa đơn',
        dataIndex: 'invoiceCode',
        key: 'invoiceCode',
        render: (value) => value || <Text type="secondary">Chưa có</Text>,
      },
      {
        title: 'Phòng',
        dataIndex: 'roomNumbers',
        key: 'roomNumbers',
        render: (value) =>
          value?.length ? value.join(', ') : <Text type="secondary">Chưa có</Text>,
      },
      {
        title: 'BookingDetailIds',
        dataIndex: 'bookingDetailIds',
        key: 'bookingDetailIds',
        render: (value) =>
          value?.length ? value.join(', ') : <Text type="secondary">Chưa có</Text>,
      },
      {
        title: 'Trạng thái hóa đơn',
        dataIndex: 'invoiceStatus',
        key: 'invoiceStatus',
        render: (value) => <Tag color={statusColor(value)}>{value || 'Draft'}</Tag>,
      },
      {
        title: 'Trạng thái booking',
        dataIndex: 'bookingStatus',
        key: 'bookingStatus',
      },
      {
        title: 'Thanh toán',
        dataIndex: 'paymentStatus',
        key: 'paymentStatus',
      },
      {
        title: 'Tổng tiền',
        dataIndex: 'finalTotal',
        key: 'finalTotal',
        render: (value) => <b>{money(value)}</b>,
      },
      {
        title: 'Lần cập nhật cuối',
        dataIndex: 'updatedAt',
        key: 'updatedAt',
        render: (value) =>
          value ? new Date(value).toLocaleString('vi-VN') : <Text type="secondary">Chưa có</Text>,
      },
      {
        title: 'Thao tác',
        key: 'actions',
        width: 340,
        render: (_, record) => (
          <InvoiceActionButtons
            invoiceId={record.invoiceId}
            invoiceStatus={record.invoiceStatus}
            onChanged={async (payload) => {
              addOrUpdateInvoiceRow(payload);
              if ((payload?.bookingId ?? payload?.BookingId) === bookingId) {
                await handleLoadEligible();
              }
            }}
          />
        ),
      },
    ],
    [bookingId]
  );

  return (
    <div style={{ padding: '0 24px 24px', minHeight: '80vh', background: '#f5f5f5' }}>
      <Title level={4} style={{ marginBottom: 12 }}>
        Quản lý hóa đơn 
      </Title>

      <Paragraph style={{ marginBottom: 20 }}>
       
      </Paragraph>

      <Card bordered={false} style={{ borderRadius: 8, marginBottom: 20 }}>
        <Space wrap>
          <InputNumber
            min={1}
            value={bookingId}
            onChange={setBookingId}
            placeholder="Nhập bookingId"
            style={{ width: 180 }}
          />

          <Button
            type="primary"
            icon={<FileSearchOutlined />}
            loading={loadingEligible}
            onClick={handleLoadEligible}
          >
            Tải phòng đủ điều kiện
          </Button>

          <Button
            icon={<FileAddOutlined />}
            type="default"
            loading={creatingDraft}
            onClick={handleCreateDraft}
            disabled={selectedDetailIds.length === 0}
          >
            Tạo hóa đơn tạm tính
          </Button>

          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            Reset
          </Button>
        </Space>

        <Divider />

        <Table
          rowKey="bookingDetailId"
          columns={eligibleColumns}
          dataSource={eligibleRows}
          loading={loadingEligible}
          pagination={{ pageSize: 6 }}
          rowSelection={{
            selectedRowKeys: selectedDetailIds,
            onChange: (keys) => setSelectedDetailIds(keys),
            getCheckboxProps: (record) => ({
              disabled: !record.canCreateInvoice,
            }),
          }}
        />
      </Card>

      <Card bordered={false} style={{ borderRadius: 8 }}>
        <Table
          rowKey="invoiceId"
          columns={invoiceColumns}
          dataSource={invoiceRows}
          pagination={{ pageSize: 8 }}
        />
      </Card>
    </div>
  );
};

export default InvoiceManagement;