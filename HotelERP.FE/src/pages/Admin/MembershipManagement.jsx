import React, { useState } from 'react';
import {
  Table, Card, Button, Modal, Form, Input, InputNumber,
  Select, Tag, Space, Row, Col, Statistic, Tooltip, Typography, message,
} from 'antd';
import { EditOutlined, CrownOutlined, StarOutlined, TrophyOutlined, PlusOutlined } from '@ant-design/icons';

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const GOLD = '#b8956a';

/* ── Tier color map ── */
const TIER_COLORS = {
  'Khách Mới':  '#52c41a',
  'Đồng':       '#cd7f32',
  'Bạc':        '#c0c0c0',
  'Vàng':       '#ffd700',
  'Bạch Kim':   '#e5e4e2',
  'Kim Cương':  '#00bfff',
  'Elite':      '#ff6b6b',
  'VIP':        '#ff8c00',
  'VVIP':       '#dc143c',
  'Signature':  '#9b59b6',
};

/* ── Tier icon map ── */
const TIER_ICONS = {
  'Khách Mới': '🌱',
  'Đồng':      '🥉',
  'Bạc':       '🥈',
  'Vàng':      '🥇',
  'Bạch Kim':  '💎',
  'Kim Cương': '✨',
  'Elite':     '👑',
  'VIP':       '🔥',
  'VVIP':      '⚜️',
  'Signature': '⚜️',
};

/* ── Initial hardcoded data (mirrors DB rows) ── */
const INITIAL_MEMBERSHIPS = [
  {
    id: 1,
    tier_name: 'Khách Mới',
    min_points: 0,
    discount_percent: 0,
    benefits: 'Hưởng ưu đãi chào mừng, nhận thông tin khuyến mãi qua email.',
    status: 'Active',
  },
  {
    id: 2,
    tier_name: 'Đồng',
    min_points: 500,
    discount_percent: 2,
    benefits: 'Giảm 2% trên tổng hóa đơn, ưu tiên check-in nhanh, nhận quà sinh nhật.',
    status: 'Active',
  },
  {
    id: 3,
    tier_name: 'Bạc',
    min_points: 1000,
    discount_percent: 5,
    benefits: 'Giảm 5% hóa đơn, miễn phí nước uống chào mừng, ưu tiên đặt phòng.',
    status: 'Active',
  },
  {
    id: 4,
    tier_name: 'Vàng',
    min_points: 3000,
    discount_percent: 8,
    benefits: 'Giảm 8% hóa đơn, miễn phí bữa sáng, nâng hạng phòng khi có sẵn, hỗ trợ 24/7.',
    status: 'Active',
  },
  {
    id: 5,
    tier_name: 'Bạch Kim',
    min_points: 5000,
    discount_percent: 10,
    benefits: 'Giảm 10% hóa đơn, bữa sáng buffet miễn phí, sử dụng phòng chờ hạng sang, xe đưa đón sân bay.',
    status: 'Active',
  },
  {
    id: 6,
    tier_name: 'Kim Cương',
    min_points: 10000,
    discount_percent: 15,
    benefits: 'Giảm 15% hóa đơn, suite upgrade ưu tiên, butler service, spa miễn phí 1 lần/tháng.',
    status: 'Active',
  },
  {
    id: 7,
    tier_name: 'Elite',
    min_points: 20000,
    discount_percent: 20,
    benefits: 'Giảm 20% hóa đơn, phòng suite đảm bảo, dịch vụ concierge riêng, minibar miễn phí.',
    status: 'Active',
  },
  {
    id: 8,
    tier_name: 'VIP',
    min_points: 50000,
    discount_percent: 25,
    benefits: 'Giảm 25% hóa đơn, villa riêng ưu tiên, đầu bếp riêng theo yêu cầu, xe limousine đón tiễn.',
    status: 'Active',
  },
  {
    id: 9,
    tier_name: 'VVIP',
    min_points: 100000,
    discount_percent: 30,
    benefits: 'Giảm 30% hóa đơn, toàn bộ dịch vụ cao cấp, trợ lý cá nhân, ưu tiên tuyệt đối mọi yêu cầu.',
    status: 'Active',
  },
  {
    id: 10,
    tier_name: 'Signature',
    min_points: 200000,
    discount_percent: 35,
    benefits: 'Giảm 35% hóa đơn, trải nghiệm hoàn toàn cá nhân hóa, thành viên hội đồng ưu đãi đặc biệt, quà tặng thường niên độc quyền.',
    status: 'Active',
  },
];

/* ══════════════════════════════════════════════════════════════ */
const MembershipManagement = () => {
  const [memberships, setMemberships] = useState(INITIAL_MEMBERSHIPS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [addForm] = Form.useForm();

  /* ── Derived stats ── */
  const totalTiers   = memberships.length;
  const activeTiers  = memberships.filter(m => m.status === 'Active').length;
  const maxPoints    = Math.max(...memberships.map(m => m.min_points));

  /* ── Handlers ── */
  const handleEdit = (record) => {
    setEditingRecord(record);
    form.setFieldsValue({
      tier_name:        record.tier_name,
      min_points:       record.min_points,
      discount_percent: record.discount_percent,
      benefits:         record.benefits,
      status:           record.status,
    });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    form.validateFields().then(values => {
      setMemberships(prev =>
        prev.map(m =>
          m.id === editingRecord.id ? { ...m, ...values } : m
        )
      );
      message.success(`Đã cập nhật hạng "${editingRecord.tier_name}" thành công!`);
      setIsModalOpen(false);
      setEditingRecord(null);
      form.resetFields();
    });
  };

  const handleAddNew = () => {
    addForm.resetFields();
    setIsAddModalOpen(true);
  };

  const handleAddSave = () => {
    addForm.validateFields().then(values => {
      const newId = Math.max(...memberships.map(m => m.id)) + 1;
      setMemberships(prev => [...prev, { id: newId, ...values }]);
      message.success(`Đã thêm hạng "${values.tier_name}" thành công!`);
      setIsAddModalOpen(false);
      addForm.resetFields();
    });
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setEditingRecord(null);
    form.resetFields();
  };

  /* ── Table columns ── */
  const columns = [
    {
      title: 'Icon',
      key: 'icon',
      width: 60,
      align: 'center',
      render: (_, record) => (
        <span style={{ fontSize: 22 }}>{TIER_ICONS[record.tier_name] || '🏅'}</span>
      ),
    },
    {
      title: 'Tên Hạng',
      dataIndex: 'tier_name',
      key: 'tier_name',
      width: 140,
      render: (name) => (
        <Tag
          style={{
            background: TIER_COLORS[name] || '#999',
            color: ['Bạc', 'Bạch Kim', 'Vàng'].includes(name) ? '#333' : 'white',
            border: 'none',
            fontWeight: 700,
            fontSize: 13,
            padding: '3px 12px',
            borderRadius: 20,
          }}
        >
          {name}
        </Tag>
      ),
    },
    {
      title: 'Điểm Tối Thiểu',
      dataIndex: 'min_points',
      key: 'min_points',
      width: 150,
      sorter: (a, b) => a.min_points - b.min_points,
      render: (pts) => (
        <span style={{ fontWeight: 600, color: GOLD }}>
          {pts.toLocaleString('vi-VN')} điểm
        </span>
      ),
    },
    {
      title: '% Ưu Đãi',
      dataIndex: 'discount_percent',
      key: 'discount_percent',
      width: 110,
      align: 'center',
      sorter: (a, b) => a.discount_percent - b.discount_percent,
      render: (pct) => (
        <Tag color={pct === 0 ? 'default' : 'green'} style={{ fontSize: 14, fontWeight: 700 }}>
          {pct}%
        </Tag>
      ),
    },
    {
      title: 'Quyền Lợi',
      dataIndex: 'benefits',
      key: 'benefits',
      render: (text) => (
        <Tooltip title={text} placement="topLeft">
          <span style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            fontSize: 12,
            color: '#555',
            maxWidth: 320,
          }}>
            {text}
          </span>
        </Tooltip>
      ),
    },
    {
      title: 'Trạng Thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      align: 'center',
      render: (status) => (
        <Tag color={status === 'Active' ? 'green' : 'red'}>
          {status === 'Active' ? 'Đang hoạt động' : 'Tạm dừng'}
        </Tag>
      ),
    },
    {
      title: 'Hành Động',
      key: 'action',
      width: 90,
      align: 'center',
      render: (_, record) => (
        <Tooltip title="Chỉnh sửa">
          <Button
            type="primary"
            ghost
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            style={{ borderColor: GOLD, color: GOLD }}
          />
        </Tooltip>
      ),
    },
  ];

  /* ── Render ── */
  return (
    <div style={{ padding: 0 }}>
      {/* ─── STATISTICS ROW ─── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Tổng Hạng Thành Viên"
              value={totalTiers}
              prefix={<TrophyOutlined style={{ color: GOLD }} />}
              valueStyle={{ color: GOLD, fontWeight: 700 }}
              suffix="hạng"
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Hạng Đang Hoạt Động"
              value={activeTiers}
              prefix={<StarOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a', fontWeight: 700 }}
              suffix="hạng"
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Điểm Tối Đa (Signature)"
              value={maxPoints}
              prefix={<CrownOutlined style={{ color: '#9b59b6' }} />}
              valueStyle={{ color: '#9b59b6', fontWeight: 700 }}
              suffix="điểm"
            />
          </Card>
        </Col>
      </Row>

      {/* ─── MAIN CARD ─── */}
      <Card bordered={false} style={{ borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 4, height: 24, background: GOLD, borderRadius: 2 }} />
            <Title level={4} style={{ margin: 0 }}>Quản Lý Hạng Thành Viên</Title>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddNew}
            size="large"
            style={{ background: GOLD, borderColor: GOLD }}
          >
            Thêm hạng mới
          </Button>
        </div>

        {/* Table */}
        <Table
          columns={columns}
          dataSource={memberships}
          rowKey="id"
          pagination={{ pageSize: 10, showSizeChanger: false }}
          bordered={false}
          rowClassName={(_, index) => index % 2 === 0 ? '' : 'ant-table-row-striped'}
          scroll={{ x: 800 }}
        />
      </Card>

      {/* ─── EDIT MODAL ─── */}
      <Modal
        title={
          <Space>
            <span style={{ fontSize: 20 }}>{editingRecord ? TIER_ICONS[editingRecord.tier_name] : '🏅'}</span>
            <span>Chỉnh sửa hạng: <strong>{editingRecord?.tier_name}</strong></span>
          </Space>
        }
        open={isModalOpen}
        onOk={handleSave}
        onCancel={handleCancel}
        okText="Lưu thay đổi"
        cancelText="Hủy"
        okButtonProps={{ style: { background: GOLD, borderColor: GOLD } }}
        width={560}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="Tên Hạng" name="tier_name">
            <Input disabled style={{ background: '#f5f5f5', cursor: 'not-allowed' }} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Điểm Tối Thiểu"
                name="min_points"
                rules={[
                  { required: true, message: 'Vui lòng nhập điểm tối thiểu' },
                  { type: 'number', min: 0, message: 'Điểm phải ≥ 0' },
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  formatter={val => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={val => val.replace(/,/g, '')}
                  addonAfter="điểm"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="% Ưu Đãi"
                name="discount_percent"
                rules={[
                  { required: true, message: 'Vui lòng nhập % ưu đãi' },
                  { type: 'number', min: 0, max: 100, message: 'Giá trị từ 0 đến 100' },
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  max={100}
                  addonAfter="%"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="Quyền Lợi"
            name="benefits"
            rules={[{ required: true, message: 'Vui lòng nhập quyền lợi' }]}
          >
            <TextArea rows={4} placeholder="Mô tả quyền lợi của hạng thành viên này..." />
          </Form.Item>

          <Form.Item
            label="Trạng Thái"
            name="status"
            rules={[{ required: true, message: 'Vui lòng chọn trạng thái' }]}
          >
            <Select>
              <Option value="Active">✅ Đang hoạt động</Option>
              <Option value="Inactive">⛔ Tạm dừng</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* ─── ADD NEW MODAL ─── */}
      <Modal
        title={
          <Space>
            <PlusOutlined style={{ color: GOLD }} />
            <span>Thêm Hạng Thành Viên Mới</span>
          </Space>
        }
        open={isAddModalOpen}
        onOk={handleAddSave}
        onCancel={() => { setIsAddModalOpen(false); addForm.resetFields(); }}
        okText="Thêm hạng"
        cancelText="Hủy"
        okButtonProps={{ style: { background: GOLD, borderColor: GOLD } }}
        width={560}
        destroyOnClose
      >
        <Form form={addForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            label="Tên Hạng"
            name="tier_name"
            rules={[{ required: true, message: 'Vui lòng nhập tên hạng' }]}
          >
            <Input placeholder="Ví dụ: Platinum Plus" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Điểm Tối Thiểu"
                name="min_points"
                rules={[
                  { required: true, message: 'Vui lòng nhập điểm tối thiểu' },
                  { type: 'number', min: 0, message: 'Điểm phải ≥ 0' },
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  formatter={val => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={val => val.replace(/,/g, '')}
                  addonAfter="điểm"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="% Ưu Đãi"
                name="discount_percent"
                rules={[
                  { required: true, message: 'Vui lòng nhập % ưu đãi' },
                  { type: 'number', min: 0, max: 100, message: 'Giá trị từ 0 đến 100' },
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  max={100}
                  addonAfter="%"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="Quyền Lợi"
            name="benefits"
            rules={[{ required: true, message: 'Vui lòng nhập quyền lợi' }]}
          >
            <TextArea rows={4} placeholder="Mô tả quyền lợi của hạng thành viên này..." />
          </Form.Item>

          <Form.Item
            label="Trạng Thái"
            name="status"
            initialValue="Active"
            rules={[{ required: true, message: 'Vui lòng chọn trạng thái' }]}
          >
            <Select>
              <Option value="Active">✅ Đang hoạt động</Option>
              <Option value="Inactive">⛔ Tạm dừng</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MembershipManagement;
