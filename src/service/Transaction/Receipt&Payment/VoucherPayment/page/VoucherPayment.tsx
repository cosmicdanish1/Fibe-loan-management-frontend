// page/VoucherPayment.tsx

import React from 'react';
import { useVoucherPayment } from '../hook/useVoucherPayment';
import VoucherPaymentForm from '../components/VoucherPaymentForm';

const VoucherPayment: React.FC = () => {
  const voucherProps = useVoucherPayment();

  return <VoucherPaymentForm {...voucherProps} />;
};

export default VoucherPayment;
