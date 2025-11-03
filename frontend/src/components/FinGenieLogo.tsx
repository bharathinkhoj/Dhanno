import React from 'react';

interface FinGenieLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const FinGenieLogo: React.FC<FinGenieLogoProps> = ({ 
  className = '', 
  size = 'md' 
}) => {
  const sizeClasses = {
    sm: 'h-6 w-auto',
    md: 'h-8 w-auto',
    lg: 'h-12 w-auto'
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <svg
        className={sizeClasses[size]}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Genie lamp base */}
        <path
          d="M10 30 C10 25, 15 20, 20 20 C25 20, 30 25, 30 30 Z"
          fill="url(#lampGradient)"
          stroke="#3B82F6"
          strokeWidth="1"
        />
        
        {/* Genie lamp spout */}
        <path
          d="M20 20 C18 18, 16 16, 18 14 C20 12, 22 14, 22 16"
          fill="url(#spoutGradient)"
          stroke="#3B82F6"
          strokeWidth="1"
        />
        
        {/* Magic sparkles */}
        <circle cx="25" cy="15" r="1.5" fill="#F59E0B" opacity="0.8">
          <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="28" cy="12" r="1" fill="#10B981" opacity="0.6">
          <animate attributeName="opacity" values="0.2;0.8;0.2" dur="1.5s" repeatCount="indefinite" />
        </circle>
        <circle cx="23" cy="10" r="0.8" fill="#EF4444" opacity="0.7">
          <animate attributeName="opacity" values="0.4;1;0.4" dur="1.8s" repeatCount="indefinite" />
        </circle>
        
        {/* Currency symbols */}
        <text x="20" y="27" textAnchor="middle" className="fill-blue-100 text-xs font-bold">₹</text>
        
        <defs>
          <linearGradient id="lampGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#1E40AF" />
          </linearGradient>
          <linearGradient id="spoutGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>
        </defs>
      </svg>
      
      <span className={`font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent ${
        size === 'sm' ? 'text-lg' : size === 'md' ? 'text-xl' : 'text-2xl'
      }`}>
        FinGenie
      </span>
    </div>
  );
};

export default FinGenieLogo;