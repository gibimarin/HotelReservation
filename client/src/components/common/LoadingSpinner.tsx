import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading...',
  className = 'py-16',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <Loader2 className="w-8 h-8 text-brand-600 animate-spin mb-3" />
      {message && <p className="text-sm font-medium text-slate-500">{message}</p>}
    </div>
  );
};

