// page/CompulsoryDepositTransaction.tsx

import React from 'react';
import { useCompulsoryDeposit } from '../hook/useCompulsoryDeposit';
import CompulsoryDepositForm from '../components/CompulsoryDepositForm';

const CompulsoryDepositTransaction: React.FC = () => {
  const props = useCompulsoryDeposit();

  return (
    <div className="cd-txn-page h-screen bg-slate-50 overflow-hidden">
      <CompulsoryDepositForm {...props} />
      <style>{`
        html.dark .cd-txn-page { background-color: #000000 !important; }
      `}</style>
    </div>
  );
};

export default CompulsoryDepositTransaction;
