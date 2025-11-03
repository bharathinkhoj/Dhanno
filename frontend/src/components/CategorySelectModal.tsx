import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { categoryApi } from '../api/api';
import api from '../api/api';

interface CategorySelectModalProps {
  transaction: {
    id: string;
    description: string;
    amount: number;
    category?: { id: string; name: string; color: string } | null;
  };
  isOpen: boolean;
  onClose: () => void;
}

const CategorySelectModal: React.FC<CategorySelectModalProps> = ({
  transaction,
  isOpen,
  onClose
}) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    transaction.category?.id || ''
  );
  const [searchTerm, setSearchTerm] = useState<string>('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Auto-focus search input when modal opens and reset search when closed
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    } else if (!isOpen) {
      setSearchTerm(''); // Reset search when modal closes
    }
  }, [isOpen]);

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && searchTerm) {
      e.stopPropagation(); // Prevent modal from closing
      setSearchTerm('');
      searchInputRef.current?.focus();
    }
  };

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryApi.getAll().then(r => r.data),
  });

  const updateCategoryMutation = useMutation({
    mutationFn: (categoryId: string) => 
      api.put(`/learning/${transaction.id}/category`, { categoryId }),
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['spending-by-category'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      
      // Show success message
      alert('Category updated! This correction will improve future AI categorization.');
      onClose();
    },
    onError: (error: any) => {
      console.error('Error updating category:', error);
      alert(error.response?.data?.error || 'Failed to update category');
    }
  });

  const handleSave = () => {
    if (selectedCategoryId) {
      updateCategoryMutation.mutate(selectedCategoryId);
    }
  };

  if (!isOpen) return null;

  // Filter categories based on search term
  const filteredCategories = useMemo(() => {
    if (!categories) return [];
    
    if (!searchTerm.trim()) {
      return categories;
    }
    
    return categories.filter((category: any) =>
      category.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [categories, searchTerm]);

  // Group filtered categories by type
  const groupedCategories = filteredCategories?.reduce((acc: any, category: any) => {
    if (!acc[category.type]) {
      acc[category.type] = [];
    }
    acc[category.type].push(category);
    return acc;
  }, {}) || {};

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold text-white mb-4">Update Category</h2>
        
        <div className="mb-4">
          <p className="text-gray-300 text-sm mb-2">Transaction:</p>
          <p className="text-white font-medium">{transaction.description}</p>
          <p className="text-gray-400 text-sm">
            ₹{Math.abs(transaction.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-gray-300 text-sm font-medium mb-2">
            Select Category
          </label>
          
          {/* Search Input */}
          <div className="mb-4">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <svg
                  className="h-4 w-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>
            {searchTerm && (
              <div className="mt-2 text-xs text-gray-400">
                {filteredCategories.length} categories found
              </div>
            )}
          </div>
          
          <div className="max-h-60 overflow-y-auto space-y-3">
            {Object.keys(groupedCategories).length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 text-sm">
                  {searchTerm ? 'No categories found matching your search.' : 'No categories available.'}
                </p>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="mt-2 text-blue-400 hover:text-blue-300 text-xs underline"
                  >
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              Object.entries(groupedCategories).map(([type, cats]: [string, any]) => (
                <div key={type}>
                  <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-2">
                    {type}
                  </h3>
                  <div className="space-y-1">
                    {cats.map((category: any) => (
                      <label
                        key={category.id}
                        className="flex items-center p-2 rounded cursor-pointer hover:bg-gray-700"
                      >
                        <input
                          type="radio"
                          name="category"
                          value={category.id}
                          checked={selectedCategoryId === category.id}
                          onChange={(e) => setSelectedCategoryId(e.target.value)}
                          className="mr-3"
                        />
                        <div
                          className="w-3 h-3 rounded mr-3"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="text-white text-sm">{category.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            disabled={updateCategoryMutation.isPending}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!selectedCategoryId || updateCategoryMutation.isPending}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {updateCategoryMutation.isPending ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </div>
            ) : (
              'Save & Learn'
            )}
          </button>
        </div>

        <div className="mt-3 text-xs text-gray-400">
          💡 Your correction will be remembered to improve future AI categorization
        </div>
      </div>
    </div>
  );
};

export default CategorySelectModal;