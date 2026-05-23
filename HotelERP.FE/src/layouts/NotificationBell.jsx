import React, { useState, useEffect, useCallback } from 'react';
import { Badge, Popover, Typography, Button, Space, Avatar, Spin, Empty } from 'antd';
import { message } from '../utils/antdGlobal';
import { BellOutlined, InfoCircleOutlined, CheckCircleOutlined, WarningOutlined, CloseCircleOutlined, CheckOutlined } from '@ant-design/icons';
import notificationApi from '../api/notificationApi'; 
import { useSignalR } from '../hooks/useSignalR.jsx'; // 👉 Import hook SignalR của bạn vào đây

const { Text } = Typography;

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
  // Lấy connection từ SignalR
  const { connection } = useSignalR(); 

  // 1. LẤY DỮ LIỆU TỪ DATABASE (Dùng useCallback để tối ưu re-render)
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await notificationApi.getAll();
      const data = res.data?.data || res.data; 
      setNotifications(data);
      // Đếm số chưa đọc từ liịch sử trả về
      const unread = data.filter(n => !n.isRead).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error("LỖI CHUÔNG THÔNG BÁO:", error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. CHẠY LẦN ĐẦU VÀ LẮNG NGHE SIGNALR
  useEffect(() => {
    // Load data lần đầu khi mở web
    fetchNotifications();

    // 💡 LẮNG NGHE TRỰC TIẾP TỪ SIGNALR
    if (connection) {
      // Tên sự kiện "ReceiveNotification" phải khớp với Backend C# SendAsync("ReceiveNotification", ...)
      connection.on("ReceiveNotification", (newNotif) => {
        // Có thông báo mới -> Tự động nhét vào đầu danh sách và tăng số đếm, không cần gọi lại API
        setNotifications(prev => [newNotif, ...prev]);
        setUnreadCount(prev => prev + 1);
      });
    }

    // Dọn dẹp listener khi Component bị hủy (Chuyển trang/Đăng xuất)
    return () => {
      if (connection) {
        connection.off("ReceiveNotification");
      }
    };
  }, [fetchNotifications, connection]);

  // 3. XỬ LÝ CLICK ĐỌC THÔNG BÁO - giữ trong list, chỉ bỏ highlight chưa đọc
  const handleItemClick = async (item) => {
    if (item.isRead) return; // Đã đọc rồi không cần gọi API
    try {
      await notificationApi.markAsRead(item.id);
      // Cập nhật isRead trong list (không xóa)
      setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      message.error("Lỗi kết nối mạng!");
    }
  };

  // 4. ĐÁNH DẤU TẤT CẢ ĐÃ ĐỌC - giữ liịch sử, chỉ bỏ số đỏ badge
  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    try {
      await notificationApi.markAllAsRead();
      // Cập nhật tất cả isRead = true trong list (giữ hiển thị)
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      message.error("Không thể cập nhật!");
    }
  };

  // 5. MAP ICON THEO LOẠI (Type)
  const getIconByType = (type) => {
    switch (type) {
      case 'Success': return <Avatar style={{ backgroundColor: '#52c41a' }} icon={<CheckCircleOutlined />} />;
      case 'Warning': return <Avatar style={{ backgroundColor: '#faad14' }} icon={<WarningOutlined />} />;
      case 'Error': return <Avatar style={{ backgroundColor: '#ff4d4f' }} icon={<CloseCircleOutlined />} />;
      default: return <Avatar style={{ backgroundColor: '#1890ff' }} icon={<InfoCircleOutlined />} />;
    }
  };

  // 6. GIAO DIỆN DANH SÁCH BÊN TRONG POPOVER
  const content = (
    <div style={{ width: 350, maxHeight: 400, overflowY: 'auto', overflowX: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 15px', borderBottom: '1px solid #f0f0f0', position: 'sticky', top: 0, backgroundColor: '#fff', zIndex: 1 }}>
        <Text strong style={{ fontSize: '16px' }}>Thông báo mới</Text>
        <Button type="link" size="small" icon={<CheckOutlined />} onClick={handleMarkAllAsRead} disabled={unreadCount === 0}>
          Đánh dấu đã đọc
        </Button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '30px 0' }}>
          <Spin />
        </div>
      ) : notifications.length === 0 ? (
        <div style={{ padding: '30px 0' }}>
          <Empty description="Chưa có thông báo nào" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          {notifications.map((item, index) => (
            <li
              key={item.id || `notif-${index}-${item.createdAt}`}
              onClick={() => handleItemClick(item)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '12px 15px',
                cursor: 'pointer',
                backgroundColor: item.isRead ? '#fff' : '#e6f7ff',
                transition: 'background-color 0.3s',
                borderBottom: '1px solid #f5f5f5',
              }}
              onMouseEnter={e => { if (item.isRead) e.currentTarget.style.backgroundColor = '#fafafa'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = item.isRead ? '#fff' : '#e6f7ff'; }}
            >
              <div style={{ flexShrink: 0, marginTop: 2 }}>{getIconByType(item.type)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text strong={!item.isRead} style={{ display: 'block', fontSize: '14px' }}>
                  {item.title}
                </Text>
                <Text type="secondary" style={{ display: 'block', fontSize: '13px', wordBreak: 'break-word' }}>
                  {item.content}
                </Text>
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  {new Date(item.createdAt).toLocaleString('vi-VN')}
                </Text>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <Popover 
      content={content} 
      trigger="click" 
      placement="bottomRight"
      open={isOpen}
      onOpenChange={setIsOpen}
      styles={{ content: { padding: 0 } }} 
    >
      <Badge count={unreadCount} overflowCount={99} style={{ cursor: 'pointer' }}>
        <Avatar 
          shape="circle" 
          icon={<BellOutlined />} 
          style={{ cursor: 'pointer', backgroundColor: '#f0f2f5', color: '#595959', fontSize: '20px' }} 
        />
      </Badge>
    </Popover>
  );
};

export default NotificationBell;