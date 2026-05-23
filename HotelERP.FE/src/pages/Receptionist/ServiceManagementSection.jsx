import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Input, Space, Typography, Tag, Tooltip,
  Modal, Form, Select, InputNumber, message, Popconfirm, Tabs,
  Upload,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
  SearchOutlined, AppstoreOutlined, UnorderedListOutlined,
  UploadOutlined, PictureOutlined,
} from '@ant-design/icons';
import servicesMgmtApi from '../../api/servicesMgmtApi';

const { Title, Text } = Typography;
const { Option } = Select;

const money = (v) => Number(v || 0).toLocaleString('vi-VN') + 'đ';

// ── Service image preview ───────────────────────────────────────────────────
const ServiceAvatar = ({ name, imageUrl, size = 48 }) => {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        style={{ width: size, height: size, borderRadius: 8, objectFit: 'cover', border: '1px solid #f0f0f0' }}
        onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
      />
    );
  }
  const initials = (name || '?').slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: 8,
      background: 'linear-gradient(135deg, #f5deb3, #d4a96a)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.3, fontWeight: 700, color: '#8B5E3C',
      border: '1px solid #e8d5b0', flexShrink: 0,
    }}>
      {initials}
    </div>
  );
};

// ── Shared Cloudinary upload component ─────────────────────────────────────
function ServiceImageUpload({ value, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(value || null);

  useEffect(() => { setPreviewUrl(value || null); }, [value]);

  const handleUpload = async ({ file, onSuccess, onError }) => {
    setUploading(true);
    try {
      const res = await servicesMgmtApi.uploadImage(file);
      const url = res.data?.imageUrl;
      setPreviewUrl(url);
      onChange?.(url);
      onSuccess?.('ok');
      message.success('Tải ảnh lên thành công!');
    } catch (err) {
      message.error(err?.response?.data?.message || 'Lỗi khi tải ảnh lên.');
      onError?.(err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
      {/* Preview box */}
      <div style={{
        width: 100, height: 100, borderRadius: 10,
        border: '1.5px dashed #d9d9d9', background: '#fafafa',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', flexShrink: 0,
      }}>
        {previewUrl
          ? <img src={previewUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <PictureOutlined style={{ fontSize: 32, color: '#bbb' }} />
        }
      </div>

      <div style={{ flex: 1 }}>
        <Upload
          customRequest={handleUpload}
          showUploadList={false}
          accept="image/*"
          disabled={uploading}
        >
          <Button icon={<UploadOutlined />} loading={uploading}>
            {uploading ? 'Đang tải...' : 'Chọn ảnh từ máy tính'}
          </Button>
        </Upload>
        <div style={{ fontSize: 12, color: '#888', marginTop: 6 }}>
          Ảnh sẽ được lưu trên Cloudinary. Hỗ trợ JPG, PNG, WEBP — tối đa 5MB.
        </div>
        {previewUrl && (
          <Button
            size="small" type="link" danger style={{ padding: 0, marginTop: 4 }}
            onClick={() => { setPreviewUrl(null); onChange?.(null); }}
          >
            Xóa ảnh
          </Button>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORY MANAGEMENT TAB
// ═══════════════════════════════════════════════════════════════════════════
function CategoryTab() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await servicesMgmtApi.getCategories();
      if (res.data?.success) setCategories(res.data.data);
    } catch { message.error('Không tải được danh mục.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const openAdd = () => { setEditId(null); form.resetFields(); setModalOpen(true); };
  const openEdit = (rec) => { setEditId(rec.id); form.setFieldsValue({ name: rec.name, status: rec.status }); setModalOpen(true); };

  const handleSave = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      if (editId) {
        const res = await servicesMgmtApi.updateCategory(editId, values);
        message.success(res.data?.message || 'Cập nhật thành công.');
      } else {
        const res = await servicesMgmtApi.createCategory(values);
        message.success(res.data?.message || 'Thêm thành công.');
      }
      setModalOpen(false);
      fetchCategories();
    } catch (err) {
      message.error(err?.response?.data?.message || 'Có lỗi xảy ra.');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    try {
      const res = await servicesMgmtApi.deleteCategory(id);
      message.success(res.data?.message || 'Đã xóa.');
      fetchCategories();
    } catch (err) {
      message.error(err?.response?.data?.message || 'Không thể xóa.');
    }
  };

  const filtered = categories.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    { title: 'Tên danh mục', dataIndex: 'name', key: 'name', render: (v) => <Text strong>{v}</Text> },
    {
      title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 130,
      render: (s) => <Tag color={s === 'ACTIVE' ? 'success' : 'default'}>{s}</Tag>,
    },
    { title: 'Số dịch vụ', dataIndex: 'serviceCount', key: 'serviceCount', width: 110, render: (v) => <Tag>{v}</Tag> },
    {
      title: 'Hành động', key: 'action', width: 160,
      render: (_, rec) => (
        <Space>
          <Button type="primary" size="small" icon={<EditOutlined />} onClick={() => openEdit(rec)}>Sửa</Button>
          <Popconfirm
            title={`Xóa danh mục "${rec.name}"?`}
            description="Danh mục không được có dịch vụ mới xóa được."
            onConfirm={() => handleDelete(rec.id)}
            okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}
          >
            <Button danger size="small" icon={<DeleteOutlined />}>Xóa</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, gap: 12 }}>
        <Input
          prefix={<SearchOutlined style={{ color: '#bbb' }} />}
          placeholder="Tìm theo tên danh mục..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ width: 320 }}
        />
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchCategories} loading={loading}>Tải lại</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd} style={{ background: '#3b82f6' }}>
            + Thêm danh mục
          </Button>
        </Space>
      </div>

      <Table
        columns={columns} dataSource={filtered} rowKey="id" loading={loading}
        pagination={{ pageSize: 10 }} size="middle"
        locale={{ emptyText: 'Chưa có danh mục nào.' }}
      />

      <Modal
        open={modalOpen} title={editId ? 'Sửa danh mục' : 'Thêm danh mục mới'}
        onOk={handleSave} onCancel={() => setModalOpen(false)}
        confirmLoading={submitting} okText="Lưu" cancelText="Hủy" destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Tên danh mục" rules={[{ required: true, message: 'Nhập tên danh mục.' }]}>
            <Input placeholder="Ví dụ: Ăn uống, Spa & Massage..." />
          </Form.Item>
          {editId && (
            <Form.Item name="status" label="Trạng thái">
              <Select>
                <Option value="ACTIVE">ACTIVE – Hiển thị</Option>
                <Option value="INACTIVE">INACTIVE – Ẩn</Option>
              </Select>
            </Form.Item>
          )}
        </Form>
      </Modal>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SERVICE MANAGEMENT TAB
// ═══════════════════════════════════════════════════════════════════════════
function ServiceTab() {
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState(null);
  const [filterStatus, setFilterStatus] = useState('ACTIVE');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [imageUrl, setImageUrl] = useState(null); // controlled outside Form
  const [form] = Form.useForm();

  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (filterCat) params.categoryId = filterCat;
      if (filterStatus) params.status = filterStatus;
      const res = await servicesMgmtApi.getAll(params);
      if (res.data?.success) setServices(res.data.data);
    } catch { message.error('Không tải được dịch vụ.'); }
    finally { setLoading(false); }
  }, [search, filterCat, filterStatus]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await servicesMgmtApi.getCategories();
      if (res.data?.success) setCategories(res.data.data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);
  useEffect(() => { fetchServices(); }, [fetchServices]);

  const openAdd = () => {
    setEditId(null);
    setImageUrl(null);
    form.resetFields();
    form.setFieldsValue({ status: 'ACTIVE', unit: 'lần' });
    setModalOpen(true);
  };

  const openEdit = (rec) => {
    setEditId(rec.id);
    setImageUrl(rec.imageUrl || null);
    form.setFieldsValue({
      name: rec.name, description: rec.description,
      price: rec.price, unit: rec.unit,
      categoryId: rec.categoryId, status: rec.status,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      const payload = { ...values, imageUrl: imageUrl || null };
      if (editId) {
        const res = await servicesMgmtApi.update(editId, payload);
        message.success(res.data?.message || 'Cập nhật thành công.');
      } else {
        const res = await servicesMgmtApi.create(payload);
        message.success(res.data?.message || 'Thêm thành công.');
      }
      setModalOpen(false);
      fetchServices();
    } catch (err) {
      message.error(err?.response?.data?.message || 'Có lỗi xảy ra.');
    } finally { setSubmitting(false); }
  };

  const handleDeactivate = async (rec) => {
    try {
      const res = await servicesMgmtApi.deactivate(rec.id);
      message.success(res.data?.message || 'Đã ẩn dịch vụ.');
      fetchServices();
    } catch (err) { message.error(err?.response?.data?.message || 'Lỗi.'); }
  };

  const handleActivate = async (rec) => {
    try {
      await servicesMgmtApi.update(rec.id, { ...rec, status: 'ACTIVE', categoryId: rec.categoryId });
      message.success('Đã kích hoạt lại dịch vụ.');
      fetchServices();
    } catch (err) { message.error(err?.response?.data?.message || 'Lỗi.'); }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    {
      title: 'Hình ảnh', key: 'img', width: 80,
      render: (_, rec) => <ServiceAvatar name={rec.name} imageUrl={rec.imageUrl} />,
    },
    {
      title: 'Tên dịch vụ', dataIndex: 'name', key: 'name',
      render: (v, rec) => (
        <div>
          <Text strong>{v}</Text>
          {rec.description && (
            <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
              {rec.description.slice(0, 60)}{rec.description.length > 60 ? '…' : ''}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Danh mục', dataIndex: 'categoryName', key: 'cat', width: 160,
      render: (v) => v ? <Tag color="geekblue">{v}</Tag> : <Tag color="default">Chưa phân loại</Tag>,
    },
    {
      title: 'Giá', dataIndex: 'price', key: 'price', width: 160,
      render: (v, rec) => (
        <Text strong style={{ color: '#c00' }}>
          {money(v)}
          <Text type="secondary" style={{ fontSize: 11, fontWeight: 400 }}>/{rec.unit || 'lần'}</Text>
        </Text>
      ),
    },
    {
      title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 120,
      render: (s) => <Tag color={s === 'ACTIVE' ? 'success' : 'warning'}>{s}</Tag>,
    },
    {
      title: 'Hành động', key: 'action', width: 180,
      render: (_, rec) => (
        <Space size="small">
          <Tooltip title="Sửa thông tin">
            <Button type="primary" size="small" icon={<EditOutlined />} onClick={() => openEdit(rec)}>Sửa</Button>
          </Tooltip>
          {rec.status === 'ACTIVE' ? (
            <Popconfirm
              title={`Ẩn dịch vụ "${rec.name}"?`}
              description="Dịch vụ sẽ không hiển thị với khách. Có thể khôi phục."
              onConfirm={() => handleDeactivate(rec)}
              okText="Ẩn" cancelText="Hủy" okButtonProps={{ danger: true }}
            >
              <Button danger size="small" icon={<DeleteOutlined />}>Ẩn</Button>
            </Popconfirm>
          ) : (
            <Popconfirm
              title={`Kích hoạt lại "${rec.name}"?`}
              onConfirm={() => handleActivate(rec)}
              okText="Kích hoạt" cancelText="Hủy"
            >
              <Button size="small" type="dashed" style={{ color: '#52c41a', borderColor: '#52c41a' }}>
                Khôi phục
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      {/* Toolbar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16, alignItems: 'center', justifyContent: 'space-between' }}>
        <Space wrap>
          <Input
            prefix={<SearchOutlined style={{ color: '#bbb' }} />}
            placeholder="Tìm tên dịch vụ..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: 220 }} allowClear
          />
          <Select placeholder="Danh mục" value={filterCat} onChange={setFilterCat} allowClear style={{ width: 180 }}>
            {categories.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
          </Select>
          <Select value={filterStatus} onChange={setFilterStatus} style={{ width: 150 }}>
            <Option value="">Tất cả trạng thái</Option>
            <Option value="ACTIVE">Đang hoạt động</Option>
            <Option value="INACTIVE">Đã ẩn</Option>
          </Select>
          <Button icon={<ReloadOutlined />} onClick={fetchServices} loading={loading}>Tải lại</Button>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAdd} style={{ background: '#3b82f6' }}>
          + Thêm dịch vụ
        </Button>
      </div>

      <Table
        columns={columns} dataSource={services} rowKey="id" loading={loading}
        pagination={{ pageSize: 10 }} size="middle"
        locale={{ emptyText: 'Không có dịch vụ nào.' }}
      />

      {/* Add / Edit Modal */}
      <Modal
        open={modalOpen}
        title={editId ? 'Sửa dịch vụ' : 'Thêm dịch vụ mới'}
        onOk={handleSave} onCancel={() => setModalOpen(false)}
        confirmLoading={submitting} okText="Lưu" cancelText="Hủy"
        width={640} destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
          {/* Ảnh dịch vụ — Cloudinary upload */}
          <Form.Item label="Hình ảnh dịch vụ">
            <ServiceImageUpload value={imageUrl} onChange={setImageUrl} />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item
              name="name" label="Tên dịch vụ"
              rules={[{ required: true, message: 'Nhập tên dịch vụ.' }]}
              style={{ gridColumn: '1 / -1' }}
            >
              <Input placeholder="Ví dụ: Massage Toàn Thân 60 phút" />
            </Form.Item>

            <Form.Item name="categoryId" label="Danh mục" rules={[{ required: true, message: 'Chọn danh mục.' }]}>
              <Select placeholder="Chọn danh mục">
                {categories.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
              </Select>
            </Form.Item>

            <Form.Item name="status" label="Trạng thái">
              <Select>
                <Option value="ACTIVE">ACTIVE – Hiển thị</Option>
                <Option value="INACTIVE">INACTIVE – Ẩn</Option>
              </Select>
            </Form.Item>

            <Form.Item name="price" label="Giá (VNĐ)" rules={[{ required: true, message: 'Nhập giá.' }]}>
              <InputNumber
                min={0} step={10000} style={{ width: '100%' }}
                formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                placeholder="200000"
              />
            </Form.Item>

            <Form.Item name="unit" label="Đơn vị tính">
              <Select>
                <Option value="lần">lần</Option>
                <Option value="người">người</Option>
                <Option value="phần">phần</Option>
                <Option value="giờ">giờ</Option>
                <Option value="ngày">ngày</Option>
                <Option value="chai">chai</Option>
                <Option value="ly">ly</Option>
              </Select>
            </Form.Item>

            <Form.Item name="description" label="Mô tả" style={{ gridColumn: '1 / -1' }}>
              <Input.TextArea rows={2} placeholder="Mô tả ngắn về dịch vụ..." />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════════
export default function ServiceManagementSection() {
  return (
    <Card
      style={{ margin: '0', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
      title={
        <Space>
          <AppstoreOutlined style={{ color: '#3b82f6', fontSize: 18 }} />
          <Title level={4} style={{ margin: 0 }}>Quản lý Dịch vụ</Title>
        </Space>
      }
    >
      <Tabs
        defaultActiveKey="services"
        items={[
          {
            key: 'services',
            label: <span><UnorderedListOutlined /> Dịch vụ</span>,
            children: <ServiceTab />,
          },
          {
            key: 'categories',
            label: <span><AppstoreOutlined /> Danh mục</span>,
            children: <CategoryTab />,
          },
        ]}
      />
    </Card>
  );
}
