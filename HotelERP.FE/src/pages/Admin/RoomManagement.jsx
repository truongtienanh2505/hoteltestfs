import React, { useState, useEffect } from 'react';
import {
  Layout, Menu, Table, Button, Input, Select,
  Space, Form, Upload, message, Tabs, Checkbox,
  Modal, InputNumber, Row, Col, Card, Steps, Popconfirm
} from 'antd';
const { Step } = Steps;
import {
  AppstoreOutlined, PlusOutlined, UploadOutlined,
  CopyOutlined, SearchOutlined, EditOutlined, DeleteOutlined,
  EyeOutlined, TableOutlined, ToolOutlined, SettingOutlined,
  WifiOutlined, CoffeeOutlined
} from '@ant-design/icons';
import axios from 'axios';
import axiosClient from '../../api/axiosClient';

const { Header, Sider, Content } = Layout;
const { Option } = Select;
const { TabPane } = Tabs;

const API_URL = 'http://localhost:5080/api';

const isAbsoluteImageUrl = (value = '') =>
  /^https?:\/\//i.test(value) || value.startsWith('data:') || value.startsWith('blob:');

const resolveImageSrc = (value, fallbackFolder = '') => {
  if (!value) return '';
  if (isAbsoluteImageUrl(value) || value.startsWith('/')) return value;
  return fallbackFolder ? `/${fallbackFolder}/${value}` : value;
};

// --- COMPONENT CHÍNH ---
export default function App() {
  const [currentView, setCurrentView] = useState('list'); // 'list', 'create', 'edit'

  // STATE LƯU DỮ LIỆU TỪ API
  const [rooms, setRooms] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [amenitiesList, setAmenitiesList] = useState([]); // State mới lưu tiện ích từ API
  const [loading, setLoading] = useState(false);
  const [filterFloor, setFilterFloor] = useState(null);
  const [filterRoomNumber, setFilterRoomNumber] = useState('');
  const [filterStatus, setFilterStatus] = useState(null);
  const [filterCleaningStatus, setFilterCleaningStatus] = useState(null);
  const [isAmenitiesModalVisible, setIsAmenitiesModalVisible] = useState(false);
  const [isInventoryModalVisible, setIsInventoryModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isCreateMultipleVisible, setIsCreateMultipleVisible] = useState(false);
  const [multipleForm] = Form.useForm();
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [currentRoomInventory, setCurrentRoomInventory] = useState([]);
  const [roomAmenities, setRoomAmenities] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [isCloneModalVisible, setIsCloneModalVisible] = useState(false);
  const [isAddSupplyModalVisible, setIsAddSupplyModalVisible] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [supplySearchText, setSupplySearchText] = useState('');
  const [supplyCategoryFilter, setSupplyCategoryFilter] = useState(null);
  const [inventoryData, setInventoryData] = useState([]);
  const [inventorySearchText, setInventorySearchText] = useState('');
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState(null);

  // States and hooks for Room Form
  const [roomForm] = Form.useForm();
  const [roomFormImageUrl, setRoomFormImageUrl] = useState("");
  const [roomFormSubmitting, setRoomFormSubmitting] = useState(false);
  const [roomFormCurrentStep, setRoomFormCurrentStep] = useState(0);
  useEffect(() => {
    if (isEditModalVisible && selectedRoom) {
      roomForm.setFieldsValue({
        roomNumber: selectedRoom.roomNumber,
        floor: selectedRoom.floor,
        typeId: selectedRoom.roomTypeId
      });
      
      const type = roomTypes.find(t => t.id === selectedRoom.roomTypeId);
      setRoomFormImageUrl(type?.imageUrl || "");
    }
  }, [isEditModalVisible, selectedRoom, roomTypes]);

  useEffect(() => {
    if (currentView === 'create') {
      roomForm.resetFields();
      setRoomFormImageUrl("");
      setRoomFormCurrentStep(0);
      setInventoryData([]);
    }
  }, [currentView]);

  const handleEditSubmit = async () => {
    try {
      setRoomFormSubmitting(true);
      const values = await roomForm.validateFields(['typeId']);
      
      await axiosClient.put(`/Rooms/${selectedRoom.id}`, {
        roomNumber: selectedRoom.roomNumber,
        floor: selectedRoom.floor,
        roomTypeId: values.typeId
      });
      
      message.success("Cập nhật hạng phòng thành công!");
      setIsEditModalVisible(false);
      fetchRooms();
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Lỗi khi cập nhật hạng phòng!";
      message.error(errorMsg);
      console.error("handleEditSubmit error:", error);
    } finally {
      setRoomFormSubmitting(false);
    }
  };

  // GỌI API KHI COMPONENT ĐƯỢC RENDER LẦN ĐẦU
  useEffect(() => {
    fetchRooms();
    fetchRoomTypes();
    fetchAmenities(); // Gọi thêm API lấy tiện ích
    fetchEquipments();

    let isMounted = true;
    import('@microsoft/signalr').then(signalR => {
      const connection = new signalR.HubConnectionBuilder()
        .withUrl("http://localhost:5080/roomHub")
        .withAutomaticReconnect()
        .build();

      const startSignalR = async () => {
        try {
          await connection.start();
          if (isMounted) {
            connection.on("ReceiveRoomStatusUpdate", (roomId, status, cleaningStatus) => {
               setRooms(prevRooms => prevRooms.map(r => 
                 r.id === roomId ? { ...r, status, cleaningStatus } : r
               ));
            });
          }
        } catch (err) {
          console.log("SignalR Error in RoomManagement: ", err);
        }
      };

      startSignalR();

      return () => {
        isMounted = false;
        connection.stop();
      };
    });
  }, []);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const response = await axiosClient.get('/Rooms');
      setRooms(response.data.data ? response.data.data : response.data);
    } catch (error) {
      message.error("Lỗi mạng: Không thể kết nối đến Backend hoặc chưa có dữ liệu!");
      console.error("fetchRooms error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoomTypes = async () => {
    try {
      const response = await axiosClient.get('/RoomTypes');
      setRoomTypes(response.data.data ? response.data.data : response.data);
    } catch (error) {
      message.warning("Lỗi mạng: Không thể tải hạng phòng từ Backend.");
      console.error("fetchRoomTypes error:", error);
    }
  };

  const fetchAmenities = async () => {
    try {
      // Backend cần có API GET /api/Amenities trả về list { id, name }
      const response = await axiosClient.get('/Amenities');
      setAmenitiesList(response.data.data ? response.data.data : response.data);
    } catch (error) {
      message.warning("Lỗi mạng: Không thể tải danh sách tiện ích từ Backend.");
      console.error("fetchAmenities error:", error);
    }
  };

  const fetchRoomTypeAmenities = async (typeId) => {
    if (!typeId) return;
    const typeObj = roomTypes.find(t => t.id === typeId);
    if (typeObj && (typeObj.amenities || typeObj.Amenities)) {
      setRoomAmenities(typeObj.amenities || typeObj.Amenities);
    } else {
      try {
        const response = await axiosClient.get(`/RoomTypes/${typeId}/amenities`);
        setRoomAmenities(response.data.data || []);
      } catch (error) {
         console.error("fetchRoomTypeAmenities error:", error);
         setRoomAmenities([]);
      }
    }
  };

  const handleCloneRoom = async (sampleRoomId) => {
    try {
      message.loading({ content: 'Đang sao chép vật tư từ phòng mẫu...', key: 'clone' });

      const response = await axiosClient.get(`/rooms/${sampleRoomId}/inventories`);
      const sampleItems = response.data.data || [];

      if (sampleItems.length === 0) {
        message.warning({ content: 'Phòng mẫu không có vật tư nào!', key: 'clone' });
        setIsCloneModalVisible(false);
        return;
      }

      if (currentView === 'list') {
        // Clone trực tiếp vào Database cho phòng đang chọn!
        for (const item of sampleItems) {
          await axiosClient.post(`/rooms/${selectedRoom.id}/inventories`, {
            equipmentId: item.equipmentId,
            quantity: item.quantity,
            condition: item.condition || "Tốt",
            isMinibar: (item.itemName || '').toLowerCase().includes("minibar"),
            priceIfLost: item.priceIfLost || 0
          });
        }
        message.success({ content: `Đã sao chép thành công ${sampleItems.length} vật tư từ phòng mẫu`, key: 'clone' });
        fetchRoomInventory(selectedRoom.id);
        fetchEquipments();
      } else {
        // Clone vào form tạo phòng mới
        const mappedInventories = sampleItems.map((item, idx) => ({
          id: item.id || Date.now() + idx,
          equipmentId: item.equipmentId,
          name: item.itemName,
          unit: item.unit || 'Cái',
          quantity: item.quantity,
          penaltyPrice: item.priceIfLost
        }));
        setInventoryData(mappedInventories);
        message.success({ content: `Đã sao chép tiện ích và vật tư vào form`, key: 'clone' });
      }
    } catch (error) {
      message.error({ content: `Lỗi khi sao chép vật tư!`, key: 'clone' });
      console.error("handleCloneRoom error:", error);
    } finally {
      setIsCloneModalVisible(false);
    }
  };

  const fetchRoomInventory = async (roomId) => {
    try {
      const response = await axiosClient.get(`/rooms/${roomId}/inventories`);
      setCurrentRoomInventory(response.data.data || []);
    } catch (error) {
      console.error("fetchRoomInventory error:", error);
    }
  };

  const fetchEquipments = async () => {
    try {
      const res = await axiosClient.get('/Equipments');
      const dataList = res.data.data ? res.data.data : res.data;
      
      console.log("🕵️ DỮ LIỆU KHO VẬT TƯ:", dataList); // <-- THÊM DÒNG NÀY ĐỂ SOI DỮ LIỆU
      
      setEquipments(dataList || []);
    } catch (error) {
      console.error("fetchEquipments error:", error);
    }
  };

  const handleCreateMultipleRooms = async (values) => {
    setLoading(true);
    try {
      let templateInventories = [];
      if (values.cloneRoomId) {
        const res = await axiosClient.get(`/rooms/${values.cloneRoomId}/inventories`);
        templateInventories = res.data.data || [];
      }

      let successCount = 0;
      for (let i = 0; i < values.count; i++) {
          const currentNumber = values.startNumber + (i * values.step);
          
          if (rooms.find(r => String(r.roomNumber) === String(currentNumber))) {
              message.warning(`Phòng ${currentNumber} đã tồn tại`);
              continue; 
          }

          try {
              const submitData = {
                roomNumber: String(currentNumber),
                floor: values.floor,
                roomTypeId: values.typeId,
                status: 'AVAILABLE',
                cleaningStatus: 'CLEAN',
              };
              const resRoom = await axiosClient.post('/Rooms', submitData);
              const newRoomId = resRoom.data?.roomId || resRoom.data?.data?.roomId;

              if (newRoomId && templateInventories.length > 0) {
                for (const item of templateInventories) {
                  await axiosClient.post(`/rooms/${newRoomId}/inventories`, {
                    equipmentId: item.equipmentId,
                    quantity: item.quantity,
                    condition: item.condition || "Tốt",
                    isMinibar: (item.itemName || '').toLowerCase().includes("minibar"),
                    priceIfLost: item.priceIfLost || 0
                  });
                }
              }
              successCount++;
          } catch (e) {
              const errorMsg = e.response?.data?.message || `Lỗi khi tạo phòng ${currentNumber}`;
              if (errorMsg.toLowerCase().includes("tồn tại") || errorMsg.toLowerCase().includes("exists")) {
                  message.warning(`Phòng ${currentNumber} đã tồn tại`);
              } else {
                  message.error(errorMsg);
              }
          }
      }
      
      if (successCount > 0) {
          message.success(`Tạo thành công ${successCount} phòng mới!`);
          multipleForm.resetFields();
          setIsCreateMultipleVisible(false);
          fetchRooms();
      }
    } catch (error) {
       console.error("handleCreateMultipleRooms error:", error);
    } finally {
       setLoading(false);
    }
  };

  // MÀN HÌNH 1: DANH SÁCH PHÒNG
  const renderRoomList = () => {
    // Logic Đổi trạng thái nhanh gọi API
    const handleStatusChange = async (roomId, field, newStatus) => {
      try {
        if (field === 'status') {
          if (newStatus === 'OCCUPIED') {
            message.warning("Trạng thái 'Đang có khách' chỉ được cập nhật tự động khi có khách Check-in vào phòng!");
            return;
          }
          await axiosClient.patch(`/Rooms/${roomId}/status`, { newStatus });
        } else {
          await axiosClient.patch(`/Rooms/${roomId}/cleaning-status`, { newCleaningStatus: newStatus });
        }
        // Cập nhật State cục bộ để UI phản hồi ngay lập tức
        setRooms(prevRooms => prevRooms.map(r => r.id === roomId ? { ...r, [field]: newStatus } : r));
        message.success(`Đã cập nhật trạng thái thành công!`);
      } catch (error) {
        const errorMsg = error.response?.data?.message || "Lỗi kết nối Backend. Không thể cập nhật!";
        message.error(errorMsg);
        console.error("handleStatusChange error:", error);
      }
    };

    // Mapping trạng thái từ tiếng Anh (Backend) sang tiếng Việt (UI)
    const statusLabels = {
      'AVAILABLE': 'Sẵn sàng', 'Available': 'Sẵn sàng',
      'OCCUPIED': 'Đang có khách', 'Occupied': 'Đang có khách',
      'MAINTENANCE': 'Bảo trì', 'Maintenance': 'Bảo trì',
      'OUT_OF_ORDER': 'Ngừng hoạt động',
    };
    const cleaningLabels = {
      'CLEAN': 'Đã dọn', 'Clean': 'Đã dọn',
      'DIRTY': 'Chưa dọn', 'Dirty': 'Chưa dọn',
      'INSPECTING': 'Đang kiểm tra', 'Inspecting': 'Đang kiểm tra',
    };
    const statusColor = (val) => {
      const upper = (val || '').toUpperCase();
      if (upper === 'AVAILABLE') return '[&_.ant-select-selection-item]:!text-green-600';
      if (upper === 'OCCUPIED') return '[&_.ant-select-selection-item]:!text-blue-600';
      return '[&_.ant-select-selection-item]:!text-red-600';
    };
    const cleaningColor = (val) => {
      const upper = (val || '').toUpperCase();
      if (upper === 'CLEAN') return '[&_.ant-select-selection-item]:!text-green-600';
      if (upper === 'INSPECTING') return '[&_.ant-select-selection-item]:!text-purple-600';
      return '[&_.ant-select-selection-item]:!text-orange-500';
    };

    const columns = [
      { title: 'Số phòng', dataIndex: 'roomNumber', key: 'roomNumber' },
      { title: 'Tầng', dataIndex: 'floor', key: 'floor', render: (val) => val != null ? `Tầng ${val}` : '—' },
      {
        title: 'Hạng phòng',
        key: 'roomTypeName',
        dataIndex: 'roomTypeName',
      },
      {
        title: 'Kinh doanh',
        key: 'status',
        render: (_, record) => {
          const currentStatus = (record.status || '').toUpperCase();

          return (
            <Select
              value={currentStatus}
              onChange={(val) => handleStatusChange(record.id, 'status', val)}
              style={{ width: 160 }}
              variant="borderless"
              className={`font-semibold ${statusColor(record.status)}`}
            >
              <Option value="AVAILABLE"><span className="text-green-600">Sẵn sàng</span></Option>
              <Option value="OCCUPIED" disabled={currentStatus !== 'OCCUPIED'}>
                <span className="text-blue-600">Đang có khách</span>
              </Option>
              <Option value="MAINTENANCE"><span className="text-red-600">Bảo trì</span></Option>
            </Select>
          );
        }
      },
      {
        title: 'Trạng thái phòng',
        key: 'cleaningStatus',
        render: (_, record) => {
          const currentCleaning = (record.cleaningStatus || '').toUpperCase();

          return (
            <Select
              value={currentCleaning}
              onChange={(val) => handleStatusChange(record.id, 'cleaningStatus', val)}
              style={{ width: 160 }}
              variant="borderless"
              className={`font-semibold ${cleaningColor(record.cleaningStatus)}`}
            >
              <Option value="CLEAN"><span className="text-green-600">Đã dọn</span></Option>
              <Option value="DIRTY"><span className="text-orange-500">Chưa dọn</span></Option>
              <Option value="INSPECTING" disabled={currentCleaning !== 'INSPECTING'}>
                <span className="text-purple-600">Đang kiểm tra</span>
              </Option>
            </Select>
          );
        }
      },
      {
        title: 'Thao tác',
        key: 'action',
        render: (_, record) => (
          <Space>
            <Button
              type="text"
              className="text-purple-600 hover:text-purple-800"
              icon={<WifiOutlined />}
              title="Xem tiện ích"
              onClick={() => {
                setSelectedRoom(record);
                fetchRoomTypeAmenities(record.roomTypeId);
                setIsAmenitiesModalVisible(true);
              }}
            />
            <Button
              type="text"
              className="text-orange-600 hover:text-orange-800"
              icon={<CoffeeOutlined />}
              title="Quản lý vật tư"
              onClick={() => {
                setSelectedRoom(record);
                setInventorySearchText('');
                setInventoryCategoryFilter(null);
                fetchRoomInventory(record.id);
                setIsInventoryModalVisible(true);
              }}
            />
            <Button
              type="text"
              className="text-blue-600 hover:text-blue-800"
              icon={<EditOutlined />}
              title="Sửa phòng"
              onClick={() => {
                setSelectedRoom(record);
                roomForm.setFieldsValue({
                  roomNumber: record.roomNumber,
                  floor: record.floor,
                  typeId: record.roomTypeId
                });
                const type = roomTypes.find(t => t.id === record.roomTypeId);
                setRoomFormImageUrl(type?.imageUrl || "");
                setIsEditModalVisible(true);
              }}
            />
          </Space>
        )
      }
    ];

    const floorOptions = [...new Set(rooms.map(r => r.floor).filter(f => f != null))].sort((a, b) => Number(a) - Number(b));
    const filteredRooms = rooms.filter(r => {
      const matchFloor = filterFloor != null ? Number(r.floor) === Number(filterFloor) : true;
      const matchRoomNumber = filterRoomNumber ? String(r.roomNumber).includes(filterRoomNumber.trim()) : true;
      const matchStatus = filterStatus ? (r.status || '').toUpperCase() === filterStatus : true;
      const matchCleaning = filterCleaningStatus ? (r.cleaningStatus || '').toUpperCase() === filterCleaningStatus : true;
      return matchFloor && matchRoomNumber && matchStatus && matchCleaning;
    });

    return (
      <Card title="Quản lý Quỹ phòng" variant="borderless" className="m-4">
        <div className="flex justify-between mb-4">
          <Space wrap>
            {/* Lọc theo tầng */}
            <Select
              allowClear
              placeholder="Chọn Tầng"
              style={{ width: 130 }}
              value={filterFloor}
              onChange={(val) => setFilterFloor(val != null ? Number(val) : null)}
            >
              {floorOptions.map(f => (
                <Option key={f} value={Number(f)}>Tầng {f}</Option>
              ))}
            </Select>

            {/* Tìm theo số phòng */}
            <Input
              allowClear
              placeholder="Tìm số phòng..."
              prefix={<SearchOutlined />}
              style={{ width: 150 }}
              value={filterRoomNumber}
              onChange={(e) => setFilterRoomNumber(e.target.value)}
            />

            {/* Lọc theo Kinh doanh */}
            <Select
              allowClear
              placeholder="Kinh doanh"
              style={{ width: 155 }}
              value={filterStatus}
              onChange={(val) => setFilterStatus(val || null)}
            >
              <Option value="AVAILABLE"><span className="text-green-600">Sẵn sàng</span></Option>
              <Option value="OCCUPIED"><span className="text-blue-600">Đang có khách</span></Option>
              <Option value="MAINTENANCE"><span className="text-red-600">Bảo trì</span></Option>
            </Select>

            {/* Lọc theo Trạng thái phòng */}
            <Select
              allowClear
              placeholder="Trạng thái phòng"
              style={{ width: 170 }}
              value={filterCleaningStatus}
              onChange={(val) => setFilterCleaningStatus(val || null)}
            >
              <Option value="CLEAN"><span className="text-green-600">Đã dọn</span></Option>
              <Option value="DIRTY"><span className="text-orange-500">Chưa dọn</span></Option>
              <Option value="INSPECTING"><span className="text-purple-600">Đang kiểm tra</span></Option>
            </Select>
          </Space>
          <Space>
            <Button onClick={() => setIsCreateMultipleVisible(true)}>Tạo nhiều phòng</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCurrentView('create')}>
              Thêm phòng mới
            </Button>
          </Space>
        </div>
        <Table loading={loading} dataSource={filteredRooms} columns={columns} rowKey="id" pagination={{ pageSize: 8 }} />
      </Card>
    );
  };

  // MÀN HÌNH 2: FORM THÊM/SỬA PHÒNG
  const renderRoomForm = () => {
    const isEdit = currentView === 'edit';
    const supplyCategories = [...new Set(equipments.map(e => e.category || e.Category).filter(Boolean))];
    const filteredEquipments = equipments.filter(e => {
        const name = (e.name || e.Name || '').toLowerCase();
        const code = (e.itemCode || e.ItemCode || '').toLowerCase();
        const cat = e.category || e.Category || '';
        const search = supplySearchText.toLowerCase();
        const matchesSearch = name.includes(search) || code.includes(search);
        const matchesCat = supplyCategoryFilter ? cat === supplyCategoryFilter : true;
        return matchesSearch && matchesCat;
    });




    // Tính năng: Upload ảnh trực tiếp lên Cloudinary bằng Axios
    const customUpload = async ({ file, onSuccess, onError }) => {
      const formData = new FormData();
      formData.append('file', file);

      // LƯU Ý: Cập nhật "upload_preset" và "Cloud Name" thật của dự án
      formData.append('upload_preset', 'YOUR_UNSIGNED_PRESET');
      const cloudinaryName = 'YOUR_CLOUD_NAME';

      message.loading({ content: 'Đang tải ảnh lên Cloudinary...', key: 'upload' });
      try {
        const res = await axios.post(`https://api.cloudinary.com/v1_1/${cloudinaryName}/image/upload`, formData);
        setRoomFormImageUrl(res.data.secure_url);
        roomForm.setFieldsValue({ imageUrl: res.data.secure_url });
        message.success({ content: 'Tải ảnh thành công!', key: 'upload' });
        onSuccess("ok");
      } catch (err) {
        message.error({ content: 'Lỗi tải ảnh lên Cloudinary!', key: 'upload' });
        onError(err);
      }
    };

    const onFinish = async (values) => {
      setRoomFormSubmitting(true);
      try {
        if (!isEdit && rooms.find(r => String(r.roomNumber) === String(values.roomNumber))) {
            message.warning(`Phòng ${values.roomNumber} đã tồn tại vui lòng tạo phòng mới`);
            setRoomFormSubmitting(false);
            return;
        }

        if (isEdit) {
          // Chỉ cập nhật hạng phòng (và các thông tin cho phép)
          await axiosClient.put(`/Rooms/${selectedRoom.id}`, {
            roomNumber: selectedRoom.roomNumber,
            floor: selectedRoom.floor,
            roomTypeId: values.typeId
          });
          message.success("Cập nhật hạng phòng thành công!");
        } else {
          // Tạo phòng mới và lưu inventory
          const submitData = {
            roomNumber: values.roomNumber,
            floor: values.floor,
            roomTypeId: values.typeId,
            status: 'AVAILABLE',
            cleaningStatus: 'CLEAN',
          };

          const res = await axiosClient.post('/Rooms', submitData);
          const newRoomId = res.data?.roomId || res.data?.data?.roomId;

          if (newRoomId && inventoryData.length > 0) {
            for (const item of inventoryData) {
              await axiosClient.post(`/rooms/${newRoomId}/inventories`, {
                equipmentId: item.equipmentId,
                quantity: item.quantity,
                condition: item.condition || "Tốt",
                isMinibar: (item.name || '').toLowerCase().includes("minibar"),
                priceIfLost: item.penaltyPrice || 0
              });
            }
          }
          message.success("Tạo phòng mới thành công!");
        }

        setCurrentView('list');
        fetchRooms();
      } catch (error) {
        const errorMsg = error.response?.data?.message || "Lỗi khi xử lý! Vui lòng kiểm tra lại.";
        message.error(errorMsg);
        console.error("onFinish error:", error);
      } finally {
        setRoomFormSubmitting(false);
      }
    };

    const inventoryColumns = [
      { title: 'Mã VT', dataIndex: 'code' },
      { title: 'Tên vật tư', dataIndex: 'name' },
      { title: 'ĐVT', dataIndex: 'unit' },
      { 
        title: 'Số lượng', 
        dataIndex: 'quantity', 
        render: (val, record) => (
          <InputNumber 
            min={1} 
            value={val} 
            onChange={(newVal) => {
              setInventoryData(prev => prev.map(item => 
                item.id === record.id ? { ...item, quantity: newVal } : item
              ));
            }} 
          />
        ) 
      },
      { title: 'Giá đền bù (VNĐ)', dataIndex: 'penaltyPrice', render: (val) => val?.toLocaleString() + ' đ' },
      {
        title: 'Thao tác',
        key: 'action',
        render: (_, record) => (
          <Button 
            type="text" 
            danger 
            icon={<DeleteOutlined />} 
            onClick={async () => {
              if (isEdit && record.id > 1000000000) { // New item not yet in DB
                setInventoryData(prev => prev.filter(item => item.id !== record.id));
              } else if (isEdit) {
                try {
                  await axiosClient.delete(`/rooms/${selectedRoom.id}/inventories/${record.id}`);
                  message.success(`Đã xóa ${record.name}`);
                  setInventoryData(prev => prev.filter(item => item.id !== record.id));
                } catch (e) {
                  message.error("Lỗi khi xóa vật tư.");
                }
              } else {
                setInventoryData(prev => prev.filter(item => item.id !== record.id));
              }
            }}
          />
        )
      }
    ];

    return (
      <div className="m-4">
        <Button type="link" onClick={() => { setCurrentView('list'); roomForm.resetFields(); }} className="mb-2">
          &larr; Quay lại danh sách
        </Button>
        <Card title={isEdit ? "Sửa phòng" : "Quy trình thiết lập phòng"} variant="borderless">
          <Form form={roomForm} layout="vertical" onFinish={onFinish}>

            {/* Steps only shown for new room creation */}
            {!isEdit && (
              <Steps current={roomFormCurrentStep} className="mb-8">
                <Step title="Thông tin chính" />
                <Step title="Vật tư & Minibar" />
              </Steps>
            )}

            <div style={{ display: isEdit || roomFormCurrentStep === 0 ? 'block' : 'none' }}>
              <Row gutter={24} align="middle">
                <Col span={12}>
                  {!isEdit && (
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item name="roomNumber" label="Số phòng" rules={[{ required: true }]}>
                          <Input placeholder="VD: 101" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="floor" label="Tầng" rules={[{ required: true }]}>
                          <InputNumber className="w-full" placeholder="VD: 1" />
                        </Form.Item>
                      </Col>
                    </Row>
                  )}
                  {/* Hạng phòng Dropdown gọi từ API */}
                  <Form.Item name="typeId" label="Hạng phòng" rules={[{ required: true }]}>
                    <Select 
                      placeholder="Chọn hạng phòng"
                      onChange={(id) => {
                        const type = roomTypes.find(t => t.id === id);
                        setRoomFormImageUrl(type?.imageUrl || "");
                      }}
                    >
                      {roomTypes.map(type => (
                        <Option key={type.id} value={type.id}>{type.name}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <div className="border rounded bg-gray-50 flex items-center justify-center h-40 overflow-hidden">
                    {roomFormImageUrl ? (
                      <img src={resolveImageSrc(roomFormImageUrl)} alt="Hạng phòng" className="h-full w-full object-contain" />
                    ) : (
                      <div className="text-gray-400 italic text-sm text-center">
                        <AppstoreOutlined className="text-2xl mb-1 block" />
                        Chưa chọn hạng phòng / <br/> Hạng phòng chưa có ảnh
                      </div>
                    )}
                  </div>
                </Col>
              </Row>
            </div>




            <div style={{ display: !isEdit && roomFormCurrentStep === 1 ? 'block' : 'none' }}>
              <div className="mb-4 space-x-2">
                <Button type="primary" ghost onClick={() => setIsAddSupplyModalVisible(true)}>+ Thêm vật tư</Button>
                <Button icon={<CopyOutlined />} onClick={() => setIsCloneModalVisible(true)}>
                  Clone từ phòng mẫu
                </Button>
              </div>
              <Table dataSource={inventoryData} columns={inventoryColumns} rowKey="id" pagination={false} />
            </div>

            <div className="mt-6 border-t pt-4 flex space-x-4">
              {isEdit ? (
                <>
                  <Button type="default" onClick={() => { setCurrentView('list'); roomForm.resetFields(); }}>Hủy</Button>
                  <Button type="primary" htmlType="submit" loading={roomFormSubmitting}>Lưu thay đổi</Button>
                </>
              ) : (
                <>
                  {roomFormCurrentStep > 0 && (
                    <Button onClick={() => setRoomFormCurrentStep(c => c - 1)}>Quay lại</Button>
                  )}
                  {roomFormCurrentStep === 0 && (
                    <Button type="primary" onClick={async () => {
                      await roomForm.validateFields(['roomNumber', 'floor', 'typeId']);
                      setRoomFormCurrentStep(1);
                    }}>Tiếp tục</Button>
                  )}
                  {roomFormCurrentStep === 1 && (
                    <Button type="primary" htmlType="submit" loading={roomFormSubmitting}>Lưu & Tạo phòng</Button>
                  )}
                </>
              )}
            </div>
          </Form>
        </Card>
      </div>
    );
  };

  return (
    <div className="font-sans">
      {currentView === 'list' && renderRoomList()}
      {currentView !== 'list' && renderRoomForm()}

      {/* Modal Sửa Phòng */}
      <Modal
        title={
          <div className="flex items-center space-x-2 pb-2 border-b border-gray-100">
            <span className="text-lg font-bold text-gray-800">
              ✏️ Sửa thông tin phòng: <span className="text-blue-600 font-extrabold">{selectedRoom?.roomNumber}</span>
            </span>
          </div>
        }
        open={isEditModalVisible}
        onCancel={() => {
          setIsEditModalVisible(false);
          roomForm.resetFields();
          setRoomFormImageUrl("");
        }}
        footer={[
          <Button 
            key="cancel" 
            onClick={() => {
              setIsEditModalVisible(false);
              roomForm.resetFields();
              setRoomFormImageUrl("");
            }}
          >
            Hủy
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            loading={roomFormSubmitting} 
            onClick={handleEditSubmit}
            className="bg-blue-600 hover:bg-blue-700 border-none font-semibold px-6 rounded-lg"
          >
            Lưu thay đổi
          </Button>
        ]}
        width={600}
        centered
        className="rounded-2xl overflow-hidden"
      >
        <div className="py-4">
          <Form form={roomForm} layout="vertical">
            <Row gutter={24} align="middle">
              <Col span={12}>
                <Form.Item name="roomNumber" label="Số phòng">
                  <Input disabled className="bg-gray-50 text-gray-500 font-medium" />
                </Form.Item>
                <Form.Item name="floor" label="Tầng">
                  <InputNumber disabled className="w-full bg-gray-50 text-gray-500 font-medium" />
                </Form.Item>
                <Form.Item name="typeId" label="Hạng phòng" rules={[{ required: true, message: 'Vui lòng chọn hạng phòng!' }]}>
                  <Select 
                    placeholder="Chọn hạng phòng"
                    onChange={(id) => {
                      const type = roomTypes.find(t => t.id === id);
                      setRoomFormImageUrl(type?.imageUrl || "");
                    }}
                  >
                    {roomTypes.map(type => (
                      <Option key={type.id} value={type.id}>{type.name}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <div className="border rounded-xl bg-gray-50 flex flex-col items-center justify-center h-52 overflow-hidden border-dashed border-gray-200 p-2 shadow-inner">
                  {roomFormImageUrl ? (
                    <img src={resolveImageSrc(roomFormImageUrl)} alt="Hạng phòng" className="h-full w-full object-contain rounded-lg" />
                  ) : (
                    <div className="text-gray-400 italic text-sm text-center">
                      <AppstoreOutlined className="text-3xl mb-2 text-gray-300 block" />
                      Hạng phòng chưa có ảnh minh họa
                    </div>
                  )}
                </div>
              </Col>
            </Row>
          </Form>
        </div>
      </Modal>

      {/* Modal Xem Tiện ích */}
      <Modal
        title={
          <div className="flex items-center space-x-2 pb-2 border-b border-gray-100">
            <span className="text-lg font-bold text-gray-800">
              🎁 Tiện ích hạng phòng: <span className="text-purple-600 font-extrabold">{selectedRoom?.roomTypeName}</span>
            </span>
          </div>
        }
        open={isAmenitiesModalVisible}
        onCancel={() => setIsAmenitiesModalVisible(false)}
        footer={[
          <Button 
            key="close" 
            type="primary" 
            className="bg-purple-600 hover:bg-purple-700 border-none px-6 rounded-lg font-semibold"
            onClick={() => setIsAmenitiesModalVisible(false)}
          >
            Đóng
          </Button>
        ]}
        width={540}
        centered
        className="rounded-2xl overflow-hidden"
      >
        <div className="py-4">
          {roomAmenities.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {roomAmenities.map(am => {
                const iconSrc = am.iconUrl || am.IconUrl;
                const finalSrc = iconSrc 
                  ? (/^https?:\/\//i.test(iconSrc) || iconSrc.startsWith('/') || iconSrc.startsWith('data:') ? iconSrc : `/amenities/${iconSrc}`)
                  : null;

                return (
                  <div 
                    key={am.id} 
                    className="p-3 bg-gradient-to-r from-purple-50 to-indigo-50/80 rounded-xl border border-purple-100/60 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-300 flex items-center space-x-3 cursor-default"
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white shadow-inner flex items-center justify-center overflow-hidden border border-purple-100">
                      {finalSrc ? (
                        <img 
                          src={finalSrc} 
                          alt={am.name} 
                          className="w-8 h-8 object-contain"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24' fill='none' stroke='%238b5cf6' stroke-width='2'><circle cx='12' cy='12' r='10'/><path d='m9 12 2 2 4-4'/></svg>";
                          }}
                        />
                      ) : (
                        <span className="text-purple-600 text-xl font-bold">✨</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate mb-0">{am.name}</p>
                      <p className="text-[10px] text-purple-400 font-medium tracking-wide uppercase mb-0">Tiêu chuẩn</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-5xl mb-2">🏝️</div>
              <p className="text-gray-400 font-medium italic">Hạng phòng chưa được thiết lập tiện ích.</p>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal Quản lý Vật tư nhanh */}
      <Modal
        title={
          <div className="flex items-center space-x-2 pb-2 border-b border-gray-100">
            <span className="text-lg font-bold text-gray-800">
              🛠️ Quản lý vật tư & Minibar: <span className="text-blue-600 font-extrabold">{selectedRoom?.roomNumber}</span>
            </span>
          </div>
        }
        open={isInventoryModalVisible}
        width={850}
        onCancel={() => setIsInventoryModalVisible(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setIsInventoryModalVisible(false)}>Đóng</Button>
        ]}
      >
        <div className="py-2">
          <div className="flex justify-between items-center mb-4 gap-4">
            {/* Search & Filter Controls on the left */}
            <div className="flex items-center space-x-2 flex-1 max-w-lg">
              <Input 
                placeholder="🔍 Tìm vật tư trong phòng theo tên..." 
                prefix={<SearchOutlined />} 
                value={inventorySearchText}
                onChange={(e) => setInventorySearchText(e.target.value)}
                className="flex-1 rounded-md border-gray-200"
                allowClear
              />
              <Select 
                allowClear 
                placeholder="🏷️ Lọc theo Danh mục" 
                className="w-48"
                value={inventoryCategoryFilter}
                onChange={setInventoryCategoryFilter}
              >
                {([...new Set(equipments.map(e => e.category || e.Category).filter(Boolean))]).map(c => <Option key={c} value={c}>{c}</Option>)}
              </Select>
            </div>

            {/* Action buttons on the right */}
            <Space>
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={() => setIsAddSupplyModalVisible(true)}
                className="bg-blue-600 hover:bg-blue-700 border-none font-semibold rounded-md"
              >
                Thêm vật tư
              </Button>
              <Button 
                icon={<CopyOutlined />} 
                onClick={() => setIsCloneModalVisible(true)}
                className="font-medium rounded-md"
              >
                Clone từ phòng mẫu
              </Button>
            </Space>
          </div>

          <Table 
            dataSource={currentRoomInventory.filter(item => {
              const name = (item.itemName || '').toLowerCase();
              const matchesSearch = name.includes(inventorySearchText.toLowerCase());
              
              // Find category from equipments list
              const eq = equipments.find(e => e.id === item.equipmentId);
              const category = eq ? (eq.category || eq.Category || '') : '';
              const matchesCat = inventoryCategoryFilter ? category === inventoryCategoryFilter : true;
              
              return matchesSearch && matchesCat;
            })} 
            rowKey="id"
            size="middle"
            pagination={{ pageSize: 6, showSizeChanger: false }}
            columns={[
              { 
                title: 'Tên vật tư', 
                dataIndex: 'itemName',
                className: 'font-semibold text-gray-700'
              },
              { 
                title: 'Số lượng', 
                dataIndex: 'quantity', 
                width: 130,
                render: (val, record) => {
                  const eq = equipments.find(e => e.id === record.equipmentId);
                  const stock = eq ? (eq.inStockQuantity || 0) : 0;
                  const maxAllowed = val + stock;

                  return (
                    <InputNumber 
                      min={1} 
                      max={maxAllowed}
                      defaultValue={val} 
                      className="w-24 rounded-md border-gray-200"
                      onChange={async (newVal) => {
                        if (newVal > maxAllowed) {
                          message.error(`${record.itemName} không đủ số lượng tồn kho khả dụng`);
                          return;
                        }
                        try {
                          await axiosClient.put(`/rooms/${selectedRoom.id}/inventories/${record.id}`, {
                            equipmentId: record.equipmentId,
                            quantity: newVal,
                            condition: record.status || "Tốt",
                            isMinibar: record.itemName.toLowerCase().includes("minibar"),
                            priceIfLost: record.priceIfLost
                          });
                          message.success(`Đã cập nhật ${record.itemName} thành ${newVal}`);
                          fetchRoomInventory(selectedRoom.id);
                          fetchEquipments(); // Refresh stock info
                        } catch (e) {
                          message.error(e.response?.data?.message || "Lỗi khi cập nhật số lượng.");
                        }
                      }} 
                    />
                  );
                }
              },
              { 
                title: 'Tồn kho khả dụng', 
                key: 'stock',
                width: 150,
                render: (_, record) => {
                  const eq = equipments.find(e => e.id === record.equipmentId);
                  const stock = eq ? (eq.inStockQuantity || 0) : 0;
                  return (
                    <span className={`font-semibold px-2 py-0.5 rounded text-xs ${stock > 0 ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}>
                      {stock} {record.unit}
                    </span>
                  );
                }
              },
              { title: 'ĐVT', dataIndex: 'unit', width: 80 },
              { 
                title: 'Giá đền bù', 
                dataIndex: 'priceIfLost', 
                width: 140,
                render: (val) => <span className="font-semibold text-amber-600">{val?.toLocaleString()} đ</span> 
              },
              {
                title: 'Thao tác',
                key: 'action',
                width: 100,
                align: 'center',
                render: (_, record) => (
                  <Popconfirm
                    title="Xóa vật tư"
                    description={`Bạn có chắc chắn muốn xóa ${record.itemName} khỏi phòng này không?`}
                    onConfirm={async () => {
                      try {
                        await axiosClient.delete(`/rooms/${selectedRoom.id}/inventories/${record.id}`);
                        message.success(`Đã xóa ${record.itemName} khỏi phòng.`);
                        fetchRoomInventory(selectedRoom.id);
                        fetchEquipments();
                      } catch (e) {
                        message.error(e.response?.data?.message || "Lỗi khi xóa vật tư.");
                      }
                    }}
                    okText="Xóa"
                    cancelText="Hủy"
                    okButtonProps={{ danger: true }}
                  >
                    <Button type="text" danger icon={<DeleteOutlined />} className="hover:bg-red-50 rounded-md" />
                  </Popconfirm>
                )
              }
            ]}
          />
        </div>
      </Modal>

      {/* Modal Tạo nhiều phòng */}
      <Modal
        title="Tạo nhiều phòng"
        open={isCreateMultipleVisible}
        onCancel={() => setIsCreateMultipleVisible(false)}
        onOk={() => multipleForm.submit()}
        confirmLoading={loading}
        width={600}
      >
        <Form form={multipleForm} layout="vertical" onFinish={handleCreateMultipleRooms} initialValues={{ step: 1, count: 5 }}>
          <Form.Item name="cloneRoomId" label="Phòng clone (Tùy chọn)">
            <Select allowClear showSearch placeholder="Chọn phòng mẫu để sao chép tiện ích/vật tư">
              {rooms.map(r => <Option key={r.id} value={r.id}>{r.roomNumber} - Tầng {r.floor}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="typeId" label="Hạng phòng" rules={[{ required: true, message: 'Vui lòng chọn hạng phòng' }]}>
            <Select placeholder="Chọn hạng phòng (Bắt buộc)">
              {roomTypes.map(t => <Option key={t.id} value={t.id}>{t.name}</Option>)}
            </Select>
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="startNumber" label="Số phòng bắt đầu (VD: 101)" rules={[{ required: true }]}>
                <InputNumber className="w-full" min={1} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="step" label="Bước nhảy" rules={[{ required: true }]}>
                <InputNumber className="w-full" min={1} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="count" label="Số lượng phòng cần tạo" rules={[{ required: true }]}>
                <InputNumber className="w-full" min={1} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="floor" label="Tầng" rules={[{ required: true }]}>
                <InputNumber className="w-full" min={1} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Modal chọn phòng mẫu để sao chép */}
      <Modal
        title="Sao chép từ phòng mẫu"
        open={isCloneModalVisible}
        onCancel={() => setIsCloneModalVisible(false)}
        footer={null}
      >
        <p className="mb-4 text-gray-600">
          Tính năng này sẽ tự động điền <b>Tiện ích mặc định</b> và toàn bộ <b>Vật tư/Minibar</b> từ phòng mẫu bạn chọn.
        </p>
        <ul className="space-y-2 max-h-96 overflow-y-auto">
          {rooms.length > 0 ? rooms.map(room => (
            <li key={room.id} className="flex justify-between items-center bg-gray-50 p-2 rounded border">
              <span>Phòng mẫu: <b>{room.roomNumber}</b></span>
              <Button size="small" type="primary" onClick={() => handleCloneRoom(room.id)}>Sao chép</Button>
            </li>
          )) : <p className="text-gray-500 italic">Chưa có dữ liệu phòng nào để sao chép.</p>}
        </ul>
      </Modal>

      {/* Modal Thêm Vật tư */}
      <Modal
        title="Thêm Vật tư/Minibar"
        open={isAddSupplyModalVisible}
        onCancel={() => {
          setIsAddSupplyModalVisible(false);
          setSelectedItems([]);
          setSupplySearchText('');
          setSupplyCategoryFilter(null);
        }}
        onOk={async () => {
          if (selectedItems.length === 0) {
            message.warning("Vui lòng chọn ít nhất một vật tư!");
            return;
          }
          for (const item of selectedItems) {
            const stock = item.inStockQuantity || item.InStockQuantity || 0;
            if (!item.quantity || item.quantity <= 0) {
              message.error(`Số lượng cho ${item.name || item.Name} không hợp lệ!`);
              return;
            }
            if (item.quantity > stock) {
              message.error(`Số lượng cho ${item.name || item.Name} vượt quá tồn kho khả dụng (${stock})!`);
              return;
            }
          }

          if (currentView === 'list') {
            try {
              for (const item of selectedItems) {
                await axiosClient.post(`/rooms/${selectedRoom.id}/inventories`, {
                  equipmentId: item.id,
                  quantity: item.quantity,
                  condition: "Tốt",
                  isMinibar: (item.name || item.Name || '').toLowerCase().includes("minibar"),
                  priceIfLost: item.defaultPriceIfLost || item.DefaultPriceIfLost || 0
                });
              }
              message.success(`Đã thêm thành công ${selectedItems.length} vật tư vào phòng.`);
              fetchRoomInventory(selectedRoom.id);
              fetchEquipments();
            } catch (e) {
              message.error(e.response?.data?.message || "Lỗi khi thêm vật tư vào phòng.");
              return;
            }
          } else {
            const newItems = selectedItems.map((item, idx) => ({
              id: Date.now() + idx + Math.random(),
              equipmentId: item.id,
              name: item.name || item.Name,
              code: item.itemCode || item.ItemCode || 'N/A',
              unit: item.unit || item.Unit || 'Cái',
              quantity: item.quantity,
              penaltyPrice: item.defaultPriceIfLost || item.DefaultPriceIfLost || 0
            }));
            setInventoryData(prev => [...prev, ...newItems]);
            message.success(`Đã chọn ${newItems.length} vật tư.`);
          }
          
          setIsAddSupplyModalVisible(false);
          setSelectedItems([]);
          setSupplySearchText('');
          setSupplyCategoryFilter(null);
        }}
        width={800}
      >
        <div className="flex space-x-2 mb-4">
          <Input 
            placeholder="Tìm theo tên, mã sản phẩm..." 
            prefix={<SearchOutlined />} 
            value={supplySearchText}
            onChange={(e) => setSupplySearchText(e.target.value)}
            style={{ flex: 1 }}
          />
          <Select 
            allowClear 
            placeholder="Lọc theo Danh mục" 
            style={{ width: 220 }}
            value={supplyCategoryFilter}
            onChange={setSupplyCategoryFilter}
          >
            {([...new Set(equipments.map(e => e.category || e.Category).filter(Boolean))]).map(c => <Option key={c} value={c}>{c}</Option>)}
          </Select>
        </div>

        <Table 
          size="small"
          dataSource={equipments.filter(e => {
              const name = (e.name || e.Name || '').toLowerCase();
              const code = (e.itemCode || e.ItemCode || '').toLowerCase();
              const cat = e.category || e.Category || '';
              const search = supplySearchText.toLowerCase();
              const matchesSearch = name.includes(search) || code.includes(search);
              const matchesCat = supplyCategoryFilter ? cat === supplyCategoryFilter : true;
              return matchesSearch && matchesCat;
          })}
          columns={[
            { title: 'Mã SP', dataIndex: 'itemCode', render: (_, r) => r.itemCode || r.ItemCode },
            { title: 'Tên vật tư', dataIndex: 'name', render: (_, r) => r.name || r.Name },
            { title: 'Danh mục', dataIndex: 'category', render: (_, r) => r.category || r.Category },
            { title: 'Tồn kho', render: (_, r) => r.inStockQuantity || r.InStockQuantity || 0 },
            { 
               title: 'Thao tác', 
               render: (_, record) => {
                 const stock = record.inStockQuantity || record.InStockQuantity || 0;
                 const isSelected = selectedItems.some(si => si.id === (record.id || record.Id));
                 return (
                   <Button 
                     type={isSelected ? "default" : "primary"} 
                     size="small" 
                     danger={isSelected}
                     disabled={!isSelected && stock <= 0}
                     onClick={() => {
                       if (isSelected) {
                         setSelectedItems(prev => prev.filter(si => si.id !== (record.id || record.Id)));
                       } else {
                         const eq = equipments.find(e => (e.id || e.Id) === (record.id || record.Id));
                         setSelectedItems(prev => [...prev, {
                           ...eq,
                           id: eq.id || eq.Id,
                           name: eq.name || eq.Name,
                           itemCode: eq.itemCode || eq.ItemCode,
                           unit: eq.unit || eq.Unit,
                           quantity: 1,
                           defaultPriceIfLost: eq.defaultPriceIfLost || eq.DefaultPriceIfLost || 0
                         }]);
                       }
                     }}
                   >
                     {isSelected ? "Hủy" : "Chọn"}
                   </Button>
                 );
               }
            }
          ]}
          pagination={{ pageSize: 5 }}
          rowKey={(r) => r.id || r.Id}
          className="mb-4"
        />

        {selectedItems.length > 0 && (
          <div className="p-4 border rounded bg-blue-50 mb-4">
            <p className="font-semibold text-blue-800 mb-3">Vật tư đã chọn ({selectedItems.length}):</p>
            <div className="space-y-4 max-h-60 overflow-y-auto pr-1">
              {selectedItems.map((item, index) => {
                const stock = item.inStockQuantity || item.InStockQuantity || 0;
                return (
                  <Row gutter={16} key={item.id} align="middle" className="pb-3 border-b border-blue-100 last:border-b-0 last:pb-0 last:mb-0">
                    <Col span={8}>
                      <div className="font-medium text-gray-800">{item.name || item.Name}</div>
                      <div className="text-xs text-gray-500">Mã: {item.itemCode || item.ItemCode} | Tồn kho: {stock}</div>
                    </Col>
                    <Col span={4}>
                      <div className="text-xs text-gray-500 mb-1">ĐVT</div>
                      <Input value={item.unit || item.Unit} disabled size="small" />
                    </Col>
                    <Col span={5}>
                      <div className="text-xs text-gray-500 mb-1">Số lượng</div>
                      <InputNumber 
                        min={1} 
                        max={stock}
                        value={item.quantity} 
                        className="w-full"
                        size="small"
                        onChange={(val) => {
                          setSelectedItems(prev => prev.map(si => si.id === item.id ? { ...si, quantity: val } : si));
                        }}
                      />
                    </Col>
                    <Col span={5}>
                      <div className="text-xs text-gray-500 mb-1">Giá đền bù (VNĐ)</div>
                      <InputNumber 
                        disabled 
                        min={0} 
                        value={item.defaultPriceIfLost || item.DefaultPriceIfLost || 0}
                        className="w-full" 
                        size="small"
                        formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} 
                        parser={value => value.replace(/\$\s?|(,*)/g, '')} 
                      />
                    </Col>
                    <Col span={2} className="text-right">
                      <Button 
                        type="text" 
                        danger 
                        size="small"
                        icon={<DeleteOutlined />} 
                        style={{ marginTop: 16 }}
                        onClick={() => {
                          setSelectedItems(prev => prev.filter(si => si.id !== item.id));
                        }}
                      />
                    </Col>
                  </Row>
                );
              })}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}