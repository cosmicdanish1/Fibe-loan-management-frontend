// page/DividendPayment.tsx

import React from 'react';
import { useDividendPayment } from '../hook/useDividendPayment';
import DividendPaymentForm from '../components/DividendPaymentForm';

const DividendPayment: React.FC = () => {
  const props = useDividendPayment();

  return (
    <div className="h-screen bg-slate-50 overflow-hidden">
      <DividendPaymentForm {...props} />
    </div>
  );
};

export default DividendPayment;
