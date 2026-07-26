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
    <div className="flex mb-4">
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`
            px-6 py-3 fz-body font-medium relative transition-all duration-200 ease-in-out
            ${activeTab === tab.id
              ? 'bg-white text-blue-700 shadow-lg border-b-2 border-blue-600 z-10'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800'
            }
            ${index === 0 ? 'rounded-tl-lg' : ''}
            ${index === tabs.length - 1 ? 'rounded-tr-lg' : ''}
            ${index > 0 ? '-ml-px' : ''}
          `}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default TabNavigation;
