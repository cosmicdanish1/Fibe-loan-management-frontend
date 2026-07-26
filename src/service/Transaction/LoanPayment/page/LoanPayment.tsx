// page/LoanPayment.tsx

import React from 'react';
import { useLoanPayment } from '../hook/useLoanPayment';
import LoanPaymentForm from '../components/LoanPaymentForm';

const LoanPayment: React.FC = () => {
  const props = useLoanPayment();

  return (
    <div className="h-screen bg-slate-50 overflow-hidden">
      <LoanPaymentForm {...props} />
    </div>
  );
};

export default LoanPayment;
