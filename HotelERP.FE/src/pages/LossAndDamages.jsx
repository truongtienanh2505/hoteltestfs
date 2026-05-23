import React, { useState, useMemo, useEffect } from 'react';
import * as signalR from '@microsoft/signalr';
import axios from 'axios';
import axiosClient from '../api/axiosClient';
import {
  Table, Button, DatePicker,
  Space, Card, Row, Col, Typography, message,
  Select, InputNumber, Form, Input, Modal, Image, Upload
} from 'antd';
import {
  AppstoreOutlined, SearchOutlined, ReloadOutlined,
  WarningOutlined, DollarOutlined, ClockCircleOutlined,
  EditOutlined, DeleteOutlined, InboxOutlined, PlusOutlined, UploadOutlined
} from '@ant-design/icons';

const { RangePicker } = DatePicker;
const { Text, Title } = Typography;
const { Option } = Select;

export default function LossAndDamages() {
  const [data, setData] = useState([]);
  const [stats, setStats] = useState({ totalIncidents: 0, totalAmount: 0, totalQuantity: 0 });
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString('vi-VN', { hour12: false }));

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [form] = Form.useForm();

  const [uploadFile, setUploadFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const [selectedDates, setSelectedDates] = useState(null);
  const [appliedDates, setAppliedDates] = useState(null);

  // --- NEW STATE FOR CREATION ---
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [roomInventories, setRoomInventories] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [selectedInventory, setSelectedInventory] = useState(null);
  const [compensationType, setCompensationType] = useState('percentage'); // 'percentage', 'custom'
  const [editCompensationType, setEditCompensationType] = useState('percentage');
  const [isFixed100Pct, setIsFixed100Pct] = useState(false);
  const [isEditFixed100Pct, setIsEditFixed100Pct] = useState(false);
  const [createForm] = Form.useForm();
  // ------------------------------

  const handleApplyFilter = () => {
    setAppliedDates(selectedDates);
    message.success('Đã áp dụng bộ lọc ngày!');
  };

  // --- KẾT NỐI SIGNALR ---
  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl("http://localhost:5080/damageHub") // Bật URL này khi Backend SS
      .withAutomaticReconnect()
      .build();

    connection.on("ReceiveNewDamage", (newRecord) => {
      setData(prevList => [newRecord, ...prevList]);
      setStats(prev => ({
        totalIncidents: prev.totalIncidents + 1,
        totalAmount: prev.totalAmount + newRecord.penaltyAmount,
        totalQuantity: prev.totalQuantity + newRecord.quantity
      }));
      message.success(`Có báo cáo đền bù mới cho phòng ${newRecord.roomNumber}!`);
      setLastUpdated(new Date().toLocaleTimeString('vi-VN', { hour12: false }));
    });

    connection.start()
      .then(() => console.log("Đã kết nối Realtime với SignalR!"))
      .catch(err => console.error("Lỗi kết nối SignalR: ", err));

    return () => {
      connection.stop();
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await axiosClient.get("/LossAndDamages");
      setData(response.data.data);
      setStats(response.data.stats);
      setLastUpdated(new Date().toLocaleTimeString('vi-VN', { hour12: false }));
    } catch (error) {
      console.error(error);
      message.error("Lỗi khi kết nối API Backend!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(); // Load lần đầu khi mở
  }, []);

  // --- NEW HANDLERS FOR CREATION ---
  const handleOpenCreateModal = async () => {
    setIsCreateModalVisible(true);
    setLoading(true);
    try {
      const response = await axiosClient.get("/Rooms");
      setRooms(response.data.data);
    } catch (error) {
      message.error("Lỗi khi tải danh sách phòng!");
    } finally {
      setLoading(false);
    }
  };

  const handleRoomChange = async (roomId) => {
    setSelectedRoomId(roomId);
    createForm.setFieldsValue({ equipmentId: undefined });
    setRoomInventories([]);
    setSelectedInventory(null);
    try {
      const response = await axiosClient.get(`/rooms/${roomId}/inventories`);
      setRoomInventories(response.data.data || []);
    } catch (error) {
      message.error("Lỗi khi tải vật tư của phòng!");
    }
  };

  const handleInventoryChange = (inventoryId) => {
    const item = roomInventories.find(ri => ri.id === inventoryId);
    setSelectedInventory(item);

    // Nếu là đồ ăn, thức uống, minibar, hoặc sản phẩm giá trị nhỏ hơn 100k
    const isConsumable = item && (
      item.category === 'Đồ ăn' ||
      item.category === 'Đồ uống' ||
      item.category === 'Minibar' ||
      item.priceIfLost <= 50000
    );

    if (isConsumable) {
      setIsFixed100Pct(true);
      setCompensationType('percentage');
      createForm.setFieldsValue({ percentageValue: 100 });
    } else {
      setIsFixed100Pct(false);
      setCompensationType('percentage');
      createForm.setFieldsValue({ percentageValue: 100 });
    }
  };

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      const finalPenaltyAmount = calculatePenaltyAmount(values.quantity);

      const payload = {
        roomId: values.roomId,
        equipmentId: selectedInventory.equipmentId, // Lấy từ inventory đã chọn
        quantity: values.quantity,
        description: values.description,
        penaltyAmount: finalPenaltyAmount
      };

      await axiosClient.post("/LossAndDamages", payload);
      message.success('Đã báo cáo đền bù thành công!');
      setIsCreateModalVisible(false);
      createForm.resetFields();
      setSelectedInventory(null);
      setCompensationType('percentage');
      fetchData();
    } catch (error) {
      console.error(error);
      message.error('Lỗi khi gửi báo cáo!');
    }
  };

  const calculatePenaltyAmount = (quantity) => {
    if (!selectedInventory) return 0;
    const basePrice = selectedInventory.priceIfLost * (quantity || 0);

    if (compensationType === 'percentage') {
      const pct = createForm.getFieldValue('percentageValue') || 0;
      return (basePrice * pct) / 100;
    }
    if (compensationType === 'custom') {
      return createForm.getFieldValue('customAmount') || 0;
    }
    return basePrice;
  };

  // Lắng nghe thay đổi để cập nhật preview tiền
  const qty = Form.useWatch('quantity', createForm);
  const pctVal = Form.useWatch('percentageValue', createForm);
  const customAmt = Form.useWatch('customAmount', createForm);
  const currentPenaltyPreview = useMemo(() => calculatePenaltyAmount(qty), [qty, pctVal, customAmt, selectedInventory, compensationType]);

  // --- LOGIC TÍNH TOÁN CHO MODAL SỬA ---
  const editQty = Form.useWatch('quantity', form);
  const editPctVal = Form.useWatch('editPercentageValue', form);

  useEffect(() => {
    if (isEditModalVisible && editingRecord) {
      const basePrice = editingRecord.priceIfLost || 0;
      const totalBase = basePrice * (editQty || 0);

      if (editCompensationType === 'percentage') {
        const finalAmt = (totalBase * (editPctVal || 0)) / 100;
        form.setFieldsValue({ penaltyAmount: finalAmt });
      }
    }
  }, [editQty, editPctVal, editCompensationType, isEditModalVisible, editingRecord]);
  // ------------------------------------
  // ---------------------------------

  const handleEdit = (record) => {
    setEditingRecord(record);
    setUploadFile(null);
    setPreviewUrl(record.evidenceImageUrl || null);

    // Tính toán xem có bị khóa cứng không dựa vào category và priceIfLost
    const isConsumable = record.category === 'Đồ ăn' ||
      record.category === 'Đồ uống' ||
      record.category === 'Minibar' ||
      (record.priceIfLost && record.priceIfLost <= 50000);
    setIsEditFixed100Pct(isConsumable);

    let pct = 100;
    if (record.priceIfLost && record.quantity && record.penaltyAmount > 0) {
      pct = Math.round((record.penaltyAmount / (record.priceIfLost * record.quantity)) * 100);
    } else if (record.penaltyAmount === 0) {
      pct = 0;
    }

    // Khóa cứng thì ép về 100%
    if (isConsumable) {
      pct = 100;
    }

    setEditCompensationType('percentage');

    form.setFieldsValue({
      quantity: record.quantity,
      description: record.description,
      penaltyAmount: record.penaltyAmount,
      editPercentageValue: pct
    });
    setIsEditModalVisible(true);
  };

  const handleDeleteImage = () => {
    if (uploadFile) {
      setUploadFile(null);
      setPreviewUrl(editingRecord.evidenceImageUrl || null);
      message.success('Đã hủy ảnh chọn mới');
      return;
    }

    if (!editingRecord.evidenceImageUrl) return;

    Modal.confirm({
      title: 'Xác nhận xóa ảnh',
      content: 'Bạn có chắc chắn muốn xóa ảnh bằng chứng này không?',
      okText: 'Xóa',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await axiosClient.delete(`/LossAndDamages/${editingRecord.id}/image`);
          setPreviewUrl(null);
          setEditingRecord(prev => ({ ...prev, evidenceImageUrl: null }));
          message.success('Xóa ảnh thành công!');
          fetchData();
        } catch (error) {
          console.error(error);
          message.error('Lỗi khi xóa ảnh trên Server!');
        }
      }
    });
  };

  const handleUpdate = async () => {
    try {
      const values = await form.validateFields();
      await axiosClient.put(`/LossAndDamages/${editingRecord.id}`, values);

      // Tiền hành upload ảnh nếu có file mới được chọn
      if (uploadFile) {
        const formData = new FormData();
        formData.append('file', uploadFile);
        await axiosClient.post(`/LossAndDamages/${editingRecord.id}/image`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      message.success('Cập nhật thành công!');
      setIsEditModalVisible(false);
      setUploadFile(null);
      fetchData(); // Cập nhật lại Stats & Ảnh
    } catch (error) {
      if (error.isAxiosError) {
        message.error('Lỗi khi cập nhật trên Server!');
      } else {
        console.error(error);
      }
    }
  };

  const handleDelete = (id) => {
    Modal.confirm({
      title: 'Xác nhận xóa',
      content: 'Bạn có chắc chắn muốn xóa vĩnh viễn báo cáo đền bù này không?',
      okText: 'Xóa',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await axiosClient.delete(`/LossAndDamages/${id}`);
          setData(prev => prev.filter(item => item.id !== id));
          message.success('Đã xóa thành công!');
          fetchData(); // Cập nhật lại Stats
        } catch (error) {
          console.error("Lỗi khi xóa:", error);
          message.error('Không thể xóa dữ liệu từ Server!');
        }
      }
    });
  };

  // Thống kê & Filter
  const filteredData = useMemo(() => {
    if (!appliedDates || appliedDates.length !== 2) return data;
    const start = appliedDates[0].startOf('day').valueOf();
    const end = appliedDates[1].endOf('day').valueOf();

    return data.filter(item => {
      if (!item.createdAt) return false;
      const itemDate = new Date(item.createdAt).getTime();
      return itemDate >= start && itemDate <= end;
    });
  }, [data, appliedDates]);

  const displayStats = useMemo(() => {
    if (!appliedDates || appliedDates.length !== 2) return stats; // dùng stats gốc từ BE
    return {
      totalIncidents: filteredData.length,
      totalAmount: filteredData.reduce((sum, item) => sum + (item.penaltyAmount || 0), 0),
      totalQuantity: filteredData.reduce((sum, item) => sum + (item.quantity || 0), 0)
    };
  }, [filteredData, stats, appliedDates]);

  const { totalIncidents, totalAmount, totalQuantity } = displayStats;

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return (
      <div style={{ display: 'flex', flexDirection: 'column' }} className="text-gray-600 text-sm">
        <span>{`${day}/${month}/${year}`}</span>
        <span className="text-gray-400">{`${hours}:${minutes}`}</span>
      </div>
    );
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80, align: 'center' },
    {
      title: 'Bằng chứng',
      dataIndex: 'evidenceImageUrl',
      key: 'evidence',
      width: 100,
      render: (img) => img ? (
        <Image
          width={60}
          height={60}
          src={img}
          style={{ objectFit: 'cover', borderRadius: '6px', border: '1px solid #d9d9d9' }}
          preview={{ mask: 'Xem' }}
          alt="Bằng chứng"
        />
      ) : <span className="text-gray-400 text-sm">Không ảnh</span>
    },
    { title: 'Số phòng', dataIndex: 'roomNumber', key: 'roomNumber', width: 100, className: 'font-medium' },
    {
      title: 'Vật tư',
      dataIndex: 'itemName',
      key: 'itemName',
      render: (text) => <span className="text-blue-600 font-medium whitespace-normal break-words">{text}</span>
    },
    { title: 'SL Hỏng', dataIndex: 'quantity', key: 'quantity', width: 90, align: 'center' },
    {
      title: 'Tiền phạt (VND)',
      dataIndex: 'penaltyAmount',
      key: 'penaltyAmount',
      width: 150,
      render: (amount) => <span className="text-red-500 font-semibold">{amount.toLocaleString('vi-VN')}đ</span>
    },
    { title: 'Mô tả', dataIndex: 'description', key: 'description', render: (text) => <span className="whitespace-normal break-words">{text}</span> },
    {
      title: 'Ngày báo cáo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (date) => formatDate(date)
    },
    {
      title: 'Thao tác',
      key: 'action',
      align: 'center',
      width: 100,
      render: (_, record) => (
        <Space size="middle">
          <Button type="text" onClick={() => handleEdit(record)} icon={<EditOutlined className="text-gray-500 hover:text-blue-500" />} />
          <Button type="text" onClick={() => handleDelete(record.id)} icon={<DeleteOutlined className="text-gray-500 hover:text-red-500" />} />
        </Space>
      )
    }
  ];

  return (
    <div className="p-6 overflow-y-auto w-full max-w-screen-2xl mx-auto font-sans min-h-screen">
      {/* KHU VỰC THỐNG KÊ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-5">

        {/* Card 1: Tổng sự cố */}
        <div
          style={{ background: 'linear-gradient(135deg, #fff7e6 0%, #ffe7ba 100%)', borderLeft: '3px solid #fa8c16' }}
          className="relative rounded-xl px-4 py-3 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
        >
          <div style={{ position: 'absolute', right: -8, top: -8, fontSize: 60, opacity: 0.07, color: '#fa8c16', lineHeight: 1 }}>
            <WarningOutlined />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <div style={{ background: '#fa8c16', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <WarningOutlined style={{ color: '#fff', fontSize: 14 }} />
            </div>
            <span style={{ fontSize: 11, color: '#8c6d3f', fontWeight: 500, letterSpacing: '0.03em', textTransform: 'uppercase' }}>Tổng sự cố</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 600, color: '#d46b08', lineHeight: 1 }}>{totalIncidents}</div>
          <div style={{ fontSize: 11, color: '#ad8032', marginTop: 4, opacity: 0.8 }}>Bản ghi trong hệ thống</div>
        </div>

        {/* Card 2: Tổng tiền đền bù */}
        <div
          style={{ background: 'linear-gradient(135deg, #fff1f0 0%, #ffccc7 100%)', borderLeft: '3px solid #ff4d4f' }}
          className="relative rounded-xl px-4 py-3 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
        >
          <div style={{ position: 'absolute', right: -8, top: -8, fontSize: 60, opacity: 0.07, color: '#ff4d4f', lineHeight: 1 }}>
            <DollarOutlined />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <div style={{ background: '#ff4d4f', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <DollarOutlined style={{ color: '#fff', fontSize: 14 }} />
            </div>
            <span style={{ fontSize: 11, color: '#a8071a', fontWeight: 500, letterSpacing: '0.03em', textTransform: 'uppercase' }}>Tổng tiền đền bù</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 600, color: '#cf1322', lineHeight: 1.1, wordBreak: 'break-all' }}>
            {totalAmount.toLocaleString('vi-VN')}
            <span style={{ fontSize: 13, fontWeight: 400, marginLeft: 3, opacity: 0.8 }}>đ</span>
          </div>
          <div style={{ fontSize: 11, color: '#a8071a', marginTop: 4, opacity: 0.7 }}>Tổng giá trị thiệt hại</div>
        </div>

        {/* Card 3: Số lượng thất thoát */}
        <div
          style={{ background: 'linear-gradient(135deg, #e6f4ff 0%, #bae0ff 100%)', borderLeft: '3px solid #1677ff' }}
          className="relative rounded-xl px-4 py-3 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
        >
          <div style={{ position: 'absolute', right: -8, top: -8, fontSize: 60, opacity: 0.07, color: '#1677ff', lineHeight: 1 }}>
            <InboxOutlined />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <div style={{ background: '#1677ff', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <InboxOutlined style={{ color: '#fff', fontSize: 14 }} />
            </div>
            <span style={{ fontSize: 11, color: '#003eb3', fontWeight: 500, letterSpacing: '0.03em', textTransform: 'uppercase' }}>Số lượng thất thoát</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontSize: 28, fontWeight: 600, color: '#0958d9', lineHeight: 1 }}>{totalQuantity}</span>
            <span style={{ fontSize: 13, color: '#4096ff', fontWeight: 400 }}>món</span>
          </div>
          <div style={{ fontSize: 11, color: '#003eb3', marginTop: 4, opacity: 0.7 }}>Tổng vật tư hỏng / mất</div>
        </div>

        {/* Card 4: Lần cuối cập nhật */}
        <div
          style={{ background: 'linear-gradient(135deg, #f0fff4 0%, #d9f7be 100%)', borderLeft: '3px solid #52c41a' }}
          className="relative rounded-xl px-4 py-3 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
        >
          <div style={{ position: 'absolute', right: -8, top: -8, fontSize: 60, opacity: 0.07, color: '#52c41a', lineHeight: 1 }}>
            <ClockCircleOutlined />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <div style={{ background: '#52c41a', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ClockCircleOutlined style={{ color: '#fff', fontSize: 14 }} />
            </div>
            <span style={{ fontSize: 11, color: '#237804', fontWeight: 500, letterSpacing: '0.03em', textTransform: 'uppercase' }}>Lần cuối cập nhật</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 600, color: '#389e0d', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {lastUpdated}
          </div>
          <div style={{ fontSize: 11, color: '#237804', marginTop: 4, opacity: 0.7 }}>Dữ liệu thời gian thực</div>
        </div>

      </div>

      <Row gutter={[24, 24]}>
        {/* BẢNG DỮ LIỆU */}
        <Col xs={24} lg={24}>
          <Card
            title={<span className="font-semibold text-gray-700 text-base">▤ Quản lý Đền bù & Thất thoát</span>}
            bordered={false}
            className="shadow-sm border border-gray-100 rounded-xl h-full"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <Space className="w-full sm:w-auto flex flex-wrap gap-2">
                <RangePicker
                  format="DD/MM/YYYY"
                  placeholder={['Từ ngày', 'Đến ngày']}
                  size="middle"
                  className="rounded-md"
                  value={selectedDates}
                  onChange={(dates) => setSelectedDates(dates)}
                />
                <Button
                  type="primary"
                  icon={<SearchOutlined />}
                  className="bg-blue-600 rounded-md"
                  onClick={handleApplyFilter}
                >
                  Lọc dữ liệu
                </Button>
              </Space>
              <Button onClick={() => {
                setSelectedDates(null);
                setAppliedDates(null);
                fetchData();
              }} icon={<ReloadOutlined />} className="rounded-md hover:text-blue-600 hover:border-blue-600">
                Làm mới
              </Button>
            </div>

            <Table
              columns={columns}
              dataSource={filteredData}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 8, showSizeChanger: true, showTotal: (total) => `Tổng cộng ${total} bản ghi` }}
              className="border border-gray-200 rounded-lg overflow-hidden shadow-sm"
            />
          </Card>
        </Col>
      </Row>

      <Modal
        title="Chỉnh sửa Chi tiết Đền bù"
        open={isEditModalVisible}
        onOk={handleUpdate}
        onCancel={() => setIsEditModalVisible(false)}
        okText="Lưu thay đổi"
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="quantity"
            label="Số lượng hỏng (*)"
            rules={[{ required: true, message: 'Vui lòng nhập số lượng!' }]}
          >
            <InputNumber min={1} className="w-full" />
          </Form.Item>

          <Form.Item
            name="penaltyAmount"
            label="Tiền phạt (VND) (Tùy chỉnh)"
            help="Cứ để trống hệ thống sẽ tự tính lại nếu bạn đổi Số lượng"
          >
            <InputNumber min={0} step={1000} className="w-full" placeholder="Ví dụ: 50000" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Mô tả / Ghi chú"
          >
            <Input.TextArea rows={3} placeholder="Nguyên nhân, tình trạng..." />
          </Form.Item>

          <Form.Item label="Đổi ảnh bằng chứng">
            <Upload
              name="file"
              showUploadList={false}
              beforeUpload={(file) => {
                setUploadFile(file);
                // Tạo preview URL
                const reader = new FileReader();
                reader.onload = (e) => setPreviewUrl(e.target.result);
                reader.readAsDataURL(file);
                return false; // Ngăn chặn upload tự động
              }}
            >
              <Button icon={<UploadOutlined />}>Chọn ảnh mới</Button>
            </Upload>
            {previewUrl && (
              <div className="mt-3 p-3 bg-gray-50 border rounded text-center" style={{ position: 'relative' }}>
                <Text type="secondary" className="block mb-2 text-xs">Ảnh hiển tại</Text>
                <Image width={80} height={80} src={previewUrl} style={{ objectFit: 'cover', borderRadius: '4px' }} />
                <Button
                  type="primary"
                  danger
                  icon={<DeleteOutlined />}
                  size="small"
                  style={{ position: 'absolute', top: 8, right: 8 }}
                  onClick={handleDeleteImage}
                  title="Xóa ảnh"
                />
              </div>
            )}
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}