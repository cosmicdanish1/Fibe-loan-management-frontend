// page/FixedDepositReceipt.tsx

import React from 'react';
import { useFixedDepositReceipt } from '../hook/useFixedDepositReceipt';
import FixedDepositForm from '../components/FixedDepositForm';

const FixedDepositReceipt: React.FC = () => {
  const depositProps = useFixedDepositReceipt();

  return (
    <div className="fd-receipt-page h-screen bg-slate-50 overflow-hidden">
      <FixedDepositForm {...depositProps} />
      <style>{`
        html.dark .fd-receipt-page { background-color: #000000 !important; }
      `}</style>
    </div>
  );
};

export default FixedDepositReceipt;
