import React, { useState, useMemo } from 'react';
import { Transaction } from '../api/api';
import { format } from 'date-fns';
import { formatCurrency } from '../utils/currency';
import CategorySelectModal from './CategorySelectModal';

interface Props {
  transactions: Transaction[];
}

type SortField = 'date' | 'description' | 'amount' | 'category' | 'type';
type SortOrder = 'asc' | 'desc';

export const TransactionList: React.FC<Props> = ({ transactions }) => {
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Filter and sort transactions
  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = transactions;

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(transaction => 
        transaction.description.toLowerCase().includes(term) ||
        transaction.merchant?.toLowerCase().includes(term) ||
        transaction.category?.name.toLowerCase().includes(term) ||
        transaction.amount.toString().includes(term)
      );
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(transaction => transaction.type === typeFilter);
    }

    // Sort transactions
    return [...filtered].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'date':
          aValue = new Date(a.date);
          bValue = new Date(b.date);
          break;
        case 'description':
          aValue = a.description.toLowerCase();
          bValue = b.description.toLowerCase();
          break;
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'category':
          aValue = a.category?.name?.toLowerCase() || '';
          bValue = b.category?.name?.toLowerCase() || '';
          break;
        case 'type':
          aValue = a.type;
          bValue = b.type;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [transactions, searchTerm, sortField, sortOrder, typeFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedTransactions.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedTransactions = filteredAndSortedTransactions.slice(startIndex, startIndex + pageSize);

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Reset pagination when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, typeFilter]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="text-gray-500">⇅</span>;
    return sortOrder === 'asc' ? <span className="text-blue-400">↑</span> : <span className="text-blue-400">↓</span>;
  };

  if (!transactions || transactions.length === 0) {
    return <div className="text-gray-400 text-center py-8">No transactions found</div>;
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4 p-4 bg-slate-800 rounded-lg">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
            <option value="asset">Asset</option>
          </select>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={5}>5 per page</option>
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
          </select>
        </div>
      </div>

      {/* Results Summary */}
      <div className="text-gray-400 text-sm px-4">
        Showing {Math.min(startIndex + 1, filteredAndSortedTransactions.length)}-{Math.min(startIndex + pageSize, filteredAndSortedTransactions.length)} of {filteredAndSortedTransactions.length} transactions
      </div>

      {/* Transaction Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-gray-400 border-b border-slate-700">
              <th className="pb-3 cursor-pointer hover:text-white" onClick={() => handleSort('date')}>
                <div className="flex items-center gap-1">
                  Date <SortIcon field="date" />
                </div>
              </th>
              <th className="pb-3 cursor-pointer hover:text-white" onClick={() => handleSort('description')}>
                <div className="flex items-center gap-1">
                  Description <SortIcon field="description" />
                </div>
              </th>
              <th className="pb-3 cursor-pointer hover:text-white" onClick={() => handleSort('category')}>
                <div className="flex items-center gap-1">
                  Category <SortIcon field="category" />
                </div>
              </th>
              <th className="pb-3 cursor-pointer hover:text-white" onClick={() => handleSort('amount')}>
                <div className="flex items-center gap-1">
                  Amount <SortIcon field="amount" />
                </div>
              </th>
              <th className="pb-3 cursor-pointer hover:text-white" onClick={() => handleSort('type')}>
                <div className="flex items-center gap-1">
                  Type <SortIcon field="type" />
                </div>
              </th>
              <th className="pb-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedTransactions.map((transaction) => (
            <tr key={transaction.id} className="border-b border-slate-700 hover:bg-slate-700/50">
              <td className="py-3 text-gray-300">
                {format(new Date(transaction.date), 'MMM dd, yyyy')}
              </td>
              <td className="py-3">
                <div className="text-white font-medium">{transaction.description}</div>
                {transaction.merchant && (
                  <div className="text-gray-400 text-sm">{transaction.merchant}</div>
                )}
                {transaction.notes && (
                  <div className="text-gray-500 text-sm italic mt-1">{transaction.notes}</div>
                )}
              </td>
              <td className="py-3">
                {transaction.category ? (
                  <span
                    className="px-3 py-1 rounded-full text-sm"
                    style={{ backgroundColor: transaction.category.color + '20', color: transaction.category.color }}
                  >
                    {transaction.category.icon} {transaction.category.name}
                  </span>
                ) : (
                  <span className="text-gray-500 text-sm">Uncategorized</span>
                )}
                {transaction.llmCategorized && (
                  <span className="ml-2 text-xs text-indigo-400" title={`AI Confidence: ${((transaction.llmConfidence || 0) * 100).toFixed(0)}%`}>
                    🤖
                  </span>
                )}
              </td>
              <td className={`py-3 font-semibold ${
                transaction.type === 'income' ? 'text-green-400' : 
                transaction.type === 'asset' ? 'text-blue-400' : 'text-red-400'
              }`}>
                {transaction.type === 'income' ? '+' : 
                 transaction.type === 'asset' ? '↔' : '-'}{formatCurrency(transaction.amount).replace('₹', '₹')}
              </td>
              <td className="py-3">
                <span className={`px-2 py-1 rounded text-xs ${
                  transaction.type === 'income' ? 'bg-green-900/30 text-green-400' : 
                  transaction.type === 'asset' ? 'bg-blue-900/30 text-blue-400' : 'bg-red-900/30 text-red-400'
                }`}>
                  {transaction.type}
                </span>
              </td>
              <td className="py-3">
                <button
                  onClick={() => setEditingTransaction(transaction)}
                  className="text-xs bg-gray-600 hover:bg-gray-500 text-white px-2 py-1 rounded transition-colors"
                  title="Edit category (this will improve AI learning)"
                >
                  📝 Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center px-4 py-3 bg-slate-800 rounded-lg">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-slate-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-600"
            >
              Previous
            </button>
            <span className="text-gray-300 text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 bg-slate-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-600"
            >
              Next
            </button>
          </div>
          
          {/* Quick page jumps */}
          <div className="flex gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = i + 1;
              const isCurrentPage = pageNum === currentPage;
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-2 py-1 text-sm rounded ${
                    isCurrentPage 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            {totalPages > 5 && (
              <>
                <span className="px-2 py-1 text-gray-400">...</span>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  className={`px-2 py-1 text-sm rounded ${
                    currentPage === totalPages 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                  }`}
                >
                  {totalPages}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {editingTransaction && (
        <CategorySelectModal
          transaction={editingTransaction}
          isOpen={!!editingTransaction}
          onClose={() => setEditingTransaction(null)}
        />
      )}
    </div>
  );
};
