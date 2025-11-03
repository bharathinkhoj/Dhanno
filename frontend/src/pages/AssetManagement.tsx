import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, TrendingUp, TrendingDown, DollarSign, Home, Building, Landmark, Car, Coins } from 'lucide-react';
import Navigation from '../components/Navigation';

interface Asset {
  id: string;
  name: string;
  category: string;
  subCategory?: string;
  currentValue: number;
  purchaseValue?: number;
  purchaseDate?: string;
  quantity?: number;
  description?: string;
  location?: string;
  isActive: boolean;
  lastUpdated: string;
  createdAt: string;
}

interface AssetCategory {
  category: string;
  totalValue: number;
  count: number;
  assets: Asset[];
}

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

const assetCategories = [
  { value: 'bank', label: 'Bank Account', subcategories: ['savings_account', 'current_account', 'fixed_deposit', 'recurring_deposit'] },
  { value: 'mutual_fund', label: 'Mutual Fund', subcategories: ['equity', 'debt', 'hybrid', 'index'] },
  { value: 'stock', label: 'Stock', subcategories: ['equity', 'preference'] },
  { value: 'land', label: 'Land', subcategories: ['residential', 'commercial', 'agricultural'] },
  { value: 'house', label: 'House/Property', subcategories: ['residential', 'commercial', 'rental'] },
  { value: 'farm_equipment', label: 'Farm Equipment', subcategories: ['tractor', 'harvester', 'tools'] },
  { value: 'vehicle', label: 'Vehicle', subcategories: ['car', 'motorcycle', 'truck'] },
  { value: 'gold', label: 'Gold', subcategories: ['jewelry', 'coins', 'bars'] },
  { value: 'other', label: 'Other', subcategories: [] },
];

const AssetManagement: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetSummary, setAssetSummary] = useState<{
    categories: AssetCategory[];
    totalPortfolioValue: number;
    totalAssets: number;
  } | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    subCategory: '',
    currentValue: '',
    purchaseValue: '',
    purchaseDate: '',
    quantity: '',
    description: '',
    location: '',
  });

  useEffect(() => {
    fetchAssets();
    fetchAssetSummary();
  }, []);

  const fetchAssets = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/assets', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setAssets(data);
      }
    } catch (error) {
      console.error('Error fetching assets:', error);
    }
  };

  const fetchAssetSummary = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/assets/summary/categories', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setAssetSummary(data);
      }
    } catch (error) {
      console.error('Error fetching asset summary:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.name.trim()) {
      alert('Please enter an asset name');
      return;
    }
    if (!formData.category) {
      alert('Please select a category');
      return;
    }
    if (!formData.currentValue || parseFloat(formData.currentValue) <= 0) {
      alert('Please enter a valid current value');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const url = editingAsset ? `/api/assets/${editingAsset.id}` : '/api/assets';
      const method = editingAsset ? 'PUT' : 'POST';

      // Transform formData to correct types
      const assetData = {
        ...formData,
        currentValue: parseFloat(formData.currentValue) || 0,
        purchaseValue: formData.purchaseValue ? parseFloat(formData.purchaseValue) : undefined,
        quantity: formData.quantity ? parseFloat(formData.quantity) : undefined,
      };

      console.log('Sending asset data:', assetData);
      console.log('Request URL:', url);
      console.log('Request method:', method);
      console.log('Token exists:', !!localStorage.getItem('token'));

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(assetData),
      });

      if (response.ok) {
        await fetchAssets();
        await fetchAssetSummary();
        resetForm();
        alert('Asset saved successfully!');
      } else {
        const errorText = await response.text();
        console.error('Error saving asset:', response.status, errorText);
        console.error('Response headers:', response.headers);
        console.error('Full response:', response);
        alert(`Failed to save asset: ${response.status} - ${errorText || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving asset:', error);
      alert(`Network error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setFormData({
      name: asset.name,
      category: asset.category,
      subCategory: asset.subCategory || '',
      currentValue: asset.currentValue.toString(),
      purchaseValue: asset.purchaseValue?.toString() || '',
      purchaseDate: asset.purchaseDate ? asset.purchaseDate.split('T')[0] : '',
      quantity: asset.quantity?.toString() || '',
      description: asset.description || '',
      location: asset.location || '',
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this asset?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/assets/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await fetchAssets();
        await fetchAssetSummary();
      }
    } catch (error) {
      console.error('Error deleting asset:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      subCategory: '',
      currentValue: '',
      purchaseValue: '',
      purchaseDate: '',
      quantity: '',
      description: '',
      location: '',
    });
    setEditingAsset(null);
    setShowAddForm(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const getGainLoss = (current: number, purchase?: number) => {
    if (!purchase) return null;
    const gain = current - purchase;
    const percentage = ((gain / purchase) * 100).toFixed(2);
    return { amount: gain, percentage };
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <Navigation />
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Asset Management</h1>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Asset
        </button>
      </div>

      {/* Portfolio Summary */}
      {assetSummary && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Portfolio Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-600 font-medium">Total Portfolio Value</p>
              <p className="text-2xl font-bold text-blue-800">
                {formatCurrency(assetSummary.totalPortfolioValue)}
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-600 font-medium">Total Assets</p>
              <p className="text-2xl font-bold text-green-800">
                {assetSummary.totalAssets}
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-purple-600 font-medium">Asset Categories</p>
              <p className="text-2xl font-bold text-purple-800">
                {assetSummary.categories.length}
              </p>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">By Category</h3>
            {assetSummary.categories.map((category) => {
              const IconComponent = assetCategoryIcons[category.category] || DollarSign;
              const percentage = ((category.totalValue / assetSummary.totalPortfolioValue) * 100).toFixed(1);
              
              return (
                <div key={category.category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <IconComponent className="h-5 w-5 text-gray-600" />
                    <div>
                      <p className="font-medium capitalize">{category.category.replace('_', ' ')}</p>
                      <p className="text-sm text-gray-600">{category.count} assets</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(category.totalValue)}</p>
                    <p className="text-sm text-gray-600">{percentage}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add/Edit Asset Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">
            {editingAsset ? 'Edit Asset' : 'Add New Asset'}
          </h2>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full input-flat"
                placeholder="Asset name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value, subCategory: '' })}
                className="w-full dropdown-flat"
              >
                <option value="">Select category</option>
                {assetCategories.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            {formData.category && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subcategory</label>
                <select
                  value={formData.subCategory}
                  onChange={(e) => setFormData({ ...formData, subCategory: e.target.value })}
                  className="w-full dropdown-flat"
                >
                  <option value="">Select subcategory</option>
                  {assetCategories
                    .find(cat => cat.value === formData.category)
                    ?.subcategories.map((sub) => (
                      <option key={sub} value={sub}>{sub.replace('_', ' ')}</option>
                    ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Value (₹)</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.currentValue}
                onChange={(e) => setFormData({ ...formData, currentValue: e.target.value })}
                className="w-full input-flat"
                placeholder="Current market value"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Value (₹)</label>
              <input
                type="number"
                step="0.01"
                value={formData.purchaseValue}
                onChange={(e) => setFormData({ ...formData, purchaseValue: e.target.value })}
                className="w-full input-flat"
                placeholder="Original purchase value"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
              <input
                type="date"
                value={formData.purchaseDate}
                onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                className="w-full input-flat"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input
                type="number"
                step="0.01"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="w-full input-flat"
                placeholder="Number of units"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full input-flat"
                placeholder="Asset location (optional)"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full input-flat"
                rows={3}
                placeholder="Asset description or notes (optional)"
              />
            </div>

            <div className="md:col-span-2 flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md disabled:opacity-50"
              >
                {loading ? 'Saving...' : editingAsset ? 'Update Asset' : 'Add Asset'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-2 rounded-md"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Assets List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">All Assets</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Asset
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gain/Loss
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {assets.map((asset) => {
                const IconComponent = assetCategoryIcons[asset.category] || DollarSign;
                const gainLoss = getGainLoss(asset.currentValue, asset.purchaseValue);
                
                return (
                  <tr key={asset.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <IconComponent className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{asset.name}</div>
                          {asset.subCategory && (
                            <div className="text-sm text-gray-500 capitalize">
                              {asset.subCategory.replace('_', ' ')}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="capitalize text-sm text-gray-900">
                        {asset.category.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(asset.currentValue)}
                      </div>
                      {asset.quantity && (
                        <div className="text-sm text-gray-500">
                          Qty: {asset.quantity}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {gainLoss ? (
                        <div className="flex items-center">
                          {gainLoss.amount >= 0 ? (
                            <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                          )}
                          <div className={gainLoss.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                            <div className="text-sm font-medium">
                              {formatCurrency(Math.abs(gainLoss.amount))}
                            </div>
                            <div className="text-xs">
                              ({gainLoss.percentage}%)
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(asset)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(asset.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {assets.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No assets found. Add your first asset to get started.
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
};

export default AssetManagement;