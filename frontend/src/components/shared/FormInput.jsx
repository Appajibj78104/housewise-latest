import React from 'react';

const FormInput = ({ 
  label, type = 'text', name, value, onChange, placeholder,
  error, required = false, disabled = false, className = '', ...props 
}) => {
  return (
    <div className={className}>
      {label && (
        <label className="block text-detail font-medium text-content-secondary mb-1.5">
          {label}
          {required && <span className="text-danger ml-0.5">*</span>}
        </label>
      )}
      <input
        type={type} name={name} value={value} onChange={onChange}
        placeholder={placeholder} disabled={disabled}
        className={`
          block w-full h-10 px-3.5 py-2 rounded-xl border text-sm
          bg-surface-raised text-content-primary placeholder-content-muted
          transition-colors duration-150
          focus:outline-none focus:ring-2 focus:ring-coral-500/30 focus:border-coral-500/50
          ${error ? 'border-danger focus:border-danger focus:ring-danger/30' : 'border-surface-border'}
          ${disabled ? 'opacity-40 cursor-not-allowed' : ''}
        `}
        {...props}
      />
      {error && <p className="mt-1 text-micro text-danger-text">{error}</p>}
    </div>
  );
};

export default FormInput;
