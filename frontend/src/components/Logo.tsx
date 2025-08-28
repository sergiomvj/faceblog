import React from 'react';

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const Logo: React.FC<LogoProps> = ({ 
  className = '', 
  showText = true, 
  size = 'md' 
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const textSizeClasses = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl'
  };

  return (
    <div className={`flex items-center ${className}`}>
      {/* Logo Icon */}
      <div className={`${sizeClasses[size]} flex-shrink-0`}>
        <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Background circle */}
          <circle cx="16" cy="16" r="16" fill="#3B82F6"/>
          
          {/* Blog/Document icon */}
          <rect x="8" y="6" width="16" height="20" rx="2" fill="white"/>
          
          {/* Text lines */}
          <rect x="10" y="9" width="12" height="1.5" rx="0.75" fill="#3B82F6"/>
          <rect x="10" y="12" width="10" height="1.5" rx="0.75" fill="#3B82F6"/>
          <rect x="10" y="15" width="12" height="1.5" rx="0.75" fill="#3B82F6"/>
          <rect x="10" y="18" width="8" height="1.5" rx="0.75" fill="#3B82F6"/>
          
          {/* Face/Profile element */}
          <circle cx="19" cy="21" r="2.5" fill="#3B82F6"/>
          <circle cx="19" cy="20" r="1" fill="white"/>
          <path d="M17 22.5c0-1.1 0.9-2 2-2s2 0.9 2 2" stroke="white" strokeWidth="1" fill="none"/>
        </svg>
      </div>
      
      {/* Logo Text */}
      {showText && (
        <span className={`font-bold text-blue-600 ml-2 ${textSizeClasses[size]}`}>
          FaceBlog
        </span>
      )}
    </div>
  );
};

export default Logo;
