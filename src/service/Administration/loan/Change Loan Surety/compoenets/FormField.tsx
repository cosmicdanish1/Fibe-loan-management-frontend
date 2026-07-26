// FormField.tsx
import React from 'react';
import { Search } from 'lucide-react';
import type { FormFieldProps } from '../type/types';

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
  error
}) => {
  return (
    <div className="flex items-start space-x-4">
      <label className="w-36 text-slate-700 fz-body font-medium pt-3 text-right">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <div className="flex-1">
        <div className="relative">
          <input
            type={type}
            name={name}
            value={value}
            onChange={(e) => onChange(name, e.target.value)}
            placeholder={placeholder}
            className={`w-full px-4 py-3 border rounded-lg fz-body bg-white shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              error 
                ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                : 'border-slate-300 hover:border-slate-400'
            }`}
            required={required}
          />
          
          {hasLookup && (
            <button
              type="button"
              onClick={onLookup}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all duration-200"
              title="Search (Press PgUp for list)"
            >
              <Search size={16} />
            </button>
          )}
        </div>
        
        {hasLookup && (
          <p className="fz-label text-blue-600 mt-1 ml-1">
            Press PgUp for list
          </p>
        )}
        
        {error && (
          <p className="fz-body text-red-600 mt-1 ml-1">{error}</p>
        )}
      </div>
    </div>
  );
};

export default FormField;
