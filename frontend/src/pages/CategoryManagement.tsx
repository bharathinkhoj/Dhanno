import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, FolderPlus, Tag, Save, X } from 'lucide-react';
import Navigation from '../components/Navigation';

interface Category {
  id: string;
  name: string;
  type: string;
  color: string;
  icon: string;
  isDefault: boolean;
  parentId?: string;
  children?: Category[];
  createdAt: string;
  updatedAt: string;
}

interface CategoryFormData {
  name: string;
  type: string;
  color: string;
  icon: string;
  parentId?: string;
}

const CategoryManagement: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    type: 'expense',
    color: '#3b82f6',
    icon: '📝',
    parentId: undefined,
  });
  const [selectedType, setSelectedType] = useState<string>('all');

  const categoryTypes = [
    { value: 'income', label: 'Income', color: 'text-green-600' },
    { value: 'expense', label: 'Expense', color: 'text-red-600' },
    { value: 'asset', label: 'Asset', color: 'text-blue-600' },
  ];

  const defaultColors = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
    '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
    '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#64748b'
  ];

  const defaultIcons = [
    '📝', '💰', '🏠', '🚗', '🍔', '⚡', '📱', '🎬', '🛒', '💊',
    '📚', '✈️', '💳', '🏦', '📊', '💼', '🎯', '🔧', '🎁', '☕'
  ];

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/categories', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        // Build hierarchy
        const categoryMap = new Map();
        data.forEach((cat: Category) => {
          categoryMap.set(cat.id, { ...cat, children: [] });
        });

        const rootCategories: Category[] = [];
        data.forEach((cat: Category) => {
          const category = categoryMap.get(cat.id);
          if (cat.parentId) {
            const parent = categoryMap.get(cat.parentId);
            if (parent) {
              parent.children.push(category);
            }
          } else {
            rootCategories.push(category);
          }
        });

        setCategories(rootCategories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const url = editingCategory ? `/api/categories/${editingCategory.id}` : '/api/categories';
      const method = editingCategory ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchCategories();
        resetForm();
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to save category');
      }
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Failed to save category');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      type: category.type,
      color: category.color,
      icon: category.icon,
      parentId: category.parentId || undefined,
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id: string, name: string, isDefault: boolean) => {
    if (isDefault) {
      alert('Default categories cannot be deleted');
      return;
    }

    if (!confirm(`Are you sure you want to delete "${name}"? This will also delete all subcategories and may affect existing transactions.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await fetchCategories();
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to delete category');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Failed to delete category');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'expense',
      color: '#3b82f6',
      icon: '📝',
      parentId: undefined,
    });
    setEditingCategory(null);
    setShowAddForm(false);
  };

  const getFilteredCategories = () => {
    if (selectedType === 'all') return categories;
    return categories.filter(cat => cat.type === selectedType);
  };

  const getParentOptions = () => {
    return categories
      .filter(cat => cat.type === formData.type && !cat.parentId)
      .map(cat => ({ value: cat.id, label: cat.name }));
  };

  const renderCategory = (category: Category, level: number = 0) => {
    const hasChildren = category.children && category.children.length > 0;
    const paddingLeft = level * 20;

    return (
      <div key={category.id}>
        <div 
          className="flex items-center justify-between p-4 bg-white border rounded-lg shadow-sm mb-2"
          style={{ marginLeft: `${paddingLeft}px` }}
        >
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{category.icon}</span>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-medium text-gray-900">{category.name}</h3>
                <span
                  className="px-2 py-1 rounded-full text-xs font-medium"
                  style={{ backgroundColor: category.color + '20', color: category.color }}
                >
                  {category.type}
                </span>
                {category.isDefault && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                    Default
                  </span>
                )}
                {hasChildren && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-600 rounded-full text-xs">
                    {category.children?.length} subcategories
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <div 
                  className="w-4 h-4 rounded-full border"
                  style={{ backgroundColor: category.color }}
                />
                <span>Created: {new Date(category.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleEdit(category)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
              title="Edit category"
            >
              <Edit2 className="h-4 w-4" />
            </button>
            {!category.isDefault && (
              <button
                onClick={() => handleDelete(category.id, category.name, category.isDefault)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                title="Delete category"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        
        {/* Render subcategories */}
        {hasChildren && category.children?.map(child => renderCategory(child, level + 1))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <Navigation />
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Category Management</h1>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Category
          </button>
        </div>

        {/* Category Type Filter */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center space-x-4">
            <span className="font-medium text-gray-700">Filter by type:</span>
            <div className="flex space-x-2">
              <button
                onClick={() => setSelectedType('all')}
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  selectedType === 'all'
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                All
              </button>
              {categoryTypes.map(type => (
                <button
                  key={type.value}
                  onClick={() => setSelectedType(type.value)}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    selectedType === type.value
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Add/Edit Category Form */}
        {showAddForm && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              {editingCategory ? <Edit2 className="h-5 w-5" /> : <FolderPlus className="h-5 w-5" />}
              {editingCategory ? 'Edit Category' : 'Add New Category'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full input-flat"
                    placeholder="Enter category name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type *
                  </label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value, parentId: undefined })}
                    className="w-full dropdown-flat"
                  >
                    {categoryTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Parent Category (Optional)
                  </label>
                  <select
                    value={formData.parentId || ''}
                    onChange={(e) => setFormData({ ...formData, parentId: e.target.value || undefined })}
                    className="w-full dropdown-flat"
                  >
                    <option value="">None (Main Category)</option>
                    {getParentOptions().map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Icon *
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      className="flex-1 input-flat"
                      placeholder="Enter emoji"
                    />
                    <div className="flex space-x-1">
                      {defaultIcons.slice(0, 5).map(icon => (
                        <button
                          key={icon}
                          type="button"
                          onClick={() => setFormData({ ...formData, icon })}
                          className="p-2 border rounded hover:bg-gray-50"
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-10 gap-1">
                    {defaultIcons.slice(5).map(icon => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setFormData({ ...formData, icon })}
                        className="p-1 border rounded hover:bg-gray-50 text-sm"
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Color *
                  </label>
                  <div className="flex items-center space-x-2 mb-2">
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="flex-1 input-flat"
                      placeholder="#3b82f6"
                    />
                  </div>
                  <div className="grid grid-cols-9 gap-1">
                    {defaultColors.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, color })}
                        className="w-8 h-8 rounded border border-gray-300 hover:scale-110 transition-transform"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Preview:</h4>
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{formData.icon}</span>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{formData.name || 'Category Name'}</span>
                      <span
                        className="px-2 py-1 rounded-full text-xs font-medium"
                        style={{ backgroundColor: formData.color + '20', color: formData.color }}
                      >
                        {formData.type}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md disabled:opacity-50 flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {loading ? 'Saving...' : editingCategory ? 'Update Category' : 'Add Category'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-2 rounded-md flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Categories List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Categories ({getFilteredCategories().length})
          </h2>
          
          {getFilteredCategories().length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              <FolderPlus className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No categories found for the selected filter.</p>
              <p className="text-sm">Add a new category to get started.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {getFilteredCategories().map(category => renderCategory(category))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CategoryManagement;