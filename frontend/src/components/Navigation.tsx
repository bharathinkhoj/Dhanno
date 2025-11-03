import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BarChart3, Wallet, FolderOpen } from 'lucide-react';

const Navigation: React.FC = () => {
  const location = useLocation();
  
  const navItems = [
    { path: '/dashboard', name: 'Dashboard', icon: BarChart3 },
    { path: '/assets', name: 'Assets', icon: Wallet },
    { path: '/categories', name: 'Categories', icon: FolderOpen },
  ];

  return (
    <nav className="bg-slate-800 border-b border-slate-700 mb-6">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex space-x-8">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-2 px-3 py-4 border-b-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-300 hover:text-white hover:border-gray-300'
                }`}
              >
                <IconComponent className="h-4 w-4" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;