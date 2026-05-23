import React, { useState, useEffect } from 'react';
import { Card, Table, DatePicker, Input, Button, Space, Typography, Tooltip, message, Popconfirm } from 'antd';
import { SearchOutlined, EyeOutlined, LoginOutlined, CopyOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import bookingManagementApi from '../../api/bookingManagementApi';
import { useNavigate } from 'react-router-dom';

const { Title } = Typography;

const Arrivals = () => {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedDate, setSelectedDate] = useState(dayjs());

  useEffect(() => {
    fetchArrivals();
  }, []);

  const fetchArrivals = async () => {
    setLoading(true);
    try {
      const response = await bookingManagementApi.getTodayArrivals();
      if (response.data && response.data.success) {
        setData(response.data.data);
      }
    } catch (error) {
      console.error('Lỗi khi tải danh sách khách đến:', error);
      message.error('Không thể tải dữ liệu khách đến.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    message.success('Đã copy mã booking');
  };

  const handleCheckIn = async (record) => {
    const detailId = record.details?.[0]?.id;
    if (!detailId) {
      message.error('Không tìm thấy thông tin phòng!');
      return;
    }
    
    try {
      const res = await bookingManagementApi.updateDetailStatus(detailId, 'Checked_in');
      if (res.data && res.data.success) {
        message.success(`Nhận phòng thành công cho phòng ${record.details[0].roomNumber}!`);
        fetchArrivals(); // Refresh list
      }
    } catch (error) {
      console.error('Lỗi check-in:', error);
      message.error(error.response?.data?.message || 'Có lỗi xảy ra khi Check-in.');
    }
  };

  // Filter data based on search text and selected date (if we want client-side search, otherwise API should handle it)
  const filteredData = data.filter((item) => {
    const detail = item.details?.[0];
    const matchSearch =
      item.guestName?.toLowerCase().includes(searchText.toLowerCase()) ||
      item.bookingCode?.toLowerCase().includes(searchText.toLowerCase()) ||
      detail?.roomNumber?.toLowerCase().includes(searchText.toLowerCase());
    
    // For date filter, today arrivals are already filtered by API today, but if user picks another date:
    const matchDate = selectedDate ? dayjs(detail?.checkInDate).isSame(selectedDate, 'day') : true;

    return matchSearch && matchDate;
  });

  const columns = [
    {
      title: 'Mã Booking',
      dataIndex: 'bookingCode',
      key: 'bookingCode',
      render: (text) => (
        <Space>
          <Typography.Text strong>{text}</Typography.Text>
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
      title: 'Khách hàng',
      key: 'customerName',
      render: (_, record) => record.guestName,
    },
    {
      title: 'Hạng phòng',
      key: 'roomType',
      render: (_, record) => record.details?.[0]?.roomTypeName,
    },
    {
      title: 'Phòng thực tế',
      key: 'roomName',
      render: (_, record) => (
        <Typography.Text strong style={{ color: '#1890ff' }}>
          {record.details?.[0]?.roomNumber || 'Chưa xếp phòng'}
        </Typography.Text>
      ),
    },
    {
      title: 'Dự kiến Check-in',
      key: 'expectedCheckIn',
      render: (_, record) => {
        const date = record.details?.[0]?.checkInDate;
        return date ? dayjs(date).format('DD/MM/YYYY HH:mm') : '';
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Tooltip title="Xem chi tiết">
            <Button icon={<EyeOutlined />} size="small" onClick={() => navigate('/admin/bookings/' + record.bookingCode)} />
          </Tooltip>
          <Popconfirm
            title={`Xác nhận khách đã vào phòng ${record.details?.[0]?.roomNumber}?`}
            onConfirm={() => handleCheckIn(record)}
            okText="Check-in"
            cancelText="Hủy"
            okButtonProps={{ type: 'primary' }}
          >
            <Button type="primary" icon={<LoginOutlined />} size="small" style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card 
      title={<Title level={4} style={{ margin: 0 }}>Khách đến hôm nay (Arrivals)</Title>} 
      bordered={false}
      style={{ margin: 24, borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <DatePicker 
          format="DD/MM/YYYY" 
          value={selectedDate}
          onChange={(date) => setSelectedDate(date)}
          style={{ width: 200 }} 
        />
        <Input
          placeholder="Tìm theo Số phòng, Tên khách, Mã..."
          prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 300 }}
        />
      </div>

      <Table
        columns={columns}
        dataSource={filteredData}
        loading={loading}
        rowKey="id"
        pagination={{ pageSize: 10 }}
        locale={{ emptyText: 'Không có dữ liệu' }}
      />
    </Card>
  );
};

export default Arrivals;

