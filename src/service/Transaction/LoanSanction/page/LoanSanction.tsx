// page/LoanSanction.tsx

import React from 'react';
import { useLoanSanction } from '../hook/useLoanSanction';
import LoanSanctionForm from '../components/LoanSanctionForm';

const LoanSanction: React.FC = () => {
  const props = useLoanSanction();

  return (
    <div className="h-screen bg-slate-50 overflow-hidden">
      <LoanSanctionForm {...props} />
    </div>
  );
};

export default LoanSanction;
