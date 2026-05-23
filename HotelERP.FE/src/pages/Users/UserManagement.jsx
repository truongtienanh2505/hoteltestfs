import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Card, message, Input, Select, Form, Switch, Tooltip, Row, Col, Modal, Tree } from 'antd';
import { PlusOutlined, EyeOutlined, SearchOutlined, ClearOutlined, CheckCircleOutlined, SafetyOutlined, KeyOutlined } from '@ant-design/icons';
import userApi from '../../api/userApi';
import roleApi from '../../api/roleApi';

const { Option } = Select;

const UserManagement = () => {
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [roles, setRoles] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [searchForm] = Form.useForm(); 

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm] = Form.useForm();
  
  const [isViewRoleOpen, setIsViewRoleOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  // 👉 State mới để lưu danh sách quyền thực tế lấy từ API
  const [selectedUserPermissions, setSelectedUserPermissions] = useState([]);

  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [selectedUserForRole, setSelectedUserForRole] = useState(null);
  const [newRoleId, setNewRoleId] = useState(null);
  const [auditReason, setAuditReason] = useState("");

  // STATE CHO PHÂN QUYỀN CÁ NHÂN (USER-LEVEL OVERRIDES)
  const [isPersonalRoleModalOpen, setIsPersonalRoleModalOpen] = useState(false);
  const [selectedPersonalUser, setSelectedPersonalUser] = useState(null);
  const [personalCheckedKeys, setPersonalCheckedKeys] = useState([]);
  const [permissionTreeData, setPermissionTreeData] = useState([]);

  // 1. TẢI DỮ LIỆU TỪ DATABASE
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await userApi.getAll();
      const data = res.data?.data || res.data;
      setAllUsers(data);
      setFilteredUsers(data); 
    } catch (error) {
      message.error("Không thể tải danh sách nhân sự!");
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await userApi.getRoles();
      setRoles(response.data.data || []);
    } catch (err) {
      console.error("Lỗi khi fetch Roles:", err);
      message.error(err.response?.data?.message || "Lỗi khi lấy danh sách chức vụ");
    }
  };

  const fetchGroupedPermissions = async () => {
    try {
      const response = await roleApi.getGroupedPermissions();
      setPermissionTreeData(response.data?.data || response.data);
    } catch (error) {}
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles(); 
    fetchGroupedPermissions(); 
  }, []);

  // 2. LỌC DỮ LIỆU
  const handleSearch = (values) => {
    let result = [...allUsers];
    if (values.keyword) {
      const kw = values.keyword.toLowerCase();
      result = result.filter(u => 
        (u.fullName && u.fullName.toLowerCase().includes(kw)) ||
        (u.email && u.email.toLowerCase().includes(kw)) ||
        (u.phone && u.phone.toLowerCase().includes(kw))
      );
    }
    if (values.roleName) {
      result = result.filter(u => u.roleName === values.roleName);
    }
    if (values.status !== undefined) {
      result = result.filter(u => u.status === values.status);
    }
    setFilteredUsers(result);
  };

  const handleReset = () => {
    searchForm.resetFields();
    setFilteredUsers(allUsers);
  };

  // 3. KHÓA TÀI KHOẢN
  const handleToggleStatus = async (user, checked) => {
    try {
      const payload = {
        fullName: user.fullName || user.FullName,
        phone: user.phone || user.Phone || "",
        status: checked 
      };
      const targetId = user.id || user.Id;
      await userApi.update(targetId, payload); 
      message.success(checked ? 'Đã kích hoạt tài khoản!' : 'Đã khóa tài khoản!');
      fetchUsers(); 
    } catch (err) {
      console.error("Lỗi Toggle Status:", err);
      message.error(`Lỗi cập nhật: ${err.response?.data?.message || err.message}`);
    }
  };

  // 4. THÊM NHÂN VIÊN
  const handleAddSubmit = async (values) => {
    try {
      message.loading({ content: 'Đang lưu vào Database...', key: 'add_user' });
      const payload = {
        fullName: values.fullName,
        email: values.email,
        password: values.password,
        phone: values.phone || "",
        roleId: Number(values.roleId) 
      };
      await userApi.create(payload); 
      message.success({ content: 'Tạo tài khoản thành công!', key: 'add_user' });
      setIsAddModalOpen(false); 
      addForm.resetFields();    
      fetchUsers(); 
    } catch (error) {
      let errorMsg = 'Có lỗi xảy ra khi tạo tài khoản!';
      if (error.response && error.response.data) {
        const data = error.response.data;
        if (data.code === "VALIDATION_ERROR" && data.details) {
            errorMsg = data.details.map(err => `${err.field}: ${err.errors.join(', ')}`).join(' | ');
        } else if (data.message) {
            errorMsg = data.message;
        }
      }
      message.error({ content: errorMsg, key: 'add_user', duration: 5 });
    }
  };

  // 5. PHÂN VAI TRÒ
  const handleOpenRoleModal = (user) => {
    setSelectedUserForRole(user);
    setNewRoleId(user.roleId || user.RoleId); 
    setAuditReason(""); // 👉 Reset lại ô nhập lý do mỗi khi mở Modal
    setIsRoleModalOpen(true);
  };

  // 6. XEM CHI TIẾT QUYỀN HẠN (ĐÃ FIX REAL-TIME)
  const handleViewPermissions = async (user) => {
    setSelectedUser(user);
    setSelectedUserPermissions([]); // Reset data cũ
    setIsViewRoleOpen(true); // Mở modal lên cho mượt
    
    try {
      const targetId = user.id || user.Id;
      // Dùng lại đúng cái API bạn đã code sẵn
      const res = await userApi.getUserPermissions(targetId); 
      setSelectedUserPermissions(res.data?.data || res.data || []);
    } catch (error) {
      message.error("Lỗi khi tải chi tiết quyền!");
    }
  };

// HÀM LƯU CẬP NHẬT VAI TRÒ CHO NHÂN SỰ
  const handleSaveRole = async () => {
    // 👉 Validate chặn lại nếu Admin quên nhập lý do
    if (!auditReason || auditReason.trim() === "") {
      message.warning("Vui lòng nhập lý do thay đổi quyền để hệ thống ghi log bảo mật!");
      return; 
    }

    try {
      const targetId = selectedUserForRole.id || selectedUserForRole.Id; 
      
      // 👉 Ép kiểu số và truyền thêm lý do (auditReason) vào hàm API
      await userApi.changeRole(targetId, Number(newRoleId), auditReason); 
        
      message.success(`Đã cập nhật vai trò cho ${selectedUserForRole.fullName}`); 
      setIsRoleModalOpen(false); 
      fetchUsers(); 
    } catch (error) {
      // 👉 IN LỖI RA CONSOLE ĐỂ SAU NÀY DỄ DEBUG
      console.error("Lỗi chi tiết từ API Đổi quyền:", error.response?.data || error);
      
      const serverMsg = error.response?.data?.message || "Vui lòng kiểm tra lại dữ liệu.";
      message.error(`Đổi vai trò thất bại! ${serverMsg}`);
    }
  };

  // 6. PHÂN QUYỀN CÁ NHÂN (NGOẠI LỆ)
  const handleOpenPersonalRoleModal = async (user) => {
    setSelectedPersonalUser(user);
    setIsPersonalRoleModalOpen(true);
    try {
      const targetId = user.id || user.Id;
      const res = await userApi.getUserPermissions(targetId);
      setPersonalCheckedKeys(res.data?.data || []);
    } catch (error) {
      message.error("Lỗi khi tải quyền cá nhân!");
    }
  };

  const handleSavePersonalPermissions = async () => {
    try {
      const targetId = selectedPersonalUser.id || selectedPersonalUser.Id;
      const payload = personalCheckedKeys.filter(key => typeof key === 'string' && !key.startsWith('g'));
      await userApi.updateUserPermissions(targetId, payload);
      message.success(`Đã cập nhật đặc quyền riêng cho ${selectedPersonalUser.fullName || selectedPersonalUser.FullName}`);
      setIsPersonalRoleModalOpen(false);
    } catch (error) {
      message.error("Cập nhật quyền thất bại!");
    }
  };

  // 7. CẤU HÌNH CỘT
 const columns = [
  { title: 'Họ và tên', dataIndex: 'fullName', key: 'fullName', fontWeight: 'bold' },
  { title: 'Email', dataIndex: 'email', key: 'email' },
  { 
    title: 'Số điện thoại', 
    dataIndex: 'phone', 
    key: 'phone',
    render: (phone) => phone ? phone : <span style={{color: '#ccc', fontStyle: 'italic'}}>Chưa cập nhật</span>
  },
  {
    title: 'Vai trò', dataIndex: 'roleName', key: 'roleName',
    render: (role) => {
      let color = 'default';
      if (role === 'Admin') color = 'red';
      else if (role === 'Manager') color = 'green';
      else if (role === 'Receptionist') color = 'orange';
      return <Tag color={color}>{role || 'Chưa phân quyền'}</Tag>;
    },
  },
  {
    title: 'Trạng thái', dataIndex: 'status', key: 'status', align: 'center',
    render: (status, record) => {
      // 👉 KHÓA ADMIN: Nếu là Admin thì không cho gạt nút trạng thái
      const isTargetAdmin = record.roleName === 'Admin';
      return (
        <Switch
          checked={status}
          disabled={isTargetAdmin} 
          checkedChildren="Hoạt động" unCheckedChildren="Đã khóa"
          style={{ backgroundColor: status ? '#52c41a' : '#ff4d4f' }}
          onChange={(checked) => handleToggleStatus(record, checked)}
        />
      );
    },
  },
  {
    title: 'Hành động', key: 'action', align: 'center',
    render: (_, record) => {
      // 👉 KHÓA ADMIN: Nếu dòng này là Admin thì vô hiệu hóa các nút chỉnh sửa
      const isTargetAdmin = record.roleName === 'Admin';
      
      return (
        <Space size="middle">
          <Tooltip title="Xem chi tiết quyền hạn">
            <Button type="default" icon={<EyeOutlined />} size="small" 
              onClick={() => handleViewPermissions(record)}
            />
          </Tooltip>

          <Tooltip title={isTargetAdmin ? "Không thể chỉnh sửa Admin" : "Phân vai trò (Quyền hạn)"}>
            <Button 
              type="primary" ghost icon={<SafetyOutlined />} size="small" 
              disabled={isTargetAdmin} // Vô hiệu hóa nút Phân vai trò
              onClick={() => handleOpenRoleModal(record)} 
            />
          </Tooltip>

          <Tooltip title={isTargetAdmin ? "Không thể chỉnh sửa Admin" : "Chỉnh sửa ngoại lệ (Quyền riêng)"}>
            <Button 
              type="primary" 
              style={{backgroundColor: isTargetAdmin ? '#f5f5f5' : '#faad14', borderColor: isTargetAdmin ? '#d9d9d9' : '#faad14'}} 
              icon={<KeyOutlined />} size="small" 
              disabled={isTargetAdmin} // Vô hiệu hóa nút Ngoại lệ
              onClick={() => handleOpenPersonalRoleModal(record)} 
            />
          </Tooltip>
        </Space>
      );
    },
  },
];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Card>
        <Form form={searchForm} onFinish={handleSearch} layout="vertical">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="keyword" label="Tìm kiếm (Tên, Email, SĐT)">
                <Input placeholder="Nhập từ khóa..." prefix={<SearchOutlined />} allowClear />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="roleName" label="Vai trò">
                <Select placeholder="Tất cả vai trò" allowClear>
                  <Option value="Admin">Admin</Option>
                  <Option value="Manager">Manager</Option>
                  <Option value="Receptionist">Receptionist</Option>
                  <Option value="Accountant">Accountant</Option>
                  <Option value="Housekeeping">Housekeeping</Option>
                  <Option value="Security">Security</Option>
                  <Option value="Chef">Chef</Option>
                  <Option value="Waiter">Waiter</Option>
                  <Option value="IT Support">IT Support</Option>
                  <Option value="Guest">Guest</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="status" label="Trạng thái">
                <Select placeholder="Tất cả trạng thái" allowClear>
                  <Option value={true}>Hoạt động</Option>
                  <Option value={false}>Ngừng hoạt động</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={4} style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '24px' }}>
              <Space>
                <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>Lọc</Button>
                <Button onClick={handleReset} icon={<ClearOutlined />}>Xóa lọc</Button>
              </Space>
            </Col>
          </Row>
        </Form>
      </Card>

      <Card title="DANH SÁCH NHÂN SỰ" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setIsAddModalOpen(true)}>Thêm nhân viên</Button>}>
        <Table columns={columns} dataSource={filteredUsers} rowKey={(record) => record.id || record.Id} loading={loading} bordered pagination={{ pageSize: 10 }} />
      </Card>

      {/* MODAL THÊM NHÂN VIÊN */}
      <Modal title="THÊM NHÂN VIÊN MỚI" open={isAddModalOpen} onCancel={() => { setIsAddModalOpen(false); addForm.resetFields(); }} footer={null}>
        <Form form={addForm} layout="vertical" onFinish={handleAddSubmit}>
          <Form.Item name="fullName" label="Họ và tên" rules={[{ required: true, message: 'Vui lòng nhập họ tên!' }]}>
            <Input placeholder="Nhập họ và tên..." />
          </Form.Item>
          <Form.Item name="email" label="Email đăng nhập" rules={[{ required: true, type: 'email', message: 'Vui lòng nhập email hợp lệ!' }]}>
            <Input placeholder="Nhập địa chỉ email..." />
          </Form.Item>
          <Form.Item name="password" label="Mật khẩu" rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}>
            <Input.Password placeholder="Nhập mật khẩu..." />
          </Form.Item>
          <Form.Item name="phone" label="Số điện thoại (SĐT)">
            <Input placeholder="Nhập số điện thoại..." />
          </Form.Item>
          <Form.Item name="roleId" label="Phân quyền (Vai trò)" rules={[{ required: true, message: 'Vui lòng chọn vai trò!' }]}>
            <Select placeholder="Chọn vai trò cho nhân viên">
              {roles.length > 0 ? (
                roles.map(r => <Option key={r.id} value={r.id}>{r.name}</Option>)
              ) : (
                <>
                  <Option value={1}>Admin</Option>
                  <Option value={2}>Manager</Option>
                </>
              )}
            </Select>
          </Form.Item>
          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => { setIsAddModalOpen(false); addForm.resetFields(); }}>Hủy</Button>
              <Button type="primary" htmlType="submit">Lưu vào Database</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* MODAL XEM CHI TIẾT QUYỀN HẠN (ĐÃ FIX REAL-TIME) */}
      <Modal 
        title={`DANH SÁCH QUYỀN HẠN: ${selectedUser?.fullName || selectedUser?.FullName || 'CHƯA CÓ'}`} 
        open={isViewRoleOpen} 
        onCancel={() => setIsViewRoleOpen(false)} 
        footer={[<Button key="close" type="primary" onClick={() => setIsViewRoleOpen(false)}>Đóng</Button>]}
      >
        <div style={{ fontSize: '15px', lineHeight: '2.5', padding: '10px 0' }}>
          {selectedUserPermissions.length > 0 ? (
             selectedUserPermissions.map(perm => (
               <div key={perm}>
                 <CheckCircleOutlined style={{color: '#52c41a', marginRight: '8px'}}/> {perm}
               </div>
             ))
          ) : (
            <div style={{ color: 'red' }}>Người dùng này hiện chưa được gán quyền hạn nào.</div>
          )}
        </div>
      </Modal>

      {/* MODAL PHÂN VAI TRÒ */}
      <Modal
        title={<span><SafetyOutlined style={{ color: '#1890ff', marginRight: '8px' }} /> Phân Vai Trò Nhân Sự</span>}
        open={isRoleModalOpen}
        onOk={handleSaveRole}
        onCancel={() => setIsRoleModalOpen(false)}
        okText="Xác nhận"
        cancelText="Hủy"
      >
        <div style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <p style={{ marginBottom: '8px' }}>Chọn vai trò mới cho nhân viên <b>{selectedUserForRole?.fullName || selectedUserForRole?.FullName}</b>:</p>
            <Select
              style={{ width: '100%' }}
              value={newRoleId}
              onChange={(value) => setNewRoleId(value)}
              options={roles.map(r => ({ value: r.id, label: r.name }))}
              placeholder="-- Vui lòng chọn vai trò --"
              disabled={roles.length === 0}
            />
          </div>

          {/* 👉 Ô NHẬP LÝ DO BẢO MẬT */}
          <div>
            <p style={{ marginBottom: '8px', color: '#cf1322' }}>Lý do thay đổi (Bắt buộc):</p>
            <Input.TextArea
              rows={3}
              placeholder="Nhập lý do để ghi log... (Ví dụ: Thăng chức theo quyết định số 123...)"
              value={auditReason}
              onChange={(e) => setAuditReason(e.target.value)}
            />
          </div>
        </div>
      </Modal>

      {/* MODAL PHÂN QUYỀN RIÊNG */}
      <Modal
        title={<span><KeyOutlined style={{ color: '#faad14', marginRight: '8px' }} /> Phân Quyền Riêng (Ngoại Lệ): {selectedPersonalUser?.fullName || selectedPersonalUser?.FullName}</span>}
        open={isPersonalRoleModalOpen}
        onOk={handleSavePersonalPermissions}
        onCancel={() => setIsPersonalRoleModalOpen(false)}
        okText="Lưu ngoại lệ"
        cancelText="Hủy"
        width={600}
      >
        <p style={{ color: '#8c8c8c', marginBottom: '20px' }}>
          Bỏ tick để <b>Tước quyền</b> hiện có của Chức vụ. Tick thêm để <b>Cấp đặc quyền</b> ngoài Chức vụ.
        </p>
        <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '10px', border: '1px solid #d9d9d9', borderRadius: '8px' }}>
          <Tree
            checkable checkStrictly defaultExpandAll 
            onCheck={(checkedKeysValue) => setPersonalCheckedKeys(checkedKeysValue.checked)}
            checkedKeys={personalCheckedKeys}
            treeData={permissionTreeData} 
          />
        </div>  
      </Modal>
    </div>
  );
};

export default UserManagement;