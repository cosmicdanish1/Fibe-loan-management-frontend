// page/CompulsoryDepositTransaction.tsx

import React from 'react';
import { useCompulsoryDeposit } from '../hook/useCompulsoryDeposit';
import CompulsoryDepositForm from '../components/CompulsoryDepositForm';

const CompulsoryDepositTransaction: React.FC = () => {
  const props = useCompulsoryDeposit();

  return (
    <div className="h-screen bg-slate-50 overflow-hidden">
      <CompulsoryDepositForm {...props} />
    </div>
  );
};

export default CompulsoryDepositTransaction;
