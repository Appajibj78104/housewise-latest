import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const ThemeLanguageToggle = ({ className = '' }) => {
  const { toggleTheme, isDark } = useTheme();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={toggleTheme}
        className="flex items-center justify-center w-8 h-8 rounded-lg
          bg-surface-raised hover:bg-surface-hover border border-surface-border
          text-content-secondary hover:text-content-primary transition-all duration-200"
        title={isDark ? 'Light mode' : 'Dark mode'}
      >
        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>
    </div>
  );
};

export default ThemeLanguageToggle;
