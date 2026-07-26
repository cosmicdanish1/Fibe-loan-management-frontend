// page/FixedDepositReceipt.tsx

import React from 'react';
import { useFixedDepositReceipt } from '../hook/useFixedDepositReceipt';
import FixedDepositForm from '../components/FixedDepositForm';

const FixedDepositReceipt: React.FC = () => {
  const depositProps = useFixedDepositReceipt();

  return (
    <div className="h-screen bg-slate-50 overflow-hidden">
      <FixedDepositForm {...depositProps} />
    </div>
  );
};

export default FixedDepositReceipt;
