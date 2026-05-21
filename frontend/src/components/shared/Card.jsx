import React from 'react';

const Card = ({ 
  children, 
  className = '', 
  theme = 'dark', 
  padding = 'p-5',
  hover = false 
}) => {
  return (
    <div className={`
      bg-surface-overlay border border-surface-border rounded-2xl shadow-card
      ${hover ? 'transition-all duration-200 hover:border-surface-border-light hover:shadow-card-hover hover:bg-surface-hover' : ''}
      ${padding} 
      ${className}
    `}>
      {children}
    </div>
  );
};

export default Card;
