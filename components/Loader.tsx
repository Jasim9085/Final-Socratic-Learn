import React from 'react';

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

const Loader: React.FC<LoaderProps> = ({ size = 'md', text, className = '' }) => {
  const sizeClasses = {
    sm: 'h-6 w-6 border-2',
    md: 'h-10 w-10 border-4',
    lg: 'h-16 w-16 border-4',
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`} role="status">
      <div
        className={`animate-spin-fast rounded-full border-solid border-light-primary dark:border-dark-primary border-t-transparent dark:border-t-transparent ${sizeClasses[size]}`}
      >
      </div>
      {text && <p className="text-light-text-secondary dark:text-dark-text-secondary animate-pulse">{text}</p>}
      <span className="sr-only">Loading...</span>
    </div>
  );
};

export default Loader;
