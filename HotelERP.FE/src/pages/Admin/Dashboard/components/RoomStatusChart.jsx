import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card } from 'antd';

const RoomStatusChart = ({ available, dirty, maintenance, occupied }) => {
  const data = [
    { name: 'Sẵn sàng', value: available, color: '#52c41a' },
    { name: 'Chưa dọn (Dirty)', value: dirty, color: '#fa541c' },
    { name: 'Khách Đang Ở', value: occupied, color: '#1890ff' },
    { name: 'Bảo trì', value: maintenance, color: '#faad14' },
  ].filter(item => item.value > 0); // Chỉ hiển thị mục có dữ liệu

  return (
    <Card title="Tỷ lệ trạng thái phòng" bordered={false} hoverable>
      {data.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#999', padding: '40px 0' }}>Chưa có dữ liệu phòng</div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
            <Legend verticalAlign="bottom" height={36}/>
          </PieChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
};

export default RoomStatusChart;
