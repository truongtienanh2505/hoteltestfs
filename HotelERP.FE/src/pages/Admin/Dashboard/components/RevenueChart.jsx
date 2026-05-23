import React from 'react';
import { Card } from 'antd';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const RevenueChart = ({ totalRevenue, todayRevenue, last7Days }) => {
  
  let data = [];
  if (last7Days && last7Days.length > 0) {
    data = last7Days.map(item => ({
      day: item.dayName,
      revenue: item.revenue || 0
    }));
  } else {
    // Fallback nếu không có dữ liệu
    data = [
      { day: 'T2', revenue: 0 },
      { day: 'T3', revenue: 0 },
      { day: 'T4', revenue: 0 },
      { day: 'T5', revenue: 0 },
      { day: 'T6', revenue: 0 },
      { day: 'T7', revenue: 0 },
      { day: 'CN (Hôm nay)', revenue: todayRevenue > 0 ? todayRevenue : 0 }
    ];
  }

  const formatVND = (value) => `${new Intl.NumberFormat('vi-VN').format(value)} đ`;

  return (
    <Card title="Doanh thu 7 ngày gần nhất" bordered={false} hoverable>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="day" axisLine={false} tickLine={false} />
          <YAxis tickFormatter={(val) => `${val / 1000000}M`} axisLine={false} tickLine={false} />
          <Tooltip formatter={(value) => formatVND(value)} cursor={{ fill: '#f5f5f5' }} />
          <Legend />
          <Bar dataKey="revenue" name="Doanh thu (VND)" fill="#1890ff" radius={[4, 4, 0, 0]} barSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
};

export default RevenueChart;
