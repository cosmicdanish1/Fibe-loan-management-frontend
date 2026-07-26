// SelectField.tsx
import React from 'react';
import { ChevronDown } from 'lucide-react';
import type { SelectFieldProps } from '../type/types';

const SelectField: React.FC<SelectFieldProps> = ({
  label,
  name,
  value,
  onChange,
  options,
  required = false,
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
          <select
            name={name}
            value={value}
            onChange={(e) => onChange(name, e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg fz-body bg-white shadow-sm appearance-none cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              error 
                ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                : 'border-slate-300 hover:border-slate-400'
            }`}
            required={required}
          >
            <option value="">Select an option...</option>
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
          
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
        </div>
        
        {error && (
          <p className="fz-body text-red-600 mt-1 ml-1">{error}</p>
        )}
      </div>
    </div>
  );
};

export default SelectField;
