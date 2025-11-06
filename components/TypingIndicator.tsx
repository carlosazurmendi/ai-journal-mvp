import React from 'react';

const TypingIndicator: React.FC = () => {
  return (
    <div className="flex items-center space-x-1.5">
      <span className="h-2 w-2 bg-slate-400 rounded-full animate-pulse [animation-delay:-0.3s]"></span>
      <span className="h-2 w-2 bg-slate-400 rounded-full animate-pulse [animation-delay:-0.15s]"></span>
      <span className="h-2 w-2 bg-slate-400 rounded-full animate-pulse"></span>
    </div>
  );
};

export default TypingIndicator;
