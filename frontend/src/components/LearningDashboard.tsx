import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/api';

const LearningDashboard: React.FC = () => {
  const { data: stats } = useQuery({
    queryKey: ['learning-stats'],
    queryFn: () => api.get('/learning/stats').then(r => r.data),
  });

  const { data: patterns } = useQuery({
    queryKey: ['learning-patterns'],
    queryFn: () => api.get('/learning/patterns').then(r => r.data.patterns),
  });

  if (!stats) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded mb-4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-xl font-bold text-white mb-6">🧠 AI Learning Progress</h3>
      
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-400">{stats.totalPatterns}</div>
          <div className="text-sm text-gray-400">Total Patterns</div>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-400">{stats.userCorrections}</div>
          <div className="text-sm text-gray-400">Your Corrections</div>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-400">{stats.aiPatterns}</div>
          <div className="text-sm text-gray-400">AI Patterns</div>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-400">
            {(stats.averageConfidence * 100).toFixed(0)}%
          </div>
          <div className="text-sm text-gray-400">Avg Confidence</div>
        </div>
      </div>

      {/* Recent Learning Patterns */}
      <div>
        <h4 className="text-lg font-semibold text-white mb-3">Recent Learning Patterns</h4>
        
        {patterns && patterns.length > 0 ? (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {patterns.slice(0, 10).map((pattern: any, index: number) => (
              <div key={index} className="bg-gray-700 rounded p-3 text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-white font-medium truncate">
                      {pattern.description}
                    </div>
                    {pattern.merchant && (
                      <div className="text-gray-400 text-xs">
                        Merchant: {pattern.merchant}
                      </div>
                    )}
                  </div>
                  
                  <div className="ml-4 flex items-center space-x-2">
                    <span className="px-2 py-1 rounded text-xs bg-blue-600 text-white">
                      {pattern.categoryName}
                    </span>
                    
                    <div className="text-right">
                      <div className="text-xs text-gray-400">
                        {(pattern.confidence * 100).toFixed(0)}%
                      </div>
                      <div className="text-xs">
                        {pattern.isUserCorrection ? (
                          <span className="text-green-400">👤 User</span>
                        ) : (
                          <span className="text-blue-400">🤖 AI</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-400 text-center py-4">
            No learning patterns yet. Start by manually correcting some transaction categories!
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="mt-6 bg-blue-900/30 border border-blue-600/30 rounded-lg p-4">
        <h5 className="text-blue-400 font-medium mb-2">💡 Learning Tips</h5>
        <ul className="text-sm text-gray-300 space-y-1">
          <li>• Manually correct transaction categories to teach the AI</li>
          <li>• The AI learns from your corrections and improves over time</li>
          <li>• Higher confidence patterns will be prioritized in future categorization</li>
          <li>• Use the "📝 Edit" button in transaction lists to make corrections</li>
        </ul>
      </div>
    </div>
  );
};

export default LearningDashboard;