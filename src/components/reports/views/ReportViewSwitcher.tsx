import React from 'react';
import { VIEW_META, type ReportViewId } from './reportViews';

/**
 * Segmented switch for a report's views. Lives in the report's header, inside an
 * `.app-window`, and renders nothing when the report offers only one view.
 */
const ReportViewSwitcher: React.FC<{
  enabled: ReportViewId[];
  value: ReportViewId;
  onChange: (v: ReportViewId) => void;
}> = ({ enabled, value, onChange }) => {
  if (enabled.length < 2) return null;
  const index = Math.max(0, enabled.indexOf(value));
  return (
    <div
      className="aw-seg"
      role="tablist"
      aria-label="Report view"
      style={{ ['--seg-index' as any]: index, ['--seg-count' as any]: enabled.length, minWidth: enabled.length * 92 }}
    >
      {enabled.map(id => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={value === id}
          data-tip={VIEW_META[id].desc}
          onClick={() => onChange(id)}
        >
          {VIEW_META[id].short}
        </button>
      ))}
    </div>
  );
};

export default ReportViewSwitcher;
