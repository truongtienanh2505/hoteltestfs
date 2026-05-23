import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom';
import { 
  Form, DatePicker, InputNumber, Button, Card, Table, Tag, 
  Space, Input, Select, message, Spin, Row, Col, Typography, Layout, Result, Modal
} from 'antd'; 
import { 
  SearchOutlined, ArrowLeftOutlined, EditOutlined, 
  DeleteOutlined, CheckCircleOutlined, CloseCircleOutlined, EyeOutlined, LoginOutlined 
} from '@ant-design/icons';
import axios from 'axios';
import bookingManagementApi from '../../api/bookingManagementApi';
import bookingApi from '../../api/bookingApi';
import momoPaymentApi from '../../api/momoPaymentApi';
import MomoPaymentPanel from '../../components/payments/MomoPaymentPanel';
import { create } from 'zustand';
import dayjs from 'dayjs';
import { useAuthStore } from "../../store/authStore";

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;
const { Content } = Layout;

// =====================================================================
// 1. AXIOS CONFIGURATION
// =====================================================================
const apiClient = axios.create({
  baseURL: 'http://localhost:5080/api', 
  timeout: 10000,
});

apiClient.interceptors.request.use(
  (config) => {
    try {
      const token = useAuthStore.getState().token; 
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.error("AuthStore chưa sẵn sàng:", e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const errorMsg = error.response?.data?.message || 'Có lỗi xảy ra khi kết nối máy chủ!';
    message.error(errorMsg);
    return Promise.reject(error);
  }
);

// =====================================================================
// 2. ZUSTAND STORE (Chỉ lưu mảng ID của phòng theo đúng yêu cầu)
// =====================================================================
const useBookingStore = create((set) => ({
  selectedRooms: [],
  toggleRoom: (roomId) => set((state) => ({ 
    selectedRooms: state.selectedRooms.includes(roomId)
      ? state.selectedRooms.filter(id => id !== roomId) // Đã có thì xóa đi
      : [...state.selectedRooms, roomId] // Chưa có thì thêm vào
  })),
  clearRooms: () => set({ selectedRooms: [] })
}));

// =====================================================================
// 3. COMPONENT: BOOKING LIST (TRANG 1)
// =====================================================================
const BookingList = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(null);
  const [searchingRooms, setSearchingRooms] = useState(false);

  const fetchBookings = async (page = 1, search = '', status = null) => {
    setLoadingBookings(true);
    try {
      const response = await bookingManagementApi.searchBookings({
        keyword: search || undefined,
        status: status || undefined,
        page: page,
        pageSize: pagination.pageSize
      });
      const resultData = response.data?.data;
      if (resultData) {
        const items = resultData.items || resultData.Items || [];
        const mappedBookings = items.map(item => ({
          id: item.id || item.Id,
          bookingCode: item.bookingCode || item.BookingCode,
          customerName: item.guestName || item.GuestName || 'Khách vãng lai',
          phone: item.guestPhone || item.GuestPhone,
          checkInDate: (item.details || item.Details || [])[0]?.checkInDate || (item.details || item.Details || [])[0]?.CheckInDate || item.bookedAt || item.BookedAt || new Date().toISOString(),
          status: item.status || item.Status,
        }));
        setBookings(mappedBookings);
        setPagination(prev => ({ ...prev, current: page, total: resultData.totalCount || resultData.TotalCount || 0 }));
      }
    } catch (error) {
      console.error("Lỗi tải danh sách Booking:", error);
    } finally {
      setLoadingBookings(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchBookings(1, searchTerm, statusFilter), 300);
    return () => clearTimeout(timer);
  }, [searchTerm, statusFilter]); // Thêm allMockData để tự re-render khi ấn nút

  // CÁC HÀM XỬ LÝ LOGIC NÚT THAO TÁC (NHIỆM VỤ 3)
  const handleConfirm = (record) => {
    Modal.confirm({
      title: 'Xác nhận đơn đặt phòng',
      content: `XÁC NHẬN đơn ${record.bookingCode}?`,
      okText: 'Xác nhận ngay', cancelText: 'Hủy bỏ',
      onOk: async () => {
        try {
          await bookingManagementApi.updateBookingStatus(record.id, 'Confirmed');
          message.success(`Đã xác nhận đơn ${record.bookingCode} thành công!`);
          fetchBookings(pagination.current, searchTerm, statusFilter);
        } catch (error) {
          message.error('Lỗi khi cập nhật trạng thái');
        }
      }
    });
  };

  const handleCancel = (record) => {
    Modal.confirm({
      title: 'Hủy đơn đặt phòng',
      content: `HỦY đơn ${record.bookingCode}? Thao tác không thể hoàn tác.`,
      okText: 'Đồng ý hủy', okType: 'danger', cancelText: 'Quay lại',
      onOk: async () => {
        try {
          await bookingManagementApi.updateBookingStatus(record.id, 'Cancelled');
          message.success(`Đã hủy đơn ${record.bookingCode}!`);
          fetchBookings(pagination.current, searchTerm, statusFilter);
        } catch (error) {
          message.error('Lỗi khi hủy đơn');
        }
      }
    });
  };

  const handleCheckIn = (record) => {
    Modal.confirm({
      title: 'Tiến hành Nhận Phòng',
      content: `Khách của đơn ${record.bookingCode} đã đến và Nhận phòng?`,
      okText: 'Nhận phòng', cancelText: 'Chưa phải lúc',
      onOk: async () => {
        try {
          await bookingManagementApi.updateBookingStatus(record.id, 'Checked_in');
          message.success(`Check-in thành công cho đơn ${record.bookingCode}!`);
          fetchBookings(pagination.current, searchTerm, statusFilter);
        } catch (error) {
          message.error('Lỗi khi nhận phòng');
        }
      }
    });
  };

  const handleSearchRooms = async (values) => {
    if (!values.dates) {
      message.warning('Vui lòng chọn ngày!');
      return;
    }
    setSearchingRooms(true);
    try {
      const payload = {
        checkInDate: values.dates[0].format('YYYY-MM-DD'),
        checkOutDate: values.dates[1].format('YYYY-MM-DD'),
        adultsCount: values.adults,   
        childrenCount: values.children,
      };
      
      // GỌI API THẬT
      const response = await apiClient.post('/BookingEngine/search', payload);
      
      // Chuyển sang Trang 2, truyền dữ liệu từ C# trả về (Dự kiến là mảng RoomType)
      navigate('select-room', { 
        state: { searchParams: payload, availableRooms: response.data || response } 
      });
    } catch (error) { 
      // Lỗi đã được Interceptor xử lý hiển thị message
    } finally { 
      setSearchingRooms(false); 
    }
  };

  const columns = [
    { title: 'Mã Booking', dataIndex: 'bookingCode', key: 'bookingCode', render: (t) => <b>{t}</b> },
    { title: 'Khách Hàng', dataIndex: 'customerName', key: 'customerName' },
    { title: 'Ngày Nhận', dataIndex: 'checkInDate', render: (d) => dayjs(d).format('DD/MM/YYYY HH:mm') },
    { title: 'Trạng thái', dataIndex: 'status', render: (status) => {
        let displayStatus = status;
        let color = 'default';
        if (status === 'Pending' || status === 'Chờ xử lý') { color = 'default'; displayStatus = 'Chờ xử lý'; }
        else if (status === 'Confirmed' || status === 'Đã xác nhận') { color = 'success'; displayStatus = 'Đã xác nhận'; }
        else if (status === 'Checked_in' || status === 'Đang ở') { color = 'processing'; displayStatus = 'Đang ở'; }
        else if (status === 'Completed' || status === 'Hoàn tất') { color = 'processing'; displayStatus = 'Hoàn tất'; }
        else if (status === 'Cancelled' || status === 'Đã hủy') { color = 'error'; displayStatus = 'Đã hủy'; }
        return <Tag color={color}>{displayStatus}</Tag>;
    }},
    {
      title: 'Thao tác',
      align: 'center',
      render: (_, record) => (
        <Space size="middle">
          <Button type="text" icon={<EyeOutlined />} onClick={() => navigate(`/admin/bookings/${record.bookingCode}`)} title="Xem chi tiết" />
          
          {['Pending', 'Chờ xử lý', 'Holding'].includes(record.status) && (
            <>
              <Button type="text" style={{ color: '#1890ff' }} icon={<CheckCircleOutlined />} onClick={() => handleConfirm(record)} title="Xác nhận" />
              <Button type="text" danger icon={<CloseCircleOutlined />} onClick={() => handleCancel(record)} title="Hủy đơn" />
            </>
          )}

          {['Confirmed', 'Đã xác nhận'].includes(record.status) && (
            <Button type="primary" size="small" icon={<LoginOutlined />} onClick={() => handleCheckIn(record)}>Nhận phòng</Button>
          )}
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <Title level={4}>QUẢN LÝ ĐẶT PHÒNG</Title>
      <Card style={{ marginBottom: 24, borderRadius: 12 }}>
        <Form form={form} layout="inline" onFinish={handleSearchRooms} initialValues={{ adults: 2, children: 0 }}>
          <Form.Item name="dates" rules={[{ required: true, message: 'Chọn ngày!' }]}>
            <RangePicker 
              format="DD/MM/YYYY" 
              style={{ width: 280 }} 
              disabledDate={(current) => current && current < dayjs().startOf('day')}
            />
          </Form.Item>
          <Form.Item name="adults" label="Người lớn"><InputNumber min={1} /></Form.Item>
          <Form.Item name="children" label="Trẻ em"><InputNumber min={0} /></Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<SearchOutlined />} loading={searchingRooms}>
              Tìm phòng trống
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card style={{ borderRadius: 12 }}>
        <div style={{ marginBottom: 16 }}>
          <Row gutter={16}>
             <Col span={12}>
               <Input 
                 placeholder="Tìm theo Tên, SĐT, Mã..." 
                 prefix={<SearchOutlined />} 
                 style={{ width: 300 }} 
                 allowClear 
                 onChange={e => setSearchTerm(e.target.value)} 
               />
             </Col>
             <Col span={6}>
               <Select 
                 placeholder="Lọc trạng thái" 
                 style={{ width: 200 }} 
                 allowClear 
                 onChange={(val) => setStatusFilter(val)}
               >
                 <Select.Option value="Pending">Chờ xử lý</Select.Option>
                 <Select.Option value="Confirmed">Đã xác nhận</Select.Option>
                 <Select.Option value="Checked_in">Đang ở</Select.Option>
                 <Select.Option value="Completed">Hoàn tất</Select.Option>
                 <Select.Option value="Cancelled">Đã hủy</Select.Option>
               </Select>
             </Col>
          </Row>
        </div>
        <Table 
          columns={columns} 
          dataSource={bookings} 
          rowKey="id" 
          loading={loadingBookings} 
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            onChange: (page) => fetchBookings(page, searchTerm, statusFilter),
          }}
        />
      </Card>
    </div>
  );
};

// =====================================================================
// 4. COMPONENT: SELECT ROOM (TRANG 2 - CÓ POPUP XÁC NHẬN)
// =====================================================================
const SelectRoom = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedRooms, toggleRoom, clearRooms } = useBookingStore();

  const searchParams = location.state?.searchParams || {};
  const roomTypesData = location.state?.availableRooms || [];

  // ---- QUẢN LÝ TRẠNG THÁI POPUP VÀ FORM ----
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingForm] = Form.useForm();

  useEffect(() => { clearRooms(); }, [clearRooms]);

  const handleSelect = (room) => {
    if (room.status === 'Occupied' || room.status === 'Maintenance' || room.status === 'MAINTENANCE') return;
    toggleRoom(room.id); 
  };

  // ---- HÀM XỬ LÝ KHI SUBMIT FORM TRONG POPUP ----
  const handleConfirmBooking = async (values) => {
    setIsSubmitting(true);
    try {
      // 1. Nhóm các phòng đã chọn theo RoomTypeId để tạo danh sách RoomIds (và tính số lượng)
      const roomTypeSelections = {};
      selectedRooms.forEach(roomId => {
        roomTypesData.forEach(rt => {
          const roomsArray = rt.rooms || rt.Rooms || [];
          const matched = roomsArray.find(r => r.id === roomId);
          if (matched) {
            const rtId = rt.id || rt.Id || rt.roomTypeId || rt.RoomTypeId;
            if (!roomTypeSelections[rtId]) {
              roomTypeSelections[rtId] = [];
            }
            roomTypeSelections[rtId].push(roomId);
          }
        });
      });

      const checkInObj = dayjs(searchParams.checkInDate || new Date()).hour(14).minute(0).second(0);
      const checkOutObj = dayjs(searchParams.checkOutDate || new Date()).hour(12).minute(0).second(0);

      // 2. Tạo mảng items để gửi lên API (Map với MultiRoomBookingRequest ở Backend)
      const items = Object.keys(roomTypeSelections).map(rtId => ({
        roomTypeId: parseInt(rtId),
        quantity: roomTypeSelections[rtId].length,
        roomIds: roomTypeSelections[rtId], // Gửi nguyên mảng chứa các roomIds (ví dụ: [102, 103]) lên Backend
        checkInDate: checkInObj.toISOString(),
        checkOutDate: checkOutObj.toISOString()
      }));

      const payload = {
        guestName: values.fullName,
        guestPhone: values.phone,
        guestEmail: values.email || '',
        notes: values.notes || '',
        voucherCode: values.voucherCode || '',
        items: items
      };

      console.log("Dữ liệu chuẩn bị gửi API tạo Booking:", payload);

      // 3. GỌI API THẬT
      const response = await apiClient.post('/BookingEngine/multi-booking', payload);

      if (response && response.success !== false) {
         message.success('Tạo Booking thành công!');
         setIsModalOpen(false);
         bookingForm.resetFields();
         clearRooms();
         
         // SỬA TẠI ĐÂY: Quay về đúng trang Quản lý Đặt Phòng thay vì trang chủ '/' gây lỗi 404
         navigate('/admin/bookings'); 
      } else {
         message.error(response?.message || 'Có lỗi xảy ra khi tạo Booking!');
      }
    } catch (error) {
      console.error(error);
      message.error(error.response?.data?.message || 'Có lỗi xảy ra khi tạo Booking!');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!location.state) {
    return (
      <Result 
        status="warning" 
        title="Vui lòng tìm kiếm phòng trước!"
        extra={<Button type="primary" onClick={() => navigate('../')}>Quay lại</Button>}
      />
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      
      {/* HEADER CHI TIẾT */}
      <Card style={{ marginBottom: 24, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <Row align="middle" justify="space-between">
          <Col>
            <Space size="large" align="center">
              <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} style={{ padding: 0 }}>
                Quay lại
              </Button>
              <div style={{ borderLeft: '1px solid #e8e8e8', paddingLeft: 16 }}>
                <Text strong style={{ fontSize: 16 }}>
                  {dayjs(searchParams.checkInDate).format('DD/MM/YYYY')} 
                  <span style={{ margin: '0 8px' }}>→</span> 
                  {dayjs(searchParams.checkOutDate).format('DD/MM/YYYY')}
                </Text>
                <div style={{ marginTop: 4 }}>
                  <Tag color="blue">{searchParams.adultsCount || 0} Người lớn</Tag>
                  <Tag color="cyan">{searchParams.childrenCount || 0} Trẻ em</Tag>
                </div>
              </div>
            </Space>
          </Col>
          <Col>
            <Space size="large">
              <Text strong style={{ fontSize: 16 }}>
                Đã chọn: <span style={{ color: '#1890ff', fontSize: 18 }}>{selectedRooms.length}</span> phòng
              </Text>
              <Button 
                type="primary" 
                size="large" 
                disabled={selectedRooms.length === 0}
                onClick={() => setIsModalOpen(true)} // MỞ POPUP KHI BẤM NÚT NÀY
              >
                Tiếp tục
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* DANH SÁCH HẠNG PHÒNG & PHÒNG */}
      {(() => {
        const validRoomTypes = roomTypesData.filter(rt => {
           const rooms = rt.rooms || rt.Rooms || [];
           return rooms.length > 0;
        });

        if (validRoomTypes.length === 0) {
          return (
            <Card style={{ textAlign: 'center', padding: 40, borderRadius: 12 }}>
              <Text type="secondary">Không có phòng trống nào trong thời gian này.</Text>
            </Card>
          );
        }

        return validRoomTypes.map((roomType, index) => {
          const roomList = roomType.rooms || roomType.Rooms || [];
          const groupedByFloor = roomList.reduce((acc, room) => {
            const floorLevel = room.floor || room.Floor || '1'; 
            if (!acc[floorLevel]) acc[floorLevel] = [];
            acc[floorLevel].push(room);
            return acc;
          }, {});

          return (
            <Card 
              key={roomType.id || `roomType-${index}`} 
              style={{ marginBottom: 24, borderRadius: 12, overflow: 'hidden' }} 
              styles={{ body: { padding: 0 } }} 
            >
              <div style={{ padding: '16px 24px', background: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
                <Title level={4} style={{ margin: 0, color: '#1f2937' }}>
                  {roomType.name} - <span style={{ color: '#ff4d4f' }}>{roomType.basePrice?.toLocaleString()} VNĐ/Đêm</span>
                </Title>
                <Text type="secondary" style={{ marginTop: 4, display: 'block' }}>
                  Sức chứa: {roomType.capacityAdults} NL, {roomType.capacityChildren} TE
                </Text>
              </div>

              <div style={{ padding: 24 }}>
                {Object.entries(groupedByFloor).map(([floor, roomsInFloor]) => (
                  <div key={floor} style={{ marginBottom: 24 }}>
                    <div style={{ marginBottom: 16, borderBottom: '1px dashed #e8e8e8', paddingBottom: 8 }}>
                      <Text strong style={{ fontSize: 16, color: '#595959' }}>Tầng {floor}</Text>
                    </div>

                    <Row gutter={[16, 16]}>
                      {roomsInFloor.map((room) => {
                        const isOccupied = room.status === 'Occupied';
                        const isMaintenance = room.status === 'Maintenance' || room.status === 'MAINTENANCE';
                        const isSelected = selectedRooms.includes(room.id); 

                        let cardStyle = {
                          padding: '20px 10px', textAlign: 'center', borderRadius: 8,
                          borderWidth: '1px', borderStyle: 'solid', borderColor: '#d9d9d9', backgroundColor: '#ffffff',
                          cursor: 'pointer', transition: 'all 0.3s ease',
                        };

                        if (isOccupied) {
                          cardStyle = { ...cardStyle, backgroundColor: '#fff1f0', borderColor: '#ffa39e', cursor: 'not-allowed' };
                        } else if (isMaintenance) {
                          cardStyle = { ...cardStyle, backgroundColor: '#fffbe6', borderColor: '#ffe58f', cursor: 'not-allowed' };
                        } else if (isSelected) {
                          cardStyle = { ...cardStyle, backgroundColor: '#e6f7ff', borderColor: '#1890ff', boxShadow: '0 0 8px rgba(24,144,255,0.2)' };
                        }

                        return (
                          <Col span={4} key={room.id}>
                            <div style={cardStyle} onClick={() => handleSelect(room)}>
                              <Title level={4} style={{ margin: 0, color: isOccupied ? '#cf1322' : isMaintenance ? '#d4b106' : (isSelected ? '#096dd9' : '#262626') }}>
                                {room.roomNumber}
                              </Title>
                              <Text type="secondary" style={{ fontSize: 12 }}>Tầng {room.floor || room.Floor}</Text>
                              <div style={{ marginTop: 12 }}>
                                {isOccupied ? <Tag color="red" style={{ margin: 0 }}>Đang ở</Tag> : isMaintenance ? <Tag color="warning" style={{ margin: 0 }}>Bảo trì</Tag> : isSelected ? <Tag color="blue" icon={<CheckCircleOutlined />} style={{ margin: 0 }}>Đã chọn</Tag> : <Tag color="default" style={{ margin: 0 }}>Trống</Tag>}
                              </div>
                            </div>
                          </Col>
                        );
                      })}
                    </Row>
                  </div>
                ))}
              </div>
            </Card>
          );
        });
      })()}

      {/* ========================================================= */}
      {/* POPUP THÔNG TIN KHÁCH HÀNG KHI BẤM "TIẾP TỤC"             */}
      {/* ========================================================= */}
      <Modal
        title={<Title level={4} style={{ margin: 0 }}>Thông tin Lễ Tân Đặt Phòng</Title>}
        open={isModalOpen}
        onCancel={() => !isSubmitting && setIsModalOpen(false)}
        okText="Xác nhận đặt phòng"
        cancelText="Hủy"
        onOk={() => bookingForm.submit()} // Gắn nút OK của Modal với sự kiện Submit của Form
        confirmLoading={isSubmitting}
        width={700}
        centered
        mask={{ closable: false }} // Chống bấm ra ngoài tắt nhầm
      >
        <div style={{ padding: '20px 0 0 0' }}>
          <Form 
            form={bookingForm} 
            layout="vertical" 
            onFinish={handleConfirmBooking}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item 
                  name="fullName" 
                  label={<Text strong>Họ và tên khách hàng</Text>}
                  rules={[{ required: true, message: 'Vui lòng nhập họ và tên!' }]}
                >
                  <Input placeholder="Nhập họ và tên..." size="large" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item 
                  name="phone" 
                  label={<Text strong>Số điện thoại</Text>}
                  rules={[{ required: true, message: 'Vui lòng nhập số điện thoại!' }]}
                >
                  <Input placeholder="Nhập số điện thoại..." size="large" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item 
                  name="email" 
                  label={<Text strong>Email <Text type="secondary" style={{fontWeight: 'normal'}}>(Tùy chọn)</Text></Text>}
                  rules={[{ type: 'email', message: 'Email không đúng định dạng!' }]}
                >
                  <Input placeholder="Nhập địa chỉ email..." size="large" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item 
                  name="voucherCode" 
                  label={<Text strong>Mã Voucher <Text type="secondary" style={{fontWeight: 'normal'}}>(Tùy chọn)</Text></Text>}
                >
                  <Input placeholder="Nhập mã giảm giá..." size="large" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item 
              name="notes" 
              label={<Text strong>Ghi chú <Text type="secondary" style={{fontWeight: 'normal'}}>(Tùy chọn)</Text></Text>}
            >
              <Input.TextArea 
                rows={3} 
                placeholder="Ví dụ: Khách yêu cầu phòng yên tĩnh..." 
              />
            </Form.Item>
          </Form>
        </div>
      </Modal>

    </div>
  );
};

// =====================================================================
// 5. COMPONENT: BOOKING DETAIL (TRANG CHI TIẾT THEO MOCK-UP 2)
// =====================================================================
const BookingDetail = () => {
  const { bookingCode } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [depositForm] = Form.useForm();
  const depositMethod = Form.useWatch('paymentMethod', depositForm);
  const depositAmount = Form.useWatch('amount', depositForm);
  const [depositPaymentData, setDepositPaymentData] = useState(null);
  const [creatingDepositMomo, setCreatingDepositMomo] = useState(false);
  const [checkingDepositPayment, setCheckingDepositPayment] = useState(false);

  // ── Gán phòng vật lý ──
  const [assignModal, setAssignModal] = useState({ open: false, detail: null });
  const [availableRooms, setAvailableRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [selectedPhysicalRoom, setSelectedPhysicalRoom] = useState(null);
  const [assigningRoom, setAssigningRoom] = useState(false);

  const openAssignModal = async (detail) => {
    setAssignModal({ open: true, detail });
    setSelectedPhysicalRoom(null);
    setLoadingRooms(true);
    try {
      // Gọi API lấy danh sách phòng vật lý trống của hạng phòng này
      const res = await bookingApi.getAssignableRooms(detail.roomTypeId);
      const rooms = res?.data?.data || res?.data || [];
      setAvailableRooms(rooms);
    } catch {
      message.error('Không tải được danh sách phòng trống!');
      setAvailableRooms([]);
    } finally {
      setLoadingRooms(false);
    }
  };

  const handleAssignRoom = async () => {
    if (!selectedPhysicalRoom) { message.warning('Vui lòng chọn 1 phòng!'); return; }
    setAssigningRoom(true);
    try {
      await bookingManagementApi.changeRoom(assignModal.detail.id, selectedPhysicalRoom);
      message.success('Đã gán phòng thành công!');
      setAssignModal({ open: false, detail: null });
      // Reload booking detail
      const response = await bookingManagementApi.searchBookings({ keyword: bookingCode, page: 1, pageSize: 1 });
      const dbBooking = response.data?.data?.items?.[0];
      if (dbBooking) {
        setBooking(prev => ({
          ...prev,
          originalRooms: (dbBooking.details || []).map(d => ({
            id: d.id || d.Id,
            roomTypeId: d.roomTypeId || d.RoomTypeId,
            typeName: d.roomTypeName || d.RoomTypeName,
            roomNum: d.roomNumber || d.RoomNumber || 'Chưa xếp',
            checkIn: dayjs(d.checkInDate || d.CheckInDate).format('DD/MM/YYYY HH:mm'),
            checkOut: dayjs(d.checkOutDate || d.CheckOutDate).format('DD/MM/YYYY HH:mm'),
            price: d.pricePerNight ?? d.PricePerNight ?? 0,
            status: d.status || d.Status,
          }))
        }));
      }
    } catch (err) {
      message.error(err?.response?.data?.message || 'Lỗi khi gán phòng!');
    } finally {
      setAssigningRoom(false);
    }
  };

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const response = await bookingManagementApi.searchBookings({ keyword: bookingCode, page: 1, pageSize: 1 });
        const resultData = response.data?.data;
        if (resultData && resultData.items && resultData.items.length > 0) {
           const dbBooking = resultData.items[0];
           const mappedBooking = {
              id: dbBooking.id || dbBooking.Id,
              bookingCode: dbBooking.bookingCode || dbBooking.BookingCode,
              customerName: dbBooking.guestName || dbBooking.GuestName || 'Khách vãng lai',
              phone: dbBooking.guestPhone || dbBooking.GuestPhone,
              email: dbBooking.guestEmail || dbBooking.GuestEmail,
              checkInDate: (dbBooking.details || dbBooking.Details || [])[0]?.checkInDate || (dbBooking.details || dbBooking.Details || [])[0]?.CheckInDate || dbBooking.bookedAt || dbBooking.BookedAt,
              status: dbBooking.status || dbBooking.Status,
              totalAmount: dbBooking.finalAmount || dbBooking.FinalAmount || 0,
              discountAmount: dbBooking.discountAmount || dbBooking.DiscountAmount || 0,
              voucherCode: dbBooking.voucherCode || dbBooking.VoucherCode || 'Không áp dụng',
              deposit: dbBooking.depositAmount || dbBooking.DepositAmount || 0, 
              originalRooms: (dbBooking.details || dbBooking.Details || []).map(d => ({
                  id: d.id || d.Id,
                  roomTypeId: d.roomTypeId || d.RoomTypeId,
                  typeName: d.roomTypeName || d.RoomTypeName,
                  roomNum: d.roomNumber || d.RoomNumber || 'Chưa xếp',
                  checkIn: dayjs(d.checkInDate || d.CheckInDate).format('DD/MM/YYYY HH:mm'),
                  checkOut: dayjs(d.checkOutDate || d.CheckOutDate).format('DD/MM/YYYY HH:mm'),
                  price: d.pricePerNight ?? d.PricePerNight ?? 0,
                  status: d.status || d.Status
              })),
              notes: dbBooking.notes || dbBooking.Notes
           };
           setBooking(mappedBooking);
        }
      } catch (err) {
        console.error("Lỗi khi tải chi tiết booking", err);
      }
    };
    fetchDetail();
  }, [bookingCode]);

  useEffect(() => {
    if (!isDepositModalOpen || !depositPaymentData?.paymentId) return undefined;

    const timer = setInterval(() => {
      checkDepositPaymentStatus(depositPaymentData.paymentId, false);
    }, 5000);

    return () => clearInterval(timer);
  }, [isDepositModalOpen, depositPaymentData?.paymentId]);

  if (!booking) {
    return (
      <Result
        status="404"
        title="Không tìm thấy mã Booking này!"
        extra={
          <Button type="primary" onClick={() => navigate('/admin/bookings')}>
            Quay lại Bảng Quản lý
          </Button>
        }
      />
    );
  }

  const getStatusTag = (status) => {
    let displayStatus = status;
    let color = 'default';
    if (status === 'Pending' || status === 'Chờ xử lý' || status === 'Holding') {
      color = 'default';
      displayStatus = 'Chờ xử lý';
    } else if (status === 'Confirmed' || status === 'Đã xác nhận') {
      color = 'success';
      displayStatus = 'Đã xác nhận';
    } else if (status === 'Checked_in' || status === 'Đang ở') {
      color = 'processing';
      displayStatus = 'Đang ở';
    } else if (status === 'Completed' || status === 'Hoàn tất') {
      color = 'processing';
      displayStatus = 'Hoàn tất';
    } else if (status === 'Cancelled' || status === 'Đã hủy') {
      color = 'error';
      displayStatus = 'Đã hủy';
    }
    return <Tag color={color}>{displayStatus}</Tag>;
  };

  const executeConfirm = async () => {
    try {
      await bookingManagementApi.updateBookingStatus(booking.id, 'Confirmed');
      setBooking((prev) => ({ ...prev, status: 'Confirmed' }));
      message.success('Đã xác nhận đơn thành công!');
    } catch (error) {
      message.error('Lỗi khi xác nhận đơn');
    }
  };

  const handleConfirm = () => {
    if (!booking.deposit || booking.deposit <= 0) {
      Modal.confirm({
        title: 'Cảnh báo: Khách chưa nạp cọc!',
        content: 'Khách chưa nạp tiền cọc, bạn có chắc chắn muốn xác nhận giữ phòng không?',
        okText: 'Vẫn Xác Nhận',
        cancelText: 'Hủy bỏ',
        onOk: () => executeConfirm(),
      });
    } else {
      executeConfirm();
    }
  };

  const createDepositMomoPayment = async (force = false) => {
    try {
      const values = await depositForm.validateFields(['amount', 'paymentMethod', 'notes']);
      if (values.paymentMethod !== 'Momo') return;
      if (!values.amount || Number(values.amount) < 1000) {
        message.warning('Số tiền thanh toán MoMo phải từ 1.000 VNĐ.');
        return;
      }
      if (!force && depositPaymentData?.paymentId) return;

      setCreatingDepositMomo(true);
      const res = await momoPaymentApi.createBookingDepositPayment(
        booking.id,
        Number(values.amount),
        values.notes || ''
      );
      const payload = res?.data?.data || res?.data;
      setDepositPaymentData(payload);
      message.success('Đã tạo QR MoMo cho tiền cọc.');
    } catch (e) {
      if (e?.errorFields) return;
      message.error(e?.response?.data?.message || 'Không tạo được QR MoMo.');
    } finally {
      setCreatingDepositMomo(false);
    }
  };

  const checkDepositPaymentStatus = async (paymentId = depositPaymentData?.paymentId, showMessage = true) => {
    if (!paymentId) return;

    try {
      setCheckingDepositPayment(true);
      const res = await momoPaymentApi.getPaymentStatus(paymentId);
      const payload = res?.data?.data || res?.data;
      setDepositPaymentData((prev) => ({ ...prev, ...payload }));

      const normalizedStatus = String(payload?.status || '').toUpperCase();
      if (normalizedStatus === 'SUCCESS' || normalizedStatus === 'PAID') {
        await fetchDetail();
        message.success('Nạp cọc qua MoMo thành công.');
        setIsDepositModalOpen(false);
        depositForm.resetFields();
        setDepositPaymentData(null);
      } else if (showMessage) {
        message.info(`Trạng thái hiện tại: ${payload?.status || 'PENDING'}`);
      }
    } catch (error) {
      console.error('Check momo deposit payment status error:', error);
      if (showMessage) {
        message.error(error?.response?.data?.message || 'Không kiểm tra được trạng thái thanh toán.');
      }
    } finally {
      setCheckingDepositPayment(false);
    }
  };

  const handleSaveDeposit = async (values) => {
    try {
      if (values.paymentMethod === 'Momo') {
        if (!depositPaymentData?.paymentId) {
          await createDepositMomoPayment(true);
          return;
        }

        await checkDepositPaymentStatus(depositPaymentData.paymentId, true);
        return;
      }

      const res = await bookingManagementApi.addDeposit(booking.id, values.amount);
      if (res.data && res.data.success) {
        setBooking((prev) => ({ ...prev, deposit: res.data.newDeposit }));
        message.success(`Đã nạp cọc ${Number(values.amount || 0).toLocaleString()} đ thành công!`);
        setIsDepositModalOpen(false);
        depositForm.resetFields();
      }
    } catch (e) {
      message.error(e.response?.data?.message || 'Lỗi khi gọi API nạp cọc.');
    }
  };

  const handleCancel = async () => {
    try {
      await bookingManagementApi.updateBookingStatus(booking.id, 'Cancelled');
      setBooking((prev) => ({ ...prev, status: 'Cancelled' }));
      message.success('Đã hủy đơn thành công!');
    } catch (error) {
      message.error('Lỗi khi hủy đơn');
    }
  };

  // Load danh sách phòng thật sự đã đặt (ưu tiên từ dữ liệu giả vừa lưu, nếu không có thì fallback)
  const renderRooms = booking.originalRooms && booking.originalRooms.length > 0 ? booking.originalRooms : [
    { id: 1, typeName: 'Phòng tiêu chuẩn 1 giường đơn', roomNum: 'P.102', checkIn: '04/04/2026 14:00', checkOut: '06/04/2026 12:00', price: 400000, status: booking.status || 'Chờ xử lý' },
    { id: 2, typeName: 'Phòng tiêu chuẩn 1 giường đơn', roomNum: 'P.103', checkIn: '04/04/2026 14:00', checkOut: '06/04/2026 12:00', price: 400000, status: booking.status || 'Chờ xử lý' },
    { id: 3, typeName: 'Phòng tiêu chuẩn 1 giường đơn', roomNum: 'P.104', checkIn: '04/04/2026 14:00', checkOut: '06/04/2026 12:00', price: 400000, status: booking.status || 'Chờ xử lý' }
  ];
  
  // Format tổng tiền liên kết với booking
  const displayTotal = booking.totalAmount ? booking.totalAmount.toLocaleString() : '2.400.000';

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <Card styles={{ body: { padding: '16px 24px' } }} style={{ marginBottom: 24, borderRadius: 12 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space align="center" size="middle">
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate('/admin/bookings')}
                style={{ fontWeight: 600, paddingLeft: 0 }}
              >
                Chi tiết: {booking.bookingCode}
              </Button>
              {getStatusTag(booking.status)}
            </Space>
          </Col>
          <Col>
            {['Pending', 'Chờ xử lý', 'Holding'].includes(booking.status) && (
              <Space>
                <Button type="primary" onClick={handleConfirm}>Xác nhận Đơn</Button>
                <Button danger onClick={handleCancel}>Hủy Đơn</Button>
              </Space>
            )}
          </Col>
        </Row>
      </Card>

      <Row gutter={24} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card title="Thông tin khách hàng" extra={<Button type="link" size="small">Sửa</Button>} style={{ borderRadius: 12, height: '100%' }}>
            <div style={{ lineHeight: '32px' }}>
              <div><Text type="secondary" style={{ width: 120, display: 'inline-block' }}>Họ và tên:</Text> <Text strong>{booking.customerName}</Text></div>
              <div><Text type="secondary" style={{ width: 120, display: 'inline-block' }}>Số điện thoại:</Text> <Text>{booking.phone || '0888699388'}</Text></div>
              <div><Text type="secondary" style={{ width: 120, display: 'inline-block' }}>Email:</Text> <Text>{booking.email || 'Không có'}</Text></div>
              <div><Text type="secondary" style={{ width: 120, display: 'inline-block' }}>Ngày đặt:</Text> <Text>{dayjs(booking.checkInDate).format('DD/MM/YYYY HH:mm')}</Text></div>
              <div><Text type="secondary" style={{ width: 120, display: 'inline-block' }}>Ghi chú:</Text> <Text>{booking.notes || 'Không có'}</Text></div>
            </div>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="Thông tin thanh toán" extra={<Button size="small" onClick={() => setIsDepositModalOpen(true)}>Nạp Cọc</Button>} style={{ borderRadius: 12, height: '100%' }}>
            <div style={{ lineHeight: '32px' }}>
              <div><Text type="secondary" style={{ width: 150, display: 'inline-block' }}>Mã Voucher:</Text> <Text strong color="blue">{booking.voucherCode}</Text></div>
              <div><Text type="secondary" style={{ width: 150, display: 'inline-block' }}>Giảm giá:</Text> <Text type="danger">-{booking.discountAmount?.toLocaleString()} đ</Text></div>
              <div><Text type="secondary" style={{ width: 150, display: 'inline-block' }}>Đã đặt cọc:</Text> <Text style={{ color: '#52c41a' }}>+{(booking.deposit || 0).toLocaleString()} đ</Text></div>
              <div style={{ marginTop: 8 }}><Text type="secondary" style={{ width: 150, display: 'inline-block', fontSize: 16 }}>Tổng tiền (Dự kiến):</Text> <Text strong style={{ fontSize: 18, color: '#1890ff' }}>{displayTotal} đ</Text></div>
              <div style={{ marginTop: 4 }}><Text type="secondary" style={{ width: 150, display: 'inline-block', fontSize: 16 }}>Còn lại cần thanh toán:</Text> <Text strong type="danger" style={{ fontSize: 16 }}>{((booking.totalAmount || 0) - (booking.deposit || 0)).toLocaleString()} đ</Text></div>
            </div>
          </Card>
        </Col>
      </Row>

      <Card title={`Danh sách phòng đã đặt (${renderRooms.length})`} style={{ borderRadius: 12 }}>
        <Table
          dataSource={renderRooms}
          rowKey="id"
          pagination={false}
          columns={[
            { title: 'Hạng phòng', dataIndex: 'typeName', key: 'type', render: (t) => <Text strong>{t}</Text> },
            {
              title: 'Phòng xếp', dataIndex: 'roomNum', key: 'room',
              render: (r, record) => (
                <Space>
                  <Tag color={r && r !== 'Chưa xếp' ? 'blue' : 'default'}>{r || 'Chưa xếp'}</Tag>
                  {/* Chỉ cho gán phòng khi chưa có phòng vật lý hoặc booking chưa Check-in */}
                  {!['Checked_in', 'Completed', 'Cancelled'].includes(booking?.status) && (
                    <Button
                      size="small"
                      type={r && r !== 'Chưa xếp' ? 'default' : 'primary'}
                      onClick={() => openAssignModal(record)}
                    >
                      {r && r !== 'Chưa xếp' ? '🔄 Đổi phòng' : '🏨 Gán phòng'}
                    </Button>
                  )}
                </Space>
              )
            },
            { title: 'Check-in', dataIndex: 'checkIn', key: 'in' },
            { title: 'Check-out', dataIndex: 'checkOut', key: 'out' },
            { title: 'Giá/Đêm (VNĐ)', dataIndex: 'price', key: 'price', render: (p) => (p || 0).toLocaleString() },
            { title: 'Trạng thái', dataIndex: 'status', key: 'stt', render: (s) => <Tag color="orange">{s}</Tag> },
          ]}
        />
      </Card>

      {/* ── Modal Gán phòng vật lý ── */}
      <Modal
        title={`🏨 Chọn phòng vật lý — ${assignModal.detail?.typeName || ''}`}
        open={assignModal.open}
        onCancel={() => setAssignModal({ open: false, detail: null })}
        onOk={handleAssignRoom}
        okText="Xác nhận gán phòng"
        cancelText="Hủy"
        confirmLoading={assigningRoom}
        okButtonProps={{ disabled: !selectedPhysicalRoom }}
        width={520}
      >
        {loadingRooms ? (
          <div style={{ textAlign: 'center', padding: 32 }}><span>Đang tải danh sách phòng...</span></div>
        ) : availableRooms.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: '#999' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🚫</div>
            <div>Không còn phòng trống cho hạng phòng này.</div>
          </div>
        ) : (
          <div>
            <p style={{ color: '#666', marginBottom: 16, fontSize: 13 }}>
              Chọn phòng vật lý để gán cho khách. Chỉ hiển thị phòng có trạng thái <Tag color="green">Available</Tag>
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {availableRooms.map(room => (
                <div
                  key={room.id}
                  onClick={() => setSelectedPhysicalRoom(room.id)}
                  style={{
                    border: `2px solid ${selectedPhysicalRoom === room.id ? '#1890ff' : '#e5e7eb'}`,
                    borderRadius: 8, padding: '12px 8px', textAlign: 'center',
                    cursor: 'pointer', background: selectedPhysicalRoom === room.id ? '#e6f4ff' : 'white',
                    transition: 'all 200ms',
                  }}
                >
                  <div style={{ fontSize: 18, fontWeight: 700, color: selectedPhysicalRoom === room.id ? '#1890ff' : '#18181b' }}>
                    {room.roomNumber}
                  </div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>Tầng {room.floor}</div>
                  <Tag color="green" style={{ marginTop: 6, fontSize: 10 }}>Trống</Tag>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        title="Tiếp nhận tiền cọc"
        open={isDepositModalOpen}
        onCancel={() => {
          setIsDepositModalOpen(false);
          setDepositPaymentData(null);
        }}
        onOk={() => depositForm.submit()}
        okText={depositMethod === 'Momo' ? 'Kiểm tra thanh toán MoMo' : 'Lưu thông tin'}
        cancelText="Hủy"
        confirmLoading={depositMethod === 'Momo' ? checkingDepositPayment : false}
      >
        <Form form={depositForm} layout="vertical" onFinish={handleSaveDeposit} initialValues={{ paymentMethod: 'Chuyển khoản' }}>
          <Form.Item name="amount" label="Số tiền cọc khách đưa" rules={[{ required: true, message: 'Vui lòng nhập số tiền cọc' }]}>
            <InputNumber
              style={{ width: '100%' }}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
              suffix="VNĐ"
              placeholder="VD: 1000000"
            />
          </Form.Item>
          <Form.Item name="paymentMethod" label="Phương thức thanh toán">
            <Select
              onChange={(value) => {
                if (value !== 'Momo') {
                  setDepositPaymentData(null);
                  return;
                }
                const currentAmount = Number(depositForm.getFieldValue('amount') || 0);
                if (currentAmount >= 1000) {
                  createDepositMomoPayment(true);
                } else {
                  message.info('Nhập số tiền từ 1.000 VNĐ rồi hệ thống sẽ tạo QR MoMo.');
                }
              }}
            >
              <Select.Option value="Chuyển khoản">Chuyển khoản</Select.Option>
              <Select.Option value="Tiền mặt">Tiền mặt</Select.Option>
              <Select.Option value="Thẻ tín dụng/Ghi nợ">Thẻ tín dụng/Ghi nợ</Select.Option>
              <Select.Option value="Momo">Momo</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="notes" label="Ghi chú / Link ảnh Bill chuyển khoản">
            <Input.TextArea rows={3} placeholder="Nhập đường link ảnh chụp bill hoặc ghi chú thông tin người chuyển..." />
          </Form.Item>
        </Form>

        {depositMethod === 'Momo' ? (
          <>
            <Space style={{ marginBottom: 12 }}>
              <Button onClick={() => createDepositMomoPayment(true)} loading={creatingDepositMomo}>
                Tạo QR MoMo
              </Button>
              <Button onClick={() => checkDepositPaymentStatus(depositPaymentData?.paymentId, true)} disabled={!depositPaymentData?.paymentId} loading={checkingDepositPayment}>
                Kiểm tra trạng thái
              </Button>
            </Space>
            <MomoPaymentPanel
              paymentData={{ ...depositPaymentData, amount: Number(depositAmount || 0) }}
              checking={checkingDepositPayment}
              onCheckStatus={() => checkDepositPaymentStatus(depositPaymentData?.paymentId, true)}
              onRegenerate={() => createDepositMomoPayment(true)}
            />
          </>
        ) : null}
      </Modal>
    </div>
  );
};
// =====================================================================
// 6. MAIN COMPONENT (GOM NHÓM ROUTE)
// =====================================================================
const BookingSystem = () => {
  return (
    <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
      <Content>
        <Routes>
          <Route path="/" element={<BookingList />} />
          <Route path="select-room" element={<SelectRoom />} />
          <Route path=":bookingCode" element={<BookingDetail />} />
        </Routes>
      </Content>
    </Layout>
  );
};

export default BookingSystem;


