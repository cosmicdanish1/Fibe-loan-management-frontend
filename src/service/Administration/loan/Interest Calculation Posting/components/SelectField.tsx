import React from 'react';
import { ChevronDown } from 'lucide-react';
import type { SelectFieldProps } from '../types/types';

const SelectField: React.FC<SelectFieldProps> = ({
  label,
  name,
  value,
  onChange,
  options,
  required = false,
  className = ''
}) => {
  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <label className="text-slate-700 fz-label font-medium whitespace-nowrap min-w-fit">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div className="relative flex-1">
        <select
          name={name}
          value={value}
          onChange={(e) => onChange(name, e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg fz-body bg-white shadow-sm appearance-none cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-slate-400 pr-8"
          required={required}
        >
          <option value="">Select an option...</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
        
        <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
      </div>
    </div>
  );
};

export default SelectField;
