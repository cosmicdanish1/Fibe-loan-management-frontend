// page/LoanPayment.tsx

import React from 'react';
import { useLoanPayment } from '../hook/useLoanPayment';
import LoanPaymentForm from '../components/LoanPaymentForm';

const LoanPayment: React.FC = () => {
  const props = useLoanPayment();

  return <LoanPaymentForm {...props} />;
};

export default LoanPayment;
