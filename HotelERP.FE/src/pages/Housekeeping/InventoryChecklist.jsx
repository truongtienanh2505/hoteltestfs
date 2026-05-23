import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, Input, Button, message, Spin, Empty, Typography, Modal, Form, InputNumber, Upload, Tag } from 'antd';
import { ArrowLeftOutlined, CheckCircleOutlined, SearchOutlined, WarningOutlined, CameraOutlined, SyncOutlined } from '@ant-design/icons';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import * as signalR from '@microsoft/signalr';
import axiosClient from '../../api/axiosClient';

const { Title, Text } = Typography;

const InventoryChecklist = () => {
  const { id } = useParams();
  const roomId = id;
  const navigate = useNavigate();
  const location = useLocation();
  const roomNumber = location.state?.roomNumber || 'Unknown';

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [cleaningStatus, setCleaningStatus] = useState('INSPECTING');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [form] = Form.useForm();
  const connectionRef = useRef(null);
  // Track xem người dùng đã bấm "Hoàn tất" chưa để tránh reset sai
  const isCompletedRef = useRef(false);

  const [reportedItemIds, setReportedItemIds] = useState([]);

  useEffect(() => {
    if (!roomId) return;
    fetchInventory();

    // Kết nối SignalR để nhận cập nhật realtime trạng thái phòng
    const connection = new signalR.HubConnectionBuilder()
      .withUrl('http://localhost:5080/roomHub')
      .withAutomaticReconnect()
      .build();

    connectionRef.current = connection;

    const startSignalR = async () => {
      try {
        await connection.start();
        connection.on('ReceiveRoomStatusUpdate', (updatedRoomId, status, newCleaningStatus) => {
          if (Number(updatedRoomId) === Number(roomId)) {
            setCleaningStatus(newCleaningStatus);
            if (newCleaningStatus === 'INSPECTING') {
              message.info(`Phòng #${updatedRoomId} đang được kiểm tra...`);
            } else if (newCleaningStatus === 'CLEAN') {
              message.success(`Phòng #${updatedRoomId} đã dọn xong!`);
            }
          }
        });
      } catch (err) {
        console.log('SignalR InventoryChecklist Error:', err);
      }
    };

    startSignalR();

    return () => {
      connection.stop();
      // Khi rời khỏi trang mà chưa hoàn tất -> reset về DIRTY
      if (!isCompletedRef.current) {
        axiosClient.patch(`/rooms/${roomId}/cleaning-status`, {
          NewCleaningStatus: 'DIRTY'
        }).catch(() => {});
      }
    };
  }, [roomId]);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get(`/rooms/${roomId}/inventories`);
      setItems(res.data?.data || res.data || []);
    } catch (error) {
      message.error("Lỗi khi tải danh sách vật tư!");
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = (Array.isArray(items) ? items : []).filter(item =>
    item.itemName.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleFinishCleaning = async () => {
    try {
      // Gọi API → backend sẽ cập nhật DB và bắn SignalR tới tất cả client
      await axiosClient.patch(`/rooms/${roomId}/cleaning-status`, { 
        NewCleaningStatus: 'CLEAN' 
      });
      // Đánh dấu đã hoàn tất để cleanup effect không reset ngược lại
      isCompletedRef.current = true;
      message.success('Đã hoàn tất dọn phòng! Thông báo realtime đã gửi.');
      navigate('/admin/housekeeping');
    } catch (error) {
      message.error('Lỗi khi cập nhật trạng thái phòng.');
    }
  };

  const handleGoBack = async () => {
    try {
      // Reset trạng thái phòng về DIRTY khi thoát mà chưa hoàn tất
      await axiosClient.patch(`/rooms/${roomId}/cleaning-status`, {
        NewCleaningStatus: 'DIRTY'
      });
      // Đánh dấu đã xử lý để cleanup effect không gọi lại lần nữa
      isCompletedRef.current = true;
      message.info('Đã đặt lại phòng về trạng thái chưa dọn.');
    } catch (error) {
      // Dù lỗi vẫn cho phép điều hướng về
      console.error('Lỗi khi reset trạng thái phòng:', error);
    } finally {
      navigate('/admin/housekeeping');
    }
  };

  const openDamageModal = (item) => {
    setSelectedItem(item);
    form.setFieldsValue({
      ItemName: item.itemName,
      Quantity: 1,
      PenaltyAmount: item.priceIfLost || 0,
      Reason: ''
    });
    setIsModalOpen(true);
  };

  const handleReportDamage = async (values) => {
    try {
      const formData = new FormData();
      formData.append('RoomId', roomId);
      formData.append('RoomInventoryId', selectedItem?.id || '');
      formData.append('ItemName', values.ItemName);
      formData.append('Quantity', values.Quantity);
      formData.append('PenaltyAmount', values.PenaltyAmount);
      formData.append('Description', values.Reason || '');
      formData.append('Reason', values.Reason || 'Báo hỏng nội bộ');

      if (values.EvidenceImage?.fileList?.[0]?.originFileObj) {
        formData.append('EvidenceImage', values.EvidenceImage.fileList[0].originFileObj);
      }

      await axiosClient.post(`/Rooms/loss-damages`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      message.success("Đã gửi biên bản báo hỏng thành công!");
      
      if (selectedItem?.id) {
        setReportedItemIds(prev => [...prev, selectedItem.id]);
      }

      setIsModalOpen(false);
      form.resetFields();
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Lỗi khi gửi báo cáo!";
      message.error(errorMsg);
    }
  };

  return (
    <div style={{ backgroundColor: '#f0f2f5', minHeight: '100vh', padding: '16px', maxWidth: '600px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={handleGoBack} style={{ fontSize: '18px' }} />
        <Title level={4} style={{ margin: 0, marginLeft: 8, fontSize: '18px' }}>Checklist: {roomNumber}</Title>
      </div>

      <div style={{ marginBottom: '16px', paddingLeft: '8px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Text type="secondary" style={{ fontSize: '14px' }}>Trạng thái: </Text>
        {cleaningStatus === 'INSPECTING' ? (
          <Tag icon={<SyncOutlined spin />} color="processing" style={{ fontSize: 13 }}>
            Đang kiểm tra
          </Tag>
        ) : cleaningStatus === 'CLEAN' ? (
          <Tag icon={<CheckCircleOutlined />} color="success" style={{ fontSize: 13 }}>
            Đã dọn
          </Tag>
        ) : (
          <Tag color="error" style={{ fontSize: 13 }}>Cần dọn</Tag>
        )}
      </div>

      <Button
        type="primary"
        block
        size="large"
        icon={<CheckCircleOutlined />}
        style={{
          backgroundColor: '#52c41a',
          borderColor: '#52c41a',
          marginBottom: '24px',
          height: '48px',
          fontSize: '16px',
          fontWeight: 'bold',
          borderRadius: '8px'
        }}
        onClick={handleFinishCleaning}
      >
        Hoàn tất (Sạch sẽ)
      </Button>

      <Title level={5} style={{ marginBottom: '12px', paddingLeft: '8px', fontSize: '15px' }}>Danh sách đồ đạc:</Title>

      <Input
        placeholder="Tìm nhanh vật tư..."
        prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
        style={{ marginBottom: '16px', borderRadius: '8px', height: '40px' }}
        value={searchText}
        onChange={e => setSearchText(e.target.value)}
      />

      <Spin spinning={loading}>
        <div style={{ paddingBottom: '40px' }}>
          {filteredItems.map(item => {
            const isReported = reportedItemIds.includes(item.id);
            return (
            <Card 
              key={item.id} 
              size="small" 
              style={{ 
                marginBottom: '12px', 
                borderRadius: '8px', 
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                border: '1px solid #e8e8e8'
              }}
              styles={{ body: { padding: '12px' } }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
                <Text strong style={{ fontSize: '14px', color: '#1f1f1f' }}>{item.itemName}</Text>
                <Text style={{ color: '#1890ff', fontWeight: 'bold', fontSize: '13px' }}>SL: {item.quantity}</Text>
              </div>
              <Button 
                danger={!isReported}
                block 
                icon={isReported ? <CheckCircleOutlined /> : <WarningOutlined />}
                style={{ 
                  backgroundColor: isReported ? '#f5f5f5' : '#a8071a', 
                  borderColor: isReported ? '#d9d9d9' : '#a8071a', 
                  color: isReported ? '#aaa' : '#fff', 
                  fontWeight: '600',
                  borderRadius: '6px',
                  height: '36px'
                }}
                disabled={isReported}
                onClick={() => openDamageModal(item)}
              >
                {isReported ? "Đã báo cáo" : "Báo hỏng / Mất"}
              </Button>
            </Card>
          )})}
          {filteredItems.length === 0 && !loading && (
            <Empty description="Không tìm thấy vật tư" style={{ marginTop: '30px' }} />
          )}
        </div>
      </Spin>

      <Modal
        title={`Báo hỏng: ${selectedItem?.itemName}`}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleReportDamage}>
          <Form.Item label="Tên vật tư hỏng/mất" name="ItemName" rules={[{ required: true }]}>
            <Input placeholder="Vd: Vỡ cốc, rách khăn..." disabled />
          </Form.Item>
          <Form.Item label="Số lượng" name="Quantity" rules={[{ required: true }]} initialValue={1}>
            <InputNumber
              min={1}
              max={selectedItem?.quantity || 1}
              style={{ width: '100%' }}
              onChange={(val) => {
                const penaltyPrice = selectedItem?.priceIfLost || 0;
                form.setFieldsValue({ PenaltyAmount: (val || 1) * penaltyPrice });
              }}
            />
          </Form.Item>
          <Form.Item label="Phạt tiền dự kiến (VNĐ)" name="PenaltyAmount" rules={[{ required: true }]} initialValue={0}>
            <InputNumber min={0} step={10000} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Ghi chú" name="Reason">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label="Ảnh hiện trường" name="EvidenceImage">
            <Upload beforeUpload={() => false} maxCount={1} listType="picture-card">
              <div><CameraOutlined /><div style={{ marginTop: 8 }}>Chụp ảnh</div></div>
            </Upload>
          </Form.Item>
          <Button type="primary" danger block htmlType="submit" style={{ height: '40px', fontWeight: 'bold', borderRadius: '6px' }}>
            Gửi Biên Bản
          </Button>
        </Form>
      </Modal>
    </div>
  );
};

export default InventoryChecklist;