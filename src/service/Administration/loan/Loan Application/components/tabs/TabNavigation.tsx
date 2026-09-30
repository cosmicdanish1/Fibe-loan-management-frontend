// TabNavigation.tsx
import React from 'react';
import type { LoanApplicationState } from '../../types/loan';

interface TabNavigationProps {
  activeTab: LoanApplicationState['activeTab'];
  onTabChange: (tab: LoanApplicationState['activeTab']) => void;
}

const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'loan-details' as const, label: 'Loan Details' },
    { id: 'nominee-details' as const, label: 'Nominee Details' },
    { id: 'loan-against-deposit' as const, label: 'Loan Against Deposit' }
  ];

  return (
    <div className="aw-tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          onClick={() => onTabChange(tab.id)}
          className="aw-tab"
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default TabNavigation;
