import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/api';

interface RecategorizeButtonProps {
  onSuccess?: () => void;
}

const RecategorizeButton: React.FC<RecategorizeButtonProps> = ({ onSuccess }) => {
  const [isRecategorizing, setIsRecategorizing] = useState(false);
  const queryClient = useQueryClient();

  const recategorizeMutation = useMutation({
    mutationFn: () => api.post('/recategorize/recategorize-all'),
    onSuccess: (response) => {
      alert(response.data.message || 'Recategorization completed successfully!');
      // Invalidate relevant queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['spending-by-category'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      onSuccess?.();
    },
    onError: (error: any) => {
      console.error('Recategorization error:', error);
      alert(error.response?.data?.error || 'Failed to recategorize transactions');
    },
    onSettled: () => {
      setIsRecategorizing(false);
    }
  });

  const handleRecategorize = () => {
    const confirm = window.confirm(
      'This will recategorize ALL your transactions using improved AI. This may take a few minutes. Continue?'
    );
    
    if (confirm) {
      setIsRecategorizing(true);
      recategorizeMutation.mutate();
    }
  };

  return (
    <button
      onClick={handleRecategorize}
      disabled={isRecategorizing || recategorizeMutation.isPending}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
    >
      {isRecategorizing || recategorizeMutation.isPending ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          Recategorizing...
        </>
      ) : (
        <>
          🤖 Improve AI Categories
        </>
      )}
    </button>
  );
};

export default RecategorizeButton;