import React, { useState, useEffect } from 'react';
import { Table, Select, DatePicker, Button, Typography, Space, Tag, Spin, Popconfirm } from 'antd';
import { DownloadOutlined, ReloadOutlined, FilterOutlined, UserOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { message } from 'antd';
import auditLogApi from '../../api/auditLogApi';
import userApi from '../../api/userApi';
import roleApi from '../../api/roleApi';
import { useAuthStore } from '../../store/authStore';



const { Title, Text } = Typography;
const { Option } = Select;

const actionColors = {
  CREATE: 'blue',
  UPDATE: 'orange',
  DELETE: 'red',
  ADDED: 'green',
};

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [purging, setPurging] = useState(false);
  const currentUser = useAuthStore((state) => state.user);
  const isAdmin = currentUser?.roleName === 'Admin';

  const [filters, setFilters] = useState({
    userId: null,
    roleName: null,
    day: null,
    month: dayjs().month() + 1,
    year: dayjs().year(),
  });


  useEffect(() => {
    fetchEmployees();
    fetchRoles();
  }, []);


  useEffect(() => {
    fetchLogs();
  }, [filters.userId, filters.roleName, filters.day, filters.month, filters.year]);


  const fetchEmployees = async () => {
    try {
      const res = await userApi.getAll();
      if (res.data?.data) {
        setEmployees(res.data.data);
      }
    } catch (error) {
      console.error('Failed to load employees', error);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await roleApi.getAllRoles();
      if (res.data?.data) {
        setRoles(res.data.data);
      }
    } catch (error) {
      console.error('Failed to load roles', error);
    }
  };


  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = {
        userId: filters.userId || undefined,
        roleName: filters.roleName || undefined,
        day: filters.day || undefined,
        month: filters.month || undefined,
        year: filters.year || undefined,
      };
      const res = await auditLogApi.getAuditLogs(params);
      setLogs(res.data?.data || []);
    } catch (error) {
      message.error('Không thể tải nhật ký hoạt động.');
    } finally {
      setLoading(false);
    }
  };

  const handlePurge = async () => {
    setPurging(true);
    try {
      const res = await auditLogApi.purgeOldLogs();
      message.success(res.data?.message || 'Đã xóa log cũ thành công.');
      fetchLogs(); // refresh danh sách sau khi xóa
    } catch (error) {
      message.error(error.response?.data?.message || 'Xóa log cũ thất bại.');
    } finally {
      setPurging(false);
    }
  };


  const handleExport = async (type) => {
    try {
      message.loading({ content: 'Đang chuẩn bị file xuất...', key: 'exporting' });
      const params =
        type === 'all'
          ? {}
          : {
              userId: filters.userId || undefined,
              roleName: filters.roleName || undefined,
              day: filters.day || undefined,
              month: filters.month || undefined,
              year: filters.year || undefined,
            };


      const res = await auditLogApi.exportToExcel(params);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `AuditLogs_${type}_${dayjs().format('YYYYMMDD')}.xlsx`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      message.success({ content: 'Xuất Excel thành công!', key: 'exporting' });
    } catch {
      message.error({
        content: 'Có lỗi xảy ra khi xuất file hoặc bạn không có quyền!',
        key: 'exporting',
      });
    }
  };

  // ---- Columns cho bảng chính ----
  const columns = [
    {
      title: 'Ngày',
      dataIndex: 'date',
      key: 'date',
      render: (text) => dayjs(text).format('DD/MM/YYYY'),
      width: '13%',
    },
    {
      title: 'Nhân viên',
      key: 'employee',
      width: '22%',
      render: (_, record) => (
        <Space>
          <UserOutlined style={{ color: '#555' }} />
          <Text strong>{record.employeeName}</Text>
          <Tag color="geekblue">{record.roleName || 'System'}</Tag>
        </Space>
      ),
    },
    {
      title: 'Tóm tắt hoạt động',
      dataIndex: 'summary',
      key: 'summary',
      render: (text) => (
        <Text type="secondary">{text || 'Không có hoạt động nổi bật'}</Text>
      ),
    },
  ];

  // ---- Expanded row: chi tiết sự kiện ----
  const expandedRowRender = (record) => {
    const subColumns = [
      {
        title: 'Giờ',
        dataIndex: 'timestamp',
        key: 'timestamp',
        render: (text) => dayjs(text).format('HH:mm:ss'),
        width: '10%',
      },
      {
        title: 'Hành động',
        dataIndex: 'actionType',
        key: 'actionType',
        render: (text) => (
          <Tag color={actionColors[text] || 'default'}>{text}</Tag>
        ),
        width: '14%',
      },
      {
        title: 'Đối tượng',
        dataIndex: 'entityType',
        key: 'entityType',
        width: '16%',
      },
      {
        title: 'Nội dung',
        dataIndex: 'message',
        key: 'message',
      },
    ];

    return (
      <Table
        columns={subColumns}
        dataSource={record.events}
        pagination={false}
        size="small"
        rowKey="eventId"
        style={{ margin: '10px 0' }}
      />
    );
  };

  return (
    <div
      style={{
        padding: 24,
        background: '#fff',
        borderRadius: 8,
        minHeight: 'calc(100vh - 112px)',
      }}
    >
      {/* HEADER */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <Title level={3} style={{ margin: 0 }}>
          <ReloadOutlined
            style={{ marginRight: 8, fontSize: 22, color: '#1890ff' }}
            spin={loading}
            onClick={fetchLogs}
          />
          Nhật ký hoạt động
        </Title>
        <Space>
          <Button
            icon={<FilterOutlined />}
            onClick={() => handleExport('filtered')}
          >
            Xuất theo bộ lọc
          </Button>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={() => handleExport('all')}
          >
            Xuất toàn bộ (Server)
          </Button>
          {isAdmin && (
            <Popconfirm
              title="Xóa log cũ"
              description="Sẽ xóa vĩnh viễn tất cả audit log cũ hơn 3 tháng. Tiếp tục?"
              onConfirm={handlePurge}
              okText="Xóa ngay"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Button
                danger
                icon={<DeleteOutlined />}
                loading={purging}
              >
                Dọn log cũ
              </Button>
            </Popconfirm>
          )}
        </Space>

      </div>

      {/* FILTER BAR — khớp với UI trong ảnh */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          marginBottom: 20,
          flexWrap: 'wrap',
        }}
      >
        {/* Lọc theo nhân viên (theo ảnh) */}
        <Select
          allowClear
          showSearch
          placeholder="Lọc theo nhân viên"
          style={{ width: 200 }}
          value={filters.userId}
          onChange={(val) => setFilters({ ...filters, userId: val ?? null })}
          optionFilterProp="children"
          filterOption={(input, option) =>
            (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
          }
        >
          {employees.map((u) => (
            <Option key={u.id} value={u.id}>
              {u.fullName}
            </Option>
          ))}
        </Select>

        {/* Lọc theo vai trò (Role) */}
        <Select
          allowClear
          placeholder="Lọc theo vai trò"
          style={{ width: 180 }}
          value={filters.roleName}
          onChange={(val) => setFilters({ ...filters, roleName: val ?? null })}
        >
          {roles.map((r) => (
            <Option key={r.id} value={r.name}>
              {r.name}
            </Option>
          ))}
        </Select>

        {/* Lọc theo ngày cụ thể */}
        <DatePicker
          placeholder="Lọc theo ngày"
          format="DD/MM/YYYY"
          onChange={(date) => {
            setFilters({
              ...filters,
              day: date ? date.date() : null,
              month: date ? date.month() + 1 : filters.month,
              year: date ? date.year() : filters.year,
            });
          }}
        />

        {/* Lọc theo tháng */}
        <Select
          placeholder="Chọn tháng"
          value={filters.month}
          onChange={(val) => setFilters({ ...filters, month: val ?? null, day: null })}
          allowClear
          style={{ width: 120 }}
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <Option key={m} value={m}>
              Tháng {m}
            </Option>
          ))}
        </Select>

        {/* Lọc theo năm */}
        <Select
          placeholder="Chọn năm"
          value={filters.year}
          onChange={(val) => setFilters({ ...filters, year: val ?? null })}
          allowClear
          style={{ width: 110 }}
        >
          {[2024, 2025, 2026, 2027, 2028].map((y) => (
            <Option key={y} value={y}>
              {y}
            </Option>
          ))}
        </Select>
      </div>

      {/* TABLE */}
      <Table
        className="components-table-demo-nested"
        columns={columns}
        expandable={{
          expandedRowRender,
          rowExpandable: (record) => record.events && record.events.length > 0,
        }}
        dataSource={logs}
        rowKey="id"
        loading={loading}
        locale={{ emptyText: 'Không có nhật ký hoạt động nào.' }}
      />
    </div>
  );
};

export default AuditLogs;
