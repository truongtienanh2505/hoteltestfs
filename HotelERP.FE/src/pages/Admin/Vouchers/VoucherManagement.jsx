import React, { useState, useEffect } from 'react';
import { Table, Button, Input, Select, Tag, Space, Card, Typography, Modal, message, Tooltip } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, StopOutlined, CheckCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import voucherApi from '../../../api/voucherApi';
import VoucherModal from './VoucherModal';

const { Title } = Typography;
const { Option } = Select;

const VoucherManagement = () => {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState(null);

  const fetchVouchers = async () => {
    setLoading(true);
    try {
      const response = await voucherApi.getAll({
        search: searchTerm,
        status: statusFilter === 'All' ? '' : statusFilter,
      });
      if (response.success) {
        setVouchers(response.data);
      } else {
        message.error(response.message || 'Không thể tải danh sách voucher');
      }
    } catch (error) {
      console.error('Fetch vouchers error:', error);
      message.error('Lỗi khi kết nối đến máy chủ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers();
  }, [statusFilter]);

  const handleSearch = () => {
    fetchVouchers();
  };

  const handleAddVoucher = () => {
    setEditingVoucher(null);
    setIsModalVisible(true);
  };

  const handleEditVoucher = (record) => {
    setEditingVoucher(record);
    setIsModalVisible(true);
  };

  const handleDisableVoucher = async (record) => {
    Modal.confirm({
      title: 'Vô hiệu hóa Voucher',
      content: (
        <div>
          <p>Bạn có chắc chắn muốn vô hiệu hóa voucher <strong>{record.code}</strong>?</p>
          <Input.TextArea 
            id="disable-reason" 
            placeholder="Nhập lý do vô hiệu hóa..." 
            rows={3} 
            style={{ marginTop: 10 }}
          />
        </div>
      ),
      okText: 'Xác nhận',
      cancelText: 'Hủy',
      okType: 'danger',
      onOk: async () => {
        const reason = document.getElementById('disable-reason')?.value || 'Admin vô hiệu hóa';
        try {
          const response = await voucherApi.disable(record.id, reason);
          if (response.success) {
            message.success('Đã vô hiệu hóa voucher thành công');
            fetchVouchers();
          } else {
            message.error(response.message || 'Lỗi khi vô hiệu hóa voucher');
          }
        } catch (error) {
          message.error('Lỗi kết nối');
        }
      },
    });
  };

  const handleModalSuccess = async (payload) => {
    try {
      let response;
      if (editingVoucher) {
        response = await voucherApi.update(editingVoucher.id, payload);
      } else {
        response = await voucherApi.create(payload);
      }

      if (response.success) {
        message.success(editingVoucher ? 'Cập nhật thành công' : 'Thêm mới thành công');
        setIsModalVisible(false);
        fetchVouchers();
      } else {
        message.error(response.message || 'Thao tác thất bại');
      }
    } catch (error) {
      console.error('Submit error:', error);
      message.error('Lỗi khi gửi dữ liệu');
    }
  };

  const columns = [
    {
      title: 'Mã Voucher',
      dataIndex: 'code',
      key: 'code',
      render: (text) => <Tag color="blue" style={{ fontSize: '14px', padding: '4px 8px' }}>{text}</Tag>,
    },
    {
      title: 'Loại giảm giá',
      dataIndex: 'discountType',
      key: 'discountType',
      render: (type) => type === 'PERCENT' ? 'Phần trăm (%)' : 'Số tiền cố định',
    },
    {
      title: 'Giá trị',
      dataIndex: 'discountValue',
      key: 'discountValue',
      render: (val, record) => record.discountType === 'PERCENT' 
        ? `${val}%` 
        : `${val.toLocaleString()} VND`,
    },
    {
      title: 'Hiệu lực',
      key: 'validity',
      render: (_, record) => (
        <div style={{ fontSize: '12px' }}>
          <div>Từ: {dayjs(record.validFrom).format('DD/MM/YYYY HH:mm')}</div>
          <div>Đến: {dayjs(record.validTo).format('DD/MM/YYYY HH:mm')}</div>
        </div>
      ),
    },
    {
      title: 'Sử dụng',
      key: 'usage',
      render: (_, record) => (
        <span>{record.usedCount} / {record.usageLimit || '∞'}</span>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status, record) => {
        const now = dayjs();
        const validFrom = dayjs(record.validFrom);
        const validTo = dayjs(record.validTo);
        
        let color = 'green';
        let text = 'Đang hoạt động';

        // ƯU TIÊN: Kiểm tra ngày tháng trước để phân biệt tương lai/quá khứ
        if (validFrom.isAfter(now)) {
          color = 'blue';
          text = 'Chưa đến hạn';
        } else if (validTo.isBefore(now)) {
          color = 'orange';
          text = 'Hết hạn';
        } else if (status === 'INACTIVE' || status === 'Disabled') {
          // Chỉ hiện Đỏ nếu đang trong hạn mà bị Admin tắt thủ công
          color = 'red';
          text = 'Bị vô hiệu hóa';
        }
        
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Tooltip title="Chỉnh sửa">
            <Button 
              type="primary" 
              icon={<EditOutlined />} 
              ghost 
              onClick={() => handleEditVoucher(record)} 
            />
          </Tooltip>
          {record.status !== 'INACTIVE' && (
            <Tooltip title="Vô hiệu hóa">
              <Button 
                danger 
                icon={<StopOutlined />} 
                onClick={() => handleDisableVoucher(record)} 
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '0px' }}>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <Title level={3} style={{ margin: 0 }}>Quản lý Voucher</Title>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={handleAddVoucher}
            size="large"
          >
            Tạo Voucher mới
          </Button>
        </div>

        <Space style={{ marginBottom: 16 }} size="middle" wrap>
          <Input
            placeholder="Tìm kiếm mã voucher..."
            prefix={<SearchOutlined />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onPressEnter={handleSearch}
            style={{ width: 300 }}
          />
          <Select
            defaultValue="All"
            style={{ width: 180 }}
            onChange={setStatusFilter}
          >
            <Option value="All">Tất cả trạng thái</Option>
            <Option value="ACTIVE">Đang hoạt động</Option>
            <Option value="INACTIVE">Bị vô hiệu hóa</Option>
            <Option value="EXPIRED">Đã hết hạn</Option>
          </Select>
          <Button type="primary" ghost onClick={handleSearch}>Tìm kiếm</Button>
        </Space>

        <Table
          columns={columns}
          dataSource={vouchers}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <VoucherModal
        visible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onSuccess={handleModalSuccess}
        editingVoucher={editingVoucher}
      />
    </div>
  );
};

export default VoucherManagement;
