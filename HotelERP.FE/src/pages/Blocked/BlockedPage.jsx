import React from 'react';
import { Card, Image, Typography, Space } from 'antd';

const { Title, Text } = Typography;

const BlockedPage = () => {
  return (
    <div
      style={{
        minHeight: 'calc(100vh - 160px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: '#f8fafc',
        borderRadius: '16px',
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: '520px',
          borderRadius: '20px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.08)',
          textAlign: 'center',
        }}
        styles={{ body: { padding: '32px' } }}
      >
        <Space direction="vertical" size={20} style={{ width: '100%' }}>
          <Image
            src="/hai-beo.jpg"
            alt="Hải béo"
            width={170}
            preview={false}
            style={{
              borderRadius: '16px',
              objectFit: 'cover',
            }}
          />

          <Title level={2} style={{ margin: 0 }}>
            đã bị Hải béo ăn
          </Title>

          <Text type="secondary" style={{ fontSize: '16px' }}>
        
          </Text>
        </Space>
      </Card>
    </div>
  );
};

export default BlockedPage;