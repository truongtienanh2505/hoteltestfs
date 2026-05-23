import React, { useEffect, useState } from 'react';
import { Modal, Table, Tag, Spin, Empty, Typography, Statistic, Row, Col, Card } from 'antd';
import { equipmentApi } from '../../../api/equipmentApi';

const { Title, Text } = Typography;

const SupplierLogsModal = ({ open, onCancel, equipment }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (open && equipment?.id) {
      setLoading(true);
      equipmentApi.getSupplierLogs(equipment.id)
        .then(res => setData(res.data?.data || null))
        .catch(() => setData(null))
        .finally(() => setLoading(false));
    } else {
      setData(null);
    }
  }, [open, equipment]);

  const summaryColumns = [
    {
      title: 'Nhà Cung Cấp',
      dataIndex: 'supplierName',
      key: 'supplierName',
      render: (v) => <Text strong>{v}</Text>,
    },
    {
      title: 'Tổng SL nhập',
      dataIndex: 'totalQuantity',
      key: 'totalQuantity',
      align: 'right',
      render: (v) => <Tag color="blue">{v.toLocaleString()}</Tag>,
    },
    {
      title: 'Lần nhập',
      dataIndex: 'importCount',
      key: 'importCount',
      align: 'center',
    },
    {
      title: 'Giá nhập gần nhất',
      dataIndex: 'lastUnitPrice',
      key: 'lastUnitPrice',
      align: 'right',
      render: (v) => `${Number(v).toLocaleString('vi-VN')} đ`,
    },
    {
      title: 'Nhập gần nhất',
      dataIndex: 'lastImportedAt',
      key: 'lastImportedAt',
      render: (v) => new Date(v).toLocaleDateString('vi-VN'),
    },
  ];

  const logColumns = [
    {
      title: 'Nhà Cung Cấp',
      dataIndex: 'supplierName',
      key: 'supplierName',
    },
    {
      title: 'Số lượng',
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'right',
      render: (v) => v.toLocaleString(),
    },
    {
      title: 'Đơn giá',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      align: 'right',
      render: (v) => `${Number(v).toLocaleString('vi-VN')} đ`,
    },
    {
      title: 'Ngày nhập',
      dataIndex: 'importedAt',
      key: 'importedAt',
      render: (v) => new Date(v).toLocaleString('vi-VN'),
    },
    {
      title: 'Ghi chú',
      dataIndex: 'notes',
      key: 'notes',
      render: (v) => v || '—',
    },
  ];

  const totalFromLogs = data?.logs?.reduce((sum, l) => sum + l.quantity, 0) ?? 0;

  return (
    <Modal
      title={`Chi tiết Nhà Cung Cấp — ${equipment?.name || ''}`}
      open={open}
      onCancel={onCancel}
      footer={null}
      width={800}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" />
        </div>
      ) : !data || data.logs.length === 0 ? (
        <Empty description="Chưa có dữ liệu nhập từ nhà cung cấp nào. Hãy import Excel để tạo lịch sử nhập kho." />
      ) : (
        <>
          {/* Tổng hợp theo NCC */}
          <Title level={5} style={{ marginBottom: 12 }}>Tổng hợp theo Nhà Cung Cấp</Title>
          <Table
            columns={summaryColumns}
            dataSource={data.summary}
            rowKey="supplierName"
            size="small"
            pagination={false}
            style={{ marginBottom: 24 }}
          />

          {/* Lịch sử từng lần nhập */}
          <Title level={5} style={{ marginBottom: 12 }}>
            Lịch sử nhập hàng ({data.logs.length} lần · Tổng: {totalFromLogs.toLocaleString()} sản phẩm)
          </Title>
          <Table
            columns={logColumns}
            dataSource={data.logs}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 5, size: 'small' }}
          />
        </>
      )}
    </Modal>
  );
};

export default SupplierLogsModal;
