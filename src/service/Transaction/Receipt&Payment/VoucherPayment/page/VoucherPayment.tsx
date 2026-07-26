// page/VoucherPayment.tsx

import React from 'react';
import { useVoucherPayment } from '../hook/useVoucherPayment';
import VoucherPaymentForm from '../components/VoucherPaymentForm';

const VoucherPayment: React.FC = () => {
  const voucherProps = useVoucherPayment();

  return (
    <div className="h-screen bg-slate-50 overflow-hidden">
      <VoucherPaymentForm {...voucherProps} />
    </div>
  );
};

export default VoucherPayment;
