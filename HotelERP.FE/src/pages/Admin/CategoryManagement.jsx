import React, { useState, useEffect } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, Space,
  Tag, message, Popconfirm, Typography, Tooltip, Dropdown,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  AppstoreOutlined, ReloadOutlined, DownOutlined, CheckOutlined,
} from '@ant-design/icons';
import { articleCategoryApi } from '../../api/articleApi';

const { Title, Text } = Typography;
const GOLD = '#b8956a';

const STATUS_MAP = {
  ACTIVE: { color: 'green', label: 'Hoạt động', menuColor: '#16a34a' },
  INACTIVE: { color: 'default', label: 'Ẩn', menuColor: '#ef4444' },
};

export default function CategoryManagement() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(null); // id đang cập nhật
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);   // null = create
  const [form] = Form.useForm();

  /* ── Đổi trạng thái nhanh inline ── */
  const handleStatusChange = async (record, newStatus) => {
    if (record.status === newStatus) return;
    setStatusLoading(record.id);
    try {
      await articleCategoryApi.update(record.id, { name: record.name, status: newStatus });
      message.success(`Đã đổi trạng thái thành "${STATUS_MAP[newStatus]?.label}"`);
      load();
    } catch {
      message.error('Cập nhật trạng thái thất bại');
    } finally {
      setStatusLoading(null);
    }
  };

  /* ── Fetch ── */
  const load = async () => {
    setLoading(true);
    try {
      const res = await articleCategoryApi.getAll();
      setCategories(res.data || []);
    } catch {
      message.error('Không thể tải danh sách chuyên mục');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  /* ── Open modal ── */
  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ status: 'ACTIVE' });
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue({ name: record.name, status: record.status || 'ACTIVE' });
    setModalOpen(true);
  };

  /* ── Submit ── */
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editing) {
        await articleCategoryApi.update(editing.id, values);
        message.success('Cập nhật chuyên mục thành công');
      } else {
        await articleCategoryApi.create(values);
        message.success('Tạo chuyên mục thành công');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      if (err?.errorFields) return; // validation error
      message.error('Thao tác thất bại: ' + (err?.response?.data?.message || err.message));
    }
  };

  /* ── Delete ── */
  const handleDelete = async (id) => {
    try {
      await articleCategoryApi.delete(id);
      message.success('Đã xóa chuyên mục');
      load();
    } catch {
      message.error('Không thể xóa chuyên mục');
    }
  };

  /* ── Columns ── */
  const columns = [
    {
      title: '#',
      width: 60,
      render: (_, __, i) => <Text type="secondary">{i + 1}</Text>,
    },
    {
      title: 'Tên chuyên mục',
      dataIndex: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (name) => (
        <span style={{ fontWeight: 600, color: '#111' }}>{name}</span>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 160,
      render: (st, record) => {
        const cfg = STATUS_MAP[st] || STATUS_MAP.ACTIVE;
        const isUpdating = statusLoading === record.id;

        const menuItems = Object.entries(STATUS_MAP).map(([key, val]) => ({
          key,
          label: (
            <div style={{ padding: '6px 12px' }}>
              <span style={{ color: val.menuColor, fontSize: 14, fontWeight: 500 }}>
                {val.label}
              </span>
            </div>
          ),
          onClick: () => handleStatusChange(record, key),
        }));

        return (
          <Dropdown
            menu={{ items: menuItems }}
            trigger={['click']}
            disabled={isUpdating}
          >
            <Tag
              color={cfg.color}
              style={{ cursor: 'pointer', userSelect: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              {isUpdating ? '...' : cfg.label}
              <DownOutlined style={{ fontSize: 9, opacity: 0.6 }} />
            </Tag>
          </Dropdown>
        );
      },
    },
    {
      title: 'Số bài viết',
      dataIndex: 'articleCount',
      width: 120,
      align: 'center',
      render: (v) => (
        <Tag color={v > 0 ? 'blue' : 'default'} style={{ minWidth: 36, textAlign: 'center' }}>
          {v ?? 0}
        </Tag>
      ),
    },
    {
      title: 'Thao tác',
      width: 120,
      align: 'center',
      render: (_, record) => (
        <Space>
          <Tooltip title="Chỉnh sửa">
            <Button
              type="text" size="small" icon={<EditOutlined />}
              onClick={() => openEdit(record)}
              style={{ color: GOLD }}
            />
          </Tooltip>
          <Popconfirm
            title="Xóa chuyên mục này?"
            description="Các bài viết thuộc chuyên mục này sẽ không bị xóa."
            okText="Xóa" cancelText="Hủy"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record.id)}
          >
            <Tooltip title="Xóa">
              <Button type="text" size="small" icon={<DeleteOutlined />} danger />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24, background: '#f8f9fa', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AppstoreOutlined style={{ color: GOLD }} /> Quản lý Chuyên mục
          </h1>
          <p style={{ color: '#71717a', fontSize: 13, margin: '4px 0 0' }}>
            Tạo, chỉnh sửa và quản lý các chuyên mục bài viết
          </p>
        </div>
        <Space>

          <Button
            type="primary" icon={<PlusOutlined />} onClick={openCreate}
            style={{ background: GOLD, borderColor: GOLD }}
          >
            Thêm chuyên mục
          </Button>
        </Space>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Tổng chuyên mục', value: categories.length, color: '#3b82f6' },
          { label: 'Đang hoạt động', value: categories.filter(c => c.status !== 'INACTIVE').length, color: '#16a34a' },
          { label: 'Đang ẩn', value: categories.filter(c => c.status === 'INACTIVE').length, color: '#9ca3af' },
        ].map(s => (
          <div key={s.label} style={{ background: 'white', borderRadius: 8, padding: '14px 20px', border: '1px solid #f0f0f0', flex: 1 }}>
            <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: s.color, marginTop: 4 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: 'white', borderRadius: 8, border: '1px solid #f0f0f0', overflow: 'hidden' }}>
        <Table
          columns={columns}
          dataSource={categories}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 15, showSizeChanger: true }}
          size="middle"
        />
      </div>

      {/* Modal */}
      <Modal
        open={modalOpen}
        title={
          <span style={{ fontWeight: 700, fontSize: 16 }}>
            {editing ? '✏️ Chỉnh sửa chuyên mục' : '➕ Thêm chuyên mục mới'}
          </span>
        }
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        okText={editing ? 'Cập nhật' : 'Tạo mới'}
        cancelText="Hủy"
        okButtonProps={{ style: { background: GOLD, borderColor: GOLD } }}
        width={480}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label={<span style={{ fontWeight: 600 }}>Tên chuyên mục</span>}
            rules={[
              { required: true, message: 'Vui lòng nhập tên chuyên mục' },
              { min: 2, message: 'Tên phải có ít nhất 2 ký tự' },
              { max: 100, message: 'Tên không được quá 100 ký tự' },
            ]}
          >
            <Input placeholder="VD: Tin Tức Khách Sạn, Sự Kiện, Ẩm Thực..." size="large" />
          </Form.Item>

          <Form.Item
            name="status"
            label={<span style={{ fontWeight: 600 }}>Trạng thái</span>}
          >
            <Select size="large">
              <Select.Option value="ACTIVE">✅ Hoạt động</Select.Option>
              <Select.Option value="INACTIVE">🚫 Ẩn</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
