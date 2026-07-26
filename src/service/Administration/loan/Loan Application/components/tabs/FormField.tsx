// FormField.tsx
import React from 'react';
import type { FormFieldProps } from '../../types/loan';

const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  onKeyDown,
  onClick,
  required = false,
  options = [],
  placeholder,
  readOnly = false,
  maxLength,
}) => {
  const baseInputClasses = `
    w-full px-2 py-1.5 fz-body border border-slate-300 bg-white rounded
    focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500
    transition-all duration-200 ease-in-out
  `;

  const selectStyle = {
    appearance: 'none' as const,
    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
    backgroundPosition: 'right 0.75rem center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: '1.25em 1.25em',
    paddingRight: '2.5rem'
  };

  const renderInput = () => {
    switch (type) {
      case 'select':
        return (
          <select
            name={name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`${baseInputClasses} cursor-pointer`}
            style={selectStyle}
            required={required}
          >
            <option value="">Select...</option>
            {options.map((option: any) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'textarea':
        return (
          <textarea
            name={name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`${baseInputClasses} h-16 resize-none`}
            required={required}
            rows={2}
            maxLength={maxLength}
          />
        );

      case 'date':
        return (
          <div className="relative">
            <input
              type="date"
              name={name}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className={baseInputClasses}
              required={required}
            />
          </div>
        );

      default:
        return (
          <div className="relative flex items-center">
            <input
              type={type}
              name={name}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={onKeyDown}
              onClick={onClick}
              placeholder={placeholder}
              readOnly={readOnly}
              className={`${baseInputClasses} ${readOnly ? 'bg-slate-50 cursor-pointer' : ''} ${name === 'memberNo' ? 'pr-8' : ''}`}
              required={required}
              maxLength={maxLength}
            />
            {name === 'memberNo' && (
              <div
                className="absolute right-2 text-slate-400 hover:text-blue-500 cursor-pointer transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onClick?.(e as any);
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="mb-2 flex items-center">
      <label htmlFor={name} className="fz-label text-slate-700 font-medium w-24 text-right pr-3">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="flex-1">
        {renderInput()}
      </div>
    </div>
  );
};

export default FormField;
