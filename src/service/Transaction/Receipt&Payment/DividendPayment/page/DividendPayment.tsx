// page/DividendPayment.tsx

import React from 'react';
import { useDividendPayment } from '../hook/useDividendPayment';
import DividendPaymentForm from '../components/DividendPaymentForm';

const DividendPayment: React.FC = () => {
  const props = useDividendPayment();

  return <DividendPaymentForm {...props} />;
};

export default DividendPayment;
