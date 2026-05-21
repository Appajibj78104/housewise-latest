import React from 'react';

const LoadingSpinner = ({ 
  size = 'md', 
  text = '',
  fullScreen = false 
}) => {
  const sizes = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-10 w-10', xl: 'h-14 w-14' };

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className={`animate-spin rounded-full ${sizes[size]} border-2 border-surface-border border-t-coral-500`} />
      {text && <p className="text-detail text-content-muted">{text}</p>}
    </div>
  );

  if (fullScreen) {
    return <div className="flex-1 flex items-center justify-center py-20">{spinner}</div>;
  }
  return spinner;
};

export default LoadingSpinner;
