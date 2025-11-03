import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Transaction, transactionApi } from '../api/api';
import { format } from 'date-fns';
import { formatCurrency } from '../utils/currency';
import CategorySelectModal from './CategorySelectModal';

interface Props {
  startDate?: string;
  endDate?: string;
  initialCategoryId?: string;
  initialType?: string;
}

type SortField = 'date' | 'description' | 'amount' | 'category' | 'type';
type SortOrder = 'asc' | 'desc';

export const EnhancedTransactionList: React.FC<Props> = ({ 
  startDate, 
  endDate, 
  initialCategoryId, 
  initialType 
}) => {
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [typeFilter, setTypeFilter] = useState<string>(initialType || 'all');
  const [categoryFilter, setCategoryFilter] = useState<string>(initialCategoryId || 'all');
  
  // Enhanced search filters
  const [descriptionSearch, setDescriptionSearch] = useState('');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');
  const [dateFrom, setDateFrom] = useState(startDate || '');
  const [dateTo, setDateTo] = useState(endDate || '');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Server-side filtering with debounced search
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  const [debouncedDescSearch, setDebouncedDescSearch] = useState(descriptionSearch);

  // Debounce search inputs
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedDescSearch(descriptionSearch);
    }, 500);
    return () => clearTimeout(timer);
  }, [descriptionSearch]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, debouncedDescSearch, typeFilter, categoryFilter, sortField, sortOrder, amountMin, amountMax, dateFrom, dateTo]);

  // Fetch transactions with enhanced filtering
  const { data: transactionResponse, isLoading, error } = useQuery({
    queryKey: ['transactions', {
      startDate: dateFrom || startDate,
      endDate: dateTo || endDate,
      search: debouncedSearch || debouncedDescSearch, // Use either search term
      type: typeFilter !== 'all' ? typeFilter : undefined,
      categoryId: categoryFilter !== 'all' ? categoryFilter : undefined,
      sortBy: sortField,
      sortOrder,
      page: currentPage,
      limit: pageSize,
      amountMin: amountMin || undefined,
      amountMax: amountMax || undefined
    }],
    queryFn: () => transactionApi.getAll({
      startDate: dateFrom || startDate,
      endDate: dateTo || endDate,
      search: debouncedSearch || debouncedDescSearch || undefined,
      type: typeFilter !== 'all' ? typeFilter : undefined,
      categoryId: categoryFilter !== 'all' ? categoryFilter : undefined,
      sortBy: sortField,
      sortOrder,
      page: currentPage,
      limit: pageSize,
      amountMin: amountMin || undefined,
      amountMax: amountMax || undefined
    }).then(r => r.data),
  });

  // Handle response type safely - use server-side pagination
  const isArrayResponse = Array.isArray(transactionResponse);
  const rawTransactions = isArrayResponse 
    ? transactionResponse 
    : transactionResponse?.transactions || [];

  // Use server-side pagination data if available
  const pagination = !isArrayResponse && transactionResponse?.pagination ? 
    transactionResponse.pagination : {
    currentPage: 1,
    totalPages: 1,
    totalCount: rawTransactions.length,
    limit: pageSize,
    hasNextPage: false,
    hasPreviousPage: false,
  };

  // Use transactions directly from server (already filtered and paginated)
  const transactions = rawTransactions;

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="text-gray-500">⇅</span>;
    return sortOrder === 'asc' ? <span className="text-blue-400">↑</span> : <span className="text-blue-400">↓</span>;
  };

  if (error) {
    return <div className="text-red-400 text-center py-8">Error loading transactions</div>;
  }

  return (
    <div className="space-y-4">
      {/* Enhanced Search and Filter Controls */}
      <div className="space-y-4 p-4 bg-slate-800 rounded-lg">
        {/* Basic Search Row */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search all fields (amount, description, merchant, notes)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full input-flat bg-slate-700 text-white placeholder-gray-400"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="dropdown-flat bg-slate-700 text-white"
            >
              <option value="all">All Types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
              <option value="asset">Asset</option>
            </select>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="dropdown-flat bg-slate-700 text-white"
            >
              <option value={5}>5 per page</option>
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded border-none transition-colors"
            >
              {showAdvancedFilters ? '📤 Hide Filters' : '📥 More Filters'}
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 pt-4 border-t border-slate-700">
            <div>
              <label className="block text-gray-400 text-sm mb-2">Description Search</label>
              <input
                type="text"
                placeholder="Search description only..."
                value={descriptionSearch}
                onChange={(e) => setDescriptionSearch(e.target.value)}
                className="w-full input-flat bg-slate-700 text-white placeholder-gray-400"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-2">Category Filter</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full dropdown-flat bg-slate-700 text-white"
              >
                <option value="all">All Categories</option>
                {/* Categories will be loaded dynamically - for now just show placeholder */}
              </select>
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-2">Amount Range</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  placeholder="Min ₹"
                  value={amountMin}
                  onChange={(e) => setAmountMin(e.target.value)}
                  className="w-full input-flat bg-slate-700 text-white placeholder-gray-400"
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Max ₹"
                  value={amountMax}
                  onChange={(e) => setAmountMax(e.target.value)}
                  className="w-full input-flat bg-slate-700 text-white placeholder-gray-400"
                />
              </div>
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-2">Date Range</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full input-flat bg-slate-700 text-white"
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full input-flat bg-slate-700 text-white"
                />
              </div>
            </div>
            <div className="flex flex-col justify-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setDescriptionSearch('');
                  setAmountMin('');
                  setAmountMax('');
                  setDateFrom(startDate || '');
                  setDateTo(endDate || '');
                  setTypeFilter('all');
                  setCategoryFilter('all');
                }}
                className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded border-none transition-colors"
              >
                🗑️ Clear All
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results Summary and Active Filters */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-2 text-gray-400 text-sm px-4">

        <div>
          {isLoading ? (
            <span>Loading...</span>
          ) : (
            <span>
              Showing {Math.min((currentPage - 1) * pageSize + 1, pagination.totalCount)}-{Math.min(currentPage * pageSize, pagination.totalCount)} of {pagination.totalCount} transactions
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {debouncedSearch && (
            <span className="px-2 py-1 bg-blue-900/30 text-blue-400 rounded">
              🔍 General: "{debouncedSearch}"
            </span>
          )}
          {debouncedDescSearch && (
            <span className="px-2 py-1 bg-green-900/30 text-green-400 rounded">
              📝 Description: "{debouncedDescSearch}"
            </span>
          )}
          {(amountMin || amountMax) && (
            <span className="px-2 py-1 bg-yellow-900/30 text-yellow-400 rounded">
              💰 Amount: {amountMin ? `₹${amountMin}` : '₹0'} - {amountMax ? `₹${amountMax}` : '∞'}
            </span>
          )}
          {(dateFrom !== (startDate || '') || dateTo !== (endDate || '')) && (
            <span className="px-2 py-1 bg-purple-900/30 text-purple-400 rounded">
              📅 Custom Date Range
            </span>
          )}
          {typeFilter !== 'all' && (
            <span className="px-2 py-1 bg-indigo-900/30 text-indigo-400 rounded">
              🏷️ Type: {typeFilter}
            </span>
          )}
          {categoryFilter !== 'all' && (
            <span className="px-2 py-1 bg-pink-900/30 text-pink-400 rounded">
              📂 Category Filter
            </span>
          )}
        </div>
      </div>

      {/* Transaction Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-gray-400 border-b border-slate-700">
              <th className="pb-3 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('date')}>
                <div className="flex items-center gap-1">
                  Date <SortIcon field="date" />
                </div>
              </th>
              <th className="pb-3 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('description')}>
                <div className="flex items-center gap-1">
                  Description <SortIcon field="description" />
                </div>
              </th>
              <th className="pb-3 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('category')}>
                <div className="flex items-center gap-1">
                  Category <SortIcon field="category" />
                </div>
              </th>
              <th className="pb-3 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('amount')}>
                <div className="flex items-center gap-1">
                  Amount <SortIcon field="amount" />
                </div>
              </th>
              <th className="pb-3 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('type')}>
                <div className="flex items-center gap-1">
                  Type <SortIcon field="type" />
                </div>
              </th>
              <th className="pb-3">Source</th>
              <th className="pb-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-400">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
                    <span>Loading transactions...</span>
                  </div>
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-400">
                  {(searchTerm || descriptionSearch || amountMin || amountMax || dateFrom !== (startDate || '') || dateTo !== (endDate || '')) 
                    ? 'No transactions match your filters' 
                    : 'No transactions found'}
                </td>
              </tr>
            ) : (
              transactions.map((transaction: Transaction) => (
                <tr key={transaction.id} className="border-b border-slate-700 hover:bg-slate-700/50 transition-colors">
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
                    <span className="text-gray-400 text-sm">
                      {transaction.source || 'Manual Entry'}
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
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {pagination.totalCount > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-4 py-3 bg-slate-800 rounded-lg">
          <div className="flex items-center gap-2">
            {pagination.totalPages > 1 && (
              <>
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={!pagination.hasPreviousPage}
                  className="px-3 py-1 bg-slate-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-600 transition-colors"
                >
                  Previous
                </button>
                <span className="text-gray-300 text-sm">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))}
                  disabled={!pagination.hasNextPage}
                  className="px-3 py-1 bg-slate-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-600 transition-colors"
                >
                  Next
                </button>
              </>
            )}
            {pagination.totalPages === 1 && (
              <span className="text-gray-300 text-sm">
                All {pagination.totalCount} transactions shown
              </span>
            )}
            {pagination.totalPages > 5 && (
              <div className="flex items-center gap-2 ml-4">
                <span className="text-gray-400 text-xs">Go to:</span>
                <input
                  type="number"
                  min="1"
                  max={pagination.totalPages}
                  value={currentPage}
                  onChange={(e) => {
                    const page = parseInt(e.target.value);
                    if (page >= 1 && page <= pagination.totalPages) {
                      setCurrentPage(page);
                    }
                  }}
                  className="w-16 px-2 py-1 text-xs bg-slate-700 text-white border border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
          
          {/* Quick page jumps */}
          {pagination.totalPages > 1 && (
            <div className="flex gap-1 flex-wrap justify-center">
            {(() => {
              const pages = [];
              const totalPages = pagination.totalPages;
              const current = currentPage;
              
              if (totalPages <= 7) {
                // Show all pages if total is 7 or less
                for (let i = 1; i <= totalPages; i++) {
                  pages.push(
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i)}
                      className={`px-2 py-1 text-sm rounded transition-colors ${
                        i === currentPage 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                      }`}
                    >
                      {i}
                    </button>
                  );
                }
              } else {
                // Complex pagination for more than 7 pages
                
                // Always show first page
                pages.push(
                  <button
                    key={1}
                    onClick={() => setCurrentPage(1)}
                    className={`px-2 py-1 text-sm rounded transition-colors ${
                      current === 1 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                    }`}
                  >
                    1
                  </button>
                );
                
                // Show ellipsis after 1 if needed
                if (current > 3) {
                  pages.push(
                    <span key="ellipsis1" className="px-2 py-1 text-gray-400">...</span>
                  );
                }
                
                // Show pages around current
                const start = Math.max(2, current - 1);
                const end = Math.min(totalPages - 1, current + 1);
                
                for (let i = start; i <= end; i++) {
                  if (i !== 1 && i !== totalPages) {
                    pages.push(
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i)}
                        className={`px-2 py-1 text-sm rounded transition-colors ${
                          i === current 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                        }`}
                      >
                        {i}
                      </button>
                    );
                  }
                }
                
                // Show ellipsis before last if needed
                if (current < totalPages - 2) {
                  pages.push(
                    <span key="ellipsis2" className="px-2 py-1 text-gray-400">...</span>
                  );
                }
                
                // Always show last page if more than 1 page
                if (totalPages > 1) {
                  pages.push(
                    <button
                      key={totalPages}
                      onClick={() => setCurrentPage(totalPages)}
                      className={`px-2 py-1 text-sm rounded transition-colors ${
                        current === totalPages 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                      }`}
                    >
                      {totalPages}
                    </button>
                  );
                }
              }
              
              return pages;
            })()}
            </div>
          )}
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