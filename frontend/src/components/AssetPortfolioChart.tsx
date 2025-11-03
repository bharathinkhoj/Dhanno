import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { DollarSign, TrendingUp, Building, Landmark, Car, Coins, Home } from 'lucide-react';

interface AssetData {
  category: string;
  totalValue: number;
  count: number;
  assets: any[];
}

interface AssetChartProps {
  data: AssetData[];
  totalValue: number;
}

const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', 
  '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C'
];

const assetCategoryIcons: Record<string, any> = {
  bank: Landmark,
  mutual_fund: TrendingUp,
  stock: TrendingUp,
  land: Home,
  house: Building,
  farm_equipment: Car,
  vehicle: Car,
  gold: Coins,
  other: DollarSign,
};

const AssetChart: React.FC<AssetChartProps> = ({ data, totalValue }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const chartData = data.map((item, index) => ({
    name: item.category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    value: item.totalValue,
    percentage: ((item.totalValue / totalValue) * 100).toFixed(1),
    count: item.count,
    color: COLORS[index % COLORS.length]
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-gray-600">Value: {formatCurrency(data.value)}</p>
          <p className="text-sm text-gray-600">Share: {data.percentage}%</p>
          <p className="text-sm text-gray-600">Assets: {data.count}</p>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = (props: any) => {
    const { payload } = props;
    
    return (
      <div className="flex flex-wrap justify-center gap-2 mt-4">
        {payload.map((entry: any, index: number) => {
          const IconComponent = assetCategoryIcons[data[index]?.category] || DollarSign;
          
          return (
            <div
              key={`item-${index}`}
              className="flex items-center gap-2 text-sm"
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <IconComponent className="h-4 w-4" style={{ color: entry.color }} />
              <span className="text-gray-700">{entry.value}</span>
            </div>
          );
        })}
      </div>
    );
  };

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Asset Allocation</h3>
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <DollarSign className="h-12 w-12 mb-4" />
          <p>No assets to display</p>
          <p className="text-sm">Add some assets to see the allocation chart</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Asset Allocation</h3>
      
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 space-y-3">
        <div className="text-center">
          <p className="text-sm text-gray-600">Total Portfolio Value</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(totalValue)}</p>
        </div>
        
        <div className="grid grid-cols-1 gap-2">
          {chartData.map((item, index) => {
            const IconComponent = assetCategoryIcons[data[index]?.category] || DollarSign;
            
            return (
              <div key={item.name} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <IconComponent className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium">{item.name}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{formatCurrency(item.value)}</p>
                  <p className="text-xs text-gray-600">{item.percentage}%</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AssetChart;