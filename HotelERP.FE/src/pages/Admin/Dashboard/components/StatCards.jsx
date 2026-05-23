import React from 'react';
import { Row, Col, Card, Statistic, Typography } from 'antd';
import {
  CalendarOutlined,
  LogoutOutlined,
  HomeOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ToolOutlined,
  FileTextOutlined,
} from '@ant-design/icons';

const { Title } = Typography;

/**
 * StatCards nhận các prop `canX` từ Dashboard (đã tính toán theo role).
 * Không tự tính role nữa để tránh logic phân tán.
 */
const StatCards = ({
  receptionStats,
  housekeepingStats,
  invoiceStats,
  canReception,
  canHousekeeping,
  canFinance,
}) => {
  return (
    <>
      {/* ── MODULE LỄ TÂN ── */}
      {canReception && (
        <div style={{ marginBottom: 24 }}>
          <Title level={5}>Tình hình Lễ tân (Hôm nay)</Title>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Card hoverable variant="borderless" style={{ background: '#e6f7ff' }}>
                <Statistic
                  title="Khách sắp đến (Arrivals)"
                  value={receptionStats.arrivals}
                  prefix={<CalendarOutlined style={{ color: '#1890ff' }} />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card hoverable variant="borderless" style={{ background: '#f6ffed' }}>
                <Statistic
                  title="Khách đang lưu trú (In-House)"
                  value={receptionStats.inHouse}
                  prefix={<HomeOutlined style={{ color: '#52c41a' }} />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card hoverable variant="borderless" style={{ background: '#fff1f0' }}>
                <Statistic
                  title="Khách sắp đi (Departures)"
                  value={receptionStats.departures}
                  prefix={<LogoutOutlined style={{ color: '#ff4d4f' }} />}
                />
              </Card>
            </Col>
          </Row>
        </div>
      )}

      {/* ── MODULE BUỒNG PHÒNG ── */}
      {canHousekeeping && (
        <div style={{ marginBottom: 24 }}>
          <Title level={5}>Tình trạng Buồng phòng</Title>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={6}>
              <Card hoverable variant="borderless" style={{ background: '#f9f0ff' }}>
                <Statistic
                  title="Phòng trống (Sẵn sàng)"
                  value={housekeepingStats.available}
                  prefix={<CheckCircleOutlined style={{ color: '#722ed1' }} />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={6}>
              <Card hoverable variant="borderless" style={{ background: '#fff2e8' }}>
                <Statistic
                  title="Chưa dọn (Dirty)"
                  value={housekeepingStats.dirty}
                  prefix={<WarningOutlined style={{ color: '#fa541c' }} />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={6}>
              <Card hoverable variant="borderless" style={{ background: '#fffbe6' }}>
                <Statistic
                  title="Đang bảo trì"
                  value={housekeepingStats.maintenance}
                  prefix={<ToolOutlined style={{ color: '#faad14' }} />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={6}>
              <Card hoverable variant="borderless" style={{ background: '#e6f7ff' }}>
                <Statistic
                  title="Có khách (Occupied)"
                  value={housekeepingStats.occupied}
                  prefix={<HomeOutlined style={{ color: '#1890ff' }} />}
                />
              </Card>
            </Col>
          </Row>
        </div>
      )}

      {/* ── MODULE TÀI CHÍNH ── */}
      {canFinance && (
        <div style={{ marginBottom: 24 }}>
          <Title level={5}>Tài chính & Hiệu suất</Title>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Card hoverable variant="borderless">
                <Statistic
                  title="Doanh thu dự kiến (VND)"
                  value={invoiceStats.totalRevenue}
                  precision={0}
                  prefix={<FileTextOutlined style={{ color: '#13c2c2' }} />}
                  suffix="đ"
                />
              </Card>
            </Col>
            <Col xs={24} sm={12}>
              <Card hoverable variant="borderless">
                <Statistic
                  title="Tổng doanh thu (VND)"
                  value={invoiceStats.todayRevenue}
                  precision={0}
                  styles={{ content: { color: '#52c41a' } }}
                  prefix={<FileTextOutlined style={{ color: '#52c41a' }} />}
                  suffix="đ"
                />
              </Card>
            </Col>
          </Row>
        </div>
      )}
    </>
  );
};

export default StatCards;
