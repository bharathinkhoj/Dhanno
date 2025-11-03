import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Token is invalid or expired
      localStorage.removeItem('token');
      // Redirect to login page
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon?: string;
  type: 'income' | 'expense' | 'investment' | 'asset';
  isDefault: boolean;
  parentId?: string;
  children?: Category[];
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  merchant?: string;
  type: 'income' | 'expense' | 'asset';
  categoryId?: string;
  category?: Category;
  notes?: string;
  tags: string[];
  attachments: string[];
  isRecurring: boolean;
  llmCategorized: boolean;
  llmConfidence?: number;
  source?: string; // Bank/Account source
  createdAt: string;
  updatedAt: string;
}

export interface CreateTransactionDto {
  date: string;
  description: string;
  amount: number;
  merchant?: string;
  type: 'income' | 'expense' | 'investment' | 'asset';
  categoryId?: string;
  notes?: string;
  tags?: string[];
  isRecurring?: boolean;
}

export interface SpendingByCategory {
  categoryId: string;
  categoryName: string;
  color: string;
  total: number;
  count: number;
}

export interface MonthlyTrend {
  month: string;
  income: number;
  expense: number;
  net: number;
}

export interface CategoryTrendData {
  month: string;
  [categoryName: string]: number | string; // Dynamic category names as keys
}

export interface CategoryTrendMetadata {
  id: string;
  name: string;
  color: string;
}

export interface CategoryTrendsResponse {
  data: CategoryTrendData[];
  categories: CategoryTrendMetadata[];
}

export interface Summary {
  totalIncome: number;
  totalExpense: number;
  totalAssetTransactions: number;
  netCashFlow: number;
  transactionCount: number;
  cashFlowRate: number;
}

// Auth API
export const authApi = {
  register: (data: { email: string; password: string; name?: string }) =>
    api.post<{ token: string; user: User }>('/auth/register', data),
  
  login: (data: { email: string; password: string }) =>
    api.post<{ token: string; user: User }>('/auth/login', data),
};

// Transaction API response with pagination
export interface TransactionResponse {
  transactions: Transaction[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

// Transaction API
export const transactionApi = {
  getAll: (params?: { 
    startDate?: string; 
    endDate?: string; 
    categoryId?: string; 
    type?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: number;
    limit?: number;
    amountMin?: string;
    amountMax?: string;
  }) =>
    api.get<TransactionResponse | Transaction[]>('/transactions', { params }).then(response => {
      // Handle backward compatibility - if response is array, wrap it
      if (Array.isArray(response.data)) {
        return {
          ...response,
          data: {
            transactions: response.data,
            pagination: {
              currentPage: 1,
              totalPages: 1,
              totalCount: response.data.length,
              limit: response.data.length,
              hasNextPage: false,
              hasPreviousPage: false,
            }
          }
        };
      }
      return response;
    }),
  
  getOne: (id: string) =>
    api.get<Transaction>(`/transactions/${id}`),
  
  create: (data: CreateTransactionDto) =>
    api.post<Transaction>('/transactions', data),
  
  update: (id: string, data: Partial<CreateTransactionDto>) =>
    api.put<Transaction>(`/transactions/${id}`, data),
  
  delete: (id: string) =>
    api.delete(`/transactions/${id}`),
  
  bulkCategorize: (transactionIds: string[]) =>
    api.post('/transactions/bulk-categorize', { transactionIds }),
};

// Category API
export const categoryApi = {
  getAll: () =>
    api.get<Category[]>('/categories'),
  
  create: (data: { name: string; color: string; icon?: string; type: 'income' | 'expense' | 'investment' | 'asset'; parentId?: string }) =>
    api.post<Category>('/categories', data),
  
  update: (id: string, data: Partial<{ name: string; color: string; icon?: string }>) =>
    api.put<Category>(`/categories/${id}`, data),
  
  delete: (id: string) =>
    api.delete(`/categories/${id}`),
};

// Analytics API
export const analyticsApi = {
  getSpendingByCategory: (params?: { startDate?: string; endDate?: string; type?: string }) =>
    api.get<SpendingByCategory[]>('/analytics/spending-by-category', { params }),
  
  getMonthlyTrends: (months?: number, categoryId?: string) =>
    api.get<MonthlyTrend[]>('/analytics/monthly-trends', { params: { months, categoryId } }),
  
  getCategoryTrends: (months?: number, categoryIds?: string[]) =>
    api.get<CategoryTrendsResponse>('/analytics/category-trends', { 
      params: { months, categoryIds: categoryIds?.join(',') } 
    }),
  
  getSummary: (params?: { startDate?: string; endDate?: string }) =>
    api.get<Summary>('/analytics/summary', { params }),
};

// CSV API
export const csvApi = {
  preview: (file: File) => {
    const formData = new FormData();
    formData.append('csvFile', file);
    const token = localStorage.getItem('token');
    return api.post('/csv/preview', formData, {
      headers: { 
        'Content-Type': 'multipart/form-data',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
    });
  },
  
  import: (file: File, customMapping?: any, skipDuplicates = true, source?: string) => {
    const formData = new FormData();
    formData.append('csvFile', file);
    if (customMapping) {
      formData.append('customMapping', JSON.stringify(customMapping));
    }
    formData.append('skipDuplicates', skipDuplicates.toString());
    if (source) {
      formData.append('source', source);
    }
    const token = localStorage.getItem('token');
    return api.post('/csv/import', formData, {
      headers: { 
        'Content-Type': 'multipart/form-data',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
    });
  },
};

export default api;
