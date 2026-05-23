import React, { useState, useEffect } from 'react';
import { Table, Tabs, Tag, Avatar, Space, Button, Modal, message, Typography, Rate, Tooltip, Badge } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, EyeInvisibleOutlined, UserOutlined, MessageOutlined, StarFilled } from '@ant-design/icons';
import reviewApi from '../../api/reviewApi';

const { Title, Text } = Typography;

export default function ReviewManagement() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('PENDING');

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const res = await reviewApi.getAllForAdmin();
      setReviews(res.data || []);
    } catch (error) {
      console.error('Failed to fetch reviews', error);
      message.error('Không thể tải danh sách đánh giá');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await reviewApi.approve(id);
      message.success('Đã duyệt đánh giá thành công!');
      fetchReviews(); // Refresh list to get updated status/counts
    } catch (error) {
      console.error('Approve failed', error);
      message.error('Lỗi khi duyệt đánh giá');
    }
  };

  const handleReject = async (id) => {
    Modal.confirm({
      title: 'Từ chối đánh giá',
      content: (
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">Vui lòng nhập lý do ẩn đánh giá này:</Text>
          <textarea 
            id="reject-reason" 
            className="w-full mt-2 p-2 border rounded" 
            placeholder="Nội dung không phù hợp, ngôn từ thô tục..."
            rows={3}
          />
        </div>
      ),
      onOk: async () => {
        const reason = document.getElementById('reject-reason')?.value || 'Nội dung không phù hợp';
        try {
          await reviewApi.hide(id, reason);
          message.success('Đã ẩn đánh giá!');
          fetchReviews();
        } catch (error) {
          console.error('Reject failed', error);
          message.error('Lỗi khi từ chối đánh giá');
        }
      },
    });
  };

  const columns = [
    {
      title: 'Khách hàng',
      key: 'customer',
      width: 250,
      render: (_, record) => (
        <Space>
          <Avatar icon={<UserOutlined />} src={record.user?.avatarUrl} />
          <div>
            <Text strong block>{record.user?.fullName || 'Khách ẩn danh'}</Text>
            <Text type="secondary" size="small">{record.roomType?.name || 'Không xác định'}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Đánh giá',
      dataIndex: 'rating',
      key: 'rating',
      width: 150,
      sorter: (a, b) => a.rating - b.rating,
      render: (rating) => (
        <Space direction="vertical" size={0}>
          <Rate disabled defaultValue={rating} style={{ fontSize: 14, color: '#b8956a' }} />
          <Text type="secondary" style={{ fontSize: 12 }}>{rating}/5 sao</Text>
        </Space>
      ),
    },
    {
      title: 'Nội dung',
      key: 'content',
      render: (_, record) => (
        <Space direction="vertical" size={8}>
          <div>
            {record.highlight && <Tag color="gold" style={{ marginBottom: 4 }}>{record.highlight}</Tag>}
            <div style={{ color: '#444' }}>{record.comment}</div>
          </div>
          {record.imageUrl && (
            <Tooltip title="Click để phóng to">
              <img 
                src={record.imageUrl} 
                alt="Review" 
                style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4, border: '1px solid #eee', cursor: 'pointer' }}
                onClick={() => window.open(record.imageUrl, '_blank')}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'Ngày gửi',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (date) => new Date(date).toLocaleDateString('vi-VN'),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 180,
      align: 'right',
      render: (_, record) => {
        const status = record.status?.toUpperCase();
        if (status === 'PENDING') {
          return (
            <Space>
              <Button 
                type="primary" 
                size="small" 
                icon={<CheckCircleOutlined />} 
                onClick={() => handleApprove(record.id)}
                style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
              >
                Duyệt
              </Button>
              <Button 
                danger 
                size="small" 
                icon={<EyeInvisibleOutlined />} 
                onClick={() => handleReject(record.id)}
              >
                Ẩn
              </Button>
            </Space>
          );
        }
        if (status === 'APPROVED' || status === 'VISIBLE') {
          return (
            <Space>
              <Tag color="success" icon={<CheckCircleOutlined />}>Đã duyệt</Tag>
              <Button 
                type="text" 
                danger 
                size="small" 
                onClick={() => handleReject(record.id)}
              >
                Ẩn bài
              </Button>
            </Space>
          );
        }
        return <Tag color="default" icon={<CloseCircleOutlined />}>Đã ẩn</Tag>;
      },
    },
  ];

  const filteredData = reviews.filter(r => {
    const s = r.status?.toUpperCase();
    if (activeTab === 'PENDING') return s === 'PENDING';
    if (activeTab === 'APPROVED') return s === 'APPROVED' || s === 'VISIBLE';
    if (activeTab === 'HIDDEN') return s === 'HIDDEN';
    return false;
  });

  return (
    <div style={{ padding: '24px', background: '#fff', borderRadius: '8px' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={4}>
          <MessageOutlined style={{ marginRight: 8, color: '#b8956a' }} />
          Quản lý Đánh giá từ Khách hàng
        </Title>
        <Text type="secondary">Theo dõi, phê duyệt hoặc ẩn các đánh giá công khai trên trang chủ.</Text>
      </div>

      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        items={[
          { 
            key: 'PENDING', 
            label: (
              <Badge count={reviews.filter(r => r.status?.toUpperCase() === 'PENDING').length} offset={[10, 0]}>
                <span style={{ paddingRight: 8 }}>Chờ duyệt</span>
              </Badge>
            )
          },
          { key: 'APPROVED', label: `Đã duyệt (${reviews.filter(r => ['APPROVED', 'VISIBLE'].includes(r.status?.toUpperCase())).length})` },
          { key: 'HIDDEN', label: `Bị ẩn (${reviews.filter(r => r.status?.toUpperCase() === 'HIDDEN').length})` },
        ]}
      />

      <Table 
        columns={columns} 
        dataSource={filteredData} 
        loading={loading}
        rowKey="id"
        pagination={{ pageSize: 10 }}
        style={{ marginTop: 16 }}
        locale={{ emptyText: 'Không có đánh giá nào.' }}
      />
    </div>
  );
}