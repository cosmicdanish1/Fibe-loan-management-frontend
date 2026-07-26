// page/PaymentVoucherCreation.tsx

import React from 'react';
import { usePaymentVoucher } from '../hook/usePaymentVoucher';
import PaymentVoucherForm from '../components/PaymentVoucherForm';

const PaymentVoucherCreation: React.FC = () => {
  const voucherProps = usePaymentVoucher();

  return (
    <div className="h-screen bg-slate-50 overflow-hidden">
      <PaymentVoucherForm {...voucherProps} />
    </div>
  );
};

export default PaymentVoucherCreation;
