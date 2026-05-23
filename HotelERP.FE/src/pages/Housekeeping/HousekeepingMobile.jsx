import React, { useState, useEffect } from 'react';
import { Card, Badge, Drawer, Tabs, Form, Input, InputNumber, Upload, Button, message, Typography, Space, Empty } from 'antd';
import { CameraOutlined, CheckCircleOutlined, WarningOutlined, CoffeeOutlined } from '@ant-design/icons';
import * as signalR from '@microsoft/signalr';
import axiosClient from '../../api/axiosClient';
import InventoryChecklist from './InventoryChecklist';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

const HousekeepingMobile = () => {
  const [dirtyRooms, setDirtyRooms] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDirtyRooms();
    let isMounted = true;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl("http://localhost:5080/roomHub") // Đảm bảo port này khớp với BE của bạn
      .withAutomaticReconnect()
      .build();

    const startSignalR = async () => {
      try {
        await connection.start();
        if (isMounted) {
          connection.on("ReceiveRoomStatusUpdate", (roomId, status, cleaningStatus) => {
             if (cleaningStatus === 'DIRTY') {
                 message.warning(`Phòng #${roomId} vừa trả khách – cần dọn dẹp!`);
                 fetchDirtyRooms();
             } else if (cleaningStatus === 'INSPECTING') {
                 message.info(`Phòng #${roomId} đang được kiểm tra...`);
                 fetchDirtyRooms();
             } else if (cleaningStatus === 'CLEAN') {
                 message.success(`Phòng #${roomId} đã dọn xong – sẵn sàng đón khách!`);
                 fetchDirtyRooms();
             }
          });
        }
      } catch (err) {
        console.log("SignalR Error: ", err);
      }
    };

    startSignalR();

    return () => {
      isMounted = false;
      connection.stop();
    };
  }, []);

  const fetchDirtyRooms = async () => {
    try {
      // Lấy cả phòng DIRTY và INSPECTING (đang trong quá trình xử lý)
      const [dirtyRes, inspectingRes] = await Promise.all([
        axiosClient.get('/rooms?CleaningStatus=DIRTY'),
        axiosClient.get('/rooms?CleaningStatus=INSPECTING'),
      ]);
      const dirty = dirtyRes.data.data || dirtyRes.data || [];
      const inspecting = inspectingRes.data.data || inspectingRes.data || [];
      setDirtyRooms([...dirty, ...inspecting]);
    } catch (error) {
      message.error("Không thể tải danh sách phòng cần dọn.");
    }
  };

  const openRoomTasks = async (room) => {
    try {
      // Đổi trạng thái sang INSPECTING (Đang kiểm tra)
      await axiosClient.patch(`/rooms/${room.id}/cleaning-status`, {
        NewCleaningStatus: 'INSPECTING'
      });
      navigate(`/admin/housekeeping/room/${room.id}`, { state: { roomNumber: room.roomNumber } });
    } catch (error) {
      message.error("Lỗi khi cập nhật trạng thái phòng!");
    }
  };

  return (
    <div style={{ padding: '16px', backgroundColor: '#f0f2f5', minHeight: '100vh', maxWidth: '600px', margin: '0 auto' }}>
      <Title level={4} style={{ marginBottom: 16 }}>Phòng Cần Dọn</Title>

      <Space orientation="vertical" style={{ width: '100%' }} size="middle">
        {dirtyRooms.map(room => (
          <Badge.Ribbon 
            text={room.cleaningStatus === 'INSPECTING' ? 'ĐANG KIỂM TRA' : 'CẦN DỌN'} 
            color={room.cleaningStatus === 'INSPECTING' ? 'purple' : 'volcano'} 
            key={room.id}
          >
            <Card 
              onClick={() => openRoomTasks(room)} 
              hoverable
              style={{ borderRadius: 12 }}
            >
              <Title level={3} style={{ marginTop: 0, marginBottom: 8 }}>P.{room.roomNumber}</Title>
              <Text type="secondary">Loại: {room.roomTypeName || 'N/A'}</Text>
              {room.cleaningStatus === 'INSPECTING' && (
                <div style={{ marginTop: 6 }}>
                  <Text style={{ color: '#722ed1', fontSize: 12 }}>⏳ Đang kiểm tra – nhấn để tiếp tục</Text>
                </div>
              )}
            </Card>
          </Badge.Ribbon>
        ))}
        {dirtyRooms.length === 0 && (
          <Empty description="Tất cả các phòng đều sạch sẽ!" />
        )}  
      </Space>
    </div>
  );
};

export default HousekeepingMobile;