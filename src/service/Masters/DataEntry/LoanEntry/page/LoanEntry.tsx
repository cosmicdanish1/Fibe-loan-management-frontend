// page/LoanEntry.tsx

import React from 'react';
import { useLoanEntry } from '../hook/useLoanEntry';
import LoanEntryForm from '../components/LoanEntryForm';

const LoanEntry: React.FC = () => {
  const loanProps = useLoanEntry();

  return (
    <div className="h-screen bg-slate-50 overflow-hidden">
      <LoanEntryForm {...loanProps} />
    </div>
  );
};

export default LoanEntry;
