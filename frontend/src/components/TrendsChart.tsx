import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { categoryApi, analyticsApi } from '../api/api';
import { formatCurrency } from '../utils/currency';

interface Props {}

export const TrendsChart: React.FC<Props> = () => {
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  // Fetch categories for dropdown
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryApi.getAll().then(r => r.data),
  });

  // Fetch trends data based on selected categories
  const { data: categoryTrendsResponse, isLoading } = useQuery({
    queryKey: ['category-trends', selectedCategoryIds],
    queryFn: () => analyticsApi.getCategoryTrends(6, selectedCategoryIds).then(r => r.data),
    enabled: selectedCategoryIds.length > 0,
  });

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategoryIds(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  // Generate colors for categories not having specific colors
  const generateColor = (index: number) => {
    const colors = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
    return colors[index % colors.length];
  };

  return (
    <div>
      {/* Category Selection Controls */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {/* Dropdown for adding categories */}
        <div className="flex-1 min-w-64 max-w-sm">
          <select
            onChange={(e) => {
              if (e.target.value && !selectedCategoryIds.includes(e.target.value)) {
                handleCategoryToggle(e.target.value);
              }
              e.target.value = ''; // Reset dropdown
            }}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value=""
            disabled={!categories || categories.filter(cat => !selectedCategoryIds.includes(cat.id)).length === 0}
          >
            <option value="">
              {!categories ? "Loading categories..." : 
               categories.filter(cat => !selectedCategoryIds.includes(cat.id)).length === 0 ? 
               "All categories selected" : 
               "+ Add category to compare"}
            </option>
            {categories?.filter(cat => !selectedCategoryIds.includes(cat.id)).map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        
        {/* Clear all button and count */}
        {selectedCategoryIds.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">
              {selectedCategoryIds.length} selected
            </span>
            <button
              onClick={() => setSelectedCategoryIds([])}
              className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* Selected Categories Display */}
      {selectedCategoryIds.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {selectedCategoryIds.map((categoryId) => {
              const category = categories?.find(cat => cat.id === categoryId);
              return category ? (
                <div
                  key={categoryId}
                  className="flex items-center bg-gray-700 text-white px-2 py-1 rounded text-sm border"
                  style={{ borderColor: category.color }}
                >
                  <div
                    className="w-2 h-2 rounded-full mr-2"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="text-xs">{category.name}</span>
                  <button
                    onClick={() => handleCategoryToggle(categoryId)}
                    className="ml-1 text-gray-400 hover:text-white text-sm font-bold"
                    title={`Remove ${category.name}`}
                  >
                    ×
                  </button>
                </div>
              ) : null;
            })}
          </div>
        </div>
      )}

      {/* Chart Area */}
      <div style={{ height: '400px' }}>
        {selectedCategoryIds.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <p className="text-lg mb-2">Select categories from the dropdown to view trends</p>
              <p className="text-sm">You can add multiple categories to compare their spending patterns over time</p>
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            Loading category trends...
          </div>
        ) : !categoryTrendsResponse?.data || categoryTrendsResponse.data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            No transaction data found for selected categories
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={categoryTrendsResponse.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis 
                dataKey="month" 
                stroke="#94a3b8"
              />
              <YAxis 
                stroke="#94a3b8"
                tickFormatter={formatCurrency}
              />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
              />
              <Legend />
              {categoryTrendsResponse.categories.map((category, index) => (
                <Line
                  key={category.id}
                  type="monotone"
                  dataKey={category.name}
                  stroke={category.color || generateColor(index)}
                  strokeWidth={2}
                  name={category.name}
                  dot={{ r: 3 }}
                  connectNulls={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
