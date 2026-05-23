import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, DatePicker, Input, Button, Space, Typography,
  Tooltip, message, Popconfirm, Tag, Badge
} from 'antd';
import {
  SearchOutlined, CopyOutlined, ExportOutlined, ReloadOutlined,
  ClockCircleOutlined, EyeOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import bookingManagementApi from '../../api/bookingManagementApi';

const { Title, Text } = Typography;

const Departures = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedDate, setSelectedDate] = useState(null); // null = hiện tất cả
  const navigate = useNavigate();

  // Gọi API lấy danh sách phòng có thể check-out
  const fetchDepartures = useCallback(async (date) => {
    setLoading(true);
    try {
      const params = {};
      if (date) {
        // Gửi ngày theo chuẩn ISO, backend sẽ lọc theo ngày đó
        params.checkOutDate = date.format('YYYY-MM-DD');
      }
      const res = await bookingManagementApi.getDepartures(params);
      const raw = res.data?.data ?? [];

      // Flatten: mỗi BookingDetail → 1 dòng trong bảng
      const rows = [];
      raw.forEach((booking) => {
        booking.details?.forEach((detail) => {
          rows.push({
            key: `${booking.id}-${detail.id}`,
            detailId: detail.id,
            bookingId: booking.id,
            bookingCode: booking.bookingCode,
            guestName: booking.guestName ?? '—',
            guestPhone: booking.guestPhone ?? '—',
            roomNumber: detail.roomNumber ?? '—',
            roomTypeName: detail.roomTypeName ?? '—',
            checkInDate: detail.checkInDate,
            checkOutDate: detail.checkOutDate,
            actualCheckInAt: detail.actualCheckInAt,
            nights: detail.nights,
            lineTotal: detail.lineTotal,
            status: detail.status,
          });
        });
      });
      setData(rows);
    } catch (err) {
      message.error('Không thể tải danh sách phòng cần trả. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartures(selectedDate);
  }, [selectedDate, fetchDepartures]);

  const handleCopy = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    message.success('Đã copy mã booking');
  };

 const handleCheckOut = async (record) => {
  try {
    const res = await bookingManagementApi.updateDetailStatus(record.detailId, 'CheckedOut');

    if (res.data?.success) {
      message.success(
        `✅ Đã Check-out phòng ${record.roomNumber} thành công! Đang chuyển sang hóa đơn của booking #${record.bookingId}.`
      );

      // Sau khi trả phòng, chuyển thẳng qua Quản lý hóa đơn
      // và chỉ hiển thị đúng booking vừa checkout.
      navigate(`/admin/invoices?bookingId=${record.bookingId}&open=1`);
    }
  } catch (err) {
    const msg = err.response?.data?.message ?? 'Check-out thất bại. Vui lòng thử lại.';
    message.error(msg);
  }
};

  // Lọc client-side theo từ khóa tìm kiếm
  const filteredData = data.filter((row) => {
    if (!searchText.trim()) return true;
    const kw = searchText.toLowerCase();
    return (
      row.roomNumber?.toLowerCase().includes(kw) ||
      row.guestName?.toLowerCase().includes(kw) ||
      row.bookingCode?.toLowerCase().includes(kw) ||
      row.guestPhone?.toLowerCase().includes(kw)
    );
  });

  // Đánh dấu phòng quá hạn
  const isOverdue = (checkOutDate) => dayjs(checkOutDate).isBefore(dayjs(), 'day');

  const columns = [
    {
      title: 'Số Phòng',
      dataIndex: 'roomNumber',
      key: 'roomNumber',
      width: 100,
      render: (text, record) => (
        <Badge dot={isOverdue(record.checkOutDate)} color="red" offset={[4, 0]}>
          <Text strong style={{ color: '#1890ff', fontSize: 16 }}>{text}</Text>
        </Badge>
      ),
      sorter: (a, b) => a.roomNumber?.localeCompare(b.roomNumber),
    },
    {
      title: 'Loại phòng',
      dataIndex: 'roomTypeName',
      key: 'roomTypeName',
      width: 150,
    },
    {
      title: 'Khách hàng',
      key: 'guest',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.guestName}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.guestPhone}</Text>
        </Space>
      ),
    },
    {
      title: 'Mã Booking',
      dataIndex: 'bookingCode',
      key: 'bookingCode',
      width: 140,
      render: (text) => (
        <Space>
          <Text>{text}</Text>
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
      title: 'Check-in thực tế',
      dataIndex: 'actualCheckInAt',
      key: 'actualCheckInAt',
      width: 150,
      render: (val) => val ? dayjs(val).format('DD/MM/YYYY HH:mm') : <Text type="secondary">—</Text>,
    },
    {
      title: 'Dự kiến Check-out',
      dataIndex: 'checkOutDate',
      key: 'checkOutDate',
      width: 170,
      render: (val) => {
        const over = isOverdue(val);
        return (
          <Space>
            {over && <ClockCircleOutlined style={{ color: '#ff4d4f' }} />}
            <Text type={over ? 'danger' : undefined}>
              {dayjs(val).format('DD/MM/YYYY')}
            </Text>
            {over && <Tag color="error" style={{ fontSize: 11 }}>Quá hạn</Tag>}
          </Space>
        );
      },
      sorter: (a, b) => dayjs(a.checkOutDate).unix() - dayjs(b.checkOutDate).unix(),
      defaultSortOrder: 'ascend',
    },
    {
      title: 'Số đêm',
      dataIndex: 'nights',
      key: 'nights',
      width: 80,
      align: 'center',
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 160,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Xem hóa đơn">
            <Button
              icon={<EyeOutlined />}
              size="small"
              onClick={() => navigate(`/admin/invoices?bookingId=${record.bookingId}&open=1`)}
            />
          </Tooltip>
          <Popconfirm
            title={
              <Space direction="vertical" size={2}>
                <Text strong>Xác nhận trả phòng?</Text>
                <Text>Phòng {record.roomNumber} – {record.guestName}</Text>
              </Space>
            }
            onConfirm={() => handleCheckOut(record)}
            okText="Check-out ngay"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button danger type="primary" icon={<ExportOutlined />} size="small">
              Trả phòng
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title={
        <Space>
          <Title level={4} style={{ margin: 0 }}>Trả phòng (Departures)</Title>
          <Tag color={selectedDate ? 'blue' : 'green'}>
            {selectedDate ? `Ngày ${selectedDate.format('DD/MM/YYYY')}` : 'Tất cả phòng đang ở'}
          </Tag>
        </Space>
      }
      extra={
        <Tooltip title="Làm mới">
          <Button icon={<ReloadOutlined />} onClick={() => fetchDepartures(selectedDate)} />
        </Tooltip>
      }
      bordered={false}
      style={{ margin: 24, borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
    >
      <Space style={{ marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <DatePicker
          format="DD/MM/YYYY"
          value={selectedDate}
          placeholder="Lọc theo ngày trả phòng"
          onChange={(date) => setSelectedDate(date)}
          allowClear
          style={{ width: 210 }}
        />
        <Input
          placeholder="Tìm theo Phòng, Tên khách, Mã Booking, SĐT..."
          prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
          style={{ width: 340 }}
        />
        <Text type="secondary">
          Hiển thị <Text strong>{filteredData.length}</Text> phòng
          {filteredData.some((r) => isOverdue(r.checkOutDate)) && (
            <Text type="danger"> (có phòng quá hạn)</Text>
          )}
        </Text>
      </Space>

      <Table
        columns={columns}
        dataSource={filteredData}
        rowKey="key"
        loading={loading}
        pagination={{ pageSize: 12, showSizeChanger: true }}
        locale={{ emptyText: selectedDate ? `Không có phòng trả vào ngày ${selectedDate.format('DD/MM/YYYY')}` : 'Không có phòng nào đang check-in' }}
        rowClassName={(record) => isOverdue(record.checkOutDate) ? 'row-overdue' : ''}
        size="middle"
      />
    </Card>
  );
};

export default Departures;
