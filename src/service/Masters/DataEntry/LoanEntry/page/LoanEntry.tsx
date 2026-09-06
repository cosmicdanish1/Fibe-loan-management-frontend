// page/LoanEntry.tsx

import React from 'react';
import { useLoanEntry } from '../hook/useLoanEntry';
import LoanEntryForm from '../components/LoanEntryForm';

const LoanEntry: React.FC = () => {
  const loanProps = useLoanEntry();

  return (
    <div className="loanentry-page h-screen bg-slate-50 overflow-hidden">
      <LoanEntryForm {...loanProps} />

      <style>{`
        html.dark .loanentry-page { background-color: #000000 !important; }
      `}</style>
    </div>
  );
};

export default LoanEntry;
