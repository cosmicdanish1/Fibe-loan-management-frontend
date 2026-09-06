// page/PaymentVoucherCreation.tsx

import React from 'react';
import { usePaymentVoucher } from '../hook/usePaymentVoucher';
import PaymentVoucherForm from '../components/PaymentVoucherForm';

const PaymentVoucherCreation: React.FC = () => {
  const voucherProps = usePaymentVoucher();

  return (
    <div className="pvc-page h-screen bg-slate-50 overflow-hidden">
      <PaymentVoucherForm {...voucherProps} />
      <style>{`
        html.dark .pvc-page { background-color: #000000 !important; }
      `}</style>
    </div>
  );
};

export default PaymentVoucherCreation;
