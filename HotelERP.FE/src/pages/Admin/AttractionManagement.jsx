import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Modal, Form, Input, Upload, message, Popconfirm, Tag, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined, EnvironmentOutlined, AimOutlined } from '@ant-design/icons';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import attractionApi from '../../api/attractionApi';

// Fix default leaflet icon (webpack/vite issue)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const { TextArea } = Input;
const { Option } = Select;

const CLOUDINARY_BASE = 'https://res.cloudinary.com/dfvdvkssv/image/upload/hotel_placeholders';

// Vị trí mặc định: Đồng Nai
const DEFAULT_CENTER = [10.9405, 106.8232];

const getPlaceholderImage = (item) => {
  if (item.imageUrl && (item.imageUrl.startsWith('http') || item.imageUrl.startsWith('https'))) return item.imageUrl;
  const name = (item.name || '').toLowerCase();
  const type = (item.type || '').toLowerCase();
  if (name.includes('biển') || name.includes('beach')) return `${CLOUDINARY_BASE}/beach_placeholder.jpg`;
  if (name.includes('chợ') || name.includes('thương mại')) return `${CLOUDINARY_BASE}/market_placeholder.jpg`;
  if (name.includes('bảo tàng') || name.includes('museum') || name.includes('di tích')) return `${CLOUDINARY_BASE}/museum_placeholder.jpg`;
  if (name.includes('phố') || name.includes('street')) return `${CLOUDINARY_BASE}/street_placeholder.jpg`;
  if (name.includes('chùa') || name.includes('pagoda') || name.includes('đền')) return `${CLOUDINARY_BASE}/pagoda_placeholder.jpg`;
  if (name.includes('vui chơi') || name.includes('park') || type.includes('giải trí')) return `${CLOUDINARY_BASE}/park_placeholder.jpg`;
  if (name.includes('suối') || name.includes('thác') || name.includes('nước')) return `${CLOUDINARY_BASE}/waterfall_placeholder.jpg`;
  if (name.includes('làng') || name.includes('nghề')) return `${CLOUDINARY_BASE}/village_placeholder.jpg`;
  if (name.includes('hoàng hôn') || name.includes('ngắm')) return `${CLOUDINARY_BASE}/sunset_placeholder.jpg`;
  if (name.includes('núi') || name.includes('rừng')) return `${CLOUDINARY_BASE}/mountain_placeholder.jpg`;
  if (type.includes('Ẩm thực') || name.includes('food') || name.includes('ăn')) return `${CLOUDINARY_BASE}/food_placeholder.jpg`;
  return `${CLOUDINARY_BASE}/market_placeholder.jpg`;
};

// ── Sub-component: lắng nghe click trên bản đồ ──
function ClickHandler({ onMapClick }) {
  useMapEvents({ click: (e) => onMapClick(e.latlng) });
  return null;
}

// ── Sub-component: tự pan/zoom khi marker thay đổi ──
function RecenterMap({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.setView(position, Math.max(map.getZoom(), 14), { animate: true });
    }
  }, [position, map]);
  return null;
}

// ── Map Picker Component (OpenStreetMap) ──
function MapPicker({ value, onChange }) {
  const markerPos = value?.lat && value?.lng ? [value.lat, value.lng] : null;

  const handleMapClick = (latlng) => {
    const lat = parseFloat(latlng.lat.toFixed(6));
    const lng = parseFloat(latlng.lng.toFixed(6));
    onChange?.({ lat, lng });
  };

  return (
    <div>
      {/* Banner hướng dẫn */}
      <div style={{
        background: 'linear-gradient(90deg, #e6f4ff, #f0f9ff)',
        border: '1px solid #91caff',
        borderRadius: '8px 8px 0 0',
        padding: '8px 12px',
        fontSize: 13,
        color: '#1677ff',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}>
        <AimOutlined />
        <span>Nhấp vào bản đồ để chọn vị trí địa điểm</span>
        {markerPos && (
          <span style={{ marginLeft: 'auto', color: '#389e0d', fontWeight: 500 }}>
            📍 {value.lat}, {value.lng}
          </span>
        )}
      </div>

      {/* Bản đồ OpenStreetMap */}
      <MapContainer
        center={markerPos || DEFAULT_CENTER}
        zoom={markerPos ? 14 : 12}
        style={{ width: '100%', height: 280, borderRadius: '0 0 8px 8px', zIndex: 0 }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onMapClick={handleMapClick} />
        {markerPos && (
          <>
            <RecenterMap position={markerPos} />
            <Marker position={markerPos}>
              <Popup>
                📍 {value.lat}, {value.lng}
              </Popup>
            </Marker>
          </>
        )}
      </MapContainer>

      {/* Ô tọa độ bên dưới bản đồ */}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 2 }}>Vĩ độ (Latitude)</label>
          <input
            type="number"
            step="0.000001"
            value={value?.lat ?? ''}
            onChange={(e) => onChange?.({ lat: parseFloat(e.target.value) || 0, lng: value?.lng || 0 })}
            placeholder="Tự động điền khi click bản đồ"
            style={{
              width: '100%', padding: '6px 10px', border: '1px solid #d9d9d9',
              borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 2 }}>Kinh độ (Longitude)</label>
          <input
            type="number"
            step="0.000001"
            value={value?.lng ?? ''}
            onChange={(e) => onChange?.({ lat: value?.lat || 0, lng: parseFloat(e.target.value) || 0 })}
            placeholder="Tự động điền khi click bản đồ"
            style={{
              width: '100%', padding: '6px 10px', border: '1px solid #d9d9d9',
              borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
        {markerPos && (
          <button
            type="button"
            title="Xóa vị trí"
            onClick={() => onChange?.(null)}
            style={{
              alignSelf: 'flex-end', padding: '6px 10px',
              border: '1px solid #ffa39e', borderRadius: 6,
              background: '#fff1f0', color: '#ff4d4f',
              cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap',
            }}
          >
            Xóa
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main Component ──
export default function AttractionManagement() {
  const [attractions, setAttractions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [fileList, setFileList] = useState([]);          // ảnh đại diện chính
  const [galleryList, setGalleryList] = useState([]);    // ảnh gallery mới chuẩn bị upload
  const [existingGallery, setExistingGallery] = useState([]); // ảnh gallery đã lưu [{url, index}]
  const [markerPos, setMarkerPos] = useState(null); // { lat, lng }
  const [form] = Form.useForm();

  const fetchAttractions = async () => {
    setLoading(true);
    try {
      const response = await attractionApi.getAll();
      setAttractions(response.data);
    } catch (error) {
      message.error('Lỗi khi tải danh sách địa điểm!');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAttractions(); }, []);

  const handleAdd = () => {
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue({ Status: 'ACTIVE' });
    setFileList([]);
    setGalleryList([]);
    setExistingGallery([]);
    setMarkerPos(null);
    setIsModalVisible(true);
  };

  const handleEdit = async (record) => {
    setLoading(true);
    try {
      const response = await attractionApi.getById(record.id);
      const detail = response.data;
      setEditingId(detail.id);

      form.setFieldsValue({
        Name: detail.name,
        Type: detail.type,
        Description: detail.description,
        DistanceKm: detail.distanceKm,
        Status: detail.status || 'ACTIVE',
      });

      if (detail.latitude && detail.longitude) {
        setMarkerPos({ lat: detail.latitude, lng: detail.longitude });
      } else {
        setMarkerPos(null);
      }

      if (detail.imageUrl) {
        setFileList([{ uid: '-1', name: 'image.png', status: 'done', url: detail.imageUrl }]);
      } else {
        setFileList([]);
      }

      // Load gallery hiện có
      try {
        const gallery = detail.galleryImages ? JSON.parse(detail.galleryImages) : [];
        setExistingGallery(gallery.map((url, i) => ({ url, index: i })));
      } catch { setExistingGallery([]); }
      setGalleryList([]);

      setIsModalVisible(true);
    } catch (error) {
      message.error('Không thể tải chi tiết địa điểm');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await attractionApi.delete(id);
      message.success('Xóa địa điểm thành công');
      fetchAttractions();
    } catch (error) {
      message.error('Lỗi khi xóa địa điểm');
    }
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();

      if (!markerPos?.lat || !markerPos?.lng) {
        message.warning('Vui lòng chọn vị trí trên bản đồ!');
        return;
      }

      const formData = new FormData();
      formData.append('Name', values.Name);
      if (values.Type) formData.append('Type', values.Type);
      if (values.Description) formData.append('Description', values.Description);
      formData.append('Latitude', markerPos.lat);
      formData.append('Longitude', markerPos.lng);
      if (values.DistanceKm) formData.append('DistanceKm', values.DistanceKm);
      formData.append('Status', values.Status || 'ACTIVE');

      if (fileList.length > 0 && fileList[0].originFileObj) {
        formData.append('ImageFile', fileList[0].originFileObj);
      }

      // Append các ảnh gallery mới
      galleryList.forEach((f) => {
        if (f.originFileObj) formData.append('GalleryFiles', f.originFileObj);
      });

      setLoading(true);
      if (editingId) {
        await attractionApi.update(editingId, formData);
        message.success('Cập nhật địa điểm thành công!');
      } else {
        await attractionApi.create(formData);
        message.success('Thêm địa điểm mới thành công!');
      }

      setIsModalVisible(false);
      fetchAttractions();
    } catch (error) {
      if (error.errorFields) return;
      const errorMsg = error.response?.data?.message || 'Có lỗi xảy ra khi lưu địa điểm!';
      message.error(errorMsg);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Hình ảnh', dataIndex: 'imageUrl', key: 'imageUrl',
      render: (_, record) => (
        <div style={{ width: 80, height: 55, borderRadius: 6, overflow: 'hidden', background: '#f5f5f5' }}>
          <img
            src={getPlaceholderImage(record)}
            alt={record.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => { e.target.onerror = null; e.target.src = `${CLOUDINARY_BASE}/market_placeholder.jpg`; }}
          />
        </div>
      ),
    },
    { title: 'Tên địa điểm', dataIndex: 'name', key: 'name' },
    {
      title: 'Loại hình', dataIndex: 'type', key: 'type',
      render: (text) => text ? <Tag color="geekblue">{text}</Tag> : <Tag>Khác</Tag>,
    },
    {
      title: 'Tọa độ', key: 'coordinates',
      render: (_, record) => (
        <span style={{ fontSize: 12, color: '#888', display: 'flex', alignItems: 'center', gap: 4 }}>
          <EnvironmentOutlined style={{ color: '#1677ff' }} />
          {record.latitude?.toFixed(4)}, {record.longitude?.toFixed(4)}
        </span>
      ),
    },
    {
      title: 'Trạng thái', dataIndex: 'status', key: 'status',
      render: (status) => <Tag color={status === 'ACTIVE' ? 'success' : 'default'}>{status || 'ACTIVE'}</Tag>,
    },
    {
      title: 'Thao tác', key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button type="primary" icon={<EditOutlined />} onClick={() => handleEdit(record)}>Sửa</Button>
          <Popconfirm
            title="Bạn có chắc chắn muốn xóa địa điểm này không?"
            onConfirm={() => handleDelete(record.id)}
            okText="Đồng ý"
            cancelText="Hủy"
          >
            <Button danger icon={<DeleteOutlined />}>Xóa</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24, background: '#fff', minHeight: '80vh', borderRadius: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 'bold', margin: 0, color: '#262b3f' }}>
          Quản lý Địa điểm (Attractions)
        </h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} size="large" style={{ background: '#3b82f6' }}>
          Thêm Địa điểm Mới
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={attractions}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={editingId ? 'Sửa Địa điểm' : 'Thêm Địa điểm Mới'}
        open={isModalVisible}
        onOk={handleOk}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={loading}
        width={760}
        okText="Lưu lại"
        cancelText="Hủy"
        styles={{ body: { maxHeight: '75vh', overflowY: 'auto', paddingRight: 4 } }}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          {/* ── HÀNG TRÊN: 2 CỘT ── */}

          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

            {/* Cột trái: Tên + Loại hình + Trạng thái */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <Form.Item
                name="Name"
                label="Tên địa điểm"
                rules={[{ required: true, message: 'Vui lòng nhập tên địa điểm!' }]}
                style={{ marginBottom: 12 }}
              >
                <Input placeholder="Ví dụ: Khu du lịch Bửu Long" />
              </Form.Item>

              <Form.Item name="Type" label="Loại hình" style={{ marginBottom: 12 }}>
                <Select placeholder="Chọn loại hình">
                  <Option value="Di tích">Di tích</Option>
                  <Option value="Ẩm thực">Ẩm thực</Option>
                  <Option value="Giải trí">Giải trí</Option>
                  <Option value="Thiên nhiên">Thiên nhiên</Option>
                </Select>
              </Form.Item>

              <Form.Item name="Status" label="Trạng thái" style={{ marginBottom: 0 }}>
                <Select>
                  <Option value="ACTIVE">Hoạt động (ACTIVE)</Option>
                  <Option value="INACTIVE">Ẩn (INACTIVE)</Option>
                </Select>
              </Form.Item>
            </div>

            {/* Cột phải: Hình ảnh đại diện */}
            <div style={{ flexShrink: 0 }}>
              <Form.Item label="Ảnh đại diện" style={{ marginBottom: 0 }}>
                <Upload
                  listType="picture-card"
                  fileList={fileList}
                  onChange={({ fileList: newList }) => setFileList(newList)}
                  beforeUpload={() => false}
                  maxCount={1}
                  accept="image/*"
                >
                  {fileList.length >= 1 ? null : (
                    <div>
                      <UploadOutlined />
                      <div style={{ marginTop: 8 }}>Tải lên</div>
                    </div>
                  )}
                </Upload>
              </Form.Item>
            </div>
          </div>

          {/* ── GALLERY NHIỀU ẢNH ── */}
          <Form.Item
            label={
              <span>
                📷 Ảnh Gallery
                <span style={{ color: '#888', fontWeight: 400, fontSize: 12, marginLeft: 6 }}>
                  (chọn nhiều ảnh)
                </span>
              </span>
            }
            style={{ marginTop: 4 }}
          >
            {/* Ảnh gallery đã có sẵn */}
            {existingGallery.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                {existingGallery.map((item) => (
                  <div key={item.index} style={{ position: 'relative' }}>
                    <img
                      src={item.url}
                      alt="gallery"
                      style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid #d9d9d9' }}
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (!editingId) return;
                        try {
                          const { default: axiosClient } = await import('../../api/axiosClient');
                          await axiosClient.delete(`/Attraction/${editingId}/gallery/${item.index}`);
                          setExistingGallery(prev => prev
                            .filter(g => g.index !== item.index)
                            .map((g, i) => ({ ...g, index: i }))
                          );
                          message.success('Đã xóa ảnh gallery');
                        } catch { message.error('Lỗi khi xóa ảnh'); }
                      }}
                      style={{
                        position: 'absolute', top: 2, right: 2,
                        background: 'rgba(255,0,0,0.75)', border: 'none',
                        borderRadius: '50%', width: 18, height: 18,
                        color: '#fff', fontSize: 10, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload ảnh gallery mới */}
            <Upload
              listType="picture-card"
              fileList={galleryList}
              onChange={({ fileList: newList }) => setGalleryList(newList)}
              beforeUpload={() => false}
              multiple
              accept="image/*"
            >
              <div>
                <PlusOutlined />
                <div style={{ marginTop: 8, fontSize: 12 }}>Thêm ảnh</div>
              </div>
            </Upload>
          </Form.Item>

          {/* ── MÔ TẢ (full-width) ── */}
          <Form.Item name="Description" label="Mô tả" style={{ marginTop: 12 }}>
            <TextArea rows={3} placeholder="Nhập mô tả ngắn về địa điểm..." />
          </Form.Item>

          {/* ── BẢN ĐỒ CHỌN VỊ TRÍ (OpenStreetMap) ── */}
          <Form.Item
            label={
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <EnvironmentOutlined style={{ color: '#1677ff' }} />
                Vị trí trên bản đồ
                {!markerPos && (
                  <span style={{ color: '#ff4d4f', fontWeight: 400, fontSize: 12 }}>(bắt buộc)</span>
                )}
              </span>
            }
          >
            <MapPicker value={markerPos} onChange={setMarkerPos} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
