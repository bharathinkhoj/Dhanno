import React from 'react';

interface DhannoLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const DhannoLogo: React.FC<DhannoLogoProps> = ({ 
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
        {/* Modern circular background */}
        <circle
          cx="20"
          cy="20"
          r="18"
          fill="url(#backgroundGradient)"
          stroke="url(#borderGradient)"
          strokeWidth="2"
        />
        
        {/* Stylized "D" shape */}
        <path
          d="M12 12 C12 12, 12 28, 12 28 C12 28, 20 28, 25 24 C30 20, 30 20, 25 16 C20 12, 12 12, 12 12 Z"
          fill="url(#letterGradient)"
          stroke="#FFFFFF"
          strokeWidth="0.5"
        />
        
        {/* Inner accent */}
        <circle
          cx="21"
          cy="20"
          r="3"
          fill="#FFFFFF"
          opacity="0.8"
        />
        
        {/* Financial indicators - small dots */}
        <circle cx="28" cy="12" r="1" fill="#10B981" opacity="0.8">
          <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="32" cy="15" r="0.8" fill="#F59E0B" opacity="0.7">
          <animate attributeName="opacity" values="0.3;0.9;0.3" dur="1.5s" repeatCount="indefinite" />
        </circle>
        <circle cx="30" cy="28" r="1.2" fill="#3B82F6" opacity="0.6">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="1.8s" repeatCount="indefinite" />
        </circle>
        
        <defs>
          <linearGradient id="backgroundGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E293B" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>
          <linearGradient id="borderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
          <linearGradient id="letterGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="100%" stopColor="#A78BFA" />
          </linearGradient>
        </defs>
      </svg>
      
      <span className={`font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent ${
        size === 'sm' ? 'text-lg' : size === 'md' ? 'text-xl' : 'text-2xl'
      }`}>
        Dhanno
      </span>
    </div>
  );
};

export default DhannoLogo;