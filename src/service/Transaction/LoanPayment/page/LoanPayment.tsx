// page/LoanPayment.tsx

import React from 'react';
import { useLoanPayment } from '../hook/useLoanPayment';
import LoanPaymentForm from '../components/LoanPaymentForm';

const LoanPayment: React.FC = () => {
  const props = useLoanPayment();

  return (
    <div className="loan-payment-page h-screen bg-slate-50 overflow-hidden">
      <LoanPaymentForm {...props} />
      <style>{`
        html.dark .loan-payment-page { background-color: #000000 !important; }
      `}</style>
    </div>
  );
};

export default LoanPayment;
