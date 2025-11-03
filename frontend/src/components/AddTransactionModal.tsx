import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { transactionApi, categoryApi, CreateTransactionDto } from '../api/api';

interface Props {
  onClose: () => void;
}

export const AddTransactionModal: React.FC<Props> = ({ onClose }) => {
  const [formData, setFormData] = useState<CreateTransactionDto>({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: 0,
    type: 'expense',
    merchant: '',
    notes: '',
    tags: [],
  });

  const queryClient = useQueryClient();

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryApi.getAll().then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateTransactionDto) => transactionApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      queryClient.invalidateQueries({ queryKey: ['spending-by-category'] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const filteredCategories = categories?.filter(c => c.type === formData.type) || [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Add Transaction</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Date
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="input w-full"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as 'income' | 'expense' | 'investment', categoryId: undefined })}
                className="input w-full"
              >
                <option value="expense">💸 Expense</option>
                <option value="income">💰 Income</option>
                <option value="investment">📈 Investment</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description *
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input w-full"
              placeholder="e.g., Groceries at Whole Foods"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Amount *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.amount || ''}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                className="input w-full"
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Merchant
              </label>
              <input
                type="text"
                value={formData.merchant}
                onChange={(e) => setFormData({ ...formData, merchant: e.target.value })}
                className="input w-full"
                placeholder="Store name"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Category (Leave empty for AI categorization 🤖)
            </label>
            <select
              value={formData.categoryId || ''}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value || undefined })}
              className="input w-full"
            >
              <option value="">Let AI categorize</option>
              {filteredCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input w-full"
              rows={3}
              placeholder="Additional notes..."
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="btn-primary flex-1"
            >
              {createMutation.isPending ? 'Adding...' : 'Add Transaction'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
