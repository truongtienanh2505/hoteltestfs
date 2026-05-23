import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Input,
  Select,
  Typography,
  Card,
  ConfigProvider,
  message,
  Popconfirm,
  Switch,
  Tag,
  Tooltip,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, UndoOutlined, ReloadOutlined, SearchOutlined, UploadOutlined, DownloadOutlined } from '@ant-design/icons';
import { equipmentApi } from '../../api/equipmentApi';
import EquipmentModal from './components/EquipmentModal';
import SupplierLogsModal from './components/SupplierLogsModal';

const RoomInventory = () => {
  const [equipments, setEquipments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [supplierModal, setSupplierModal] = useState({ open: false, equipment: null });
  
  const [searchText, setSearchText] = useState('');
  const [category, setCategory] = useState(null);

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
  });

  const fetchEquipments = async () => {
    setLoading(true);
    try {
      const res = showDeleted
        ? await equipmentApi.getDeletedEquipments({ search: searchText, category })
        : await equipmentApi.getEquipments({ search: searchText, category });
      let dataList = [];
      if (Array.isArray(res?.data?.data)) dataList = res.data.data;
      else if (Array.isArray(res?.data)) dataList = res.data;
      else if (Array.isArray(res)) dataList = res;
      setEquipments(dataList);
    } catch (e) {
      console.error('Lỗi tải vật tư:', e);
      message.error('Không tải được dữ liệu vật tư!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEquipments();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText, category, showDeleted]);

  const handleRefresh = () => {
    setSearchText('');
    setCategory(null);
    fetchEquipments();
  };

  const columns = [
    {
      title: 'Ảnh',
      dataIndex: 'imageUrl',
      key: 'imageUrl',
      align: 'center',
      render: (img) => (
        img ? <img src={img} alt="vật tư" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} /> 
            : <div style={{ width: 40, height: 40, background: '#f0f0f0', borderRadius: 4, display: 'inline-block' }} />
      ),
    },
    {
      title: 'Tên vật tư',
      dataIndex: 'name',
      key: 'name',
      render: (t, r) => (
        <div>
          <div style={{ fontWeight: 500 }}>{t}</div>
          <div style={{ fontSize: 12, color: 'gray' }}>{r.itemCode}</div>
        </div>
      )
    },
    {
      title: 'ĐVT',
      dataIndex: 'unit',
      key: 'unit',
      align: 'center',
    },
    {
      title: 'Tổng',
      dataIndex: 'totalQuantity',
      key: 'totalQuantity',
      align: 'center',
      render: (v) => <b style={{ color: '#1890ff' }}>{v}</b>
    },
    {
      title: 'Sẵn kho',
      dataIndex: 'inStockQuantity',
      key: 'inStockQuantity',
      align: 'center',
      render: (v) => <b style={{ color: '#52c41a' }}>{v}</b>
    },
    {
      title: 'Đang dùng',
      dataIndex: 'inUseQuantity',
      key: 'inUseQuantity',
      align: 'center',
      render: (v) => <b style={{ color: '#faad14' }}>{v}</b>
    },
    {
      title: 'Hỏng/Mất',
      dataIndex: 'damagedQuantity',
      key: 'damagedQuantity',
      align: 'center',
      render: (v) => (
        <span style={{ color: v > 0 || v < 0 ? '#ff4d4f' : '#d9d9d9', fontWeight: v > 0 || v < 0 ? 'bold' : 'normal' }}>
          {v}
        </span>
      )
    },
    {
      title: 'Giá đền bù',
      dataIndex: 'defaultPriceIfLost',
      key: 'defaultPriceIfLost',
      render: (v) => (
        <span style={{ color: '#595959' }}>
          {new Intl.NumberFormat('vi-VN', {
             style: 'currency',
             currency: 'VND',
          }).format(v || 0)}
        </span>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      align: 'center',
      render: (_, record) => showDeleted ? (
        // Chế độ xem đã xóa: chỉ hiện nút Khôi phục
        <Popconfirm
          title="Khôi phục vật tư"
          description={`Khôi phục "${record.name}" vào kho?`}
          okText="Khôi phục"
          cancelText="Hủy"
          onConfirm={async () => {
            try {
              const res = await equipmentApi.restoreEquipment(record.id);
              message.success(res.data.message || `Đã khôi phục "${record.name}"!`);
              fetchEquipments();
            } catch (err) {
              message.error(err?.response?.data?.message || 'Không thể khôi phục!');
            }
          }}
        >
          <Tooltip title="Khôi phục vào kho">
            <Button type="text" icon={<UndoOutlined />} style={{ color: '#52c41a' }} />
          </Tooltip>
        </Popconfirm>
      ) : (
        // Chế độ bình thường: Sửa + Xem NCC + Xóa
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingItem(record);
              setModalOpen(true);
            }}
          />
          <Tooltip title="Xem nhà cung cấp">
            <Button
              type="text"
              icon={<EyeOutlined />}
              style={{ color: '#1677ff' }}
              onClick={() => setSupplierModal({ open: true, equipment: record })}
            />
          </Tooltip>
          <Popconfirm
            title="Xóa vật tư"
            description={`Bạn có chắc muốn xóa "${record.name}" không?`}
            okText="Xóa"
            cancelText="Hủy"
            okType="danger"
            onConfirm={async () => {
              try {
                await equipmentApi.deleteEquipment(record.id);
                message.success(`Đã xóa "${record.name}" khỏi kho!`);
                fetchEquipments();
              } catch (err) {
                message.error(err?.response?.data?.message || 'Không thể xóa vật tư!');
              }
            }}
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <ConfigProvider theme={{ 
      token: { 
        colorPrimary: '#1677ff',
        colorBgContainer: '#fff',
        borderRadius: 8
      } 
    }}>
      <div style={{ padding: '0 24px 24px', minHeight: '80vh', background: '#f5f5f5' }}>
        <Typography.Title level={4} style={{ color: '#1f2937', marginBottom: 20 }}>
          Danh mục Quản lý Kho vật tư
        </Typography.Title>

        <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <Space size="middle">
              <Input
                placeholder="Tìm theo tên, mã..."
                prefix={<SearchOutlined />}
                style={{ width: 250 }}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
              <Select
                placeholder="Lọc Danh mục"
                style={{ width: 150 }}
                allowClear
                value={category}
                onChange={(v) => setCategory(v)}
                options={[
                  { value: 'Trang thiết bị', label: 'Trang thiết bị' },
                  { value: 'Nội thất', label: 'Nội thất' },
                  { value: 'Điện tử', label: 'Điện tử' },
                  { value: 'Minibar', label: 'Minibar' },
                  { value: 'Đồ uống', label: 'Đồ uống' },
                  { value: 'Đồ ăn', label: 'Đồ ăn' },
                  { value: 'Khác', label: 'Khác' },
                ]}
              />
              <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
                Làm mới
              </Button>
              <Switch
                checkedChildren="Xem đã xóa"
                unCheckedChildren="Xem đã xóa"
                checked={showDeleted}
                onChange={(val) => {
                  setShowDeleted(val);
                  setSearchText('');
                  setCategory(null);
                }}
                style={{ backgroundColor: showDeleted ? '#ff4d4f' : undefined }}
              />
            </Space>

            <Space>
              <Button
                icon={<DownloadOutlined />}
                onClick={async () => {
                  try {
                    const params = {};
                    if (searchText) params.search = searchText;
                    if (category) params.category = category;

                    const response = await equipmentApi.exportExcel(params);
                    const url = window.URL.createObjectURL(new Blob([response.data]));
                    const link = document.createElement('a');
                    link.href = url;

                    // Đặt tên file theo filter đang chọn
                    let fileName = 'DanhSachVatTu';
                    if (category) fileName += `_${category}`;
                    if (searchText) fileName += `_Tim-${searchText}`;
                    link.setAttribute('download', `${fileName}.xlsx`);

                    document.body.appendChild(link);
                    link.click();
                    link.parentNode.removeChild(link);

                    const total = equipments.length;
                    message.success(`Xuất Excel thành công! (${total} vật tư)`);
                  } catch (error) {
                    console.error(error);
                    message.error('Lỗi khi xuất file Excel!');
                  }
                }}
              >
                Xuất Excel
              </Button>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <Button icon={<UploadOutlined />}>Nhập Excel</Button>
                <input
                  type="file"
                  accept=".xlsx"
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;

                    // Chỉ cho phép file .xlsx
                    if (!file.name.endsWith('.xlsx')) {
                      message.error('Hệ thống chỉ hỗ trợ định dạng file .xlsx mới (không hỗ trợ .xls cũ)');
                      e.target.value = null;
                      return;
                    }

                    const formData = new FormData();
                    formData.append('file', file);

                    const hide = message.loading('Đang xử lý file Excel...', 0);
                    try {
                      const response = await equipmentApi.importExcel(formData);
                      if (response && response.data?.success) {
                        message.success(response.data.message || 'Nhập dữ liệu thành công!');

                        // Hiển thị cảnh báo cho từng dòng bị bỏ qua do mơ hồ
                        const warnings = response.data?.warnings;
                        if (Array.isArray(warnings) && warnings.length > 0) {
                          warnings.forEach((w) => message.warning(w, 8));
                        }

                        fetchEquipments();
                      } else {
                        message.error(response?.data?.message || 'Có lỗi xảy ra khi nhập dữ liệu!');
                      }
                    } catch (error) {
                      console.error(error);
                      if (error.response?.data?.message?.includes("corrupted data")) {
                        message.error('File Excel bị lỗi định dạng hoặc đang được mở ở phần mềm khác. Vui lòng tắt file Excel đi và thử lại.');
                      } else {
                        message.error(error.response?.data?.message || 'Lỗi khi nhập file Excel!');
                      }
                    } finally {
                      hide();
                      e.target.value = null;
                    }
                  }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    opacity: 0,
                    cursor: 'pointer'
                  }}
                />
              </div>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingItem(null);
                  setModalOpen(true);
                }}
                style={{ background: '#1677ff' }}
              >
                Thêm vật tư
              </Button>
            </Space>
          </div>

          <Table
            columns={columns}
            dataSource={equipments}
            rowKey="id"
            loading={loading}
            scroll={{ x: 1000, y: 'calc(100vh - 280px)' }}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: equipments.length,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50'],
              onChange: (page, pageSize) => {
                setPagination({ current: page, pageSize });
              },
            }}
          />
        </Card>

        {modalOpen && (
          <EquipmentModal
            open={modalOpen}
            onCancel={() => {
              setModalOpen(false);
              setEditingItem(null);
            }}
            editingItem={editingItem}
            onSuccess={fetchEquipments}
          />
        )}
      </div>

      <SupplierLogsModal
        open={supplierModal.open}
        equipment={supplierModal.equipment}
        onCancel={() => setSupplierModal({ open: false, equipment: null })}
      />
    </ConfigProvider>
  );
};

export default RoomInventory;