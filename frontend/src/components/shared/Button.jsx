import React from 'react';

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  className = '',
  ...props 
}) => {
  const base = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97]';

  const variants = {
    primary: 'bg-coral-500 text-white hover:bg-coral-400 focus:ring-coral-500/40 shadow-sm hover:shadow-glow-coral',
    secondary: 'bg-surface-overlay text-content-secondary border border-surface-border hover:bg-surface-hover hover:text-content-primary focus:ring-neutral-600/40',
    outline: 'border border-surface-border-light bg-transparent text-content-secondary hover:bg-surface-hover hover:text-content-primary focus:ring-neutral-600/40',
    ghost: 'text-content-secondary hover:bg-surface-hover hover:text-content-primary focus:ring-neutral-600/40',
    danger: 'bg-danger text-white hover:bg-danger-light focus:ring-danger/40',
    success: 'bg-success text-white hover:bg-success-light focus:ring-success/40',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-[13px] gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-2.5 text-sm gap-2',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${base} ${variants[variant] || variants.primary} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-0.5 mr-1.5 h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  );
};

export default Button;
