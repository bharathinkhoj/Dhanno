import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { SpendingByCategory } from '../api/api';
import { formatCurrency } from '../utils/currency';

interface Props {
  data: SpendingByCategory[];
}

interface ChartDataItem {
  name: string;
  value: number;
  color: string;
  originalCategories?: SpendingByCategory[];
}

export const SpendingChart: React.FC<Props> = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="text-gray-400 text-center py-8">No spending data available</div>;
  }

  const totalSpending = data.reduce((sum, item) => sum + item.total, 0);
  const threshold = totalSpending * 0.05; // 5% threshold

  // Separate major and minor categories
  const majorCategories = data.filter(item => item.total >= threshold);
  const minorCategories = data.filter(item => item.total < threshold);

  // Create chart data
  const chartData: ChartDataItem[] = majorCategories.map(item => ({
    name: item.categoryName,
    value: item.total,
    color: item.color,
  }));

  // Add "Others" category if there are minor categories
  if (minorCategories.length > 0) {
    const othersTotal = minorCategories.reduce((sum, item) => sum + item.total, 0);
    chartData.push({
      name: 'Others',
      value: othersTotal,
      color: '#6B7280', // Gray color for "Others"
      originalCategories: minorCategories,
    });
  }



  const renderCustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      if (data.name === 'Others' && data.originalCategories) {
        return (
          <div className="bg-gray-800 border border-gray-600 rounded p-3 shadow-lg">
            <p className="text-white font-semibold mb-2">Others Breakdown:</p>
            {data.originalCategories.map((category: SpendingByCategory, index: number) => (
              <div key={index} className="flex items-center justify-between text-sm text-gray-300 mb-1">
                <div className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-2" 
                    style={{ backgroundColor: category.color }}
                  ></div>
                  <span>{category.categoryName}</span>
                </div>
                <span className="ml-2">{formatCurrency(category.total)}</span>
              </div>
            ))}
            <div className="border-t border-gray-600 mt-2 pt-2 text-white font-semibold">
              Total: {formatCurrency(data.value)}
            </div>
          </div>
        );
      }
      return (
        <div className="bg-gray-800 border border-gray-600 rounded p-2 shadow-lg">
          <span className="text-white">{`${data.name}: ${formatCurrency(data.value)}`}</span>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={(entry) => `₹${entry.value.toFixed(0)}`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip 
          content={renderCustomTooltip}
          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};
