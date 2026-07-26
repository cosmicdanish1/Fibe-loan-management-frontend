import React from 'react';
import { Search } from 'lucide-react';
import type { FormFieldProps } from '../types/types';

const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  value,
  onChange,
  type = 'text',
  required = false,
  placeholder,
  hasLookup = false,
  onLookup,
  className = ''
}) => {
  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <label className="text-slate-700 fz-label font-medium whitespace-nowrap min-w-fit">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div className="relative">
        <input
          type={type}
          name={name}
          value={value}
          onChange={(e) => onChange(name, e.target.value)}
          placeholder={placeholder}
          className={`px-3 py-2 border border-slate-300 rounded-lg fz-body bg-white shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-slate-400 ${
            hasLookup ? 'pr-8' : ''
          }`}
          required={required}
        />
        
        {hasLookup && (
          <button
            type="button"
            onClick={onLookup}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all duration-200"
            title="Search"
          >
            <Search size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

export default FormField;
