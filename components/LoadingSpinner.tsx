
import React from 'react';

const LoadingSpinner: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => {
  return (
    <div
      className={`animate-spin rounded-full border-4 border-slate-500 border-t-cyan-400 ${className}`}
      role="status"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};

export default LoadingSpinner;
