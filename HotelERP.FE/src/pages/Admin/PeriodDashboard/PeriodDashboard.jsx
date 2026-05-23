import React, { useEffect, useState } from 'react';
import { Typography, Card, Row, Col, Spin, Button, Tag, Space, Statistic, Select } from 'antd';
import { SyncOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { message } from '../../../utils/antdGlobal';
import { dashboardPeriodApi } from '../../../api/dashboardPeriodApi';
import { useAuthStore } from '../../../store/authStore';

const { Title, Text } = Typography;
const { Option } = Select;

const PeriodDashboard = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [data, setData] = useState(null);
  
  // States cho bộ lọc
  const [periodType, setPeriodType] = useState('MONTHLY');
  const [roleName, setRoleName] = useState(user?.roleName || 'Admin');

  useEffect(() => {
    fetchDashboard();
  }, [periodType, roleName]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await dashboardPeriodApi.getCurrentDashboard({ roleName, periodType });
      if (res.data) {
        setData(res.data);
      }
    } catch (error) {
      if (error.response?.status === 404) {
        setData(null);
        // Không hiện lỗi, chỉ là chưa có dữ liệu
      } else {
        message.error('Lỗi khi lấy dữ liệu Dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRebuild = async () => {
    try {
      setRebuilding(true);
      await dashboardPeriodApi.rebuildCurrent();
      message.success('Cập nhật dữ liệu thành công!');
      fetchDashboard();
    } catch (error) {
      message.error('Lỗi khi cập nhật dữ liệu');
    } finally {
      setRebuilding(false);
    }
  };

  const renderMetric = (title, value, prevValue, growthRate, format = 'number') => {
    const formattedValue = format === 'currency' 
      ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0)
      : (value || 0);

    let color = '#000';
    let icon = null;
    
    if (growthRate > 0) {
      color = '#3f8600';
      icon = <ArrowUpOutlined />;
    } else if (growthRate < 0) {
      color = '#cf1322';
      icon = <ArrowDownOutlined />;
    }

    return (
      <Card bordered={false} style={{ height: '100%', boxShadow: '0 1px 2px -2px rgba(0, 0, 0, 0.16), 0 3px 6px 0 rgba(0, 0, 0, 0.12), 0 5px 12px 4px rgba(0, 0, 0, 0.09)' }}>
        <Statistic
          title={title}
          value={formattedValue}
          valueStyle={{ color: '#000', fontSize: '24px', fontWeight: 600 }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
          {growthRate !== null && growthRate !== undefined && (
            <span style={{ color, fontWeight: 500, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {icon} {Math.abs(growthRate)}%
            </span>
          )}
          {prevValue !== undefined && (
            <span style={{ fontSize: '12px', color: '#888' }}>
              (Kỳ trước: {format === 'currency' 
                ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(prevValue || 0)
                : (prevValue || 0)})
            </span>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0, color: '#1890ff' }}>Báo Cáo Thống Kê Định Kỳ</Title>
        <Space>
          <Select value={roleName} onChange={setRoleName} style={{ width: 150 }}>
            <Option value="Admin">Quản trị viên</Option>
            <Option value="Manager">Quản lý</Option>
            <Option value="Accountant">Kế toán</Option>
            <Option value="Receptionist">Lễ tân</Option>
            <Option value="Housekeeping">Buồng phòng</Option>
            <Option value="WarehouseStaff">Thủ kho</Option>
            <Option value="Marketing">Marketing</Option>
            <Option value="MarketingStaff">NV Marketing</Option>
          </Select>
          <Select value={periodType} onChange={setPeriodType} style={{ width: 120 }}>
            <Option value="DAILY">Hôm nay</Option>
            <Option value="WEEKLY">Tuần này</Option>
            <Option value="MONTHLY">Tháng này</Option>
            <Option value="QUARTERLY">Quý này</Option>
            <Option value="YEARLY">Năm nay</Option>
          </Select>
          <Button 
            type="primary" 
            icon={<SyncOutlined spin={rebuilding} />} 
            onClick={handleRebuild}
            loading={rebuilding}
          >
            Tính toán & Cập nhật mới nhất
          </Button>
        </Space>
      </div>

      <Spin spinning={loading}>
        {data ? (
          <>
            <div style={{ marginBottom: 16 }}>
              <Tag color="blue">Kỳ báo cáo: {data.periodKey}</Tag>
              <Tag color={data.status === 'OPEN' ? 'green' : 'default'}>Trạng thái: {data.status}</Tag>
              <Tag color="purple">Cập nhật lúc: {new Date(data.updatedAt).toLocaleString('vi-VN')}</Tag>
            </div>

            {/* Chỉ số chính */}
            <Title level={5} style={{ marginTop: 24, marginBottom: 16 }}>Tổng quan Toàn Khách Sạn (So với kỳ trước)</Title>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={6}>
                {renderMetric(
                  "Tổng Đặt Phòng", 
                  data.dashboard?.summary?.booking?.totalBookings,
                  data.comparison?.metrics?.totalBookings?.previous,
                  data.comparison?.metrics?.totalBookings?.growthRate
                )}
              </Col>
              <Col xs={24} sm={12} md={6}>
                {renderMetric(
                  "Doanh Thu", 
                  data.dashboard?.summary?.revenue?.totalRevenue,
                  data.comparison?.metrics?.totalRevenue?.previous,
                  data.comparison?.metrics?.totalRevenue?.growthRate,
                  'currency'
                )}
              </Col>
              <Col xs={24} sm={12} md={6}>
                {renderMetric(
                  "Tỷ lệ lấp đầy (%)", 
                  data.dashboard?.summary?.rooms?.occupancyRate,
                  data.comparison?.metrics?.occupancyRate?.previous,
                  data.comparison?.metrics?.occupancyRate?.growthRate
                )}
              </Col>
              <Col xs={24} sm={12} md={6}>
                {renderMetric(
                  "Khách hàng mới", 
                  data.dashboard?.summary?.system?.newCustomers,
                  data.comparison?.metrics?.newCustomers?.previous,
                  data.comparison?.metrics?.newCustomers?.growthRate
                )}
              </Col>
            </Row>

            <Title level={5} style={{ marginTop: 24, marginBottom: 16 }}>Cảnh Báo Vận Hành</Title>
            <Row gutter={[16, 16]}>
               <Col xs={24} sm={12} md={6}>
                {renderMetric(
                  "Báo cáo hư hỏng", 
                  data.dashboard?.summary?.warehouse?.damageReports,
                  data.comparison?.metrics?.damageReports?.previous,
                  data.comparison?.metrics?.damageReports?.growthRate
                )}
              </Col>
              <Col xs={24} sm={12} md={6}>
                {renderMetric(
                  "Tiền phạt đền bù", 
                  data.dashboard?.summary?.warehouse?.penaltyAmount,
                  data.comparison?.metrics?.penaltyAmount?.previous,
                  data.comparison?.metrics?.penaltyAmount?.growthRate,
                  'currency'
                )}
              </Col>
               <Col xs={24} sm={12} md={6}>
                {renderMetric(
                  "Tiền chưa thu / Ghi nợ", 
                  data.dashboard?.summary?.revenue?.pendingPaymentAmount,
                  data.comparison?.metrics?.pendingPaymentAmount?.previous,
                  data.comparison?.metrics?.pendingPaymentAmount?.growthRate,
                  'currency'
                )}
              </Col>
              <Col xs={24} sm={12} md={6}>
                {renderMetric(
                  "Vật tư cần nhập thêm", 
                  data.dashboard?.summary?.warehouse?.lowStockItems,
                  null,
                  null
                )}
              </Col>
            </Row>

            {/* Widgets/KPIs dành riêng cho Role */}
            {data.dashboard?.widgets?.kpiCards && (
              <>
                <Title level={5} style={{ marginTop: 24, marginBottom: 16, color: '#eb2f96' }}>
                  KPIs Tập Trung Cho Chức Danh: {data.roleName}
                </Title>
                <Row gutter={[16, 16]}>
                  {data.dashboard.widgets.kpiCards.map((kpi, index) => (
                    <Col xs={24} sm={12} md={8} key={index}>
                       <Card bordered={false} style={{ height: '100%', background: '#fff0f6', border: '1px solid #ffadd2' }}>
                          <Statistic title={kpi.title} value={kpi.value} suffix={kpi.unit} valueStyle={{ color: '#eb2f96', fontWeight: 'bold' }} />
                       </Card>
                    </Col>
                  ))}
                </Row>
              </>
            )}

          </>
        ) : (
           <div style={{ padding: 40, textAlign: 'center', background: '#fafafa', borderRadius: 8, border: '1px dashed #d9d9d9' }}>
              <Title level={4} type="secondary" style={{ marginTop: 16 }}>Chưa Có Bản Snapshot Cho Kỳ Này</Title>
              <Text type="secondary">Hệ thống chưa tính toán dữ liệu cho chức danh <b>{roleName}</b> ở kỳ <b>{periodType}</b>.</Text>
              <br/><br/>
              <Button type="primary" size="large" icon={<SyncOutlined />} onClick={handleRebuild} loading={rebuilding}>
                Khởi tạo dữ liệu ngay
              </Button>
           </div>
        )}
      </Spin>
    </div>
  );
};

export default PeriodDashboard;
