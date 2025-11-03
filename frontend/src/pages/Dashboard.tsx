import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../api/api';
import { SpendingChart } from '../components/SpendingChart';
import { TrendsChart } from '../components/TrendsChart';
import { AssetChart } from '../components/AssetChart';
import AssetPortfolioChart from '../components/AssetPortfolioChart';
import { EnhancedTransactionList } from '../components/EnhancedTransactionList';
import { AddTransactionModal } from '../components/AddTransactionModal';
import { CSVUploadModal } from '../components/CSVUploadModal';
import RecategorizeButton from '../components/RecategorizeButton';
import { useAuthStore } from '../store/authStore';
import { format, subYears } from 'date-fns';
import { formatLargeAmount } from '../utils/currency';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';

export const Dashboard: React.FC = () => {
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [showCSVModal, setShowCSVModal] = React.useState(false);
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();
  
  // Show transactions from last 5 years to capture imported historical data
  const startDate = format(subYears(new Date(), 5), 'yyyy-MM-dd');
  const endDate = format(new Date(), 'yyyy-MM-dd');

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
      navigate('/login');
    }
  };

  const { data: summary } = useQuery({
    queryKey: ['summary', startDate, endDate],
    queryFn: () => analyticsApi.getSummary({ startDate, endDate }).then(r => r.data),
  });



  const { data: spendingData } = useQuery({
    queryKey: ['spending-by-category', startDate, endDate],
    queryFn: () => analyticsApi.getSpendingByCategory({ startDate, endDate, type: 'expense' }).then(r => r.data),
  });



  const { data: assetData } = useQuery({
    queryKey: ['asset-summary'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/assets/summary/categories', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        return response.json();
      }
      return null;
    },
  });

  return (
    <div className="min-h-screen bg-slate-900">
      <Navigation />
      <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
          <h1 className="text-4xl font-bold text-white">Finance Dashboard</h1>
          
          <div className="flex flex-col lg:flex-row items-start lg:items-center space-y-3 lg:space-y-0 lg:space-x-4 w-full lg:w-auto">
            <div className="flex flex-wrap gap-2 lg:gap-3">
              <RecategorizeButton />
              <button
                onClick={() => setShowCSVModal(true)}
                className="bg-indigo-600 text-white px-3 lg:px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm lg:text-base"
              >
                📂 Import CSV
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="btn-primary text-sm lg:text-base px-3 lg:px-4"
              >
                + Add Transaction
              </button>
            </div>
            
            {/* User Info and Logout */}
            <div className="flex items-center space-x-3 border-t lg:border-t-0 lg:border-l border-slate-700 pt-3 lg:pt-0 lg:pl-4 w-full lg:w-auto">
              <div className="text-left lg:text-right flex-1 lg:flex-none">
                <div className="text-white font-medium">
                  {user?.name || user?.email?.split('@')[0] || 'User'}
                </div>
                <div className="text-gray-400 text-sm hidden lg:block">
                  {user?.email}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg transition-colors flex items-center space-x-1 text-sm lg:text-base"
                title="Logout"
              >
                <span>🚪</span>
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="card">
            <h3 className="text-gray-400 text-sm mb-2">Total Income</h3>
            <p className="text-3xl font-bold text-green-400">
              {summary ? formatLargeAmount(summary.totalIncome) : '₹0.00'}
            </p>
          </div>
          <div className="card">
            <h3 className="text-gray-400 text-sm mb-2">Total Expenses</h3>
            <p className="text-3xl font-bold text-red-400">
              {summary ? formatLargeAmount(summary.totalExpense) : '₹0.00'}
            </p>
          </div>
          <div className="card">
            <h3 className="text-gray-400 text-sm mb-2">Asset Transactions</h3>
            <p className="text-3xl font-bold text-blue-400">
              {summary ? formatLargeAmount(summary.totalAssetTransactions) : '₹0.00'}
            </p>
          </div>
          <div className="card">
            <h3 className="text-gray-400 text-sm mb-2">Portfolio Value</h3>
            <p className="text-3xl font-bold text-purple-400">
              {assetData ? formatLargeAmount(assetData.totalPortfolioValue) : '₹0.00'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {assetData ? `${assetData.totalAssets} assets` : '0 assets'}
            </p>
          </div>
          <div className="card">
            <h3 className="text-gray-400 text-sm mb-2">Net Cash Flow</h3>
            <p className={`text-3xl font-bold ${(summary?.netCashFlow || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {summary ? formatLargeAmount(summary.netCashFlow) : '₹0.00'}
            </p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="card">
            <h2 className="text-xl font-bold text-white mb-4">Expenses by Category</h2>
            <SpendingChart data={spendingData || []} />
          </div>
          <div className="card">
            <h2 className="text-xl font-bold text-white mb-4">Asset Portfolio</h2>
            <div className="bg-white rounded-lg">
              <AssetPortfolioChart 
                data={assetData?.categories || []} 
                totalValue={assetData?.totalPortfolioValue || 0} 
              />
            </div>
          </div>
          <div className="card">
            <h2 className="text-xl font-bold text-white mb-4">Asset Transactions</h2>
            <AssetChart startDate={startDate} endDate={endDate} />
          </div>
        </div>

        {/* Monthly Trends - Full Width */}
        <div className="card mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Monthly Trends</h2>
          <TrendsChart />
        </div>

        {/* Recent Transactions */}
        <div className="card">
          <h2 className="text-xl font-bold text-white mb-4">Recent Transactions</h2>
          <EnhancedTransactionList startDate={startDate} endDate={endDate} />
        </div>
      </div>

      {showAddModal && (
        <AddTransactionModal onClose={() => setShowAddModal(false)} />
      )}
      {showCSVModal && (
        <CSVUploadModal onClose={() => setShowCSVModal(false)} />
      )}
      </div>
    </div>
  );
};
