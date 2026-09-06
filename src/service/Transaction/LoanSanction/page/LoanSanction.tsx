// page/LoanSanction.tsx

import React from 'react';
import { useLoanSanction } from '../hook/useLoanSanction';
import LoanSanctionForm from '../components/LoanSanctionForm';

const LoanSanction: React.FC = () => {
  const props = useLoanSanction();

  return (
    <div className="loan-sanction-page h-screen bg-slate-50 overflow-hidden">
      <LoanSanctionForm {...props} />
      <style>{`
        html.dark .loan-sanction-page { background-color: #000000 !important; }
      `}</style>
    </div>
  );
};

export default LoanSanction;
