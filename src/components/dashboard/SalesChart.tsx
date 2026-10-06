'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface ChartDataPoint {
  day: string;
  total: number;
  count: number;
}

export default function SalesChart({ data }: { data: ChartDataPoint[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-on-surface-variant">
        لا توجد بيانات
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data}>
        <XAxis dataKey="day" stroke="#9CA3AF" tick={{ fontSize: 11 }} />
        <YAxis stroke="#9CA3AF" tick={{ fontSize: 11 }} />
        <Tooltip
          contentStyle={{ backgroundColor: '#192029', border: '1px solid #424938' }}
          labelStyle={{ color: '#dce3f0' }}
        />
        <Bar dataKey="total" fill="#b6f36a" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
