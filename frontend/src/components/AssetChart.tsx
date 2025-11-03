import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../api/api';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface Props {
  startDate: string;
  endDate: string;
}

const COLORS = [
  '#3B82F6', // blue-500
  '#8B5CF6', // purple-500
  '#10B981', // emerald-500
  '#F59E0B', // amber-500
  '#EF4444', // red-500
  '#6366F1', // indigo-500
  '#EC4899', // pink-500
  '#14B8A6', // teal-500
];

export const AssetChart: React.FC<Props> = ({ startDate, endDate }) => {
  const { data: assetData, isLoading, error } = useQuery({
    queryKey: ['asset-allocation', startDate, endDate],
    queryFn: () => analyticsApi.getSpendingByCategory({ startDate, endDate, type: 'asset' }).then(r => r.data),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-400">
        Error loading asset data
      </div>
    );
  }

  if (!assetData || assetData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        No asset transactions found
      </div>
    );
  }

  // Prepare data for chart
  const chartData = assetData.map((item, index) => ({
    name: item.categoryName || 'Unknown',
    value: item.total,
    color: item.color || COLORS[index % COLORS.length],
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium">{data.name}</p>
          <p className="text-blue-400">
            ₹{data.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex flex-wrap gap-2 mt-4 justify-center">
        {payload?.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-1 text-sm">
            <div 
              className="w-3 h-3 rounded"
              style={{ backgroundColor: entry.color }}
            ></div>
            <span className="text-gray-300 truncate max-w-[120px]">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="45%"
            innerRadius={40}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.color} 
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};