// FormField.tsx
import React from 'react';
import { Select } from 'antd';
import { Search } from 'lucide-react';
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
  const renderInput = () => {
    switch (type) {
      case 'select':
        return (
          <Select
            id={name}
            className="aw-select"
            popupClassName="aw-select-popup"
            value={value || undefined}
            onChange={(v) => onChange(v ?? '')}
            placeholder="Select..."
            options={options.map((option: any) => ({ value: option.value, label: option.label }))}
          />
        );

      case 'textarea':
        return (
          <textarea
            id={name}
            name={name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="aw-input"
            style={{ height: 64, resize: 'none', paddingTop: 8 }}
            required={required}
            rows={2}
            maxLength={maxLength}
          />
        );

      case 'date':
        return (
          <input
            id={name}
            type="date"
            name={name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="aw-input"
            required={required}
          />
        );

      default:
        return (
          <div className={`aw-input-wrap ${name === 'memberNo' ? 'has-action' : ''}`}>
            <input
              id={name}
              type={type}
              name={name}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={onKeyDown}
              onClick={onClick}
              placeholder={placeholder}
              readOnly={readOnly}
              className="aw-input"
              required={required}
              maxLength={maxLength}
            />
            {name === 'memberNo' && (
              <button
                type="button"
                className="aw-input-action"
                aria-label="Search member"
                data-tip="Search member"
                data-tip-pos="top-end"
                onClick={(e) => {
                  e.stopPropagation();
                  onClick?.(e as any);
                }}
              >
                <Search size={13} />
              </button>
            )}
          </div>
        );
    }
  };

  return (
    <div>
      <label htmlFor={name} className="aw-label">
        {label}
        {required && <span style={{ color: 'var(--aw-danger)', marginLeft: 3 }}>*</span>}
      </label>
      {renderInput()}
    </div>
  );
};

export default FormField;
