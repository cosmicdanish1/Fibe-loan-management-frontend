// page/DividendPayment.tsx

import React from 'react';
import { useDividendPayment } from '../hook/useDividendPayment';
import DividendPaymentForm from '../components/DividendPaymentForm';

const DividendPayment: React.FC = () => {
  const props = useDividendPayment();

  return (
    <div className="dividend-payment-page h-screen bg-slate-50 overflow-hidden">
      <DividendPaymentForm {...props} />
      <style>{`
        html.dark .dividend-payment-page { background-color: #000000 !important; }
      `}</style>
    </div>
  );
};

export default DividendPayment;
