import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Modal, message, Tree, Form, Input, Row, Col, Tooltip } from 'antd';
import { PlusOutlined, SafetyOutlined, SaveOutlined } from '@ant-design/icons';
import roleApi from '../../api/roleApi'; 

const RoleManagement = () => {
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState([]);
  
  // State cho Modal Sửa/Phân quyền
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm] = Form.useForm();
  const [editingRole, setEditingRole] = useState(null);
  const [checkedPermissionKeys, setCheckedPermissionKeys] = useState([]);
  const [permissionTreeData, setPermissionTreeData] = useState([]);


  // 1. TẢI DỮ LIỆU TỪ BACKEND
  const fetchRolesData = async () => {
    setLoading(true);
    try {
      const response = await roleApi.getAllRoles();
      setRoles(response.data?.data || response.data);
    } catch (error) {
      message.error('Lỗi khi tải danh sách Chức vụ!');
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupedPermissions = async () => {
    try {
      const response = await roleApi.getGroupedPermissions();
      setPermissionTreeData(response.data?.data || response.data);
    } catch (error) {
      message.error('Lỗi khi tải cấu hình cây quyền hạn!');
    }
  };

  useEffect(() => {
    fetchRolesData();
    fetchGroupedPermissions();
  }, []);

  // 2. XỬ LÝ MỞ MODAL SỬA/PHÂN QUYỀN
  const handleOpenEditModal = (role) => {
    setEditingRole(role);
    editForm.setFieldsValue({
      name: role.name,
      description: role.description,
    });
    setCheckedPermissionKeys(role.permissionCodes || []);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingRole(null);
    editForm.resetFields();
    setCheckedPermissionKeys([]);
  };

  // 3. LƯU CẬP NHẬT PHÂN QUYỀN
  // 3. LƯU CẬP NHẬT PHÂN QUYỀN
  const handleSubmitPermissions = async (values) => {
    try {
      message.loading({ content: 'Đang lưu cập nhật...', key: 'save_permissions' });
      
      const payload = {
        description: values.description,
        status: true,
        permissionCodes: checkedPermissionKeys.filter(key => typeof key === 'string' && !key.startsWith('g'))
      };

      await roleApi.updateRolePermissions(editingRole.id, payload);
      
      message.success({ content: `Đã cập nhật quyền hạn cho vai trò "${editingRole.name}" thành công!`, key: 'save_permissions' });
      handleCloseEditModal();
      fetchRolesData(); 
    } catch (error) {
      // Ép log lỗi ra Console để xem chi tiết
      console.error("LỖI 400 TỪ BACKEND:", error.response?.data);
      
      // Lấy câu thông báo lỗi chính xác từ C# trả về
      const errorMsg = error.response?.data?.message 
                    || error.response?.data?.title 
                    || 'Lỗi khi lưu cập nhật phân quyền!';
                    
      message.error({ content: `Lỗi: ${errorMsg}`, key: 'save_permissions' });
    }
  };

  // 5. CẤU HÌNH CỘT 
  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60, align: 'center' },
    { title: 'Tên Role (Name)', dataIndex: 'name', key: 'name', fontWeight: 'bold' },
    { title: 'Mô tả (Description)', dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: 'Thao Tác', key: 'action', align: 'center', width: 160,
      render: (_, record) => {
        // 👉 KIỂM TRA XEM CÓ PHẢI GUEST HOẶC ADMIN KHÔNG
        const isGuest = record.name === 'Guest'; 
        const isAdmin = record.name === 'Admin' || record.id === 1; // Khóa luôn Admin
        const isDisabled = isGuest || isAdmin;
        
        // Tùy chỉnh câu thông báo khi di chuột vào nút bị khóa
        let tooltipText = 'Chỉnh sửa phân quyền';
        if (isAdmin) tooltipText = 'Admin tối cao có toàn quyền (Không thể sửa)';
        if (isGuest) tooltipText = 'Khách hàng không có quyền quản trị';

        return (
          <Tooltip title={tooltipText}>
            <Button 
              type={isDisabled ? 'default' : 'primary'} 
              icon={<SafetyOutlined />} 
              size="small" 
              disabled={isDisabled} // Nút sẽ bị mờ đi nếu là Admin hoặc Guest
              onClick={() => handleOpenEditModal(record)}
            >
              Phân quyền
            </Button>
          </Tooltip>
        );
      },
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Card 
        title="DANH SÁCH CHỨC VỤ & PHÂN QUYỀN (RBAC)" 
      >
        <Table columns={columns} dataSource={roles} rowKey="id" loading={loading} bordered pagination={false} size="middle" />
      </Card>

      {/* MODAL SỬA THÔNG TIN & PHÂN QUYỀN */}
      <Modal 
        title={`CHỈNH SỬA PHÂN QUYỀN: ${editingRole?.name || ''}`} 
        open={isEditModalOpen} 
        onCancel={handleCloseEditModal} 
        footer={null}
        width={750} 
      >
        <Form form={editForm} layout="vertical" onFinish={handleSubmitPermissions}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="Tên Role (Name)" rules={[{ required: true }]}>
                <Input disabled /> 
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="description" label="Mô tả chức vụ">
                <Input placeholder="Nhập mô tả..." />
              </Form.Item>
            </Col>
          </Row>

          <Card 
            title="GÁN QUYỀN HẠN CỤ THỂ (PERMISSIONS)" 
            size="small" 
            style={{ marginBottom: '20px', borderColor: '#d9d9d9' }} 
            styles={{ header: { backgroundColor: '#fafafa' } }}
          >
            <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '10px' }}>
              <Tree
                checkable
                checkStrictly 
                defaultExpandAll 
                onCheck={(checkedKeysValue) => setCheckedPermissionKeys(checkedKeysValue.checked)}
                checkedKeys={checkedPermissionKeys}
                treeData={permissionTreeData} 
                style={{ fontSize: '15px' }}
              />
            </div>
          </Card>

          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Button onClick={handleCloseEditModal} style={{ marginRight: 8 }}>Hủy</Button>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>Lưu thay đổi</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RoleManagement;